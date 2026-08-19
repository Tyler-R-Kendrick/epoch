import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { test } from "node:test";
import {
  AUTH_CALLOUT_SUBJECT,
  EPOCH_NATS_STREAMS,
  MemoryJetStream,
  attachAuthCalloutService,
  communityLivestreamSubject,
  connectGatedNatsBus,
  createAuthCalloutHandler,
  createInMemoryNatsBus,
  createMemoryEpochStreams,
  createNatsLiveChannel,
  createPlatformAuthValidator,
  evaluateAuthCallout,
  fixtureTokenValidator,
  livePresenceSubject,
  liveSyncSubject,
  permissionsForScopes,
  platformEventsSubject,
} from "../dist/index.js";

test("nats: auth callout allow and deny", async () => {
  const handler = createAuthCalloutHandler(fixtureTokenValidator);
  const ok = await handler({ authToken: "epoch-ok", username: "lea" });
  assert.equal(ok.type, "allow");
  assert.equal(ok.user, "lea");
  assert.ok(ok.permissions?.publish.some((s) => s.startsWith("epoch.live")));

  const deny = await evaluateAuthCallout({ authToken: "bad" }, fixtureTokenValidator);
  assert.equal(deny.type, "deny");
  assert.match(deny.reason || "", /invalid/i);
});

test("nats: auth callout fails closed without token", async () => {
  const decision = await evaluateAuthCallout({}, fixtureTokenValidator);
  assert.equal(decision.type, "deny");
});

test("nats: evaluateAuthCallout denies allow without explicit permissions", async () => {
  const decision = await evaluateAuthCallout({ authToken: "x" }, () => ({
    type: "allow",
    user: "wide",
  }));
  assert.equal(decision.type, "deny");
  assert.match(decision.reason || "", /missing permissions/i);
});

test("nats: ACL session fabric:human permissions", () => {
  const perms = permissionsForScopes(["fabric:human"], "session");
  assert.deepEqual([...perms.publish].sort(), [
    "epoch.community.stream.>",
    "epoch.live.>",
  ]);
  assert.deepEqual([...perms.subscribe].sort(), [
    "epoch.community.stream.>",
    "epoch.live.>",
    "epoch.platform.events.>",
  ]);
  assert.ok(!perms.publish.includes("epoch.platform.events.>"));
});

test("nats: ACL api-token scope matrix", () => {
  const cases = [
    {
      scopes: ["live:write"],
      publish: ["epoch.live.>"],
      subscribe: ["epoch.live.>"],
    },
    {
      scopes: ["live:read"],
      publish: [],
      subscribe: ["epoch.live.>"],
    },
    {
      scopes: ["platform.events:write"],
      publish: ["epoch.platform.events.>"],
      subscribe: ["epoch.platform.events.>"],
    },
    {
      scopes: ["platform.events:read"],
      publish: [],
      subscribe: ["epoch.platform.events.>"],
    },
    {
      scopes: ["community.stream:write"],
      publish: ["epoch.community.stream.>"],
      subscribe: ["epoch.community.stream.>"],
    },
    {
      scopes: ["community.stream:read"],
      publish: [],
      subscribe: ["epoch.community.stream.>"],
    },
    {
      scopes: ["svc:discover"],
      publish: [],
      subscribe: [],
    },
  ];
  for (const row of cases) {
    const perms = permissionsForScopes(row.scopes, "api-token");
    assert.deepEqual([...perms.publish].sort(), [...row.publish].sort(), row.scopes.join(","));
    assert.deepEqual([...perms.subscribe].sort(), [...row.subscribe].sort(), row.scopes.join(","));
  }

  const hostedDiscover = permissionsForScopes(["svc:discover"], "api-token", { allowServiceDiscovery: true });
  assert.deepEqual([...hostedDiscover.publish], ["epoch.svc.>"]);
  assert.deepEqual([...hostedDiscover.subscribe], ["epoch.svc.>"]);

  const empty = permissionsForScopes([], "api-token");
  assert.equal(empty.publish.length, 0);
  assert.equal(empty.subscribe.length, 0);

  const sessionEmpty = permissionsForScopes(["unrelated"], "session");
  assert.equal(sessionEmpty.publish.length + sessionEmpty.subscribe.length, 0);
});

test("nats: platform validator allow with explicit permissions", async () => {
  const validator = createPlatformAuthValidator({
    verifyFabricCredential: (secret) => {
      if (secret !== "sess-ok") return null;
      return {
        id: "c1",
        kind: "session",
        subjectRef: "user:lea",
        scopes: ["fabric:human"],
        expiresAt: Date.now() + 60_000,
      };
    },
  });
  const allow = await evaluateAuthCallout({ authToken: "sess-ok" }, validator);
  assert.equal(allow.type, "allow");
  assert.equal(allow.user, "user:lea");
  assert.ok(allow.permissions);
  assert.ok(allow.permissions.publish.includes("epoch.live.>"));
  assert.ok(!allow.permissions.publish.includes("epoch.platform.events.>"));
});

test("nats: platform validator deny paths", async () => {
  const validator = createPlatformAuthValidator({
    verifyFabricCredential: (secret) => {
      if (secret === "throw") throw new Error("boom");
      if (secret === "nullish") return null;
      if (secret === "empty-scopes") {
        return {
          id: "c2",
          kind: "api-token",
          subjectRef: "tok:empty",
          scopes: [],
          expiresAt: Date.now() + 60_000,
        };
      }
      if (secret === "expired") {
        return {
          id: "c-exp",
          kind: "session",
          subjectRef: "user:old",
          scopes: ["fabric:human"],
          expiresAt: Date.now() - 1,
        };
      }
      if (secret === "nan-exp") {
        return {
          id: "c-nan",
          kind: "session",
          subjectRef: "user:nan",
          scopes: ["fabric:human"],
          expiresAt: Number.NaN,
        };
      }
      return {
        id: "c3",
        kind: "api-token",
        subjectRef: "tok:live",
        scopes: ["live:read"],
        expiresAt: Date.now() + 60_000,
      };
    },
  });

  assert.equal((await evaluateAuthCallout({}, validator)).type, "deny");
  assert.equal((await evaluateAuthCallout({ authToken: "   " }, validator)).type, "deny");
  assert.equal((await evaluateAuthCallout({ authToken: "throw" }, validator)).type, "deny");
  assert.equal((await evaluateAuthCallout({ password: "nullish" }, validator)).type, "deny");
  assert.equal((await evaluateAuthCallout({ authToken: "empty-scopes" }, validator)).type, "deny");
  assert.equal((await evaluateAuthCallout({ authToken: "expired" }, validator)).type, "deny");
  assert.equal((await evaluateAuthCallout({ authToken: "nan-exp" }, validator)).type, "deny");

  const ok = await evaluateAuthCallout({ authToken: "any" }, validator);
  assert.equal(ok.type, "allow");
  assert.deepEqual(ok.permissions?.publish, []);
  assert.deepEqual(ok.permissions?.subscribe, ["epoch.live.>"]);
});

test("nats: gated connect denies blank tokens before gate", async () => {
  let gateCalls = 0;
  await assert.rejects(
    () =>
      connectGatedNatsBus(
        () => createInMemoryNatsBus(),
        () => {
          gateCalls += 1;
          return true;
        },
        "   ",
      ),
    /nats connect denied/,
  );
  assert.equal(gateCalls, 0);
});

test("nats: callout service request/reply on in-memory bus", async () => {
  const bus = createInMemoryNatsBus();
  const handler = createAuthCalloutHandler(fixtureTokenValidator);
  const svc = attachAuthCalloutService(bus, handler);
  const reply = await bus.request(
    AUTH_CALLOUT_SUBJECT,
    JSON.stringify({ authToken: "epoch-ok", username: "lea" }),
    { timeout: 500 },
  );
  const body = JSON.parse(Buffer.from(reply.data).toString("utf8"));
  assert.equal(body.type, "allow");
  assert.equal(body.user, "lea");
  svc.stop();
  bus.close();
});

test("nats: callout service timeout fails closed", async () => {
  const bus = createInMemoryNatsBus();
  const hanging = () => new Promise(() => {});
  const svc = attachAuthCalloutService(bus, hanging, { timeoutMs: 50 });
  const reply = await bus.request(
    AUTH_CALLOUT_SUBJECT,
    JSON.stringify({ authToken: "epoch-ok" }),
    { timeout: 500 },
  );
  const body = JSON.parse(Buffer.from(reply.data).toString("utf8"));
  assert.equal(body.type, "deny");
  assert.match(body.reason || "", /timeout/i);
  svc.stop();
  bus.close();
});

test("nats: gated connect deny without token", async () => {
  await assert.rejects(
    () =>
      connectGatedNatsBus(
        () => createInMemoryNatsBus(),
        (token) => Boolean(token),
        "",
      ),
    /nats connect denied/,
  );
});

test("nats: gated connect via callout handler", async () => {
  const authBus = createInMemoryNatsBus();
  const handler = createAuthCalloutHandler(fixtureTokenValidator);
  const svc = attachAuthCalloutService(authBus, handler);

  const gate = async (token) => {
    const reply = await authBus.request(
      AUTH_CALLOUT_SUBJECT,
      JSON.stringify({ authToken: token }),
      { timeout: 500 },
    );
    const body = JSON.parse(Buffer.from(reply.data).toString("utf8"));
    return body.type === "allow";
  };

  await assert.rejects(
    () => connectGatedNatsBus(() => createInMemoryNatsBus(), gate, "bad"),
    /nats connect denied/,
  );

  const bus = await connectGatedNatsBus(() => createInMemoryNatsBus(), gate, "epoch-ok");
  assert.ok(bus);
  bus.close();
  svc.stop();
  authBus.close();
});

test("nats: jetstream cursor resume for platform events", () => {
  const stream = new MemoryJetStream(EPOCH_NATS_STREAMS.PLATFORM_EVENTS);
  const subject = platformEventsSubject("audit");
  stream.publish(subject, JSON.stringify({ id: "e1", kind: "session.open" }));
  stream.publish(subject, JSON.stringify({ id: "e2", kind: "token.issue" }));
  assert.equal(stream.lastSeq, 2);
  const resumed = stream.read({ startSeq: 2, subject: "epoch.platform.events.>" });
  assert.equal(resumed.length, 1);
  assert.equal(resumed[0].seq, 2);
  const body = JSON.parse(Buffer.from(resumed[0].data).toString("utf8"));
  assert.equal(body.id, "e2");
});

test("nats: community livestream subject isolation", () => {
  const stream = new MemoryJetStream(EPOCH_NATS_STREAMS.COMMUNITY_LIVESTREAM);
  stream.publish(communityLivestreamSubject("space-a"), "{\"t\":\"act\"}");
  stream.publish(communityLivestreamSubject("space-b"), "{\"t\":\"nav\"}");
  const onlyA = stream.read({ subject: communityLivestreamSubject("space-a") });
  assert.equal(onlyA.length, 1);
});

test("nats: memory epoch streams bootstrap", () => {
  const streams = createMemoryEpochStreams();
  assert.equal(streams.size, 4);
  assert.ok(streams.get(EPOCH_NATS_STREAMS.LIVE));
  assert.ok(streams.get(EPOCH_NATS_STREAMS.PLATFORM_EVENTS));
  assert.ok(streams.get(EPOCH_NATS_STREAMS.COMMUNITY_LIVESTREAM));
  assert.ok(streams.get(EPOCH_NATS_STREAMS.SVC));
});

test("nats: jetstream publish/read and subject helpers", () => {
  const stream = new MemoryJetStream("EPOCH_TEST");
  assert.equal(stream.lastSeq, 0);
  assert.equal(stream.publish("epoch.platform.events.audit", "a").seq, 1);
  assert.equal(stream.publish("epoch.platform.events.other", "b", { k: "v" }).seq, 2);
  assert.equal(stream.lastSeq, 2);
  const all = stream.read();
  assert.equal(all.length, 2);
  const limited = stream.read({ startSeq: 1, maxMessages: 1 });
  assert.equal(limited.length, 1);
  assert.equal(platformEventsSubject(""), "epoch.platform.events.default");
  assert.equal(communityLivestreamSubject("a/b"), "epoch.community.stream.a_b");
  assert.equal(liveSyncSubject(""), "epoch.live.default.sync");
});

test("nats: in-memory live channel fans out sync messages", () => {
  const bus = createInMemoryNatsBus();
  const repo = "demo-repo";
  const subjects = {
    sync: liveSyncSubject(repo),
    presence: livePresenceSubject(repo),
  };
  const a = createNatsLiveChannel(bus, subjects);
  const b = createNatsLiveChannel(bus, subjects);
  const seen = [];
  b.channel.onMessage((data) => seen.push(data));
  a.channel.send(JSON.stringify({ type: "hello", from: "a" }));
  a.channel.send(JSON.stringify({ type: "sync", events: [{ id: "1" }] }));
  assert.equal(seen.length, 2);
  assert.match(seen[1], /"sync"/);
  a.channel.close();
  b.channel.close();
  bus.close();
});
