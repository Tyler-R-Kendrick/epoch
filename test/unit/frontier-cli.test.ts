import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeFrontierCommand, formatFrontierEnvelope } from "../../packages/Epoch.CLI/src/frontier";
import { interopDoctor } from "../../packages/Epoch.CLI/src/interop-doctor";
import { main } from "../../packages/Epoch.CLI/src/cli";

export async function runFrontierCliTests(): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), "epoch-frontier-cli-"));
  try {
    const created = executeFrontierCommand(root, ["change", "create", "Parser", "parent-1"], 100);
    assert.equal(created.ok, true);
    const change = created.data as { id: string; revision: number };
    assert.match(change.id, /^epoch:change:/u);
    assert.equal(executeFrontierCommand(root, ["change", "show", change.id]).ok, true);
    assert.equal(executeFrontierCommand(root, ["change", "revise", change.id, "--expected-revision", "99"]).code,
      "stale-revision");
    assert.equal(executeFrontierCommand(root, ["change", "missing"]).code, "invalid-command");
    assert.equal(executeFrontierCommand(root, ["change", "show", "missing"]).code, "not-found");

    const revision = executeFrontierCommand(root, ["new", "parent-a", "parent-b", "--message", "merge"], 101);
    assert.equal(revision.ok, true);
    const rootRevision = executeFrontierCommand(root, ["new", "--message", "root"], 101);
    const childRevision = executeFrontierCommand(root, ["new", (rootRevision.data as { id: string }).id, "--message", "child"], 101);
    const roots = executeFrontierCommand(root, ["log", "--revisions", "roots()"]);
    assert.deepEqual((roots.data as { revisions: readonly { id: string }[] }).revisions.map((item) => item.id),
      [(rootRevision.data as { id: string }).id]);
    const ancestry = executeFrontierCommand(root, ["log", "--revisions", `ancestors(${(childRevision.data as { id: string }).id})`]);
    assert.deepEqual((ancestry.data as { revisions: readonly { id: string }[] }).revisions.map((item) => item.id).sort(),
      [(childRevision.data as { id: string }).id, (rootRevision.data as { id: string }).id].sort());
    assert.equal(executeFrontierCommand(root, ["log", "--revisions", "unknown()"]).code, "invalid-input");
    const stack = executeFrontierCommand(root, ["stack", "create", "series", (revision.data as { id: string }).id], 102);
    assert.equal(stack.ok, true);
    assert.equal(executeFrontierCommand(root, ["stack", "submit", (stack.data as { id: string }).id]).ok, true);
    const split = executeFrontierCommand(root, ["split", "propose", "revision-a", "--plan", '{"groups":[]}']);
    assert.equal(split.ok, true);
    assert.equal(executeFrontierCommand(root, ["split", "inspect", (split.data as { id: string }).id]).ok, true);
    assert.equal(executeFrontierCommand(root, ["split", "propose", "revision-a", "--plan", "{"]).code, "invalid-input");
    const weave = executeFrontierCommand(root, ["weave", "create", "parallel", "revision-a", "revision-b"]);
    assert.equal(executeFrontierCommand(root, ["weave", "checkout", (weave.data as { id: string }).id]).ok, true);
    assert.equal(executeFrontierCommand(root, ["review", "record", change.id, "--state", "approved"]).ok, true);
    const merge = executeFrontierCommand(root, ["merge-plan", "plan", "target", "revision-a"]);
    assert.equal(executeFrontierCommand(root, ["merge-plan", "apply", (merge.data as { id: string }).id]).ok, true);
    assert.equal(executeFrontierCommand(root, ["conflict", "propose-ai", "conflict-a"]).code, "unsupported-capability");
    const workspace = executeFrontierCommand(root, ["workspace", "create", "local", "--provider", "filesystem"]);
    assert.equal(executeFrontierCommand(root, ["workspace", "capture", (workspace.data as { id: string }).id]).ok, true);

    for (const command of ["clone", "fetch", "hydrate", "backfill"] as const) {
      const result = executeFrontierCommand(root, [command, "origin", "--filter", '{"paths":["src/**"]}']);
      assert.equal(result.ok, false);
      assert.equal(result.code, "unsupported-capability");
    }
    assert.equal(executeFrontierCommand(root, ["mirror", "status"]).code, "unsupported-capability");
    assert.equal(executeFrontierCommand(root, ["principal", "auth-explain", "alice"]).code, "auth-denied");
    assert.equal(executeFrontierCommand(root, ["forge", "capabilities"]).code, "unsupported-capability");
    const emptyBlob = join(root, "empty"); writeFileSync(emptyBlob, "");
    const computed = executeFrontierCommand(root, ["swhid", "compute", "blob", emptyBlob]);
    assert.equal((computed.data as { swhid: string }).swhid, "swh:1:cnt:e69de29bb2d1d6434b8b29ae775ad8c2e48c5391");
    assert.equal((executeFrontierCommand(root, ["swhid", "inspect", (computed.data as { swhid: string }).swhid]).data as { kind: string }).kind, "cnt");
    assert.equal((executeFrontierCommand(root, ["swhid", "verify", (computed.data as { swhid: string }).swhid, "blob", emptyBlob]).data as { matches: boolean }).matches, true);
    assert.equal(executeFrontierCommand(root, ["swhid", "inspect", "x"]).code, "invalid-input");
    assert.equal(executeFrontierCommand(root, ["archive", "create"]).code, "unsupported-capability");
    assert.equal(executeFrontierCommand(root, ["op", "log"]).ok, true);

    const one = formatFrontierEnvelope(created, true);
    assert.equal(one, formatFrontierEnvelope(created, true), "JSON output is byte deterministic");
    assert.doesNotMatch(one, /token|password|secret/iu);

    const invoke = (args: string[]) => {
      let stdout = ""; let stderr = "";
      const exitCode = main(["--repo", root, ...args], {
        stdout: { write(value) { stdout += String(value); } }, stderr: { write(value) { stderr += String(value); } },
      });
      return { exitCode, stdout, stderr };
    };
    const jsonSuccess = invoke(["workspace", "list", "--json"]);
    assert.equal(jsonSuccess.exitCode, 0);
    assert.equal(JSON.parse(jsonSuccess.stdout).code, "ok");
    assert.equal(jsonSuccess.stderr, "");
    const jsonInvalid = invoke(["stack", "invalid", "--json"]);
    assert.equal(jsonInvalid.exitCode, 1);
    assert.equal(JSON.parse(jsonInvalid.stderr).code, "invalid-command");
    assert.equal(jsonInvalid.stdout, "");
    const jsonAuth = invoke(["principal", "auth-explain", "alice", "--json"]);
    assert.equal(jsonAuth.exitCode, 1);
    assert.equal(JSON.parse(jsonAuth.stderr).code, "auth-denied");
    assert.equal(jsonAuth.stdout, "");
    const jsonUnsupported = invoke(["forge", "export", "--json"]);
    assert.equal(jsonUnsupported.exitCode, 1);
    assert.equal(JSON.parse(jsonUnsupported.stderr).code, "unsupported-capability");
    assert.equal(jsonUnsupported.stdout, "");
  } finally { rmSync(root, { recursive: true, force: true }); }

  const report = await interopDoctor({
    exec(command) {
      if (command === "git") return "git version 2.54.0";
      throw new Error("not installed");
    },
    adapters: [{ id: "forge-f3", status: "supported", mode: "codec-only" }],
  });
  assert.equal(report.git.status, "supported");
  assert.equal(report.optionalTools.every((probe) => probe.status === "unsupported"), true);
  assert.equal(report.credentialsRedacted, true);
  assert.doesNotMatch(JSON.stringify(report), /credentialRef|authorization|token/iu);
}
