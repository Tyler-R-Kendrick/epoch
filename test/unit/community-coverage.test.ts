import assert from "node:assert/strict";
import { createInMemoryCommunityApi, createCommunityApiFetchHandler } from "@epoch/community-api";
import { main as communityCliMain } from "@epoch/community-cli";
import { CommunityRepository, createCommunityClient, createHttpCommunityClient } from "@epoch/community-core";

export async function runCommunityCoverageTests(): Promise<void> {
  await apiFetchHandlerRoutesCommunityRequests();
  await apiRejectsInvalidAndUnknownRequests();
  await cliCoversIssueAndChangeWorkflows();
  await cliReportsUsageAndValidationErrors();
  await httpClientReportsNonOkApiErrors();
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
  assert.match((await runCli([], undefined)).stdout, /Usage:/u);
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
  }, context);

  return { code, stdout: stdout.join(""), stderr: stderr.join("") };
}
