import assert from "node:assert/strict";
import test from "node:test";
import { createConvergenceFixture } from "../../Epoch.Community.Core/dist/convergence.js";
import { createCommunityConvergenceFetchHandler, createInMemoryCommunityConvergenceApi } from "../dist/convergence.js";

test("convergence API previews dependency closure and enforces squash authority once", async () => {
  const RequestCtor = globalThis.Request;
  const api = createInMemoryCommunityConvergenceApi(createConvergenceFixture({ changes: "base,api,ui", dependencies: "api>base,ui>api" }));
  const handler = createCommunityConvergenceFetchHandler(api, {
    resolveAuthorization: () => ({ principalId: "maintainer-1", authorities: ["maintainer.merge"] }),
  });
  const preview = await handler(new RequestCtor("https://epoch.test/convergence/merge-preview", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ changeId: "api" }),
  }));
  assert.equal(preview.status, 200);
  assert.deepEqual((await preview.json()).included, ["base", "api"]);
  await assert.rejects(() => handler(new RequestCtor("https://epoch.test/convergence/squash", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ changeId: "api", confirmed: false }),
  })), /confirmation/iu);
});

test("convergence API rejects body self-asserted authority and uses trusted principal context", async () => {
  const RequestCtor = globalThis.Request;
  const api = createInMemoryCommunityConvergenceApi(createConvergenceFixture({ changes: "base,api", dependencies: "api>base" }));
  const unauthenticated = createCommunityConvergenceFetchHandler(api);
  const selfAsserted = await unauthenticated(new RequestCtor("https://epoch.test/convergence/squash", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ changeId: "api", authority: "maintainer.merge", principalId: "maintainer-1", confirmed: true }),
  }));
  assert.equal(selfAsserted.status, 403);
  assert.match(await selfAsserted.text(), /trusted request context/iu);

  const unauthorized = createCommunityConvergenceFetchHandler(api, {
    resolveAuthorization: () => ({ principalId: "contributor-1", authorities: [] }),
  });
  const denied = await unauthorized(new RequestCtor("https://epoch.test/convergence/squash", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ changeId: "api", authority: "maintainer.merge", confirmed: true }),
  }));
  assert.equal(denied.status, 403);
  assert.match(await denied.text(), /contributor-1.*maintainer\.merge/iu);

  const authorized = createCommunityConvergenceFetchHandler(api, {
    resolveAuthorization: () => ({ principalId: "maintainer-1", authorities: ["maintainer.merge"] }),
  });
  const accepted = await authorized(new RequestCtor("https://epoch.test/convergence/squash", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ changeId: "api", authority: "attacker.claim", confirmed: true }),
  }));
  assert.equal(accepted.status, 200);
  assert.deepEqual((await accepted.json()).sourceChanges, ["base", "api"]);
});
