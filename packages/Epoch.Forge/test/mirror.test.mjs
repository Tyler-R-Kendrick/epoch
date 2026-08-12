import assert from "node:assert/strict";
import console from "node:console";
import {
  MirrorCoordinator,
  createMirrorRule,
  mirrorLoopMarker,
  validateMirrorRemote,
} from "../dist/mirror.js";

await rejectsPrivateAndRebindingRemotes();
await enforcesAuthorityIdempotencyAndDrift();

async function rejectsPrivateAndRebindingRemotes() {
  await assert.rejects(validateMirrorRemote("http://example.com/repo.git"), /HTTPS/i);
  await assert.rejects(validateMirrorRemote("https://127.0.0.1/repo.git"), /private|loopback/i);
  await assert.rejects(validateMirrorRemote("https://user:secret@example.com/repo.git"), /credential/i);
  await assert.rejects(validateMirrorRemote("https://rebind.example/repo.git", async () => ["10.0.0.1"]), /private/i);
  assert.equal((await validateMirrorRemote("https://forge.example/repo.git", async () => ["203.0.113.10"])).hostname,
    "forge.example");
}

async function enforcesAuthorityIdempotencyAndDrift() {
  const rule = createMirrorRule({
    ruleId: "main-export", direction: "export", authority: "epoch-primary",
    sourceRef: "refs/heads/main", destinationRef: "refs/heads/main", credentialRef: "secret://forge/main",
    force: "deny", deletion: "deny",
  });
  const coordinator = new MirrorCoordinator([rule]);
  const operation = { operationId: "op-1", ruleId: rule.ruleId, sourceOid: "a".repeat(40),
    expectedOldOid: "b".repeat(40), observedDestinationOid: "b".repeat(40) };
  const applied = coordinator.reconcile(operation);
  assert.equal(applied.outcome, "apply");
  assert.equal(coordinator.reconcile(operation).outcome, "replayed");
  assert.equal(applied.loopMarker, mirrorLoopMarker(rule, operation.sourceOid));
  coordinator.pauseRef(rule.ruleId, "operator review");
  assert.equal(coordinator.reconcile({ ...operation, operationId: "op-2" }).outcome, "paused");
  coordinator.resumeRef(rule.ruleId);
  const drift = coordinator.reconcile({ ...operation, operationId: "op-3", observedDestinationOid: "c".repeat(40) });
  assert.equal(drift.outcome, "conflict");
  assert.match(drift.conflictRef, /^refs\/epoch\/import-conflicts\//);
  assert.equal(coordinator.checkpoint(rule.ruleId)?.lastOperationId, "op-3");
  const retry = coordinator.recordRetry(rule.ruleId, "temporary outage");
  assert.equal(retry.attempt, 1);
  assert.ok(retry.notBefore > Date.now());
  assert.throws(() => createMirrorRule({ ...rule, ruleId: "bad-force", authority: "git-primary", force: "allow" }),
    /Git-primary.*force/i);
}

console.log("forge mirror foundation tests passed");
