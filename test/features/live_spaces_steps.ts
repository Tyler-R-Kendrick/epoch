import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { After, Given, Then, When } from "@cucumber/cucumber";
import { EpochRepository, SignedLiveSessionStore, SignedSpaceStore, SpaceError } from "@epoch/core";
import { assertProtocolEvent } from "@epoch/protocol";
import { validateCommunityEntity, type CommunityEntity } from "@epoch/community-core";
import {
  captionsGateAllowsStart,
  createLiveCommunityBinding,
  createMemoryCommunityStateStore,
  type CommunityStateStore,
  createDisabledLiveCaptionProvider,
  createDisabledLiveMediaProvider,
  evaluateLiveMediaMode,
  type LiveMediaReadiness,
} from "@epoch/community-api";
import {
  createLiveActionCatalog,
  createLivePresentationPublisher,
  createLiveSpectatorProjection,
  createCommunityRuntime,
  createLiveSpaceCommandExtensions,
  createLocalLiveSpacePort,
  EpochCommandError,
  normalizeLivePublicationPolicy,
  type CommunityCommandBus,
  type EpochCommandReceipt,
  type LiveApplyResult,
  type LivePresentationEnvelopeV2,
  type LivePreflightReport,
  type LivePresentationPublisher,
  type LiveSessionSnapshot,
  type LiveSpaceApplicationPort,
  type LiveSpectatorProjection,
  type LiveOperationsProjection,
  type LiveTelemetryRecord,
} from "@epoch/community-runtime";

interface PublishDecisionData {
  readonly decision: { readonly kind: string; readonly reason?: string };
  readonly releasedNow: number;
}

interface StatusData {
  readonly session: LiveSessionSnapshot;
  readonly quarantined: number;
  readonly envelopes: readonly LivePresentationEnvelopeV2[];
}

interface LiveWorld {
  createdDirs: string[];
  root?: string;
  spaces?: SignedSpaceStore;
  live?: SignedLiveSessionStore;
  spaceId?: string;
  coreSessionId?: string;
  port?: LiveSpaceApplicationPort;
  sessionId?: string;
  lastPublish?: PublishDecisionData;
  checkpointId?: string;
  forkProvenance?: { readonly sessionId: string; readonly checkpointId: string };
  lastError?: Error;
  publisher?: LivePresentationPublisher;
  envelopes?: readonly LivePresentationEnvelopeV2[];
  spectator?: LiveSpectatorProjection;
  lateJoiner?: LiveSpectatorProjection;
  applyResults?: readonly LiveApplyResult[];
  mediaReadiness?: LiveMediaReadiness;
  preflight?: LivePreflightReport;
  communityStore?: CommunityStateStore;
  annotationObjectId?: string;
  forkChangeId?: string;
  spectatorGap?: { readonly missingFrom: number; readonly missingTo: number };
  forkLogHead?: string;
  boardBus?: CommunityCommandBus;
  boardReceipt?: EpochCommandReceipt;
  liveReport?: ReportData;
  liveOperations?: OperationsData;
}

let world: LiveWorld = { createdDirs: [] };

After(function () {
  for (const directory of world.createdDirs) rmSync(directory, { recursive: true, force: true });
  world = { createdDirs: [] };
});

const HOST = "principal-host";
const GUEST = "principal-guest";
const SECRET = "sk-live-abcdef123456";

const FEATURE_CATALOG = createLiveActionCatalog({
  "view.open": { streamSafe: true, replayEffect: "presentation-local" },
  "diff.show": { streamSafe: true, replayEffect: "presentation-local" },
  "theme.set": { streamSafe: true, replayEffect: "presentation-local" },
});

function policyDigestFor(viewName: string): string {
  const normalized = normalizeLivePublicationPolicy({
    visibility: "community",
    presentationViewRef: viewName,
    allowedPathPatterns: ["packages/app/**"],
    allowedActionIds: ["view.open", "diff.show"],
  });
  if (normalized.kind !== "valid") throw new Error(normalized.errors.join("; "));
  return normalized.digest;
}

function liveStore(): SignedLiveSessionStore {
  if (world.live === undefined) throw new Error("no live session store in scope");
  return world.live;
}

function coreSessionId(): string {
  if (world.coreSessionId === undefined) throw new Error("no core live session in scope");
  return world.coreSessionId;
}

function port(): LiveSpaceApplicationPort {
  if (world.port === undefined) throw new Error("no live space port in scope");
  return world.port;
}

function sessionId(): string {
  if (world.sessionId === undefined) throw new Error("no live session in scope");
  return world.sessionId;
}

function snapshotOf(record: { readonly data: unknown }): LiveSessionSnapshot {
  // SAFETY: the local live space port returns LiveSessionSnapshot data for session commands.
  return record.data as LiveSessionSnapshot;
}

interface LiveRefusal {
  readonly refused: string;
  readonly reason: string;
}

function refusalOf(record: { readonly data: unknown }): LiveRefusal {
  // SAFETY: with no port configured every live command answers this shape.
  const data = record.data as LiveRefusal;
  return { refused: String(data.refused), reason: String(data.reason) };
}

function preflightOf(record: { readonly data: unknown }): LivePreflightReport {
  // SAFETY: the local live space port returns LivePreflightReport data for live.session.preflight.
  return record.data as LivePreflightReport;
}

async function publishAs(actor: string, actionId: string, args: Readonly<Record<string, string | { readonly [key: string]: string }>>, path?: string): Promise<PublishDecisionData> {
  const outcome = await port().publish({
    sessionId: sessionId(), actor, actionId, args,
    ...(path !== undefined && { path }),
  });
  // SAFETY: the local live space port returns publish decision data.
  const data = outcome.data as PublishDecisionData;
  world.lastPublish = data;
  return data;
}

async function statusData(): Promise<StatusData> {
  const outcome = await port().status(sessionId());
  // SAFETY: the local live space port returns presentation status data.
  return outcome.data as StatusData;
}

const LIVE_THREAD_ID = "obj-live-thread";
const FEATURE_NOW = "2026-08-22T00:00:00.000Z";

/**
 * The session's canonical Community thread. Annotations and forks are records
 * on it, so the scenarios drive the real record store rather than asserting
 * against a private array nobody could moderate or search.
 */
function newThreadStore(): CommunityStateStore {
  const thread: CommunityEntity = validateCommunityEntity({
    ref: { objectId: LIVE_THREAD_ID, kind: "thread" },
    fields: { objectId: LIVE_THREAD_ID, kind: "thread", title: "Nightboard live", state: "open" },
    searchableText: { title: "Nightboard live" },
    relations: [],
    visibility: "public",
    participantIds: [],
    createdAt: FEATURE_NOW,
    updatedAt: FEATURE_NOW,
    provenance: { sourceId: "feature", nativeId: LIVE_THREAD_ID, observedAt: FEATURE_NOW },
  });
  return createMemoryCommunityStateStore({
    schemaVersion: 3,
    metadata: {
      createdAt: FEATURE_NOW, updatedAt: FEATURE_NOW, migratedAt: FEATURE_NOW,
      migrationTimestamp: FEATURE_NOW, sourceSchemaVersion: 3, migrationId: "migration-current",
    },
    entities: [thread],
    relations: [],
    projectionDefinitions: [],
    namespaceMounts: [],
    sourceCheckpoints: [],
    quarantinedDefinitions: [],
  });
}

function newSemanticPort(): LiveSpaceApplicationPort {
  let now = 0;
  let minted = 0;
  const store = newThreadStore();
  world.communityStore = store;
  return createLocalLiveSpacePort({
    now: () => { now += 10; return now; },
    sessionSalt: "feature-entropy",
    resolveSpace: () => ({ viewRef: "views/present" }),
    catalog: FEATURE_CATALOG,
    community: createLiveCommunityBinding({
      store,
      now: () => FEATURE_NOW,
      nextObjectId: (kind) => { minted += 1; return `obj-${kind}-${minted}`; },
    }),
  });
}

async function startSession(portInstance: LiveSpaceApplicationPort, allowedPathPatterns: readonly string[]): Promise<string> {
  const created = snapshotOf(await portInstance.createSession({
    spaceId: "space-live", actor: HOST,
    policy: {
      visibility: "community",
      presentationViewRef: "views/present",
      allowedPathPatterns,
      allowedActionIds: ["view.open", "diff.show"],
    },
  }));
  await portInstance.recordConsent({ sessionId: created.sessionId, actor: HOST, scopes: ["semantic-capture"] });
  await portInstance.lifecycle({ sessionId: created.sessionId, actor: HOST, command: "openLobby" });
  await portInstance.lifecycle({ sessionId: created.sessionId, actor: HOST, command: "start" });
  await portInstance.bindThread({ sessionId: created.sessionId, actor: HOST, threadObjectId: LIVE_THREAD_ID });
  return created.sessionId;
}

// ------------------------------------------------- signed lifecycle scenario

Given("a maintainer has opened a space called {string} for a live session", function (title: string) {
  const root = mkdtempSync(join(tmpdir(), "epoch-live-feature-"));
  world.createdDirs.push(root);
  world.root = root;
  world.spaces = SignedSpaceStore.open(root, { author: "maintainer" });
  world.live = new SignedLiveSessionStore(world.spaces);
  world.spaceId = world.spaces.createSpace({ title, view: "main" }).id;
});

Given("the maintainer has created a live session bound to that space", function () {
  if (world.spaceId === undefined) throw new Error("no space in scope");
  const session = liveStore().createSession(world.spaceId, {
    policyDigest: policyDigestFor("main"),
    visibility: "community",
    securityMode: "semantic-only",
  });
  assert.equal(session.spaceId, world.spaceId);
  assert.equal(session.lifecycle, "draft");
  world.coreSessionId = session.sessionId;
});

When("the maintainer records consent for semantic capture", function () {
  liveStore().recordConsent(coreSessionId(), { scopes: ["semantic-capture"] });
});

When("the maintainer opens the lobby and starts the session", function () {
  liveStore().applyLifecycle(coreSessionId(), { command: "openLobby" });
  assert.equal(liveStore().applyLifecycle(coreSessionId(), { command: "start" }).lifecycle, "live");
});

When("the maintainer pauses and later resumes publication", function () {
  assert.equal(liveStore().applyLifecycle(coreSessionId(), { command: "pause" }).lifecycle, "paused");
  assert.equal(liveStore().applyLifecycle(coreSessionId(), { command: "resume" }).lifecycle, "live");
});

When("the maintainer ends the session", function () {
  assert.equal(liveStore().applyLifecycle(coreSessionId(), { command: "end" }).lifecycle, "ended");
});

Then("the maintainer seals the session into a replay marked {string}", function (completeness: string) {
  if (completeness !== "semantic-only") throw new Error(`unexpected completeness fixture: ${completeness}`);
  const sealed = liveStore().seal(coreSessionId(), {
    manifestJson: JSON.stringify({ replayId: "replay-feature", presentationEventIds: [] }),
    completeness: "semantic-only",
  });
  assert.equal(sealed.lifecycle, "sealed");
  assert.equal(sealed.completeness, "semantic-only");
  assert.match(sealed.manifestDigest ?? "", /^[a-f0-9]{64}$/u);
});

Then("every lifecycle step is a signed event that verifies offline", function () {
  if (world.root === undefined) throw new Error("no repository root in scope");
  const repository = new EpochRepository(world.root);
  const liveEvents = repository.events().filter((event) => event.type.startsWith("live.session."));
  assert.ok(liveEvents.length >= 7);
  for (const event of liveEvents) {
    assertProtocolEvent({ schemaVersion: 1, type: event.type, eventId: event.id, revisionId: event.id, body: event.payload });
  }
  assert.deepEqual(repository.verify(), []);
});

Then("the sealed session refuses any further change", function () {
  assert.throws(() => liveStore().applyLifecycle(coreSessionId(), { command: "openLobby" }),
    (error) => error instanceof SpaceError && error.code === "policy-denied");
  assert.throws(() => liveStore().recordPolicy(coreSessionId(), { policyDigest: "livepol_later", change: "narrowing" }),
    (error) => error instanceof SpaceError && error.code === "policy-denied");
});

// ------------------------------------------------ publication and authority

Given("a live session is publishing from an allow-listed application path", async function () {
  world.port = newSemanticPort();
  world.sessionId = await startSession(world.port, ["packages/app/**"]);
  const published = await publishAs(HOST, "view.open", { view: "board" }, "packages/app/board.ts");
  assert.equal(published.decision.kind, "queued");
  assert.equal(published.releasedNow, 1);
});

When("the host's tooling emits an action whose nested arguments carry an API key", async function () {
  await publishAs(HOST, "view.open", { config: { apiKey: SECRET } });
});

Then("the secret-bearing action is dropped as an immutable denial", function () {
  assert.deepEqual(world.lastPublish?.decision, { kind: "dropped", reason: "immutable-deny" });
});

Then("the publication is dropped as an immutable denial", function () {
  assert.deepEqual(world.lastPublish?.decision, { kind: "dropped", reason: "immutable-deny" });
});

Then("the released stream contains only the allow-listed action", async function () {
  const status = await statusData();
  assert.equal(status.envelopes.length, 1);
  assert.equal(status.envelopes[0]?.path, "packages/app/board.ts");
  assert.equal(status.quarantined, 1);
});

Then("no released envelope or quarantine record contains the secret value", async function () {
  assert.equal(JSON.stringify(await statusData()).includes(SECRET), false);
});

When("the host tries to publish an action that touches an environment secrets file", async function () {
  // Even a session that allow-lists every path cannot expose the baseline.
  world.port = newSemanticPort();
  world.sessionId = await startSession(world.port, ["**"]);
  await publishAs(HOST, "view.open", { view: "env" }, "apps/api/.env");
});

Then("the denial holds even though the session allow-lists every path", async function () {
  const session = snapshotOf(await port().showSession(sessionId()));
  assert.equal(session.lifecycle, "live");
  assert.equal((await statusData()).envelopes.length, 0);
});

When("the contributor joins the session as an observer", async function () {
  const joined = snapshotOf(await port().join({ sessionId: sessionId(), actor: GUEST }));
  const participant = joined.participants.find((entry) => entry.principalId === GUEST);
  assert.equal(participant?.role, "observer");
});

Then("the contributor cannot publish into the session", async function () {
  await assert.rejects(async () => { await publishAs(GUEST, "view.open", { view: "board" }); },
    (error: Error) => error instanceof EpochCommandError && error.code === "policy-denied");
});

When("the contributor requests publish capability", async function () {
  const outcome = await port().requestGrant({ sessionId: sessionId(), actor: GUEST, capability: "live.presentation.publish" });
  // SAFETY: the local live space port returns the grant request record.
  assert.equal((outcome.data as { granted: boolean }).granted, false);
});

Then("the request is recorded but grants nothing", async function () {
  await assert.rejects(async () => { await publishAs(GUEST, "view.open", { view: "board" }); },
    (error: Error) => error instanceof EpochCommandError && error.code === "policy-denied");
});

When("the host records a presentation checkpoint", async function () {
  const outcome = await port().checkpoint({ sessionId: sessionId(), actor: HOST });
  // SAFETY: the local live space port returns checkpoint data.
  world.checkpointId = (outcome.data as { checkpointId: string }).checkpointId;
});

When("the contributor annotates that checkpoint on the board file", async function () {
  if (world.checkpointId === undefined) throw new Error("no checkpoint in scope");
  const outcome = await port().annotate({
    sessionId: sessionId(), actor: GUEST, checkpointId: world.checkpointId,
    body: "the rail is two columns too wide", path: "packages/app/board.ts",
  });
  // SAFETY: the local live space port returns annotation data.
  const annotation = outcome.data as { annotationId: string; objectId: string; threadRootId: string };
  assert.match(annotation.annotationId, /^liveanno_/u);
  assert.equal(annotation.threadRootId, LIVE_THREAD_ID);
  world.annotationObjectId = annotation.objectId;
});

Then("the annotation is a record on the session's Community thread", async function () {
  const store = world.communityStore ?? (() => { throw new Error("no community store in scope"); })();
  const objectId = world.annotationObjectId ?? (() => { throw new Error("no annotation in scope"); })();
  const stored = await store.read((snapshot) => snapshot.entity(objectId));
  assert.ok(stored !== undefined, "the annotation must exist as a Community record");
  assert.equal(stored.fields.parentId, LIVE_THREAD_ID);
  // The words survive, and the anchor says which released state they are about.
  assert.equal(stored.searchableText.body, "the rail is two columns too wide");
  assert.equal(stored.provenance.checkpoint, world.checkpointId);
  assert.equal(stored.fields.liveAnchorPath, "packages/app/board.ts");
});

When("the contributor forks the session at that checkpoint", async function () {
  if (world.checkpointId === undefined) throw new Error("no checkpoint in scope");
  const outcome = await port().forkAt({ sessionId: sessionId(), actor: GUEST, checkpointId: world.checkpointId });
  // SAFETY: the local live space port returns fork provenance data.
  const data = outcome.data as {
    changeId: string;
    provenance: { sessionId: string; checkpointId: string; presentationLogHead: string; policyDigest: string };
  };
  world.forkProvenance = { sessionId: data.provenance.sessionId, checkpointId: data.provenance.checkpointId };
  world.forkChangeId = data.changeId;
  world.forkLogHead = data.provenance.presentationLogHead;
});

Then("the fork records provenance back to the session and checkpoint", function () {
  assert.deepEqual(world.forkProvenance, { sessionId: sessionId(), checkpointId: world.checkpointId });
  // A checkpoint is a branch point; a wall-clock moment is not. The released
  // log head is what makes that difference checkable.
  assert.ok((world.forkLogHead ?? "").length > 0, "a fork names the released state it came from");
});

Then("the fork opens a Change carrying that provenance", async function () {
  const store = world.communityStore ?? (() => { throw new Error("no community store in scope"); })();
  const changeId = world.forkChangeId ?? (() => { throw new Error("no fork in scope"); })();
  const stored = await store.read((snapshot) => snapshot.entity(changeId));
  assert.ok(stored !== undefined, "the fork must open a real Change");
  assert.equal(stored.ref.kind, "change");
  assert.equal(stored.provenance.checkpoint, world.checkpointId);
  assert.deepEqual(
    stored.relations.map((relation) => ({ type: relation.type, target: relation.target.objectId })),
    [{ type: "provenance", target: LIVE_THREAD_ID }],
  );
});

Given("the host has granted a contributor temporary collaborator capability", async function () {
  await port().join({ sessionId: sessionId(), actor: GUEST });
  await port().grant({ sessionId: sessionId(), actor: HOST, principalId: GUEST, role: "collaborator" });
});

When("the contributor publishes an allow-listed action", async function () {
  await publishAs(GUEST, "diff.show", { view: "board" }, "packages/app/board.ts");
});

Then("the contributor's action is released into the stream", function () {
  assert.equal(world.lastPublish?.decision.kind, "queued");
  assert.equal(world.lastPublish?.releasedNow, 1);
});

When("the host revokes the contributor's grant", async function () {
  await port().revoke({ sessionId: sessionId(), actor: HOST, principalId: GUEST });
});

Then("the contributor's next publication attempt is refused", async function () {
  await assert.rejects(async () => { await publishAs(GUEST, "diff.show", { view: "board" }, "packages/app/board.ts"); },
    (error: Error) => error instanceof EpochCommandError && error.code === "policy-denied");
});

// ------------------------------------------------- reconnect and convergence

Given("a live session has released a sequence of presentation envelopes", function () {
  let now = 0;
  const normalized = normalizeLivePublicationPolicy({
    visibility: "community",
    presentationViewRef: "views/present",
    allowedPathPatterns: ["packages/app/**"],
    allowedActionIds: ["view.open", "diff.show"],
  });
  if (normalized.kind !== "valid") throw new Error(normalized.errors.join("; "));
  world.publisher = createLivePresentationPublisher({
    sessionId: "session-feature",
    policy: normalized.policy,
    catalog: FEATURE_CATALOG,
    sessionSalt: "feature-entropy",
    now: () => { now += 10; return now; },
  });
  for (const action of ["view.open", "diff.show", "view.open"]) {
    world.publisher.capture({
      actorId: HOST, actionId: action, args: { view: "board" },
      path: "packages/app/board.ts", sourceEventIds: [], sourceViewRef: "views/present", sourceVerified: true,
    });
  }
  world.envelopes = world.publisher.release();
  assert.equal(world.envelopes.length, 3);
});

When("a spectator receives the envelopes out of order with a duplicate", function () {
  const [first, second, third] = world.envelopes ?? [];
  if (first === undefined || second === undefined || third === undefined) throw new Error("expected three envelopes");
  const spectator = createLiveSpectatorProjection({ sessionId: "session-feature" });
  world.spectator = spectator;
  world.applyResults = [
    spectator.apply(first),
    spectator.apply(third),
    spectator.apply(second),
    spectator.apply(first),
  ];
});

Then("the spectator reports the gap, converges in order, and ignores the duplicate", function () {
  const [applied, gap, recovered, duplicate] = world.applyResults ?? [];
  assert.deepEqual(applied, { kind: "applied", sequence: 1 });
  assert.deepEqual(gap, { kind: "gap", missingFrom: 2, missingTo: 2 });
  assert.deepEqual(recovered, { kind: "applied", sequence: 2 });
  assert.deepEqual(duplicate, { kind: "duplicate", sequence: 1 });
  assert.deepEqual(world.spectator?.appliedEnvelopes().map((envelope) => envelope.sequence), [1, 2, 3]);
});

When("a late joiner resynchronizes from the checkpoint plus later envelopes", function () {
  if (world.publisher === undefined) throw new Error("no publisher in scope");
  const checkpoint = world.publisher.checkpoint();
  world.publisher.capture({
    actorId: HOST, actionId: "view.open", args: { view: "board" },
    path: "packages/app/board.ts", sourceEventIds: [], sourceViewRef: "views/present", sourceVerified: true,
  });
  const delta = world.publisher.release();
  const lateJoiner = createLiveSpectatorProjection({ sessionId: "session-feature" });
  lateJoiner.resyncFrom(checkpoint, delta);
  world.lateJoiner = lateJoiner;
  for (const envelope of delta) world.spectator?.apply(envelope);
});

Then("both spectators agree on the same last sequence", function () {
  assert.equal(world.lateJoiner?.state().lastSequence, 4);
  assert.equal(world.spectator?.state().lastSequence, 4);
});

Then("the host's theme preference is never replayed into a spectator's view", function () {
  const first = world.envelopes?.[0] ?? (() => { throw new Error("no envelope in scope"); })();
  const spectator = world.spectator ?? createLiveSpectatorProjection({ sessionId: "session-feature" });
  assert.deepEqual(spectator.replayDecision({ ...first, actionId: "theme.set" }, FEATURE_CATALOG),
    { kind: "skip", reason: "view-preference" });
});

// -------------------------------------------------------- operator honesty

Given("the live media provider is disabled", async function () {
  world.mediaReadiness = await createDisabledLiveMediaProvider().readiness();
});

Then("media readiness reports itself provider-disabled while the semantic session still works", async function () {
  assert.equal(world.mediaReadiness?.ready, false);
  assert.equal(world.mediaReadiness?.label, "provider-disabled");
  world.port = newSemanticPort();
  world.sessionId = await startSession(world.port, ["packages/app/**"]);
  const published = await publishAs(HOST, "view.open", { view: "board" }, "packages/app/board.ts");
  assert.equal(published.releasedNow, 1);
});

Then("starting public synchronized audio without live captions is refused", async function () {
  const captions = await createDisabledLiveCaptionProvider().readiness();
  const gate = captionsGateAllowsStart({
    securityMode: "public-broadcast", mediaEnabled: true, captionReadiness: captions,
  });
  assert.equal(gate.allowed, false);
  assert.match(gate.reason ?? "", /captions/u);
});

Then("an end-to-end-encrypted session refuses provider recording and egress", function () {
  const decision = evaluateLiveMediaMode({
    securityMode: "private-e2ee", recording: true, externalEgress: true, serverTranscription: false,
  });
  assert.equal(decision.kind, "refused");
});

// -------------------------------------------------------- board host surface

/**
 * The board is a renderer over the shared bus, so these steps drive the bus the
 * board drives and read the receipts it renders. What is asserted about the
 * page itself is only what the page authors rather than renders: the standing
 * statement about publication, which no revision may rewrite.
 */
const BOARD_APP = join(process.cwd(), "packages/Epoch.Community.Web/app");

function boardSource(file: string): string {
  return readFileSync(join(BOARD_APP, file), "utf8");
}

Given("a host is preparing a live session on the board", async function () {
  world.port = newSemanticPort();
  const created = snapshotOf(await world.port.createSession({
    spaceId: "space-live", actor: HOST,
    policy: {
      visibility: "community",
      presentationViewRef: "views/present",
      allowedPathPatterns: ["packages/app/**"],
      allowedActionIds: ["view.open"],
    },
  }));
  world.sessionId = created.sessionId;
});

When("the host runs preflight", async function () {
  const port = world.port ?? (() => { throw new Error("no port in scope"); })();
  const sessionId = world.sessionId ?? (() => { throw new Error("no session in scope"); })();
  world.preflight = preflightOf(await port.preflight(sessionId));
});

Then("the board names the paths and actions an audience would receive", function () {
  const report = world.preflight ?? (() => { throw new Error("no preflight in scope"); })();
  assert.deepEqual(report.allowedPathPatterns, ["packages/app/**"]);
  assert.deepEqual(report.allowedActionIds, ["view.open"]);
});

Then("the board names what is never published regardless of policy", function () {
  const report = world.preflight ?? (() => { throw new Error("no preflight in scope"); })();
  assert.ok(report.immutableDenials.length > 0, "an allow-list still has paths it can never widen to");
});

Then("start stays unavailable while preflight reports an error", async function () {
  const report = world.preflight ?? (() => { throw new Error("no preflight in scope"); })();
  const port = world.port ?? (() => { throw new Error("no port in scope"); })();
  const sessionId = world.sessionId ?? (() => { throw new Error("no session in scope"); })();
  // Consent has not been recorded, so preflight fails and start must too.
  assert.equal(report.startAllowed, false);
  assert.ok(report.errors.length > 0, "a refusal must say why");
  await assert.rejects(
    async () => { await port.lifecycle({ sessionId, actor: HOST, command: "start" }); },
    EpochCommandError,
  );
});

Given("the board has no Live Space deployment configured", function () {
  world.boardBus = createCommunityRuntime({
    namespace: "board-feature",
    actor: HOST,
    policies: { capabilities: ["*"] },
    extensions: createLiveSpaceCommandExtensions(undefined, () => HOST),
  }).commands;
});

When("the host opens a live session on the board", async function () {
  const bus = world.boardBus ?? (() => { throw new Error("no board bus in scope"); })();
  world.boardReceipt = await bus.execute({ kind: "live.session.show", input: { sessionId: "live-anything" } });
});

Then("the board reports the session unavailable and names what is missing", function () {
  const receipt = world.boardReceipt ?? (() => { throw new Error("no receipt in scope"); })();
  const refusal = refusalOf(receipt);
  assert.equal(refusal.refused, "unavailable", "the bus must answer, not throw");
  // "unavailable" alone is not an answer — the reason has to name what is
  // missing, or an operator cannot tell a misconfiguration from a defect.
  assert.match(refusal.reason, /port|configur/u);
});

Then("the board offers no publishing controls", function () {
  // Controls are built from the lifecycle a receipt reported. With no session
  // there is no lifecycle, so the row is empty rather than hopefully disabled.
  const live = boardSource("live.js");
  assert.match(live, /if \(noteKind === "unavailable"\) return "";/u,
    "an unavailable session must render no controls at all");
});

Then("the board still states that publication is semantic-only and cannot be recalled", function () {
  const board = boardSource("board.html");
  const creed = /<p[^>]*data-live-creed[^>]*>([\s\S]*?)<\/p>/u.exec(board)
    ?? (() => { throw new Error("the board must author a publication statement"); })();
  const text = creed[1].replace(/\s+/gu, " ").trim();
  assert.match(text, /never your screen/iu);
  assert.match(text, /never your keystrokes/iu);
  assert.match(text, /cannot be recalled/iu);
});


// ------------------------------------------------------- spectator honesty

When("a spectator receives an envelope out of order so one is missing", function () {
  const envelopes = world.envelopes ?? (() => { throw new Error("no envelopes in scope"); })();
  const spectator = createLiveSpectatorProjection({ sessionId: envelopes[0]?.sessionId ?? "session-feature" });
  world.spectator = spectator;
  spectator.apply(envelopes[0] ?? (() => { throw new Error("no first envelope"); })());
  const third = envelopes[2] ?? (() => { throw new Error("no third envelope"); })();
  const result = spectator.apply(third);
  if (result.kind === "gap") world.spectatorGap = { missingFrom: result.missingFrom, missingTo: result.missingTo };
});

Then("the board names the missing range and says it is not showing everything", function () {
  const gap = world.spectatorGap ?? (() => { throw new Error("no gap was reported"); })();
  assert.equal(gap.missingFrom, 2, "the hole names where it starts");
  assert.equal(gap.missingTo, 2, "and where it ends");
  // The words a reader actually sees are authored in the page, not derived.
  const board = readFileSync(join(BOARD_APP, "board.html"), "utf8");
  const creed = /<p[^>]*data-spec-creed[^>]*>([\s\S]*?)<\/p>/u.exec(board)
    ?? (() => { throw new Error("the board must author a spectator statement"); })();
  assert.match(creed[1].replace(/\s+/gu, " ").trim(), /never quietly filled in/iu);
});

Then("the board does not advance the applied sequence past the hole", function () {
  const spectator = world.spectator ?? (() => { throw new Error("no spectator in scope"); })();
  const state = spectator.state();
  assert.equal(state.lastSequence, 1, "a hole must not advance the applied sequence");
  assert.equal(state.pendingCount, 1, "the early envelope is held, not applied");
});

When("the spectator resynchronizes from a checkpoint", function () {
  const publisher = world.publisher ?? (() => { throw new Error("no publisher in scope"); })();
  const spectator = world.spectator ?? (() => { throw new Error("no spectator in scope"); })();
  const envelopes = world.envelopes ?? [];
  const checkpoint = publisher.checkpoint();
  spectator.resyncFrom(checkpoint, envelopes.slice(checkpoint.sequence));
});

Then("the board states where the reader now is", function () {
  const spectator = world.spectator ?? (() => { throw new Error("no spectator in scope"); })();
  assert.equal(spectator.state().lastSequence, 3, "a resynced reader converges on the released head");
});


// ------------------------------------------- moderation, operations, telemetry

interface ReportData {
  readonly reportId: string;
  readonly recorded: boolean;
  readonly releasedThroughSequence: number;
  readonly cannotUndo: readonly string[];
}

interface OperationsData {
  readonly projection: LiveOperationsProjection;
  readonly telemetry: LiveTelemetryRecord;
}

When("a responder reports the session", async function () {
  const outcome = await port().report({
    sessionId: sessionId(), actor: GUEST, reason: "a participant published something they should not have",
  });
  // SAFETY: the local live space port returns report receipt data.
  world.liveReport = outcome.data as ReportData;
  const operations = await port().operations(sessionId());
  // SAFETY: the local live space port returns the operations projection and telemetry record.
  world.liveOperations = operations.data as OperationsData;
});

Then("the receipt names the released sequence and states that released bytes cannot be recalled", function () {
  const report = world.liveReport ?? (() => { throw new Error("no report in scope"); })();
  assert.equal(report.recorded, true);
  assert.equal(report.releasedThroughSequence, 1, "one allow-listed action reached the audience");
  // The reporter must not read this as "handled". A responder who believes the
  // bytes were pulled back stops chasing the copies that still exist.
  assert.match(report.cannotUndo.join(" "), /cannot be recalled/u);
});

Then("the operations projection reports the worst component rather than an average", function () {
  const operations = world.liveOperations ?? (() => { throw new Error("no operations in scope"); })();
  assert.equal(operations.projection.overall, "provider-disabled",
    "a disabled media provider must set the overall label, not be averaged away");
  assert.equal(operations.projection.quarantinedCount, 1);
  assert.match(operations.projection.attention.join(" "), /refused before release/u);
});

Then("the operations projection carries no principal ids, paths, or action arguments", function () {
  const operations = world.liveOperations ?? (() => { throw new Error("no operations in scope"); })();
  const serialized = JSON.stringify(operations.projection);
  assert.equal(serialized.includes(SECRET), false, "a refused secret must never reach an operations panel");
  assert.equal(serialized.includes("packages/app/board.ts"), false, "paths are content");
  assert.equal(serialized.includes(HOST), false, "principals are not operational standing");
});

Then("the telemetry record carries counts and declared labels but no session id", function () {
  const operations = world.liveOperations ?? (() => { throw new Error("no operations in scope"); })();
  const telemetry = operations.telemetry;
  assert.equal(telemetry.releasedCount, 1);
  assert.equal(telemetry.quarantinedCount, 1);
  assert.equal(telemetry.mediaLabel, "provider-disabled");
  // A session id plus a timestamp is a re-identifier, so the shape omits it.
  assert.equal(JSON.stringify(telemetry).includes(sessionId()), false);
});
