import assert from "node:assert/strict";
import { createLiveCommunityBinding, createMemoryCommunityStateStore } from "@epoch/community-api";
import { validateCommunityEntity, type CommunityEntity } from "@epoch/community-core";
import {
  createCommunityRuntime,
  createLiveSpaceCommandExtensions,
  createLocalLiveSpacePort,
  EpochCommandError,
  type CommunityRuntime,
  type LiveCommunityBinding,
  type LiveSessionSnapshot,
  type LiveSpaceApplicationPort,
} from "@epoch/community-runtime";
import type { CommunityStateStore } from "@epoch/community-api";

/**
 * A Live Session is a canonical Community entity, not a thing beside one.
 *
 * The failure this guards against is quiet and structural: annotations and
 * forks kept in a private array look fine in a receipt and are invisible to
 * every projection, every moderator, and every search. Worse, the annotation
 * body was previously validated and then discarded — the surface accepted
 * someone's words and kept only an id.
 *
 * These tests drive the real Community record store, not a stand-in, so what
 * is asserted is that a reply and a Change actually exist afterwards.
 */

const HOST = "principal-host";
const THREAD_ID = "obj-live-thread";
const FIXED_NOW = "2026-08-22T00:00:00.000Z";

function threadEntity(): CommunityEntity {
  return validateCommunityEntity({
    ref: { objectId: THREAD_ID, kind: "thread" },
    fields: { objectId: THREAD_ID, kind: "thread", title: "Nightboard live", state: "open" },
    searchableText: { title: "Nightboard live" },
    relations: [],
    visibility: "public",
    participantIds: [],
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    provenance: { sourceId: "test", nativeId: THREAD_ID, observedAt: FIXED_NOW },
  });
}

function storeWithThread(): CommunityStateStore {
  const entities = [threadEntity()];
  return createMemoryCommunityStateStore({
    schemaVersion: 3,
    metadata: {
      createdAt: FIXED_NOW,
      updatedAt: FIXED_NOW,
      migratedAt: FIXED_NOW,
      migrationTimestamp: FIXED_NOW,
      sourceSchemaVersion: 3,
      migrationId: "migration-current",
    },
    entities,
    relations: entities.flatMap((entity) => entity.relations),
    projectionDefinitions: [],
    namespaceMounts: [],
    sourceCheckpoints: [],
    quarantinedDefinitions: [],
  });
}

function bindingOver(store: CommunityStateStore): LiveCommunityBinding {
  let minted = 0;
  return createLiveCommunityBinding({
    store,
    now: () => FIXED_NOW,
    nextObjectId: (kind) => { minted += 1; return `obj-${kind}-${minted}`; },
  });
}

function portOf(community?: LiveCommunityBinding): LiveSpaceApplicationPort {
  let now = 0;
  return createLocalLiveSpacePort({
    now: () => { now += 10; return now; },
    sessionSalt: "binding-entropy",
    resolveSpace: (spaceId) => spaceId === "space-1" ? { viewRef: "views/present" } : undefined,
    ...(community !== undefined && { community }),
  });
}

function runtimeWith(port: LiveSpaceApplicationPort): CommunityRuntime {
  return createCommunityRuntime({
    namespace: "test",
    actor: HOST,
    policies: { capabilities: ["*"] },
    now: () => FIXED_NOW,
    extensions: createLiveSpaceCommandExtensions(port, () => HOST),
  });
}

/** Drive a session to `live` so checkpoints exist to annotate against. */
async function startedSession(runtime: CommunityRuntime): Promise<string> {
  const created = await runtime.commands.execute<LiveSessionSnapshot>({
    kind: "live.session.create",
    input: {
      spaceId: "space-1",
      policy: {
        visibility: "community",
        presentationViewRef: "views/present",
        allowedPathPatterns: ["packages/app/**"],
        allowedActionIds: ["view.open"],
      },
    },
  });
  const sessionId = created.data.sessionId;
  await runtime.commands.execute({ kind: "live.session.consent", input: { sessionId, scopes: ["semantic-capture"] } });
  await runtime.commands.execute({ kind: "live.session.openLobby", input: { sessionId } });
  await runtime.commands.execute({ kind: "live.session.start", input: { sessionId }, confirmed: true });
  await runtime.commands.execute({
    kind: "live.presentation.publish",
    input: { sessionId, actionId: "view.open", args: { view: "board" }, path: "packages/app/board.ts" },
  });
  return sessionId;
}

async function checkpointOf(runtime: CommunityRuntime, sessionId: string): Promise<string> {
  const checkpoint = await runtime.commands.execute<{ checkpointId: string }>({
    kind: "live.presentation.checkpoint", input: { sessionId },
  });
  return checkpoint.data.checkpointId;
}

/**
 * An annotation with nowhere canonical to live is the parallel store this
 * design exists to refuse, so it is refused rather than kept privately.
 */
async function annotatingWithoutAThreadIsRefused(): Promise<void> {
  const runtime = runtimeWith(portOf(bindingOver(storeWithThread())));
  const sessionId = await startedSession(runtime);
  const checkpointId = await checkpointOf(runtime, sessionId);

  let rejection: EpochCommandError | null = null;
  try {
    await runtime.commands.execute({
      kind: "live.presentation.annotate",
      input: { sessionId, checkpointId, body: "the rail is too wide here" },
    });
  } catch (error) {
    if (error instanceof EpochCommandError) rejection = error;
  }

  assert.ok(rejection !== null, "an unbound session must refuse an annotation");
  assert.equal(rejection.code, "failed-precondition");
  assert.match(rejection.message, /not bound to a Community thread/u);
}

/** With no record store configured at all, the refusal names that instead. */
async function annotatingWithNoRecordStoreIsUnavailable(): Promise<void> {
  const runtime = runtimeWith(portOf());
  const sessionId = await startedSession(runtime);
  const checkpointId = await checkpointOf(runtime, sessionId);
  await runtime.commands.execute({ kind: "live.session.bindThread", input: { sessionId, threadObjectId: THREAD_ID } });

  let rejection: EpochCommandError | null = null;
  try {
    await runtime.commands.execute({
      kind: "live.presentation.annotate",
      input: { sessionId, checkpointId, body: "no store here" },
    });
  } catch (error) {
    if (error instanceof EpochCommandError) rejection = error;
  }

  assert.ok(rejection !== null, "a workspace with no Community store must refuse");
  assert.equal(rejection.code, "unavailable");
  assert.match(rejection.message, /no Community record store/u);
}

/** The binding is on the snapshot, so every surface can see where to look. */
async function bindingIsVisibleOnTheSnapshot(): Promise<void> {
  const runtime = runtimeWith(portOf(bindingOver(storeWithThread())));
  const sessionId = await startedSession(runtime);

  const before = await runtime.commands.execute<LiveSessionSnapshot>({
    kind: "live.session.show", input: { sessionId },
  });
  assert.equal(before.data.boundThreadId, undefined, "an unbound session must not claim a thread");

  const bound = await runtime.commands.execute<LiveSessionSnapshot>({
    kind: "live.session.bindThread", input: { sessionId, threadObjectId: THREAD_ID },
  });
  assert.equal(bound.data.boundThreadId, THREAD_ID);

  await assert.rejects(
    async () => {
      await runtime.commands.execute({ kind: "live.session.bindThread", input: { sessionId, threadObjectId: "   " } });
    },
    (error: Error) => error instanceof EpochCommandError && error.code === "invalid-input",
  );
}

/**
 * The whole point: an annotation becomes a real reply on the real thread,
 * carrying an anchor anyone can verify against the released log.
 */
async function anAnnotationBecomesARealReplyOnTheThread(): Promise<void> {
  const store = storeWithThread();
  const runtime = runtimeWith(portOf(bindingOver(store)));
  const sessionId = await startedSession(runtime);
  const checkpointId = await checkpointOf(runtime, sessionId);
  await runtime.commands.execute({ kind: "live.session.bindThread", input: { sessionId, threadObjectId: THREAD_ID } });

  const annotated = await runtime.commands.execute<{
    annotationId: string; objectId: string; threadRootId: string;
  }>({
    kind: "live.presentation.annotate",
    input: { sessionId, checkpointId, body: "the rail is too wide here", path: "packages/app/board.ts" },
  });

  assert.match(annotated.data.annotationId, /^liveanno_/u);
  assert.equal(annotated.data.threadRootId, THREAD_ID);

  const stored = await store.read((snapshot) => snapshot.entity(annotated.data.objectId));
  assert.ok(stored !== undefined, "the annotation must exist in the Community store");
  assert.equal(stored.ref.kind, "message");
  // The body survives. Previously it was validated and then dropped.
  assert.equal(stored.searchableText.body, "the rail is too wide here");
  assert.equal(stored.fields.parentId, THREAD_ID, "the reply hangs off the bound thread");
  assert.equal(stored.provenance.checkpoint, checkpointId, "provenance anchors to the checkpoint");
  assert.equal(stored.fields.liveSessionId, sessionId);
  assert.equal(stored.fields.liveAnchorPath, "packages/app/board.ts");
  assert.ok(
    String(stored.fields.livePresentationLogHead ?? "").length > 0,
    "the released-log head makes the anchor verifiable rather than a wall-clock guess",
  );
}

/** A fork opens a Change that carries provenance back to the exact checkpoint. */
async function aForkOpensAChangeWithCheckpointProvenance(): Promise<void> {
  const store = storeWithThread();
  const runtime = runtimeWith(portOf(bindingOver(store)));
  const sessionId = await startedSession(runtime);
  const checkpointId = await checkpointOf(runtime, sessionId);
  await runtime.commands.execute({ kind: "live.session.bindThread", input: { sessionId, threadObjectId: THREAD_ID } });

  const fork = await runtime.commands.execute<{
    forkId: string;
    changeId: string;
    objectId: string;
    provenance: { sessionId: string; checkpointId: string; presentationLogHead: string; policyDigest: string };
  }>({ kind: "live.presentation.forkAt", input: { sessionId, checkpointId } });

  assert.match(fork.data.forkId, /^livefork_/u);
  assert.equal(fork.data.provenance.sessionId, sessionId);
  assert.equal(fork.data.provenance.checkpointId, checkpointId);
  assert.ok(fork.data.provenance.presentationLogHead.length > 0, "a fork names the released state it came from");
  assert.equal(fork.changeId, fork.data.changeId, "the receipt carries the change, not only the payload");

  const change = await store.read((snapshot) => snapshot.entity(fork.data.objectId));
  assert.ok(change !== undefined, "the fork must open a real Change in the Community store");
  assert.equal(change.ref.kind, "change");
  assert.equal(change.provenance.checkpoint, checkpointId);
  assert.equal(change.fields.sourceView, "views/present");
  // Provenance is a graph edge back to the session's thread, not a sentence.
  assert.deepEqual(
    change.relations.map((relation) => ({ type: relation.type, target: relation.target.objectId })),
    [{ type: "provenance", target: THREAD_ID }],
  );
}

/** A fabricated checkpoint is still refused, and writes nothing. */
async function aFabricatedCheckpointForksNothing(): Promise<void> {
  const store = storeWithThread();
  const runtime = runtimeWith(portOf(bindingOver(store)));
  const sessionId = await startedSession(runtime);
  await runtime.commands.execute({ kind: "live.session.bindThread", input: { sessionId, threadObjectId: THREAD_ID } });

  await assert.rejects(
    async () => {
      await runtime.commands.execute({
        kind: "live.presentation.forkAt", input: { sessionId, checkpointId: "t=00:12:31" },
      });
    },
    (error: Error) => error instanceof EpochCommandError && error.code === "policy-denied",
  );

  const entities = await store.read((snapshot) => snapshot.entities.length);
  assert.equal(entities, 1, "a refused fork must leave the thread alone");
}

export async function runLiveSpacesCommunityBindingTests(): Promise<void> {
  await annotatingWithoutAThreadIsRefused();
  await annotatingWithNoRecordStoreIsUnavailable();
  await bindingIsVisibleOnTheSnapshot();
  await anAnnotationBecomesARealReplyOnTheThread();
  await aForkOpensAChangeWithCheckpointProvenance();
  await aFabricatedCheckpointForksNothing();
  console.log("Live Spaces Community binding tests passed");
}
