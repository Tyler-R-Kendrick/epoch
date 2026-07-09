import type { LiveEvent } from "./log";

export type LiveProviderStatus = "connecting" | "online" | "offline";

export interface PresenceMessage {
  readonly clientId: string;
  readonly author: string;
  readonly state: Record<string, unknown>;
  readonly seq: number;
  readonly left?: boolean;
}

/**
 * The seam a store exposes to a provider. A provider only moves bytes; it never
 * decides trust. `ingestEvents` runs verification (via the underlying log) and
 * returns how many events were actually applied.
 */
export interface LiveSyncEndpoint {
  readonly clientId: string;
  exportEvents(): readonly LiveEvent[];
  ingestEvents(events: readonly LiveEvent[]): number;
  onLocalEvents(listener: (events: readonly LiveEvent[]) => void): () => void;
  exportPresence(): PresenceMessage | undefined;
  ingestPresence(message: PresenceMessage): void;
  onLocalPresence(listener: (message: PresenceMessage) => void): () => void;
}

export interface LiveProvider {
  readonly id: string;
  connect(endpoint: LiveSyncEndpoint): void;
  disconnect(): void;
  status(): LiveProviderStatus;
}

export type WireMessage =
  | { readonly type: "sync"; readonly events: readonly LiveEvent[] }
  | { readonly type: "presence"; readonly presence: PresenceMessage }
  | { readonly type: "hello"; readonly from: string };

// ---------------------------------------------------------------------------
// In-memory relay — same-process convergence, used for tests and Node examples.
// ---------------------------------------------------------------------------

export interface LiveRelay {
  join(endpoint: LiveSyncEndpoint): () => void;
  size(): number;
}

export function createInMemoryRelay(): LiveRelay {
  const members = new Set<LiveSyncEndpoint>();
  const cleanups = new Map<LiveSyncEndpoint, () => void>();

  function join(endpoint: LiveSyncEndpoint): () => void {
    for (const other of members) {
      endpoint.ingestEvents(other.exportEvents());
      other.ingestEvents(endpoint.exportEvents());
      const remotePresence = other.exportPresence();
      if (remotePresence !== undefined) endpoint.ingestPresence(remotePresence);
      const localPresence = endpoint.exportPresence();
      if (localPresence !== undefined) other.ingestPresence(localPresence);
    }
    members.add(endpoint);

    const offEvents = endpoint.onLocalEvents((events) => {
      for (const other of members) if (other !== endpoint) other.ingestEvents(events);
    });
    const offPresence = endpoint.onLocalPresence((message) => {
      for (const other of members) if (other !== endpoint) other.ingestPresence(message);
    });
    cleanups.set(endpoint, () => {
      offEvents();
      offPresence();
    });

    return () => leave(endpoint);
  }

  function leave(endpoint: LiveSyncEndpoint): void {
    cleanups.get(endpoint)?.();
    cleanups.delete(endpoint);
    members.delete(endpoint);
    const farewell = presenceLeaveMessage(endpoint);
    if (farewell === undefined) return;
    for (const other of members) other.ingestPresence(farewell);
  }

  return {
    join,
    size: () => members.size,
  };
}

export function createInMemoryRelayProvider(relay: LiveRelay, id = "relay"): LiveProvider {
  let leave: (() => void) | undefined;
  let status: LiveProviderStatus = "offline";
  return {
    id,
    connect(endpoint) {
      leave = relay.join(endpoint);
      status = "online";
    },
    disconnect() {
      leave?.();
      leave = undefined;
      status = "offline";
    },
    status: () => status,
  };
}

// ---------------------------------------------------------------------------
// BroadcastChannel — same-origin, cross-tab convergence in the browser.
// ---------------------------------------------------------------------------

export interface LiveBroadcastChannel {
  postMessage(message: unknown): void;
  close(): void;
  onmessage: ((event: { data: unknown }) => void) | null;
}

export interface BroadcastChannelProviderOptions {
  readonly channelName?: string;
  readonly channelFactory?: (name: string) => LiveBroadcastChannel;
  readonly id?: string;
}

export function createBroadcastChannelProvider(options: BroadcastChannelProviderOptions = {}): LiveProvider {
  const name = options.channelName ?? "epoch-live";
  const factory = options.channelFactory ?? defaultBroadcastChannelFactory;
  let channel: LiveBroadcastChannel | undefined;
  let connected: LiveSyncEndpoint | undefined;
  let status: LiveProviderStatus = "offline";
  let offLocal: (() => void) | undefined;

  return {
    id: options.id ?? `broadcast:${name}`,
    connect(endpoint) {
      status = "connecting";
      connected = endpoint;
      channel = factory(name);
      channel.onmessage = (event) => handleWireMessage(endpoint, event.data, (message) => channel?.postMessage(message));
      offLocal = wireLocalOutput(endpoint, (message) => channel?.postMessage(message));
      channel.postMessage({ type: "hello", from: endpoint.clientId } satisfies WireMessage);
      channel.postMessage({ type: "sync", events: endpoint.exportEvents() } satisfies WireMessage);
      status = "online";
    },
    disconnect() {
      const farewell = connected === undefined ? undefined : presenceLeaveMessage(connected);
      if (farewell !== undefined) channel?.postMessage({ type: "presence", presence: farewell } satisfies WireMessage);
      offLocal?.();
      offLocal = undefined;
      channel?.close();
      channel = undefined;
      connected = undefined;
      status = "offline";
    },
    status: () => status,
  };
}

function defaultBroadcastChannelFactory(name: string): LiveBroadcastChannel {
  const ctor = (globalThis as { BroadcastChannel?: new (name: string) => LiveBroadcastChannel }).BroadcastChannel;
  if (ctor === undefined) {
    throw new Error("BroadcastChannel is unavailable; pass channelFactory for this host.");
  }
  return new ctor(name);
}

// ---------------------------------------------------------------------------
// Duplex channel — WebSocket relay and WebRTC data channels share one adapter.
// ---------------------------------------------------------------------------

export interface LiveChannel {
  send(data: string): void;
  onMessage(listener: (data: string) => void): void;
  close(): void;
}

export function createChannelProvider(channel: LiveChannel, id = "channel"): LiveProvider {
  let connected: LiveSyncEndpoint | undefined;
  let status: LiveProviderStatus = "offline";
  let offLocal: (() => void) | undefined;

  return {
    id,
    connect(endpoint) {
      status = "connecting";
      connected = endpoint;
      channel.onMessage((data) => {
        const parsed = safeParse(data);
        if (parsed !== undefined) handleWireMessage(endpoint, parsed, (message) => channel.send(JSON.stringify(message)));
      });
      offLocal = wireLocalOutput(endpoint, (message) => channel.send(JSON.stringify(message)));
      channel.send(JSON.stringify({ type: "hello", from: endpoint.clientId } satisfies WireMessage));
      channel.send(JSON.stringify({ type: "sync", events: endpoint.exportEvents() } satisfies WireMessage));
      status = "online";
    },
    disconnect() {
      const farewell = connected === undefined ? undefined : presenceLeaveMessage(connected);
      if (farewell !== undefined) channel.send(JSON.stringify({ type: "presence", presence: farewell } satisfies WireMessage));
      offLocal?.();
      offLocal = undefined;
      channel.close();
      connected = undefined;
      status = "offline";
    },
    status: () => status,
  };
}

export function createWebSocketRelayProvider(channel: LiveChannel, id = "websocket"): LiveProvider {
  return createChannelProvider(channel, id);
}

export function createWebRTCProvider(channel: LiveChannel, id = "webrtc"): LiveProvider {
  return createChannelProvider(channel, id);
}

// ---------------------------------------------------------------------------
// Shared wiring for channel-style providers.
// ---------------------------------------------------------------------------

/** A leave notice: same client and a bumped sequence so peers evict the entry. */
function presenceLeaveMessage(endpoint: LiveSyncEndpoint): PresenceMessage | undefined {
  const current = endpoint.exportPresence();
  if (current === undefined) return undefined;
  return { ...current, state: {}, seq: current.seq + 1, left: true };
}

function wireLocalOutput(endpoint: LiveSyncEndpoint, send: (message: WireMessage) => void): () => void {
  const offEvents = endpoint.onLocalEvents((events) => send({ type: "sync", events }));
  const offPresence = endpoint.onLocalPresence((presence) => send({ type: "presence", presence }));
  return () => {
    offEvents();
    offPresence();
  };
}

function handleWireMessage(
  endpoint: LiveSyncEndpoint,
  data: unknown,
  reply: (message: WireMessage) => void,
): void {
  const message = data as WireMessage;
  if (message === null || typeof message !== "object" || !("type" in message)) return;
  if (message.type === "sync") {
    endpoint.ingestEvents(message.events);
  } else if (message.type === "presence") {
    endpoint.ingestPresence(message.presence);
  } else if (message.type === "hello" && message.from !== endpoint.clientId) {
    reply({ type: "sync", events: endpoint.exportEvents() });
    const presence = endpoint.exportPresence();
    if (presence !== undefined) reply({ type: "presence", presence });
  }
}

function safeParse(data: string): unknown {
  try {
    return JSON.parse(data);
  } catch {
    return undefined;
  }
}
