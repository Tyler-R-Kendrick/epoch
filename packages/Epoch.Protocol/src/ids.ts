import { fail } from "./errors";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;
function __epochIsString<T>(value: T): value is T & string { return typeof value === "string"; }
function __epochIsFunction<T>(value: T): value is T & ((...args: never[]) => BoundaryValue) { return typeof value === "function"; }


export const CANONICAL_ID_KINDS = [
  "repo", "principal", "key", "change", "change-graph", "fragment", "review-bundle", "merge-plan",
  "conflict", "workspace", "operation", "grant", "budget", "projection", "mirror",
  "version", "session", "promise",
  // ADR-0043. A Space composes the kinds above; it never replaces one. Sandbox
  // and anchor get their own kinds so a turn can name where it ran and a
  // comment can name what it points at without either borrowing `workspace`.
  "space", "sandbox", "anchor",
  // ADR-0055 native channels: a channel is a signed gossip object, never a transport identity.
  "channel",
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

export function parseCanonicalId(value: BoundaryValue, expectedKind?: CanonicalIdKind) {
  if (!__epochIsString(value) || value.length > 96 || [...value].some((character) => character.codePointAt(0)! > 0x7f)) {
    return fail("invalid-id", "Canonical ID must be bounded ASCII");
  }
  const parts = value.split(":");
  const kind = parts[1];
  const token = parts[2];
  if (parts.length !== 3 || parts[0] !== "epoch" || kind === undefined || !kindSet.has(kind)
    || expectedKind !== undefined && kind !== expectedKind || token === undefined || !tokenPattern.test(token)) {
    return fail("invalid-id", `Invalid canonical ID: ${value}`);
  }
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  return { kind: kind as CanonicalIdKind, token };
}

export function parseChangeId(value: BoundaryValue) {
  const parsed = parseCanonicalId(value, "change");
  return { kind: "change", token: parsed.token };
}

export function assertRevisionId(value: BoundaryValue): RevisionId {
  if (!__epochIsString(value) || !eventIdPattern.test(value)) fail("invalid-ref", "RevisionId must be a signed EventId");
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  return value as RevisionId;
}

function platformRandom(byteLength: number): Uint8Array {
  const crypto = globalThis.crypto;
  if (crypto === undefined || !__epochIsFunction(crypto.getRandomValues)) {
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
