import assert from "node:assert/strict";
import { generateKeyPairSync, sign, type KeyObject } from "node:crypto";
import {
  canonicalManifest,
  evaluatePublisher,
  evaluateTrust,
  isExpired,
  manifestSigningPayload,
  revocationSigningPayload,
  successorSigningPayload,
  type ExtensionManifest,
  type ExtensionTrustPolicy,
  type PublisherLifecycle,
  type PublisherRevocation,
  type SuccessorStatement,
} from "@epoch/extensions";

/**
 * Publisher key lifecycle (ADR-0045).
 *
 * `signed` trust previously meant "some key signed this, forever, with no way
 * to take it back". These tests are about the three statements that give the
 * claim a duration and a withdrawal path — and about the precedence between
 * them, which is where a lifecycle design usually goes wrong.
 */
export function runPublisherLifecycleTests(): void {
  rotationExtendsTrustWithoutEditingEveryClone();
  aChainIsBoundedAndOnlyItsOwnKeysMayExtendIt();
  revocationOutranksEveryAllow();
  onlyProvableRevocationsReplicate();
  signaturesMayExpire();
  addingExpiryDoesNotChangeExistingSignedBytes();
}

interface Publisher {
  readonly id: string;
  readonly key: KeyObject;
}

function publisher(): Publisher {
  const pair = generateKeyPairSync("ed25519");
  const spki = pair.publicKey.export({ format: "der", type: "spki" });
  return { id: `epoch:principal:${spki.toString("base64url")}`, key: pair.privateKey };
}

function signed(payload: string, key: KeyObject): string {
  return `ed25519:${sign(null, Buffer.from(payload, "utf8"), key).toString("base64")}`;
}

function succession(from: Publisher, to: Publisher, signer: Publisher = from): SuccessorStatement {
  const statement = {
    predecessor: from.id,
    successor: to.id,
    issuedAt: "2026-01-01T00:00:00Z",
    signature: "",
  };
  return { ...statement, signature: signed(successorSigningPayload(statement), signer.key) };
}

function selfRevocation(who: Publisher, effectiveAt = "2020-01-01T00:00:00Z", reason?: string): PublisherRevocation {
  const revocation: PublisherRevocation = { publisher: who.id, effectiveAt, reason };
  return { ...revocation, signature: signed(revocationSigningPayload(revocation), who.key) };
}

function lifecycle(overrides: Partial<PublisherLifecycle> = {}): PublisherLifecycle {
  return { successors: [], revocations: [], revokedPublishers: [], ...overrides };
}

/**
 * The problem rotation solves: a publisher who changes keys becomes, to every
 * repository, an unrelated stranger — so operators either never rotate or paste
 * keys they never verified.
 */
function rotationExtendsTrustWithoutEditingEveryClone(): void {
  const a = publisher();
  const b = publisher();
  const c = publisher();

  const chain = lifecycle({ successors: [succession(a, b), succession(b, c)] });
  assert.deepEqual(evaluatePublisher(a.id, [a.id], chain), { kind: "allowed", via: "direct", root: a.id, depth: 0 });
  assert.deepEqual(evaluatePublisher(b.id, [a.id], chain), { kind: "allowed", via: "succession", root: a.id, depth: 1 });
  assert.deepEqual(evaluatePublisher(c.id, [a.id], chain), { kind: "allowed", via: "succession", root: a.id, depth: 2 });

  // Succession runs forward only. Holding B never grants A.
  assert.equal(evaluatePublisher(a.id, [b.id], chain).kind, "not-allowed");
}

function aChainIsBoundedAndOnlyItsOwnKeysMayExtendIt(): void {
  const keys = Array.from({ length: 7 }, () => publisher());
  const successors = keys.slice(0, -1).map((key, index) => succession(key, keys[index + 1]));
  const root = [keys[0].id];

  assert.equal(evaluatePublisher(keys[4].id, root, lifecycle({ successors })).kind, "allowed");
  // Default depth is 4: a lost key must not be walkable into an unbounded
  // delegation graph.
  assert.equal(evaluatePublisher(keys[5].id, root, lifecycle({ successors })).kind, "not-allowed");
  assert.equal(
    evaluatePublisher(keys[2].id, root, lifecycle({ successors, maximumDepth: 1 })).kind,
    "not-allowed",
    "the limit is configurable and is applied",
  );

  // A statement the retiring key did not sign is an assertion by a stranger.
  const impostor = publisher();
  const forged = succession(keys[0], impostor, impostor);
  assert.equal(evaluatePublisher(impostor.id, root, lifecycle({ successors: [forged] })).kind, "not-allowed");
}

/**
 * Precedence is the whole design: revocation subtracts, everything else adds,
 * and subtraction always wins — including over a direct `allow_publishers`
 * entry and over trust that arrived by rotation.
 */
function revocationOutranksEveryAllow(): void {
  const a = publisher();
  const b = publisher();
  const successors = [succession(a, b)];

  const selfRevoked = evaluatePublisher(a.id, [a.id], lifecycle({ revocations: [selfRevocation(a, undefined, "key lost")] }));
  assert.equal(selfRevoked.kind, "revoked");
  assert.equal(selfRevoked.kind === "revoked" && selfRevoked.origin, "self");
  assert.equal(selfRevoked.kind === "revoked" && selfRevoked.reason, "key lost");

  // The operator's own file needs no signature: a compromised key's holder may
  // be exactly who they are defending against.
  const operatorRevoked = evaluatePublisher(a.id, [a.id], lifecycle({ revokedPublishers: [a.id] }));
  assert.equal(operatorRevoked.kind === "revoked" && operatorRevoked.origin, "operator");

  // Revoking a key takes everything it went on to name with it, or rotation
  // would be a way to outlive revocation.
  assert.equal(
    evaluatePublisher(b.id, [a.id], lifecycle({ successors, revokedPublishers: [a.id] })).kind,
    "not-allowed",
    "a chain rooted in a revoked key is not followed",
  );
  assert.equal(
    evaluatePublisher(b.id, [a.id], lifecycle({ successors, revokedPublishers: [b.id] })).kind,
    "revoked",
    "revoking the successor revokes the successor",
  );

  // And the trust policy applies the same precedence to a signed extension.
  const manifest: ExtensionManifest = {
    name: "greet",
    api: 1,
    version: "1.0.0",
    capabilities: ["command"],
    determinism: "deterministic",
    publisher: a.id,
    executableSha256: "a".repeat(64),
    signature: "",
  };
  const signedManifest = { ...manifest, signature: signed(manifestSigningPayload(manifest), a.key) };
  const policy = (over: Partial<ExtensionTrustPolicy>): ExtensionTrustPolicy => ({
    trust: "signed",
    allow: [],
    grants: [],
    block: [],
    allowPublishers: [a.id],
    ...over,
  });

  const allowed = evaluateTrust("greet", signedManifest, policy({}), { executableSha256: "a".repeat(64) });
  assert.equal(allowed.trusted, true);
  assert.equal(allowed.reason, "allowed-by-publisher");

  const revoked = evaluateTrust(
    "greet",
    signedManifest,
    policy({ lifecycle: lifecycle({ revokedPublishers: [a.id] }) }),
    { executableSha256: "a".repeat(64) },
  );
  assert.equal(revoked.trusted, false);
  assert.equal(revoked.reason, "publisher-revoked");
}

/**
 * Revocations replicate and consent does not, so what arrives over sync has to
 * carry its own proof. An unsigned revocation event would let any peer revoke
 * any publisher for everyone downstream.
 */
function onlyProvableRevocationsReplicate(): void {
  const a = publisher();
  const impostor = publisher();

  const unsigned: PublisherRevocation = { publisher: a.id, effectiveAt: "2020-01-01T00:00:00Z" };
  assert.equal(evaluatePublisher(a.id, [a.id], lifecycle({ revocations: [unsigned] })).kind, "allowed");

  const forged: PublisherRevocation = {
    publisher: a.id,
    effectiveAt: "2020-01-01T00:00:00Z",
    signature: signed(revocationSigningPayload({ publisher: a.id, effectiveAt: "2020-01-01T00:00:00Z" }), impostor.key),
  };
  assert.equal(evaluatePublisher(a.id, [a.id], lifecycle({ revocations: [forged] })).kind, "allowed");

  // A revocation dated in the future is not yet in force.
  const later = selfRevocation(a, "2099-01-01T00:00:00Z");
  assert.equal(evaluatePublisher(a.id, [a.id], lifecycle({ revocations: [later] })).kind, "allowed");
  assert.equal(
    evaluatePublisher(a.id, [a.id], lifecycle({ revocations: [later] }), { now: new Date("2100-01-01T00:00:00Z") }).kind,
    "revoked",
  );
}

function signaturesMayExpire(): void {
  assert.equal(isExpired(undefined), false, "no expiry keeps today's behaviour");
  assert.equal(isExpired("2099-01-01T00:00:00Z", new Date("2026-01-01T00:00:00Z")), false);
  assert.equal(isExpired("2020-01-01T00:00:00Z", new Date("2026-01-01T00:00:00Z")), true);
  // An expiry nobody can read is not a validity window anyone should rely on.
  assert.equal(isExpired("not a date"), true);

  const key = publisher();
  const base: ExtensionManifest = {
    name: "greet",
    api: 1,
    version: "1.0.0",
    capabilities: ["command"],
    determinism: "deterministic",
    publisher: key.id,
    executableSha256: "b".repeat(64),
    notAfter: "2026-06-01T00:00:00Z",
    signature: "",
  };
  const manifest = { ...base, signature: signed(manifestSigningPayload(base), key.key) };
  const policy: ExtensionTrustPolicy = {
    trust: "signed",
    allow: [],
    grants: [],
    block: [],
    allowPublishers: [key.id],
  };

  const fresh = evaluateTrust("greet", manifest, policy, {
    executableSha256: "b".repeat(64),
    now: new Date("2026-01-01T00:00:00Z"),
  });
  assert.equal(fresh.trusted, true);

  const stale = evaluateTrust("greet", manifest, policy, {
    executableSha256: "b".repeat(64),
    now: new Date("2027-01-01T00:00:00Z"),
  });
  assert.equal(stale.trusted, false);
  assert.equal(stale.reason, "signature-expired", "distinct from invalid-signature, because the remedies differ");
}

/**
 * The compatibility claim, checked rather than asserted: a manifest that
 * declares no expiry produces the exact bytes it produced before expiry
 * existed, so no signature made earlier stops verifying.
 */
function addingExpiryDoesNotChangeExistingSignedBytes(): void {
  const manifest: ExtensionManifest = {
    name: "greet",
    api: 1,
    version: "1.0.0",
    capabilities: ["command"],
    determinism: "deterministic",
    publisher: "epoch:principal:abc",
    executableSha256: "c".repeat(64),
  };
  assert.equal(
    canonicalManifest(manifest),
    JSON.stringify({
      api: 1,
      capabilities: ["command"],
      determinism: "deterministic",
      executableSha256: "c".repeat(64),
      name: "greet",
      publisher: "epoch:principal:abc",
      version: "1.0.0",
    }),
  );
  assert.match(canonicalManifest({ ...manifest, notAfter: "2026-06-01T00:00:00Z" }), /"notAfter":"2026-06-01T00:00:00Z"/u);
}
