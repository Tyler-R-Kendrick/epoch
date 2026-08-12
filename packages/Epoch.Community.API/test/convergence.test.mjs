import assert from "node:assert/strict";
import test from "node:test";
import { createConvergenceFixture } from "../../Epoch.Community.Core/dist/convergence.js";
import { createCommunityConvergenceFetchHandler, createInMemoryCommunityConvergenceApi } from "../dist/convergence.js";

test("convergence API previews dependency closure and enforces squash authority once", async () => {
  const RequestCtor = globalThis.Request;
  const api = createInMemoryCommunityConvergenceApi(createConvergenceFixture({ changes: "base,api,ui", dependencies: "api>base,ui>api" }));
  const handler = createCommunityConvergenceFetchHandler(api);
  const preview = await handler(new RequestCtor("https://epoch.test/convergence/merge-preview", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ changeId: "api" }),
  }));
  assert.equal(preview.status, 200);
  assert.deepEqual((await preview.json()).included, ["base", "api"]);
  await assert.rejects(() => handler(new RequestCtor("https://epoch.test/convergence/squash", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ changeId: "api", authority: "maintainer.merge", confirmed: false }),
  })), /confirmation/iu);
});
