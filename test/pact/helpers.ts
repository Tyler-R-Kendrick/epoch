import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { PactV3 } from "@pact-foundation/pact";

/** Durable pact output directory (checked in after consumer runs). */
export const PACT_DIR = join(process.cwd(), "pacts");

export const PactConsumers = {
  communityCore: "Epoch.Community.Core",
  epochCoreGossip: "Epoch.Core.GossipClient",
  cliLiveSpaces: "Epoch.CLI.LiveSpaceClient",
} as const;

export const PactProviders = {
  communityApi: "Epoch.Community.API",
  gossipHttp: "Epoch.Core.GossipHttp",
} as const;

export function ensurePactDir(): string {
  mkdirSync(PACT_DIR, { recursive: true });
  return PACT_DIR;
}

export function createConsumerPact(options: {
  readonly consumer: string;
  readonly provider: string;
  readonly logLevel?: "trace" | "debug" | "info" | "warn" | "error";
}): PactV3 {
  return new PactV3({
    consumer: options.consumer,
    provider: options.provider,
    dir: ensurePactDir(),
    logLevel: options.logLevel ?? "error",
  });
}

/**
 * Minimal Node HTTP server that adapts IncomingMessage to Fetch API Request
 * for handlers shaped like createCommunityApiFetchHandler.
 */
export async function startFetchHandlerServer(
  handler: (request: Request) => Promise<Response>,
  options: { readonly host?: string; readonly port?: number } = {},
): Promise<{ readonly url: string; readonly port: number; close(): Promise<void> }> {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 0;
  const server: Server = createServer((req, res) => {
    void adapt(req, res, handler).catch((error) => {
      res.statusCode = 500;
      res.setHeader("Content-Type", "text/plain");
      res.end(error instanceof Error ? error.message : String(error));
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolve());
  });

  const address = server.address();
  if (address === null || isPipeAddress(address)) {
    throw new Error("pact provider server failed to bind");
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

function isPipeAddress<Address>(address: Address): address is Address & string {
  return typeof address === "string";
}

async function adapt(
  req: IncomingMessage,
  res: ServerResponse,
  handler: (request: Request) => Promise<Response>,
): Promise<void> {
  const host = req.headers.host ?? "127.0.0.1";
  const url = new URL(req.url ?? "/", `http://${host}`);
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const body = Buffer.concat(chunks);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const entry of value) headers.append(key, entry);
    } else {
      headers.set(key, value);
    }
  }

  const init: RequestInit = {
    method: req.method,
    headers,
  };
  if (req.method !== "GET" && req.method !== "HEAD" && body.length > 0) {
    init.body = body;
  }

  const response = await handler(new Request(url, init));
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  const responseBody = Buffer.from(await response.arrayBuffer());
  res.end(responseBody);
}
