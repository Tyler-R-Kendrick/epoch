import assert from "node:assert/strict";
import test from "node:test";
import { TextEncoder } from "node:util";
import {
  LocalEd25519AuthoritySigner,
  Nip46AuthoritySigner,
  TestAuthoritySigner,
  verifyEd25519AuthoritySignature,
} from "../dist/authority/signers.js";
import { AuthorityLedger } from "../dist/authority/index.js";
import { authorizeMembership } from "../dist/authority/membership.js";

const NOW = 2_000_000_000_000;

test("local, remote NIP-46, and explicit test signers share a public-only contract", async () => {
  const local = new LocalEd25519AuthoritySigner(new Uint8Array(32).fill(7), "did:key:zLocal#sign");
  const message = new TextEncoder().encode("epoch authority");
  const signature = await local.sign(message);
  assert.equal(await verifyEd25519AuthoritySignature(local.publicKey, message, signature), true);
  assert.equal("privateKey" in local, false);

  const remoteCalls = [];
  const remote = new Nip46AuthoritySigner({ keyId: "nostr:npub-agent", publicKey: "ab".repeat(32),
    request: async (method, params) => { remoteCalls.push([method, params]); return "cd".repeat(64); } });
  assert.equal((await remote.sign(message)).length, 64);
  assert.deepEqual(remoteCalls[0][0], "sign_event");

  assert.throws(() => new TestAuthoritySigner("test:key", new Uint8Array()), /non-empty/u);
  const testSigner = new TestAuthoritySigner("test:key", new Uint8Array([1, 2, 3]));
  assert.deepEqual(await testSigner.sign(message), await testSigner.sign(message));
});

test("agent membership requires its own active key and grant; human merge/release defaults", () => {
  const ledger = new AuthorityLedger({ now: () => NOW });
  ledger.registerPrincipal({ principalId: "epoch:principal:human", kind: "human",
    keys: [{ keyId: "did:key:human#root", algorithm: "Ed25519", purpose: "root", state: "active" }] });
  ledger.registerPrincipal({ principalId: "epoch:principal:agent", kind: "agent",
    keys: [{ keyId: "did:key:agent#sign", algorithm: "Ed25519", purpose: "signing", state: "active" }] });
  ledger.issueGrant({ grantId: "agent-member", issuerId: "epoch:principal:human", subjectId: "epoch:principal:agent",
    actions: ["community.join"], resources: ["community:epoch"], expiresAt: NOW + 60_000 });
  assert.equal(authorizeMembership(ledger, { principalId: "epoch:principal:agent", keyId: "did:key:agent#sign",
    grantId: "agent-member", communityId: "community:epoch" }).allow, true);
  assert.equal(authorizeMembership(ledger, { principalId: "epoch:principal:agent", keyId: "did:key:human#root",
    grantId: "agent-member", communityId: "community:epoch" }).reason, "principal-key-mismatch");
  assert.deepEqual(authorizeMembership(ledger, { principalId: "epoch:principal:human", keyId: "did:key:human#root",
    communityId: "community:epoch" }).defaults, { merge: "human-approval", release: "human-approval" });
});

test("budget reservations use CAS, leases, releases, and idempotent receipts", () => {
  let now = NOW;
  const ledger = new AuthorityLedger({ now: () => now });
  ledger.registerPrincipal({ principalId: "epoch:principal:human", kind: "human",
    keys: [{ keyId: "did:key:human#root", algorithm: "Ed25519", purpose: "root", state: "active" }] });
  ledger.registerPrincipal({ principalId: "epoch:principal:agent", kind: "agent",
    keys: [{ keyId: "did:key:agent#sign", algorithm: "Ed25519", purpose: "signing", state: "active" }] });
  ledger.issueGrant({ grantId: "budget", issuerId: "epoch:principal:human", subjectId: "epoch:principal:agent",
    actions: ["model.call"], resources: ["provider:local"], expiresAt: NOW + 60_000,
    budget: [{ unit: "model-call", limit: 2 }, { unit: "concurrency", limit: 1 }] });
  const reserved = ledger.reserve({ reservationId: "r1", grantId: "budget", unit: "model-call", amount: 1,
    expectedVersion: 0, leaseMs: 1000 });
  assert.equal(reserved.version, 1);
  assert.throws(() => ledger.reserve({ reservationId: "r2", grantId: "budget", unit: "model-call", amount: 1,
    expectedVersion: 0, leaseMs: 1000 }), /CAS/u);
  const receipt = ledger.consume({ reservationId: "r1", receiptId: "receipt-1" });
  assert.strictEqual(ledger.consume({ reservationId: "r1", receiptId: "receipt-1" }), receipt);
  const expiring = ledger.reserve({ reservationId: "r2", grantId: "budget", unit: "model-call", amount: 1,
    expectedVersion: 1, leaseMs: 10 });
  assert.equal(expiring.state, "reserved");
  now += 11;
  assert.throws(() => ledger.consume({ reservationId: "r2", receiptId: "late" }), /unavailable/u);
  const released = ledger.reserve({ reservationId: "r3", grantId: "budget", unit: "model-call", amount: 1,
    expectedVersion: 2, leaseMs: 100 });
  assert.equal(released.state, "reserved");
  assert.equal(ledger.release("r3"), true);
  assert.equal(ledger.release("r3"), false);
});

test("budget reservation and consumption fail closed when principal or grant ancestry becomes inactive", () => {
  let now = NOW;
  const ledger = new AuthorityLedger({ now: () => now });
  const human = { principalId: "epoch:principal:human", kind: "human",
    keys: [{ keyId: "did:key:human#root", algorithm: "Ed25519", purpose: "root", state: "active" }] };
  const agent = { principalId: "epoch:principal:agent", kind: "agent",
    keys: [{ keyId: "did:key:agent#sign", algorithm: "Ed25519", purpose: "signing", state: "active" }] };
  ledger.registerPrincipal(human);
  ledger.registerPrincipal(agent);
  ledger.issueGrant({ grantId: "parent", issuerId: human.principalId, subjectId: agent.principalId,
    actions: ["model.call"], resources: ["provider:local"], expiresAt: NOW + 100,
    budget: [{ unit: "model-call", limit: 4 }] });
  ledger.issueGrant({ grantId: "child", parentGrantId: "parent", issuerId: agent.principalId, subjectId: agent.principalId,
    actions: ["model.call"], resources: ["provider:local"], notBefore: NOW + 10, expiresAt: NOW + 100,
    budget: [{ unit: "model-call", limit: 4 }] });

  assert.throws(() => ledger.reserve({ reservationId: "early", grantId: "child", unit: "model-call", amount: 1,
    expectedVersion: 0, leaseMs: 100 }), /not active/u);
  now += 10;
  ledger.reserve({ reservationId: "reserved", grantId: "child", unit: "model-call", amount: 1,
    expectedVersion: 0, leaseMs: 100 });
  ledger.revokeGrant("parent", "compromised");
  assert.throws(() => ledger.consume({ reservationId: "reserved", receiptId: "blocked" }), /ancestor.*revoked/u);
  assert.throws(() => ledger.reserve({ reservationId: "revoked", grantId: "child", unit: "model-call", amount: 1,
    expectedVersion: 1, leaseMs: 100 }), /ancestor.*revoked/u);

  const suspended = new AuthorityLedger({ now: () => now });
  suspended.registerPrincipal(human);
  suspended.registerPrincipal(agent);
  suspended.issueGrant({ grantId: "budget", issuerId: human.principalId, subjectId: agent.principalId,
    actions: ["model.call"], resources: ["provider:local"], expiresAt: now + 10,
    budget: [{ unit: "model-call", limit: 1 }] });
  suspended.registerPrincipal({ ...agent, status: "suspended" });
  assert.throws(() => suspended.reserve({ reservationId: "suspended", grantId: "budget", unit: "model-call", amount: 1,
    expectedVersion: 0, leaseMs: 5 }), /principal.*inactive/u);
  suspended.registerPrincipal(agent);
  now += 10;
  assert.throws(() => suspended.reserve({ reservationId: "expired", grantId: "budget", unit: "model-call", amount: 1,
    expectedVersion: 0, leaseMs: 5 }), /expired/u);
});
