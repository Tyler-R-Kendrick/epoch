/**
 * Provider-neutral Live Space media and caption ports.
 *
 * Media is optional and subordinate to the semantic session. A provider moves
 * media; it never becomes Epoch authority, never holds the canonical session
 * log, and never sees an API secret through this port's results. Two
 * implementations ship here: `disabled` (semantic-only is a complete product,
 * not an error state) and a deterministic `fake` for tests. A production
 * LiveKit adapter would implement the same port in a server process; none is
 * bundled, and nothing here pretends one is.
 */

export type LiveMediaProviderKind = "disabled" | "fake" | "livekit";

function __epochIsString<T>(value: T): value is T & string { return typeof value === "string"; }

export type LiveMediaSecurityMode =
  | "semantic-only"
  | "private-e2ee"
  | "private-recordable"
  | "public-broadcast";

export type LiveMediaSource = "microphone" | "camera" | "screen-share" | "screen-share-audio";

export type LiveMediaCapabilityLabel =
  | "production"
  | "experimental"
  | "provider-disabled"
  | "degraded"
  | "local-only"
  | "sample"
  | "unavailable";

export interface LiveMediaReadiness {
  readonly kind: LiveMediaProviderKind;
  readonly ready: boolean;
  readonly label: LiveMediaCapabilityLabel;
  readonly reason?: string;
  readonly recording: LiveMediaCapabilityLabel;
  readonly egress: LiveMediaCapabilityLabel;
}

export interface CreateLiveMediaRoomInput {
  readonly sessionId: string;
  readonly securityMode: LiveMediaSecurityMode;
  /** Idempotency key: replays return the original result instead of a second room. */
  readonly operationId: string;
}

export interface LiveMediaRoomResult {
  readonly outcome: "created" | "duplicate" | "failed";
  /** Opaque provider room reference — never a title, path, or secret. */
  readonly roomRef?: string;
  readonly reason?: string;
}

export interface IssueLiveMediaTokenInput {
  readonly sessionId: string;
  readonly roomRef: string;
  /** Opaque principal reference; never an email, legal name, or path. */
  readonly participantRef: string;
  readonly canSubscribe: boolean;
  readonly publishSources: readonly LiveMediaSource[];
  readonly ttlSeconds: number;
  readonly operationId: string;
}

export interface LiveMediaTokenResult {
  readonly outcome: "issued" | "refused";
  /**
   * The transport credential, present only on issue. It is a derived,
   * short-lived secret: callers hand it to exactly one client and must never
   * persist it in session records, receipts, logs, or telemetry.
   */
  readonly token?: string;
  readonly expiresAtMs?: number;
  readonly reason?: string;
}

export interface LiveMediaOperationInput {
  readonly sessionId: string;
  readonly roomRef: string;
  readonly participantRef?: string;
  readonly operationId: string;
}

export interface LiveMediaOperationResult {
  readonly outcome: "applied" | "duplicate" | "refused" | "failed";
  readonly reason?: string;
}

export interface LiveMediaWebhookInput {
  readonly rawBody: string;
  readonly signature: string;
  readonly contentType: string;
}

export interface VerifiedLiveMediaWebhookEvent {
  readonly outcome: "verified" | "rejected" | "duplicate";
  readonly eventKind?: string;
  readonly roomRef?: string;
  readonly reason?: string;
}

export interface LiveMediaProvider {
  readonly kind: LiveMediaProviderKind;
  readiness(): Promise<LiveMediaReadiness>;
  createRoom(input: CreateLiveMediaRoomInput): Promise<LiveMediaRoomResult>;
  issueParticipantToken(input: IssueLiveMediaTokenInput): Promise<LiveMediaTokenResult>;
  removeParticipant(input: LiveMediaOperationInput): Promise<LiveMediaOperationResult>;
  startRecording(input: LiveMediaOperationInput): Promise<LiveMediaOperationResult>;
  stopRecording(input: LiveMediaOperationInput): Promise<LiveMediaOperationResult>;
  startEgress(input: LiveMediaOperationInput & { readonly destinationRef: string }): Promise<LiveMediaOperationResult>;
  stopEgress(input: LiveMediaOperationInput): Promise<LiveMediaOperationResult>;
  closeRoom(input: LiveMediaOperationInput): Promise<LiveMediaOperationResult>;
  verifyWebhook(input: LiveMediaWebhookInput): Promise<VerifiedLiveMediaWebhookEvent>;
}

// --------------------------------------------------------- mode compatibility

export interface LiveMediaModeRequest {
  readonly securityMode: LiveMediaSecurityMode;
  readonly recording: boolean;
  readonly externalEgress: boolean;
  readonly serverTranscription: boolean;
}

export type LiveMediaModeDecision =
  | { readonly kind: "compatible" }
  | { readonly kind: "refused"; readonly reasons: readonly string[] };

/**
 * Refuse contradictory security-mode combinations rather than silently
 * downgrading. E2EE means no intermediary — LiveKit's servers included — can
 * read media; provider-side recording, egress, and transcription therefore
 * require a mode whose trust model admits a clear-media processor.
 */
export function evaluateLiveMediaMode(request: LiveMediaModeRequest): LiveMediaModeDecision {
  const reasons: string[] = [];
  if (request.securityMode === "semantic-only"
    && (request.recording || request.externalEgress || request.serverTranscription)) {
    reasons.push("semantic-only sessions have no media to record, egress, or transcribe");
  }
  if (request.securityMode === "private-e2ee") {
    if (request.recording) reasons.push("E2EE media cannot be recorded by the provider; no trusted keyed processor is modeled");
    if (request.externalEgress) reasons.push("E2EE media cannot be egressed by the provider");
    if (request.serverTranscription) reasons.push("E2EE media cannot be transcribed server-side");
  }
  return reasons.length === 0 ? { kind: "compatible" } : { kind: "refused", reasons };
}

// ------------------------------------------------------------------ captions

export interface LiveCaptionReadiness {
  readonly ready: boolean;
  readonly label: LiveMediaCapabilityLabel;
  readonly reason?: string;
}

export interface LiveCaptionProvider {
  readiness(): Promise<LiveCaptionReadiness>;
}

export function createDisabledLiveCaptionProvider(): LiveCaptionProvider {
  return {
    readiness: () => Promise.resolve({
      ready: false,
      label: "provider-disabled",
      reason: "no caption provider is configured",
    }),
  };
}

export function createFakeLiveCaptionProvider(options: { readonly ready: boolean } = { ready: true }): LiveCaptionProvider {
  return {
    readiness: () => Promise.resolve(options.ready
      ? { ready: true, label: "sample" }
      : { ready: false, label: "unavailable", reason: "fake caption provider set unavailable" }),
  };
}

export interface LiveCaptionGateDecision {
  readonly allowed: boolean;
  readonly reason?: string;
}

/**
 * The caption gate for public synchronized audio/video (WCAG 2.2 SC 1.2.4):
 * a public session with live media cannot start without live captions.
 */
export function captionsGateAllowsStart(input: {
  readonly securityMode: LiveMediaSecurityMode;
  readonly mediaEnabled: boolean;
  readonly captionReadiness: LiveCaptionReadiness;
}): LiveCaptionGateDecision {
  if (input.securityMode !== "public-broadcast" || !input.mediaEnabled) return { allowed: true };
  if (input.captionReadiness.ready) return { allowed: true };
  return {
    allowed: false,
    reason: "public synchronized audio/video requires live captions; the caption provider is not ready",
  };
}

// ------------------------------------------------------------------- disabled

export function createDisabledLiveMediaProvider(): LiveMediaProvider {
  const refused: LiveMediaOperationResult = { outcome: "refused", reason: "media provider is disabled" };
  return {
    kind: "disabled",
    readiness: () => Promise.resolve({
      kind: "disabled",
      ready: false,
      label: "provider-disabled",
      reason: "semantic-only sessions are fully supported without a media provider",
      recording: "provider-disabled",
      egress: "provider-disabled",
    }),
    createRoom: () => Promise.resolve({ outcome: "failed", reason: "media provider is disabled" }),
    issueParticipantToken: () => Promise.resolve({ outcome: "refused", reason: "media provider is disabled" }),
    removeParticipant: () => Promise.resolve(refused),
    startRecording: () => Promise.resolve(refused),
    stopRecording: () => Promise.resolve(refused),
    startEgress: () => Promise.resolve(refused),
    stopEgress: () => Promise.resolve(refused),
    closeRoom: () => Promise.resolve(refused),
    verifyWebhook: () => Promise.resolve({ outcome: "rejected", reason: "media provider is disabled" }),
  };
}

// ----------------------------------------------------------------------- fake

export type FakeLiveMediaFailure =
  | "unavailable"
  | "token-failure"
  | "room-failure"
  | "remove-failure"
  | "recording-failure"
  | "egress-failure";

export interface FakeLiveMediaCall {
  readonly operation: string;
  readonly operationId: string;
  readonly sessionId: string;
}

export interface FakeLiveMediaProviderOptions {
  /** Injected clock in milliseconds; the fake never reads a real clock. */
  readonly now: () => number;
  readonly failures?: readonly FakeLiveMediaFailure[];
  readonly webhookSecret?: string;
}

export interface FakeLiveMediaProvider extends LiveMediaProvider {
  readonly calls: readonly FakeLiveMediaCall[];
}

/**
 * Deterministic fake: injected clock, injected failures, a call ledger, and
 * idempotency on every operation id. It never overstates the provider — its
 * readiness label is `sample`, never `production`.
 */
export function createFakeLiveMediaProvider(options: FakeLiveMediaProviderOptions): FakeLiveMediaProvider {
  const failures = new Set(options.failures ?? []);
  const calls: FakeLiveMediaCall[] = [];
  const rooms = new Map<string, string>();
  const operations = new Map<string, string>();
  const seenWebhooks = new Set<string>();
  let roomCount = 0;

  function ledger(operation: string, operationId: string, sessionId: string): boolean {
    calls.push({ operation, operationId, sessionId });
    if (operations.has(operationId)) return true;
    operations.set(operationId, operation);
    return false;
  }

  function operate(
    operation: string,
    input: LiveMediaOperationInput,
    failure: FakeLiveMediaFailure,
  ): Promise<LiveMediaOperationResult> {
    const duplicate = ledger(operation, input.operationId, input.sessionId);
    if (duplicate) return Promise.resolve({ outcome: "duplicate" });
    if (failures.has(failure)) return Promise.resolve({ outcome: "failed", reason: `fake ${failure}` });
    if (!rooms.has(input.roomRef)) return Promise.resolve({ outcome: "refused", reason: "unknown room" });
    return Promise.resolve({ outcome: "applied" });
  }

  return {
    kind: "fake",
    get calls(): readonly FakeLiveMediaCall[] { return [...calls]; },

    readiness() {
      if (failures.has("unavailable")) {
        return Promise.resolve({
          kind: "fake" as const, ready: false, label: "unavailable" as const,
          reason: "fake provider set unavailable",
          recording: "unavailable" as const, egress: "unavailable" as const,
        });
      }
      return Promise.resolve({
        kind: "fake" as const, ready: true, label: "sample" as const,
        recording: "sample" as const, egress: "sample" as const,
      });
    },

    createRoom(input) {
      const duplicate = ledger("createRoom", input.operationId, input.sessionId);
      const existing = rooms.get(input.sessionId);
      if (duplicate && existing !== undefined) {
        return Promise.resolve({ outcome: "duplicate" as const, roomRef: existing });
      }
      if (failures.has("room-failure")) return Promise.resolve({ outcome: "failed" as const, reason: "fake room-failure" });
      roomCount += 1;
      const roomRef = `fake-room-${roomCount}`;
      rooms.set(input.sessionId, roomRef);
      rooms.set(roomRef, input.sessionId);
      return Promise.resolve({ outcome: "created" as const, roomRef });
    },

    issueParticipantToken(input) {
      ledger("issueParticipantToken", input.operationId, input.sessionId);
      if (failures.has("token-failure")) return Promise.resolve({ outcome: "refused" as const, reason: "fake token-failure" });
      if (!rooms.has(input.roomRef)) return Promise.resolve({ outcome: "refused" as const, reason: "unknown room" });
      if (rooms.get(input.roomRef) !== input.sessionId) {
        return Promise.resolve({ outcome: "refused" as const, reason: "room is not bound to that session" });
      }
      if (input.ttlSeconds <= 0 || input.ttlSeconds > 900) {
        return Promise.resolve({ outcome: "refused" as const, reason: "token TTL out of bounds" });
      }
      const grants = input.publishSources.length === 0 ? "subscribe" : input.publishSources.join("+");
      return Promise.resolve({
        outcome: "issued" as const,
        token: `fake-token:${input.participantRef}:${grants}:${input.ttlSeconds}`,
        expiresAtMs: options.now() + input.ttlSeconds * 1_000,
      });
    },

    removeParticipant: (input) => operate("removeParticipant", input, "remove-failure"),
    startRecording: (input) => operate("startRecording", input, "recording-failure"),
    stopRecording: (input) => operate("stopRecording", input, "recording-failure"),
    startEgress(input) {
      if (!input.destinationRef.startsWith("egress-ref:")) {
        calls.push({ operation: "startEgress", operationId: input.operationId, sessionId: input.sessionId });
        return Promise.resolve({ outcome: "refused", reason: "egress destinations must be opaque egress-ref references" });
      }
      return operate("startEgress", input, "egress-failure");
    },
    stopEgress: (input) => operate("stopEgress", input, "egress-failure"),
    closeRoom: (input) => operate("closeRoom", input, "room-failure"),

    verifyWebhook(input) {
      if (input.contentType !== "application/webhook+json") {
        return Promise.resolve({ outcome: "rejected" as const, reason: "unsupported content type" });
      }
      if (input.rawBody.length > 65_536) {
        return Promise.resolve({ outcome: "rejected" as const, reason: "webhook body too large" });
      }
      const expected = `fake-signature:${options.webhookSecret ?? "fake"}:${input.rawBody.length}`;
      if (input.signature !== expected) {
        return Promise.resolve({ outcome: "rejected" as const, reason: "signature verification failed" });
      }
      if (seenWebhooks.has(input.rawBody)) return Promise.resolve({ outcome: "duplicate" as const });
      seenWebhooks.add(input.rawBody);
      let parsed: { readonly event?: string; readonly roomRef?: string };
      try {
        parsed = JSON.parse(input.rawBody);
      } catch {
        return Promise.resolve({ outcome: "rejected" as const, reason: "webhook body is not JSON" });
      }
      const roomRef = __epochIsString(parsed.roomRef) ? parsed.roomRef : "";
      if (!rooms.has(roomRef)) return Promise.resolve({ outcome: "rejected" as const, reason: "unknown room" });
      return Promise.resolve({
        outcome: "verified" as const,
        eventKind: __epochIsString(parsed.event) ? parsed.event : "unknown",
        roomRef,
      });
    },
  };
}
