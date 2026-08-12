import assert from "node:assert/strict";
import test from "node:test";
import { ConvergenceWorkbench, createConvergenceFixture } from "../dist/convergence.js";

test("atomic split preserves exact reconstruction and ambiguous split is fail-closed", () => {
  const workbench = new ConvergenceWorkbench(createConvergenceFixture({ changes: "base,api,ui", dependencies: "api>base,ui>api" }));
  const digest = workbench.snapshot().snapshotDigest;
  assert.equal(workbench.splitChange("api", ["schema", "runtime"], ["schema.ts", "runtime.ts"]).ok, true);
  assert.equal(workbench.reconstructDigest(), digest);
  assert.deepEqual(workbench.snapshot().changes.map((change) => change.changeId), ["base", "schema", "runtime", "ui"]);

  const ambiguous = new ConvergenceWorkbench(createConvergenceFixture({ changes: "shared", ambiguousPath: "shared.ts" }));
  const before = ambiguous.snapshot();
  assert.equal(ambiguous.splitChange("shared", ["a", "b"], ["shared.ts", "shared.ts"]).ok, false);
  assert.deepEqual(ambiguous.snapshot(), before);
});

test("revision heads, dependency closure, stale gates, and squash provenance remain explicit", () => {
  const history = new ConvergenceWorkbench(createConvergenceFixture({ changes: "change", multiHead: true })).revisionHistory("change");
  assert.deepEqual(history.heads, ["rev-change-a", "rev-change-b"]);

  const workbench = new ConvergenceWorkbench(createConvergenceFixture({ changes: "base,api,ui", dependencies: "api>base,ui>api" }));
  const preview = workbench.planPartialMerge("api");
  assert.deepEqual(preview.included, ["base", "api"]);
  assert.throws(() => workbench.squash(preview, { confirmed: true }), /authority/iu);
  const squash = workbench.squash(preview, { authority: "maintainer.merge", confirmed: true });
  assert.deepEqual(squash.sourceChanges, ["base", "api"]);

  const stale = new ConvergenceWorkbench(createConvergenceFixture({ changes: "change", staleApproval: true }));
  assert.deepEqual(stale.mergeAuthority("change").allowed, false);
  assert.match(stale.mergeAuthority("change").explanation, /STALE/iu);
});

test("conflict AI remains untrusted and agent/archive mutations fail closed", () => {
  const conflict = new ConvergenceWorkbench(createConvergenceFixture({ changes: "change", conflict: true }));
  assert.equal(conflict.resolveConflict("conflict-1", { strategy: "deterministic" }).state, "unresolved");
  assert.equal(conflict.resolveConflict("conflict-1", { strategy: "ai-proposal" }).trust, "untrusted-proposal");
  assert.throws(() => conflict.resolveConflict("conflict-1", { strategy: "human", confirmed: true }), /authority/iu);

  const agent = new ConvergenceWorkbench(createConvergenceFixture({ changes: "change", agent: true }));
  agent.reserveAgentBudget(30);
  assert.deepEqual(agent.consumeAgentBudget(20), { allocated: 100, reserved: 10, consumed: 20, released: 0, expired: 0 });
  agent.revokeAgentGrant();
  assert.equal(agent.authorizeAgentWork().allowed, false);

  const archive = new ConvergenceWorkbench(createConvergenceFixture({ changes: "release", archive: true }));
  assert.equal(archive.archiveRelease({ visibility: "private", authority: "release.archive", confirmed: true }).status, "denied-private");
  assert.throws(() => archive.archiveRelease({ visibility: "public", authority: "release.archive", confirmed: false }), /confirmation/iu);
});
