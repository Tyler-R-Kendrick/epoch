export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function stableJson(value: unknown): string {
  if (value === undefined) return "null";
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function normalizeJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Browser-safe 64-bit content hash (two interleaved FNV-1a streams).
 * A production host injects a real SHA-256 signer; this keeps content
 * addressing deterministic and dependency-free for the reference client.
 */
export function hashHex(value: string): string {
  let hashLow = 2166136261;
  let hashHigh = 3581268137;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    hashLow ^= code;
    hashLow = Math.imul(hashLow, 16777619);
    hashHigh ^= code + index;
    hashHigh = Math.imul(hashHigh, 16777639);
  }
  return `${(hashLow >>> 0).toString(16).padStart(8, "0")}${(hashHigh >>> 0).toString(16).padStart(8, "0")}`;
}

export function requireNonEmpty(value: string, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Epoch Live ${label} is required.`);
  }
  return value;
}
