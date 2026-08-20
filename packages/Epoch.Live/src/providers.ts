import type { LiveEvent } from "./log";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };
function __epochIsString<T>(value: T): value is T & string { return typeof value === "string"; }
function __epochIsFunction<T>(value: T): value is T & ((...args: never[]) => BoundaryValue) { return typeof value === "function"; }
function __epochIsObject<T>(value: T): value is T & object { return typeof value === "object"; }


export type LiveProviderStatus = "connecting" | "online" | "offline";

export interface PresenceMessage {
  readonly clientId: string;
  readonly author: string;
  readonly state: Record<string, DictionaryValue>;
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
  postMessage(message: BoundaryValue): void;
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
      // SAFETY: BroadcastChannel delivers JSON-shaped wire messages validated by handleWireMessage.
      channel.onmessage = (event) => handleWireMessage(endpoint, event.data as BoundaryValue, (message) => channel?.postMessage(message));
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
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
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

/**
 * NATS Live provider (ADR-0054). Dumb fan-out wrapper: pass a LiveChannel
 * already opened through `@epoch/nats` `openAuthenticatedNatsLiveChannel`
 * (or `createNatsLiveChannel` after a gated connect). ingestEvents still
 * verifies signatures. This function does not authenticate.
 */
export function createNatsLiveProvider(channel: LiveChannel, id = "nats"): LiveProvider {
  return createChannelProvider(channel, id);
}

/**
 * Open a NATS Live provider only after `connect(fabricSecret)` succeeds.
 * Missing/invalid secrets must throw from `connect` (or here if the secret
 * is empty) — the provider is never returned in an anonymous online state.
 */
export async function createAuthenticatedNatsLiveProvider(input: {
  readonly repoId: string;
  readonly fabricSecret: string;
  readonly connect: (secret: string) => Promise<{ channel: LiveChannel; stop(): void }>;
}): Promise<LiveProvider> {
  const secret = input.fabricSecret;
  if (!__epochIsString(secret) || secret.trim().length === 0) {
    throw new Error("nats connect denied");
  }
  if (!__epochIsString(input.repoId) || input.repoId.trim().length === 0) {
    throw new Error("nats connect denied");
  }
  const opened = await input.connect(secret);
  if (!opened || !opened.channel || !__epochIsFunction(opened.channel.send)) {
    throw new Error("nats connect denied");
  }
  const inner = createNatsLiveProvider(opened.channel, `nats:${input.repoId}`);
  return {
    id: inner.id,
    connect(endpoint) {
      inner.connect(endpoint);
    },
    disconnect() {
      inner.disconnect();
      opened.stop?.();
    },
    status: () => inner.status(),
  };
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
  data: BoundaryValue,
  reply: (message: WireMessage) => void,
): void {
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  const message = data as WireMessage;
  if (message === null || !__epochIsObject(message) || !("type" in message)) return;
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

function safeParse(data: string): BoundaryValue {
  try {
    return JSON.parse(data);
  } catch {
    return undefined;
  }
}
