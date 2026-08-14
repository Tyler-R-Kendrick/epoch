import assert from "node:assert/strict";
import {
  createCommunityApiHost,
  createCommunityApiFetchHandler,
  createCommunityConvergenceFetchHandler,
  createInMemoryCommunityApi,
  createInMemoryCommunityConvergenceApi,
} from "@epoch/community-api";
import { main as communityCliMain } from "@epoch/community-cli";
import {
  builtinDefaultProjection,
  CommunityRepository,
  createCommunityClient,
  createConvergenceFixture,
  createHttpCommunityClient,
} from "@epoch/community-core";

export async function runCommunityCoverageTests(): Promise<void> {
  await apiFetchHandlerRoutesCommunityRequests();
  await apiRejectsInvalidAndUnknownRequests();
  await defaultHostWiresSearchProjectionsAndNamespace();
  await liveHostIsolatesMountsAndPrivateProjections();
  await cliCoversIssueAndChangeWorkflows();
  await cliReportsUsageAndValidationErrors();
  await httpClientReportsNonOkApiErrors();
  await convergenceApiEnforcesTrustedAuthority();
}

async function defaultHostWiresSearchProjectionsAndNamespace(): Promise<void> {
  const host = createCommunityApiHost({
    cursorKey: new Uint8Array(32).fill(19),
    resolveAuthorization: () => ({ actorId: "alice" }),
    repositories: [{
      slug: "epoch/epoch",
      displayName: "Epoch",
      description: "canonical",
      maintainers: ["alice"],
      topics: ["dvcs"],
    }],
  });
  await host.api.openIssue("epoch/epoch", { id: "ISSUE-1", title: "Needs review", author: "alice" });
  const parsed = host.services.search.parseSearch("kind:issue", { authorization: { actorId: "alice" } });
  assert.equal(parsed.error, undefined);
  const searched = await host.handler(new Request("https://epoch.test/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ where: parsed.ast, orderBy: parsed.sort, first: 10 }),
  }));
  assert.equal(searched.status, 200);
  const page = await searched.json() as { hits: Array<{ target: { kind: string } }> };
  assert.ok(page.hits.some((hit) => hit.target.kind === "issue"));
  assert.equal((await host.handler(new Request("https://epoch.test/projections"))).status, 200);
  assert.equal((await host.handler(new Request("https://epoch.test/namespace/mounts"))).status, 200);
  const graphql = await host.handler(new Request("https://epoch.test/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "{ sourceCapabilities { sourceId } }" }),
  }));
  assert.equal(graphql.status, 200);
  const body = await graphql.json() as { data: { sourceCapabilities: Array<{ sourceId: string }> } };
  assert.deepEqual(body.data.sourceCapabilities.map((value) => value.sourceId), ["community-store"]);

  const parsedSearch = await host.handler(new Request("https://epoch.test/search/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expression: "kind:issue", timezone: "UTC", locale: "en-US" }),
  }));
  assert.equal(parsedSearch.status, 200);
  const explained = await host.handler(new Request("https://epoch.test/search/explain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ where: parsed.ast, orderBy: parsed.sort, first: 10 }),
  }));
  assert.equal(explained.status, 200);
  const oversize = await host.handler(new Request("https://epoch.test/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ where: parsed.ast, orderBy: parsed.sort, first: 0 }),
  }));
  assert.equal(oversize.status, 413);
  const malformed = await host.handler(new Request("https://epoch.test/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  }));
  assert.equal(malformed.status, 400);
  const missingQuery = await host.handler(new Request("https://epoch.test/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  }));
  assert.equal(missingQuery.status, 400);
  const missingExpression = await host.handler(new Request("https://epoch.test/search/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  }));
  assert.equal(missingExpression.status, 400);

  assert.equal((await host.handler(new Request("https://epoch.test/namespace/list?path=/&first=10"))).status, 200);
  assert.equal((await host.handler(new Request("https://epoch.test/namespace/resolve?path=/"))).status, 200);
  assert.equal((await host.handler(new Request("https://epoch.test/namespace/explain?path=/"))).status, 200);
  assert.equal((await host.handler(new Request("https://epoch.test/namespace/list?first=0"))).status, 413);
  const listedProjections = await host.handler(new Request("https://epoch.test/projections"));
  assert.equal(listedProjections.status, 200);
  const clone = { ...builtinDefaultProjection, projectionId: "coverage-clone", label: "Coverage clone", version: 1 };
  const saved = await host.handler(new Request("https://epoch.test/projections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(clone),
  }));
  assert.equal(saved.status, 201);
  assert.equal((await host.handler(new Request("https://epoch.test/projections/coverage-clone"))).status, 200);
  assert.equal((await host.handler(new Request("https://epoch.test/projections/coverage-clone/explain?path=/"))).status, 200);
  const previewed = await host.handler(new Request("https://epoch.test/projections/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ definition: { ...clone, projectionId: "coverage-preview" }, path: "/", first: 5 }),
  }));
  assert.equal(previewed.status, 200);
  assert.equal((await host.handler(new Request("https://epoch.test/projections/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  }))).status, 400);
  assert.equal((await host.handler(new Request("https://epoch.test/projections/missing"))).status, 404);
  const mounted = await host.handler(new Request("https://epoch.test/namespace/mounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mountId: "coverage-mount",
      projectionId: "coverage-clone",
      mountPath: "/coverage",
      mode: "after",
      scope: "user",
      order: 10,
      writable: false,
    }),
  }));
  assert.equal(mounted.status, 201);
  assert.equal((await host.handler(new Request("https://epoch.test/namespace/mounts/coverage-mount", { method: "DELETE" }))).status, 200);
  const reset = await host.handler(new Request("https://epoch.test/namespace/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scope: "user" }),
  }));
  assert.equal(reset.status, 200);
  assert.equal((await host.handler(new Request("https://epoch.test/namespace/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scope: "recovery" }),
  }))).status, 409);
  assert.equal((await host.handler(new Request("https://epoch.test/projections/coverage-clone", { method: "DELETE" }))).status, 204);

  await assert.rejects(
    async () => createCommunityApiHost({ store: host.store, repositories: [{ slug: "x/y", displayName: "X", description: "x", maintainers: ["alice"] }] }),
    /injected CommunityStateStore cannot be combined/,
  );
  const closed = createCommunityApiFetchHandler(host.api);
  const unsupported = await closed(new Request("https://epoch.test/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ where: parsed.ast, first: 10 }),
  }));
  assert.equal(unsupported.status, 422);
  const unconfiguredGraphql = await closed(new Request("https://epoch.test/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "{ sourceCapabilities { sourceId } }" }),
  }));
  assert.equal(unconfiguredGraphql.status, 422);
  const scoped = await host.handler(new Request("https://epoch.test/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ where: parsed.ast, orderBy: parsed.sort, first: 10, scope: { sourceIds: ["other"] } }),
  }));
  assert.equal(scoped.status, 422);
}

async function liveHostIsolatesMountsAndPrivateProjections(): Promise<void> {
  const alice = createCommunityApiHost({
    cursorKey: new Uint8Array(32).fill(23),
    resolveAuthorization: () => ({ actorId: "alice" }),
    repositories: [{
      slug: "epoch/epoch",
      displayName: "Epoch",
      description: "canonical",
      maintainers: ["alice"],
      topics: ["dvcs"],
    }],
  });
  const bob = createCommunityApiHost({
    store: alice.store,
    cursorKey: new Uint8Array(32).fill(23),
    resolveAuthorization: () => ({ actorId: "bob" }),
  });

  const privateDefinition = {
    ...builtinDefaultProjection,
    projectionId: "alice-private",
    label: "Alice private",
    visibility: "private" as const,
    version: 1,
  };
  assert.equal((await alice.handler(new Request("https://epoch.test/projections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(privateDefinition),
  }))).status, 201);

  const aliceListed = await (await alice.handler(new Request("https://epoch.test/projections"))).json() as Array<{ projectionId: string }>;
  const bobListed = await (await bob.handler(new Request("https://epoch.test/projections"))).json() as Array<{ projectionId: string }>;
  assert.ok(aliceListed.some((item) => item.projectionId === "alice-private"));
  assert.equal(bobListed.some((item) => item.projectionId === "alice-private"), false);
  assert.equal((await bob.handler(new Request("https://epoch.test/projections/alice-private"))).status, 403);

  const mounted = await alice.handler(new Request("https://epoch.test/namespace/mounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mountId: "alice-root",
      projectionId: "alice-private",
      mountPath: "/",
      mode: "replace",
      scope: "user",
      order: 50,
      writable: false,
    }),
  }));
  assert.equal(mounted.status, 201);

  const aliceMounts = await (await alice.handler(new Request("https://epoch.test/namespace/mounts"))).json() as Array<{ mountId: string }>;
  const bobMounts = await (await bob.handler(new Request("https://epoch.test/namespace/mounts"))).json() as Array<{ mountId: string }>;
  assert.ok(aliceMounts.some((mount) => mount.mountId === "alice-root"));
  assert.equal(bobMounts.some((mount) => mount.mountId === "alice-root"), false);

  const stolen = await bob.handler(new Request("https://epoch.test/namespace/mounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mountId: "bob-stolen",
      projectionId: "alice-private",
      mountPath: "/stolen",
      mode: "after",
      scope: "user",
      order: 10,
      writable: false,
    }),
  }));
  assert.equal(stolen.status, 400);
}

async function apiFetchHandlerRoutesCommunityRequests(): Promise<void> {
  const api = createInMemoryCommunityApi();
  const handle = createCommunityApiFetchHandler(api);

  const created = await jsonResponse<CommunityRepository>(handle(new Request("https://community.test/repositories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug: "epoch/epoch",
      displayName: "Epoch",
      description: "Event-driven DVCS",
      maintainers: ["alice"],
      topics: ["dvcs"],
    }),
  })));
  assert.equal(created.status, 201);

  const listed = await jsonResponse<readonly CommunityRepository[]>(handle(new Request("https://community.test/repositories")));
  assert.equal(listed.status, 200);
  assert.equal(listed.body[0].slug, "epoch/epoch");

  const opened = await jsonResponse<CommunityRepository>(handle(new Request("https://community.test/repositories/epoch%2Fepoch/issues", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Test coverage", author: "bob", labels: ["test"] }),
  })));
  assert.equal(opened.status, 201);

  const changed = await jsonResponse<CommunityRepository>(handle(new Request("https://community.test/repositories/epoch%2Fepoch/changes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Add coverage",
      author: "carol",
      sourceView: "carol/coverage",
      targetView: "main",
    }),
  })));
  assert.equal(changed.status, 201);

  const reviewed = await jsonResponse<CommunityRepository>(handle(new Request("https://community.test/repositories/epoch%2Fepoch/changes/CHANGE-1/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reviewer: "alice", decision: "changes-requested", body: "Needs browser proof." }),
  })));
  assert.equal(reviewed.status, 201);
  assert.equal(reviewed.body.changes[0].status, "changes-requested");
}

async function apiRejectsInvalidAndUnknownRequests(): Promise<void> {
  const handle = createCommunityApiFetchHandler(createInMemoryCommunityApi());
  const duplicateApi = createInMemoryCommunityApi({
    repositories: [{
      slug: "epoch/epoch",
      displayName: "Epoch",
      description: "Event-driven DVCS",
      maintainers: ["alice"],
    }],
  });
  const duplicateHandle = createCommunityApiFetchHandler(duplicateApi);

  assert.equal((await handle(new Request("https://community.test/nope"))).status, 404);
  assert.equal((await handle(new Request("https://community.test/repositories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug: "bad", displayName: "Bad", description: "Bad", maintainers: [] }),
  }))).status, 400);
  assert.equal((await duplicateHandle(new Request("https://community.test/repositories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug: "epoch/epoch", displayName: "Epoch", description: "Duplicate", maintainers: ["alice"] }),
  }))).status, 409);
  assert.equal((await duplicateHandle(new Request("https://community.test/repositories/epoch%2Fepoch/changes/MISSING/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reviewer: "alice", decision: "approved" }),
  }))).status, 404);
}

async function cliCoversIssueAndChangeWorkflows(): Promise<void> {
  const api = createInMemoryCommunityApi({
    repositories: [{
      slug: "epoch/epoch",
      displayName: "Epoch",
      description: "Event-driven DVCS",
      maintainers: ["alice"],
    }],
  });
  const withComment = await api.openIssue("epoch/epoch", {
    title: "Commentable",
    author: "bob",
    body: "needs a reply",
    labels: ["support"],
  });
  const commented = await api.commentOnIssue("epoch/epoch", withComment.issues[0]!.id, {
    author: "alice",
    body: "here is the answer",
  });
  assert.equal(commented.issues[0]?.comments.length, 1);
  assert.equal(commented.issues[0]?.comments[0]?.body, "here is the answer");

  const context = { client: createCommunityClient(api) };

  assert.match((await runCli(["repositories"], context)).stdout, /epoch\/epoch/u);
  assert.match((await runCli(["issues", "open", "epoch/epoch", "--title", "Coverage", "--author", "bob", "--label", "test"], context)).stdout, /ISSUE-/u);
  assert.match((await runCli([
    "changes",
    "create",
    "epoch/epoch",
    "--title",
    "Improve coverage",
    "--author",
    "carol",
    "--source-view",
    "carol/coverage",
    "--target-view",
    "main",
  ], context)).stdout, /CHANGE-1/u);
  assert.match((await runCli([
    "changes",
    "review",
    "epoch/epoch",
    "CHANGE-1",
    "--reviewer",
    "alice",
    "--decision",
    "approved",
  ], context)).stdout, /approved/u);
}

async function cliReportsUsageAndValidationErrors(): Promise<void> {
  const context = { client: createCommunityClient(createInMemoryCommunityApi()) };

  assert.match((await runCli(["help"], context)).stdout, /Usage:/u);
  // Without an injected context the CLI configures itself: help still works,
  // and a real command explains which knob is missing instead of failing on a
  // host wiring detail the operator cannot see.
  assert.match((await runCli([], undefined)).stdout, /Usage:/u);
  assert.match((await runCli(["repositories"], undefined)).stderr, /No Community remote configured/u);
  assert.match((await runCli(["repositories"], undefined)).stderr, /EPOCH_COMMUNITY_API_URL/u);
  assert.match((await runCli(["issues", "open"], context)).stderr, /requires a repository slug/u);
  assert.match((await runCli(["issues", "open", "epoch/epoch", "oops"], context)).stderr, /Unexpected argument/u);
  assert.match((await runCli(["issues", "open", "epoch/epoch", "--title"], context)).stderr, /Missing value/u);
  assert.match((await runCli(["changes", "create", "epoch/epoch", "--title", "x"], context)).stderr, /Missing required option --author/u);
  assert.match((await runCli(["changes", "review", "epoch/epoch"], context)).stderr, /requires a repository slug and change id/u);
  assert.match((await runCli([
    "changes",
    "review",
    "epoch/epoch",
    "CHANGE-1",
    "--reviewer",
    "alice",
    "--decision",
    "maybe",
  ], context)).stderr, /Unsupported review decision/u);
  assert.match((await runCli(["unknown"], context)).stderr, /Usage:/u);
}

async function convergenceApiEnforcesTrustedAuthority(): Promise<void> {
  const api = createInMemoryCommunityConvergenceApi(createConvergenceFixture({
    changes: "base,api,ui",
    dependencies: "api>base,ui>api",
  }));
  const snapshot = api.getSnapshot();
  assert.equal(snapshot.selectedChangeId, "base");
  assert.deepEqual(api.planPartialMerge("api").included, ["base", "api"]);

  const unauthenticated = createCommunityConvergenceFetchHandler(api);
  assert.equal((await unauthenticated(new Request("https://epoch.test/convergence"))).status, 200);
  assert.equal((await unauthenticated(new Request("https://epoch.test/missing"))).status, 404);

  const preview = await unauthenticated(new Request("https://epoch.test/convergence/merge-preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ changeId: "api" }),
  }));
  assert.equal(preview.status, 200);
  assert.deepEqual((await preview.json() as { included: string[] }).included, ["base", "api"]);

  const selfAsserted = await unauthenticated(new Request("https://epoch.test/convergence/squash", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ changeId: "api", authority: "maintainer.merge", confirmed: true }),
  }));
  assert.equal(selfAsserted.status, 403);
  assert.match(await selfAsserted.text(), /trusted request context/u);

  const unauthorized = createCommunityConvergenceFetchHandler(api, {
    resolveAuthorization: () => ({ principalId: "contributor-1", authorities: [] }),
  });
  const denied = await unauthorized(new Request("https://epoch.test/convergence/squash", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ changeId: "api", confirmed: true }),
  }));
  assert.equal(denied.status, 403);
  assert.match(await denied.text(), /contributor-1.*maintainer\.merge/u);

  const authorized = createCommunityConvergenceFetchHandler(api, {
    resolveAuthorization: () => ({ principalId: "maintainer-1", authorities: ["maintainer.merge"] }),
  });
  await assert.rejects(
    () => authorized(new Request("https://epoch.test/convergence/squash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changeId: "api", confirmed: false }),
    })),
    /confirmation/iu,
  );
  const accepted = await authorized(new Request("https://epoch.test/convergence/squash", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ changeId: "api", confirmed: true }),
  }));
  assert.equal(accepted.status, 200);
  assert.deepEqual((await accepted.json() as { sourceChanges: string[] }).sourceChanges, ["base", "api"]);

  await assert.rejects(
    () => authorized(new Request("https://epoch.test/convergence/merge-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changeId: "" }),
    })),
    /changeId must be a non-empty string/u,
  );
  await assert.rejects(
    () => authorized(new Request("https://epoch.test/convergence/squash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "[]",
    })),
    /Request body must be an object/u,
  );
}

async function httpClientReportsNonOkApiErrors(): Promise<void> {
  const client = createHttpCommunityClient({
    baseUrl: "https://community.test",
    fetch: async () => new Response(JSON.stringify({ error: "not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    }),
  });

  await assert.rejects(
    () => client.getRepository("missing/repo"),
    /Community API request failed \(404\): not found/u,
  );
}

async function jsonResponse<T>(responsePromise: Promise<Response>): Promise<{ status: number; body: T }> {
  const response = await responsePromise;
  return { status: response.status, body: await response.json() as T };
}

async function runCli(
  argv: readonly string[],
  context: { client: ReturnType<typeof createCommunityClient> } | undefined,
): Promise<{ code: number; stdout: string; stderr: string }> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const code = await communityCliMain([...argv], {
    stdout: (line) => stdout.push(line),
    stderr: (line) => stderr.push(line),
  }, context, {});

  return { code, stdout: stdout.join(""), stderr: stderr.join("") };
}
