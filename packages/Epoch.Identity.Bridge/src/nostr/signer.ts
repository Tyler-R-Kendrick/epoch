import type { NostrEvent, NostrTag } from "../schemas/binding-event";
import { NOSTR_BINDING_KIND } from "../schemas/binding-event";
import { NOSTR_ATTESTATION_KIND } from "../schemas/attestation-event";
import { generateNostrKeypair, signEvent } from "./nip01";

/**
 * Signer backends (NIP-07 browser / NIP-46 remote / local hot key for tests).
 * FROSTR is a future swap behind the same interface (Invariant 7).
 */
export interface NostrSigner {
  readonly publicKey: string;
  signEvent(event: {
    readonly created_at: number;
    readonly kind: number;
    readonly tags: readonly NostrTag[];
    readonly content: string;
  }): Promise<NostrEvent>;
}

export class LocalHotNostrSigner implements NostrSigner {
  readonly publicKey: string;
  readonly #privateKey: string;

  constructor(keypair?: { readonly privateKey: string; readonly publicKey: string }) {
    const keys = keypair ?? generateNostrKeypair();
    this.#privateKey = keys.privateKey;
    this.publicKey = keys.publicKey;
  }

  /** Test-only escape hatch — never log this in production paths. */
  exportPrivateKeyForTests(): string {
    return this.#privateKey;
  }

  async signEvent(event: {
    readonly created_at: number;
    readonly kind: number;
    readonly tags: readonly NostrTag[];
    readonly content: string;
  }): Promise<NostrEvent> {
    return signEvent({ ...event, pubkey: this.publicKey }, this.#privateKey);
  }
}

/**
 * NIP-46 remote signer facade.
 * - Always enforces per-kind permissions (30422/30423 by default).
 * - Without a bunker session, never dials out (local-only / disabled safe).
 * - Optional local delegate for tests: permission gate still applies first.
 */
export class Nip46NostrSigner implements NostrSigner {
  readonly publicKey: string;
  readonly #allowedKinds: ReadonlySet<number>;
  readonly #delegate: NostrSigner | undefined;
  readonly #mode: "disabled" | "local-only" | "federated";

  constructor(options: {
    readonly publicKey: string;
    readonly allowedKinds?: readonly number[];
    /** Test/local bunker simulation — still kind-gated. */
    readonly localDelegate?: NostrSigner;
    readonly mode?: "disabled" | "local-only" | "federated";
  }) {
    this.publicKey = options.publicKey;
    this.#allowedKinds = new Set(options.allowedKinds ?? [NOSTR_BINDING_KIND, NOSTR_ATTESTATION_KIND]);
    this.#delegate = options.localDelegate;
    this.#mode = options.mode ?? "local-only";
  }

  async signEvent(event: {
    readonly created_at: number;
    readonly kind: number;
    readonly tags: readonly NostrTag[];
    readonly content: string;
  }): Promise<NostrEvent> {
    if (this.#mode === "disabled") {
      throw new Error("FeatureDisabledError: NIP-46 signing disabled");
    }
    if (!this.#allowedKinds.has(event.kind)) {
      throw new Error(`NIP-46 permission denied for kind ${event.kind}`);
    }
    if (this.#delegate !== undefined) {
      if (this.#delegate.publicKey !== this.publicKey) {
        throw new Error("NIP-46 delegate public key mismatch");
      }
      return this.#delegate.signEvent(event);
    }
    // Federated bunker path is not configured offline — never invent network I/O.
    throw new Error("NIP-46 remote signing requires a bunker session (not configured in this environment)");
  }
}
