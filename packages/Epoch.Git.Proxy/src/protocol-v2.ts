export interface ProtocolV2Profile { readonly promisorConfigured: boolean }

export function encodePktLine(payload: string | Uint8Array): Buffer {
  const bytes = typeof payload === "string" ? Buffer.from(payload) : Buffer.from(payload);
  const size = bytes.length + 4;
  if (size > 0xffff) throw new Error("Git packet line is too large");
  return Buffer.concat([Buffer.from(size.toString(16).padStart(4, "0")), bytes]);
}
export function parsePktLines(bytes: Uint8Array): readonly (string | null)[] {
  const input = Buffer.from(bytes);
  const lines: (string | null)[] = [];
  let offset = 0;
  while (offset < input.length) {
    if (offset + 4 > input.length) throw new Error("Truncated Git packet header");
    const size = Number.parseInt(input.subarray(offset, offset + 4).toString("ascii"), 16);
    if (!Number.isFinite(size)) throw new Error("Invalid Git packet length");
    offset += 4;
    if (size === 0) { lines.push(null); continue; }
    if (size < 4 || offset + size - 4 > input.length) throw new Error("Invalid Git packet frame");
    lines.push(input.subarray(offset, offset + size - 4).toString("utf8"));
    offset += size - 4;
  }
  return Object.freeze(lines);
}

export function protocolV2Advertisement(profile: ProtocolV2Profile): string {
  const capabilities = ["version 2", "agent=epoch-git-proxy/0.1", "ls-refs=unborn", "fetch=shallow wait-for-done"];
  if (profile.promisorConfigured) capabilities[3] += " filter";
  return capabilities.join("\n") + "\n";
}

export function gitProtocolEnvironment(headers: Readonly<Record<string, string | string[] | undefined>>): { readonly GIT_PROTOCOL?: string } {
  const raw = headers["git-protocol"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined) return {};
  if (!/^version=\d+(?::[A-Za-z0-9=._-]+)*$/u.test(value)) throw new Error("Invalid Git-Protocol header");
  return { GIT_PROTOCOL: value };
}
