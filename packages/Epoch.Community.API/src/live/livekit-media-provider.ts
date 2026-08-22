import { createHash } from "node:crypto";
import type {
  CreateLiveMediaRoomInput,
  IssueLiveMediaTokenInput,
  LiveMediaOperationInput,
  LiveMediaOperationResult,
  LiveMediaProvider,
  LiveMediaReadiness,
  LiveMediaRoomResult,
  LiveMediaSource,
  LiveMediaTokenResult,
  LiveMediaWebhookInput,
  VerifiedLiveMediaWebhookEvent,
} from "./media-provider";

/**
 * The LiveKit adapter.
 *
 * It implements the same provider-neutral port the fake does, so nothing above
 * it can tell which is configured except through honest capability labels. Two
 * rules shape the whole file. First, the SDK is imported dynamically and only
 * when credentials exist, so a semantic-only deployment never loads it and a
 * missing module degrades to `provider-disabled` instead of crashing a server.
 * Second, a token is the narrowest expression of a decision Epoch already made:
 * this layer can only ever remove privilege, never add it.
 */

export interface LiveKitConfig {
  /** `wss://…` host URL. Present but unusable configuration is reported, not guessed. */
  readonly url?: string;
  /** Server-only. Read from the deployment's secret mechanism, never from a request. */
  readonly apiKey?: string;
  readonly apiSecret?: string;
  /** Opaque destination keys an operator pre-approved; callers never supply URLs. */
  readonly egressDestinations?: Readonly<Record<string, string>>;
  /** True only when a self-hosted egress service is actually deployed. */
  readonly egressAvailable?: boolean;
}

// ------------------------------------------------------------- SDK seam

export interface LiveKitAccessTokenLike {
  addGrant(grant: LiveKitVideoGrant): void;
  toJwt(): Promise<string>;
}

/**
 * The SDK's own enum representation for publishable sources. It is deliberately
 * not a plain string: LiveKit rejects strings here and serializes its enum to
 * the documented `microphone` / `screen_share` wire values itself, so the
 * conversion belongs to the SDK rather than to this adapter.
 */
export type LiveKitTrackSourceValue = string | number;

export interface LiveKitVideoGrant {
  readonly room: string;
  readonly roomJoin: boolean;
  readonly canSubscribe: boolean;
  readonly canPublish: boolean;
  readonly canPublishData: boolean;
  readonly canPublishSources?: readonly LiveKitTrackSourceValue[];
  readonly hidden?: boolean;
}

export interface LiveKitRoomClientLike {
  createRoom(input: { readonly name: string; readonly emptyTimeout?: number }): Promise<{ readonly name: string }>;
  removeParticipant(room: string, identity: string): Promise<void>;
  deleteRoom(room: string): Promise<void>;
}

export interface LiveKitEgressClientLike {
  startRoomCompositeEgress(room: string, output: { readonly destinationRef: string }): Promise<{ readonly egressId: string }>;
  stopEgress(egressId: string): Promise<void>;
}

export interface LiveKitWebhookReceiverLike {
  receive(body: string, authHeader: string): Promise<LiveKitWebhookEvent>;
}

export interface LiveKitWebhookEvent {
  readonly event?: string;
  readonly id?: string;
  readonly room?: { readonly name?: string };
}

/** The SDK surface this adapter uses, injectable so CI never reaches a network. */
export interface LiveKitClientFactory {
  /** Convert Epoch source names into the SDK's enum representation. */
  trackSources(names: readonly string[]): readonly LiveKitTrackSourceValue[] | Promise<readonly LiveKitTrackSourceValue[]>;
  accessToken(input: {
    readonly apiKey: string;
    readonly apiSecret: string;
    readonly identity: string;
    readonly ttlSeconds: number;
  }): LiveKitAccessTokenLike | Promise<LiveKitAccessTokenLike>;
  roomClient(config: LiveKitConfig): LiveKitRoomClientLike | Promise<LiveKitRoomClientLike>;
  egressClient(config: LiveKitConfig): LiveKitEgressClientLike | Promise<LiveKitEgressClientLike>;
  webhookReceiver(config: LiveKitConfig): LiveKitWebhookReceiverLike | Promise<LiveKitWebhookReceiverLike>;
}

export interface LiveKitProviderOptions {
  readonly config: LiveKitConfig;
  readonly now: () => number;
  readonly tokenTtlSeconds?: number;
  /** Injected in tests; production resolves the official SDK on first use. */
  readonly clients?: LiveKitClientFactory;
}

const MAX_TOKEN_TTL_SECONDS = 900;
const DEFAULT_TOKEN_TTL_SECONDS = 300;

/** Epoch source names map onto LiveKit's documented `canPublishSources` values. */
const SOURCE_NAMES = {
  microphone: "microphone",
  camera: "camera",
  "screen-share": "screen_share",
  "screen-share-audio": "screen_share_audio",
} satisfies Readonly<Record<LiveMediaSource, string>>;

export function createLiveKitMediaProvider(options: LiveKitProviderOptions): LiveMediaProvider {
  const config = options.config;
  const ttlSeconds = Math.min(options.tokenTtlSeconds ?? DEFAULT_TOKEN_TTL_SECONDS, MAX_TOKEN_TTL_SECONDS);
  const factory = options.clients ?? officialLiveKitClientFactory();
  const roomBySession = new Map<string, string>();
  const sessionByRoom = new Map<string, string>();
  const egressByRoom = new Map<string, string>();
  const seenWebhookIds = new Set<string>();
  const completedOperations = new Map<string, LiveMediaOperationResult>();

  function credentials(): { readonly apiKey: string; readonly apiSecret: string } | undefined {
    if (config.apiKey === undefined || config.apiSecret === undefined || config.url === undefined) return undefined;
    if (config.apiKey.trim() === "" || config.apiSecret.trim() === "" || config.url.trim() === "") return undefined;
    return { apiKey: config.apiKey, apiSecret: config.apiSecret };
  }

  /**
   * Partial credentials are a configuration error, not a reason to fall back to
   * something weaker: readiness says so and every operation refuses.
   */
  function readinessNow(): LiveMediaReadiness {
    const present = [config.url, config.apiKey, config.apiSecret].filter((value) =>
      value !== undefined && value.trim() !== "").length;
    if (present === 0) {
      return {
        kind: "livekit", ready: false, label: "provider-disabled",
        reason: "no LiveKit URL, API key, or API secret is configured",
        recording: "provider-disabled", egress: "provider-disabled",
      };
    }
    if (present < 3) {
      return {
        kind: "livekit", ready: false, label: "unavailable",
        reason: "LiveKit configuration is incomplete; refusing to issue credentials",
        recording: "unavailable", egress: "unavailable",
      };
    }
    return {
      kind: "livekit", ready: true,
      // Nothing in this repository has validated the adapter against a live
      // LiveKit deployment, so it does not call itself production.
      label: "experimental",
      recording: config.egressAvailable === true ? "experimental" : "unavailable",
      egress: config.egressAvailable === true ? "experimental" : "unavailable",
    };
  }

  function idempotent(operationId: string, result: LiveMediaOperationResult): LiveMediaOperationResult {
    if (completedOperations.has(operationId)) return { outcome: "duplicate" };
    completedOperations.set(operationId, result);
    return result;
  }

  return {
    kind: "livekit",

    readiness: () => Promise.resolve(readinessNow()),

    async createRoom(input: CreateLiveMediaRoomInput): Promise<LiveMediaRoomResult> {
      const secrets = credentials();
      if (secrets === undefined) return { outcome: "failed", reason: readinessNow().reason ?? "not configured" };
      const existing = roomBySession.get(input.sessionId);
      if (existing !== undefined) return { outcome: "duplicate", roomRef: existing };
      // The room name is a digest of the session, never a title or a path: a
      // provider dashboard learns nothing about what is being worked on.
      const roomRef = opaqueRoomName(input.sessionId);
      try {
        const client = await factory.roomClient(config);
        await client.createRoom({ name: roomRef, emptyTimeout: 300 });
      } catch (error) {
        return { outcome: "failed", reason: sanitizeProviderError(error, secrets) };
      }
      roomBySession.set(input.sessionId, roomRef);
      sessionByRoom.set(roomRef, input.sessionId);
      return { outcome: "created", roomRef };
    },

    async issueParticipantToken(input: IssueLiveMediaTokenInput): Promise<LiveMediaTokenResult> {
      const secrets = credentials();
      if (secrets === undefined) return { outcome: "refused", reason: readinessNow().reason ?? "not configured" };
      if (sessionByRoom.get(input.roomRef) !== input.sessionId) {
        return { outcome: "refused", reason: "room is not bound to that session" };
      }
      if (input.ttlSeconds <= 0 || input.ttlSeconds > MAX_TOKEN_TTL_SECONDS) {
        return { outcome: "refused", reason: "token TTL out of bounds" };
      }
      const sourceNames = input.publishSources.map((source) => SOURCE_NAMES[source]);
      try {
        const sources = sourceNames.length === 0 ? [] : await factory.trackSources(sourceNames);
        const token = await factory.accessToken({
          apiKey: secrets.apiKey,
          apiSecret: secrets.apiSecret,
          identity: input.participantRef,
          ttlSeconds: Math.min(input.ttlSeconds, ttlSeconds),
        });
        // Least privilege, stated positively: publish only what survived the
        // Epoch checks, no data channel, and never a room admin or recorder.
        token.addGrant({
          room: input.roomRef,
          roomJoin: true,
          canSubscribe: input.canSubscribe,
          canPublish: sources.length > 0,
          canPublishData: false,
          ...(sources.length > 0 && { canPublishSources: sources }),
        });
        return {
          outcome: "issued",
          token: await token.toJwt(),
          expiresAtMs: options.now() + Math.min(input.ttlSeconds, ttlSeconds) * 1_000,
        };
      } catch (error) {
        return { outcome: "refused", reason: sanitizeProviderError(error, secrets) };
      }
    },

    async removeParticipant(input: LiveMediaOperationInput): Promise<LiveMediaOperationResult> {
      const secrets = credentials();
      if (secrets === undefined) return { outcome: "refused", reason: "not configured" };
      if (completedOperations.has(input.operationId)) return { outcome: "duplicate" };
      if (input.participantRef === undefined) return { outcome: "refused", reason: "no participant reference" };
      try {
        const client = await factory.roomClient(config);
        await client.removeParticipant(input.roomRef, input.participantRef);
        return idempotent(input.operationId, { outcome: "applied" });
      } catch (error) {
        // A failed removal is reported, never assumed: the caller must be able
        // to escalate to ending the session.
        return { outcome: "failed", reason: sanitizeProviderError(error, secrets) };
      }
    },

    startRecording(input: LiveMediaOperationInput): Promise<LiveMediaOperationResult> {
      return Promise.resolve(refuseUnlessEgressConfigured(config, input, "recording"));
    },

    stopRecording(input: LiveMediaOperationInput): Promise<LiveMediaOperationResult> {
      return Promise.resolve(refuseUnlessEgressConfigured(config, input, "recording"));
    },

    async startEgress(input: LiveMediaOperationInput & { readonly destinationRef: string }): Promise<LiveMediaOperationResult> {
      const secrets = credentials();
      if (secrets === undefined) return { outcome: "refused", reason: "not configured" };
      if (config.egressAvailable !== true) {
        return { outcome: "refused", reason: "self-hosted egress is not deployed for this installation" };
      }
      // Destinations are pre-approved opaque keys. A caller cannot name a URL,
      // so there is no request-shaped path to an attacker's ingest endpoint.
      const destination = config.egressDestinations?.[input.destinationRef];
      if (!input.destinationRef.startsWith("egress-ref:") || destination === undefined) {
        return { outcome: "refused", reason: "unknown egress destination reference" };
      }
      if (completedOperations.has(input.operationId)) return { outcome: "duplicate" };
      try {
        const client = await factory.egressClient(config);
        const started = await client.startRoomCompositeEgress(input.roomRef, { destinationRef: destination });
        egressByRoom.set(input.roomRef, started.egressId);
        return idempotent(input.operationId, { outcome: "applied" });
      } catch (error) {
        return { outcome: "failed", reason: sanitizeProviderError(error, secrets) };
      }
    },

    async stopEgress(input: LiveMediaOperationInput): Promise<LiveMediaOperationResult> {
      const secrets = credentials();
      if (secrets === undefined) return { outcome: "refused", reason: "not configured" };
      const egressId = egressByRoom.get(input.roomRef);
      if (egressId === undefined) return { outcome: "refused", reason: "no egress is running for that room" };
      try {
        const client = await factory.egressClient(config);
        await client.stopEgress(egressId);
        egressByRoom.delete(input.roomRef);
        return { outcome: "applied" };
      } catch (error) {
        return { outcome: "failed", reason: sanitizeProviderError(error, secrets) };
      }
    },

    async closeRoom(input: LiveMediaOperationInput): Promise<LiveMediaOperationResult> {
      const secrets = credentials();
      if (secrets === undefined) return { outcome: "refused", reason: "not configured" };
      try {
        const client = await factory.roomClient(config);
        await client.deleteRoom(input.roomRef);
        const sessionId = sessionByRoom.get(input.roomRef);
        if (sessionId !== undefined) roomBySession.delete(sessionId);
        sessionByRoom.delete(input.roomRef);
        return { outcome: "applied" };
      } catch (error) {
        return { outcome: "failed", reason: sanitizeProviderError(error, secrets) };
      }
    },

    /**
     * Verification uses the official receiver over the raw body, because the
     * body-hash encoding is not part of LiveKit's public documentation and a
     * hand-rolled check could differ from the server in either direction.
     */
    async verifyWebhook(input: LiveMediaWebhookInput): Promise<VerifiedLiveMediaWebhookEvent> {
      const secrets = credentials();
      if (secrets === undefined) return { outcome: "rejected", reason: "not configured" };
      if (!input.contentType.startsWith("application/webhook+json")) {
        return { outcome: "rejected", reason: "unsupported content type" };
      }
      let event: LiveKitWebhookEvent;
      try {
        const receiver = await factory.webhookReceiver(config);
        event = await receiver.receive(input.rawBody, input.signature);
      } catch (error) {
        return { outcome: "rejected", reason: sanitizeProviderError(error, secrets) };
      }
      const roomRef = event.room?.name;
      if (roomRef === undefined || !sessionByRoom.has(roomRef)) {
        return { outcome: "rejected", reason: "unknown room" };
      }
      const eventId = event.id;
      if (eventId !== undefined) {
        if (seenWebhookIds.has(eventId)) return { outcome: "duplicate" };
        seenWebhookIds.add(eventId);
      }
      return { outcome: "verified", eventKind: event.event ?? "unknown", roomRef };
    },
  };
}

function refuseUnlessEgressConfigured(
  config: LiveKitConfig,
  input: LiveMediaOperationInput,
  capability: string,
): LiveMediaOperationResult {
  if (config.egressAvailable !== true) {
    return { outcome: "refused", reason: `self-hosted ${capability} is not deployed for this installation` };
  }
  // Recording rides the same egress service; a deployment that has it wires
  // startEgress with a recording destination rather than a second code path.
  return { outcome: "refused", reason: `${capability} must be started through an approved egress destination` };
}

/** A provider room name reveals nothing: it is a digest of the session id. */
export function opaqueRoomName(sessionId: string): string {
  return `epoch-${createHash("sha256").update(`live-room:${sessionId}`).digest("hex").slice(0, 32)}`;
}

/**
 * Provider errors are normalized before they travel. An SDK message can quote
 * a request URL or an authorization header, so the secret is redacted and the
 * message is truncated rather than forwarded verbatim.
 */
export function sanitizeProviderError(
  error: Error | unknown,
  secrets: { readonly apiKey: string; readonly apiSecret: string },
): string {
  const message = error instanceof Error ? error.message : "provider call failed";
  const redacted = message
    .split(secrets.apiSecret).join("[redacted]")
    .split(secrets.apiKey).join("[redacted]");
  return redacted.slice(0, 200);
}

/**
 * Resolve the official SDK lazily. The import lives inside the factory so a
 * deployment without LiveKit never pays for it, and a missing dependency
 * surfaces as a refusal instead of a module-resolution crash at boot.
 */
export function officialLiveKitClientFactory(): LiveKitClientFactory {
  return {
    async trackSources(names) {
      const protocol = await importLiveKitProtocol();
      return names.map((name) => protocol.TrackSource[enumNameFor(name)] ?? 0);
    },
    async accessToken(input) {
      return (await importLiveKit()).accessToken(input);
    },
    async roomClient(config) {
      return (await importLiveKit()).roomClient(config);
    },
    async egressClient(config) {
      return (await importLiveKit()).egressClient(config);
    },
    async webhookReceiver(config) {
      return (await importLiveKit()).webhookReceiver(config);
    },
  };
}

/** Wire source names to the protobuf enum member names. */
const SOURCE_ENUM_NAMES = {
  microphone: "MICROPHONE",
  camera: "CAMERA",
  screen_share: "SCREEN_SHARE",
  screen_share_audio: "SCREEN_SHARE_AUDIO",
} satisfies Readonly<Record<string, string>>;

type LiveKitWireSourceName = keyof typeof SOURCE_ENUM_NAMES;

function isWireSourceName(value: string): value is LiveKitWireSourceName {
  return Object.hasOwn(SOURCE_ENUM_NAMES, value);
}

function enumNameFor(wireName: string): string {
  return isWireSourceName(wireName) ? SOURCE_ENUM_NAMES[wireName] : "UNKNOWN";
}

interface LiveKitProtocolModule {
  /** A protobuf enum is reverse-mapped, so its values are names as well as numbers. */
  readonly TrackSource: Readonly<Record<string, LiveKitTrackSourceValue>>;
}

/**
 * Wrap the SDK's classes in this module's seam rather than asserting that the
 * whole module matches it. Only the grant hand-off needs a narrowing, and it is
 * narrow: values this adapter read out of the SDK's own enum, handed back to
 * the SDK that defines it.
 */
async function importLiveKit() {
  const sdk = await import("livekit-server-sdk");
  return {
    accessToken(input: {
      readonly apiKey: string;
      readonly apiSecret: string;
      readonly identity: string;
      readonly ttlSeconds: number;
    }): LiveKitAccessTokenLike {
      const token = new sdk.AccessToken(input.apiKey, input.apiSecret, {
        identity: input.identity,
        ttl: input.ttlSeconds,
      });
      return {
        addGrant(grant: LiveKitVideoGrant): void {
          // SAFETY: canPublishSources holds values trackSources() read straight out of the SDK's own TrackSource enum.
          const sdkGrant = { ...grant } as Parameters<typeof token.addGrant>[0];
          token.addGrant(sdkGrant);
        },
        toJwt: () => token.toJwt(),
      };
    },

    roomClient(config: LiveKitConfig): LiveKitRoomClientLike {
      const client = new sdk.RoomServiceClient(config.url ?? "", config.apiKey ?? "", config.apiSecret ?? "");
      return {
        async createRoom(input) {
          const room = await client.createRoom({
            name: input.name,
            ...(input.emptyTimeout !== undefined && { emptyTimeout: input.emptyTimeout }),
          });
          return { name: room.name };
        },
        removeParticipant: async (room, identity) => { await client.removeParticipant(room, identity); },
        deleteRoom: async (room) => { await client.deleteRoom(room); },
      };
    },

    /**
     * Egress is deliberately not wired to a real output here.
     *
     * LiveKit's composite egress takes a typed output message — encoded file,
     * segmented file, or stream — whose shape depends on what an operator
     * actually deployed and where they send it. Guessing that shape would mean
     * shipping an unvalidated construction at the point where recordings leave
     * the trust boundary, so this factory refuses instead. `stopEgress` is real,
     * because stopping something is safe to get right without a destination.
     */
    egressClient(config: LiveKitConfig): LiveKitEgressClientLike {
      const client = new sdk.EgressClient(config.url ?? "", config.apiKey ?? "", config.apiSecret ?? "");
      return {
        startRoomCompositeEgress() {
          return Promise.reject(new Error(
            "egress output construction is not wired for this deployment; configure an egress adapter before enabling it",
          ));
        },
        stopEgress: async (egressId) => { await client.stopEgress(egressId); },
      };
    },

    webhookReceiver(config: LiveKitConfig): LiveKitWebhookReceiverLike {
      const receiver = new sdk.WebhookReceiver(config.apiKey ?? "", config.apiSecret ?? "");
      return {
        async receive(body, authHeader) {
          const event = await receiver.receive(body, authHeader);
          return {
            ...(event.event !== undefined && { event: event.event }),
            ...(event.id !== undefined && { id: event.id }),
            ...(event.room?.name !== undefined && { room: { name: event.room.name } }),
          };
        },
      };
    },
  };
}

async function importLiveKitProtocol(): Promise<LiveKitProtocolModule> {
  const loaded: LiveKitProtocolModule = await import("@livekit/protocol");
  return loaded;
}

