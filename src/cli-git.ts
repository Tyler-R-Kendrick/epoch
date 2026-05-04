#!/usr/bin/env node
import { EpochCLIGit } from "./git";

export function main(argv = process.argv.slice(2)): number {
  try {
    const result = EpochCLIGit.run(argv);
    if (result.stdout.length > 0) process.stdout.write(result.stdout);
    if (result.stderr.length > 0) process.stderr.write(result.stderr);
    return result.exitCode;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

if (require.main === module) {
  process.exitCode = main();
}
