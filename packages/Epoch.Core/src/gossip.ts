import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import {
  EpochRepository,
  MemoryEpochTransport,
  type GossipPeer,
  type MemoryEpochTransportSnapshot,
  type SyncResult,
} from "./core";
import { EventDataSchema } from "./domain";
import { isRecord, type JsonValue } from "./json";

export type { GossipPeer } from "./core";

/**
 * EpochTransport wrapper around a network-fetched snapshot.
 * Use after GossipPeer.exchange to feed syncWithTransport.
 */
export class NetworkEpochTransport {
  constructor(readonly snapshot: MemoryEpochTransportSnapshot) {}

  exportSnapshot(): MemoryEpochTransportSnapshot {
    return this.snapshot;
  }

  toMemoryTransport(): MemoryEpochTransport {
    return new MemoryEpochTransport(this.snapshot);
  }

  static async exchangeWith(
    peer: GossipPeer,
    local: MemoryEpochTransportSnapshot,
  ): Promise<NetworkEpochTransport> {
    const remote = await peer.exchange(local);
    return new NetworkEpochTransport(parseSnapshot(remote));
  }
}

/** In-process peer backed by an Epoch repository (tests + same-host). */
export class LocalGossipPeer implements GossipPeer {
  constructor(readonly repository: EpochRepository) {}

  async exchange(snapshot: MemoryEpochTransportSnapshot): Promise<MemoryEpochTransportSnapshot> {
    this.repository.syncWithTransport(new MemoryEpochTransport(parseSnapshot(snapshot)));
    return this.repository.exportToMemoryTransport().exportSnapshot();
  }
}

/** HTTP client peer: POST /epoch/gossip with local snapshot, receive peer snapshot. */
export class HttpGossipPeer implements GossipPeer {
  constructor(
    readonly baseUrl: string,
    readonly fetchImpl: typeof fetch = globalThis.fetch.bind(globalThis),
  ) {}

  async exchange(snapshot: MemoryEpochTransportSnapshot): Promise<MemoryEpochTransportSnapshot> {
    const url = gossipUrl(this.baseUrl);
    const response = await this.fetchImpl(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(snapshot),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`gossip peer request failed (${response.status}): ${text}`);
    }
    const body = await response.json();
    return parseSnapshot(body);
  }
}

export interface GossipServer {
  readonly url: string;
  readonly port: number;
  close(): Promise<void>;
}

/**
 * Serve bidirectional snapshot gossip for a repository.
 * POST /epoch/gossip — apply inbound snapshot, return local snapshot.
 * GET /health — liveness.
 */
export async function startGossipServer(
  repository: EpochRepository,
  options: { readonly host?: string; readonly port?: number } = {},
): Promise<GossipServer> {
  if (!repository.isInitialized()) {
    throw new Error("gossip server requires an initialized Epoch repository");
  }
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 0;

  const server: Server = createServer((req, res) => {
    void handleGossipHttp(req, res, repository).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "text/plain");
      }
      res.end(message);
    });
  });

  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolveListen());
  });

  const address = server.address();
  if (address === null || isString(address)) {
    throw new Error("gossip server failed to bind");
  }

  return {
    url: `http://${host}:${address.port}`,
    port: address.port,
    close: () =>
      new Promise((resolveClose, reject) => {
        server.close((error) => (error ? reject(error) : resolveClose()));
      }),
  };
}

async function handleGossipHttp(
  req: IncomingMessage,
  res: ServerResponse,
  repository: EpochRepository,
): Promise<void> {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (req.method === "GET" && (url.pathname === "/health" || url.pathname === "/")) {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: true, heads: repository.heads() }));
    return;
  }

  if (req.method === "POST" && (url.pathname === "/epoch/gossip" || url.pathname === "/gossip")) {
    const raw = await readJsonBody(req);
    const inbound = parseSnapshot(raw);
    repository.syncWithTransport(new MemoryEpochTransport(inbound));
    const outbound = repository.exportToMemoryTransport().exportSnapshot();
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Connection", "close");
    res.end(JSON.stringify(outbound));
    return;
  }

  res.statusCode = 404;
  res.end("not found");
}

/** Bidirectional gossip with a GossipPeer via repository.gossipExchange. */
export async function gossipWithPeer(
  repository: EpochRepository,
  peer: GossipPeer,
  peerLabel = "peer",
): Promise<SyncResult> {
  return repository.gossipExchange(peer, peerLabel);
}

/** Convenience: gossip with an HTTP peer URL. */
export async function gossipWithUrl(
  repository: EpochRepository,
  peerUrl: string,
  fetchImpl?: typeof fetch,
): Promise<SyncResult> {
  const peer = new HttpGossipPeer(peerUrl, fetchImpl);
  return gossipWithPeer(repository, peer, peerUrl);
}

export function parseSnapshot<Value>(value: Value): MemoryEpochTransportSnapshot {
  if (!isRecord(value)) throw new Error("invalid gossip snapshot");
  const events = Array.isArray(value.events)
    ? value.events.map((event) => EventDataSchema.parse(event))
    : [];
  const blobs =
    isStringRecord(value.blobs)
      ? value.blobs
      : {};
  const heads =
    Array.isArray(value.heads) && value.heads.every(isString)
      ? value.heads
      : [];
  return { events, blobs, heads };
}

function gossipUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/$/, "");
  if (trimmed.endsWith("/epoch/gossip") || trimmed.endsWith("/gossip")) return trimmed;
  return `${trimmed}/epoch/gossip`;
}

function readJsonBody(req: IncomingMessage): Promise<JsonValue> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => {
      try {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve(text.length === 0 ? {} : JSON.parse(text));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function isString<Value>(value: Value): value is Value & string {
  return typeof value === "string";
}

function isStringRecord<Value>(value: Value): value is Value & Record<string, string> {
  return isRecord(value) && Object.values(value).every(isString);
}
