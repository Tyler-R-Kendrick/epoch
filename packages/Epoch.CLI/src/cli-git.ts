#!/usr/bin/env node
import { EpochCLIGit } from "@epoch/core";
import type { CliIO } from "./cli";

const defaultCliIO: CliIO = { stdout: process.stdout, stderr: process.stderr };

export function main(argv = process.argv.slice(2), io: CliIO = defaultCliIO): number {
  try {
    const result = EpochCLIGit.run(argv);
    if (result.stdout.length > 0) io.stdout.write(result.stdout);
    if (result.stderr.length > 0) io.stderr.write(result.stderr);
    return result.exitCode;
  } catch (error) {
    io.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

if (require.main === module) {
  process.exitCode = main();
}
