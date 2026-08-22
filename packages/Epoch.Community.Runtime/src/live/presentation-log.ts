import { digestOf, identifier } from "../digest";
import { isSpectatorViewPreference } from "../stream-policy";
import {
  classifyLivePolicyChange,
  livePolicyDigest,
  type LivePolicyChange,
  type LivePresentationCheckpoint,
  type LivePresentationEnvelopeV2,
  type LivePublicationPolicy,
  type LiveReplayCompleteness,
  type LiveReplayManifest,
} from "./contracts";
import {
  evaluateLivePath,
  sanitizeLiveArgs,
  type LiveRewriteRule,
  type LiveSanitizeReason,
} from "./publication-policy";
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };


/**
 * The deterministic presentation publisher and spectator projection.
 *
 * Sequence is the only ordering authority. Wall clocks are informational,
 * media time is never canonical, and the delayed queue holds *source
 * references*, re-sanitized against the policy in force at release — a
 * narrowed policy therefore retroactively invalidates queued-but-unreleased
 * envelopes without touching anything already released.
 */

export type LiveReplayEffect = "presentation-local" | "read-only-query" | "never-replay";

export interface LiveActionPolicy {
  readonly streamSafe: boolean;
  readonly replayEffect: LiveReplayEffect;
}

export interface LiveActionCatalog {
  policyFor(actionId: string): LiveActionPolicy;
  readonly streamSafeActionIds: readonly string[];
}

const UNKNOWN_ACTION: LiveActionPolicy = Object.freeze({ streamSafe: false, replayEffect: "never-replay" });

/** Default is deny: an action absent from the catalog is never stream-safe. */
export function createLiveActionCatalog(entries: Readonly<Record<string, LiveActionPolicy>>): LiveActionCatalog {
  const catalog = new Map<string, LiveActionPolicy>();
  for (const [actionId, policy] of Object.entries(entries)) {
    catalog.set(actionId.normalize("NFKC"), Object.freeze({ ...policy }));
  }
  return {
    policyFor(actionId: string): LiveActionPolicy {
      return catalog.get(actionId.normalize("NFKC")) ?? UNKNOWN_ACTION;
    },
    get streamSafeActionIds(): readonly string[] {
      return [...catalog.entries()].filter(([, policy]) => policy.streamSafe).map(([actionId]) => actionId).sort();
    },
  };
}

// ------------------------------------------------------------------ publisher

export interface LiveCaptureInput {
  readonly actorId: string;
  readonly actionId: string;
  readonly args: Readonly<Record<string, DictionaryValue>>;
  readonly path?: string;
  readonly sourceEventIds: readonly string[];
  readonly sourceViewRef: string;
  /** The caller attests these source events verified against signed history. */
  readonly sourceVerified: boolean;
  readonly protectedInput?: boolean;
}

export type LiveCaptureDecision =
  | { readonly kind: "queued"; readonly queuedAtMs: number }
  | { readonly kind: "dropped"; readonly reason: LiveSanitizeReason };

export interface LiveQuarantineEntry {
  readonly reason: LiveSanitizeReason;
  readonly actionId: string;
  readonly stage: "capture" | "release" | "apply";
}

export interface LivePublisherState {
  readonly sequence: number;
  readonly queuedCount: number;
  readonly releasedCount: number;
  readonly paused: boolean;
  readonly health: "live" | "degraded";
  readonly policyDigest: string;
}

export interface LivePublisherOptions {
  readonly sessionId: string;
  readonly policy: LivePublicationPolicy;
  readonly catalog: LiveActionCatalog;
  readonly sessionSalt: string;
  readonly rewriteRules?: readonly LiveRewriteRule[];
  /** Monotonic milliseconds. Injected so delay behavior is testable and clock manipulation cannot bypass release. */
  readonly now: () => number;
  readonly maxQueuedEnvelopes?: number;
}

export type LivePolicyUpdateResult =
  | { readonly kind: "applied"; readonly change: LivePolicyChange; readonly policyDigest: string; readonly invalidatedQueued: number }
  | { readonly kind: "refused"; readonly change: LivePolicyChange; readonly reason: string };

export interface LivePresentationPublisher {
  capture(input: LiveCaptureInput): LiveCaptureDecision;
  /** Release every due envelope, re-sanitized against the current policy. */
  release(): readonly LivePresentationEnvelopeV2[];
  pause(): void;
  resume(): void;
  updatePolicy(input: { readonly policy: LivePublicationPolicy; readonly confirmed?: boolean }): LivePolicyUpdateResult;
  checkpoint(): LivePresentationCheckpoint;
  buildReplayManifest(completeness: LiveReplayCompleteness): LiveReplayManifest;
  releasedEnvelopes(): readonly LivePresentationEnvelopeV2[];
  quarantined(): readonly LiveQuarantineEntry[];
  state(): LivePublisherState;
}

interface QueuedCapture {
  readonly input: LiveCaptureInput;
  readonly queuedAtMs: number;
  readonly policyDigestAtCapture: string;
}

const DEFAULT_MAX_QUEUE = 2_048;

export function createLivePresentationPublisher(options: LivePublisherOptions): LivePresentationPublisher {
  const startedAtMs = options.now();
  const maxQueue = options.maxQueuedEnvelopes ?? DEFAULT_MAX_QUEUE;
  let policy = options.policy;
  let policyDigest = livePolicyDigest(policy);
  const rewriteRules: readonly LiveRewriteRule[] = options.rewriteRules ?? [];
  let paused = false;
  let degraded = false;
  let sequence = 0;
  const queue: QueuedCapture[] = [];
  const released: LivePresentationEnvelopeV2[] = [];
  const checkpoints: LivePresentationCheckpoint[] = [];
  const quarantine: LiveQuarantineEntry[] = [];

  function evaluate(input: LiveCaptureInput): { readonly kind: "ok"; readonly args: Readonly<Record<string, DictionaryValue>> } | { readonly kind: "fail"; readonly reason: LiveSanitizeReason } {
    if (input.sourceVerified !== true) return { kind: "fail", reason: "unverified-source" };
    const normalizedAction = input.actionId.normalize("NFKC");
    if (!options.catalog.policyFor(normalizedAction).streamSafe) {
      return { kind: "fail", reason: "action-not-stream-safe" };
    }
    if (!policy.allowedActionIds.includes(normalizedAction)) {
      return { kind: "fail", reason: "action-not-stream-safe" };
    }
    if (input.path !== undefined) {
      const pathDecision = evaluateLivePath(input.path, policy);
      if (pathDecision.kind === "deny") return { kind: "fail", reason: pathDecision.reason };
    }
    const decision = sanitizeLiveArgs(input.args, {
      policy,
      rewriteRules,
      sessionSalt: options.sessionSalt,
      ...(input.protectedInput === true && { protectedInput: true }),
    });
    if (decision.kind !== "emit") return { kind: "fail", reason: decision.reason };
    return { kind: "ok", args: decision.args };
  }

  function record(reason: LiveSanitizeReason, actionId: string, stage: LiveQuarantineEntry["stage"]): void {
    if (quarantine.length < DEFAULT_MAX_QUEUE) quarantine.push({ reason, actionId, stage });
  }

  return {
    capture(input: LiveCaptureInput): LiveCaptureDecision {
      if (queue.length >= maxQueue) {
        degraded = true;
        record("queue-overflow", input.actionId, "capture");
        return { kind: "dropped", reason: "queue-overflow" };
      }
      const evaluated = evaluate(input);
      if (evaluated.kind === "fail") {
        record(evaluated.reason, input.actionId, "capture");
        return { kind: "dropped", reason: evaluated.reason };
      }
      const queuedAtMs = options.now();
      queue.push({ input, queuedAtMs, policyDigestAtCapture: policyDigest });
      return { kind: "queued", queuedAtMs };
    },

    release(): readonly LivePresentationEnvelopeV2[] {
      if (paused) return [];
      const nowMs = options.now();
      const releasedNow: LivePresentationEnvelopeV2[] = [];
      while (queue.length > 0) {
        const head = queue[0];
        if (head === undefined || head.queuedAtMs + policy.publicationDelayMs > nowMs) break;
        queue.shift();
        const evaluated = evaluate(head.input);
        if (evaluated.kind === "fail") {
          const reason = head.policyDigestAtCapture === policyDigest ? evaluated.reason : "policy-stale";
          record(reason, head.input.actionId, "release");
          continue;
        }
        sequence += 1;
        const payloadDigest = digestOf({
          actionId: head.input.actionId,
          args: evaluated.args,
          path: head.input.path ?? null,
          sourceEventIds: head.input.sourceEventIds,
        });
        const envelope: LivePresentationEnvelopeV2 = {
          schemaVersion: 2,
          sessionId: options.sessionId,
          sequence,
          actorId: head.input.actorId,
          actionId: head.input.actionId.normalize("NFKC"),
          args: evaluated.args,
          ...(head.input.path !== undefined && { path: head.input.path }),
          sourceEventIds: head.input.sourceEventIds,
          sourceViewRef: head.input.sourceViewRef,
          policyDigest,
          presentationOffsetMs: Math.max(0, nowMs - startedAtMs),
          payloadDigest,
          liveEventId: identifier("liveevt", { sessionId: options.sessionId, sequence, payloadDigest }),
        };
        released.push(envelope);
        releasedNow.push(envelope);
      }
      return Object.freeze(releasedNow);
    },

    pause(): void { paused = true; },
    resume(): void { paused = false; },

    updatePolicy(input: { readonly policy: LivePublicationPolicy; readonly confirmed?: boolean }): LivePolicyUpdateResult {
      const change = classifyLivePolicyChange(policy, input.policy);
      if ((change === "widening" || change === "mixed") && input.confirmed !== true) {
        return { kind: "refused", change, reason: "policy widening requires explicit confirmation and refreshed consent" };
      }
      policy = input.policy;
      policyDigest = livePolicyDigest(policy);
      let invalidatedQueued = 0;
      if (change === "narrowing" || change === "mixed") {
        for (let index = queue.length - 1; index >= 0; index -= 1) {
          const entry = queue[index];
          if (entry === undefined) continue;
          const evaluated = evaluate(entry.input);
          if (evaluated.kind === "fail") {
            queue.splice(index, 1);
            invalidatedQueued += 1;
            record("policy-stale", entry.input.actionId, "release");
          }
        }
      }
      return { kind: "applied", change, policyDigest, invalidatedQueued };
    },

    checkpoint(): LivePresentationCheckpoint {
      const head = digestOf(released.map((envelope) => envelope.liveEventId));
      const checkpoint: LivePresentationCheckpoint = {
        schemaVersion: 1,
        sessionId: options.sessionId,
        checkpointId: identifier("livechk", { sessionId: options.sessionId, sequence, head }),
        sequence,
        presentationLogHead: head,
        sourceViewRef: policy.presentationViewRef,
        policyDigest,
        presentationOffsetMs: Math.max(0, options.now() - startedAtMs),
      };
      checkpoints.push(checkpoint);
      return checkpoint;
    },

    buildReplayManifest(completeness: LiveReplayCompleteness): LiveReplayManifest {
      const head = digestOf(released.map((envelope) => envelope.liveEventId));
      return {
        schemaVersion: 1,
        replayId: identifier("livereplay", { sessionId: options.sessionId, head }),
        sessionId: options.sessionId,
        presentationLogHead: head,
        presentationEventIds: released.map((envelope) => envelope.liveEventId),
        checkpointIds: checkpoints.map((checkpoint) => checkpoint.checkpointId),
        policyDigests: [...new Set(released.map((envelope) => envelope.policyDigest))],
        completeness,
      };
    },

    releasedEnvelopes(): readonly LivePresentationEnvelopeV2[] { return [...released]; },
    quarantined(): readonly LiveQuarantineEntry[] { return [...quarantine]; },

    state(): LivePublisherState {
      return {
        sequence,
        queuedCount: queue.length,
        releasedCount: released.length,
        paused,
        health: degraded ? "degraded" : "live",
        policyDigest,
      };
    },
  };
}

// -------------------------------------------------------- spectator projection

export type LiveApplyResult =
  | { readonly kind: "applied"; readonly sequence: number }
  | { readonly kind: "duplicate"; readonly sequence: number }
  | { readonly kind: "quarantined"; readonly reason: LiveSanitizeReason }
  | { readonly kind: "gap"; readonly missingFrom: number; readonly missingTo: number };

export type LiveReplayDecision =
  | { readonly kind: "apply"; readonly effect: LiveReplayEffect }
  | { readonly kind: "skip"; readonly reason: string };

export interface LiveSpectatorState {
  readonly lastSequence: number;
  readonly appliedCount: number;
  readonly pendingCount: number;
  readonly quarantinedCount: number;
}

export interface LiveSpectatorProjection {
  apply(envelope: LivePresentationEnvelopeV2): LiveApplyResult;
  /** Late join / gap recovery: adopt a checkpoint, then apply deltas. */
  resyncFrom(checkpoint: LivePresentationCheckpoint, envelopes: readonly LivePresentationEnvelopeV2[]): readonly LiveApplyResult[];
  replayDecision(envelope: LivePresentationEnvelopeV2, catalog: LiveActionCatalog): LiveReplayDecision;
  appliedEnvelopes(): readonly LivePresentationEnvelopeV2[];
  state(): LiveSpectatorState;
}

export function createLiveSpectatorProjection(options: { readonly sessionId: string }): LiveSpectatorProjection {
  let lastSequence = 0;
  const applied: LivePresentationEnvelopeV2[] = [];
  const digestBySequence = new Map<number, string>();
  const pending = new Map<number, LivePresentationEnvelopeV2>();
  let quarantinedCount = 0;

  function verify(envelope: LivePresentationEnvelopeV2): LiveSanitizeReason | undefined {
    if (envelope.schemaVersion !== 2) return "schema-invalid";
    if (envelope.sessionId !== options.sessionId) return "unverified-source";
    const expected = digestOf({
      actionId: envelope.actionId,
      args: envelope.args,
      path: envelope.path ?? null,
      sourceEventIds: envelope.sourceEventIds,
    });
    if (expected !== envelope.payloadDigest) return "unverified-source";
    return undefined;
  }

  function applyOne(envelope: LivePresentationEnvelopeV2): LiveApplyResult {
    const invalid = verify(envelope);
    if (invalid !== undefined) {
      quarantinedCount += 1;
      return { kind: "quarantined", reason: invalid };
    }
    if (envelope.sequence <= lastSequence) {
      const known = digestBySequence.get(envelope.sequence);
      if (known === envelope.payloadDigest) return { kind: "duplicate", sequence: envelope.sequence };
      quarantinedCount += 1;
      return { kind: "quarantined", reason: "sequence-conflict" };
    }
    if (envelope.sequence > lastSequence + 1) {
      pending.set(envelope.sequence, envelope);
      return { kind: "gap", missingFrom: lastSequence + 1, missingTo: envelope.sequence - 1 };
    }
    lastSequence = envelope.sequence;
    applied.push(envelope);
    digestBySequence.set(envelope.sequence, envelope.payloadDigest);
    return { kind: "applied", sequence: envelope.sequence };
  }

  function drainPending(): void {
    let next = pending.get(lastSequence + 1);
    while (next !== undefined) {
      pending.delete(next.sequence);
      applyOne(next);
      next = pending.get(lastSequence + 1);
    }
  }

  return {
    apply(envelope: LivePresentationEnvelopeV2): LiveApplyResult {
      const result = applyOne(envelope);
      if (result.kind === "applied") drainPending();
      return result;
    },

    resyncFrom(checkpoint: LivePresentationCheckpoint, envelopes: readonly LivePresentationEnvelopeV2[]): readonly LiveApplyResult[] {
      if (checkpoint.sessionId === options.sessionId && checkpoint.sequence >= lastSequence) {
        lastSequence = checkpoint.sequence;
      }
      const results = envelopes.map((envelope) => applyOne(envelope));
      drainPending();
      return Object.freeze(results);
    },

    /**
     * Replay is confined to the spectator's disposable presentation
     * projection. Unknown and privileged actions never execute; the host's
     * theme and view preferences never override the spectator's own.
     */
    replayDecision(envelope: LivePresentationEnvelopeV2, catalog: LiveActionCatalog): LiveReplayDecision {
      if (isSpectatorViewPreference(envelope.actionId)) return { kind: "skip", reason: "view-preference" };
      const actionPolicy = catalog.policyFor(envelope.actionId);
      if (!actionPolicy.streamSafe || actionPolicy.replayEffect === "never-replay") {
        return { kind: "skip", reason: "action-not-stream-safe" };
      }
      return { kind: "apply", effect: actionPolicy.replayEffect };
    },

    appliedEnvelopes(): readonly LivePresentationEnvelopeV2[] { return [...applied]; },

    state(): LiveSpectatorState {
      return {
        lastSequence,
        appliedCount: applied.length,
        pendingCount: pending.size,
        quarantinedCount,
      };
    },
  };
}

// ----------------------------------------------------------------------- fork

export interface LiveForkContext {
  readonly hasReadAuthority: boolean;
  readonly refVerified: boolean;
  readonly objectsAvailable: boolean;
  readonly policyPermitsCopy: boolean;
}

export type LiveForkEligibility =
  | { readonly kind: "forkable"; readonly checkpointId: string; readonly sourceViewRef: string }
  | { readonly kind: "refused"; readonly reason: string };

/**
 * A fork point is a verified presentation checkpoint, never a media timestamp
 * or a UI navigation state. Every refusal names its reason without revealing
 * unauthorized state.
 */
export function evaluateLiveForkEligibility(
  checkpoint: LivePresentationCheckpoint | undefined,
  context: LiveForkContext,
): LiveForkEligibility {
  if (checkpoint === undefined) return { kind: "refused", reason: "no checkpoint at that point; a media timestamp is not a branch point" };
  if (!context.refVerified) return { kind: "refused", reason: "checkpoint view/ref did not verify" };
  if (!context.hasReadAuthority) return { kind: "refused", reason: "caller lacks read authority for the checkpoint state" };
  if (!context.objectsAvailable) return { kind: "refused", reason: "checkpoint state is not resident and no honest provider can hydrate it" };
  if (!context.policyPermitsCopy) return { kind: "refused", reason: "publication policy does not permit copying this state" };
  return { kind: "forkable", checkpointId: checkpoint.checkpointId, sourceViewRef: checkpoint.sourceViewRef };
}
