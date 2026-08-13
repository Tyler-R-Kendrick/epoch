import { stableJson } from "@epoch/integration-core";

/**
 * Content digests for runtime records.
 *
 * Every identifier this package mints — command ids, harness release ids,
 * validation receipt ids — is derived from the stable JSON of its inputs rather
 * than from a clock or a random source. That keeps receipts reproducible: the
 * same command, issued from the UI, WebMCP, or the CLI against the same base,
 * produces the same identifier, which is what makes "these four interfaces did
 * the same thing" a checkable claim instead of a slogan.
 *
 * This is a non-cryptographic digest. It detects drift and accidental
 * corruption; it is not a signature and must never be presented as one. Signed
 * provenance belongs to the Epoch core signing path.
 */
export function digestOf(value: unknown): string {
  return fnv1a(stableJson(value));
}

/** `prefix_<digest>` — the shape every runtime identifier uses. */
export function identifier(prefix: string, value: unknown): string {
  return `${prefix}_${digestOf(value)}`;
}

function fnv1a(input: string): string {
  let high = 0x8422;
  let low = 0x5325;
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    low ^= code & 0xffff;
    high ^= (code >>> 16) & 0xffff;
    const lowProduct = low * 0x01b3;
    const highProduct = high * 0x01b3 + ((lowProduct / 0x10000) | 0);
    low = lowProduct & 0xffff;
    high = highProduct & 0xffff;
  }

  return `${hex(high)}${hex(low)}`;
}

function hex(value: number): string {
  return (value >>> 0).toString(16).padStart(4, "0");
}
