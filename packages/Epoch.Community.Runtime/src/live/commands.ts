import { identifier } from "../digest";
import { EpochCommandError, validationReceipt } from "../receipts";
import type {
  EpochCommandContext,
  EpochCommandDescriptor,
  EpochCommandExtension,
  EpochCommandOutcome,
  JsonSchema,
} from "../commands";
import {
  isLiveConsentScope,
  isLiveLifecycleCommand,
  nextLiveLifecycle,
  normalizeLivePublicationPolicy,
  type LiveConsentScope,
  type LiveLifecycleCommand,
  type LivePresentationCheckpoint,
  type LivePublicationPolicy,
  type LivePublicationPolicyInput,
  type LiveReplayCompleteness,
  type LiveReplayManifest,
  type LiveSessionLifecycle,
} from "./contracts";
import { runLivePreflight, type LivePreflightReport } from "./publication-policy";
import {
  createLiveActionCatalog,
  createLivePresentationPublisher,
  evaluateLiveForkEligibility,
  type LiveActionCatalog,
  type LiveCaptureDecision,
  type LivePresentationPublisher,
} from "./presentation-log";
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };
function __epochIsString<T>(value: T): value is T & string { return typeof value === "string"; }
function __epochIsNumber<T>(value: T): value is T & number { return typeof value === "number"; }


/**
 * Live Space commands on the shared bus.
 *
 * Every surface — UI, prompt, WebMCP, CLI, SDK — reaches the same
 * `LiveSpaceApplicationPort` through the same descriptors, capability checks,
 * confirmation rules, and receipts. Adapters translate argument shapes only;
 * the port owns the domain rules; nothing mutates around it.
 */

export type LiveParticipantRole = "owner" | "cohost" | "collaborator" | "agent" | "observer";

export type LiveMediaPublishSource = "microphone" | "camera" | "screen-share" | "screen-share-audio";

/**
 * The server-side media seam.
 *
 * This package stays browser-safe, so it declares what it needs from a media
 * provider and nothing about how that provider works. A server package
 * implements this over the real SDK; a browser bundle that never receives one
 * gets an honest `unavailable` receipt instead of a broken import.
 */
export interface LiveMediaTokenGrant {
  /** The derived transport credential. Handed to exactly one client, never stored. */
  readonly token: string;
  readonly expiresAtMs: number;
  readonly roomRef: string;
  readonly publishSources: readonly LiveMediaPublishSource[];
  readonly canSubscribe: boolean;
}

export interface LiveMediaProviderEventRecord {
  readonly providerKind: string;
  readonly eventKind: string;
  readonly roomRef: string;
  /** Digest of the verified raw body; the body itself never enters Epoch state. */
  readonly eventDigest: string;
  readonly duplicate: boolean;
}

export interface LiveMediaGateway {
  issueToken(input: {
    readonly sessionId: string;
    readonly participantRef: string;
    readonly role: LiveParticipantRole;
    readonly securityMode: string;
    readonly publishSources: readonly LiveMediaPublishSource[];
  }): Promise<LiveMediaTokenGrant>;
  recordProviderEvent(input: {
    readonly sessionId: string;
    readonly providerKind: string;
    readonly eventKind: string;
    readonly roomRef: string;
    readonly eventDigest: string;
  }): Promise<LiveMediaProviderEventRecord>;
}

export interface LiveParticipantSnapshot {
  readonly principalId: string;
  readonly role: LiveParticipantRole;
  readonly active: boolean;
}

export interface LiveSessionSnapshot {
  readonly sessionId: string;
  readonly spaceId: string;
  readonly ownerPrincipalId: string;
  readonly presentationViewRef: string;
  readonly visibility: string;
  readonly securityMode: string;
  readonly lifecycle: LiveSessionLifecycle;
  readonly policyDigest: string;
  readonly releasedThroughSequence: number;
  readonly health: "live" | "degraded";
  readonly joinLocked: boolean;
  readonly participants: readonly LiveParticipantSnapshot[];
  readonly sealed: boolean;
}

export interface LiveSpaceApplicationPort {
  createSession(input: {
    readonly spaceId: string;
    readonly actor: string;
    readonly policy: LivePublicationPolicyInput;
  }): EpochCommandOutcome;
  showSession(sessionId: string): EpochCommandOutcome;
  listSessions(): EpochCommandOutcome;
  preflight(sessionId: string): EpochCommandOutcome;
  configure(input: {
    readonly sessionId: string;
    readonly actor: string;
    readonly policy: LivePublicationPolicyInput;
    readonly confirmed: boolean;
  }): EpochCommandOutcome;
  recordConsent(input: {
    readonly sessionId: string;
    readonly actor: string;
    readonly scopes: readonly LiveConsentScope[];
  }): EpochCommandOutcome;
  lifecycle(input: {
    readonly sessionId: string;
    readonly actor: string;
    readonly command: Exclude<LiveLifecycleCommand, "seal">;
  }): EpochCommandOutcome;
  seal(input: {
    readonly sessionId: string;
    readonly actor: string;
    readonly completeness: LiveReplayCompleteness;
  }): EpochCommandOutcome;
  join(input: { readonly sessionId: string; readonly actor: string }): EpochCommandOutcome;
  requestGrant(input: {
    readonly sessionId: string;
    readonly actor: string;
    readonly capability: string;
  }): EpochCommandOutcome;
  grant(input: {
    readonly sessionId: string;
    readonly actor: string;
    readonly principalId: string;
    readonly role: LiveParticipantRole;
  }): EpochCommandOutcome;
  revoke(input: {
    readonly sessionId: string;
    readonly actor: string;
    readonly principalId: string;
  }): EpochCommandOutcome;
  lockJoins(input: {
    readonly sessionId: string;
    readonly actor: string;
    readonly locked: boolean;
  }): EpochCommandOutcome;
  publish(input: {
    readonly sessionId: string;
    readonly actor: string;
    readonly actionId: string;
    readonly args: Readonly<Record<string, DictionaryValue>>;
    readonly path?: string;
  }): EpochCommandOutcome;
  status(sessionId: string): EpochCommandOutcome;
  checkpoint(input: { readonly sessionId: string; readonly actor: string }): EpochCommandOutcome;
  bookmark(input: {
    readonly sessionId: string;
    readonly actor: string;
    readonly checkpointId: string;
  }): EpochCommandOutcome;
  annotate(input: {
    readonly sessionId: string;
    readonly actor: string;
    readonly checkpointId: string;
    readonly body: string;
    readonly path?: string;
  }): EpochCommandOutcome;
  forkAt(input: {
    readonly sessionId: string;
    readonly actor: string;
    readonly checkpointId: string;
  }): EpochCommandOutcome;
  report(input: {
    readonly sessionId: string;
    readonly actor: string;
    readonly reason: string;
  }): EpochCommandOutcome;
  /** Derive a media credential only after Epoch grant and session checks pass. */
  issueMediaToken(input: {
    readonly sessionId: string;
    readonly actor: string;
    readonly requestedSources: readonly LiveMediaPublishSource[];
  }): Promise<EpochCommandOutcome>;
  /** Ingest a already-verified provider webhook through the command path. */
  recordProviderEvent(input: {
    readonly sessionId: string;
    readonly actor: string;
    readonly providerKind: string;
    readonly eventKind: string;
    readonly roomRef: string;
    readonly eventDigest: string;
  }): Promise<EpochCommandOutcome>;
}

// ------------------------------------------------------------ local port

/**
 * The default semantic action catalog. Everything absent is refused; the
 * privileged verbs are present only to document that they never replay.
 */
export const DEFAULT_LIVE_ACTION_CATALOG: LiveActionCatalog = createLiveActionCatalog({
  "view.open": { streamSafe: true, replayEffect: "presentation-local" },
  "file.reveal": { streamSafe: true, replayEffect: "presentation-local" },
  "diff.show": { streamSafe: true, replayEffect: "presentation-local" },
  "check.report": { streamSafe: true, replayEffect: "presentation-local" },
  "agent.receipt.show": { streamSafe: true, replayEffect: "presentation-local" },
  "history.inspect": { streamSafe: true, replayEffect: "read-only-query" },
  "change.merge": { streamSafe: false, replayEffect: "never-replay" },
  "shell.exec": { streamSafe: false, replayEffect: "never-replay" },
  "grant.modify": { streamSafe: false, replayEffect: "never-replay" },
});

export interface LocalLiveSpacePortOptions {
  /** Monotonic milliseconds; injected so delay and offsets are deterministic in tests. */
  readonly now: () => number;
  /** Per-session salt entropy. Must be unpredictable in production wiring. */
  readonly sessionSalt: string;
  /** Resolve an existing Space to its working View ref. Undefined refuses creation. */
  readonly resolveSpace: (spaceId: string) => { readonly viewRef: string } | undefined;
  readonly catalog?: LiveActionCatalog;
  readonly maxQueuedEnvelopes?: number;
  /** Server-side media seam; absent in a browser build, and honestly reported so. */
  readonly media?: LiveMediaGateway;
}

interface LocalParticipant {
  readonly principalId: string;
  role: LiveParticipantRole;
  active: boolean;
}

interface LocalLiveSession {
  readonly sessionId: string;
  readonly spaceId: string;
  readonly ownerPrincipalId: string;
  policy: LivePublicationPolicy;
  policyDigest: string;
  lifecycle: LiveSessionLifecycle;
  joinLocked: boolean;
  readonly publisher: LivePresentationPublisher;
  readonly participants: Map<string, LocalParticipant>;
  readonly consent: Map<string, Set<LiveConsentScope>>;
  readonly checkpoints: Map<string, LivePresentationCheckpoint>;
  readonly bookmarks: { readonly principalId: string; readonly checkpointId: string }[];
  readonly annotations: {
    readonly annotationId: string;
    readonly principalId: string;
    readonly checkpointId: string;
    readonly path?: string;
  }[];
  readonly grantRequests: { readonly principalId: string; readonly capability: string }[];
  readonly reports: { readonly reportId: string; readonly principalId: string }[];
  manifest?: LiveReplayManifest;
}

function fail(code: string, message: string): never {
  throw new EpochCommandError(code, message);
}

/**
 * Browser-safe, deterministic, in-memory Live Space port. This is the
 * complete semantic-only product: no media provider, no credentials, no
 * network. Signed lifecycle history belongs to the Core
 * `SignedLiveSessionStore`; hosted persistence belongs to the Community API.
 */
export function createLocalLiveSpacePort(options: LocalLiveSpacePortOptions): LiveSpaceApplicationPort {
  const sessions = new Map<string, LocalLiveSession>();
  const catalog = options.catalog ?? DEFAULT_LIVE_ACTION_CATALOG;
  const mediaGateway = options.media;
  let created = 0;

  function requireSession(sessionId: string): LocalLiveSession {
    return sessions.get(sessionId) ?? fail("not-found", `live session not found: ${sessionId}`);
  }

  function requireManager(session: LocalLiveSession, actor: string): LocalParticipant {
    const participant = session.participants.get(actor);
    if (participant === undefined || !participant.active || (participant.role !== "owner" && participant.role !== "cohost")) {
      fail("policy-denied", `principal ${actor} lacks live.session.manage authority`);
    }
    return participant;
  }

  function requireActive(session: LocalLiveSession, actor: string): LocalParticipant {
    const participant = session.participants.get(actor);
    if (participant === undefined || !participant.active) {
      fail("policy-denied", `principal ${actor} holds no active grant in this session`);
    }
    return participant;
  }

  function snapshot(session: LocalLiveSession): LiveSessionSnapshot {
    const state = session.publisher.state();
    return {
      sessionId: session.sessionId,
      spaceId: session.spaceId,
      ownerPrincipalId: session.ownerPrincipalId,
      presentationViewRef: session.policy.presentationViewRef,
      visibility: session.policy.visibility,
      securityMode: session.policy.securityMode,
      lifecycle: session.lifecycle,
      policyDigest: session.policyDigest,
      releasedThroughSequence: state.sequence,
      health: state.health,
      joinLocked: session.joinLocked,
      participants: [...session.participants.values()].map((participant) => ({
        principalId: participant.principalId,
        role: participant.role,
        active: participant.active,
      })),
      sealed: session.lifecycle === "sealed",
    };
  }

  function preflightReport(session: LocalLiveSession): LivePreflightReport {
    const scopes = session.consent.get(session.ownerPrincipalId);
    return runLivePreflight({
      sessionId: session.sessionId,
      spaceId: session.spaceId,
      policy: session.policy,
      policyDigest: session.policyDigest,
      consentScopes: [...(scopes ?? [])],
      mediaProviderReady: false,
      captionProviderReady: false,
    });
  }

  return {
    createSession(input) {
      const space = options.resolveSpace(input.spaceId);
      if (space === undefined) fail("not-found", `space not found: ${input.spaceId}`);
      const normalized = normalizeLivePublicationPolicy({
        ...input.policy,
        presentationViewRef: input.policy.presentationViewRef ?? space.viewRef,
      });
      if (normalized.kind === "invalid") {
        fail("invalid-input", `publication policy invalid: ${normalized.errors.join("; ")}`);
      }
      created += 1;
      const sessionId = identifier("livesession", { spaceId: input.spaceId, created });
      const publisher = createLivePresentationPublisher({
        sessionId,
        policy: normalized.policy,
        catalog,
        sessionSalt: `${options.sessionSalt}:${sessionId}`,
        now: options.now,
        ...(options.maxQueuedEnvelopes !== undefined && { maxQueuedEnvelopes: options.maxQueuedEnvelopes }),
      });
      const session: LocalLiveSession = {
        sessionId,
        spaceId: input.spaceId,
        ownerPrincipalId: input.actor,
        policy: normalized.policy,
        policyDigest: normalized.digest,
        lifecycle: "draft",
        joinLocked: normalized.policy.audience.joinLocked,
        publisher,
        participants: new Map([[input.actor, { principalId: input.actor, role: "owner", active: true }]]),
        consent: new Map(),
        checkpoints: new Map(),
        bookmarks: [],
        annotations: [],
        grantRequests: [],
        reports: [],
      };
      sessions.set(sessionId, session);
      return { data: snapshot(session) };
    },

    showSession(sessionId) {
      return { data: snapshot(requireSession(sessionId)) };
    },

    listSessions() {
      return { data: [...sessions.values()].map(snapshot) };
    },

    preflight(sessionId) {
      const session = requireSession(sessionId);
      const report = preflightReport(session);
      return { data: report, validation: validationReceipt(session.sessionId, report.errors) };
    },

    configure(input) {
      const session = requireSession(input.sessionId);
      requireManager(session, input.actor);
      if (session.lifecycle === "sealed") fail("policy-denied", "sealed sessions are immutable");
      const normalized = normalizeLivePublicationPolicy(input.policy);
      if (normalized.kind === "invalid") {
        fail("invalid-input", `publication policy invalid: ${normalized.errors.join("; ")}`);
      }
      const update = session.publisher.updatePolicy({ policy: normalized.policy, confirmed: input.confirmed });
      if (update.kind === "refused") fail("policy-denied", update.reason);
      session.policy = normalized.policy;
      session.policyDigest = normalized.digest;
      if (update.change === "widening" || update.change === "mixed") session.consent.clear();
      return { data: { change: update.change, policyDigest: update.policyDigest, invalidatedQueued: update.invalidatedQueued } };
    },

    recordConsent(input) {
      const session = requireSession(input.sessionId);
      requireActive(session, input.actor);
      if (session.lifecycle === "sealed") fail("policy-denied", "sealed sessions are immutable");
      const scopes = session.consent.get(input.actor) ?? new Set<LiveConsentScope>();
      for (const scope of input.scopes) scopes.add(scope);
      session.consent.set(input.actor, scopes);
      return {
        data: {
          sessionId: session.sessionId,
          principalId: input.actor,
          policyDigest: session.policyDigest,
          scopes: [...scopes].sort(),
          decision: "granted",
        },
      };
    },

    lifecycle(input) {
      const session = requireSession(input.sessionId);
      requireManager(session, input.actor);
      const decision = nextLiveLifecycle(session.lifecycle, input.command);
      if (decision.kind === "refused") fail("policy-denied", decision.reason);
      if (input.command === "start") {
        const report = preflightReport(session);
        if (!report.startAllowed) {
          fail("policy-denied", `preflight refuses start: ${report.errors.join("; ")}`);
        }
      }
      session.lifecycle = decision.state;
      if (input.command === "pause") session.publisher.pause();
      if (input.command === "resume") session.publisher.resume();
      if (input.command === "end") session.publisher.pause();
      return { data: snapshot(session) };
    },

    seal(input) {
      const session = requireSession(input.sessionId);
      requireManager(session, input.actor);
      const decision = nextLiveLifecycle(session.lifecycle, "seal");
      if (decision.kind === "refused") fail("policy-denied", decision.reason);
      session.manifest = session.publisher.buildReplayManifest(input.completeness);
      session.lifecycle = decision.state;
      return { data: { session: snapshot(session), manifest: session.manifest } };
    },

    join(input) {
      const session = requireSession(input.sessionId);
      if (session.lifecycle === "sealed" || session.lifecycle === "ended") {
        fail("policy-denied", "this session is no longer joinable; its replay may still be readable");
      }
      const existing = session.participants.get(input.actor);
      if (existing?.active === true) return { data: snapshot(session) };
      if (session.joinLocked) fail("policy-denied", "joins are locked for this session");
      if (session.policy.visibility === "private") {
        fail("policy-denied", "private sessions require an explicit grant from the host");
      }
      const spectators = [...session.participants.values()].filter((participant) =>
        participant.active && participant.role === "observer").length;
      if (spectators >= session.policy.audience.maxSpectators) {
        fail("policy-denied", "the session is at its spectator limit");
      }
      session.participants.set(input.actor, { principalId: input.actor, role: "observer", active: true });
      return { data: snapshot(session) };
    },

    requestGrant(input) {
      const session = requireSession(input.sessionId);
      requireActive(session, input.actor);
      session.grantRequests.push({ principalId: input.actor, capability: input.capability });
      // A request for authority is not authority: nothing else changes.
      return { data: { requested: input.capability, granted: false, pending: session.grantRequests.length } };
    },

    grant(input) {
      const session = requireSession(input.sessionId);
      requireManager(session, input.actor);
      if (input.role === "owner") fail("invalid-input", "ownership is not grantable through live.participant.grant");
      session.participants.set(input.principalId, { principalId: input.principalId, role: input.role, active: true });
      return { data: snapshot(session) };
    },

    revoke(input) {
      const session = requireSession(input.sessionId);
      requireManager(session, input.actor);
      const participant = session.participants.get(input.principalId)
        ?? fail("not-found", `principal is not a participant: ${input.principalId}`);
      if (participant.role === "owner") fail("policy-denied", "the owner grant cannot be revoked from inside the session");
      participant.active = false;
      session.consent.delete(input.principalId);
      return { data: snapshot(session) };
    },

    lockJoins(input) {
      const session = requireSession(input.sessionId);
      requireManager(session, input.actor);
      session.joinLocked = input.locked;
      return { data: snapshot(session) };
    },

    publish(input) {
      const session = requireSession(input.sessionId);
      const participant = requireActive(session, input.actor);
      if (participant.role === "observer") {
        fail("policy-denied", "observer grants do not authorize publication");
      }
      if (session.lifecycle !== "live") {
        fail("policy-denied", `publication requires a live session; current state is '${session.lifecycle}'`);
      }
      const decision: LiveCaptureDecision = session.publisher.capture({
        actorId: input.actor,
        actionId: input.actionId,
        args: input.args,
        ...(input.path !== undefined && { path: input.path }),
        sourceEventIds: [],
        sourceViewRef: session.policy.presentationViewRef,
        sourceVerified: true,
      });
      const releasedNow = session.publisher.release();
      return {
        data: {
          decision,
          releasedNow: releasedNow.length,
          state: session.publisher.state(),
        },
      };
    },

    status(sessionId) {
      const session = requireSession(sessionId);
      return {
        data: {
          session: snapshot(session),
          publisher: session.publisher.state(),
          quarantined: session.publisher.quarantined().length,
          envelopes: session.publisher.releasedEnvelopes(),
        },
      };
    },

    checkpoint(input) {
      const session = requireSession(input.sessionId);
      requireActive(session, input.actor);
      const checkpoint = session.publisher.checkpoint();
      session.checkpoints.set(checkpoint.checkpointId, checkpoint);
      return { data: checkpoint };
    },

    bookmark(input) {
      const session = requireSession(input.sessionId);
      requireActive(session, input.actor);
      if (!session.checkpoints.has(input.checkpointId)) fail("not-found", `checkpoint not found: ${input.checkpointId}`);
      session.bookmarks.push({ principalId: input.actor, checkpointId: input.checkpointId });
      return { data: { checkpointId: input.checkpointId, bookmarks: session.bookmarks.length } };
    },

    annotate(input) {
      const session = requireSession(input.sessionId);
      requireActive(session, input.actor);
      const checkpoint = session.checkpoints.get(input.checkpointId)
        ?? fail("not-found", `checkpoint not found: ${input.checkpointId}`);
      if (input.body.trim().length === 0 || input.body.length > 4_096) {
        fail("invalid-input", "annotation body must be 1..4096 characters");
      }
      const annotation = {
        annotationId: identifier("liveanno", {
          sessionId: session.sessionId,
          checkpointId: checkpoint.checkpointId,
          index: session.annotations.length,
        }),
        principalId: input.actor,
        checkpointId: checkpoint.checkpointId,
        ...(input.path !== undefined && { path: input.path }),
      };
      session.annotations.push(annotation);
      return { data: annotation };
    },

    forkAt(input) {
      const session = requireSession(input.sessionId);
      const participant = session.participants.get(input.actor);
      const checkpoint = session.checkpoints.get(input.checkpointId);
      const eligibility = evaluateLiveForkEligibility(checkpoint, {
        refVerified: checkpoint !== undefined,
        hasReadAuthority: participant?.active === true || session.policy.visibility !== "private",
        objectsAvailable: checkpoint !== undefined,
        policyPermitsCopy: session.policy.visibility !== "private" || participant?.active === true,
      });
      if (eligibility.kind === "refused") fail("policy-denied", eligibility.reason);
      const forkId = identifier("livefork", {
        sessionId: session.sessionId,
        checkpointId: eligibility.checkpointId,
        actor: input.actor,
      });
      return {
        data: {
          forkId,
          sourceViewRef: eligibility.sourceViewRef,
          provenance: { sessionId: session.sessionId, checkpointId: eligibility.checkpointId },
        },
      };
    },

    report(input) {
      const session = requireSession(input.sessionId);
      if (input.reason.trim().length === 0) fail("invalid-input", "a report requires a reason");
      const reportId = identifier("livereport", { sessionId: session.sessionId, index: session.reports.length });
      session.reports.push({ reportId, principalId: input.actor });
      return { data: { reportId, recorded: true } };
    },

    /**
     * A media token is derived authority, never a source of it. Epoch decides
     * first — session state, live grant, join lock, consent, security mode —
     * and only then does the provider mint a short-lived credential scoped to
     * the least privilege that role actually holds.
     */
    async issueMediaToken(input) {
      const session = requireSession(input.sessionId);
      const participant = requireActive(session, input.actor);
      if (session.lifecycle === "ended" || session.lifecycle === "sealed") {
        fail("policy-denied", "media tokens are not issued after a session ends");
      }
      if (session.policy.securityMode === "semantic-only") {
        fail("policy-denied", "semantic-only sessions have no media plane");
      }
      const permitted = permittedSourcesFor(participant.role, session.policy);
      const granted = input.requestedSources.filter((source) => permitted.includes(source));
      const refused = input.requestedSources.filter((source) => !permitted.includes(source));
      if (refused.length > 0) {
        fail("policy-denied", `role '${participant.role}' may not publish: ${refused.join(", ")}`);
      }
      if (granted.length > 0) {
        const consent = session.consent.get(input.actor) ?? new Set<LiveConsentScope>();
        const missing = granted
          .map((source) => consentScopeForSource(source))
          .filter((scope) => !consent.has(scope));
        if (missing.length > 0) fail("policy-denied", `publishing requires consent: ${[...new Set(missing)].join(", ")}`);
      }
      if (mediaGateway === undefined) {
        return {
          data: { refused: "unavailable", reason: MEDIA_UNAVAILABLE },
          validation: validationReceipt("live.media", [MEDIA_UNAVAILABLE]),
        };
      }
      const grant = await mediaGateway.issueToken({
        sessionId: session.sessionId,
        participantRef: identifier("livepart", { sessionId: session.sessionId, principalId: input.actor }),
        role: participant.role,
        securityMode: session.policy.securityMode,
        publishSources: granted,
      });
      // The credential is returned to exactly one caller and never persisted.
      return {
        data: {
          token: grant.token,
          expiresAtMs: grant.expiresAtMs,
          roomRef: grant.roomRef,
          canSubscribe: grant.canSubscribe,
          publishSources: grant.publishSources,
        },
      };
    },

    async recordProviderEvent(input) {
      const session = requireSession(input.sessionId);
      if (mediaGateway === undefined) {
        return {
          data: { refused: "unavailable", reason: MEDIA_UNAVAILABLE },
          validation: validationReceipt("live.media", [MEDIA_UNAVAILABLE]),
        };
      }
      const record = await mediaGateway.recordProviderEvent({
        sessionId: session.sessionId,
        providerKind: input.providerKind,
        eventKind: input.eventKind,
        roomRef: input.roomRef,
        eventDigest: input.eventDigest,
      });
      // Provider facts are projected state, never Epoch authority: they change
      // reported media health and nothing about who may do what.
      return { data: { ...record, sessionId: session.sessionId } };
    },
  };
}

const MEDIA_UNAVAILABLE = "no media gateway is configured for this deployment";

/**
 * Least privilege by role, intersected with what the policy enables. An
 * observer publishes nothing; an agent gets no microphone, camera, or screen
 * by default; camera and screen stay separate from the microphone.
 */
function permittedSourcesFor(
  role: LiveParticipantRole,
  policy: LivePublicationPolicy,
): readonly LiveMediaPublishSource[] {
  if (role === "observer" || role === "agent") return [];
  const permitted: LiveMediaPublishSource[] = [];
  if (policy.media.audio) permitted.push("microphone");
  if (policy.media.camera) permitted.push("camera");
  if (policy.media.screenShare) {
    permitted.push("screen-share");
    permitted.push("screen-share-audio");
  }
  return permitted;
}

function consentScopeForSource(source: LiveMediaPublishSource): LiveConsentScope {
  if (source === "microphone") return "audio";
  if (source === "camera") return "camera";
  return "screen-share";
}

// -------------------------------------------------------- command extensions

const PORT_UNAVAILABLE = "no Live Space application port is configured for this workspace";

/**
 * Register the Live Space command family on the shared bus. With no port
 * configured every command returns an honest unavailable receipt rather than
 * crashing or pretending capability.
 */
export function createLiveSpaceCommandExtensions(
  port: LiveSpaceApplicationPort | undefined,
  actorOf: () => string,
): readonly EpochCommandExtension[] {
  /**
   * The bus resolves who is calling before a handler runs, so live commands
   * read the actor from that context rather than a surface-supplied closure.
   * A server that joins a guest on a redeemed link therefore acts as that
   * guest, not as whoever happened to configure the runtime.
   */
  function withPort(run: (live: LiveSpaceApplicationPort, input: Readonly<Record<string, DictionaryValue>>, actor: string) => EpochCommandOutcome) {
    return (input: Readonly<Record<string, DictionaryValue>>, context: EpochCommandContext): EpochCommandOutcome => {
      if (port === undefined) {
        return {
          data: { refused: "unavailable", reason: PORT_UNAVAILABLE },
          validation: validationReceipt("live", [PORT_UNAVAILABLE]),
        };
      }
      return run(port, input, context.actor ?? actorOf());
    };
  }

  function withPortAsync(
    run: (live: LiveSpaceApplicationPort, input: Readonly<Record<string, DictionaryValue>>, actor: string) => Promise<EpochCommandOutcome>,
  ) {
    return async (
      input: Readonly<Record<string, DictionaryValue>>,
      context: EpochCommandContext,
    ): Promise<EpochCommandOutcome> => {
      if (port === undefined) {
        return {
          data: { refused: "unavailable", reason: PORT_UNAVAILABLE },
          validation: validationReceipt("live", [PORT_UNAVAILABLE]),
        };
      }
      return run(port, input, context.actor ?? actorOf());
    };
  }

  const extensions: EpochCommandExtension[] = [
    {
      descriptor: descriptor("live.session.create", "Create a Live Session bound to an existing Space and View.",
        "live.session.create", false, false, schema({
          spaceId: stringProperty("Existing Space id."),
          policy: { type: "object", description: "Publication policy input; allow-list starts empty." },
        }, ["spaceId"])),
      run: withPort((live, input, actor) => live.createSession({
        spaceId: requiredString(input, "spaceId"),
        actor,
        policy: policyInput(input),
      })),
    },
    {
      descriptor: descriptor("live.session.show", "Show one Live Session's state, policy digest, and participants.",
        "live.session.read", true, false, schema({ sessionId: stringProperty("Live session id.") }, ["sessionId"])),
      run: withPort((live, input) => live.showSession(requiredString(input, "sessionId"))),
    },
    {
      descriptor: descriptor("live.session.list", "List Live Sessions known to this workspace.",
        "live.session.read", true, false, emptySchema()),
      run: withPort((live) => live.listSessions()),
    },
    {
      descriptor: descriptor("live.session.preflight", "Validate policy, consent, and readiness; report exactly what an audience would see.",
        "live.session.read", true, false, schema({ sessionId: stringProperty("Live session id.") }, ["sessionId"])),
      run: withPort((live, input) => live.preflight(requiredString(input, "sessionId"))),
    },
    {
      descriptor: descriptor("live.session.configure", "Replace the publication policy. Widening requires confirmation and refreshed consent.",
        "live.presentation.configure", false, true, schema({
          sessionId: stringProperty("Live session id."),
          policy: { type: "object", description: "Replacement publication policy input." },
        }, ["sessionId"])),
      run: withPort((live, input, actor) => live.configure({
        sessionId: requiredString(input, "sessionId"),
        actor,
        policy: policyInput(input),
        confirmed: true,
      })),
    },
    {
      descriptor: descriptor("live.session.consent", "Record a participant's consent scopes against the current policy digest.",
        "live.session.manage", false, false, schema({
          sessionId: stringProperty("Live session id."),
          scopes: { type: "array", description: "Consent scopes: semantic-capture, audio, camera, screen-share, captions, recording, external-egress." },
        }, ["sessionId", "scopes"])),
      run: withPort((live, input, actor) => live.recordConsent({
        sessionId: requiredString(input, "sessionId"),
        actor,
        scopes: consentScopes(input),
      })),
    },
    lifecycleExtension("live.session.openLobby", "Open the lobby so authorized participants can join.", "openLobby", false),
    lifecycleExtension("live.session.start", "Start semantic publication. Refused while preflight fails.", "start", true),
    lifecycleExtension("live.session.pause", "Pause publication release at the current sequence.", "pause", false),
    lifecycleExtension("live.session.resume", "Resume publication release.", "resume", false),
    lifecycleExtension("live.session.end", "End the session; no further release or joins.", "end", true),
    {
      descriptor: descriptor("live.session.seal", "Seal an ended session into an immutable replay manifest.",
        "live.session.seal", false, true, schema({
          sessionId: stringProperty("Live session id."),
          completeness: enumProperty("Honest replay completeness.", ["complete", "semantic-only", "media-missing", "partial"]),
        }, ["sessionId"])),
      run: withPort((live, input, actor) => live.seal({
        sessionId: requiredString(input, "sessionId"),
        actor,
        completeness: completenessOf(input),
      })),
    },
    {
      descriptor: descriptor("live.participant.join", "Join as a scoped observer. Joining never grants write authority.",
        "live.participant.request", false, false, schema({ sessionId: stringProperty("Live session id.") }, ["sessionId"])),
      run: withPort((live, input, actor) => live.join({ sessionId: requiredString(input, "sessionId"), actor })),
    },
    {
      descriptor: descriptor("live.participant.requestGrant", "Record a signed request for a capability. Requests never auto-grant.",
        "live.participant.request", false, false, schema({
          sessionId: stringProperty("Live session id."),
          capability: stringProperty("Requested capability, for example live.presentation.publish."),
        }, ["sessionId", "capability"])),
      run: withPort((live, input, actor) => live.requestGrant({
        sessionId: requiredString(input, "sessionId"),
        actor,
        capability: requiredString(input, "capability"),
      })),
    },
    {
      descriptor: descriptor("live.participant.grant", "Grant a scoped session role to a principal.",
        "live.participant.grant", false, true, schema({
          sessionId: stringProperty("Live session id."),
          principalId: stringProperty("Principal to grant."),
          role: enumProperty("Session role.", ["cohost", "collaborator", "agent", "observer"]),
        }, ["sessionId", "principalId", "role"])),
      run: withPort((live, input, actor) => live.grant({
        sessionId: requiredString(input, "sessionId"),
        actor,
        principalId: requiredString(input, "principalId"),
        role: roleOf(input),
      })),
    },
    {
      descriptor: descriptor("live.participant.revoke", "Revoke a participant's session grant. Future semantic and media operations are denied.",
        "live.participant.revoke", false, true, schema({
          sessionId: stringProperty("Live session id."),
          principalId: stringProperty("Principal to revoke."),
        }, ["sessionId", "principalId"])),
      run: withPort((live, input, actor) => live.revoke({
        sessionId: requiredString(input, "sessionId"),
        actor,
        principalId: requiredString(input, "principalId"),
      })),
    },
    {
      descriptor: descriptor("live.participant.lockJoins", "Lock or unlock new joins without disconnecting current participants.",
        "live.session.manage", false, false, schema({
          sessionId: stringProperty("Live session id."),
          locked: booleanProperty("True locks new joins."),
        }, ["sessionId", "locked"])),
      run: withPort((live, input, actor) => live.lockJoins({
        sessionId: requiredString(input, "sessionId"),
        actor,
        locked: input.locked === true,
      })),
    },
    {
      descriptor: descriptor("live.presentation.publish", "Publish one sanitized semantic action into the presentation stream.",
        "live.presentation.publish", false, false, schema({
          sessionId: stringProperty("Live session id."),
          actionId: stringProperty("Stream-safe action id."),
          args: { type: "object", description: "JSON-shaped action arguments; sanitized recursively." },
          path: stringProperty("Logical Epoch path this action touches."),
        }, ["sessionId", "actionId"])),
      run: withPort((live, input, actor) => live.publish({
        sessionId: requiredString(input, "sessionId"),
        actor,
        actionId: requiredString(input, "actionId"),
        args: dictionaryOf(input, "args"),
        ...(optionalString(input, "path") !== undefined && { path: requiredString(input, "path") }),
      })),
    },
    {
      descriptor: descriptor("live.presentation.status", "Report presentation health, sequence, quarantine, and released envelopes.",
        "live.presentation.read", true, false, schema({ sessionId: stringProperty("Live session id.") }, ["sessionId"])),
      run: withPort((live, input) => live.status(requiredString(input, "sessionId"))),
    },
    {
      descriptor: descriptor("live.presentation.checkpoint", "Record a presentation checkpoint spectators can resync and fork from.",
        "live.presentation.read", false, false, schema({ sessionId: stringProperty("Live session id.") }, ["sessionId"])),
      run: withPort((live, input, actor) => live.checkpoint({ sessionId: requiredString(input, "sessionId"), actor })),
    },
    {
      descriptor: descriptor("live.presentation.bookmark", "Bookmark a checkpoint.",
        "live.presentation.annotate", false, false, schema({
          sessionId: stringProperty("Live session id."),
          checkpointId: stringProperty("Checkpoint id."),
        }, ["sessionId", "checkpointId"])),
      run: withPort((live, input, actor) => live.bookmark({
        sessionId: requiredString(input, "sessionId"),
        actor,
        checkpointId: requiredString(input, "checkpointId"),
      })),
    },
    {
      descriptor: descriptor("live.presentation.annotate", "Annotate a checkpoint, optionally anchored to a logical path.",
        "live.presentation.annotate", false, false, schema({
          sessionId: stringProperty("Live session id."),
          checkpointId: stringProperty("Checkpoint id."),
          body: stringProperty("Annotation body."),
          path: stringProperty("Optional logical path anchor."),
        }, ["sessionId", "checkpointId", "body"])),
      run: withPort((live, input, actor) => live.annotate({
        sessionId: requiredString(input, "sessionId"),
        actor,
        checkpointId: requiredString(input, "checkpointId"),
        body: requiredString(input, "body"),
        ...(optionalString(input, "path") !== undefined && { path: requiredString(input, "path") }),
      })),
    },
    {
      descriptor: descriptor("live.presentation.forkAt", "Fork a materializable checkpoint into normal Epoch work with provenance.",
        "live.presentation.fork", false, false, schema({
          sessionId: stringProperty("Live session id."),
          checkpointId: stringProperty("Checkpoint id; a media timestamp is not a branch point."),
        }, ["sessionId", "checkpointId"])),
      run: withPort((live, input, actor) => live.forkAt({
        sessionId: requiredString(input, "sessionId"),
        actor,
        checkpointId: requiredString(input, "checkpointId"),
      })),
    },
    {
      descriptor: descriptor("live.media.issueToken",
        "Derive a short-lived, least-privilege media credential after Epoch checks pass.",
        "live.media.subscribe", false, false, schema({
          sessionId: stringProperty("Live session id."),
          sources: { type: "array", description: "Requested publish sources; each is checked against the caller's role, the policy, and consent." },
        }, ["sessionId"])),
      run: withPortAsync((live, input, actor) => live.issueMediaToken({
        sessionId: requiredString(input, "sessionId"),
        actor,
        requestedSources: publishSources(input),
      })),
    },
    {
      descriptor: descriptor("live.media.providerEvent",
        "Record a verified provider webhook as projected media health.",
        "live.media.admin", false, false, schema({
          sessionId: stringProperty("Live session id."),
          providerKind: stringProperty("Provider kind that signed the event."),
          eventKind: stringProperty("Normalized provider event kind."),
          roomRef: stringProperty("Opaque provider room reference."),
          eventDigest: stringProperty("Digest of the verified raw body."),
        }, ["sessionId", "providerKind", "eventKind", "roomRef", "eventDigest"])),
      run: withPortAsync((live, input, actor) => live.recordProviderEvent({
        sessionId: requiredString(input, "sessionId"),
        actor,
        providerKind: requiredString(input, "providerKind"),
        eventKind: requiredString(input, "eventKind"),
        roomRef: requiredString(input, "roomRef"),
        eventDigest: requiredString(input, "eventDigest"),
      })),
    },
    {
      descriptor: descriptor("live.moderation.report", "Report this session or a participant to responders.",
        "live.incident.report", false, false, schema({
          sessionId: stringProperty("Live session id."),
          reason: stringProperty("Why this is being reported."),
        }, ["sessionId", "reason"])),
      run: withPort((live, input, actor) => live.report({
        sessionId: requiredString(input, "sessionId"),
        actor,
        reason: requiredString(input, "reason"),
      })),
    },
  ];
  return Object.freeze(extensions);

  function lifecycleExtension(
    kind: string,
    summary: string,
    command: Exclude<LiveLifecycleCommand, "seal">,
    requiresConfirmation: boolean,
  ): EpochCommandExtension {
    if (!isLiveLifecycleCommand(command)) fail("invalid-input", `unknown lifecycle command: ${command}`);
    return {
      descriptor: descriptor(kind, summary, command === "end" ? "live.session.end" : "live.session.manage",
        false, requiresConfirmation, schema({ sessionId: stringProperty("Live session id.") }, ["sessionId"])),
      run: withPort((live, input, actor) => live.lifecycle({
        sessionId: requiredString(input, "sessionId"),
        actor,
        command,
      })),
    };
  }
}

// ------------------------------------------------------------- input helpers

function descriptor(
  kind: string,
  summary: string,
  capability: string,
  readOnly: boolean,
  requiresConfirmation: boolean,
  inputSchema: JsonSchema,
): EpochCommandDescriptor {
  return { kind, summary, capability, readOnly, requiresConfirmation, untrustedContent: false, inputSchema };
}

function emptySchema(): JsonSchema {
  return { type: "object", properties: {} };
}

function schema(
  properties: Readonly<Record<string, Readonly<Record<string, DictionaryValue>>>>,
  required: readonly string[] = [],
): JsonSchema {
  return required.length === 0 ? { type: "object", properties } : { type: "object", properties, required };
}

function stringProperty(description: string) {
  return { type: "string", description };
}

function booleanProperty(description: string) {
  return { type: "boolean", description };
}

function enumProperty(description: string, values: readonly string[]) {
  return { type: "string", description, enum: values };
}

function requiredString(input: Readonly<Record<string, DictionaryValue>>, key: string): string {
  const value = input[key];
  if (!__epochIsString(value) || value.trim().length === 0) {
    fail("invalid-input", `Command input '${key}' must be a non-empty string.`);
  }
  return value;
}

function optionalString(input: Readonly<Record<string, DictionaryValue>>, key: string): string | undefined {
  const value = input[key];
  return __epochIsString(value) && value.trim().length > 0 ? value : undefined;
}

/** Parse the loose JSON policy field by field; normalization revalidates everything. */
function policyInput(input: Readonly<Record<string, DictionaryValue>>): LivePublicationPolicyInput {
  const value = input.policy;
  if (value === undefined || value === null) return {};
  if (!isDictionary(value)) fail("invalid-input", "Command input 'policy' must be an object.");
  const media = isDictionary(value.media) ? value.media : {};
  const retention = isDictionary(value.retention) ? value.retention : {};
  const audience = isDictionary(value.audience) ? value.audience : {};
  return {
    ...(stringField(value.visibility) !== undefined && { visibility: stringField(value.visibility) ?? "" }),
    ...(stringField(value.securityMode) !== undefined && { securityMode: stringField(value.securityMode) ?? "" }),
    ...(stringField(value.presentationViewRef) !== undefined && { presentationViewRef: stringField(value.presentationViewRef) ?? "" }),
    allowedPathPatterns: stringListField(value.allowedPathPatterns),
    deniedPathPatterns: stringListField(value.deniedPathPatterns),
    allowedActionIds: stringListField(value.allowedActionIds),
    includeAgentReceipts: value.includeAgentReceipts === true,
    includeChecks: value.includeChecks === true,
    media: {
      audio: media.audio === true,
      camera: media.camera === true,
      screenShare: media.screenShare === true,
      ...(stringField(media.captions) !== undefined && { captions: stringField(media.captions) ?? "" }),
      recording: media.recording === true,
      externalEgress: stringListField(media.externalEgress),
    },
    ...(numberField(value.publicationDelayMs) !== undefined && { publicationDelayMs: numberField(value.publicationDelayMs) ?? 0 }),
    retention: {
      ...(stringField(retention.mode) !== undefined && { mode: stringField(retention.mode) ?? "" }),
      ...(numberField(retention.days) !== undefined && { days: numberField(retention.days) ?? 0 }),
    },
    audience: {
      ...(numberField(audience.maxSpectators) !== undefined && { maxSpectators: numberField(audience.maxSpectators) ?? 0 }),
      ...(numberField(audience.maxPublishers) !== undefined && { maxPublishers: numberField(audience.maxPublishers) ?? 0 }),
      joinLocked: audience.joinLocked === true,
    },
  };
}

function stringField(value: DictionaryValue): string | undefined {
  return __epochIsString(value) ? value : undefined;
}

function numberField(value: DictionaryValue): number | undefined {
  return __epochIsNumber(value) ? value : undefined;
}

function stringListField(value: DictionaryValue): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(__epochIsString);
}

function dictionaryOf(
  input: Readonly<Record<string, DictionaryValue>>,
  key: string,
): Readonly<Record<string, DictionaryValue>> {
  const value = input[key];
  if (value === undefined || value === null) return {};
  if (!isDictionary(value)) fail("invalid-input", `Command input '${key}' must be an object.`);
  return value;
}

function consentScopes(input: Readonly<Record<string, DictionaryValue>>): readonly LiveConsentScope[] {
  const value = input.scopes;
  if (!Array.isArray(value)) fail("invalid-input", "Command input 'scopes' must be an array of consent scopes.");
  const scopes: LiveConsentScope[] = [];
  for (const scope of value) {
    if (!__epochIsString(scope) || !isLiveConsentScope(scope)) {
      fail("invalid-input", `Unknown consent scope '${String(scope)}'.`);
    }
    scopes.push(scope);
  }
  return scopes;
}

function completenessOf(input: Readonly<Record<string, DictionaryValue>>): LiveReplayCompleteness {
  const value = optionalString(input, "completeness") ?? "semantic-only";
  if (value !== "complete" && value !== "semantic-only" && value !== "media-missing" && value !== "partial") {
    fail("invalid-input", `Unknown replay completeness '${value}'.`);
  }
  return value;
}

function publishSources(input: Readonly<Record<string, DictionaryValue>>): readonly LiveMediaPublishSource[] {
  const value = input.sources;
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) fail("invalid-input", "Command input 'sources' must be an array of publish sources.");
  const sources: LiveMediaPublishSource[] = [];
  for (const source of value) {
    if (!__epochIsString(source)
      || (source !== "microphone" && source !== "camera" && source !== "screen-share" && source !== "screen-share-audio")) {
      fail("invalid-input", `Unknown media publish source '${String(source)}'.`);
    }
    sources.push(source);
  }
  return sources;
}

function roleOf(input: Readonly<Record<string, DictionaryValue>>): LiveParticipantRole {
  const value = requiredString(input, "role");
  if (value !== "cohost" && value !== "collaborator" && value !== "agent" && value !== "observer") {
    fail("invalid-input", `Unsupported live session role '${value}'.`);
  }
  return value;
}

function isDictionary(value: DictionaryValue): value is { readonly [key: string]: DictionaryValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
