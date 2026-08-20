#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { EpochRepository, ingestGitToEpoch, projectEpochToGit } from "@epoch/core";
import {
  parseRemoteHelperCommand,
  REMOTE_HELPER_CAPABILITIES,
} from "./remote-helper";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;


export interface RemoteHelperIO {
  readonly input: NodeJS.ReadableStream;
  readonly output: { write(chunk: string): BoundaryValue };
  readonly remoteUrl?: string;
  readonly env?: NodeJS.ProcessEnv;
}

export function remoteHelperCapabilities(): readonly string[] {
  return REMOTE_HELPER_CAPABILITIES;
}

function requiredRepo(env: NodeJS.ProcessEnv): EpochRepository {
  const root = env.EPOCH_REPO;
  if (!root) throw new Error("EPOCH_REPO is required for git-remote-epoch");
  const repository = new EpochRepository(root);
  if (!repository.isInitialized()) throw new Error(`EPOCH_REPO is not an initialized Epoch repository: ${root}`);
  return repository;
}

export async function runGitRemoteEpoch(io: RemoteHelperIO = {
  input: process.stdin,
  output: process.stdout,
  remoteUrl: process.argv[3],
  env: process.env,
}): Promise<number> {
  const remote = io.remoteUrl ?? "";
  if (remote !== "" && !/^epoch:\/\//u.test(remote) && !/^https?:\/\//u.test(remote)) {
    io.output.write(`error remote-helper: unsupported remote URL scheme\n`);
    return 1;
  }
  const env = io.env ?? process.env;
  const lines = createInterface({ input: io.input, crlfDelay: Infinity });
  let projection: string | undefined;
  try {
    for await (const line of lines) {
      if (line.trim() === "") continue;
      try {
        const command = parseRemoteHelperCommand(line);
        if (command.command === "capabilities") {
          for (const capability of REMOTE_HELPER_CAPABILITIES) io.output.write(`${capability}\n`);
          io.output.write("\n");
          continue;
        }
        if (command.command === "list") {
          const repository = requiredRepo(env);
          projection ??= mkdtempSync(join(tmpdir(), "epoch-remote-"));
          const projected = projectEpochToGit(repository, { projectionRoot: projection });
          io.output.write(`${projected.commitOid} HEAD\n`);
          io.output.write(`${projected.commitOid} refs/heads/main\n\n`);
          continue;
        }
        if (command.command === "option") {
          io.output.write("ok\n");
          continue;
        }
        if (command.command === "quit") return 0;
        const repository = requiredRepo(env);
        projection ??= mkdtempSync(join(tmpdir(), "epoch-remote-"));
        projectEpochToGit(repository, { projectionRoot: projection });
        const gitDir = env.GIT_DIR;
        if (command.command === "fetch") {
          if (gitDir) execFileSync("git", ["--git-dir", gitDir, "fetch", projection, "+refs/heads/main:refs/epoch/remotes/origin/main"], { stdio: "pipe" });
          io.output.write("\n");
          continue;
        }
        if (command.command === "push") {
          if (gitDir) {
            execFileSync("git", ["--git-dir", gitDir, "push", projection, `${command.force ? "+" : ""}${command.source}:${command.destination}`], { stdio: "pipe" });
            ingestGitToEpoch(repository, { gitRoot: projection, remote: remote || "epoch://local" });
          }
          io.output.write(`ok ${command.destination}\n\n`);
          continue;
        }
      } catch (error) {
        io.output.write(`error remote-helper: ${error instanceof Error ? error.message : String(error)}\n`);
        return 1;
      }
    }
    return 0;
  } finally {
    if (projection !== undefined) rmSync(projection, { recursive: true, force: true });
  }
}

if (require.main === module) {
  void runGitRemoteEpoch().then((code) => {
    process.exitCode = code;
  });
}
