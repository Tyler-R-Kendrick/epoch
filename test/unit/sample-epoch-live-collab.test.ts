import assert from "node:assert/strict";
import { formatLiveCollabSummary, runLiveCollabDemo } from "../../samples/epoch-live-collab/src/app";

export function runSampleEpochLiveCollabTests(): void {
  demonstratesConvergentRollbackAndPresence();
}

function demonstratesConvergentRollbackAndPresence(): void {
  const summary = runLiveCollabDemo();

  assert.equal(summary.converged, true, "the two peers converge on identical state");
  assert.equal(summary.rollbackReplicated, true, "the signed rollback replicates to the other peer");
  assert.equal(summary.undoRestored, true, "undo restores the pre-rollback state");
  assert.equal(summary.bobSawPresence, true, "presence is observed across peers");
  assert.equal(summary.aliceProblems, 0, "alice's signed log verifies");
  assert.equal(summary.bobProblems, 0, "bob's signed log verifies");
  assert.ok(summary.steps.length >= 5, "the demo narrates each stage");
  assert.match(formatLiveCollabSummary(summary), /Replicas converged:\s+true/u);
}
