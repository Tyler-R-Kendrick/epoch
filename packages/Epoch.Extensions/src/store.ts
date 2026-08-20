import type { TrustGrant } from "./trust";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };
function __epochIsString<T>(value: T): value is T & string { return typeof value === "string"; }
function __epochIsObject<T>(value: T): value is T & object { return typeof value === "object"; }


/**
 * The machine-owned record of extension consent (ADR-0037).
 *
 * Operator policy and recorded consent are different kinds of data and belong
 * in different files. `.epoch/config.toml` is hand-authored: humans choose the
 * trust mode, pin publishers, and block names there, and Epoch only reads it.
 * This store is the inverse — Epoch owns every byte, rewrites it whole, and no
 * human is expected to edit it.
 *
 * Separating them removes a class of defect rather than another instance of
 * one. Editing TOML in place means re-deriving which spellings name the same
 * table (`[extensions]`, `["extensions"]`, `["extensions"]`, …) and
 * escaping every value written back. Getting any of it wrong corrupts the file
 * that decides whether an external process runs. A whole-file JSON document
 * has no such surface: it is parsed by the platform and serialized by the
 * platform.
 */

export const TRUST_STORE_VERSION = 1;

export interface TrustStore {
  readonly version: number;
  /** Consent recorded by `epoch ext trust`, newest state only. */
  readonly allow: readonly TrustGrant[];
  /** Revocations recorded by `epoch ext untrust`. Wins over every allow. */
  readonly block: readonly string[];
}

export const EMPTY_TRUST_STORE: TrustStore = { version: TRUST_STORE_VERSION, allow: [], block: [] };

export class TrustStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TrustStoreError";
  }
}

function requireStringArray(value: BoundaryValue, field: string): readonly string[] {
  if (!Array.isArray(value)) throw new TrustStoreError(`trust store field '${field}' must be an array`);
  return value.map((entry) => {
    if (!__epochIsString(entry)) throw new TrustStoreError(`trust store field '${field}' must contain only strings`);
    return entry;
  });
}

/**
 * Parse a trust store, failing closed.
 *
 * A malformed store is an error rather than an empty store: silently reading
 * corruption as "no entries" would drop the `block` list, turning a damaged
 * file into a widened policy. The caller decides what to do, and every caller
 * in Epoch answers by refusing to trust anything.
 */
export function parseTrustStore(text: string): TrustStore {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw new TrustStoreError(`trust store is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!__epochIsObject(raw) || raw === null || Array.isArray(raw)) {
    throw new TrustStoreError("trust store must be a JSON object");
  }

  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  const record = raw as Record<string, DictionaryValue>;
  if (record.version !== TRUST_STORE_VERSION) {
    // A store written by a newer Epoch may carry grant semantics this build
    // does not implement, so honouring the parts it recognizes could grant more
    // than the operator consented to.
    throw new TrustStoreError(`unsupported trust store version ${String(record.version)}; expected ${TRUST_STORE_VERSION}`);
  }

  const rawAllow = record.allow;
  if (!Array.isArray(rawAllow)) throw new TrustStoreError("trust store field 'allow' must be an array");
  const allow = rawAllow.map((entry): TrustGrant => {
    if (!__epochIsObject(entry) || entry === null || Array.isArray(entry)) {
      throw new TrustStoreError("each trust store grant must be an object");
    }
    // SAFETY: The module validates or constructs this value before applying the asserted contract.
    const grant = entry as Record<string, DictionaryValue>;
    if (!__epochIsString(grant.name) || grant.name.length === 0) {
      throw new TrustStoreError("each trust store grant needs a non-empty 'name'");
    }
    // A grant without a digest is consent to a name rather than to a binary,
    // which is the property this store exists to provide. Rejecting it here is
    // what keeps a hand-edited or older store from reintroducing it.
    const digest = grant.executableSha256;
    if (!__epochIsString(digest) || !/^[a-f0-9]{64}$/u.test(digest)) {
      throw new TrustStoreError(`grant '${grant.name}' needs an 'executableSha256' binding it to a binary`);
    }
    return { name: grant.name, executableSha256: digest };
  });

  return { version: TRUST_STORE_VERSION, allow, block: requireStringArray(record.block, "block") };
}

/**
 * Serialize a store deterministically.
 *
 * Sorted so that two clones consenting to the same set produce byte-identical
 * files, which keeps the store diffable and its history reviewable.
 */
export function serializeTrustStore(store: TrustStore): string {
  const allow = [...store.allow]
    .sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0))
    .map((grant) => ({ executableSha256: grant.executableSha256, name: grant.name }));
  return `${JSON.stringify({ allow, block: [...store.block].sort(), version: TRUST_STORE_VERSION }, null, 2)}\n`;
}

/**
 * Record consent for one extension, binding it to the binary consented to.
 *
 * Trusting also clears any block, so `trust` is a true inverse of `untrust`
 * rather than a half-measure that leaves the name denied.
 */
export function grantTrust(store: TrustStore, name: string, executableSha256: string): TrustStore {
  return {
    version: TRUST_STORE_VERSION,
    allow: [...store.allow.filter((grant) => grant.name !== name), { name, executableSha256 }],
    block: store.block.filter((entry) => entry !== name),
  };
}

/**
 * Revoke one extension.
 *
 * The name is added to `block` rather than merely dropped from `allow`, because
 * `signed` and `any` admit extensions that were never in `allow`; removing an
 * absent entry would revoke nothing while reporting success.
 */
export function revokeTrust(store: TrustStore, name: string): TrustStore {
  return {
    version: TRUST_STORE_VERSION,
    allow: store.allow.filter((grant) => grant.name !== name),
    block: [...new Set([...store.block, name])],
  };
}
