import { fail } from "./errors";

export const CANONICAL_ID_KINDS = [
  "repo", "principal", "key", "change", "stack", "fragment", "review", "merge-plan",
  "conflict", "workspace", "operation", "grant", "budget", "projection", "mirror",
  "version", "session", "promise",
] as const;

export type CanonicalIdKind = typeof CANONICAL_ID_KINDS[number];
export type CanonicalId<K extends CanonicalIdKind = CanonicalIdKind> = `epoch:${K}:${string}`;
declare const revisionIdBrand: unique symbol;
export type RevisionId = string & { readonly [revisionIdBrand]: "signed-event-id" };
export type RandomSource = (byteLength: number) => Uint8Array;

const kindSet = new Set<string>(CANONICAL_ID_KINDS);
const tokenPattern = /^[a-z2-7]{52}$/u;
const eventIdPattern = /^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/u;
const alphabet = "abcdefghijklmnopqrstuvwxyz234567";

export function createCanonicalId<K extends CanonicalIdKind>(kind: K, random: RandomSource = platformRandom): CanonicalId<K> {
  if (!kindSet.has(kind)) fail("invalid-id", `Unknown canonical ID kind: ${String(kind)}`);
  const bytes = random(32);
  if (bytes.byteLength !== 32) fail("invalid-id", "Canonical IDs require exactly 256 bits of randomness");
  return `epoch:${kind}:${base32(bytes)}`;
}

export function parseCanonicalId(value: unknown, expectedKind?: CanonicalIdKind): { readonly kind: CanonicalIdKind; readonly token: string } {
  if (typeof value !== "string" || value.length > 96 || [...value].some((character) => character.codePointAt(0)! > 0x7f)) {
    return fail("invalid-id", "Canonical ID must be bounded ASCII");
  }
  const parts = value.split(":");
  const kind = parts[1];
  const token = parts[2];
  if (parts.length !== 3 || parts[0] !== "epoch" || kind === undefined || !kindSet.has(kind)
    || expectedKind !== undefined && kind !== expectedKind || token === undefined || !tokenPattern.test(token)) {
    return fail("invalid-id", `Invalid canonical ID: ${value}`);
  }
  return { kind: kind as CanonicalIdKind, token };
}

export function legacyChangeId(eventId: RevisionId): string {
  assertRevisionId(eventId);
  return `epoch:change:legacy:${eventId}`;
}

export function parseChangeId(value: unknown):
  | { readonly kind: "change"; readonly token: string }
  | { readonly kind: "change"; readonly legacyEventId: RevisionId } {
  if (typeof value === "string" && value.startsWith("epoch:change:legacy:")) {
    const eventId = value.slice("epoch:change:legacy:".length);
    return { kind: "change", legacyEventId: assertRevisionId(eventId) };
  }
  const parsed = parseCanonicalId(value, "change");
  return { kind: "change", token: parsed.token };
}

export function assertRevisionId(value: unknown): RevisionId {
  if (typeof value !== "string" || !eventIdPattern.test(value)) fail("invalid-ref", "RevisionId must be a signed EventId");
  return value as RevisionId;
}

function platformRandom(byteLength: number): Uint8Array {
  const crypto = globalThis.crypto;
  if (crypto === undefined || typeof crypto.getRandomValues !== "function") {
    fail("unsupported-capability", "This runtime has no cryptographic random source; inject a 256-bit CSPRNG");
  }
  return crypto.getRandomValues(new Uint8Array(byteLength));
}

function base32(bytes: Uint8Array): string {
  if (bytes.length !== 32) fail("invalid-id", "Canonical IDs require exactly 256 bits of randomness");
  let bits = 0;
  let buffer = 0;
  let result = "";
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result += alphabet[(buffer >>> bits) & 31];
      buffer &= (1 << bits) - 1;
    }
  }
  if (bits > 0) result += alphabet[(buffer << (5 - bits)) & 31];
  return result;
}
