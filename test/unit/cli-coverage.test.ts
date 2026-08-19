import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main } from "@epoch/cli";

export async function runCliCoverageTests(): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), "epoch-cli-coverage-"));
  const captured = createCapture();
  try {
    assert.equal(await Promise.resolve(main(["help"], captured.io)), 0);
    assert.match(captured.out(), /usage: epoch/);
    assert.equal(await Promise.resolve(main(["--unknown", "help"], captured.io)), 1);
    assert.equal(await Promise.resolve(main(["--repo", root, "create", "--author", "alice"], captured.io)), 0);
    writeFileSync(join(root, "note.txt"), "hello\n");
    writeFileSync(join(root, "copy-me.txt"), "copy\n");
    assert.equal(await Promise.resolve(main(["--repo", root, "record", "note.txt"], captured.io)), 0);
    assert.equal(await Promise.resolve(main(["--repo", root, "track", "copy-me.txt"], captured.io)), 0);
    assert.equal(await Promise.resolve(main(["--repo", root, "cp", "note.txt", "note-copy.txt"], captured.io)), 0);
    assert.equal(await Promise.resolve(main(["--repo", root, "mv", "note-copy.txt", "renamed.txt"], captured.io)), 0);
    assert.equal(await Promise.resolve(main(["--repo", root, "intent", "renamed.txt", "--title", "keep"], captured.io)), 0);
    assert.equal(await Promise.resolve(main(["--repo", root, "events"], captured.io)), 0);
    assert.equal(await Promise.resolve(main(["--repo", root, "status"], captured.io)), 0);
    assert.equal(await Promise.resolve(main(["--repo", root, "config", "path"], captured.io)), 0);
    assert.equal(await Promise.resolve(main(["--repo", root, "dr-plan"], captured.io)), 0);
    assert.equal(await Promise.resolve(main(["--repo", root, "verify"], captured.io)), 0);
    assert.equal(await Promise.resolve(main(["--repo", root, "forget", "copy-me.txt"], captured.io)), 0);
    assert.equal(await Promise.resolve(main(["--repo", root, "rm", "renamed.txt"], captured.io)), 0);
    assert.equal(await Promise.resolve(main(["--repo", root, "mv"], captured.io)), 1);
    assert.equal(await Promise.resolve(main(["--repo", root, "config"], captured.io)), 1);
    mkdirSync(join(root, "nested"), { recursive: true });
    writeFileSync(join(root, "nested", "file.txt"), "n\n");
    assert.equal(await Promise.resolve(main(["--repo", root, "push", "nested"], captured.io)), 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function createCapture(): { io: { stdout: { write(message: string): boolean }; stderr: { write(message: string): boolean } }; out: () => string } {
  let stdout = "";
  let stderr = "";
  return {
    io: {
      stdout: {
        write(message: string) {
          stdout += message;
          return true;
        },
      },
      stderr: {
        write(message: string) {
          stderr += message;
          return true;
        },
      },
    },
    out: () => stdout + stderr,
  };
}
