#!/usr/bin/env node
import { EpochCLIGit } from "@epoch/core";
import type { CliIO } from "./cli";

const defaultCliIO: CliIO = { stdout: process.stdout, stderr: process.stderr };

export function main(argv = process.argv.slice(2), io: CliIO = defaultCliIO): number {
  try {
    const [command, ...args] = argv;
    if (command === "serve") {
      return runServe(args, io);
    }
    if (command === "mirror") {
      return runMirror(args, io);
    }
    if (command === "project") {
      return runProject(args, io);
    }

    const result = EpochCLIGit.run(argv);
    if (result.stdout.length > 0) io.stdout.write(result.stdout);
    if (result.stderr.length > 0) io.stderr.write(result.stderr);
    return result.exitCode;
  } catch (error) {
    io.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

function flag(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
}

function runServe(args: readonly string[], io: CliIO): number {
  // Lazy require so unit tests that only use core commands do not need the proxy at import time.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { startGitProxy } = require("@epoch/git-proxy") as typeof import("@epoch/git-proxy");
  const repo = flag(args, "--repo") ?? process.cwd();
  const port = Number(flag(args, "--port") ?? "0");
  const host = flag(args, "--host") ?? "127.0.0.1";

  // Synchronous bootstrap via deasync-free pattern: block the process until closed.
  let exitCode = 0;
  const started = startGitProxy({
    epochRoot: repo,
    listenHost: host,
    listenPort: port,
  });

  // Hold event loop open.
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  started.then((server) => {
    io.stdout.write(`epoch-git serve listening at ${server.url}\n`);
    io.stdout.write(`gitCloneUrl ${server.gitCloneUrl}\n`);
    io.stdout.write(`projection ${server.projectionRoot}\n`);
    const shutdown = () => {
      server.close().then(() => process.exit(0)).catch(() => process.exit(1));
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  }).catch((error: unknown) => {
    io.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    exitCode = 1;
    process.exit(exitCode);
  });

  return 0;
}

function runMirror(args: readonly string[], io: CliIO): number {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { importLiveOnce, exportLiveOnce, dualRunOnce } = require("@epoch/git-proxy") as typeof import("@epoch/git-proxy");
  const direction = args[0];
  const repo = flag(args, "--repo") ?? process.cwd();
  const projection = flag(args, "--projection") ?? `${repo}/.epoch/git-projection`;
  const remote = flag(args, "--remote");
  if (direction === "import") {
    if (remote === undefined) throw new Error("usage: epoch-git mirror import --remote URL [--repo PATH]");
    const result = importLiveOnce({ epochRoot: repo, projectionRoot: projection, remoteUrl: remote });
    io.stdout.write(`import-live ok commit=${result.commitOid} checkpoint=${result.checkpointEventId}\n`);
    return 0;
  }
  if (direction === "export") {
    if (remote === undefined) throw new Error("usage: epoch-git mirror export --remote URL [--repo PATH]");
    const result = exportLiveOnce({ epochRoot: repo, projectionRoot: projection, remoteUrl: remote });
    io.stdout.write(`export-live ok commit=${result.commitOid} checkpoint=${result.checkpointEventId}\n`);
    return 0;
  }
  if (direction === "dual-run") {
    const importRemote = flag(args, "--import-remote");
    const exportRemote = flag(args, "--export-remote");
    if (importRemote === undefined || exportRemote === undefined) {
      throw new Error("usage: epoch-git mirror dual-run --import-remote URL --export-remote URL");
    }
    const result = dualRunOnce({
      epochRoot: repo,
      projectionRoot: projection,
      importRemoteUrl: importRemote,
      exportRemoteUrl: exportRemote,
    });
    io.stdout.write(
      `dual-run ok import=${result.import.commitOid} export=${result.export.commitOid}\n`,
    );
    return 0;
  }
  throw new Error("usage: epoch-git mirror <import|export|dual-run> ...");
}

function runProject(args: readonly string[], io: CliIO): number {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { EpochRepository, projectEpochToGit } = require("@epoch/core") as typeof import("@epoch/core");
  const repoPath = flag(args, "--repo") ?? process.cwd();
  const projection = flag(args, "--projection") ?? `${repoPath}/.epoch/git-projection`;
  const repository = new EpochRepository(repoPath);
  const result = projectEpochToGit(repository, {
    projectionRoot: projection,
    rebuild: args.includes("--rebuild"),
  });
  io.stdout.write(
    `projected commit=${result.commitOid} tree=${result.treeOid} files=${result.paths.length} mapping=${result.mappingEvent.id}\n`,
  );
  return 0;
}

if (require.main === module) {
  process.exitCode = main();
}
