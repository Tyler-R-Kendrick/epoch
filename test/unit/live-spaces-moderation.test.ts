import assert from "node:assert/strict";
import {
  createCommunityRuntime,
  createLiveSpaceCommandExtensions,
  createLocalLiveSpacePort,
  evaluateLiveModeration,
  liveTelemetryRecord,
  projectLiveOperations,
  type CommunityRuntime,
  type LiveSessionSnapshot,
  type LiveSpaceApplicationPort,
} from "@epoch/community-runtime";

/**
 * Three surfaces, one rule: none of them may overstate what the system did.
 *
 * A moderation action that reads as "handled" while bytes are already public
 * is worse than no action, because the responder stops chasing copies. An
 * operations panel that reports green while a provider is disabled sends
 * someone to debug the wrong layer. Telemetry that quietly carries a path
 * turns a privacy promise into a leak with a dashboard attached.
 */

const HOST = "principal-host";
const SECRET = "sk-live-must-never-appear";

function portOf(): LiveSpaceApplicationPort {
  let now = 0;
  return createLocalLiveSpacePort({
    now: () => { now += 10; return now; },
    sessionSalt: "moderation-entropy",
    resolveSpace: (spaceId) => spaceId === "space-1" ? { viewRef: "views/present" } : undefined,
  });
}

function runtimeWith(port: LiveSpaceApplicationPort): CommunityRuntime {
  return createCommunityRuntime({
    namespace: "test",
    actor: HOST,
    policies: { capabilities: ["*"] },
    now: () => "2026-08-22T00:00:00.000Z",
    extensions: createLiveSpaceCommandExtensions(port, () => HOST),
  });
}

/**
 * The central claim. Once anything is released, every moderation outcome must
 * say what cannot be undone — in the same breath as what it achieved.
 */
function moderationNeverClaimsToRecallPublishedBytes(): void {
  for (const action of ["pause", "revokeParticipant", "endSession", "quarantineAction"] as const) {
    const outcome = evaluateLiveModeration({
      action, lifecycle: "live", releasedThroughSequence: 7, sealed: false,
    });
    assert.equal(outcome.applied, true, `${action} applies to a live session`);
    assert.equal(outcome.effects.length, 1, `${action} states what it changed`);
    assert.ok(outcome.cannotUndo.length > 0, `${action} must state what it cannot undo`);
    assert.match(outcome.cannotUndo.join(" "), /cannot be recalled/u);
    assert.match(outcome.cannotUndo.join(" "), /7 released envelope/u, "the count is named, not implied");
  }
}

/** Before anything is released there is nothing to disclaim, and it says so. */
function anUnreleasedSessionHasNothingToDisclaim(): void {
  const outcome = evaluateLiveModeration({
    action: "pause", lifecycle: "lobby", releasedThroughSequence: 0, sealed: false,
  });
  assert.equal(outcome.applied, true);
  assert.deepEqual(outcome.cannotUndo, [], "nothing public means nothing to warn about");
}

/** A sealed session cannot be restrained, and "no effect" is the honest answer. */
function moderatingASealedSessionReportsNoEffect(): void {
  const outcome = evaluateLiveModeration({
    action: "endSession", lifecycle: "sealed", releasedThroughSequence: 3, sealed: true,
  });
  assert.equal(outcome.applied, false, "there is nothing further to restrain");
  assert.deepEqual(outcome.effects, [], "an action that changed nothing claims nothing");
  assert.match(outcome.cannotUndo.join(" "), /sealed/u);
  assert.match(outcome.cannotUndo.join(" "), /immutable evidence/u);
}

/** The overall label is the worst component, so green can never hide red. */
function operationsHealthTakesTheWorstComponent(): void {
  const healthy = projectLiveOperations({
    sessionId: "live-1", lifecycle: "live", health: "live",
    releasedThroughSequence: 4, quarantinedCount: 0,
    mediaLabel: "production", captionLabel: "production",
  });
  assert.equal(healthy.overall, "production");
  assert.deepEqual(healthy.attention, []);

  const disabled = projectLiveOperations({
    sessionId: "live-1", lifecycle: "live", health: "live",
    releasedThroughSequence: 4, quarantinedCount: 2,
    mediaLabel: "provider-disabled", captionLabel: "production",
  });
  assert.equal(disabled.overall, "provider-disabled", "a disabled provider is not a green session");
  assert.match(disabled.attention.join(" "), /2 capture\(s\) were refused/u);

  const degraded = projectLiveOperations({
    sessionId: "live-1", lifecycle: "live", health: "degraded",
    releasedThroughSequence: 4, quarantinedCount: 0,
    mediaLabel: "production", captionLabel: "unavailable",
  });
  assert.equal(degraded.overall, "unavailable", "the least reassuring component wins");

  // An unrecognised label is treated as the worst case rather than assumed fine.
  const unknown = projectLiveOperations({
    sessionId: "live-1", lifecycle: "live", health: "live",
    releasedThroughSequence: 0, quarantinedCount: 0,
    mediaLabel: "brand-new-state", captionLabel: "production",
  });
  assert.equal(unknown.overall, "brand-new-state", "an unknown provider state is not silently green");
}

/**
 * The proof that matters: run a session whose arguments and paths contain a
 * secret, then assert the telemetry record cannot carry any of it.
 */
async function telemetryCarriesCountsAndNeverContent(): Promise<void> {
  const runtime = runtimeWith(portOf());
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
  // A capture carrying a secret: refused before release, and counted.
  await runtime.commands.execute({
    kind: "live.presentation.publish",
    input: { sessionId, actionId: "view.open", args: { config: { apiKey: SECRET } } },
  });

  const operations = await runtime.commands.execute<{
    projection: { readonly overall: string; readonly quarantinedCount: number; readonly attention: readonly string[] };
    telemetry: { readonly kind: string; readonly releasedCount: number; readonly quarantinedCount: number };
  }>({ kind: "live.session.operations", input: { sessionId } });

  assert.equal(operations.data.telemetry.kind, "live.session");
  assert.equal(operations.data.telemetry.releasedCount, 1);
  assert.equal(operations.data.telemetry.quarantinedCount, 1);
  assert.equal(operations.data.projection.quarantinedCount, 1);
  // No media provider is wired into the in-process port, and it says so.
  assert.equal(operations.data.projection.overall, "provider-disabled");

  const serialized = JSON.stringify(operations.data);
  assert.equal(serialized.includes(SECRET), false, "a secret must never reach an operations payload");
  assert.equal(serialized.includes("board.ts"), false, "paths are content and do not belong in telemetry");
  assert.equal(serialized.includes(HOST), false, "a principal id would re-identify aggregate counters");
}

/** The record shape is enumerated, so a wider session cannot widen telemetry. */
function telemetryCarriesNoIdentifiers(): void {
  const record = liveTelemetryRecord({
    lifecycle: "live", releasedCount: 3.7, quarantinedCount: -2,
    participantCount: 4, gapCount: Number.NaN, mediaLabel: "provider-disabled",
  });
  assert.deepEqual(Object.keys(record).sort(), [
    "gapCount", "kind", "lifecycle", "mediaLabel", "participantCount", "quarantinedCount", "releasedCount",
  ]);
  assert.equal(record.releasedCount, 3, "counts are whole");
  assert.equal(record.quarantinedCount, 0, "and never negative");
  assert.equal(record.gapCount, 0, "a non-finite count is zero, not NaN in a dashboard");
}

/** A report tells the reporter what nothing can do, not just that it was filed. */
async function aReportStatesWhatCannotBeUndone(): Promise<void> {
  const runtime = runtimeWith(portOf());
  const created = await runtime.commands.execute<LiveSessionSnapshot>({
    kind: "live.session.create",
    input: {
      spaceId: "space-1",
      policy: {
        visibility: "community", presentationViewRef: "views/present",
        allowedPathPatterns: ["packages/app/**"], allowedActionIds: ["view.open"],
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

  const report = await runtime.commands.execute<{
    reportId: string; recorded: boolean;
    releasedThroughSequence: number; cannotUndo: readonly string[];
  }>({ kind: "live.moderation.report", input: { sessionId, reason: "leaked a customer name" } });

  assert.equal(report.data.recorded, true);
  assert.equal(report.data.releasedThroughSequence, 1);
  assert.ok(report.data.cannotUndo.length > 0, "a report must not read as though the bytes were pulled back");
  assert.match(report.data.cannotUndo.join(" "), /cannot be recalled/u);
}

export async function runLiveSpacesModerationTests(): Promise<void> {
  moderationNeverClaimsToRecallPublishedBytes();
  anUnreleasedSessionHasNothingToDisclaim();
  moderatingASealedSessionReportsNoEffect();
  operationsHealthTakesTheWorstComponent();
  await telemetryCarriesCountsAndNeverContent();
  telemetryCarriesNoIdentifiers();
  await aReportStatesWhatCannotBeUndone();
  console.log("Live Spaces moderation, operations and telemetry tests passed");
}
