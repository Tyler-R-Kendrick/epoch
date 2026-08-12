import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = mkdtempSync(join(tmpdir(), "epoch-protocol-tests-"));
try {
  execFileSync(resolve(root, "../../node_modules/.bin/tsgo"), ["-p", resolve(root, "tsconfig.test.json"), "--outDir", output], { stdio: "inherit" });
  mkdirSync(resolve(output, "fixtures"), { recursive: true });
  cpSync(resolve(root, "fixtures/canonical-id-vectors.json"), resolve(output, "fixtures/canonical-id-vectors.json"));
  execFileSync(process.execPath, [resolve(output, "test/run.js")], { stdio: "inherit" });
} finally {
  rmSync(output, { recursive: true, force: true });
}
