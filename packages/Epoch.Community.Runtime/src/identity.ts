import { digestOf } from "./digest";

/**
 * Browser identity.
 *
 * "browser" as an author is fine until two devices, or two people, write into
 * histories that later meet — then every event says the same thing about who
 * made it, which is the same as saying nothing. This mints a stable identity
 * per device, derived from a WebCrypto key pair whose private half is
 * non-extractable: the browser will use it and will not hand it over, so an
 * exported workspace cannot leak the ability to impersonate its author.
 *
 * What this is not: signing. Events are not yet signed with this key — that
 * belongs with Core's signing path, and claiming it here would be the exact
 * kind of overstatement this codebase avoids. What you get today is a stable,
 * device-held actor id and a public key to bind to a claimed identity later.
 *
 * Claiming works by addition. Anonymous history keeps its anonymous author; a
 * claim is a new record linking that actor to a portable identity, so nothing
 * already written has to be rewritten to become attributable.
 */
export interface BrowserIdentity {
  readonly actor: string;
  readonly kind: "device" | "ephemeral";
  readonly publicKey?: JsonWebKey;
  readonly created: boolean;
}

export interface ResolveIdentityOptions {
  readonly namespace: string;
  readonly storage: {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
  };
  readonly crypto?: Crypto;
}

interface StoredIdentity {
  readonly version: 1;
  readonly actor: string;
  readonly publicKey: JsonWebKey;
}

const ALGORITHM: EcKeyGenParams = { name: "ECDSA", namedCurve: "P-256" };

export async function resolveBrowserIdentity(options: ResolveIdentityOptions): Promise<BrowserIdentity> {
  const key = `${options.namespace}:identity`;
  const stored = readStored(options.storage.getItem(key));
  if (stored !== undefined) {
    return { actor: stored.actor, kind: "device", publicKey: stored.publicKey, created: false };
  }

  const subtle = (options.crypto ?? globalThis.crypto)?.subtle;
  if (subtle === undefined) {
    // No WebCrypto: an honest ephemeral identity beats a fake durable one.
    return { actor: "did:epoch:anonymous", kind: "ephemeral", created: false };
  }

  try {
    const pair = await subtle.generateKey(ALGORITHM, false, ["sign", "verify"]);
    const publicKey = await subtle.exportKey("jwk", pair.publicKey);
    const actor = `did:epoch:${digestOf(publicKey)}`;
    const record: StoredIdentity = { version: 1, actor, publicKey };
    options.storage.setItem(key, JSON.stringify(record));
    return { actor, kind: "device", publicKey, created: true };
  } catch {
    return { actor: "did:epoch:anonymous", kind: "ephemeral", created: false };
  }
}

function readStored(raw: string | null): StoredIdentity | undefined {
  if (raw === null) return undefined;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredIdentity>;
    if (parsed.version !== 1 || typeof parsed.actor !== "string" || parsed.publicKey === undefined) {
      return undefined;
    }
    return { version: 1, actor: parsed.actor, publicKey: parsed.publicKey };
  } catch {
    return undefined;
  }
}
