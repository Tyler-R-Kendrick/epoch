import assert from "node:assert/strict";
import {
  createInMemoryLiveTransport,
  createLiveActionCatalog,
  createLivePresentationClient,
  createLivePresentationPublisher,
  normalizeLivePublicationPolicy,
  type InMemoryLiveTransport,
  type LivePresentationEnvelopeV2,
  type LivePresentationPublisher,
} from "@epoch/community-runtime";

/**
 * Semantic transport behavior.
 *
 * A transport is allowed to be unreliable — that is the point of testing it.
 * What is not allowed is for unreliability to change what a spectator believes:
 * lost frames must surface as gaps and be refetched, duplicates must collapse,
 * forged frames must quarantine, and a dead connection must reconnect on a
 * bounded schedule rather than hammering the host.
 */
export async function runLiveSpacesTransportTests(): Promise<void> {
  await lateJoinerHydratesFromCheckpointAndDeltas();
  await lostFramesSurfaceAsGapsAndRecover();
  await duplicatesAndForgeriesNeverChangeHistory();
  await reconnectBackoffIsBoundedAndResumesFromCursor();
  await stopReleasesSubscriptionsAndTimers();
}

const CATALOG = createLiveActionCatalog({
  "view.open": { streamSafe: true, replayEffect: "presentation-local" },
  "diff.show": { streamSafe: true, replayEffect: "presentation-local" },
});

interface HostFixture {
  readonly publisher: LivePresentationPublisher;
  readonly transport: InMemoryLiveTransport;
  publish(actionId: string): readonly LivePresentationEnvelopeV2[];
  /** Release frames that never reach subscribers, simulating transit loss. */
  drop(actionId: string): readonly LivePresentationEnvelopeV2[];
}

function hostFixture(options: { readonly deliverDuplicates?: boolean } = {}): HostFixture {
  const normalized = normalizeLivePublicationPolicy({
    visibility: "public",
    presentationViewRef: "views/present",
    allowedPathPatterns: ["packages/app/**"],
    allowedActionIds: ["view.open", "diff.show"],
  });
  if (normalized.kind !== "valid") throw new Error(normalized.errors.join("; "));
  let now = 0;
  const publisher = createLivePresentationPublisher({
    sessionId: "session-1",
    policy: normalized.policy,
    catalog: CATALOG,
    sessionSalt: "salt",
    now: () => { now += 10; return now; },
  });
  const transport = createInMemoryLiveTransport(options);

  function release(actionId: string): readonly LivePresentationEnvelopeV2[] {
    publisher.capture({
      actorId: "principal-host",
      actionId,
      args: { view: "board" },
      path: "packages/app/board.ts",
      sourceEventIds: [],
      sourceViewRef: "views/present",
      sourceVerified: true,
    });
    return publisher.release();
  }

  return {
    publisher,
    transport,
    publish(actionId) {
      const released = release(actionId);
      transport.push("session-1", released);
      return released;
    },
    drop(actionId) {
      const released = release(actionId);
      transport.withhold("session-1", released);
      return released;
    },
  };
}

/** A scheduler that records pending delays instead of touching a real clock. */
function fakeScheduler() {
  const pending: { delayMs: number; callback: () => void }[] = [];
  return {
    delays: (): readonly number[] => pending.map((entry) => entry.delayMs),
    schedule: (delayMs: number, callback: () => void) => {
      const entry = { delayMs, callback };
      pending.push(entry);
      return () => {
        const index = pending.indexOf(entry);
        if (index >= 0) pending.splice(index, 1);
      };
    },
    async runNext(): Promise<void> {
      const next = pending.shift();
      next?.callback();
      await Promise.resolve();
      await Promise.resolve();
    },
    get pendingCount(): number { return pending.length; },
  };
}

async function lateJoinerHydratesFromCheckpointAndDeltas(): Promise<void> {
  const host = hostFixture();
  host.publish("view.open");
  host.publish("diff.show");
  host.transport.recordCheckpoint("session-1", host.publisher.checkpoint());
  host.publish("view.open");

  const scheduler = fakeScheduler();
  const client = createLivePresentationClient({
    sessionId: "session-1",
    transport: host.transport,
    schedule: scheduler.schedule,
  });
  const state = await client.start();
  // The late joiner adopts the checkpoint and applies only what followed it —
  // it never replays the whole session to catch up.
  assert.equal(state.connection, "open");
  assert.equal(state.lastSequence, 3);
  assert.equal(state.stale, false);
  assert.match(state.lastCheckpointId ?? "", /^livechk_/u);
  assert.equal(client.projection().appliedEnvelopes().length, 1);

  // Live frames arrive through the subscription without another fetch.
  host.publish("diff.show");
  assert.equal(client.state().lastSequence, 4);
  client.stop();
}

async function lostFramesSurfaceAsGapsAndRecover(): Promise<void> {
  const host = hostFixture();
  const scheduler = fakeScheduler();
  const client = createLivePresentationClient({
    sessionId: "session-1",
    transport: host.transport,
    schedule: scheduler.schedule,
  });
  await client.start();
  host.publish("view.open");
  assert.equal(client.state().lastSequence, 1);

  // Sequence 2 never reaches this subscriber; sequence 3 does.
  host.drop("diff.show");
  host.publish("view.open");
  await flush();

  const state = client.state();
  assert.equal(state.gapRecoveries, 1, "the client must notice the hole rather than skipping it");
  assert.equal(state.lastSequence, 3);
  assert.deepEqual(
    client.projection().appliedEnvelopes().map((envelope) => envelope.sequence),
    [1, 2, 3],
    "recovery refetches the missing frame and applies it in order",
  );
  assert.equal(state.stale, false);
  client.stop();
}

async function duplicatesAndForgeriesNeverChangeHistory(): Promise<void> {
  const host = hostFixture({ deliverDuplicates: true });
  const scheduler = fakeScheduler();
  const client = createLivePresentationClient({
    sessionId: "session-1",
    transport: host.transport,
    schedule: scheduler.schedule,
  });
  await client.start();
  const first = host.publish("view.open");
  const envelope = first[0];
  if (envelope === undefined) throw new Error("expected a released envelope");

  // The relay redelivers the same frame: idempotent, no second application.
  host.transport.push("session-1", [envelope]);
  assert.equal(client.state().lastSequence, 1);
  assert.equal(client.projection().appliedEnvelopes().length, 1);

  // A frame with a tampered payload fails digest verification and quarantines.
  host.transport.push("session-1", [{ ...envelope, sequence: 2, args: { view: "attacker" } }]);
  assert.equal(client.state().quarantinedCount, 1);
  assert.equal(client.state().lastSequence, 1, "a forged frame never advances the cursor");
  client.stop();
}

async function reconnectBackoffIsBoundedAndResumesFromCursor(): Promise<void> {
  const host = hostFixture();
  const scheduler = fakeScheduler();
  const client = createLivePresentationClient({
    sessionId: "session-1",
    transport: host.transport,
    schedule: scheduler.schedule,
    jitter: () => 0,
    baseBackoffMs: 100,
    maxBackoffMs: 400,
    maxReconnectAttempts: 3,
  });
  await client.start();
  host.publish("view.open");

  // The relay dies. The client backs off instead of reconnecting immediately.
  host.transport.dropSubscribers("session-1", "relay-lost");
  assert.equal(client.state().connection, "recovering");
  assert.equal(client.state().stale, true);
  assert.deepEqual(scheduler.delays(), [50], "first retry waits base backoff scaled by the jitter floor");

  // Frames released while disconnected are recovered on reconnect, from the cursor.
  host.drop("diff.show");
  await scheduler.runNext();
  await flush();
  assert.equal(client.state().connection, "open");
  assert.equal(client.state().lastSequence, 2);
  assert.equal(client.state().reconnectAttempts, 0, "a successful reconnect resets the attempt counter");
  client.stop();

  await backoffLadderClampsThenFails();
}

/**
 * A transport that never recovers must escalate on a bounded ladder and then
 * stop: an offline host is a reason to give up visibly, not to retry forever.
 */
async function backoffLadderClampsThenFails(): Promise<void> {
  const scheduler = fakeScheduler();
  const stub = controllableTransport();
  const client = createLivePresentationClient({
    sessionId: "session-1",
    transport: stub.transport,
    schedule: scheduler.schedule,
    jitter: () => 1,
    baseBackoffMs: 100,
    maxBackoffMs: 250,
    maxReconnectAttempts: 3,
  });
  await client.start();
  assert.equal(client.state().connection, "open");

  stub.setOffline(true);
  const observed: number[] = [];
  stub.failSubscription("relay-lost");
  observed.push(scheduler.delays().at(-1) ?? 0);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await scheduler.runNext();
    await flush();
    const scheduled = scheduler.delays().at(-1);
    if (scheduled !== undefined) observed.push(scheduled);
  }
  assert.deepEqual(observed, [100, 200, 250], "backoff doubles, then clamps at the ceiling");
  assert.equal(client.state().connection, "failed");
  assert.equal(client.state().stale, true);
  assert.equal(scheduler.pendingCount, 0, "a failed client stops scheduling retries");
}

interface ControllableTransport {
  readonly transport: {
    snapshot: (input: { readonly sessionId: string; readonly afterSequence?: number }) => Promise<{
      readonly envelopes: readonly LivePresentationEnvelopeV2[];
      readonly releasedThroughSequence: number;
    }>;
    events: () => Promise<readonly LivePresentationEnvelopeV2[]>;
    subscribe: (input: {
      readonly onStatus?: (status: { readonly connection: "failed"; readonly reason?: string }) => void;
    }) => { close(): void };
  };
  setOffline(offline: boolean): void;
  failSubscription(reason: string): void;
}

function controllableTransport(): ControllableTransport {
  let offline = false;
  let notifyFailure: ((status: { readonly connection: "failed"; readonly reason?: string }) => void) | undefined;
  return {
    transport: {
      snapshot: () => offline
        ? Promise.reject(new Error("offline"))
        : Promise.resolve({ envelopes: [], releasedThroughSequence: 0 }),
      events: () => offline ? Promise.reject(new Error("offline")) : Promise.resolve([]),
      subscribe: (input) => {
        notifyFailure = input.onStatus;
        return { close: () => { notifyFailure = undefined; } };
      },
    },
    setOffline(next) { offline = next; },
    failSubscription(reason) { notifyFailure?.({ connection: "failed", reason }); },
  };
}

/** Let queued microtasks settle so async recovery is observable synchronously. */
async function flush(): Promise<void> {
  for (let tick = 0; tick < 6; tick += 1) await Promise.resolve();
}

async function stopReleasesSubscriptionsAndTimers(): Promise<void> {
  const host = hostFixture();
  const scheduler = fakeScheduler();
  const client = createLivePresentationClient({
    sessionId: "session-1",
    transport: host.transport,
    schedule: scheduler.schedule,
  });
  await client.start();
  assert.equal(host.transport.subscriberCount("session-1"), 1);
  client.stop();
  assert.equal(host.transport.subscriberCount("session-1"), 0);
  assert.equal(client.state().connection, "closed");

  // Frames released after stop reach nobody and change nothing.
  host.publish("view.open");
  assert.equal(client.state().lastSequence, 0);
}
