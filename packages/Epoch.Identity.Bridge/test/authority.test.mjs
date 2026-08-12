import assert from "node:assert/strict";
import test from "node:test";
import {
  AuthorityLedger,
  IDENTITY_AUTHORITY_MANIFEST,
  parsePrincipalId,
} from "../dist/authority/index.js";

const NOW = 2_000_000_000_000;

test("principal identifiers and key ownership are stable and fail closed", () => {
  assert.equal(parsePrincipalId("epoch:principal:alice"), "epoch:principal:alice");
  assert.throws(() => parsePrincipalId("alice"), /principal id/u);
  const ledger = new AuthorityLedger({ now: () => NOW });
  ledger.registerPrincipal({
    principalId: "epoch:principal:alice",
    kind: "human",
    keys: [{ keyId: "did:key:zAlice#root", algorithm: "Ed25519", purpose: "root", state: "active" }],
  });
  assert.throws(() => ledger.registerPrincipal({
    principalId: "epoch:principal:mallory",
    kind: "human",
    keys: [{ keyId: "did:key:zAlice#root", algorithm: "Ed25519", purpose: "root", state: "active" }],
  }), /already bound/u);
});

test("delegated grants attenuate scope, expiry, resources, and budget", () => {
  const ledger = new AuthorityLedger({ now: () => NOW });
  ledger.registerPrincipal({
    principalId: "epoch:principal:owner",
    kind: "human",
    keys: [{ keyId: "did:key:zOwner#root", algorithm: "Ed25519", purpose: "root", state: "active" }],
  });
  ledger.registerPrincipal({
    principalId: "epoch:principal:agent",
    kind: "agent",
    keys: [{ keyId: "did:key:zAgent#sign", algorithm: "Ed25519", purpose: "signing", state: "active" }],
  });
  ledger.issueGrant({
    grantId: "grant-root",
    issuerId: "epoch:principal:owner",
    subjectId: "epoch:principal:agent",
    actions: ["repository.read", "change.propose"],
    resources: ["repo:epoch/*"],
    repositories: ["epoch/*"], paths: ["src/**"], tools: ["read"], models: ["local-*"], providers: ["local"],
    expiresAt: NOW + 60_000,
    budget: { unit: "model-token", limit: 100 },
  });
  assert.deepEqual(ledger.authorize({
    principalId: "epoch:principal:agent", grantId: "grant-root",
    action: "repository.read", resource: "repo:epoch/core", cost: 20,
  }), { allow: true, remaining: 80, explanation: ["grant:grant-root", "action:repository.read", "resource:repo:epoch/core"] });
  assert.equal(ledger.authorize({
    principalId: "epoch:principal:agent", grantId: "grant-root",
    action: "repository.write", resource: "repo:epoch/core", cost: 1,
  }).reason, "action-denied");
  assert.equal(ledger.authorize({
    principalId: "epoch:principal:agent", grantId: "grant-root",
    action: "repository.read", resource: "repo:other/core", cost: 1,
  }).reason, "resource-denied");
  assert.equal(ledger.authorize({ principalId: "epoch:principal:agent", grantId: "grant-root",
    action: "repository.read", resource: "repo:epoch/core", repository: "epoch/core", path: "secrets/key",
  }).reason, "path-denied");
  const exceeded = ledger.authorize({
    principalId: "epoch:principal:agent", grantId: "grant-root",
    action: "repository.read", resource: "repo:epoch/core", cost: 81,
  });
  assert.equal(exceeded.allow, false);
  assert.equal(exceeded.reason, "budget-exceeded");
  assert.equal(exceeded.remaining, 80);
});

test("child grants cannot broaden parent authority and revocation is transitive", () => {
  const ledger = new AuthorityLedger({ now: () => NOW });
  for (const [principalId, kind] of [["epoch:principal:owner", "human"], ["epoch:principal:agent", "agent"], ["epoch:principal:worker", "agent"]]) {
    ledger.registerPrincipal({ principalId, kind, keys: [{ keyId: `did:key:${principalId}#sign`, algorithm: "Ed25519", purpose: "signing", state: "active" }] });
  }
  ledger.issueGrant({ grantId: "parent", issuerId: "epoch:principal:owner", subjectId: "epoch:principal:agent",
    actions: ["repository.read"], resources: ["repo:epoch/*"], expiresAt: NOW + 50_000 });
  assert.throws(() => ledger.issueGrant({ grantId: "broad", parentGrantId: "parent",
    issuerId: "epoch:principal:agent", subjectId: "epoch:principal:worker",
    actions: ["repository.read", "repository.write"], resources: ["repo:epoch/*"], expiresAt: NOW + 40_000 }), /attenuate/u);
  ledger.issueGrant({ grantId: "child", parentGrantId: "parent",
    issuerId: "epoch:principal:agent", subjectId: "epoch:principal:worker",
    actions: ["repository.read"], resources: ["repo:epoch/core"], expiresAt: NOW + 40_000 });
  ledger.revokeGrant("parent", "owner-request");
  assert.equal(ledger.authorize({ principalId: "epoch:principal:worker", grantId: "child",
    action: "repository.read", resource: "repo:epoch/core" }).reason, "ancestor-revoked");
});

test("authority capability manifest is honest and versioned", () => {
  assert.equal(IDENTITY_AUTHORITY_MANIFEST.schemaVersion, 1);
  assert.equal(IDENTITY_AUTHORITY_MANIFEST.capabilities.offline, true);
  assert.equal(IDENTITY_AUTHORITY_MANIFEST.capabilities.persistence, false);
  assert.ok(IDENTITY_AUTHORITY_MANIFEST.limitations.some((item) => /in-memory/u.test(item)));
});
