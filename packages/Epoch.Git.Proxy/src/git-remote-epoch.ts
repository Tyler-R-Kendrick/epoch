#!/usr/bin/env node
import { createInterface } from "node:readline";
import {
  parseRemoteHelperCommand,
  REMOTE_HELPER_CAPABILITIES,
} from "./remote-helper";

export interface RemoteHelperIO {
  readonly input: NodeJS.ReadableStream;
  readonly output: { write(chunk: string): unknown };
  readonly remoteUrl?: string;
}

export function remoteHelperCapabilities(): readonly string[] {
  return REMOTE_HELPER_CAPABILITIES;
}

export async function runGitRemoteEpoch(io: RemoteHelperIO = {
  input: process.stdin,
  output: process.stdout,
  remoteUrl: process.argv[3],
}): Promise<number> {
  const remote = io.remoteUrl ?? "";
  if (remote !== "" && !/^epoch:\/\//u.test(remote) && !/^https?:\/\//u.test(remote)) {
    io.output.write(`error remote-helper: unsupported remote URL scheme\n`);
    return 1;
  }
  const lines = createInterface({ input: io.input, crlfDelay: Infinity });
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
        io.output.write("\n");
        continue;
      }
      if (command.command === "option") {
        io.output.write("unsupported\n");
        continue;
      }
      if (command.command === "quit") return 0;
      io.output.write(`error remote-helper: ${command.command} requires an authenticated Epoch endpoint\n`);
      return 1;
    } catch (error) {
      io.output.write(`error remote-helper: ${error instanceof Error ? error.message : String(error)}\n`);
      return 1;
    }
  }
  return 0;
}

if (require.main === module) {
  void runGitRemoteEpoch().then((code) => {
    process.exitCode = code;
  });
}
