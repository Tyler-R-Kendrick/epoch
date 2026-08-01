import { indexEntrySchema, type IndexEntry } from "../schemas/binding-record";

/**
 * Witness store only (Invariant 5 / Section 6).
 * Never invents, edits, or soft-deletes bindings. Compromised index ⇒ stale/DoS only.
 */
export class WitnessIndexStore {
  readonly #byPair = new Map<string, IndexEntry>();
  readonly #byNostr = new Map<string, Set<string>>();
  readonly #byDid = new Map<string, Set<string>>();

  put(entry: IndexEntry): void {
    const parsed = indexEntrySchema.parse(entry);
    this.#byPair.set(parsed.pairKey, parsed);
    // pairKey = `${nostrPubkey}:${atDid}` — DID itself contains colons (did:plc:…).
    const sep = parsed.pairKey.indexOf(":");
    if (sep <= 0) {
      return;
    }
    const nostr = parsed.pairKey.slice(0, sep);
    const did = parsed.pairKey.slice(sep + 1);
    if (nostr.length === 0 || did.length === 0) {
      return;
    }
    const nSet = this.#byNostr.get(nostr) ?? new Set<string>();
    nSet.add(parsed.pairKey);
    this.#byNostr.set(nostr, nSet);
    const dSet = this.#byDid.get(did) ?? new Set<string>();
    dSet.add(parsed.pairKey);
    this.#byDid.set(did, dSet);
  }

  get(pairKey: string): IndexEntry | undefined {
    return this.#byPair.get(pairKey);
  }

  byNostr(pubkey: string): readonly IndexEntry[] {
    const keys = this.#byNostr.get(pubkey.toLowerCase());
    if (keys === undefined) {
      return [];
    }
    return [...keys].map((key) => this.#byPair.get(key)!).filter(Boolean);
  }

  byDid(did: string): readonly IndexEntry[] {
    const keys = this.#byDid.get(did);
    if (keys === undefined) {
      return [];
    }
    return [...keys].map((key) => this.#byPair.get(key)!).filter(Boolean);
  }

  head(pairKey: string): IndexEntry["chainHead"] | undefined {
    return this.#byPair.get(pairKey)?.chainHead;
  }

  /** Chaos/restart recovery: replace store contents from a snapshot of verified entries. */
  replaceAll(entries: readonly IndexEntry[]): void {
    this.#byPair.clear();
    this.#byNostr.clear();
    this.#byDid.clear();
    for (const entry of entries) {
      this.put(entry);
    }
  }

  all(): readonly IndexEntry[] {
    return [...this.#byPair.values()];
  }
}
