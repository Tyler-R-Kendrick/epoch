import {
  createLiveSpectatorProjection,
  type LiveApplyResult,
  type LiveSpectatorProjection,
} from "./presentation-log";
import type { LivePresentationCheckpoint, LivePresentationEnvelopeV2 } from "./contracts";


/**
 * The provider-neutral semantic transport.
 *
 * A transport moves bytes and nothing else: it never decides trust, never
 * reorders, and never becomes the authority for what a spectator saw. Ordering
 * comes from the envelope sequence, verification from the payload digest, and
 * recovery from checkpoints — so a dropped connection, a duplicated frame, or a
 * hostile relay all converge to the same projection or refuse to.
 */

export interface LivePresentationSnapshot {
  /** The most recent checkpoint, absent before the first one is recorded. */
  readonly checkpoint?: LivePresentationCheckpoint;
  readonly envelopes: readonly LivePresentationEnvelopeV2[];
  readonly releasedThroughSequence: number;
}

export interface LiveTransportSubscription {
  close(): void;
}

export type LiveTransportConnection = "idle" | "connecting" | "open" | "recovering" | "closed" | "failed";

export interface LiveTransportStatusEvent {
  readonly connection: LiveTransportConnection;
  readonly reason?: string;
}

export interface LivePresentationTransport {
  /** Late join: the last checkpoint plus everything released after it. */
  snapshot(input: { readonly sessionId: string; readonly afterSequence?: number }): Promise<LivePresentationSnapshot>;
  /** Ordered delta fetch used for gap recovery and cursor resume. */
  events(input: {
    readonly sessionId: string;
    readonly afterSequence: number;
    readonly limit?: number;
  }): Promise<readonly LivePresentationEnvelopeV2[]>;
  subscribe(input: {
    readonly sessionId: string;
    readonly afterSequence: number;
    readonly onEnvelope: (envelope: LivePresentationEnvelopeV2) => void;
    readonly onStatus?: (status: LiveTransportStatusEvent) => void;
  }): LiveTransportSubscription;
}

// --------------------------------------------------------- in-memory transport

export interface InMemoryLiveTransport extends LivePresentationTransport {
  /** Publish released envelopes to every open subscriber, in sequence order. */
  push(sessionId: string, envelopes: readonly LivePresentationEnvelopeV2[]): void;
  /** Record envelopes as released without delivering them, simulating loss. */
  withhold(sessionId: string, envelopes: readonly LivePresentationEnvelopeV2[]): void;
  recordCheckpoint(sessionId: string, checkpoint: LivePresentationCheckpoint): void;
  /** Simulate a transport failure: subscribers are dropped without new data. */
  dropSubscribers(sessionId: string, reason: string): void;
  subscriberCount(sessionId: string): number;
}

interface SessionChannel {
  readonly envelopes: LivePresentationEnvelopeV2[];
  checkpoint?: LivePresentationCheckpoint;
  readonly subscribers: Set<{
    readonly onEnvelope: (envelope: LivePresentationEnvelopeV2) => void;
    readonly onStatus?: (status: LiveTransportStatusEvent) => void;
  }>;
}

/**
 * Deterministic transport for unit, feature, and contract tests, and for
 * same-process host/spectator composition. It has no network, no clock, and no
 * hidden ordering: what was pushed is what is delivered.
 */
export function createInMemoryLiveTransport(options: { readonly deliverDuplicates?: boolean } = {}): InMemoryLiveTransport {
  const channels = new Map<string, SessionChannel>();

  function channel(sessionId: string): SessionChannel {
    const existing = channels.get(sessionId);
    if (existing !== undefined) return existing;
    const created: SessionChannel = { envelopes: [], subscribers: new Set() };
    channels.set(sessionId, created);
    return created;
  }

  return {
    snapshot(input) {
      const session = channel(input.sessionId);
      const after = input.afterSequence ?? session.checkpoint?.sequence ?? 0;
      return Promise.resolve({
        ...(session.checkpoint !== undefined && { checkpoint: session.checkpoint }),
        envelopes: session.envelopes.filter((envelope) => envelope.sequence > after),
        releasedThroughSequence: session.envelopes.at(-1)?.sequence ?? 0,
      });
    },

    events(input) {
      const session = channel(input.sessionId);
      const limit = input.limit ?? 512;
      return Promise.resolve(session.envelopes
        .filter((envelope) => envelope.sequence > input.afterSequence)
        .slice(0, limit));
    },

    subscribe(input) {
      const session = channel(input.sessionId);
      const subscriber = {
        onEnvelope: input.onEnvelope,
        ...(input.onStatus !== undefined && { onStatus: input.onStatus }),
      };
      session.subscribers.add(subscriber);
      input.onStatus?.({ connection: "open" });
      for (const envelope of session.envelopes) {
        if (envelope.sequence > input.afterSequence) input.onEnvelope(envelope);
      }
      return {
        close(): void {
          session.subscribers.delete(subscriber);
        },
      };
    },

    push(sessionId, envelopes) {
      const session = channel(sessionId);
      for (const envelope of envelopes) {
        const known = session.envelopes.some((item) => item.sequence === envelope.sequence);
        if (!known) session.envelopes.push(envelope);
        if (known && options.deliverDuplicates !== true) continue;
        for (const subscriber of session.subscribers) subscriber.onEnvelope(envelope);
      }
      session.envelopes.sort((left, right) => left.sequence - right.sequence);
    },

    /** Frames the host released that never reached this subscriber — a real gap. */
    withhold(sessionId, envelopes) {
      const session = channel(sessionId);
      for (const envelope of envelopes) {
        if (!session.envelopes.some((item) => item.sequence === envelope.sequence)) {
          session.envelopes.push(envelope);
        }
      }
      session.envelopes.sort((left, right) => left.sequence - right.sequence);
    },

    recordCheckpoint(sessionId, checkpoint) {
      channel(sessionId).checkpoint = checkpoint;
    },

    dropSubscribers(sessionId, reason) {
      const session = channel(sessionId);
      for (const subscriber of session.subscribers) {
        subscriber.onStatus?.({ connection: "failed", reason });
      }
      session.subscribers.clear();
    },

    subscriberCount(sessionId) {
      return channel(sessionId).subscribers.size;
    },
  };
}

// ------------------------------------------------------------------- client

export interface LivePresentationClientState {
  readonly connection: LiveTransportConnection;
  readonly lastSequence: number;
  readonly lastCheckpointId?: string;
  readonly appliedCount: number;
  readonly quarantinedCount: number;
  readonly gapRecoveries: number;
  readonly reconnectAttempts: number;
  /** True while the projection is known to trail the host's released state. */
  readonly stale: boolean;
}

export interface LivePresentationClientOptions {
  readonly sessionId: string;
  readonly transport: LivePresentationTransport;
  /** Injected timer so backoff is deterministic in tests; returns a cancel handle. */
  readonly schedule: (delayMs: number, callback: () => void) => () => void;
  /** Injected jitter source in [0,1); never Math.random in product code paths under test. */
  readonly jitter?: () => number;
  readonly baseBackoffMs?: number;
  readonly maxBackoffMs?: number;
  readonly maxReconnectAttempts?: number;
  readonly onChange?: (state: LivePresentationClientState) => void;
}

export interface LivePresentationClient {
  /** Fetch the checkpoint, apply deltas, then subscribe for live updates. */
  start(): Promise<LivePresentationClientState>;
  /** Force a checkpoint-based resynchronization, discarding no applied state. */
  resync(): Promise<LivePresentationClientState>;
  projection(): LiveSpectatorProjection;
  state(): LivePresentationClientState;
  stop(): void;
}

const DEFAULT_BASE_BACKOFF_MS = 500;
const DEFAULT_MAX_BACKOFF_MS = 30_000;
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 6;

/**
 * The spectator's connection manager.
 *
 * It owns exactly one projection and drives it through late join, live
 * delivery, gap recovery, and bounded reconnect. Nothing it receives is trusted
 * on arrival: every envelope goes through the same verifying projection, so a
 * transport that replays, reorders, or forges frames changes the client's
 * *health*, never its history.
 */
export function createLivePresentationClient(options: LivePresentationClientOptions): LivePresentationClient {
  const projection = createLiveSpectatorProjection({ sessionId: options.sessionId });
  const baseBackoffMs = options.baseBackoffMs ?? DEFAULT_BASE_BACKOFF_MS;
  const maxBackoffMs = options.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS;
  const maxReconnectAttempts = options.maxReconnectAttempts ?? DEFAULT_MAX_RECONNECT_ATTEMPTS;
  let connection: LiveTransportConnection = "idle";
  let subscription: LiveTransportSubscription | undefined;
  let cancelRetry: (() => void) | undefined;
  let lastCheckpointId: string | undefined;
  let gapRecoveries = 0;
  let reconnectAttempts = 0;
  let stale = false;
  let stopped = false;
  let recovering = false;

  function snapshotState(): LivePresentationClientState {
    const state = projection.state();
    return {
      connection,
      lastSequence: state.lastSequence,
      ...(lastCheckpointId !== undefined && { lastCheckpointId }),
      appliedCount: state.appliedCount,
      quarantinedCount: state.quarantinedCount,
      gapRecoveries,
      reconnectAttempts,
      stale,
    };
  }

  function emit(): LivePresentationClientState {
    const state = snapshotState();
    options.onChange?.(state);
    return state;
  }

  function setConnection(next: LiveTransportConnection): void {
    connection = next;
    emit();
  }

  async function hydrate(): Promise<void> {
    const snapshot = await options.transport.snapshot({
      sessionId: options.sessionId,
      afterSequence: projection.state().lastSequence,
    });
    if (snapshot.checkpoint !== undefined) {
      lastCheckpointId = snapshot.checkpoint.checkpointId;
      projection.resyncFrom(snapshot.checkpoint, snapshot.envelopes);
    } else {
      for (const envelope of snapshot.envelopes) projection.apply(envelope);
    }
    stale = projection.state().lastSequence < snapshot.releasedThroughSequence;
  }

  /**
   * A gap means frames were lost between us and the host. Refetching the exact
   * missing range is cheaper than a full resync and keeps the applied prefix
   * intact; only a refetch that still cannot close the gap escalates.
   */
  async function recoverGap(): Promise<void> {
    if (recovering || stopped) return;
    recovering = true;
    try {
      gapRecoveries += 1;
      setConnection("recovering");
      const missing = await options.transport.events({
        sessionId: options.sessionId,
        afterSequence: projection.state().lastSequence,
      });
      for (const envelope of missing) projection.apply(envelope);
      if (projection.state().pendingCount > 0) await hydrate();
      stale = projection.state().pendingCount > 0;
      setConnection(subscription === undefined ? "idle" : "open");
    } finally {
      recovering = false;
    }
  }

  function handle(envelope: LivePresentationEnvelopeV2): void {
    const result: LiveApplyResult = projection.apply(envelope);
    if (result.kind === "gap") {
      void recoverGap();
      return;
    }
    if (result.kind === "applied") stale = false;
    emit();
  }

  function scheduleReconnect(reason: string): void {
    if (stopped) return;
    if (reconnectAttempts >= maxReconnectAttempts) {
      connection = "failed";
      stale = true;
      emit();
      return;
    }
    reconnectAttempts += 1;
    // Exponential backoff with jitter, bounded — a flapping relay never turns
    // into a reconnect storm against the host.
    const jitter = (options.jitter ?? (() => 0.5))();
    const delay = Math.min(maxBackoffMs, baseBackoffMs * 2 ** (reconnectAttempts - 1)) * (0.5 + jitter / 2);
    connection = "recovering";
    stale = true;
    emit();
    cancelRetry = options.schedule(Math.round(delay), () => {
      void reconnect(reason);
    });
  }

  async function reconnect(reason: string): Promise<void> {
    if (stopped) return;
    try {
      await hydrate();
      openSubscription();
      reconnectAttempts = 0;
    } catch {
      scheduleReconnect(reason);
    }
  }

  function openSubscription(): void {
    subscription?.close();
    subscription = options.transport.subscribe({
      sessionId: options.sessionId,
      afterSequence: projection.state().lastSequence,
      onEnvelope: handle,
      onStatus: (status) => {
        if (status.connection === "failed" || status.connection === "closed") {
          subscription = undefined;
          scheduleReconnect(status.reason ?? status.connection);
          return;
        }
        setConnection(status.connection);
      },
    });
    setConnection("open");
  }

  return {
    async start(): Promise<LivePresentationClientState> {
      setConnection("connecting");
      await hydrate();
      openSubscription();
      return emit();
    },

    async resync(): Promise<LivePresentationClientState> {
      await hydrate();
      return emit();
    },

    projection(): LiveSpectatorProjection { return projection; },
    state(): LivePresentationClientState { return snapshotState(); },

    stop(): void {
      stopped = true;
      cancelRetry?.();
      subscription?.close();
      subscription = undefined;
      setConnection("closed");
    },
  };
}
