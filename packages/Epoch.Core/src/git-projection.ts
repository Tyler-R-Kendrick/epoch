import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { EpochRepository, Event } from "./core";

/** Signed mapping event types for Git projection / live migration. */
export const GitMappingEventType = {
  project: "git.proxy.project",
  receive: "git.proxy.receive",
  commitImport: "git.commit.import",
  mirrorCheckpoint: "git.mirror.checkpoint",
  mirrorFetch: "git.mirror.fetch",
  mirrorPush: "git.mirror.push",
} as const;

export type GitMappingEventTypeName =
  (typeof GitMappingEventType)[keyof typeof GitMappingEventType];

export interface ProjectEpochToGitOptions {
  /** Working tree or bare-adjacent work tree used as projection cache. */
  readonly projectionRoot: string;
  /** Git ref to update (default refs/heads/main). */
  readonly ref?: string;
  readonly author?: string;
  readonly message?: string;
  /** When true, delete projectionRoot and rebuild from Epoch only. */
  readonly rebuild?: boolean;
}

export interface ProjectEpochToGitResult {
  readonly ref: string;
  readonly commitOid: string;
  readonly treeOid: string;
  readonly paths: readonly string[];
  readonly contentHashes: Readonly<Record<string, string>>;
  readonly mappingEvent: Event;
}

export interface IngestGitToEpochOptions {
  readonly gitRoot: string;
  /** Commit to materialize; defaults to HEAD. */
  readonly commitOid?: string;
  readonly ref?: string;
  readonly author?: string;
  /** Event type for the mapping record (receive vs import). */
  readonly mappingType?: typeof GitMappingEventType.receive | typeof GitMappingEventType.commitImport;
  readonly remote?: string;
}

export interface IngestGitToEpochResult {
  readonly commitOid: string;
  readonly treeOid: string;
  readonly recorded: readonly Event[];
  readonly contentHashes: Readonly<Record<string, string>>;
  readonly mappingEvent: Event;
}

export interface MirrorCheckpoint {
  readonly remote: string;
  readonly ref: string;
  readonly commitOid: string;
  readonly direction: "import" | "export";
  readonly status: "ok" | "paused" | "error";
  readonly detail?: string;
}

function git(cwd: string, args: readonly string[], env?: NodeJS.ProcessEnv): string {
  return execFileSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ...env, GIT_TERMINAL_PROMPT: "0" },
  }).trim();
}

function ensureGitIdentity(cwd: string): void {
  try {
    git(cwd, ["config", "user.email"]);
  } catch {
    git(cwd, ["config", "user.email", "epoch@example.invalid"]);
    git(cwd, ["config", "user.name", "epoch"]);
  }
}

function listFilesRecursive(root: string, base = root): string[] {
  if (!existsSync(root)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === ".epoch") continue;
    const absolute = join(root, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFilesRecursive(absolute, base));
    } else if (entry.isFile()) {
      out.push(relative(base, absolute).split(sep).join("/"));
    }
  }
  return out.sort();
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function writeBlob(targetRoot: string, path: string, data: Buffer): void {
  const absolute = join(targetRoot, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, data);
}

/**
 * Project current Epoch materialization into a Git working tree and commit.
 * Appends a signed `git.proxy.project` mapping event. Projection cache is
 * rebuildable: pass `rebuild: true` or delete projectionRoot first.
 */
export function projectEpochToGit(
  repository: EpochRepository,
  options: ProjectEpochToGitOptions,
): ProjectEpochToGitResult {
  const projectionRoot = resolve(options.projectionRoot);
  const ref = options.ref ?? "refs/heads/main";
  const author = options.author ?? repository.identity();

  if (options.rebuild && existsSync(projectionRoot)) {
    rmSync(projectionRoot, { recursive: true, force: true });
  }

  mkdirSync(projectionRoot, { recursive: true });
  if (!existsSync(join(projectionRoot, ".git"))) {
    execFileSync("git", ["-C", projectionRoot, "-c", "init.defaultBranch=main", "init"], {
      stdio: "pipe",
    });
  }
  ensureGitIdentity(projectionRoot);

  // Clear non-git files so projection matches Epoch exactly.
  for (const path of listFilesRecursive(projectionRoot)) {
    const absolute = join(projectionRoot, path);
    if (existsSync(absolute) && statSync(absolute).isFile()) {
      rmSync(absolute, { force: true });
    }
  }

  const contentHashes: Record<string, string> = {};
  const paths: string[] = [];
  // Materialize latest Epoch blobs into the projection tree (may also create a Git commit).
  const exported = repository.exportToGit(projectionRoot);
  for (const path of exported) {
    paths.push(path);
    contentHashes[path] = sha256File(join(projectionRoot, path));
  }
  for (const path of listFilesRecursive(projectionRoot)) {
    if (contentHashes[path] === undefined) {
      contentHashes[path] = sha256File(join(projectionRoot, path));
      paths.push(path);
    }
  }
  paths.sort();

  git(projectionRoot, ["add", "-A"]);
  const status = git(projectionRoot, ["status", "--porcelain"]);
  if (status.length > 0) {
    git(projectionRoot, ["commit", "-m", options.message ?? "epoch projection"]);
  }

  let commitOid: string;
  try {
    commitOid = git(projectionRoot, ["rev-parse", "HEAD"]);
  } catch {
    git(projectionRoot, ["commit", "--allow-empty", "-m", options.message ?? "epoch empty projection"]);
    commitOid = git(projectionRoot, ["rev-parse", "HEAD"]);
  }

  const treeOid = git(projectionRoot, ["rev-parse", "HEAD^{tree}"]);
  // Ensure named ref points at tip.
  if (ref !== "HEAD") {
    git(projectionRoot, ["update-ref", ref, commitOid]);
  }

  const mappingEvent = repository.append(
    GitMappingEventType.project,
    {
      ref,
      commitOid,
      treeOid,
      paths,
      contentHashes,
      projectionRoot,
      epochHeadEventIds: repository.heads(),
    },
    author,
  );

  return { ref, commitOid, treeOid, paths, contentHashes, mappingEvent };
}

/**
 * Ingest a Git commit's tree into Epoch as recorded files + mapping event.
 */
export function ingestGitToEpoch(
  repository: EpochRepository,
  options: IngestGitToEpochOptions,
): IngestGitToEpochResult {
  const gitRoot = resolve(options.gitRoot);
  if (!repository.isInitialized()) {
    repository.init(options.author ?? "git-import");
  }
  const author = options.author ?? repository.identity();
  const commitOid = options.commitOid ?? git(gitRoot, ["rev-parse", "HEAD"]);
  const treeOid = git(gitRoot, ["rev-parse", `${commitOid}^{tree}`]);
  const ref = options.ref ?? "refs/heads/main";

  // List files at commit.
  const ls = execFileSync(
    "git",
    ["-C", gitRoot, "ls-tree", "-r", "--name-only", "-z", commitOid],
    { encoding: "utf8" },
  );
  const paths = ls.split("\0").filter((p) => p.length > 0).sort();
  const recorded: Event[] = [];
  const contentHashes: Record<string, string> = {};

  for (const path of paths) {
    const data = execFileSync("git", ["-C", gitRoot, "show", `${commitOid}:${path}`]);
    const target = join(repository.root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, data);
    contentHashes[path] = createHash("sha256").update(data).digest("hex");
    recorded.push(repository.recordFile(path, entityTypeForPath(path), author));
  }

  const mappingType = options.mappingType ?? GitMappingEventType.receive;
  const mappingEvent = repository.append(
    mappingType,
    {
      ref,
      commitOid,
      treeOid,
      recorded: recorded.map((e) => e.id),
      contentHashes,
      remote: options.remote,
      epochHeadEventIds: repository.heads(),
    },
    author,
  );

  return { commitOid, treeOid, recorded, contentHashes, mappingEvent };
}

/**
 * Rebuild a projection cache from Epoch alone (delete then project).
 */
export function rebuildProjectionCache(
  repository: EpochRepository,
  projectionRoot: string,
  options: Omit<ProjectEpochToGitOptions, "projectionRoot" | "rebuild"> = {},
): ProjectEpochToGitResult {
  return projectEpochToGit(repository, {
    ...options,
    projectionRoot,
    rebuild: true,
  });
}

export function appendMirrorCheckpoint(
  repository: EpochRepository,
  checkpoint: MirrorCheckpoint,
  author?: string,
): Event {
  return repository.append(
    GitMappingEventType.mirrorCheckpoint,
    { ...checkpoint },
    author ?? repository.identity(),
  );
}

export function listGitMappingEvents(repository: EpochRepository): Event[] {
  const types = new Set<string>(Object.values(GitMappingEventType));
  return repository.events().filter((event) => types.has(event.type));
}

/** Content hashes of current Epoch-tracked file records (path → sha256). */
export function epochContentHashes(repository: EpochRepository): Record<string, string> {
  const hashes: Record<string, string> = {};
  // Export to temp is heavy; read latest records from working tree when present.
  for (const event of repository.events()) {
    if (event.type !== "record") continue;
    const path = event.payload.path;
    const blob = event.payload.blob_sha256;
    if (typeof path === "string" && typeof blob === "string") {
      hashes[path] = blob;
    }
  }
  return hashes;
}

function entityTypeForPath(path: string): string {
  if (path.endsWith(".md")) return "text/markdown";
  if (path.endsWith(".json")) return "application/json";
  if (path.endsWith(".ts") || path.endsWith(".js") || path.endsWith(".mjs")) return "text/plain";
  if (path.endsWith(".txt")) return "text/plain";
  return "application/octet-stream";
}
