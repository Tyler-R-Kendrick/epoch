/**
 * Moderation, operations health, and telemetry — three things a Live Space
 * owes people who are not the host.
 *
 * They share one rule, which is why they share a file: none of them may
 * overstate what the system did. A moderation action that reads as "handled"
 * when bytes are already public is worse than no action at all, because the
 * responder stops looking for the copies. An operations panel that reports a
 * provider as fine when it is disabled sends someone to debug the wrong
 * layer. And telemetry that quietly carries a path or an argument turns a
 * privacy promise into a leak with a dashboard attached.
 */

/** What a responder can actually ask for. */
export const LIVE_MODERATION_ACTIONS = ["pause", "revokeParticipant", "endSession", "quarantineAction"] as const;
export type LiveModerationAction = typeof LIVE_MODERATION_ACTIONS[number];

export interface LiveModerationInput {
  readonly action: LiveModerationAction;
  readonly lifecycle: string;
  /** Sequence already released to an audience. Anything at or below it is public. */
  readonly releasedThroughSequence: number;
  readonly sealed: boolean;
}

export interface LiveModerationOutcome {
  readonly action: LiveModerationAction;
  /** What this action actually changed, in the operator's words. */
  readonly effects: readonly string[];
  /**
   * What it did not and cannot change. Never empty once anything has been
   * released: that is the whole point of stating it.
   */
  readonly cannotUndo: readonly string[];
  readonly releasedThroughSequence: number;
  readonly applied: boolean;
}

const FUTURE_EFFECT = {
  pause: "release is held at the current sequence; nothing new reaches the audience",
  revokeParticipant: "the participant's grant ends; their future publishes and media are denied",
  endSession: "release stops and no further joins are accepted",
  quarantineAction: "the action id is denied for the rest of the session",
} satisfies Record<LiveModerationAction, string>;

/**
 * Decide what a moderation action achieves, and say plainly what it does not.
 *
 * Every action here is forward-looking. None of them reaches an audience's
 * machine, and the outcome says so in the same breath as the effect rather
 * than in a footnote a responder can skip.
 */
export function evaluateLiveModeration(input: LiveModerationInput): LiveModerationOutcome {
  const released = Math.max(0, Math.trunc(input.releasedThroughSequence));
  const cannotUndo: string[] = [];

  if (released > 0) {
    cannotUndo.push(
      `${released} released envelope(s) are already public; spectators may hold copies and they cannot be recalled`,
    );
  }
  if (input.sealed) {
    cannotUndo.push("the replay manifest is sealed; its contents are immutable evidence and are not edited by moderation");
  }

  // A sealed session has no future to restrain, so the only honest answer is
  // that the action changed nothing — not that it succeeded quietly.
  const applied = !input.sealed && !(input.lifecycle === "ended" && input.action === "pause");
  const effects = applied
    ? [FUTURE_EFFECT[input.action]]
    : [];
  if (!applied) {
    cannotUndo.push(
      input.sealed
        ? "a sealed session cannot be paused, revoked from, or ended: there is nothing further to restrain"
        : "the session has already ended; pausing it changes nothing",
    );
  }

  return {
    action: input.action,
    effects,
    cannotUndo,
    releasedThroughSequence: released,
    applied,
  };
}

// ------------------------------------------------------- operations health

export interface LiveOperationsInput {
  readonly sessionId: string;
  readonly lifecycle: string;
  readonly health: "live" | "degraded";
  readonly releasedThroughSequence: number;
  readonly quarantinedCount: number;
  /** Provider labels exactly as the provider declared them. Never inferred. */
  readonly mediaLabel: string;
  readonly captionLabel: string;
}

export interface LiveOperationsProjection {
  readonly sessionId: string;
  readonly lifecycle: string;
  readonly releasedThroughSequence: number;
  readonly quarantinedCount: number;
  readonly mediaLabel: string;
  readonly captionLabel: string;
  /** The worst component's standing, so a green overall can never hide a red part. */
  readonly overall: string;
  readonly attention: readonly string[];
}

/** Worst-first: the overall label is the least reassuring component. */
const LABEL_SEVERITY = new Map([
  ["unavailable", 4],
  ["degraded", 3],
  ["provider-disabled", 2],
  ["experimental", 1],
  ["production", 0],
]);

function severityOf(label: string): number {
  // A label this projection does not recognise is treated as the worst case.
  // Guessing "probably fine" about an unknown provider state is how an
  // operations panel starts lying.
  return LABEL_SEVERITY.get(label) ?? 4;
}

/**
 * Project one session's operational standing.
 *
 * Deliberately carries no principal ids, paths, action arguments, or
 * credentials: an operations projection is delivered to browsers, and the
 * fastest way to leak a session's content is to put it on a dashboard.
 */
export function projectLiveOperations(input: LiveOperationsInput): LiveOperationsProjection {
  const candidates = [
    input.health === "degraded" ? "degraded" : "production",
    input.mediaLabel,
    input.captionLabel,
  ];
  const overall = candidates.reduce((worst, label) => severityOf(label) > severityOf(worst) ? label : worst, "production");

  const attention: string[] = [];
  if (input.health === "degraded") attention.push("presentation transport is degraded");
  if (input.quarantinedCount > 0) {
    attention.push(`${input.quarantinedCount} capture(s) were refused before release`);
  }
  if (severityOf(input.mediaLabel) > 0) attention.push(`media: ${input.mediaLabel}`);
  if (severityOf(input.captionLabel) > 0) attention.push(`captions: ${input.captionLabel}`);

  return {
    sessionId: input.sessionId,
    lifecycle: input.lifecycle,
    releasedThroughSequence: Math.max(0, Math.trunc(input.releasedThroughSequence)),
    quarantinedCount: Math.max(0, Math.trunc(input.quarantinedCount)),
    mediaLabel: input.mediaLabel,
    captionLabel: input.captionLabel,
    overall,
    attention,
  };
}

// ------------------------------------------------------------- telemetry

export interface LiveTelemetryInput {
  readonly lifecycle: string;
  readonly releasedCount: number;
  readonly quarantinedCount: number;
  readonly participantCount: number;
  readonly gapCount: number;
  readonly mediaLabel: string;
}

/**
 * Counts and declared labels. Nothing else, by construction.
 *
 * The fields are enumerated rather than copied from a session, so adding a
 * field to a session can never widen telemetry by accident — which is exactly
 * how content ends up in an analytics pipeline nobody audits.
 */
export interface LiveTelemetryRecord {
  readonly kind: "live.session";
  readonly lifecycle: string;
  readonly releasedCount: number;
  readonly quarantinedCount: number;
  readonly participantCount: number;
  readonly gapCount: number;
  readonly mediaLabel: string;
}

function counted(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

/**
 * Build the one telemetry shape this feature emits.
 *
 * There is no session id here on purpose. A session id plus a timestamp is a
 * re-identifier: it links a person's activity across records that were
 * supposed to be aggregate. Counts answer "is the feature working" without
 * answering "what did that person do".
 */
export function liveTelemetryRecord(input: LiveTelemetryInput): LiveTelemetryRecord {
  return {
    kind: "live.session",
    lifecycle: input.lifecycle,
    releasedCount: counted(input.releasedCount),
    quarantinedCount: counted(input.quarantinedCount),
    participantCount: counted(input.participantCount),
    gapCount: counted(input.gapCount),
    mediaLabel: input.mediaLabel,
  };
}
