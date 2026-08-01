import type { IndexEntry } from "../schemas/binding-record";
import type { VerifyBindingInput } from "../verify/verifyBinding";
import { verifyBinding } from "../verify/verifyBinding";
import type { WitnessIndexStore } from "./store";
import type { NostrEvent } from "../schemas/binding-event";
import { computeEventId } from "../nostr/nip01";

export type IndexApiDeps = {
  readonly store: WitnessIndexStore;
  readonly reverify: Omit<VerifyBindingInput, "nostrEvent" | "carSliceB64" | "pinnedHead" | "nostrChain">;
  readonly ttlMs: number;
};

/**
 * Query API: by-nostr, by-did, proof/, head/
 * Reads re-run Section 4 when cached verdict older than TTL.
 */
export class WitnessIndexApi {
  readonly #store: WitnessIndexStore;
  readonly #reverify: IndexApiDeps["reverify"];
  readonly #ttlMs: number;

  constructor(deps: IndexApiDeps) {
    this.#store = deps.store;
    this.#reverify = deps.reverify;
    this.#ttlMs = deps.ttlMs;
  }

  byNostr(pubkey: string): readonly IndexEntry[] {
    return this.#store.byNostr(pubkey);
  }

  byDid(did: string): readonly IndexEntry[] {
    return this.#store.byDid(did);
  }

  head(pairKey: string): IndexEntry["chainHead"] | undefined {
    return this.#store.head(pairKey);
  }

  proof(pairKey: string): IndexEntry | undefined {
    return this.#store.get(pairKey);
  }

  /**
   * Re-verify a stored entry when stale. Index never alters protocol truth —
   * only refreshes lastReverifiedAt / status from pure verifier.
   *
   * Multi-seqno heads (including revocations) require the stored prior chain
   * (`proof.nostrChain`); without it Section 4 would return chain-broken and
   * incorrectly overwrite a legitimate revoked status.
   */
  async reverifyIfStale(pairKey: string, now = Date.now()): Promise<IndexEntry | undefined> {
    const entry = this.#store.get(pairKey);
    if (entry === undefined) {
      return undefined;
    }
    const last = Date.parse(entry.lastReverifiedAt);
    if (!Number.isNaN(last) && now - last < this.#ttlMs) {
      return entry;
    }

    const nostrEvent = entry.proof.nostrEvent as NostrEvent;
    const headId = entry.chainHead.nostrEventId;
    const priors = normalizePriors(
      (entry.proof as { readonly nostrChain?: readonly NostrEvent[] }).nostrChain,
      headId,
    );

    // seqno>1 without priors cannot be re-verified honestly — keep stored status.
    if (entry.chainHead.seqno > 1 && priors.length === 0) {
      const unchanged: IndexEntry = {
        ...entry,
        lastReverifiedAt: new Date(now).toISOString(),
      };
      this.#store.put(unchanged);
      return unchanged;
    }

    const result = await verifyBinding({
      ...this.#reverify,
      nostrEvent,
      nostrChain: priors.length > 0 ? priors : undefined,
      carSliceB64: entry.proof.carSliceB64,
      // Pin the stored head so rollbacks cannot win during re-verify.
      pinnedHead: {
        seqno: entry.chainHead.seqno,
        id: entry.chainHead.nostrEventId,
      },
    });

    const status = result.valid
      ? "valid"
      : result.status === "revoked" || result.reason === "revoked"
        ? "revoked"
        : result.status === "expired" || result.reason === "expired"
          ? "expired"
          : result.status === "invalid"
            ? "conflict"
            : result.status;

    const updated: IndexEntry = {
      ...entry,
      status,
      proof: {
        ...entry.proof,
        // Keep priors for the next re-verify.
        nostrChain: priors,
      },
      lastReverifiedAt: new Date(now).toISOString(),
    };
    this.#store.put(updated);
    return updated;
  }
}

function normalizePriors(
  chain: readonly NostrEvent[] | undefined,
  headId: string,
): NostrEvent[] {
  if (chain === undefined || chain.length === 0) {
    return [];
  }
  const out: NostrEvent[] = [];
  const seen = new Set<string>();
  for (const event of chain) {
    const id = event.id ?? computeEventId(event);
    if (id === headId || seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push(event);
  }
  return out;
}
