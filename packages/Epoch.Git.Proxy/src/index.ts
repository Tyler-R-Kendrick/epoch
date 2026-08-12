import { execFileSync, spawn } from "node:child_process";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  EpochRepository,
  GitMappingEventType,
  appendMirrorCheckpoint,
  ingestGitToEpoch,
  projectEpochToGit,
} from "@epoch/core";
import { gitProtocolEnvironment } from "./protocol-v2";

export interface GitProxyOptions {
  readonly epochRoot: string;
  /** Working-tree projection cache (non-bare). */
  readonly projectionRoot?: string;
  readonly listenHost?: string;
  readonly listenPort?: number;
  readonly publicBaseUrl?: string;
  readonly author?: string;
}

export interface GitProxyServer {
  readonly url: string;
  readonly gitCloneUrl: string;
  readonly projectionRoot: string;
  readonly bareRoot: string;
  readonly epochRoot: string;
  close(): Promise<void>;
  project(): ReturnType<typeof projectEpochToGit>;
  receiveHead(): ReturnType<typeof ingestGitToEpoch>;
}

export interface MirrorOptions {
  readonly epochRoot: string;
  readonly projectionRoot: string;
  readonly remoteUrl: string;
  readonly remoteName?: string;
  readonly ref?: string;
  readonly author?: string;
  /**
   * `git-primary` (default for standalone import-live): ingest the remote tip
   * into Epoch product materialization (migration).
   *
   * `epoch-primary` (required for dual-run import lane): fetch and checkpoint
   * the remote tip only; do **not** rewrite Epoch product files or checkout
   * product `main` onto the import tip.
   */
  readonly authority?: "git-primary" | "epoch-primary";
}

export interface MirrorResult {
  readonly commitOid: string;
  readonly checkpointEventId: string;
}

function git(cwd: string, args: readonly string[]): string {
  return execFileSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  }).trim();
}

export function defaultProjectionRoot(epochRoot: string): string {
  return join(resolve(epochRoot), ".epoch", "git-projection");
}

export function defaultBareRoot(epochRoot: string): string {
  return join(resolve(epochRoot), ".epoch", "git-projection.git");
}

/**
 * Project Epoch → working tree, then mirror into a bare repo used by http-backend.
 */
export function ensureProjection(epochRoot: string, projectionRoot: string, author?: string) {
  const repository = new EpochRepository(epochRoot);
  if (!repository.isInitialized()) {
    repository.init(author ?? "git-proxy");
  }
  const projected = projectEpochToGit(repository, {
    projectionRoot,
    author: author ?? repository.identity(),
    message: "epoch git-proxy project",
  });
  syncBareFromProjection(projectionRoot, defaultBareRoot(epochRoot));
  return projected;
}

function syncBareFromProjection(projectionRoot: string, bareRoot: string): void {
  mkdirSync(dirname(bareRoot), { recursive: true });
  if (!existsSync(bareRoot)) {
    execFileSync("git", ["-c", "init.defaultBranch=main", "init", "--bare", bareRoot], { stdio: "pipe" });
  }
  // Keep bare default branch on main so smart-HTTP clones check out projected content.
  execFileSync("git", ["--git-dir", bareRoot, "symbolic-ref", "HEAD", "refs/heads/main"], { stdio: "pipe" });
  // Push all refs from projection worktree into bare.
  try {
    git(projectionRoot, ["remote", "remove", "epoch-bare"]);
  } catch {
    // ignore
  }
  git(projectionRoot, ["remote", "add", "epoch-bare", bareRoot]);
  try {
    git(projectionRoot, ["push", "--force", "epoch-bare", "HEAD:refs/heads/main"]);
  } catch (error) {
    // Empty projection has no commits yet; still ensure bare exists for http-backend.
    try {
      git(projectionRoot, ["rev-parse", "HEAD"]);
    } catch {
      return;
    }
    throw error;
  }
  // Allow http fetch without auth.
  execFileSync("git", ["--git-dir", bareRoot, "config", "http.receivepack", "true"], { stdio: "pipe" });
  execFileSync("git", ["--git-dir", bareRoot, "config", "uploadpack.allowAnySHA1InWant", "true"], { stdio: "pipe" });
  execFileSync("git", ["--git-dir", bareRoot, "update-server-info"], { stdio: "pipe" });
}

/**
 * Start a smart-HTTP Git server via `git http-backend` over a bare projection.
 */
export async function startGitProxy(options: GitProxyOptions): Promise<GitProxyServer> {
  const epochRoot = resolve(options.epochRoot);
  const projectionRoot = resolve(options.projectionRoot ?? defaultProjectionRoot(epochRoot));
  const bareRoot = defaultBareRoot(epochRoot);
  mkdirSync(projectionRoot, { recursive: true });
  ensureProjection(epochRoot, projectionRoot, options.author);

  const host = options.listenHost ?? "127.0.0.1";
  const port = options.listenPort ?? 0;
  const projectRootParent = dirname(bareRoot);
  const bareName = bareRoot.split(/[/\\]/).pop() ?? "git-projection.git";

  const server: Server = createServer((req, res) => {
    void handleWithHttpBackend(req, res, {
      epochRoot,
      projectionRoot,
      bareRoot,
      projectRootParent,
      bareName,
      author: options.author,
    }).catch((error: unknown) => {
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
  if (address === null || typeof address === "string") {
    throw new Error("Git proxy failed to bind a TCP port");
  }
  const url = `http://${host}:${address.port}`;
  // Clone URL path must match the bare repo name under GIT_PROJECT_ROOT.
  const gitCloneUrl = options.publicBaseUrl ?? `${url}/${bareName}`;

  return {
    url,
    gitCloneUrl,
    projectionRoot,
    bareRoot,
    epochRoot,
    project: () => ensureProjection(epochRoot, projectionRoot, options.author),
    receiveHead: () => {
      // Fetch bare tip into projection worktree then ingest.
      try {
        git(projectionRoot, ["fetch", "epoch-bare"]);
        git(projectionRoot, ["checkout", "-B", "main", "epoch-bare/main"]);
      } catch {
        // fall through to HEAD
      }
      const repository = new EpochRepository(epochRoot);
      return ingestGitToEpoch(repository, {
        gitRoot: projectionRoot,
        mappingType: GitMappingEventType.receive,
        author: options.author,
      });
    },
    close: () =>
      new Promise((resolveClose, reject) => {
        server.close((error) => (error ? reject(error) : resolveClose()));
      }),
  };
}

interface BackendContext {
  readonly epochRoot: string;
  readonly projectionRoot: string;
  readonly bareRoot: string;
  readonly projectRootParent: string;
  readonly bareName: string;
  readonly author?: string;
}

async function handleWithHttpBackend(
  req: IncomingMessage,
  res: ServerResponse,
  ctx: BackendContext,
): Promise<void> {
  const url = new URL(req.url ?? "/", "http://localhost");
  let pathInfo = url.pathname;

  // Normalize: allow /epoch.git alias → bare name
  if (pathInfo.startsWith("/epoch.git")) {
    pathInfo = pathInfo.replace(/^\/epoch\.git/, `/${ctx.bareName}`);
  }

  // Do not re-project on the request path (avoids lock contention with concurrent
  // git clients). Callers refresh via ensureProjection / server.project().

  const body = req.method === "POST" ? await readBody(req) : Buffer.alloc(0);
  const isReceive = pathInfo.includes("git-receive-pack");

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_PROJECT_ROOT: ctx.projectRootParent,
    GIT_HTTP_EXPORT_ALL: "true",
    PATH_INFO: pathInfo,
    REQUEST_METHOD: req.method ?? "GET",
    QUERY_STRING: url.search.startsWith("?") ? url.search.slice(1) : url.search,
    CONTENT_TYPE: String(req.headers["content-type"] ?? ""),
    CONTENT_LENGTH: String(body.length),
    // Some git versions read these:
    REMOTE_USER: "epoch",
    SERVER_PROTOCOL: "HTTP/1.1",
    ...gitProtocolEnvironment(req.headers),
  };

  const result = await runHttpBackend(env, body);

  // Parse CGI-style headers from git-http-backend.
  const split = splitCgi(result);
  for (const [key, value] of Object.entries(split.headers)) {
    res.setHeader(key, value);
  }
  res.statusCode = split.status;
  // Prefer explicit close so git clients do not stall on keep-alive edge cases.
  res.setHeader("Connection", "close");

  if (isReceive && req.method === "POST" && res.statusCode >= 200 && res.statusCode < 300) {
    // After push into bare, update worktree and ingest into Epoch.
    try {
      try {
        git(ctx.projectionRoot, ["remote", "remove", "epoch-bare"]);
      } catch {
        // ignore
      }
      git(ctx.projectionRoot, ["remote", "add", "epoch-bare", ctx.bareRoot]);
      git(ctx.projectionRoot, ["fetch", "epoch-bare"]);
      git(ctx.projectionRoot, ["checkout", "-B", "main", "FETCH_HEAD"]);
    } catch {
      // If fetch fails, try hard reset from bare
      try {
        execFileSync("git", ["--git-dir", ctx.bareRoot, "archive", "HEAD"], { stdio: "pipe" });
      } catch {
        // ignore
      }
    }
    const repository = new EpochRepository(ctx.epochRoot);
    ingestGitToEpoch(repository, {
      gitRoot: ctx.projectionRoot,
      mappingType: GitMappingEventType.receive,
      author: ctx.author,
    });
  }

  res.end(split.body);
}

function splitCgi(output: Buffer): {
  status: number;
  headers: Record<string, string>;
  body: Buffer;
} {
  const text = output.toString("binary");
  const sep = text.includes("\r\n\r\n") ? "\r\n\r\n" : "\n\n";
  const idx = text.indexOf(sep);
  if (idx === -1) {
    return { status: 200, headers: { "Content-Type": "application/octet-stream" }, body: output };
  }
  const headerText = text.slice(0, idx);
  const body = Buffer.from(text.slice(idx + sep.length), "binary");
  const headers: Record<string, string> = {};
  let status = 200;
  for (const line of headerText.split(/\r?\n/)) {
    if (line.toLowerCase().startsWith("status:")) {
      status = Number(line.slice(7).trim().split(" ")[0]) || 200;
      continue;
    }
    const colon = line.indexOf(":");
    if (colon > 0) {
      headers[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
    }
  }
  return { status, headers, body };
}

function runHttpBackend(env: NodeJS.ProcessEnv, stdin: Buffer): Promise<Buffer> {
  return new Promise((resolveOut, reject) => {
    const child = spawn("git", ["http-backend"], {
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on("data", (c) => stdout.push(c));
    child.stderr.on("data", (c) => stderr.push(c));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0 && stdout.length === 0) {
        reject(new Error(`git http-backend failed (${code}): ${Buffer.concat(stderr).toString("utf8")}`));
        return;
      }
      resolveOut(Buffer.concat(stdout));
    });
    if (stdin.length > 0) {
      child.stdin.write(stdin);
    }
    child.stdin.end();
  });
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolveBody, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolveBody(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export function importLiveOnce(options: MirrorOptions): MirrorResult {
  const projectionRoot = resolve(options.projectionRoot);
  const epochRoot = resolve(options.epochRoot);
  const remoteName = options.remoteName ?? "upstream";
  const ref = options.ref ?? "refs/heads/main";
  const authority = options.authority ?? "git-primary";
  mkdirSync(projectionRoot, { recursive: true });
  if (!existsSync(join(projectionRoot, ".git"))) {
    ensureProjection(epochRoot, projectionRoot, options.author);
  }

  try {
    git(projectionRoot, ["remote", "remove", remoteName]);
  } catch {
    // ignore
  }
  git(projectionRoot, ["remote", "add", remoteName, options.remoteUrl]);
  git(projectionRoot, ["fetch", remoteName]);

  let commitOid: string;
  try {
    commitOid = git(projectionRoot, ["rev-parse", `${remoteName}/main`]);
  } catch {
    commitOid = git(projectionRoot, ["rev-parse", `${remoteName}/master`]);
  }

  // Always remember the import tip on a non-product ref for dual-run visibility.
  const importLaneRef = `refs/epoch/import-lane/${remoteName}`;
  git(projectionRoot, ["update-ref", importLaneRef, commitOid]);

  const repository = new EpochRepository(epochRoot);
  if (!repository.isInitialized()) {
    repository.init(options.author ?? "git-import");
  }

  let recordedIds: string[] = [];

  if (authority === "git-primary") {
    // Migration path: materialize remote tip into Epoch product.
    git(projectionRoot, ["checkout", "-B", "main", commitOid]);
    const ingest = ingestGitToEpoch(repository, {
      gitRoot: projectionRoot,
      commitOid,
      ref,
      remote: options.remoteUrl,
      mappingType: GitMappingEventType.commitImport,
      author: options.author,
    });
    recordedIds = ingest.recorded.map((e) => e.id);
  }
  // epoch-primary: do not checkout product main onto import tip and do not
  // ingest into Epoch — product materialization stays Epoch-authoritative.

  const checkpoint = appendMirrorCheckpoint(repository, {
    remote: options.remoteUrl,
    ref: authority === "epoch-primary" ? importLaneRef : ref,
    commitOid,
    direction: "import",
    status: "ok",
    detail: authority === "epoch-primary" ? "import-lane; epoch-primary product unchanged" : undefined,
  }, options.author);

  repository.append(
    GitMappingEventType.mirrorFetch,
    {
      remote: options.remoteUrl,
      ref: authority === "epoch-primary" ? importLaneRef : ref,
      commitOid,
      recorded: recordedIds,
      authority,
      importLaneRef,
    },
    options.author ?? repository.identity(),
  );

  return { commitOid, checkpointEventId: checkpoint.id };
}

export function exportLiveOnce(options: MirrorOptions): MirrorResult {
  const projectionRoot = resolve(options.projectionRoot);
  const epochRoot = resolve(options.epochRoot);
  const remoteName = options.remoteName ?? "mirror";
  const ref = options.ref ?? "refs/heads/main";

  const project = ensureProjection(epochRoot, projectionRoot, options.author);
  try {
    git(projectionRoot, ["remote", "remove", remoteName]);
  } catch {
    // ignore
  }
  git(projectionRoot, ["remote", "add", remoteName, options.remoteUrl]);
  git(projectionRoot, ["push", "-u", remoteName, `HEAD:${ref.replace(/^refs\/heads\//, "")}`]);

  const repository = new EpochRepository(epochRoot);
  const checkpoint = appendMirrorCheckpoint(repository, {
    remote: options.remoteUrl,
    ref,
    commitOid: project.commitOid,
    direction: "export",
    status: "ok",
  }, options.author);
  repository.append(
    GitMappingEventType.mirrorPush,
    { remote: options.remoteUrl, ref, commitOid: project.commitOid },
    options.author ?? repository.identity(),
  );

  return { commitOid: project.commitOid, checkpointEventId: checkpoint.id };
}

/**
 * Dual-run: track import remote tip on an import lane (Epoch-primary product
 * materialization is never clobbered), then export Epoch product heads.
 */
export function dualRunOnce(options: {
  readonly epochRoot: string;
  readonly projectionRoot: string;
  readonly importRemoteUrl: string;
  readonly exportRemoteUrl: string;
  readonly author?: string;
}): { import: MirrorResult; export: MirrorResult } {
  const imp = importLiveOnce({
    epochRoot: options.epochRoot,
    projectionRoot: options.projectionRoot,
    remoteUrl: options.importRemoteUrl,
    remoteName: "import-lane",
    author: options.author,
    authority: "epoch-primary",
  });
  const exp = exportLiveOnce({
    epochRoot: options.epochRoot,
    projectionRoot: options.projectionRoot,
    remoteUrl: options.exportRemoteUrl,
    remoteName: "export-lane",
    author: options.author,
  });
  return { import: imp, export: exp };
}

export function readLastCheckpoint(epochRoot: string): MirrorResult | undefined {
  const repository = new EpochRepository(epochRoot);
  const events = repository.events().filter((e) => e.type === GitMappingEventType.mirrorCheckpoint);
  const last = events[events.length - 1];
  if (last === undefined) return undefined;
  const commitOid = typeof last.payload.commitOid === "string" ? last.payload.commitOid : "";
  return { commitOid, checkpointEventId: last.id };
}

export function writeMirrorState(path: string, state: unknown): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`);
}

export function readMirrorState<T>(path: string): T | undefined {
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export * from "./compatibility";
export * from "./deterministic-projection";
export * from "./protocol-v2";
export * from "./quarantine";
export * from "./remote-helper";
export { remoteHelperCapabilities, runGitRemoteEpoch } from "./git-remote-epoch";
