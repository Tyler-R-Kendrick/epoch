import assert from "node:assert/strict";
import {
  createBroadcastChannelProvider,
  createChannelProvider,
  createInMemoryRelay,
  createInMemoryRelayProvider,
  createIntegritySigner,
  createIntegrityVerifier,
  createLiveStore,
  createWebRTCProvider,
  createWebSocketRelayProvider,
  diffToOps,
  hashHex,
  LiveLog,
  materialize,
  materializeAt,
  resolveRollbackTargetId,
  stableJson,
  type LiveBroadcastChannel,
  type LiveChannel,
  type LiveEvent,
} from "@epoch/live";
import { createMemoryEpochVfs } from "@epoch/wasm-react";

type TestJsonValue = boolean | null | number | string | TestJsonObject | readonly TestJsonValue[] | undefined;
interface TestJsonObject {
  readonly [key: string]: TestJsonValue;
}

interface DocState {
  readonly title?: string;
  readonly count?: number;
  readonly [key: string]: TestJsonValue;
}

export function runEpochLiveStoreTests(): void {
  signerRoundTripsAndRejectsTampering();
  utilHelpersAreDeterministic();
  logAppendsOrdersAndVerifies();
  logIngestRejectsInvalidEvents();
  logPersistsAndReloadsFromVfs();
  materializeFoldsOpsAndRollback();
  materializeAtPreviewsPrefix();
  diffToOpsComputesSetAndDelete();
  resolveRollbackTargetVariants();
  storeDispatchesReducerAndPatch();
  storeCachesSnapshotAndNotifies();
  storeRewindAndDurableRollback();
  storeUndoRedoNavigation();
  storeSeedsAndHandlesDeletion();
  relayConvergesTwoPeersIncludingRollback();
  relayLateJoinCarriesPresence();
  presenceExpiresWhenAPeerDisconnects();
  broadcastChannelProviderConverges();
  channelProviderConvergesAcrossTransports();
  providerRejectsUnverifiedEvents();
}

function signerRoundTripsAndRejectsTampering(): void {
  const signer = createIntegritySigner("alice");
  const verifier = createIntegrityVerifier();
  const canonical = stableJson({ a: 1 });
  const signature = signer.sign(canonical);
  assert.equal(verifier.verify(canonical, signature, "alice"), true);
  assert.equal(verifier.verify(canonical, signature, "bob"), false, "author binding");
  assert.equal(verifier.verify(stableJson({ a: 2 }), signature, "alice"), false, "content binding");
  assert.equal(signer.scheme, verifier.scheme);
}

function utilHelpersAreDeterministic(): void {
  assert.equal(hashHex("abc"), hashHex("abc"));
  assert.notEqual(hashHex("abc"), hashHex("abd"));
  assert.equal(stableJson({ b: 1, a: 2 }), stableJson({ a: 2, b: 1 }), "key order independent");
  assert.equal(stableJson([1, undefined, 3]), "[1,null,3]");
}

function logAppendsOrdersAndVerifies(): void {
  const log = new LiveLog({ author: "alice" });
  const first = log.append("op", "doc", { op: { kind: "set", key: "a", value: 1 } });
  const second = log.append("op", "doc", { op: { kind: "set", key: "b", value: 2 } });
  assert.equal(log.all().length, 2);
  assert.equal(log.all()[0].id, first.id);
  assert.equal(second.lamport, 2);
  assert.deepEqual(second.parents, [first.id], "parents track the frontier");
  assert.deepEqual(log.heads(), [second.id]);
  assert.deepEqual(log.entities(), ["doc"]);
  assert.equal(log.has(first.id), true);
  assert.deepEqual(log.verify(), []);
}

function logIngestRejectsInvalidEvents(): void {
  const source = new LiveLog({ author: "alice" });
  const event = source.append("op", "doc", { op: { kind: "set", key: "a", value: 1 } });
  const target = new LiveLog({ author: "bob" });

  const applied = target.ingest([event]);
  assert.deepEqual(applied, { applied: 1, rejected: 0 });
  assert.equal(target.ingest([event]).applied, 0, "idempotent re-ingest");

  const tampered: LiveEvent = { ...event, id: `${event.id}x`, payload: { op: { kind: "set", key: "a", value: 999 } } };
  assert.deepEqual(target.ingest([tampered]), { applied: 0, rejected: 1 }, "verify rejects tampering");
}

function logPersistsAndReloadsFromVfs(): void {
  const vfs = createMemoryEpochVfs();
  const first = new LiveLog({ author: "alice", vfs });
  first.append("op", "doc", { op: { kind: "set", key: "a", value: 1 } });
  first.append("op", "doc", { op: { kind: "set", key: "a", value: 2 } });
  const reloaded = new LiveLog({ author: "alice", vfs });
  assert.equal(reloaded.all().length, 2, "events persist across instances");
  assert.deepEqual(materialize(reloaded.all(), "doc"), { a: 2 });
}

function materializeFoldsOpsAndRollback(): void {
  const log = new LiveLog({ author: "alice" });
  const one = log.append("op", "doc", { op: { kind: "set", key: "n", value: 1 } });
  log.append("op", "doc", { op: { kind: "set", key: "n", value: 2 } });
  assert.deepEqual(materialize(log.all(), "doc"), { n: 2 });

  log.append("rollback", "doc", { target: one.id, reason: "revert", previousHeads: log.heads() });
  assert.deepEqual(materialize(log.all(), "doc"), { n: 1 }, "rollback resets to target then reapplies");

  log.append("op", "doc", { op: { kind: "delete", key: "n" } });
  assert.deepEqual(materialize(log.all(), "doc"), {}, "delete after rollback");

  log.append("rollback", "doc", { target: "genesis", reason: "clear", previousHeads: log.heads() });
  assert.deepEqual(materialize(log.all(), "doc"), {}, "genesis rollback empties state");
}

function materializeAtPreviewsPrefix(): void {
  const log = new LiveLog({ author: "alice" });
  const one = log.append("op", "doc", { op: { kind: "set", key: "n", value: 1 } });
  log.append("op", "doc", { op: { kind: "set", key: "n", value: 2 } });
  assert.deepEqual(materializeAt(log.all(), "doc", 1), { n: 1 }, "prefix by op count");
  assert.deepEqual(materializeAt(log.all(), "doc", one.id), { n: 1 }, "prefix by event id");
  assert.deepEqual(materializeAt(log.all(), "doc", "latest"), { n: 2 });
  assert.deepEqual(materializeAt(log.all(), "doc", 0), {}, "count zero is empty");
  assert.throws(() => materializeAt(log.all(), "doc", "missing"), /unknown event/u);
}

function diffToOpsComputesSetAndDelete(): void {
  assert.deepEqual(diffToOps({}, { a: 1 }), [{ kind: "set", key: "a", value: 1 }]);
  assert.deepEqual(diffToOps({ a: 1 }, {}), [{ kind: "delete", key: "a" }]);
  assert.deepEqual(diffToOps({ a: 1 }, { a: 1 }), [], "no-op when unchanged");
  assert.deepEqual(diffToOps({ a: 1 }, { a: 2 }), [{ kind: "set", key: "a", value: 2 }]);
}

function resolveRollbackTargetVariants(): void {
  const log = new LiveLog({ author: "alice" });
  const one = log.append("op", "doc", { op: { kind: "set", key: "n", value: 1 } });
  const two = log.append("op", "doc", { op: { kind: "set", key: "n", value: 2 } });
  const events = log.all();
  assert.equal(resolveRollbackTargetId(events, "doc", "genesis"), "genesis");
  assert.equal(resolveRollbackTargetId(events, "doc", 0), "genesis");
  assert.equal(resolveRollbackTargetId(events, "doc", 1), one.id);
  assert.equal(resolveRollbackTargetId(events, "doc", "latest"), two.id);
  assert.equal(resolveRollbackTargetId(events, "doc", two.id), two.id);
  assert.throws(() => resolveRollbackTargetId(events, "doc", "missing"), /not an op event/u);
}

function storeDispatchesReducerAndPatch(): void {
  const reduced = createLiveStore<DocState>({
    entity: "counter",
    author: "alice",
    initialState: { count: 0 },
    reducer: (state, action) => (action.type === "inc" ? { ...state, count: (state.count ?? 0) + 1 } : state),
  });
  reduced.dispatch({ type: "inc" });
  reduced.dispatch({ type: "inc" });
  assert.equal(reduced.getState().count, 2);
  assert.equal(reduced.select((state) => state.count), 2);
  assert.equal(reduced.dispatch({ type: "noop" }).events.length, 0, "reducer no-op appends nothing");

  const patched = createLiveStore<DocState>({ entity: "doc", author: "alice", initialState: {} });
  patched.dispatch({ type: "set", payload: { title: "hi" } });
  assert.deepEqual(patched.getState(), { title: "hi" }, "default patch reducer");
  assert.equal(patched.log().verify().length, 0);
  assert.ok(patched.history().some((entry) => entry.summary.includes("set title")));
}

function storeCachesSnapshotAndNotifies(): void {
  const store = createLiveStore<DocState>({ entity: "doc", author: "alice", initialState: { count: 0 } });
  assert.equal(store.getState(), store.getState(), "snapshot reference is stable between changes");
  let notifications = 0;
  const off = store.subscribe(() => {
    notifications += 1;
  });
  store.dispatch({ type: "set", payload: { count: 1 } });
  const afterFirst = store.getState();
  off();
  store.dispatch({ type: "set", payload: { count: 2 } });
  assert.equal(notifications, 1, "unsubscribed listener stops receiving");
  assert.notEqual(store.getState(), afterFirst, "snapshot ref changes on commit");
}

function storeRewindAndDurableRollback(): void {
  const store = createLiveStore<DocState>({ entity: "doc", author: "alice", initialState: {} });
  const first = store.dispatch({ type: "set", payload: { title: "one" } });
  store.dispatch({ type: "set", payload: { title: "two" } });

  store.rewind(first.events[0].id);
  assert.equal(store.getState().title, "one", "rewind previews");
  const eventCount = store.log().all().length;
  store.rewind("latest");
  assert.equal(store.getState().title, "two");
  assert.equal(store.log().all().length, eventCount, "rewind is non-committing");
  assert.throws(() => store.rewind("missing"), /unknown event/u);

  store.rollbackTo(first.events[0].id, "revert");
  assert.equal(store.getState().title, "one", "rollback is durable and inclusive");
  assert.ok(store.history().some((entry) => entry.kind === "rollback" && entry.summary.includes("revert")));
}

function storeUndoRedoNavigation(): void {
  const store = createLiveStore<DocState>({ entity: "doc", author: "alice", initialState: { n: 0 } });
  store.dispatch({ type: "set", payload: { n: 1 } });
  store.dispatch({ type: "set", payload: { n: 2 } });
  assert.equal(store.canUndo(), true);
  assert.equal(store.canRedo(), false);

  store.undo();
  assert.equal(store.getState().n, 1);
  store.undo();
  assert.equal(store.getState().n, 0);
  assert.equal(store.canUndo(), false);
  assert.deepEqual(store.undo().events, [], "undo at genesis is a no-op");

  store.redo();
  assert.equal(store.getState().n, 1);
  assert.equal(store.canRedo(), true);

  store.dispatch({ type: "set", payload: { n: 9 } });
  assert.equal(store.canRedo(), false, "dispatch after undo drops the redo branch");
  assert.deepEqual(store.redo().events, [], "redo at latest is a no-op");
}

function storeSeedsAndHandlesDeletion(): void {
  const store = createLiveStore<DocState>({ entity: "doc", author: "alice", initialState: { title: "draft", count: 0 } });
  assert.deepEqual(store.getState(), { title: "draft", count: 0 }, "initial state seeds op events");
  store.dispatch({ type: "clear", payload: { title: undefined } });
  assert.ok(!("title" in store.getState()), "undefined payload deletes a key");
  assert.equal(store.getState().count, 0);

  const empty = createLiveStore<DocState>({ entity: "empty", author: "alice", initialState: {} });
  assert.deepEqual(empty.getState(), {}, "empty initial state seeds nothing");
}

function relayConvergesTwoPeersIncludingRollback(): void {
  const relay = createInMemoryRelay();
  const alice = createLiveStore<DocState>({ entity: "shared", author: "alice", initialState: {} });
  const bob = createLiveStore<DocState>({ entity: "shared", author: "bob", initialState: {} });
  const disconnectAlice = alice.connect(createInMemoryRelayProvider(relay));
  bob.connect(createInMemoryRelayProvider(relay));
  assert.equal(relay.size(), 2);

  const commit = alice.dispatch({ type: "set", payload: { title: "hello" } });
  alice.dispatch({ type: "set", payload: { title: "world" } });
  assert.equal(bob.getState().title, "world", "bob converges on alice's dispatches");

  alice.rollbackTo(commit.events[0].id, "oops");
  assert.equal(bob.getState().title, "hello", "rollback replicates to bob");
  assert.equal(bob.log().verify().length, 0);

  disconnectAlice();
  alice.dispatch({ type: "set", payload: { title: "offline" } });
  assert.equal(bob.getState().title, "hello", "disconnected changes do not propagate");
}

function relayLateJoinCarriesPresence(): void {
  const relay = createInMemoryRelay();
  const alice = createLiveStore<DocState>({ entity: "p", author: "alice", initialState: {} });
  alice.connect(createInMemoryRelayProvider(relay));
  alice.dispatch({ type: "set", payload: { title: "early" } });
  alice.presence.set({ cursor: 7 });

  const bob = createLiveStore<DocState>({ entity: "p", author: "bob", initialState: {} });
  bob.connect(createInMemoryRelayProvider(relay));
  assert.equal(bob.getState().title, "early", "late joiner receives prior events");
  const alicePresence = bob.presence.peers().find((peer) => peer.author === "alice");
  assert.ok(alicePresence, "late joiner receives prior presence");
  assert.deepEqual(alicePresence.state, { cursor: 7 });
  assert.equal(
    alice.log().all().every((event) => event.kind === "op" || event.kind === "rollback"),
    true,
    "the signed log only ever holds op and rollback events, never presence",
  );
}

function presenceExpiresWhenAPeerDisconnects(): void {
  const relay = createInMemoryRelay();
  const alice = createLiveStore<DocState>({ entity: "px", author: "alice", initialState: {} });
  const bob = createLiveStore<DocState>({ entity: "px", author: "bob", initialState: {} });
  const disconnectAlice = alice.connect(createInMemoryRelayProvider(relay));
  bob.connect(createInMemoryRelayProvider(relay));

  alice.presence.set({ cursor: 3 });
  assert.ok(bob.presence.peers().some((peer) => peer.author === "alice"), "bob sees alice while connected");

  disconnectAlice();
  assert.ok(!bob.presence.peers().some((peer) => peer.author === "alice"), "relay leave evicts alice's presence");

  const [left, right] = createChannelPair();
  const carol = createLiveStore<DocState>({ entity: "px2", author: "carol", initialState: {} });
  const dave = createLiveStore<DocState>({ entity: "px2", author: "dave", initialState: {} });
  const disconnectCarol = carol.connect(createWebSocketRelayProvider(left));
  dave.connect(createWebRTCProvider(right));

  carol.presence.set({ typing: true });
  assert.ok(dave.presence.peers().some((peer) => peer.author === "carol"));

  disconnectCarol();
  assert.ok(!dave.presence.peers().some((peer) => peer.author === "carol"), "channel disconnect evicts presence");
}

function broadcastChannelProviderConverges(): void {
  const factory = createFakeBroadcastFactory();
  const alice = createLiveStore<DocState>({ entity: "bc", author: "alice", initialState: {} });
  const bob = createLiveStore<DocState>({ entity: "bc", author: "bob", initialState: {} });
  const aliceProvider = createBroadcastChannelProvider({ channelName: "room", channelFactory: factory });
  const disconnectAlice = alice.connect(aliceProvider);
  bob.connect(createBroadcastChannelProvider({ channelName: "room", channelFactory: factory }));
  assert.equal(aliceProvider.status(), "online");

  alice.dispatch({ type: "set", payload: { title: "tab-sync" } });
  assert.equal(bob.getState().title, "tab-sync", "cross-tab convergence over BroadcastChannel");
  alice.presence.set({ typing: true });
  assert.ok(bob.presence.peers().some((peer) => peer.author === "alice"));

  disconnectAlice();
  assert.equal(aliceProvider.status(), "offline");
  assert.ok(!bob.presence.peers().some((peer) => peer.author === "alice"), "closing the tab evicts its presence");
}

function channelProviderConvergesAcrossTransports(): void {
  const [left, right] = createChannelPair();
  const alice = createLiveStore<DocState>({ entity: "ws", author: "alice", initialState: {} });
  const bob = createLiveStore<DocState>({ entity: "ws", author: "bob", initialState: {} });
  alice.connect(createWebSocketRelayProvider(left));
  const bobProvider = createWebRTCProvider(right);
  bob.connect(bobProvider);
  assert.equal(bobProvider.id, "webrtc");

  bob.dispatch({ type: "set", payload: { title: "duplex" } });
  assert.equal(alice.getState().title, "duplex", "convergence over a duplex channel");

  const junkChannel: LiveChannel = { send: () => undefined, onMessage: (listener) => listener("not json"), close: () => undefined };
  const provider = createChannelProvider(junkChannel);
  assert.doesNotThrow(() => provider.connect(alice.endpoint()), "malformed payloads are ignored");
}

function providerRejectsUnverifiedEvents(): void {
  const source = createLiveStore<DocState>({ entity: "doc", author: "mallory", initialState: {} });
  const commit = source.dispatch({ type: "set", payload: { title: "forged" } });
  const forged: LiveEvent = { ...commit.events[0], payload: { op: { kind: "set", key: "title", value: "tampered" } } };

  const store = createLiveStore<DocState>({ entity: "doc", author: "alice", initialState: {} });
  const applied = store.endpoint().ingestEvents([forged]);
  assert.equal(applied, 0, "verify-before-trust drops forged events");
  assert.deepEqual(store.getState(), {}, "forged events never change state");
}

// --- test doubles -----------------------------------------------------------

function createFakeBroadcastFactory(): (name: string) => LiveBroadcastChannel {
  const byName = new Map<string, Set<LiveBroadcastChannel>>();
  return (name: string): LiveBroadcastChannel => {
    const peers = byName.get(name) ?? new Set<LiveBroadcastChannel>();
    byName.set(name, peers);
    const channel: LiveBroadcastChannel = {
      onmessage: null,
      postMessage<Message>(message: Message): void {
        for (const other of peers) {
          if (other !== channel && other.onmessage) other.onmessage({ data: message });
        }
      },
      close(): void {
        peers.delete(channel);
      },
    };
    peers.add(channel);
    return channel;
  };
}

function createChannelPair(): readonly [LiveChannel, LiveChannel] {
  const leftListeners: ((data: string) => void)[] = [];
  const rightListeners: ((data: string) => void)[] = [];
  const left: LiveChannel = {
    send: (data) => rightListeners.forEach((listener) => listener(data)),
    onMessage: (listener) => leftListeners.push(listener),
    close: () => undefined,
  };
  const right: LiveChannel = {
    send: (data) => leftListeners.forEach((listener) => listener(data)),
    onMessage: (listener) => rightListeners.push(listener),
    close: () => undefined,
  };
  return [left, right];
}
