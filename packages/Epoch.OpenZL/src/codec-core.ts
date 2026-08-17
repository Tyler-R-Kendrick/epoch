/**
 * @epoch/openzl — host entropy codec (ADR-0053).
 *
 * Format-aware transforms by entity profile, then zlib entropy inside an
 * `epoch.openzl-frame/v1` envelope. Plaintext SHA-256 is recorded and remains
 * the content identity; verification decompresses then re-hashes.
 *
 * Native/WASM OpenZL backends can replace the entropy stage without changing
 * the envelope contract.
 */
import { createHash } from "node:crypto";
import { deflateSync as zlibDeflate, inflateSync as zlibInflate } from "node:zlib";

export const OPENZL_CODEC_ID = "openzl" as const;
export const OPENZL_FRAME_FORMAT = "epoch.openzl-frame/v1" as const;

export type OpenZlProfile =
  | "json"
  | "text"
  | "markdown"
  | "semantic-patch"
  | "binary"
  | "generic";

export interface OpenZlFrameHeader {
  readonly format: typeof OPENZL_FRAME_FORMAT;
  readonly codecId: typeof OPENZL_CODEC_ID;
  readonly profile: OpenZlProfile;
  readonly entityType: string;
  readonly plaintextSha256: string;
  readonly plaintextBytes: number;
  readonly dictionaryOid?: string;
  readonly backend: "host-zlib" | "openzl-native";
}

export interface OpenZlCompressResult {
  readonly frame: Uint8Array;
  readonly header: OpenZlFrameHeader;
  readonly compressedBytes: number;
  readonly plainBytes: number;
}

export interface OpenZlCompressOptions {
  readonly entityType?: string;
  readonly dictionaryOid?: string;
  readonly dictionary?: Uint8Array | string;
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function toBytes(input: Uint8Array | string): Uint8Array {
  return typeof input === "string" ? new TextEncoder().encode(input) : input;
}

/** Map MIME-ish entity types to OpenZL profiles. */
export function profileForEntityType(entityType: string): OpenZlProfile {
  const t = String(entityType || "application/octet-stream").toLowerCase();
  if (t.includes("semantic-patch") || t === "epoch.semantic-patch/v1") return "semantic-patch";
  if (t.includes("json") || t.endsWith("+json")) return "json";
  if (t.includes("markdown") || t === "text/md") return "markdown";
  if (t.startsWith("text/")) return "text";
  if (t.startsWith("image/") || t.startsWith("video/") || t.startsWith("audio/")) return "binary";
  if (t === "application/octet-stream") return "binary";
  return "generic";
}

/**
 * Entity-aware prep: reveal structure before entropy coding (OpenZL idea).
 * JSON / semantic-patch become newline-delimited typed columns when parseable.
 */
export function prepareForEntropy(plain: Uint8Array, profile: OpenZlProfile): Uint8Array {
  if (profile !== "json" && profile !== "semantic-patch") return plain;
  try {
    const text = new TextDecoder().decode(plain);
    const value = JSON.parse(text) as unknown;
    const lines: string[] = [];
    const walk = (node: unknown, path: string): void => {
      if (node === null || typeof node !== "object") {
        lines.push(`${path}\t${JSON.stringify(node)}`);
        return;
      }
      if (Array.isArray(node)) {
        lines.push(`${path}\t[]\t${node.length}`);
        node.forEach((item, index) => walk(item, `${path}[${index}]`));
        return;
      }
      const keys = Object.keys(node as Record<string, unknown>).sort();
      lines.push(`${path}\t{}\t${keys.join(",")}`);
      for (const key of keys) {
        walk((node as Record<string, unknown>)[key], path ? `${path}.${key}` : key);
      }
    };
    walk(value, "$");
    return new TextEncoder().encode(lines.join("\n"));
  } catch {
    return plain;
  }
}

function encodeFrame(header: OpenZlFrameHeader, payload: Uint8Array): Uint8Array {
  const headerBytes = new TextEncoder().encode(JSON.stringify(header));
  const out = new Uint8Array(4 + 4 + headerBytes.length + payload.length);
  out[0] = 0x45; // E
  out[1] = 0x5a; // Z
  out[2] = 0x4c; // L
  out[3] = 0x31; // 1
  const view = new DataView(out.buffer);
  view.setUint32(4, headerBytes.length, false);
  out.set(headerBytes, 8);
  out.set(payload, 8 + headerBytes.length);
  return out;
}

function decodeFrame(frame: Uint8Array): { header: OpenZlFrameHeader; payload: Uint8Array } {
  if (frame.length < 8 || frame[0] !== 0x45 || frame[1] !== 0x5a || frame[2] !== 0x4c || frame[3] !== 0x31) {
    throw new Error("not an epoch.openzl-frame/v1 object");
  }
  const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);
  const headerLen = view.getUint32(4, false);
  const headerStart = 8;
  const headerEnd = headerStart + headerLen;
  if (headerEnd > frame.length) throw new Error("openzl frame header truncated");
  const header = JSON.parse(new TextDecoder().decode(frame.subarray(headerStart, headerEnd))) as OpenZlFrameHeader;
  if (header.format !== OPENZL_FRAME_FORMAT || header.codecId !== OPENZL_CODEC_ID) {
    throw new Error("unsupported openzl frame header");
  }
  return { header, payload: frame.subarray(headerEnd) };
}

/**
 * Compress plaintext into an OpenZL host frame. Identity is plaintext SHA-256.
 */
export function compressOpenZl(
  input: Uint8Array | string,
  options: OpenZlCompressOptions = {},
): OpenZlCompressResult {
  const plain = toBytes(input);
  const entityType = options.entityType || "application/octet-stream";
  const profile = profileForEntityType(entityType);
  const prepared = prepareForEntropy(plain, profile);
  const preparedZ = zlibDeflate(Buffer.from(prepared));
  const plainZ = zlibDeflate(Buffer.from(plain));
  const packed = new Uint8Array(1 + 4 + preparedZ.length + plainZ.length);
  packed[0] = 1;
  new DataView(packed.buffer).setUint32(1, preparedZ.length, false);
  packed.set(preparedZ, 5);
  packed.set(plainZ, 5 + preparedZ.length);
  const header: OpenZlFrameHeader = {
    format: OPENZL_FRAME_FORMAT,
    codecId: OPENZL_CODEC_ID,
    profile,
    entityType,
    plaintextSha256: sha256Hex(plain),
    plaintextBytes: plain.byteLength,
    dictionaryOid: options.dictionaryOid,
    backend: "host-zlib",
  };
  const frame = encodeFrame(header, packed);
  return {
    frame,
    header,
    compressedBytes: frame.byteLength,
    plainBytes: plain.byteLength,
  };
}

/** Decompress an OpenZL host frame and verify plaintext SHA-256. */
export function decompressOpenZl(frame: Uint8Array): Uint8Array {
  const { header, payload } = decodeFrame(frame);
  if (payload[0] !== 1) throw new Error("unsupported openzl inner pack");
  const preparedLen = new DataView(payload.buffer, payload.byteOffset, payload.byteLength).getUint32(1, false);
  const plainZ = payload.subarray(5 + preparedLen);
  const plain = new Uint8Array(zlibInflate(Buffer.from(plainZ)));
  const digest = sha256Hex(plain);
  if (digest !== header.plaintextSha256) {
    throw new Error("openzl plaintext digest mismatch");
  }
  if (plain.byteLength !== header.plaintextBytes) {
    throw new Error("openzl plaintext length mismatch");
  }
  return plain;
}

export function isOpenZlFrame(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x45 && bytes[1] === 0x5a && bytes[2] === 0x4c && bytes[3] === 0x31;
}

/** Compress a semantic-patch / changediff JSON document. */
export function compressChangediff(
  patchJson: Uint8Array | string,
  options: Omit<OpenZlCompressOptions, "entityType"> = {},
): OpenZlCompressResult {
  return compressOpenZl(patchJson, {
    ...options,
    entityType: "application/vnd.epoch.semantic-patch+json",
  });
}

/** Compress a CDC chunk payload while recording plaintext digest in the frame. */
export function compressChunkBytes(
  chunk: Uint8Array,
  entityType: string,
  options: Omit<OpenZlCompressOptions, "entityType"> = {},
): OpenZlCompressResult {
  return compressOpenZl(chunk, { ...options, entityType });
}

export interface HostCodec {
  readonly id: typeof OPENZL_CODEC_ID;
  compress(plain: Uint8Array, entityType?: string): Uint8Array;
  decompress(frame: Uint8Array): Uint8Array;
}

export const openZlHostCodec: HostCodec = {
  id: OPENZL_CODEC_ID,
  compress(plain, entityType) {
    return compressOpenZl(plain, { entityType }).frame;
  },
  decompress(frame) {
    return decompressOpenZl(frame);
  },
};

/** Prefer openzl when both peers advertise it. */
export function preferOpenZlCompression(
  local: readonly string[],
  remote: readonly string[],
): string | undefined {
  const remoteSet = new Set(remote);
  for (const candidate of local) {
    if (remoteSet.has(candidate)) return candidate;
  }
  return undefined;
}
