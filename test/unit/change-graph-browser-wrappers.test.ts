import assert from "node:assert/strict";
import * as Wasm from "@epoch/wasm";
import * as Sdk from "@epoch/platform-sdk";

export function runChangeGraphBrowserWrapperTests(): void {
  const graph = [{ revisionId: "root", parentRevisionIds: [] }, { revisionId: "head", parentRevisionIds: ["root"] }];
  assert.deepEqual(Wasm.inspectRevisionGraph(graph), Sdk.inspectRevisionGraph(graph));
  assert.deepEqual(Wasm.evaluateRevset("heads() | roots()", graph), ["head", "root"]);
  assert.deepEqual(Sdk.parseRevset("heads() & roots()").type, "binary");
  assert.deepEqual(Wasm.inspectCloneFilter({ paths: ["src/**"], entityTypes: ["application/json"], maxBytes: 12, includePromises: false }).canonical, {
    paths: ["src/**"],
    entityTypes: ["application/json"],
    maxBytes: 12,
    includePromises: false,
  });
  assert.throws(() => Sdk.inspectCloneFilter(null), /Filter must be an object/);
  assert.throws(() => Wasm.inspectCloneFilter({ unknown: true }), /Unknown filter field/);
  assert.throws(() => Sdk.inspectCloneFilter({ maxBytes: -1 }), /maxBytes/);
  assert.throws(() => Wasm.inspectCloneFilter({ includePromises: "yes" }), /includePromises/);
  assert.throws(() => Sdk.inspectCloneFilter({ paths: [""] }), /bounded non-empty strings/);
  assert.equal(Wasm.inspectSyncContract({ protocol: "epoch.sync/v2", commands: [] }).code, "ok");
  assert.equal(Sdk.inspectSyncContract({ protocol: "other", commands: [] }).code, "unsupported-capability");
  assert.throws(() => Wasm.inspectSyncContract("nope"), /must be an object/);
  assert.throws(() => Sdk.inspectRevisionGraph([{ revisionId: "a", parentRevisionIds: ["missing"] }]), /Missing graph parent/);
  assert.equal(Sdk.inspectSwhid(`swh:1:rev:${"b".repeat(40)}`).objectType, "rev");
  assert.deepEqual(Wasm.nodeOnlyAdapterStatus("git"), {
    code: "unsupported-capability", adapter: "git", reason: "git requires a Node.js host adapter",
  });
  assert.deepEqual(Sdk.nodeOnlyAdapterStatus("sqlite"), {
    code: "unsupported-capability", adapter: "sqlite", reason: "sqlite requires a Node.js host adapter",
  });

  const merged = Wasm.CRDTRegistry.defaults().merge("application/json", { ready: false }, { ready: false }, { ready: true });
  assert.equal((merged as { ready: boolean }).ready, true);
  assert.equal(typeof new Wasm.JsonMapCRDT().merge, "function");
  assert.equal(typeof new Wasm.TextWeaveCRDT().merge, "function");
  assert.equal(typeof new Wasm.CsvTableCRDT().merge, "function");
  const dumped = Wasm.dumpEntity("application/json", { n: 1 });
  assert.deepEqual(Wasm.loadEntity("application/json", dumped), { n: 1 });
  assert.deepEqual(Wasm.threeWayMerge({ n: 0 }, { n: 1 }, { n: 1 }), { n: 1 });
  assert.equal(Wasm.EntityType.json, "application/json");

  assert.throws(() => Wasm.EpochWasmGit.execute("status"), /not supported by Epoch WASM Git/);
  assert.throws(() => Wasm.EpochWASMGit.clone("https://example.test/repo.git"), /native Git clone/);
}
