import { identifier } from "../digest";
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };


/**
 * Live Spaces — canonical browser-safe contracts.
 *
 * A Live Space is a publication and audience session bound to an existing
 * Epoch Space and View. Nothing here is a new history primitive: the
 * presentation checkpoint is a projection cursor over released envelopes, the
 * lifecycle is a signed event trail, and the policy digest names the exact
 * sanitizer configuration each envelope passed through.
 */

export type LiveSessionLifecycle = "draft" | "lobby" | "live" | "paused" | "ended" | "sealed";
/** `degraded` is projected health, never a stored lifecycle state. */
export type LiveSessionState = LiveSessionLifecycle | "degraded";

export type LiveSessionVisibility = "private" | "community" | "unlisted" | "public";

export type LiveSecurityMode =
  | "semantic-only"
  | "private-e2ee"
  | "private-recordable"
  | "public-broadcast";

export type LiveConsentScope =
  | "semantic-capture"
  | "audio"
  | "camera"
  | "screen-share"
  | "captions"
  | "recording"
  | "external-egress";

export type LiveCaptionState = "required" | "enabled" | "disabled";

export type LiveRetentionMode = "session-only" | "bounded";

export interface LiveRetentionPolicy {
  readonly mode: LiveRetentionMode;
  readonly days: number;
}

export interface LiveMediaPolicy {
  readonly audio: boolean;
  readonly camera: boolean;
  readonly screenShare: boolean;
  readonly captions: LiveCaptionState;
  readonly recording: boolean;
  readonly externalEgress: readonly string[];
}

export interface LiveAudiencePolicy {
  readonly maxSpectators: number;
  readonly maxPublishers: number;
  readonly joinLocked: boolean;
}

export interface LivePublicationPolicy {
  readonly schemaVersion: 1;
  readonly visibility: LiveSessionVisibility;
  readonly securityMode: LiveSecurityMode;
  readonly presentationViewRef: string;
  /** Allow-list. Publication starts from nothing visible. */
  readonly allowedPathPatterns: readonly string[];
  readonly deniedPathPatterns: readonly string[];
  readonly allowedActionIds: readonly string[];
  readonly includeAgentReceipts: boolean;
  readonly includeChecks: boolean;
  readonly media: LiveMediaPolicy;
  readonly publicationDelayMs: number;
  readonly retention: LiveRetentionPolicy;
  readonly audience: LiveAudiencePolicy;
}

export interface LivePublicationPolicyInput {
  readonly visibility?: string;
  readonly securityMode?: string;
  readonly presentationViewRef?: string;
  readonly allowedPathPatterns?: readonly string[];
  readonly deniedPathPatterns?: readonly string[];
  readonly allowedActionIds?: readonly string[];
  readonly includeAgentReceipts?: boolean;
  readonly includeChecks?: boolean;
  readonly media?: {
    readonly audio?: boolean;
    readonly camera?: boolean;
    readonly screenShare?: boolean;
    readonly captions?: string;
    readonly recording?: boolean;
    readonly externalEgress?: readonly string[];
  };
  readonly publicationDelayMs?: number;
  readonly retention?: { readonly mode?: string; readonly days?: number };
  readonly audience?: {
    readonly maxSpectators?: number;
    readonly maxPublishers?: number;
    readonly joinLocked?: boolean;
  };
}

export interface LiveConsentRecord {
  readonly schemaVersion: 1;
  readonly sessionId: string;
  readonly principalId: string;
  readonly policyDigest: string;
  readonly scopes: readonly LiveConsentScope[];
  readonly decision: "granted" | "withdrawn";
}

export interface LivePresentationEnvelopeV2 {
  readonly schemaVersion: 2;
  readonly sessionId: string;
  /** Authoritative ordering within one session; starts at 1. */
  readonly sequence: number;
  readonly actorId: string;
  readonly actionId: string;
  readonly args: Readonly<Record<string, DictionaryValue>>;
  readonly path?: string;
  readonly sourceEventIds: readonly string[];
  readonly sourceViewRef: string;
  readonly policyDigest: string;
  /** Informational wall time only. Never ordering authority. */
  readonly observedAt?: string;
  readonly presentationOffsetMs: number;
  readonly payloadDigest: string;
  readonly liveEventId: string;
}

export interface LivePresentationCheckpoint {
  readonly schemaVersion: 1;
  readonly sessionId: string;
  readonly checkpointId: string;
  readonly sequence: number;
  readonly presentationLogHead: string;
  readonly sourceViewRef: string;
  readonly policyDigest: string;
  readonly presentationOffsetMs: number;
}

export type LiveReplayCompleteness = "complete" | "semantic-only" | "media-missing" | "partial";

export interface LiveReplayManifest {
  readonly schemaVersion: 1;
  readonly replayId: string;
  readonly sessionId: string;
  readonly presentationLogHead: string;
  readonly presentationEventIds: readonly string[];
  readonly checkpointIds: readonly string[];
  readonly policyDigests: readonly string[];
  readonly completeness: LiveReplayCompleteness;
}

export type LiveMediaProviderKind = "disabled" | "fake" | "livekit";

export interface LiveMediaBinding {
  readonly schemaVersion: 1;
  readonly bindingId: string;
  readonly sessionId: string;
  readonly providerKind: LiveMediaProviderKind;
  /** Opaque and non-authoritative — never a title, path, or secret. */
  readonly providerRoomRef: string;
  readonly securityMode: LiveSecurityMode;
  readonly state: "provisioning" | "ready" | "active" | "stopped" | "failed";
}

// ------------------------------------------------------------------ lifecycle

export type LiveLifecycleCommand = "openLobby" | "start" | "pause" | "resume" | "end" | "seal";

interface LiveLifecycleTransition {
  readonly from: readonly LiveSessionLifecycle[];
  readonly to: LiveSessionLifecycle;
}

const LIFECYCLE_TRANSITIONS = {
  openLobby: { from: ["draft"], to: "lobby" },
  start: { from: ["lobby"], to: "live" },
  pause: { from: ["live"], to: "paused" },
  resume: { from: ["paused"], to: "live" },
  end: { from: ["live", "paused", "lobby"], to: "ended" },
  seal: { from: ["ended"], to: "sealed" },
} satisfies Readonly<Record<LiveLifecycleCommand, LiveLifecycleTransition>>;

export type LiveLifecycleDecision =
  | { readonly kind: "ok"; readonly state: LiveSessionLifecycle }
  | { readonly kind: "refused"; readonly reason: string };

/**
 * The deterministic state machine every surface shares. A sealed session
 * accepts no lifecycle command at all — sealing is append-only history.
 */
export function nextLiveLifecycle(
  current: LiveSessionLifecycle,
  command: LiveLifecycleCommand,
): LiveLifecycleDecision {
  if (current === "sealed") {
    return { kind: "refused", reason: "sealed sessions are immutable" };
  }
  const transition: LiveLifecycleTransition = LIFECYCLE_TRANSITIONS[command];
  if (!transition.from.includes(current)) {
    return { kind: "refused", reason: `cannot ${command} from '${current}'` };
  }
  return { kind: "ok", state: transition.to };
}

export function isLiveLifecycle(value: string): value is LiveSessionLifecycle {
  return ["draft", "lobby", "live", "paused", "ended", "sealed"].includes(value);
}

export function isLiveLifecycleCommand(value: string): value is LiveLifecycleCommand {
  return ["openLobby", "start", "pause", "resume", "end", "seal"].includes(value);
}

// --------------------------------------------------------- policy validation

export const LIVE_POLICY_BOUNDS = Object.freeze({
  maxPatterns: 64,
  maxPatternLength: 256,
  maxActionIds: 128,
  maxDelayMs: 120_000,
  maxRetentionDays: 365,
  maxSpectators: 10_000,
  maxPublishers: 64,
  maxEgressDestinations: 8,
});

export type LivePolicyNormalization =
  | { readonly kind: "valid"; readonly policy: LivePublicationPolicy; readonly digest: string }
  | { readonly kind: "invalid"; readonly errors: readonly string[] };

/**
 * Normalize, bound, and digest a publication policy. Fail closed: an invalid
 * policy never becomes a digest, and a digest always names one exact
 * normalized policy. Security-mode contradictions are refused here, before
 * any session can reference them.
 */
export function normalizeLivePublicationPolicy(input: LivePublicationPolicyInput): LivePolicyNormalization {
  const errors: string[] = [];
  const visibilityInput = input.visibility ?? "private";
  const visibility = isLiveVisibility(visibilityInput) ? visibilityInput : undefined;
  if (visibility === undefined) errors.push(`unknown visibility '${visibilityInput}'`);
  const securityModeInput = input.securityMode ?? "semantic-only";
  const securityMode = isLiveSecurityMode(securityModeInput) ? securityModeInput : undefined;
  if (securityMode === undefined) errors.push(`unknown security mode '${securityModeInput}'`);
  const presentationViewRef = input.presentationViewRef ?? "";
  if (presentationViewRef.trim().length === 0) errors.push("presentationViewRef is required");

  const allowedPathPatterns = normalizePatternList(input.allowedPathPatterns ?? [], "allowedPathPatterns", errors);
  const deniedPathPatterns = normalizePatternList(input.deniedPathPatterns ?? [], "deniedPathPatterns", errors);
  const allowedActionIds = normalizeActionList(input.allowedActionIds ?? [], errors);

  const media: LiveMediaPolicy = {
    audio: input.media?.audio === true,
    camera: input.media?.camera === true,
    screenShare: input.media?.screenShare === true,
    captions: normalizeCaptions(input.media?.captions, errors),
    recording: input.media?.recording === true,
    externalEgress: Object.freeze([...(input.media?.externalEgress ?? [])]),
  };
  if (media.externalEgress.length > LIVE_POLICY_BOUNDS.maxEgressDestinations) {
    errors.push("too many external egress destinations");
  }
  for (const destination of media.externalEgress) {
    if (!destination.startsWith("egress-ref:")) {
      errors.push("external egress destinations must be opaque 'egress-ref:' references, never raw URLs");
      break;
    }
  }

  const publicationDelayMs = input.publicationDelayMs ?? 0;
  if (!isBoundedInteger(publicationDelayMs, 0, LIVE_POLICY_BOUNDS.maxDelayMs)) {
    errors.push(`publicationDelayMs must be an integer between 0 and ${LIVE_POLICY_BOUNDS.maxDelayMs}`);
  }

  const retentionMode = input.retention?.mode ?? "session-only";
  if (retentionMode !== "session-only" && retentionMode !== "bounded") {
    errors.push(`unknown retention mode '${retentionMode}'`);
  }
  const retentionDays = input.retention?.days ?? 0;
  if (!isBoundedInteger(retentionDays, 0, LIVE_POLICY_BOUNDS.maxRetentionDays)) {
    errors.push("retention days out of bounds");
  }

  const maxSpectators = input.audience?.maxSpectators ?? 100;
  const maxPublishers = input.audience?.maxPublishers ?? 4;
  if (!isBoundedInteger(maxSpectators, 0, LIVE_POLICY_BOUNDS.maxSpectators)) errors.push("maxSpectators out of bounds");
  if (!isBoundedInteger(maxPublishers, 0, LIVE_POLICY_BOUNDS.maxPublishers)) errors.push("maxPublishers out of bounds");

  if (securityMode !== undefined && visibility !== undefined) {
    errors.push(...securityModeContradictions(securityMode, visibility, media));
  }
  const retention = retentionMode === "bounded"
    ? { mode: "bounded" as const, days: retentionDays }
    : { mode: "session-only" as const, days: retentionDays };
  if (errors.length > 0 || visibility === undefined || securityMode === undefined) {
    return { kind: "invalid", errors: Object.freeze(errors) };
  }

  const policy: LivePublicationPolicy = {
    schemaVersion: 1,
    visibility,
    securityMode,
    presentationViewRef: presentationViewRef.trim(),
    allowedPathPatterns,
    deniedPathPatterns,
    allowedActionIds,
    includeAgentReceipts: input.includeAgentReceipts === true,
    includeChecks: input.includeChecks === true,
    media,
    publicationDelayMs,
    retention,
    audience: { maxSpectators, maxPublishers, joinLocked: input.audience?.joinLocked === true },
  };
  return { kind: "valid", policy: Object.freeze(policy), digest: livePolicyDigest(policy) };
}

export function livePolicyDigest(policy: LivePublicationPolicy): string {
  return identifier("livepol", policy);
}

/**
 * Contradictory mode combinations are refused, never silently downgraded.
 * E2EE means no processor can read media, so provider-side recording and
 * egress are impossible without an explicitly modeled trusted processor —
 * which this policy shape does not claim to have.
 */
function securityModeContradictions(
  mode: LiveSecurityMode,
  visibility: LiveSessionVisibility,
  media: LiveMediaPolicy,
): readonly string[] {
  const errors: string[] = [];
  const anyMedia = media.audio || media.camera || media.screenShare;
  if (mode === "semantic-only" && (anyMedia || media.recording || media.externalEgress.length > 0)) {
    errors.push("semantic-only sessions cannot enable media, recording, or egress");
  }
  if (mode === "private-e2ee" && (media.recording || media.externalEgress.length > 0)) {
    errors.push("private-e2ee refuses provider recording and egress: the provider cannot read E2EE media");
  }
  if (mode === "private-e2ee" && visibility === "public") {
    errors.push("private-e2ee sessions cannot be public");
  }
  if (mode === "public-broadcast" && visibility !== "public" && visibility !== "unlisted") {
    errors.push("public-broadcast requires public or unlisted visibility");
  }
  if (mode === "public-broadcast" && anyMedia && media.captions === "disabled") {
    errors.push("public synchronized audio/video requires live captions; enable captions or drop media");
  }
  return errors;
}

export type LivePolicyChange = "equal" | "narrowing" | "widening" | "mixed";

/**
 * Classify a policy replacement. Widening (anything newly exposed) demands
 * explicit confirmation and fresh consent; narrowing takes effect immediately
 * and invalidates queued-but-unreleased envelopes that no longer pass.
 */
export function classifyLivePolicyChange(
  before: LivePublicationPolicy,
  after: LivePublicationPolicy,
): LivePolicyChange {
  if (livePolicyDigest(before) === livePolicyDigest(after)) return "equal";
  const widened = policyWidens(before, after);
  const narrowed = policyWidens(after, before);
  if (widened && narrowed) return "mixed";
  return widened ? "widening" : "narrowing";
}

function policyWidens(before: LivePublicationPolicy, after: LivePublicationPolicy): boolean {
  if (visibilityRank(after.visibility) > visibilityRank(before.visibility)) return true;
  if (!isSubset(after.allowedPathPatterns, before.allowedPathPatterns)) return true;
  if (!isSubset(after.allowedActionIds, before.allowedActionIds)) return true;
  if (!isSubset(before.deniedPathPatterns, after.deniedPathPatterns)) return true;
  if (after.publicationDelayMs < before.publicationDelayMs) return true;
  const mediaFlags: readonly (keyof LiveMediaPolicy)[] = ["audio", "camera", "screenShare", "recording"];
  for (const flag of mediaFlags) {
    if (after.media[flag] === true && before.media[flag] !== true) return true;
  }
  if (!isSubset(after.media.externalEgress, before.media.externalEgress)) return true;
  if (after.includeAgentReceipts && !before.includeAgentReceipts) return true;
  if (after.includeChecks && !before.includeChecks) return true;
  return false;
}

function visibilityRank(visibility: LiveSessionVisibility): number {
  return ["private", "community", "unlisted", "public"].indexOf(visibility);
}

function isSubset(candidate: readonly string[], reference: readonly string[]): boolean {
  const set = new Set(reference);
  return candidate.every((item) => set.has(item));
}

export function isLiveVisibility(value: string): value is LiveSessionVisibility {
  return ["private", "community", "unlisted", "public"].includes(value);
}

export function isLiveSecurityMode(value: string): value is LiveSecurityMode {
  return ["semantic-only", "private-e2ee", "private-recordable", "public-broadcast"].includes(value);
}

export function isLiveConsentScope(value: string): value is LiveConsentScope {
  return ["semantic-capture", "audio", "camera", "screen-share", "captions", "recording", "external-egress"]
    .includes(value);
}

function normalizeCaptions(value: string | undefined, errors: string[]): LiveCaptionState {
  const captions = value ?? "disabled";
  if (captions !== "required" && captions !== "enabled" && captions !== "disabled") {
    errors.push(`unknown captions state '${captions}'`);
    return "disabled";
  }
  return captions;
}

function normalizePatternList(
  patterns: readonly string[],
  label: string,
  errors: string[],
): readonly string[] {
  if (patterns.length > LIVE_POLICY_BOUNDS.maxPatterns) {
    errors.push(`${label} exceeds ${LIVE_POLICY_BOUNDS.maxPatterns} patterns`);
    return Object.freeze([]);
  }
  const normalized: string[] = [];
  for (const raw of patterns) {
    const pattern = raw.normalize("NFKC").trim();
    if (pattern.length === 0) continue;
    if (pattern.length > LIVE_POLICY_BOUNDS.maxPatternLength) {
      errors.push(`${label} pattern too long`);
      continue;
    }
    if (pattern.includes("..")) {
      errors.push(`${label} pattern must not contain dot segments`);
      continue;
    }
    normalized.push(pattern);
  }
  return Object.freeze([...new Set(normalized)].sort());
}

function normalizeActionList(actionIds: readonly string[], errors: string[]): readonly string[] {
  if (actionIds.length > LIVE_POLICY_BOUNDS.maxActionIds) {
    errors.push(`allowedActionIds exceeds ${LIVE_POLICY_BOUNDS.maxActionIds} entries`);
    return Object.freeze([]);
  }
  const normalized = actionIds
    .map((actionId) => actionId.normalize("NFKC").trim())
    .filter((actionId) => actionId.length > 0);
  return Object.freeze([...new Set(normalized)].sort());
}

function isBoundedInteger(value: number, minimum: number, maximum: number): boolean {
  return Number.isSafeInteger(value) && value >= minimum && value <= maximum;
}
