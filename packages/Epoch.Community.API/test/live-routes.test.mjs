import assert from "node:assert/strict";
import test from "node:test";
import {
  createCommunityRuntime,
  createLiveSpaceCommandExtensions,
  createLocalLiveSpacePort,
} from "../../Epoch.Community.Runtime/dist/index.js";
import { createLiveSessionFetchHandler, createLiveSessionHub, createLiveSessionService } from "../dist/index.js";

const HOST = "principal-host";
const GUEST = "principal-guest";
const BASE = "https://community.epoch.test/community/live";

const POLICY = {
  visibility: "community",
  presentationViewRef: "views/present",
  allowedPathPatterns: ["packages/app/**"],
  allowedActionIds: ["view.open", "diff.show"],
};

/** One host, one bus, one hub — the composition a real deployment performs. */
function harness(options = {}) {
  let clockMs = 0;
  const port = createLocalLiveSpacePort({
    now: () => { clockMs += 10; return clockMs; },
    sessionSalt: "route-entropy",
    resolveSpace: (spaceId) => spaceId === "space-1" ? { viewRef: "views/present" } : undefined,
  });
  const runtime = createCommunityRuntime({
    namespace: "live-routes",
    actor: HOST,
    policies: { capabilities: ["*"] },
    now: () => "2026-08-22T00:00:00.000Z",
    extensions: createLiveSpaceCommandExtensions(port, () => currentActor),
  });
  let currentActor = HOST;
  const hub = createLiveSessionHub(options.hub ?? {});
  const service = createLiveSessionService({ execute: runtime.commands.execute, hub });
  const handler = createLiveSessionFetchHandler({
    service,
    now: () => clockMs,
    resolveAuthorization: (request) => {
      const principal = request.headers.get("x-epoch-principal");
      if (principal === null) return undefined;
      currentActor = principal;
      return { principalId: principal };
    },
    ...options.routes,
  });

  async function call(method, path, body, headers = {}) {
    const init = { method, headers: { "x-epoch-principal": HOST, ...headers } };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
      init.headers["Content-Type"] = "application/json";
    }
    return handler(new Request(`${BASE}${path}`, init));
  }

  return { call, hub, service, handler, port };
}

async function startedSession(harnessInstance) {
  const created = await harnessInstance.call("POST", "/sessions", { input: { spaceId: "space-1", policy: POLICY } });
  const sessionId = (await created.json()).receipt.data.sessionId;
  await harnessInstance.call("POST", `/sessions/${sessionId}/commands`, {
    kind: "live.session.consent", input: { scopes: ["semantic-capture"] },
  });
  await harnessInstance.call("POST", `/sessions/${sessionId}/commands`, { kind: "live.session.openLobby" });
  await harnessInstance.call("POST", `/sessions/${sessionId}/commands`, { kind: "live.session.start", confirmed: true });
  return sessionId;
}

async function publish(harnessInstance, sessionId, actionId = "view.open") {
  return harnessInstance.call("POST", `/sessions/${sessionId}/commands`, {
    kind: "live.presentation.publish",
    input: { actionId, args: { view: "board" }, path: "packages/app/board.ts" },
  });
}

test("session lifecycle runs over HTTP and returns the same receipts as every other adapter", async () => {
  const app = harness();
  const created = await app.call("POST", "/sessions", { input: { spaceId: "space-1", policy: POLICY } });
  assert.equal(created.status, 200);
  const createdBody = await created.json();
  assert.equal(createdBody.schemaVersion, 1);
  assert.equal(createdBody.receipt.policy.decision, "allow");
  assert.equal(createdBody.receipt.source, "api");
  assert.match(createdBody.receipt.commandId, /^cmd_/u);
  const sessionId = createdBody.receipt.data.sessionId;

  const shown = await app.call("GET", `/sessions/${sessionId}`);
  assert.equal(shown.status, 200);
  assert.equal((await shown.json()).receipt.data.lifecycle, "draft");

  // Irreversible commands still require explicit confirmation over HTTP.
  await app.call("POST", `/sessions/${sessionId}/commands`, {
    kind: "live.session.consent", input: { scopes: ["semantic-capture"] },
  });
  await app.call("POST", `/sessions/${sessionId}/commands`, { kind: "live.session.openLobby" });
  const unconfirmed = await app.call("POST", `/sessions/${sessionId}/commands`, { kind: "live.session.start" });
  assert.equal(unconfirmed.status, 409);
  assert.equal((await unconfirmed.json()).receipt.policy.decision, "confirm");

  const started = await app.call("POST", `/sessions/${sessionId}/commands`, {
    kind: "live.session.start", confirmed: true,
  });
  assert.equal(started.status, 200);
  assert.equal((await started.json()).receipt.data.lifecycle, "live");
});

test("checkpoint and events endpoints page released state by sequence", async () => {
  const app = harness();
  const sessionId = await startedSession(app);
  await publish(app, sessionId);
  await publish(app, sessionId, "diff.show");

  const checkpoint = await app.call("GET", `/sessions/${sessionId}/presentation/checkpoint`);
  assert.equal(checkpoint.status, 200);
  const checkpointBody = await checkpoint.json();
  assert.equal(checkpointBody.schemaVersion, 1);
  assert.equal(checkpointBody.releasedThroughSequence, 2);
  assert.equal(checkpointBody.lifecycle, "live");
  assert.match(checkpointBody.checkpoint.checkpointId, /^livechk_/u);

  const all = await (await app.call("GET", `/sessions/${sessionId}/presentation/events?after=0`)).json();
  assert.deepEqual(all.envelopes.map((envelope) => envelope.sequence), [1, 2]);
  assert.equal(all.nextAfter, 2);

  const tail = await (await app.call("GET", `/sessions/${sessionId}/presentation/events?after=1`)).json();
  assert.deepEqual(tail.envelopes.map((envelope) => envelope.sequence), [2]);

  const bounded = await (await app.call("GET", `/sessions/${sessionId}/presentation/events?after=0&limit=1`)).json();
  assert.equal(bounded.envelopes.length, 1, "page size is bounded by the caller within the server ceiling");
});

test("SSE delivers released envelopes live and resumes from Last-Event-ID", async () => {
  const app = harness();
  const sessionId = await startedSession(app);
  await publish(app, sessionId);

  const stream = await app.call("GET", `/sessions/${sessionId}/presentation/stream`);
  assert.equal(stream.status, 200);
  assert.equal(stream.headers.get("Content-Type"), "text/event-stream");
  assert.equal(stream.headers.get("Cache-Control"), "no-store");
  const reader = stream.body.getReader();
  const decoder = new TextDecoder();

  // The backlog replays first so a joiner starts from released state, not blank.
  const backlog = decoder.decode((await reader.read()).value);
  assert.match(backlog, /^id: 1\n/u);
  assert.match(backlog, /event: presentation/u);

  // A frame released after the connection opened arrives without polling.
  await publish(app, sessionId, "diff.show");
  const live = decoder.decode((await reader.read()).value);
  assert.match(live, /^id: 2\n/u);
  const payload = JSON.parse(/data: (.*)\n\n$/u.exec(live)[1]);
  assert.equal(payload.sequence, 2);
  assert.equal(payload.actionId, "diff.show");
  await reader.cancel();

  // Reconnecting with Last-Event-ID replays only what the client missed.
  await publish(app, sessionId);
  const resumed = await app.call("GET", `/sessions/${sessionId}/presentation/stream`, undefined, {
    "last-event-id": "2",
  });
  const resumedReader = resumed.body.getReader();
  const missed = decoder.decode((await resumedReader.read()).value);
  assert.match(missed, /^id: 3\n/u);
  await resumedReader.cancel();
});

test("stream subscriptions are bounded and released when the peer disconnects", async () => {
  const app = harness({ hub: { maxSubscribersPerSession: 1 } });
  const sessionId = await startedSession(app);

  const first = await app.call("GET", `/sessions/${sessionId}/presentation/stream`);
  const firstReader = first.body.getReader();
  assert.equal(app.hub.subscriberCount(sessionId), 1);

  // Beyond the bound the connection is refused outright rather than dropping frames.
  const refused = await app.call("GET", `/sessions/${sessionId}/presentation/stream`);
  assert.equal(refused.status, 503);
  const refusedText = await refused.text();
  assert.match(refusedText, /event: refused/u);
  assert.match(refusedText, /capacity/u);

  await firstReader.cancel();
  assert.equal(app.hub.subscriberCount(sessionId), 0, "cancelling the reader releases the slot");

  // Ending the session closes every open stream with a reason.
  const second = await app.call("GET", `/sessions/${sessionId}/presentation/stream`);
  const secondReader = second.body.getReader();
  await app.call("POST", `/sessions/${sessionId}/commands`, { kind: "live.session.end", confirmed: true });
  const closing = new TextDecoder().decode((await secondReader.read()).value);
  assert.match(closing, /event: closed/u);
  assert.match(closing, /ended/u);
  assert.equal(app.hub.subscriberCount(sessionId), 0);
});

test("routes enforce exact origin allow-lists and refuse command escalation", async () => {
  const app = harness({ routes: { allowedOrigins: ["https://community.epoch.test"] } });
  const sessionId = await startedSession(app);

  const foreign = await app.call("GET", `/sessions/${sessionId}`, undefined, { origin: "https://evil.example" });
  assert.equal(foreign.status, 403);
  assert.equal((await foreign.json()).error.code, "origin-not-allowed");

  // A near-miss origin is still a miss: the check is exact, not prefix or suffix.
  const lookalike = await app.call("GET", `/sessions/${sessionId}`, undefined, {
    origin: "https://community.epoch.test.evil.example",
  });
  assert.equal(lookalike.status, 403);

  const allowed = await app.call("GET", `/sessions/${sessionId}`, undefined, { origin: "https://community.epoch.test" });
  assert.equal(allowed.status, 200);

  // Non-live command kinds cannot ride the live command endpoint into the bus.
  const escalation = await app.call("POST", `/sessions/${sessionId}/commands`, { kind: "change.merge", input: { from: "x" } });
  assert.equal(escalation.status, 400);
  assert.equal((await escalation.json()).error.code, "unsupported-command");

  // Secret-bearing media commands are not reachable from the generic endpoint.
  const mediaToken = await app.call("POST", `/sessions/${sessionId}/commands`, { kind: "live.media.issueToken" });
  assert.equal(mediaToken.status, 404);
});

test("rate limits refuse a request flood per principal and method", async () => {
  const app = harness({ routes: { rateLimit: { windowMs: 60_000, maxRequests: 3 } } });
  const sessionId = await startedSession(app);

  const statuses = [];
  for (let attempt = 0; attempt < 5; attempt += 1) {
    statuses.push((await app.call("GET", `/sessions/${sessionId}`)).status);
  }
  assert.deepEqual(statuses, [200, 200, 200, 429, 429], "the window admits exactly its budget, then refuses");
  const refused = await app.call("GET", `/sessions/${sessionId}`);
  assert.equal((await refused.json()).error.code, "rate-limited");

  // A different principal has its own budget: one caller cannot starve another.
  const other = await app.call("GET", `/sessions/${sessionId}`, undefined, { "x-epoch-principal": GUEST });
  assert.equal(other.status, 200);
});

test("unknown and unreadable sessions are indistinguishable from the outside", async () => {
  const app = harness();
  const missing = await app.call("GET", "/sessions/livesession_deadbeef");
  assert.equal(missing.status, 404);
  const missingBody = await missing.json();
  assert.equal(missingBody.error.code, "not-found");
  assert.equal(missingBody.error.detail, "Live session not found.");
  // No route leaks whether the id was well formed, private, or never existed.
  assert.equal(JSON.stringify(missingBody).includes("livesession_deadbeef"), false);

  const badRoute = await app.call("GET", "/sessions/livesession_deadbeef/presentation/nope");
  assert.equal(badRoute.status, 404);
  assert.deepEqual(await badRoute.json(), missingBody);
});

test("observers reach the stream but cannot publish through it", async () => {
  const app = harness();
  const sessionId = await startedSession(app);
  await app.call("POST", `/sessions/${sessionId}/join`, {}, { "x-epoch-principal": GUEST });

  const denied = await app.call("POST", `/sessions/${sessionId}/commands`, {
    kind: "live.presentation.publish",
    input: { actionId: "view.open", args: { view: "board" }, path: "packages/app/board.ts" },
  }, { "x-epoch-principal": GUEST });
  assert.equal(denied.status, 403);
  assert.equal((await denied.json()).error.code, "policy-denied");

  // The observer still receives released state.
  const events = await (await app.call("GET", `/sessions/${sessionId}/presentation/events?after=0`, undefined, {
    "x-epoch-principal": GUEST,
  })).json();
  assert.equal(Array.isArray(events.envelopes), true);
});

test("secret-bearing publications never reach the wire", async () => {
  const app = harness();
  const sessionId = await startedSession(app);
  const leak = await app.call("POST", `/sessions/${sessionId}/commands`, {
    kind: "live.presentation.publish",
    input: { actionId: "view.open", args: { config: { apiKey: "sk-live-should-never-ship" } } },
  });
  assert.equal(leak.status, 200);
  assert.deepEqual((await leak.json()).receipt.data.decision, { kind: "dropped", reason: "immutable-deny" });

  const events = await (await app.call("GET", `/sessions/${sessionId}/presentation/events?after=0`)).text();
  assert.equal(events.includes("sk-live-should-never-ship"), false);
  const checkpoint = await (await app.call("GET", `/sessions/${sessionId}/presentation/checkpoint`)).text();
  assert.equal(checkpoint.includes("sk-live-should-never-ship"), false);
});
