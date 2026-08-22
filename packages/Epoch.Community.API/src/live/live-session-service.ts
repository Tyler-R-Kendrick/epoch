import type {
  EpochCommandReceipt,
  EpochCommandRequest,
  LivePresentationCheckpoint,
  LivePresentationEnvelopeV2,
  LiveSessionSnapshot,
} from "@epoch/community-runtime";
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };


/**
 * The hosted Live Space service.
 *
 * It owns no domain rules. Every mutation and every read is a command on the
 * shared bus, so the HTTP surface, the CLI, and the browser reach identical
 * authorization and return identical receipts. What this layer adds is
 * delivery: it observes which envelopes a command released and fans exactly
 * those out to connected spectators, in sequence order, once each.
 */

/** Matches `CommunityCommandBus["execute"]`: the bus itself is what gets injected. */
export type LiveExecuteCommand = <TData = unknown>(request: EpochCommandRequest) => Promise<EpochCommandReceipt<TData>>;

export interface LiveSubscriber {
  readonly onEnvelope: (envelope: LivePresentationEnvelopeV2) => void;
  readonly onClose?: (reason: string) => void;
}

export interface LiveSessionHub {
  subscribe(sessionId: string, subscriber: LiveSubscriber): { close(): void } | undefined;
  broadcast(sessionId: string, envelopes: readonly LivePresentationEnvelopeV2[]): void;
  closeSession(sessionId: string, reason: string): void;
  subscriberCount(sessionId: string): number;
  readonly totalSubscribers: number;
}

export interface LiveSessionHubOptions {
  /** Hard ceiling across all sessions; a flood is refused, never queued. */
  readonly maxTotalSubscribers?: number;
  readonly maxSubscribersPerSession?: number;
}

const DEFAULT_MAX_TOTAL_SUBSCRIBERS = 512;
const DEFAULT_MAX_SUBSCRIBERS_PER_SESSION = 128;

export function createLiveSessionHub(options: LiveSessionHubOptions = {}): LiveSessionHub {
  const maxTotal = options.maxTotalSubscribers ?? DEFAULT_MAX_TOTAL_SUBSCRIBERS;
  const maxPerSession = options.maxSubscribersPerSession ?? DEFAULT_MAX_SUBSCRIBERS_PER_SESSION;
  const sessions = new Map<string, Set<LiveSubscriber>>();
  let total = 0;

  function group(sessionId: string): Set<LiveSubscriber> {
    const existing = sessions.get(sessionId);
    if (existing !== undefined) return existing;
    const created = new Set<LiveSubscriber>();
    sessions.set(sessionId, created);
    return created;
  }

  return {
    /** Returns undefined when a bound is reached; the caller answers 503, never blocks. */
    subscribe(sessionId, subscriber) {
      const subscribers = group(sessionId);
      if (total >= maxTotal || subscribers.size >= maxPerSession) return undefined;
      subscribers.add(subscriber);
      total += 1;
      return {
        close(): void {
          if (!subscribers.delete(subscriber)) return;
          total -= 1;
        },
      };
    },

    broadcast(sessionId, envelopes) {
      const subscribers = sessions.get(sessionId);
      if (subscribers === undefined) return;
      for (const envelope of envelopes) {
        for (const subscriber of subscribers) subscriber.onEnvelope(envelope);
      }
    },

    closeSession(sessionId, reason) {
      const subscribers = sessions.get(sessionId);
      if (subscribers === undefined) return;
      for (const subscriber of subscribers) subscriber.onClose?.(reason);
      total -= subscribers.size;
      subscribers.clear();
    },

    subscriberCount(sessionId) {
      return sessions.get(sessionId)?.size ?? 0;
    },

    get totalSubscribers(): number { return total; },
  };
}

export interface LivePresentationStatusData {
  readonly session: LiveSessionSnapshot;
  readonly quarantined: number;
  readonly envelopes: readonly LivePresentationEnvelopeV2[];
}

export interface LiveSessionServiceOptions {
  readonly execute: LiveExecuteCommand;
  readonly hub: LiveSessionHub;
}

export interface LiveSessionService {
  /** Run a live command, then deliver whatever it released. */
  run(request: EpochCommandRequest): Promise<EpochCommandReceipt>;
  status(sessionId: string, actor: string): Promise<LivePresentationStatusData>;
  snapshot(input: {
    readonly sessionId: string;
    readonly actor: string;
    readonly afterSequence: number;
  }): Promise<LivePresentationSnapshotResult>;
  events(input: {
    readonly sessionId: string;
    readonly actor: string;
    readonly afterSequence: number;
    readonly limit: number;
  }): Promise<readonly LivePresentationEnvelopeV2[]>;
  readonly hub: LiveSessionHub;
}

export interface LivePresentationSnapshotResult {
  readonly checkpoint?: LivePresentationCheckpoint;
  readonly envelopes: readonly LivePresentationEnvelopeV2[];
  readonly releasedThroughSequence: number;
  readonly session: LiveSessionSnapshot;
}

export function createLiveSessionService(options: LiveSessionServiceOptions): LiveSessionService {
  const broadcastCursor = new Map<string, number>();

  async function statusOf(sessionId: string, actor: string): Promise<LivePresentationStatusData> {
    const receipt = await options.execute<LivePresentationStatusData>({
      kind: "live.presentation.status",
      input: { sessionId },
      source: "api",
      actor,
    });
    if (!Array.isArray(receipt.data.envelopes)) {
      throw new Error("live.presentation.status returned an unexpected payload");
    }
    return receipt.data;
  }

  /**
   * Deliver only envelopes past this session's broadcast cursor. Re-running a
   * command, or two commands racing, therefore cannot double-deliver: the
   * cursor is the single source of what an audience has already seen.
   */
  async function flush(sessionId: string, actor: string): Promise<void> {
    const status = await statusOf(sessionId, actor);
    const cursor = broadcastCursor.get(sessionId) ?? 0;
    const pending = status.envelopes.filter((envelope) => envelope.sequence > cursor);
    if (pending.length === 0) return;
    broadcastCursor.set(sessionId, pending[pending.length - 1]?.sequence ?? cursor);
    options.hub.broadcast(sessionId, pending);
  }

  return {
    async run(request) {
      const receipt = await options.execute(request);
      const sessionId = sessionIdOf(request.input);
      if (sessionId === undefined || receipt.policy.decision !== "allow") return receipt;
      const actor = request.actor ?? receipt.actor;
      if (request.kind === "live.presentation.publish" || request.kind === "live.session.resume") {
        await flush(sessionId, actor);
      }
      if (request.kind === "live.session.end" || request.kind === "live.session.seal") {
        options.hub.closeSession(sessionId, request.kind === "live.session.seal" ? "sealed" : "ended");
      }
      return receipt;
    },

    status: statusOf,

    async snapshot(input) {
      const status = await statusOf(input.sessionId, input.actor);
      const checkpointReceipt = await options.execute<LivePresentationCheckpoint>({
        kind: "live.presentation.checkpoint",
        input: { sessionId: input.sessionId },
        source: "api",
        actor: input.actor,
      });
      const checkpoint = __epochIsString(checkpointReceipt.data.checkpointId) ? checkpointReceipt.data : undefined;
      const after = input.afterSequence > 0 ? input.afterSequence : checkpoint?.sequence ?? 0;
      return {
        ...(checkpoint !== undefined && { checkpoint }),
        envelopes: status.envelopes.filter((envelope) => envelope.sequence > after),
        releasedThroughSequence: status.envelopes.at(-1)?.sequence ?? 0,
        session: status.session,
      };
    },

    async events(input) {
      const status = await statusOf(input.sessionId, input.actor);
      return status.envelopes
        .filter((envelope) => envelope.sequence > input.afterSequence)
        .slice(0, input.limit);
    },

    hub: options.hub,
  };
}

function sessionIdOf(input: Readonly<Record<string, DictionaryValue>> | undefined): string | undefined {
  const value = input?.sessionId;
  return __epochIsString(value) && value.trim() !== "" ? value : undefined;
}

function __epochIsString<T>(value: T): value is T & string { return typeof value === "string"; }
