#!/usr/bin/env node
import { formatLiveCollabSummary, runLiveCollabDemo } from "./app";

const summary = runLiveCollabDemo();
process.stdout.write(`${formatLiveCollabSummary(summary)}\n`);

if (!summary.converged || summary.aliceProblems > 0 || summary.bobProblems > 0) {
  process.exitCode = 1;
}
