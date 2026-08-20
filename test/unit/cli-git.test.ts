import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EpochCLIGit } from "@epoch/core";

// SAFETY: Runtime checks or construction above establish {.
const { main: epochGitMain } = createRequire(__filename)(join(process.cwd(), "packages/Epoch.CLI/dist/cli-git.js")) as {
  main: (
    argv?: readonly string[],
    io?: { stdout: { write(message: string): void }; stderr: { write(message: string): void } },
  ) => number;
};

export function runCliGitTests(): void {
  usageAndUnknownCommandsFailClosed();
  initStatusLogAndCommitStayInsideTheWorkspace();
  mirrorAndProjectReportMissingInputs();
}

interface CliGitCapture {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}

function capture(argv: readonly string[]): CliGitCapture {
  let stdout = "";
  let stderr = "";
  const code = epochGitMain([...argv], {
    stdout: { write(chunk: string) { stdout += chunk; return true; } },
    stderr: { write(chunk: string) { stderr += chunk; return true; } },
  });
  return { code, stdout, stderr };
}

function usageAndUnknownCommandsFailClosed(): void {
  const empty = capture([]);
  assert.equal(empty.code, 1);
  assert.match(empty.stderr, /usage: epoch-git/u);

  const unknown = capture(["not-a-git-command"]);
  assert.equal(unknown.code, 1);
  assert.match(unknown.stderr, /not supported|usage|unknown|no safe Epoch operation/iu);
}

function initStatusLogAndCommitStayInsideTheWorkspace(): void {
  const root = mkdtempSync(join(tmpdir(), "epoch-cli-git-"));
  try {
    const initialized = capture(["init", root]);
    assert.equal(initialized.code, 0);
    assert.match(initialized.stdout, /initialized Git-compatible Epoch repository/u);

    const status = EpochCLIGit.run(["status"], root);
    assert.equal(status.exitCode, 0);
    assert.match(status.stdout, /Epoch repository verifies successfully/u);

    writeFileSync(join(root, "README.md"), "ok\n");
    writeFileSync(join(root, "app.ts"), "export {}\n");
    writeFileSync(join(root, "data.json"), "{}\n");
    const added = EpochCLIGit.run(["add", "README.md", "app.ts", "data.json"], root);
    assert.equal(added.exitCode, 0);
    const committed = EpochCLIGit.run(["commit", "-m", "record files"], root);
    assert.equal(committed.exitCode, 0);
    assert.match(committed.stdout, /file\(s\) recorded/u);

    const log = EpochCLIGit.run(["log"], root);
    assert.equal(log.exitCode, 0);
    assert.match(log.stdout, /git.commit/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function mirrorAndProjectReportMissingInputs(): void {
  const missingRemote = capture(["mirror", "import", "--repo", "/tmp/does-not-need-to-exist"]);
  assert.equal(missingRemote.code, 1);
  assert.match(missingRemote.stderr, /usage: epoch-git mirror import/u);

  const missingExport = capture(["mirror", "export"]);
  assert.equal(missingExport.code, 1);
  assert.match(missingExport.stderr, /usage: epoch-git mirror export/u);

  const missingDual = capture(["mirror", "dual-run"]);
  assert.equal(missingDual.code, 1);
  assert.match(missingDual.stderr, /usage: epoch-git mirror dual-run/u);

  const unknownDirection = capture(["mirror", "sideways"]);
  assert.equal(unknownDirection.code, 1);
  assert.match(unknownDirection.stderr, /usage: epoch-git mirror/u);
}
