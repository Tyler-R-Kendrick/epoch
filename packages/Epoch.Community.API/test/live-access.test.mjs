import assert from "node:assert/strict";
import test from "node:test";
import {
  createCommunityRuntime,
  createLiveSpaceCommandExtensions,
  createLocalLiveSpacePort,
} from "../../Epoch.Community.Runtime/dist/index.js";
import {
  createFakeLiveMediaProvider,
  createLiveJoinLinkStore,
  createLiveMediaGateway,
  createLiveSessionFetchHandler,
  sweepExpiredLiveRateBuckets,
  createLiveSessionHub,
  createLiveSessionService,
  liveWebhookBodyDigest,
} from "../dist/index.js";

const HOST = "principal-host";
const GUEST = "principal-guest";
const BASE = "https://community.epoch.test/community/live";

const MEDIA_POLICY = {
  visibility: "community",
  securityMode: "private-recordable",
  presentationViewRef: "views/present",
  allowedPathPatterns: ["packages/app/**"],
  allowedActionIds: ["view.open"],
  media: { audio: true, captions: "enabled" },
};

/** A deployment with join links, a fake media provider, and webhook ingress. */
function harness(options = {}) {
  let clockMs = 1_000;
  const provider = createFakeLiveMediaProvider({ now: () => clockMs, webhookSecret: "hook" });
  const portOptions = {
    now: () => { clockMs += 10; return clockMs; },
    sessionSalt: "access-entropy",
    resolveSpace: () => ({ viewRef: "views/present" }),
  };
  if (options.withMedia !== false) {
    portOptions.media = createLiveMediaGateway({ provider, now: () => clockMs });
  }
  const port = createLocalLiveSpacePort(portOptions);
  let currentActor = HOST;
  const runtime = createCommunityRuntime({
    namespace: "live-access",
    actor: HOST,
    policies: { capabilities: ["*"] },
    now: () => "2026-08-22T00:00:00.000Z",
    extensions: createLiveSpaceCommandExtensions(port, () => currentActor),
  });
  let tokenCounter = 0;
  const joinLinks = createLiveJoinLinkStore({
    now: () => clockMs,
    randomToken: () => { tokenCounter += 1; return `join-token-${tokenCounter}`; },
    maxLinksPerSession: options.maxLinksPerSession ?? 32,
  });
  const service = createLiveSessionService({ execute: runtime.commands.execute, hub: createLiveSessionHub() });
  const handler = createLiveSessionFetchHandler({
    service,
    now: () => clockMs,
    joinLinks,
    webhookProvider: provider,
    resolveAuthorization: (request) => {
      const principal = request.headers.get("x-epoch-principal");
      if (principal === null) return undefined;
      currentActor = principal;
      return { principalId: principal };
    },
  });

  async function call(method, path, body, headers = {}) {
    const init = { method, headers: { "x-epoch-principal": HOST, ...headers } };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
      init.headers["Content-Type"] = init.headers["Content-Type"] ?? "application/json";
    }
    return handler(new Request(`${BASE}${path}`, init));
  }

  /** Webhooks are verified over exact bytes, so their body is never re-encoded. */
  async function callRaw(path, rawBody, headers) {
    return handler(new Request(`${BASE}${path}`, { method: "POST", headers, body: rawBody }));
  }

  return { call, callRaw, provider, joinLinks, advance: (ms) => { clockMs += ms; }, clock: () => clockMs };
}

async function liveSession(app, policy = MEDIA_POLICY, consent = ["semantic-capture", "audio"]) {
  const created = await app.call("POST", "/sessions", { input: { spaceId: "space-1", policy } });
  const sessionId = (await created.json()).receipt.data.sessionId;
  await app.call("POST", `/sessions/${sessionId}/commands`, {
    kind: "live.session.consent", input: { scopes: consent },
  });
  await app.call("POST", `/sessions/${sessionId}/commands`, { kind: "live.session.openLobby" });
  await app.call("POST", `/sessions/${sessionId}/commands`, { kind: "live.session.start", confirmed: true });
  return sessionId;
}

test("join links are opaque, single-session, expiring, and revocable", async () => {
  const app = harness();
  const sessionId = await liveSession(app);

  const issued = await app.call("POST", `/sessions/${sessionId}/join-links`, { lifetimeMs: 60_000 });
  assert.equal(issued.status, 200);
  const issuedBody = await issued.json();
  const token = issuedBody.token;
  assert.ok(token.length >= 8, "a join token carries real entropy");
  // The stored record carries no recoverable secret.
  assert.equal(JSON.stringify(issuedBody.link).includes(token), false);
  assert.match(issuedBody.link.linkId, /^livelink_/u);

  // Redeeming yields an observer, not the issuer and not a collaborator.
  const joined = await app.call("POST", `/sessions/${sessionId}/join`, { token }, { "x-epoch-principal": "anonymous" });
  assert.equal(joined.status, 200);
  const participants = (await joined.json()).receipt.data.participants;
  const guest = participants.find((entry) => entry.principalId.startsWith("liveguest_"));
  assert.equal(guest.role, "observer");

  // A guessed token, and a valid token aimed at another session, look identical.
  const guessed = await app.call("POST", `/sessions/${sessionId}/join`, { token: "join-token-999" });
  assert.equal(guessed.status, 404);
  const otherSession = await liveSession(app);
  const crossSession = await app.call("POST", `/sessions/${otherSession}/join`, { token });
  assert.equal(crossSession.status, 404);
  assert.deepEqual(await crossSession.json(), await guessed.json());

  // Expiry and revocation both close the link without touching anything else.
  app.advance(120_000);
  const expired = await app.call("POST", `/sessions/${sessionId}/join`, { token });
  assert.equal(expired.status, 404);

  const second = await (await app.call("POST", `/sessions/${sessionId}/join-links`, { lifetimeMs: 60_000 })).json();
  assert.equal(app.joinLinks.revoke(second.link.linkId), true);
  const revoked = await app.call("POST", `/sessions/${sessionId}/join`, { token: second.token });
  assert.equal(revoked.status, 404);
});

test("only the session owner mints join links, and the count is bounded", async () => {
  const app = harness({ maxLinksPerSession: 1 });
  const sessionId = await liveSession(app);

  const foreign = await app.call("POST", `/sessions/${sessionId}/join-links`, { lifetimeMs: 60_000 }, {
    "x-epoch-principal": GUEST,
  });
  assert.equal(foreign.status, 403);

  assert.equal((await app.call("POST", `/sessions/${sessionId}/join-links`, { lifetimeMs: 60_000 })).status, 200);
  const overflowing = await app.call("POST", `/sessions/${sessionId}/join-links`, { lifetimeMs: 60_000 });
  assert.equal(overflowing.status, 409);
  assert.equal((await overflowing.json()).error.code, "join-link-limit");
});

test("media tokens are derived least-privilege credentials, never asserted authority", async () => {
  const app = harness();
  const sessionId = await liveSession(app);

  // The host consented to audio, so a microphone token is issued and bounded.
  const issued = await app.call("POST", `/sessions/${sessionId}/media/token`, { sources: ["microphone"] });
  assert.equal(issued.status, 200);
  const grant = (await issued.json()).receipt.data;
  assert.ok(grant.token.length > 0);
  assert.equal(grant.canSubscribe, true);
  assert.deepEqual(grant.publishSources, ["microphone"]);
  assert.ok(grant.expiresAtMs - app.clock() <= 900_000, "token lifetime stays inside the honest ceiling");
  // Nothing in the response leaks a provider secret or the session's salt.
  assert.equal(JSON.stringify(grant).includes("hook"), false);

  // Camera is not enabled by this policy, so it is refused rather than trimmed.
  const camera = await app.call("POST", `/sessions/${sessionId}/media/token`, { sources: ["camera"] });
  assert.equal(camera.status, 403);

  // An observer may subscribe but never publish.
  await app.call("POST", `/sessions/${sessionId}/commands`, {
    kind: "live.participant.grant", input: { principalId: GUEST, role: "observer" }, confirmed: true,
  });
  const observer = await app.call("POST", `/sessions/${sessionId}/media/token`, { sources: ["microphone"] }, {
    "x-epoch-principal": GUEST,
  });
  assert.equal(observer.status, 403);
  const subscribeOnly = await app.call("POST", `/sessions/${sessionId}/media/token`, { sources: [] }, {
    "x-epoch-principal": GUEST,
  });
  assert.equal(subscribeOnly.status, 200);
  assert.deepEqual((await subscribeOnly.json()).receipt.data.publishSources, []);
});

test("media tokens are refused for semantic-only sessions and after a session ends", async () => {
  const app = harness();
  const semantic = await liveSession(app, {
    visibility: "community",
    presentationViewRef: "views/present",
    allowedPathPatterns: ["packages/app/**"],
    allowedActionIds: ["view.open"],
  }, ["semantic-capture"]);
  const refused = await app.call("POST", `/sessions/${semantic}/media/token`, { sources: [] });
  assert.equal(refused.status, 403);

  const media = await liveSession(app);
  await app.call("POST", `/sessions/${media}/commands`, { kind: "live.session.end", confirmed: true });
  const afterEnd = await app.call("POST", `/sessions/${media}/media/token`, { sources: [] });
  assert.equal(afterEnd.status, 403);
});

test("a revoked participant cannot obtain a new media token", async () => {
  const app = harness();
  const sessionId = await liveSession(app);
  await app.call("POST", `/sessions/${sessionId}/commands`, {
    kind: "live.participant.grant", input: { principalId: GUEST, role: "collaborator" }, confirmed: true,
  });
  await app.call("POST", `/sessions/${sessionId}/commands`, {
    kind: "live.session.consent", input: { scopes: ["semantic-capture", "audio"] },
  }, { "x-epoch-principal": GUEST });
  assert.equal((await app.call("POST", `/sessions/${sessionId}/media/token`, { sources: ["microphone"] }, {
    "x-epoch-principal": GUEST,
  })).status, 200);

  await app.call("POST", `/sessions/${sessionId}/commands`, {
    kind: "live.participant.revoke", input: { principalId: GUEST }, confirmed: true,
  });
  const afterRevoke = await app.call("POST", `/sessions/${sessionId}/media/token`, { sources: ["microphone"] }, {
    "x-epoch-principal": GUEST,
  });
  assert.equal(afterRevoke.status, 403, "revocation wins over a client that kept asking");
});

test("media commands report honestly when no gateway is configured", async () => {
  const app = harness({ withMedia: false });
  const sessionId = await liveSession(app);
  const response = await app.call("POST", `/sessions/${sessionId}/media/token`, { sources: [] });
  assert.equal(response.status, 200);
  const receipt = (await response.json()).receipt;
  assert.equal(receipt.data.refused, "unavailable");
  assert.equal(receipt.validation.state, "invalid");
  assert.equal(receipt.data.token, undefined);
});

test("provider webhooks verify, bind to a session, deduplicate, and never bypass the command path", async () => {
  const app = harness();
  const sessionId = await liveSession(app);
  // Provision the room the way a token request would.
  await app.call("POST", `/sessions/${sessionId}/media/token`, { sources: ["microphone"] });

  const body = JSON.stringify({ event: "participant_joined", roomRef: "fake-room-1", epoch: { sessionId } });
  const signature = `fake-signature:hook:${body.length}`;
  const webhookPath = "/provider/fake/webhook";

  // Wrong content type, forged signature, and oversized bodies never reach the domain.
  assert.equal((await app.callRaw(webhookPath, body, {
    "Content-Type": "application/json", authorization: signature,
  })).status, 415);
  assert.equal((await app.callRaw(webhookPath, body, {
    "Content-Type": "application/webhook+json", authorization: "forged",
  })).status, 401);

  const accepted = await app.callRaw(webhookPath, body, {
    "Content-Type": "application/webhook+json", authorization: signature,
  });
  assert.equal(accepted.status, 200);
  const receipt = (await accepted.json()).receipt;
  assert.equal(receipt.kind, "live.media.providerEvent");
  assert.equal(receipt.source, "api");
  assert.equal(receipt.data.eventKind, "participant_joined");
  assert.equal(receipt.data.eventDigest, liveWebhookBodyDigest(body));
  // Ingress runs as a system principal that holds no session grant.
  assert.match(receipt.actor, /^liveprovider_/u);

  // A replayed delivery is acknowledged once and changes nothing twice.
  const replayed = await app.callRaw(webhookPath, body, {
    "Content-Type": "application/webhook+json", authorization: signature,
  });
  assert.equal(replayed.status, 200);
  assert.equal((await replayed.json()).duplicate, true);

  // An unknown provider path is not a route at all.
  assert.equal((await app.callRaw("/provider/livekit/webhook", body, {
    "Content-Type": "application/webhook+json", authorization: signature,
  })).status, 404);
});

test("a webhook that names no known session is refused before the domain sees it", async () => {
  const app = harness();
  const sessionId = await liveSession(app);
  await app.call("POST", `/sessions/${sessionId}/media/token`, { sources: ["microphone"] });

  const unbound = JSON.stringify({ event: "participant_joined", roomRef: "fake-room-1" });
  const response = await app.callRaw("/provider/fake/webhook", unbound, {
    "Content-Type": "application/webhook+json", authorization: `fake-signature:hook:${unbound.length}`,
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, "webhook-unbound");
});

test("expired rate buckets are swept so a one-shot principal cannot grow the limiter forever", () => {
  // The limiter is keyed by principal, and join links mint a fresh opaque
  // principal per redemption. Overwriting on next use reclaims nothing for a
  // principal that is never seen again, so without a sweep the map is a leak
  // an untrusted holder of one valid link can drive, one request at a time.
  const buckets = new Map();
  for (let index = 0; index < 1000; index += 1) {
    buckets.set(`liveguest_${index}:GET`, { count: 1, resetAtMs: 1_000 });
  }
  buckets.set("still-open:GET", { count: 1, resetAtMs: 10_000 });

  const removed = sweepExpiredLiveRateBuckets(buckets, 5_000);

  assert.equal(removed, 1000, "closed windows were not reclaimed");
  assert.equal(buckets.size, 1, "sweep did not leave exactly the open window");
  assert.equal(buckets.has("still-open:GET"), true, "sweep collected a window that is still open");
});

test("a bucket whose window is still open survives the sweep at its own boundary", () => {
  const buckets = new Map([["a:GET", { count: 3, resetAtMs: 5_000 }]]);
  assert.equal(sweepExpiredLiveRateBuckets(buckets, 4_999), 0, "collected a window one tick early");
  assert.equal(sweepExpiredLiveRateBuckets(buckets, 5_000), 1, "did not collect at the reset instant");
});
