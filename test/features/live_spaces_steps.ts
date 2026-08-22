import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { After, Given, Then, When } from "@cucumber/cucumber";
import { EpochRepository, SignedLiveSessionStore, SignedSpaceStore, SpaceError } from "@epoch/core";
import { assertProtocolEvent } from "@epoch/protocol";
import {
  captionsGateAllowsStart,
  createDisabledLiveCaptionProvider,
  createDisabledLiveMediaProvider,
  evaluateLiveMediaMode,
  type LiveMediaReadiness,
} from "@epoch/community-api";
import {
  createLiveActionCatalog,
  createLivePresentationPublisher,
  createLiveSpectatorProjection,
  createLocalLiveSpacePort,
  EpochCommandError,
  normalizeLivePublicationPolicy,
  type LiveApplyResult,
  type LivePresentationEnvelopeV2,
  type LivePresentationPublisher,
  type LiveSessionSnapshot,
  type LiveSpaceApplicationPort,
  type LiveSpectatorProjection,
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

function publishAs(actor: string, actionId: string, args: Readonly<Record<string, string | { readonly [key: string]: string }>>, path?: string): PublishDecisionData {
  const outcome = port().publish({
    sessionId: sessionId(), actor, actionId, args,
    ...(path !== undefined && { path }),
  });
  // SAFETY: the local live space port returns publish decision data.
  const data = outcome.data as PublishDecisionData;
  world.lastPublish = data;
  return data;
}

function statusData(): StatusData {
  // SAFETY: the local live space port returns presentation status data.
  return port().status(sessionId()).data as StatusData;
}

function newSemanticPort(): LiveSpaceApplicationPort {
  let now = 0;
  return createLocalLiveSpacePort({
    now: () => { now += 10; return now; },
    sessionSalt: "feature-entropy",
    resolveSpace: () => ({ viewRef: "views/present" }),
    catalog: FEATURE_CATALOG,
  });
}

function startSession(portInstance: LiveSpaceApplicationPort, allowedPathPatterns: readonly string[]): string {
  const created = snapshotOf(portInstance.createSession({
    spaceId: "space-live", actor: HOST,
    policy: {
      visibility: "community",
      presentationViewRef: "views/present",
      allowedPathPatterns,
      allowedActionIds: ["view.open", "diff.show"],
    },
  }));
  portInstance.recordConsent({ sessionId: created.sessionId, actor: HOST, scopes: ["semantic-capture"] });
  portInstance.lifecycle({ sessionId: created.sessionId, actor: HOST, command: "openLobby" });
  portInstance.lifecycle({ sessionId: created.sessionId, actor: HOST, command: "start" });
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

Given("a live session is publishing from an allow-listed application path", function () {
  world.port = newSemanticPort();
  world.sessionId = startSession(world.port, ["packages/app/**"]);
  const published = publishAs(HOST, "view.open", { view: "board" }, "packages/app/board.ts");
  assert.equal(published.decision.kind, "queued");
  assert.equal(published.releasedNow, 1);
});

When("the host's tooling emits an action whose nested arguments carry an API key", function () {
  publishAs(HOST, "view.open", { config: { apiKey: SECRET } });
});

Then("the secret-bearing action is dropped as an immutable denial", function () {
  assert.deepEqual(world.lastPublish?.decision, { kind: "dropped", reason: "immutable-deny" });
});

Then("the publication is dropped as an immutable denial", function () {
  assert.deepEqual(world.lastPublish?.decision, { kind: "dropped", reason: "immutable-deny" });
});

Then("the released stream contains only the allow-listed action", function () {
  const status = statusData();
  assert.equal(status.envelopes.length, 1);
  assert.equal(status.envelopes[0]?.path, "packages/app/board.ts");
  assert.equal(status.quarantined, 1);
});

Then("no released envelope or quarantine record contains the secret value", function () {
  assert.equal(JSON.stringify(statusData()).includes(SECRET), false);
});

When("the host tries to publish an action that touches an environment secrets file", function () {
  // Even a session that allow-lists every path cannot expose the baseline.
  world.port = newSemanticPort();
  world.sessionId = startSession(world.port, ["**"]);
  publishAs(HOST, "view.open", { view: "env" }, "apps/api/.env");
});

Then("the denial holds even though the session allow-lists every path", function () {
  const session = snapshotOf(port().showSession(sessionId()));
  assert.equal(session.lifecycle, "live");
  assert.equal(statusData().envelopes.length, 0);
});

When("the contributor joins the session as an observer", function () {
  const joined = snapshotOf(port().join({ sessionId: sessionId(), actor: GUEST }));
  const participant = joined.participants.find((entry) => entry.principalId === GUEST);
  assert.equal(participant?.role, "observer");
});

Then("the contributor cannot publish into the session", function () {
  assert.throws(() => publishAs(GUEST, "view.open", { view: "board" }),
    (error) => error instanceof EpochCommandError && error.code === "policy-denied");
});

When("the contributor requests publish capability", function () {
  const outcome = port().requestGrant({ sessionId: sessionId(), actor: GUEST, capability: "live.presentation.publish" });
  // SAFETY: the local live space port returns the grant request record.
  assert.equal((outcome.data as { granted: boolean }).granted, false);
});

Then("the request is recorded but grants nothing", function () {
  assert.throws(() => publishAs(GUEST, "view.open", { view: "board" }),
    (error) => error instanceof EpochCommandError && error.code === "policy-denied");
});

When("the host records a presentation checkpoint", function () {
  // SAFETY: the local live space port returns checkpoint data.
  world.checkpointId = (port().checkpoint({ sessionId: sessionId(), actor: HOST }).data as { checkpointId: string }).checkpointId;
});

When("the contributor annotates that checkpoint on the board file", function () {
  if (world.checkpointId === undefined) throw new Error("no checkpoint in scope");
  const outcome = port().annotate({
    sessionId: sessionId(), actor: GUEST, checkpointId: world.checkpointId,
    body: "the rail is two columns too wide", path: "packages/app/board.ts",
  });
  // SAFETY: the local live space port returns annotation data.
  assert.match((outcome.data as { annotationId: string }).annotationId, /^liveanno_/u);
});

When("the contributor forks the session at that checkpoint", function () {
  if (world.checkpointId === undefined) throw new Error("no checkpoint in scope");
  const outcome = port().forkAt({ sessionId: sessionId(), actor: GUEST, checkpointId: world.checkpointId });
  // SAFETY: the local live space port returns fork provenance data.
  world.forkProvenance = (outcome.data as { provenance: { sessionId: string; checkpointId: string } }).provenance;
});

Then("the fork records provenance back to the session and checkpoint", function () {
  assert.deepEqual(world.forkProvenance, { sessionId: sessionId(), checkpointId: world.checkpointId });
});

Given("the host has granted a contributor temporary collaborator capability", function () {
  port().join({ sessionId: sessionId(), actor: GUEST });
  port().grant({ sessionId: sessionId(), actor: HOST, principalId: GUEST, role: "collaborator" });
});

When("the contributor publishes an allow-listed action", function () {
  publishAs(GUEST, "diff.show", { view: "board" }, "packages/app/board.ts");
});

Then("the contributor's action is released into the stream", function () {
  assert.equal(world.lastPublish?.decision.kind, "queued");
  assert.equal(world.lastPublish?.releasedNow, 1);
});

When("the host revokes the contributor's grant", function () {
  port().revoke({ sessionId: sessionId(), actor: HOST, principalId: GUEST });
});

Then("the contributor's next publication attempt is refused", function () {
  assert.throws(() => publishAs(GUEST, "diff.show", { view: "board" }, "packages/app/board.ts"),
    (error) => error instanceof EpochCommandError && error.code === "policy-denied");
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

Then("media readiness reports itself provider-disabled while the semantic session still works", function () {
  assert.equal(world.mediaReadiness?.ready, false);
  assert.equal(world.mediaReadiness?.label, "provider-disabled");
  world.port = newSemanticPort();
  world.sessionId = startSession(world.port, ["packages/app/**"]);
  const published = publishAs(HOST, "view.open", { view: "board" }, "packages/app/board.ts");
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
