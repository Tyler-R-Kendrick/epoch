import type { NostrEvent } from "../schemas/binding-event";

/**
 * Pinned relay set + republish policy (NIP-65-aware later).
 * Disabled never dials. Local-only uses in-process fixtures only.
 * Federated may dial — not used in CI.
 */
export type RelayMode = "disabled" | "local-only" | "federated";

export interface RelayClient {
  readonly mode?: RelayMode;
  publish(event: NostrEvent): Promise<void>;
  list(filter: { readonly kinds: readonly number[]; readonly authors?: readonly string[] }): Promise<readonly NostrEvent[]>;
}

export class InMemoryRelay implements RelayClient {
  readonly mode: RelayMode = "local-only";
  readonly #events: NostrEvent[] = [];
  /** Full append-only log for chain tests (addressable replace still applies to list()). */
  readonly #history: NostrEvent[] = [];

  async publish(event: NostrEvent): Promise<void> {
    this.#history.push(event);
    // Addressable kinds 30000–39999: replace same (kind, pubkey, d)
    if (event.kind >= 30000 && event.kind <= 39999) {
      const d = event.tags.find((tag) => tag[0] === "d")?.[1];
      this.#events.splice(
        0,
        this.#events.length,
        ...this.#events.filter((existing) => {
          if (existing.kind !== event.kind || existing.pubkey !== event.pubkey) {
            return true;
          }
          const existingD = existing.tags.find((tag) => tag[0] === "d")?.[1];
          return existingD !== d;
        }),
        event,
      );
      return;
    }
    this.#events.push(event);
  }

  async list(filter: { readonly kinds: readonly number[]; readonly authors?: readonly string[] }): Promise<readonly NostrEvent[]> {
    return this.#events.filter((event) => {
      if (!filter.kinds.includes(event.kind)) {
        return false;
      }
      if (filter.authors !== undefined && !filter.authors.includes(event.pubkey)) {
        return false;
      }
      return true;
    });
  }

  history(): readonly NostrEvent[] {
    return [...this.#history];
  }

  async publishHistorical(event: NostrEvent): Promise<void> {
    this.#history.push(event);
    this.#events.push(event);
  }
}

/**
 * Never dials external hosts. disabled → hard error on publish.
 * local-only → only inner local client; federated → same unless outer wraps network.
 */
export class GuardedRelayClient implements RelayClient {
  readonly mode: RelayMode;
  readonly #inner: RelayClient;

  constructor(inner: RelayClient, mode: RelayMode) {
    this.#inner = inner;
    this.mode = mode;
  }

  async publish(event: NostrEvent): Promise<void> {
    if (this.mode === "disabled") {
      throw new Error("FeatureDisabledError: Nostr relay publish disabled");
    }
    // local-only: refuse anything that looks like a remote URL mode
    if (this.mode === "local-only" && this.#inner.mode === "federated") {
      throw new Error("FeatureDisabledError: federated relay not allowed in local-only mode");
    }
    return this.#inner.publish(event);
  }

  async list(filter: { readonly kinds: readonly number[]; readonly authors?: readonly string[] }): Promise<readonly NostrEvent[]> {
    if (this.mode === "disabled") {
      return [];
    }
    return this.#inner.list(filter);
  }
}

/** Explicit no-op network client for disabled federation stubs. */
export class DisabledRelayClient implements RelayClient {
  readonly mode: RelayMode = "disabled";

  async publish(_event: NostrEvent): Promise<void> {
    throw new Error("FeatureDisabledError: Nostr relay publish disabled");
  }

  async list(_filter: { readonly kinds: readonly number[]; readonly authors?: readonly string[] }): Promise<readonly NostrEvent[]> {
    return [];
  }
}
