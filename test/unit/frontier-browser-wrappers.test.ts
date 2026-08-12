import assert from "node:assert/strict";
import * as Wasm from "../../packages/Epoch.WASM/src/frontier";
import * as Sdk from "../../packages/Epoch.Platform.Sdk/src/frontier";

export function runFrontierBrowserWrapperTests(): void {
  const graph = [{ revisionId: "root", parentRevisionIds: [] }, { revisionId: "head", parentRevisionIds: ["root"] }];
  assert.deepEqual(Wasm.inspectRevisionGraph(graph), Sdk.inspectRevisionGraph(graph));
  assert.deepEqual(Wasm.evaluateRevset("heads() | roots()", graph), ["head", "root"]);
  assert.deepEqual(Sdk.inspectFrontierFilter({ paths: ["src/**"] }).canonical, { paths: ["src/**"] });
  assert.equal(Wasm.inspectSyncContract({ protocol: "epoch.sync/v2", commands: [] }).code, "ok");
  assert.equal(Sdk.inspectSwhid(`swh:1:rev:${"b".repeat(40)}`).objectType, "rev");
  assert.deepEqual(Wasm.nodeOnlyAdapterStatus("git"), {
    code: "unsupported-capability", adapter: "git", reason: "git requires a Node.js host adapter",
  });
}
