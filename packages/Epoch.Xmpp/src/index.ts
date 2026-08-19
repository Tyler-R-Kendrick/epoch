/**
 * @epoch/xmpp — Epoch-native with optional XMPP s2s bridges (ADR-0055).
 *
 * This is a loss-declared FederationTransport: bytes in, bytes out.
 * JIDs are admission only. Clients re-verify signatures. Default off.
 */

export const XMPP_FIDELITY_STATEMENT = Object.freeze({
  schemaVersion: 1,
  phrase: "Epoch-native with optional bridges",
  xeps: {
    adopted: ["XEP-6120", "XEP-6121", "XEP-0178", "XEP-0313"],
    legacyReducedTrust: ["XEP-0220"],
    refused: ["XEP-0045", "XEP-0071", "XEP-0198-as-identity", "XEP-0280"],
  },
  identity: "jid-admission-only",
  authority: "epoch-ed25519-and-adr-0023-bindings",
  defaultEnabled: false,
} as const);

export class PrivatePublishError extends Error {
  readonly code = "private_publish_forbidden" as const;
  constructor(message = "Private content cannot be federated over XMPP s2s") {
    super(message);
    this.name = "PrivatePublishError";
  }
}

export interface FederationTransport {
  send(bytes: Uint8Array, destServer: string): Promise<void>;
  receive(): AsyncIterable<Uint8Array>;
  assertPublic(visibility: string): void;
}

export type XmppTransportOptions = {
  readonly enabled?: boolean;
  readonly allowlist?: readonly string[];
  readonly closedRing?: boolean;
};

type InboxItem = { readonly bytes: Uint8Array; readonly fromServer: string };

export class InMemoryXmppTransport implements FederationTransport {
  readonly #inbox: InboxItem[] = [];
  readonly #enabled: boolean;
  readonly #allowlist: ReadonlySet<string>;
  readonly #closedRing: boolean;
  readonly #waiters: Array<(item: InboxItem) => void> = [];

  constructor(options: XmppTransportOptions = {}) {
    this.#enabled = options.enabled === true;
    this.#allowlist = new Set(options.allowlist ?? []);
    this.#closedRing = options.closedRing === true;
  }

  assertPublic(visibility: string): void {
    if (visibility !== "public") {
      throw new PrivatePublishError(`Cannot federate visibility=${visibility} over XMPP s2s`);
    }
  }

  async send(bytes: Uint8Array, destServer: string): Promise<void> {
    if (!this.#enabled) {
      throw new Error("xmpp transport is off");
    }
    this.#admit(destServer);
    const copy = new Uint8Array(bytes);
    this.#inbox.push({ bytes: copy, fromServer: destServer });
    const waiter = this.#waiters.shift();
    if (waiter) waiter({ bytes: copy, fromServer: destServer });
  }

  async *receive(): AsyncIterable<Uint8Array> {
    for (const item of this.#inbox) {
      yield new Uint8Array(item.bytes);
    }
  }

  deliverFrom(fromServer: string, bytes: Uint8Array): void {
    this.#admit(fromServer);
    this.#inbox.push({ bytes: new Uint8Array(bytes), fromServer });
  }

  #admit(server: string): void {
    if (this.#closedRing || this.#allowlist.size > 0) {
      if (!this.#allowlist.has(server)) {
        throw new Error(`unknown xmpp server denied: ${server}`);
      }
    }
  }
}

export function createXmppTransport(options: XmppTransportOptions = {}): FederationTransport {
  return new InMemoryXmppTransport(options);
}

/** Dialback-only peers are reduced-trust admission, never full (XEP-0220). */
export function dialbackTrustLevel(mechanism: "sasl-external" | "dialback"): "full" | "reduced" {
  return mechanism === "sasl-external" ? "full" : "reduced";
}

export function principalFromJid(_jid: string): never {
  throw new Error("JIDs are admission only; they never author Epoch principals");
}
