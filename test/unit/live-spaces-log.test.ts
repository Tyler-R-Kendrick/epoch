import assert from "node:assert/strict";
import {
  createLiveActionCatalog,
  digestOf,
  createLivePresentationPublisher,
  createLiveSpectatorProjection,
  evaluateLiveForkEligibility,
  normalizeLivePublicationPolicy,
  type LiveActionCatalog,
  type LivePresentationEnvelopeV2,
  type LivePresentationPublisher,
  type LivePublicationPolicy,
  type LivePublicationPolicyInput,
} from "@epoch/community-runtime";

/**
 * Presentation log determinism: sequence is the only ordering authority,
 * delay is enforced on an injected monotonic clock, narrowing invalidates the
 * queue, duplicates converge, conflicting duplicates quarantine, gaps recover
 * through checkpoint + delta, and replay is confined to presentation-local
 * effects.
 */
export function runLiveSpacesLogTests(): void {
  captureRefusesUnknownAndUnlistedActions();
  delayedReleaseHonorsClockPauseAndOverflow();
  policyNarrowingInvalidatesQueuedEnvelopes();
  spectatorConvergesThroughDuplicatesGapsAndResync();
  conflictingDuplicatesQuarantine();
  replayDecisionsStayPresentationLocal();
  forkRequiresMaterializableCheckpoint();
  replayManifestReportsHonestCompleteness();
}

function catalogOf(): LiveActionCatalog {
  return createLiveActionCatalog({
    "view.open": { streamSafe: true, replayEffect: "presentation-local" },
    "diff.show": { streamSafe: true, replayEffect: "presentation-local" },
    "theme.set": { streamSafe: true, replayEffect: "presentation-local" },
    "change.merge": { streamSafe: false, replayEffect: "never-replay" },
  });
}

function policyOf(overrides: LivePublicationPolicyInput = {}): LivePublicationPolicy {
  const normalized = normalizeLivePublicationPolicy({
    visibility: "public",
    presentationViewRef: "views/present",
    allowedPathPatterns: ["packages/app/**"],
    allowedActionIds: ["view.open", "diff.show"],
    ...overrides,
  });
  if (normalized.kind !== "valid") throw new Error(`fixture policy invalid: ${normalized.errors.join(", ")}`);
  return normalized.policy;
}

function publisherWith(clock: { now: () => number }, overrides: LivePublicationPolicyInput = {}): LivePresentationPublisher {
  return createLivePresentationPublisher({
    sessionId: "session-1",
    policy: policyOf(overrides),
    catalog: catalogOf(),
    sessionSalt: "salt",
    now: clock.now,
    maxQueuedEnvelopes: 4,
  });
}

function fakeClock(startMs = 0) {
  let now = startMs;
  return { now: () => now, advance: (ms: number) => { now += ms; } };
}

function capture(publisher: LivePresentationPublisher, actionId: string, path?: string) {
  return publisher.capture({
    actorId: "principal-host",
    actionId,
    args: { view: "board" },
    ...(path !== undefined && { path }),
    sourceEventIds: [],
    sourceViewRef: "views/present",
    sourceVerified: true,
  });
}

function captureRefusesUnknownAndUnlistedActions(): void {
  const clock = fakeClock();
  const publisher = publisherWith(clock);
  // Unknown to the catalog → dropped and audited, never silently emitted.
  assert.deepEqual(capture(publisher, "totally.unknown"), { kind: "dropped", reason: "action-not-stream-safe" });
  // Known but privileged → refused by the catalog default.
  assert.deepEqual(capture(publisher, "change.merge"), { kind: "dropped", reason: "action-not-stream-safe" });
  // Case/Unicode disguise of a privileged action does not slip through.
  assert.deepEqual(capture(publisher, "Change.Merge"), { kind: "dropped", reason: "action-not-stream-safe" });
  // Stream-safe in the catalog but absent from the policy allow-list → refused.
  assert.deepEqual(capture(publisher, "theme.set"), { kind: "dropped", reason: "action-not-stream-safe" });
  // Unverified source events are never publishable.
  assert.deepEqual(publisher.capture({
    actorId: "principal-host", actionId: "view.open", args: {},
    sourceEventIds: ["evt-1"], sourceViewRef: "views/present", sourceVerified: false,
  }), { kind: "dropped", reason: "unverified-source" });
  // Denied path → refused even for a stream-safe action.
  assert.deepEqual(capture(publisher, "view.open", "secrets/keys.txt"), { kind: "dropped", reason: "immutable-deny" });
  assert.equal(publisher.quarantined().length, 6);
  assert.equal(publisher.state().sequence, 0);
}

function delayedReleaseHonorsClockPauseAndOverflow(): void {
  const clock = fakeClock();
  const publisher = publisherWith(clock, { publicationDelayMs: 10_000 });
  assert.equal(capture(publisher, "view.open").kind, "queued");
  // Nothing is exposed before the delay expires, whatever the wall clock says.
  assert.equal(publisher.release().length, 0);
  clock.advance(9_999);
  assert.equal(publisher.release().length, 0);
  clock.advance(1);
  const released = publisher.release();
  assert.equal(released.length, 1);
  assert.equal(released[0]?.sequence, 1);
  assert.equal(released[0]?.presentationOffsetMs, 10_000);
  // Pause freezes release at the current sequence; capture continues bounded.
  publisher.pause();
  assert.equal(capture(publisher, "view.open").kind, "queued");
  clock.advance(60_000);
  assert.equal(publisher.release().length, 0);
  publisher.resume();
  assert.equal(publisher.release().length, 1);
  // Queue overflow fails closed and degrades health instead of growing unbounded.
  publisher.pause();
  for (let index = 0; index < 4; index += 1) assert.equal(capture(publisher, "view.open").kind, "queued");
  assert.deepEqual(capture(publisher, "view.open"), { kind: "dropped", reason: "queue-overflow" });
  assert.equal(publisher.state().health, "degraded");
}

function policyNarrowingInvalidatesQueuedEnvelopes(): void {
  const clock = fakeClock();
  const publisher = publisherWith(clock, { publicationDelayMs: 5_000, allowedPathPatterns: ["packages/app/**", "docs/**"] });
  assert.equal(capture(publisher, "view.open", "docs/guide.md").kind, "queued");
  assert.equal(capture(publisher, "view.open", "packages/app/board.ts").kind, "queued");
  // Widening without confirmation is refused outright.
  const widened = publisher.updatePolicy({
    policy: policyOf({ allowedPathPatterns: ["packages/app/**", "docs/**", "test/**"] }),
  });
  assert.equal(widened.kind, "refused");
  // Narrowing applies immediately and invalidates the now-disallowed entry.
  const narrowed = publisher.updatePolicy({ policy: policyOf({ allowedPathPatterns: ["packages/app/**"], publicationDelayMs: 5_000 }) });
  assert.equal(narrowed.kind, "applied");
  if (narrowed.kind === "applied") assert.equal(narrowed.invalidatedQueued, 1);
  clock.advance(5_000);
  const released = publisher.release();
  assert.equal(released.length, 1);
  assert.equal(released[0]?.path, "packages/app/board.ts");
  // The released envelope names the policy digest that sanitized it.
  assert.equal(released[0]?.policyDigest, publisher.state().policyDigest);
  assert.ok(publisher.quarantined().some((entry) => entry.reason === "policy-stale"));
}

interface ReleasedFixture {
  readonly envelopes: readonly LivePresentationEnvelopeV2[];
  readonly publisher: LivePresentationPublisher;
}

function releasedPair(): ReleasedFixture {
  const clock = fakeClock();
  const publisher = publisherWith(clock);
  capture(publisher, "view.open");
  capture(publisher, "diff.show", "packages/app/board.ts");
  capture(publisher, "view.open");
  const envelopes = publisher.release();
  return { envelopes, publisher };
}

function spectatorConvergesThroughDuplicatesGapsAndResync(): void {
  const { envelopes, publisher } = releasedPair();
  assert.equal(envelopes.length, 3);
  const spectator = createLiveSpectatorProjection({ sessionId: "session-1" });
  const [first, second, third] = envelopes;
  if (first === undefined || second === undefined || third === undefined) throw new Error("expected three envelopes");
  assert.deepEqual(spectator.apply(first), { kind: "applied", sequence: 1 });
  // Same-digest duplicate is idempotently ignored.
  assert.deepEqual(spectator.apply(first), { kind: "duplicate", sequence: 1 });
  // Out-of-order arrival reports the gap and holds the envelope.
  assert.deepEqual(spectator.apply(third), { kind: "gap", missingFrom: 2, missingTo: 2 });
  assert.equal(spectator.state().pendingCount, 1);
  // The missing envelope arrives; the pending one drains in order.
  assert.deepEqual(spectator.apply(second), { kind: "applied", sequence: 2 });
  assert.equal(spectator.state().lastSequence, 3);
  assert.deepEqual(spectator.appliedEnvelopes().map((envelope) => envelope.sequence), [1, 2, 3]);

  // A late joiner resyncs from checkpoint + delta instead of full history.
  const checkpoint = publisher.checkpoint();
  capture(publisher, "view.open");
  const delta = publisher.release();
  const lateJoiner = createLiveSpectatorProjection({ sessionId: "session-1" });
  const results = lateJoiner.resyncFrom(checkpoint, delta);
  assert.deepEqual(results, [{ kind: "applied", sequence: 4 }]);
  assert.equal(lateJoiner.state().lastSequence, 4);
  // Envelopes from another session are quarantined, not applied.
  const foreign = createLiveSpectatorProjection({ sessionId: "other-session" });
  assert.deepEqual(foreign.apply(first), { kind: "quarantined", reason: "unverified-source" });
}

function conflictingDuplicatesQuarantine(): void {
  const { envelopes } = releasedPair();
  const first = envelopes[0];
  if (first === undefined) throw new Error("expected an envelope");
  const spectator = createLiveSpectatorProjection({ sessionId: "session-1" });
  spectator.apply(first);
  // A tampered payload with a recomputed digest but the same sequence conflicts.
  const forgedArgs = { view: "somewhere-else" };
  const forged: LivePresentationEnvelopeV2 = {
    ...first,
    args: forgedArgs,
    payloadDigest: digestOf({
      actionId: first.actionId,
      args: forgedArgs,
      path: first.path ?? null,
      sourceEventIds: first.sourceEventIds,
    }),
  };
  assert.deepEqual(spectator.apply(forged), { kind: "quarantined", reason: "sequence-conflict" });
  // A tampered payload without a matching digest fails verification first.
  assert.deepEqual(spectator.apply({ ...first, args: forgedArgs }),
    { kind: "quarantined", reason: "unverified-source" });
  assert.equal(spectator.state().quarantinedCount, 2);
}

function replayDecisionsStayPresentationLocal(): void {
  const { envelopes } = releasedPair();
  const first = envelopes[0];
  if (first === undefined) throw new Error("expected an envelope");
  const spectator = createLiveSpectatorProjection({ sessionId: "session-1" });
  const catalog = catalogOf();
  assert.deepEqual(spectator.replayDecision(first, catalog), { kind: "apply", effect: "presentation-local" });
  // Privileged actions never execute in replay, even if one leaked into a log.
  assert.deepEqual(spectator.replayDecision({ ...first, actionId: "change.merge" }, catalog),
    { kind: "skip", reason: "action-not-stream-safe" });
  assert.deepEqual(spectator.replayDecision({ ...first, actionId: "no.such.action" }, catalog),
    { kind: "skip", reason: "action-not-stream-safe" });
  // The host's theme preferences never override the spectator's own.
  assert.deepEqual(spectator.replayDecision({ ...first, actionId: "theme.set" }, catalog),
    { kind: "skip", reason: "view-preference" });
}

function forkRequiresMaterializableCheckpoint(): void {
  const { publisher } = releasedPair();
  const checkpoint = publisher.checkpoint();
  const context = { hasReadAuthority: true, refVerified: true, objectsAvailable: true, policyPermitsCopy: true };
  const forkable = evaluateLiveForkEligibility(checkpoint, context);
  assert.equal(forkable.kind, "forkable");
  // A media timestamp is not a branch point: no checkpoint, no fork.
  const noCheckpoint = evaluateLiveForkEligibility(undefined, context);
  assert.equal(noCheckpoint.kind, "refused");
  if (noCheckpoint.kind === "refused") assert.match(noCheckpoint.reason, /media timestamp/u);
  assert.equal(evaluateLiveForkEligibility(checkpoint, { ...context, hasReadAuthority: false }).kind, "refused");
  assert.equal(evaluateLiveForkEligibility(checkpoint, { ...context, refVerified: false }).kind, "refused");
  assert.equal(evaluateLiveForkEligibility(checkpoint, { ...context, objectsAvailable: false }).kind, "refused");
  assert.equal(evaluateLiveForkEligibility(checkpoint, { ...context, policyPermitsCopy: false }).kind, "refused");
}

function replayManifestReportsHonestCompleteness(): void {
  const { publisher, envelopes } = releasedPair();
  publisher.checkpoint();
  const manifest = publisher.buildReplayManifest("semantic-only");
  assert.equal(manifest.sessionId, "session-1");
  assert.equal(manifest.completeness, "semantic-only");
  assert.equal(manifest.presentationEventIds.length, envelopes.length);
  assert.equal(manifest.checkpointIds.length, 1);
  assert.deepEqual(manifest.policyDigests, [publisher.state().policyDigest]);
  // The manifest head is deterministic for the same released set.
  assert.equal(publisher.buildReplayManifest("semantic-only").presentationLogHead, manifest.presentationLogHead);
}
