import { createHash } from "node:crypto";

export type SwhObjectKind = "cnt" | "dir" | "rev" | "rel" | "snp";
export interface Swhid {
  readonly version: 1; readonly kind: SwhObjectKind; readonly digest: string;
  readonly qualifiers: Readonly<Record<string, string>>;
}

export const SWH_CAPABILITIES = Object.freeze({
  schemaVersion: 1, specVersion: "1.2", specDate: "2026-03-04", accessedAt: "2026-08-11",
  source: "https://www.softwareheritage.org/2020/07/09/intrinsic-vs-extrinsic-identifiers/",
  transport: "injected", liveServiceDefault: false,
  supportedKinds: ["cnt", "dir", "rev", "rel", "snp"],
  limitations: ["archive submission requires an injected transport", "success requires an explicit succeeded/full remote response"],
});

const KINDS = new Set<SwhObjectKind>(["cnt", "dir", "rev", "rel", "snp"]);
const QUALIFIERS = new Set(["origin", "visit", "anchor", "path", "lines"]);

export function parseSwhid(value: string): Swhid {
  const [core, ...parts] = value.split(";"); const fields = core!.split(":");
  if (fields[0] !== "swh") throw new Error("invalid SWHID namespace");
  if (fields[1] !== "1") throw new Error("unsupported SWHID version");
  if (!KINDS.has(fields[2] as SwhObjectKind)) throw new Error("invalid SWHID object kind");
  if (!/^[0-9a-f]{40}$/u.test(fields[3] ?? "")) throw new Error("invalid SWHID digest");
  const qualifiers: Record<string, string> = {};
  for (const part of parts) {
    const equals = part.indexOf("="); if (equals < 1) throw new Error("malformed SWHID qualifier");
    const key = part.slice(0, equals); if (!QUALIFIERS.has(key) || qualifiers[key] !== undefined) throw new Error("unsupported or duplicate SWHID qualifier");
    try { qualifiers[key] = decodeURIComponent(part.slice(equals + 1)); } catch { throw new Error("malformed SWHID qualifier encoding"); }
  }
  return Object.freeze({ version: 1, kind: fields[2] as SwhObjectKind, digest: fields[3]!, qualifiers: Object.freeze(qualifiers) });
}

export function formatSwhid(value: Swhid): string {
  if (!KINDS.has(value.kind) || !/^[0-9a-f]{40}$/u.test(value.digest)) throw new Error("invalid SWHID");
  const preferred = ["origin", "visit", "anchor", "path", "lines"];
  return `swh:1:${value.kind}:${value.digest}` + preferred.filter((key) => value.qualifiers[key] !== undefined)
    .map((key) => `;${key}=${encodeURIComponent(value.qualifiers[key]!)}`).join("");
}

export function serializeGitObject(type: "blob" | "tree" | "commit" | "tag", body: Uint8Array): Uint8Array {
  const header = new TextEncoder().encode(`${type} ${body.length}\0`); const result = new Uint8Array(header.length + body.length);
  result.set(header); result.set(body, header.length); return result;
}
export function gitObjectId(type: "blob" | "tree" | "commit" | "tag", body: Uint8Array, algorithm: "sha1" | "sha256" = "sha1"): string {
  return createHash(algorithm).update(serializeGitObject(type, body)).digest("hex");
}
export function swhidForGitObject(kind: SwhObjectKind, type: "blob" | "tree" | "commit" | "tag", body: Uint8Array): string {
  return formatSwhid({ version: 1, kind, digest: gitObjectId(type, body, "sha1"), qualifiers: {} });
}
export function swhKindForGitType(type: "blob" | "tree" | "commit" | "tag"): Exclude<SwhObjectKind, "snp"> {
  return ({ blob: "cnt", tree: "dir", commit: "rev", tag: "rel" } as const)[type];
}

export interface SaveTransportResponse { readonly status: number; readonly body: unknown }
export interface SaveResult { readonly confirmed: boolean; readonly state: "succeeded" | "pending" | "failed"; readonly attempts: number; readonly origin?: string }
export class SaveCodeNowClient {
  readonly #transport: (request: { readonly origin: string; readonly attempt: number }) => Promise<SaveTransportResponse>;
  readonly #maxAttempts: number;
  constructor(options: { readonly transport: (request: { readonly origin: string; readonly attempt: number }) => Promise<SaveTransportResponse>; readonly maxAttempts?: number }) {
    this.#transport = options.transport; this.#maxAttempts = options.maxAttempts ?? 3;
    if (!Number.isInteger(this.#maxAttempts) || this.#maxAttempts < 1 || this.#maxAttempts > 5) throw new Error("maxAttempts must be 1..5");
  }
  async save(input: { readonly origin: string; readonly visibility: "public" | "shared" | "private" }): Promise<SaveResult> {
    if (input.visibility !== "public") throw new Error("private or shared origins cannot be archived");
    let url: URL; try { url = new URL(input.origin); } catch { throw new Error("invalid archive origin"); }
    if (url.protocol !== "https:" || url.hostname === "localhost" || url.hostname.endsWith(".local") || /^(127\.|10\.|192\.168\.|169\.254\.)/u.test(url.hostname)) throw new Error("local or non-HTTPS archive origin denied");
    for (let attempt = 1; attempt <= this.#maxAttempts; attempt += 1) {
      const response = await this.#transport({ origin: url.href, attempt });
      const body = response.body && typeof response.body === "object" ? response.body as Record<string, unknown> : {};
      if (response.status >= 200 && response.status < 300 && body.save_task_status === "succeeded" && body.visit_status === "full") {
        if (body.origin_url !== undefined && body.origin_url !== input.origin) return { confirmed: false, state: "failed", attempts: attempt };
        return { confirmed: true, state: "succeeded", attempts: attempt, origin: input.origin };
      }
      if (response.status < 500) return { confirmed: false, state: body.save_task_status === "pending" ? "pending" : "failed", attempts: attempt };
    }
    return { confirmed: false, state: "failed", attempts: this.#maxAttempts };
  }
}
