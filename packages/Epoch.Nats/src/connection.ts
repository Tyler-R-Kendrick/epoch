/**
 * Injectable NATS connection seam + in-memory bus for tests.
 * Real deployments inject nats.js / nats.ws connections with the same shape.
 */

export interface NatsMsgLike {
  readonly subject: string;
  readonly data: Uint8Array;
  readonly reply?: string;
}

export interface NatsSubscriptionLike {
  unsubscribe(): void;
  [Symbol.asyncIterator]?: () => AsyncIterator<NatsMsgLike>;
}

export interface NatsConnectionLike {
  publish(subject: string, data: Uint8Array | string): void;
  subscribe(subject: string, opts?: { callback?: (err: Error | null, msg: NatsMsgLike) => void }): NatsSubscriptionLike;
  request?(subject: string, data: Uint8Array | string, opts?: { timeout?: number }): Promise<NatsMsgLike>;
  close(): Promise<void> | void;
  isClosed?(): boolean;
}

export interface InMemoryNatsBus extends NatsConnectionLike {
  readonly connections: number;
  request(subject: string, data: Uint8Array | string, opts?: { timeout?: number }): Promise<NatsMsgLike>;
}

type Listener = (msg: NatsMsgLike) => void;

/** Multiplexed in-process NATS for Live provider and callout tests. */
export function createInMemoryNatsBus(): InMemoryNatsBus {
  const subjectListeners = new Map<string, Set<Listener>>();
  let closed = false;
  let connections = 0;

  const matchListeners = (subject: string): Listener[] => {
    const out: Listener[] = [];
    for (const [pattern, set] of subjectListeners) {
      if (subjectMatches(pattern, subject)) out.push(...set);
    }
    return out;
  };

  const createConn = (): InMemoryNatsBus => {
    connections += 1;
    const conn: InMemoryNatsBus = {
      get connections() {
        return connections;
      },
      publish(subject, data) {
        if (closed) throw new Error("nats bus closed");
        const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
        const msg: NatsMsgLike = { subject, data: bytes };
        for (const listener of matchListeners(subject)) listener(msg);
      },
      subscribe(subject, opts) {
        if (closed) throw new Error("nats bus closed");
        let set = subjectListeners.get(subject);
        if (!set) {
          set = new Set();
          subjectListeners.set(subject, set);
        }
        const listener: Listener = (msg) => {
          opts?.callback?.(null, msg);
        };
        set.add(listener);
        return {
          unsubscribe() {
            set!.delete(listener);
          },
        };
      },
      async request(subject, data, opts) {
        const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
        const reply = `_INBOX.${Math.random().toString(36).slice(2)}`;
        return await new Promise<NatsMsgLike>((resolve, reject) => {
          const timer = setTimeout(() => {
            sub.unsubscribe();
            reject(new Error("nats request timeout"));
          }, opts?.timeout ?? 2000);
          const sub = conn.subscribe(reply, {
            callback(_err, msg) {
              clearTimeout(timer);
              sub.unsubscribe();
              resolve(msg);
            },
          });
          const requestMsg: NatsMsgLike = { subject, data: bytes, reply };
          for (const listener of matchListeners(subject)) listener(requestMsg);
        });
      },
      close() {
        closed = true;
        subjectListeners.clear();
      },
      isClosed() {
        return closed;
      },
    };
    return conn;
  };

  return createConn();
}

/**
 * Gate an in-memory bus connect: gate must succeed before a bus is returned.
 * Use with `attachAuthCalloutService` by having `gate` invoke the AUTH handler.
 * Gate false/throws → Error("nats connect denied").
 */
export async function connectGatedNatsBus(
  createBus: () => InMemoryNatsBus,
  gate: (token: string) => Promise<boolean> | boolean,
  token: string,
): Promise<InMemoryNatsBus> {
  if (typeof token !== "string") {
    throw new Error("nats connect denied");
  }
  const presented = token.trim();
  if (presented.length === 0) {
    throw new Error("nats connect denied");
  }
  let allowed: boolean;
  try {
    allowed = await gate(presented);
  } catch {
    throw new Error("nats connect denied");
  }
  if (!allowed) {
    throw new Error("nats connect denied");
  }
  return createBus();
}

/**
 * Adapt a NATS connection into a LiveChannel (string JSON wire messages).
 * Subjects carry opaque sync/presence payloads; Epoch still verifies.
 */
export function createNatsLiveChannel(
  nc: NatsConnectionLike,
  subjects: { readonly sync: string; readonly presence: string },
): {
  readonly channel: {
    send(data: string): void;
    onMessage(listener: (data: string) => void): void;
    close(): void;
  };
  readonly stop: () => void;
} {
  const listeners = new Set<(data: string) => void>();
  const deliver = (msg: NatsMsgLike) => {
    const text = new TextDecoder().decode(msg.data);
    for (const listener of listeners) listener(text);
  };
  const syncSub = nc.subscribe(subjects.sync, { callback: (_e, msg) => deliver(msg) });
  const presenceSub = nc.subscribe(subjects.presence, { callback: (_e, msg) => deliver(msg) });

  return {
    channel: {
      send(data: string) {
        let subject = subjects.sync;
        try {
          const parsed = JSON.parse(data) as { type?: string };
          if (parsed.type === "presence") subject = subjects.presence;
        } catch {
          /* treat as sync */
        }
        nc.publish(subject, data);
      },
      onMessage(listener) {
        listeners.add(listener);
      },
      close() {
        syncSub.unsubscribe();
        presenceSub.unsubscribe();
        listeners.clear();
      },
    },
    stop() {
      syncSub.unsubscribe();
      presenceSub.unsubscribe();
      listeners.clear();
    },
  };
}

function subjectMatches(pattern: string, subject: string): boolean {
  if (pattern === subject) return true;
  const parts = pattern.split(".");
  const sub = subject.split(".");
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p === ">") return true;
    if (p === "*") {
      if (sub[i] === undefined) return false;
      continue;
    }
    if (p !== sub[i]) return false;
  }
  return parts.length === sub.length;
}
