/**
 * Chaos / fault-injection for Live Space delivery.
 *
 * The unit tests ask whether delivery is correct when everything works. These
 * ask what one broken participant can do to everyone else: a spectator whose
 * socket died mid-write, two publishes racing, a flood of subscribers, a
 * session torn down while envelopes are in flight.
 *
 * The rule under test throughout is containment. One spectator's failure is
 * one spectator's problem; it must never become the session's problem, and it
 * must never silently cost another reader an envelope they can no longer ask
 * for.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  createCommunityRuntime,
  createLiveSpaceCommandExtensions,
  createLocalLiveSpacePort,
} from "../../Epoch.Community.Runtime/dist/index.js";
import { createLiveSessionHub, createLiveSessionService } from "../dist/index.js";

const HOST = "principal-host";

const POLICY = {
  visibility: "community",
  presentationViewRef: "views/present",
  allowedPathPatterns: ["packages/app/**"],
  allowedActionIds: ["view.open", "diff.show"],
};

/** One host, one bus, one hub — the composition a deployment performs. */
async function liveHarness(hubOptions = {}) {
  let clockMs = 0;
  let currentActor = HOST;
  const port = createLocalLiveSpacePort({
    now: () => { clockMs += 10; return clockMs; },
    sessionSalt: "chaos-entropy",
    resolveSpace: () => ({ viewRef: "views/present" }),
  });
  const runtime = createCommunityRuntime({
    namespace: "chaos-live",
    actor: HOST,
    policies: { capabilities: ["*"] },
    now: () => "2026-08-22T00:00:00.000Z",
    extensions: createLiveSpaceCommandExtensions(port, () => currentActor),
  });
  const hub = createLiveSessionHub(hubOptions);
  const service = createLiveSessionService({ execute: runtime.commands.execute, hub });

  const created = await port.createSession({ spaceId: "space-chaos", actor: HOST, policy: POLICY });
  const sessionId = created.data.sessionId;
  await port.recordConsent({ sessionId, actor: HOST, scopes: ["semantic-capture"] });
  await port.lifecycle({ sessionId, actor: HOST, command: "openLobby" });
  await port.lifecycle({ sessionId, actor: HOST, command: "start" });

  const publish = (view) => service.run({
    kind: "live.presentation.publish",
    input: { sessionId, actionId: "view.open", args: { view }, path: "packages/app/board.ts" },
    source: "api",
    actor: HOST,
  });

  return { sessionId, hub, service, publish, setActor: (actor) => { currentActor = actor; } };
}

function recorder() {
  const received = [];
  const closed = [];
  return {
    received,
    closed,
    onEnvelope: (envelope) => { received.push(envelope.sequence); },
    onClose: (reason) => { closed.push(reason); },
  };
}

test("chaos: a spectator whose callback throws does not silence the rest", async () => {
  const live = await liveHarness();
  // A dead socket is the ordinary case here, not an exotic one: an SSE writer
  // whose client vanished throws on the next write.
  const dead = {
    onEnvelope: () => { throw new Error("EPIPE: socket destroyed"); },
    onClose: () => {},
  };
  const first = recorder();
  const second = recorder();
  live.hub.subscribe(live.sessionId, first);
  live.hub.subscribe(live.sessionId, dead);
  live.hub.subscribe(live.sessionId, second);

  await live.publish("board");

  assert.deepEqual(first.received, [1], "a healthy spectator ahead of the broken one still receives");
  assert.deepEqual(second.received, [1], "a healthy spectator behind the broken one still receives");
});

test("chaos: a spectator that keeps throwing is dropped, not retried forever", async () => {
  const live = await liveHarness();
  let attempts = 0;
  const dead = {
    onEnvelope: () => { attempts += 1; throw new Error("EPIPE: socket destroyed"); },
    onClose: () => {},
  };
  const healthy = recorder();
  live.hub.subscribe(live.sessionId, dead);
  live.hub.subscribe(live.sessionId, healthy);

  await live.publish("board");
  await live.publish("detail");

  assert.equal(attempts, 1, "a failed spectator is removed after its first failure");
  assert.deepEqual(healthy.received, [1, 2], "and the session keeps delivering to everyone else");
  assert.equal(live.hub.subscriberCount(live.sessionId), 1, "the broken subscription is gone");
});

test("chaos: envelopes are never lost to a delivery failure", async () => {
  const live = await liveHarness();
  const dead = { onEnvelope: () => { throw new Error("EPIPE"); }, onClose: () => {} };
  live.hub.subscribe(live.sessionId, dead);
  await live.publish("board");

  // A reader arriving after the failure must still be able to obtain what it
  // missed: a broken peer cannot consume an envelope on someone else's behalf.
  const events = await live.service.events({
    sessionId: live.sessionId, actor: HOST, afterSequence: 0, limit: 10,
  });
  assert.deepEqual(events.map((envelope) => envelope.sequence), [1]);
});

test("chaos: concurrent publishes deliver each envelope exactly once", async () => {
  const live = await liveHarness();
  const spectator = recorder();
  live.hub.subscribe(live.sessionId, spectator);

  // Two requests in flight at once. Each flush awaits the bus before reading
  // the broadcast cursor, so an unserialized implementation lets both observe
  // the same cursor and fan the same envelopes out twice.
  await Promise.all([live.publish("board"), live.publish("detail")]);

  assert.deepEqual(spectator.received, [1, 2], "no envelope is delivered twice and none is skipped");
  assert.equal(new Set(spectator.received).size, spectator.received.length);
});

test("chaos: many concurrent publishes stay in sequence order, once each", async () => {
  const live = await liveHarness();
  const spectator = recorder();
  live.hub.subscribe(live.sessionId, spectator);

  await Promise.all(Array.from({ length: 12 }, (_unused, index) => live.publish(`view-${index}`)));

  assert.deepEqual(spectator.received, Array.from({ length: 12 }, (_unused, index) => index + 1),
    "sequence is the ordering authority even when the requests are not ordered");
});

test("chaos: a subscriber flood is refused, not queued", async () => {
  const live = await liveHarness({ maxSubscribersPerSession: 2 });
  assert.notEqual(live.hub.subscribe(live.sessionId, recorder()), undefined);
  assert.notEqual(live.hub.subscribe(live.sessionId, recorder()), undefined);
  // The third is told no. A bound that queues instead of refusing is not a
  // bound; it is a slower way to run out of memory.
  assert.equal(live.hub.subscribe(live.sessionId, recorder()), undefined);
  assert.equal(live.hub.subscriberCount(live.sessionId), 2);
});

test("chaos: closing a session tells every spectator why", async () => {
  const live = await liveHarness();
  const first = recorder();
  const second = recorder();
  live.hub.subscribe(live.sessionId, first);
  live.hub.subscribe(live.sessionId, second);

  live.hub.closeSession(live.sessionId, "sealed");

  assert.deepEqual(first.closed, ["sealed"]);
  assert.deepEqual(second.closed, ["sealed"]);
  assert.equal(live.hub.subscriberCount(live.sessionId), 0);
  // A closed session delivers nothing further rather than throwing.
  live.hub.broadcast(live.sessionId, []);
});

test("chaos: a spectator that unsubscribes mid-broadcast stops cleanly", async () => {
  const live = await liveHarness();
  const healthy = recorder();
  let handle;
  const leaver = {
    onEnvelope: () => { handle?.close(); },
    onClose: () => {},
  };
  handle = live.hub.subscribe(live.sessionId, leaver);
  live.hub.subscribe(live.sessionId, healthy);

  await live.publish("board");
  await live.publish("detail");

  assert.deepEqual(healthy.received, [1, 2], "the remaining spectator is unaffected by the departure");
  assert.equal(live.hub.subscriberCount(live.sessionId), 1);
});

test("chaos: a spectator subscribing during a broadcast waits for the next one", async () => {
  const live = await liveHarness();
  const latecomer = recorder();
  const joiner = {
    // Re-entrant subscription during delivery: the new subscriber must not be
    // handed the envelope currently being fanned out, or a set mutated while
    // iterating decides who sees what.
    onEnvelope: () => { live.hub.subscribe(live.sessionId, latecomer); },
    onClose: () => {},
  };
  live.hub.subscribe(live.sessionId, joiner);

  await live.publish("board");
  assert.deepEqual(latecomer.received, [], "a spectator does not receive the envelope that created it");

  await live.publish("detail");
  assert.ok(latecomer.received.includes(2), "and does receive the next one");
});
