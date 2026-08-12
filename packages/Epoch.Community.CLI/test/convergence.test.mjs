import assert from "node:assert/strict";
import test from "node:test";
import { ConvergenceWorkbench, createConvergenceFixture } from "../../Epoch.Community.Core/dist/convergence.js";
import { main } from "../dist/index.js";

test("CLI exposes change graph, review-bundle gates, and dependency-closed preview", async () => {
  const workbench = new ConvergenceWorkbench(createConvergenceFixture({ changes: "base,api,ui", dependencies: "api>base,ui>api", gates: true }));
  const output = [];
  const errors = [];
  const context = { client: {}, convergence: { getSnapshot: () => workbench.snapshot(), planPartialMerge: (id) => workbench.planPartialMerge(id) } };
  assert.equal(await main(["graph", "show"], { stdout: (line) => output.push(line), stderr: (line) => errors.push(line) }, context), 0);
  assert.equal(await main(["bundle", "review"], { stdout: (line) => output.push(line), stderr: (line) => errors.push(line) }, context), 0);
  assert.equal(await main(["merge", "preview", "api"], { stdout: (line) => output.push(line), stderr: (line) => errors.push(line) }, context), 0);
  assert.match(output.join(""), /api.*Review:stale/isu);
  assert.match(output.join(""), /base,api.*confirmation-required.*dependency-closed/isu);
  assert.deepEqual(errors, []);
});
