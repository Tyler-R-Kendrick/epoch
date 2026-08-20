import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvasClusterNode, type CanvasClusterNode } from "./backend.js";
import type { CanvasClusterGossipRequest, EpochVfsSnapshot } from "./domain.js";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };
function __epochIsString<T>(value: T): value is T & string { return typeof value === "string"; }


export interface CanvasSampleServerOptions {
  readonly dataDir?: string;
  readonly host?: string;
  readonly port?: number;
  readonly staticDir?: string;
  readonly participantId?: string;
}

export interface CanvasSampleRequestHandler {
  readonly cluster: CanvasClusterNode;
  handle(request: IncomingMessage, response: ServerResponse): Promise<void>;
}

export function createCanvasSampleRequestHandler(options: CanvasSampleServerOptions = {}): CanvasSampleRequestHandler {
  const staticDir = resolve(options.staticDir ?? defaultStaticDir());
  const cluster = createCanvasClusterNode({
    dataDir: resolve(options.dataDir ?? defaultDataDir()),
    participantId: options.participantId,
  });

  async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    try {
      const url = new URL(request.url ?? "/", "http://localhost");
      if (url.pathname.startsWith("/api/")) {
        await handleApi(request, response, url.pathname, cluster);
        return;
      }
      serveStaticFile(response, staticDir, url.pathname, request.method === "HEAD");
    } catch (error) {
      writeJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  return { cluster, handle };
}

export function startCanvasSampleServer(options: CanvasSampleServerOptions = {}): void {
  const handler = createCanvasSampleRequestHandler(options);
  const host = options.host ?? process.env.HOST ?? "127.0.0.1";
  const port = options.port ?? Number.parseInt(process.env.PORT ?? "4173", 10);
  const server = createServer((request, response) => {
    void handler.handle(request, response);
  });
  server.listen(port, host, () => {
    console.log(`Epoch canvas sample listening on http://${host}:${port}`);
  });
}

async function handleApi(
  request: IncomingMessage,
  response: ServerResponse,
  path: string,
  cluster: CanvasClusterNode,
): Promise<void> {
  if (request.method === "GET" && path === "/api/cluster") {
    writeJson(response, 200, cluster.state());
    return;
  }

  if (request.method === "POST" && path === "/api/agent") {
    const body = await readJsonBody(request);
    const prompt = isRecord(body) && __epochIsString(body.prompt) ? body.prompt : "";
    cluster.commitAgentPrompt(prompt);
    writeJson(response, 200, cluster.state());
    return;
  }

  if (request.method === "POST" && path === "/api/gossip") {
    const body = asGossipRequest(await readJsonBody(request));
    writeJson(response, 200, cluster.gossipWithBrowserSnapshot(body.snapshot));
    return;
  }

  writeJson(response, 404, { error: "unknown Epoch sample API route" });
}

function serveStaticFile(response: ServerResponse, staticDir: string, pathname: string, headOnly: boolean): void {
  const filePath = resolveStaticPath(staticDir, pathname);
  if (filePath === undefined) {
    writeJson(response, 403, { error: "invalid static path" });
    return;
  }

  const fallback = join(staticDir, "index.html");
  const target = existsSync(filePath) && statSync(filePath).isFile() ? filePath : fallback;
  if (!existsSync(target) || !statSync(target).isFile()) {
    writeJson(response, 404, { error: "build the sample client before starting the server" });
    return;
  }

  response.writeHead(200, { "content-type": contentType(target) });
  if (!headOnly) response.end(readFileSync(target));
  else response.end();
}

function resolveStaticPath(staticDir: string, pathname: string): string | undefined {
  const decoded = decodeURIComponent(pathname);
  const relativePath = decoded === "/" ? "index.html" : decoded.replace(/^\/+/u, "");
  const absolute = resolve(staticDir, relativePath);
  const fromRoot = relative(staticDir, absolute);
  if (fromRoot === ".." || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) return undefined;
  return absolute;
}

async function readJsonBody(request: IncomingMessage): Promise<BoundaryValue> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(__epochIsString(chunk) ? Buffer.from(chunk) : chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  // SAFETY: Request bodies are JSON at the HTTP boundary for this sample server.
  return text.length === 0 ? {} : JSON.parse(text) as BoundaryValue;
}

function asGossipRequest(value: BoundaryValue): CanvasClusterGossipRequest {
  if (!isRecord(value) || !__epochIsString(value.participantId) || !isEpochVfsSnapshot(value.snapshot)) {
    throw new Error("invalid Epoch gossip request");
  }
  return {
    participantId: value.participantId,
    snapshot: value.snapshot,
  };
}

function isEpochVfsSnapshot(value: BoundaryValue): value is EpochVfsSnapshot {
  return isRecord(value)
    && Array.isArray(value.files)
    && value.files.every((file) => isRecord(file) && __epochIsString(file.path) && __epochIsString(file.content));
}

function writeJson(response: ServerResponse, status: number, value: BoundaryValue): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(value));
}

function contentType(path: string): string {
  switch (extname(path)) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

function defaultDataDir(): string {
  return resolve(process.cwd(), ".epoch", "samples", "self-evolving-canvas");
}

function defaultStaticDir(): string {
  return fileURLToPath(new URL("../dist", import.meta.url));
}

function isRecord(value: BoundaryValue): value is Record<string, DictionaryValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startCanvasSampleServer();
}
