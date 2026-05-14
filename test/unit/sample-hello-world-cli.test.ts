import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runHelloWorldCli } from "../../samples/hello-world-cli/src/app";

export function runSampleHelloWorldCliTests(): void {
  createsHelloWorldRepositoryWithASignedVersion();
}

function createsHelloWorldRepositoryWithASignedVersion(): void {
  const workspace = mkdtempSync(join(tmpdir(), "epoch-hello-world-cli-"));

  try {
    const summary = runHelloWorldCli({
      author: "hello-bot",
      root: workspace,
    });

    assert.equal(summary.message, "Hello from Epoch");
    assert.equal(summary.recordedPath, "hello.txt");
    assert.equal(summary.versionName, "hello-world");
    assert.equal(summary.eventCount, 2);
    assert.deepEqual(summary.repositoryProblems, []);
    assert.equal(readFileSync(join(workspace, "hello.txt"), "utf8"), "Hello from Epoch\n");
    assert.equal(existsSync(join(workspace, ".epoch")), true);
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
}
