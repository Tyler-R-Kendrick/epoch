import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { EpochRepository, Event, readJson, writeJson } from "./core";

export const EPOCH_GIT_PROVIDER = "git";

export interface EpochGitRemote {
  readonly provider: typeof EPOCH_GIT_PROVIDER;
  readonly remote: string;
  readonly ref?: string;
  readonly commit?: string;
}

export interface EpochGitCommitResult {
  readonly event: Event;
  readonly recorded: readonly Event[];
}

export interface EpochGitCommandResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}

export class UnsupportedGitOperationError extends Error {
  constructor(operation: string, reason: string) {
    super(`git ${operation} is not supported by Epoch Git compatibility: ${reason}`);
    this.name = "UnsupportedGitOperationError";
  }
}

export class EpochCoreGit {
  readonly repository: EpochRepository;
  readonly gitRoot: string;

  constructor(root: string, repository = new EpochRepository(root)) {
    this.gitRoot = resolve(root);
    this.repository = repository;
  }

  static clone(remote: string, target?: string, options: { readonly author?: string } = {}): EpochCoreGit {
    const destination = resolve(target ?? basename(remote).replace(/\.git$/u, ""));
    execFileSync("git", ["clone", remote, destination], { stdio: "pipe" });
    const git = new EpochCoreGit(destination);
    git.repository.init(options.author ?? "git");
    const ref = git.currentRef();
    git.writeRemote({ provider: EPOCH_GIT_PROVIDER, remote, ref: ref.ref, commit: ref.commit });
    const recorded = git.repository.importFromGit(destination);
    git.repository.append("git.clone", {
      provider: EPOCH_GIT_PROVIDER,
      remote,
      ref: ref.ref,
      commit: ref.commit,
      recorded: recorded.map((event) => event.id),
    }, options.author ?? git.repository.identity());
    return git;
  }

  static init(root: string, options: { readonly author?: string; readonly remote?: string } = {}): EpochCoreGit {
    const gitRoot = resolve(root);
    mkdirSync(gitRoot, { recursive: true });
    if (!existsSync(join(gitRoot, ".git"))) {
      execFileSync("git", ["-C", gitRoot, "-c", "init.defaultBranch=main", "init"], { stdio: "pipe" });
    }
    const git = new EpochCoreGit(gitRoot);
    git.repository.init(options.author ?? "git");
    git.writeRemote({ provider: EPOCH_GIT_PROVIDER, remote: options.remote ?? gitRoot, ...git.currentRef() });
    return git;
  }

  remote(): EpochGitRemote | undefined {
    const path = this.remotePath();
    return existsSync(path) ? readJson<EpochGitRemote>(path) : undefined;
  }

  add(paths: readonly string[]): EpochGitCommandResult {
    if (paths.length === 0) throw new Error("usage: git add <pathspec>...");
    execFileSync("git", ["-C", this.gitRoot, "add", ...paths], { stdio: "pipe" });
    return ok("");
  }

  commit(message: string, options: { readonly author?: string } = {}): EpochGitCommitResult {
    this.repository.init(options.author ?? "git");
    const paths = this.stagedPaths();
    if (paths.length === 0) throw new Error("nothing to commit");
    const recorded = paths
      .filter((path) => existsSync(join(this.gitRoot, path)))
      .map((path) => this.repository.recordFile(path, entityTypeForPath(path), options.author ?? this.repository.identity()));
    const ref = this.currentRef();
    const event = this.repository.append("git.commit", {
      provider: EPOCH_GIT_PROVIDER,
      message,
      ref: ref.ref,
      commit: ref.commit,
      recorded: recorded.map((record) => record.id),
    }, options.author ?? this.repository.identity());
    execFileSync("git", ["-C", this.gitRoot, "reset", "--quiet"], { stdio: "pipe" });
    return { event, recorded };
  }

  status(): EpochGitCommandResult {
    const status = execFileSync("git", ["-C", this.gitRoot, "status", "--short"], { encoding: "utf8" });
    const problems = existsSync(this.repository.epochDir) ? this.repository.verify() : [];
    const epochStatus = problems.length === 0 ? "Epoch repository verifies successfully" : `Epoch verification problems:\n${problems.join("\n")}`;
    return ok(`${status}${status.length > 0 ? "\n" : ""}${epochStatus}\n`);
  }

  log(): EpochGitCommandResult {
    this.repository.init("git");
    return ok(this.repository.events().map((event) => `${event.id} ${event.type} ${JSON.stringify(event.payload)}`).join("\n") + "\n");
  }

  execute(command: string, args: readonly string[]): EpochGitCommandResult {
    switch (command) {
      case "add":
        return this.add(args);
      case "commit": {
        const message = parseCommitMessage(args);
        const result = this.commit(message);
        return ok(`[epoch ${result.event.id.slice(0, 12)}] ${message}\n${result.recorded.length} file(s) recorded\n`);
      }
      case "log":
        return this.log();
      case "status":
        return this.status();
      default:
        throw unsupported(command);
    }
  }

  private currentRef(): { ref?: string; commit?: string } {
    try {
      const ref = execFileSync("git", ["-C", this.gitRoot, "rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf8" }).trim();
      const commit = execFileSync("git", ["-C", this.gitRoot, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
      return { ref, commit };
    } catch {
      return {};
    }
  }

  private stagedPaths(): string[] {
    const output = execFileSync("git", ["-C", this.gitRoot, "diff", "--cached", "--name-only", "-z"], { encoding: "utf8" });
    return output.split("\0").filter((path) => path.length > 0).sort();
  }

  private writeRemote(remote: EpochGitRemote): void {
    mkdirSync(dirname(this.remotePath()), { recursive: true });
    writeJson(this.remotePath(), remote);
  }

  private remotePath(): string {
    return join(this.repository.epochDir, "git.json");
  }
}

export class EpochCLIGit {
  static run(argv: readonly string[], cwd = process.cwd()): EpochGitCommandResult {
    const [command, ...args] = argv;
    if (command === undefined) throw new Error("usage: epoch-git <clone|init|add|commit|status|log>");
    switch (command) {
      case "clone": {
        if (args.length < 1 || args.length > 2) throw new Error("usage: epoch-git clone <repository> [directory]");
        const git = EpochCoreGit.clone(args[0], args[1]);
        return ok(`cloned ${args[0]} into ${git.gitRoot} with Epoch provider git\n`);
      }
      case "init": {
        const git = EpochCoreGit.init(args[0] ?? cwd);
        return ok(`initialized Git-compatible Epoch repository at ${git.repository.epochDir}\n`);
      }
      default:
        return new EpochCoreGit(cwd).execute(command, args);
    }
  }
}

export function unsupported(operation: string): UnsupportedGitOperationError {
  return new UnsupportedGitOperationError(operation, "there is no safe Epoch operation or clear workaround for this Git command yet");
}

function ok(stdout: string): EpochGitCommandResult {
  return { stdout, stderr: "", exitCode: 0 };
}

function parseCommitMessage(args: readonly string[]): string {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if ((arg === "-m" || arg === "--message") && args[index + 1] !== undefined) return args[index + 1];
    if (arg.startsWith("--message=")) return arg.slice("--message=".length);
  }
  throw new Error("usage: git commit -m <message>");
}

function entityTypeForPath(path: string): string {
  const extension = path.toLowerCase().split(".").pop();
  switch (extension) {
    case "json":
      return "application/json";
    case "js":
    case "jsx":
      return "application/javascript";
    case "ts":
    case "tsx":
      return "application/typescript";
    case "css":
      return "text/css";
    case "csv":
      return "text/csv";
    case "html":
    case "htm":
      return "text/html";
    case "md":
    case "markdown":
    case "toml":
    case "txt":
    case "xml":
    case "yaml":
    case "yml":
      return "text/plain";
    default:
      return "application/octet-stream";
  }
}

export function readEpochGitRemote(root: string): EpochGitRemote | undefined {
  const path = join(resolve(root), ".epoch", "git.json");
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) as EpochGitRemote : undefined;
}
