#!/usr/bin/env node
import { formatHelloWorldSummary, runHelloWorldCli } from "./app";

const summary = runHelloWorldCli({ root: process.argv[2] });
process.stdout.write(`${formatHelloWorldSummary(summary)}\n`);

if (summary.repositoryProblems.length > 0) {
  process.exitCode = 1;
}
