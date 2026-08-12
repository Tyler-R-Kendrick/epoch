import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeFrontierCommand, formatFrontierEnvelope, interopDoctor, isFrontierCommand, isFrontierInvocation, main } from "@epoch/cli";
import { assertRevisionId, parseCanonicalId, type CanonicalIdKind } from "@epoch/protocol";

export async function runFrontierCliTests(): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), "epoch-frontier-cli-"));
  try {
    const created = executeFrontierCommand(root, ["change", "create", "Parser", "parent-1"], 100);
    assert.equal(created.ok, true);
    const change = created.data as { id: string; revision: number };
    assert.match(change.id, /^epoch:change:/u);
    assert.equal(executeFrontierCommand(root, ["change", "show", change.id]).ok, true);
    const secondChange = executeFrontierCommand(root, ["change", "create", "Renderer"]);
    assert.equal(executeFrontierCommand(root, ["change", "create", "Flagged", "--draft"]).ok, true);
    assert.equal(executeFrontierCommand(root, ["change", "diff", change.id, (secondChange.data as { id: string }).id]).ok, true);
    assert.equal(executeFrontierCommand(root, ["change", "revise", change.id, "--expected-revision", "99"]).code,
      "stale-revision");
    assert.equal(executeFrontierCommand(root, ["change", "missing"]).code, "invalid-command");
    assert.equal(executeFrontierCommand(root, ["change", "show", "missing"]).code, "not-found");
    assert.equal(executeFrontierCommand(root, ["change", "create"]).code, "invalid-input");

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
    assert.equal(executeFrontierCommand(root, ["stack", "show", (stack.data as { id: string }).id]).ok, true);
    for (const action of ["add", "remove", "move", "restack"] as const) {
      assert.equal(executeFrontierCommand(root, ["stack", action, (stack.data as { id: string }).id, "revision-b"]).ok, true);
    }
    assert.equal(executeFrontierCommand(root, ["stack", "submit", (stack.data as { id: string }).id]).ok, true);
    const split = executeFrontierCommand(root, ["split", "propose", "revision-a", "--plan", '{"groups":[]}']);
    assert.equal(split.ok, true);
    assert.equal(executeFrontierCommand(root, ["split", "inspect", (split.data as { id: string }).id]).ok, true);
    assert.equal(executeFrontierCommand(root, ["split", "accept", (split.data as { id: string }).id]).ok, true);
    assert.equal(executeFrontierCommand(root, ["split", "reject", (split.data as { id: string }).id]).ok, true);
    assert.equal(executeFrontierCommand(root, ["split", "propose", "revision-a", "--plan", "{"]).code, "invalid-input");
    const weave = executeFrontierCommand(root, ["weave", "create", "parallel", "revision-a", "revision-b"]);
    assert.equal(executeFrontierCommand(root, ["weave", "show", (weave.data as { id: string }).id]).ok, true);
    assert.equal(executeFrontierCommand(root, ["weave", "checkout", (weave.data as { id: string }).id]).ok, true);
    assert.equal(executeFrontierCommand(root, ["review", "record", change.id, "--state", "approved"]).ok, true);
    const merge = executeFrontierCommand(root, ["merge-plan", "plan", "target", "revision-a"]);
    assert.equal(executeFrontierCommand(root, ["merge-plan", "inspect", (merge.data as { id: string }).id]).ok, true);
    assert.equal(executeFrontierCommand(root, ["merge-plan", "apply", (merge.data as { id: string }).id]).ok, true);
    assert.equal(executeFrontierCommand(root, ["conflict", "propose-ai", "conflict-a"]).code, "unsupported-capability");
    assert.deepEqual(executeFrontierCommand(root, ["conflict", "list"]).data, []);
    assert.equal(executeFrontierCommand(root, ["conflict", "show", "missing"]).code, "not-found");
    const workspace = executeFrontierCommand(root, ["workspace", "create", "local", "--provider", "filesystem"]);
    assert.equal(executeFrontierCommand(root, ["workspace", "inspect", (workspace.data as { id: string }).id]).ok, true);
    assert.equal(executeFrontierCommand(root, ["workspace", "capture", (workspace.data as { id: string }).id]).ok, true);
    assert.equal(executeFrontierCommand(root, ["workspace", "remove", (workspace.data as { id: string }).id]).ok, true);

    for (const command of ["clone", "fetch", "hydrate", "backfill"] as const) {
      const result = executeFrontierCommand(root, [command, "origin", "--filter", '{"paths":["src/**"]}']);
      assert.equal(result.ok, false);
      assert.equal(result.code, "unsupported-capability");
    }
    assert.equal(executeFrontierCommand(root, ["clone", "origin"]).code, "unsupported-capability");
    assert.equal(executeFrontierCommand(root, ["hydrate", "origin", "--filter", "{"]).code, "invalid-input");
    assert.equal(executeFrontierCommand(root, ["mirror", "status"]).code, "unsupported-capability");
    assert.equal(executeFrontierCommand(root, ["principal", "capabilities", "alice"]).ok, true);
    assert.equal(executeFrontierCommand(root, ["agent", "capabilities"]).ok, true);
    assert.equal(executeFrontierCommand(root, ["principal", "budget", "alice"]).code, "unsupported-capability");
    assert.equal(executeFrontierCommand(root, ["principal", "auth-explain", "alice"]).code, "auth-denied");
    assert.equal(executeFrontierCommand(root, ["forge", "capabilities"]).code, "unsupported-capability");
    const emptyBlob = join(root, "empty"); writeFileSync(emptyBlob, "");
    const computed = executeFrontierCommand(root, ["swhid", "compute", "blob", emptyBlob]);
    assert.equal((computed.data as { swhid: string }).swhid, "swh:1:cnt:e69de29bb2d1d6434b8b29ae775ad8c2e48c5391");
    assert.equal((executeFrontierCommand(root, ["swhid", "inspect", (computed.data as { swhid: string }).swhid]).data as { kind: string }).kind, "cnt");
    assert.equal((executeFrontierCommand(root, ["swhid", "verify", (computed.data as { swhid: string }).swhid, "blob", emptyBlob]).data as { matches: boolean }).matches, true);
    assert.equal((executeFrontierCommand(root, ["swhid", "verify", `swh:1:cnt:${"a".repeat(40)}`, "blob", emptyBlob]).data as { matches: boolean }).matches, false);
    assert.equal(executeFrontierCommand(root, ["swhid", "verify", "invalid", "blob", emptyBlob]).code, "invalid-input");
    assert.equal(executeFrontierCommand(root, ["swhid", "compute", "unknown", emptyBlob]).code, "invalid-input");
    assert.equal(executeFrontierCommand(root, ["swhid", "compute", "blob", join(root, "missing")]).code, "invalid-input");
    assert.equal(executeFrontierCommand(root, ["swhid", "inspect", "x"]).code, "invalid-input");
    assert.equal(executeFrontierCommand(root, ["archive", "create"]).code, "unsupported-capability");
    assert.equal(executeFrontierCommand(root, ["interop", "doctor"]).code, "unsupported-capability");
    const operations = (executeFrontierCommand(root, ["op", "log"]).data as { operationId: string }[]);
    assert.ok(operations.length > 0);
    assert.equal(executeFrontierCommand(root, ["op", "undo", operations[0]!.operationId]).ok, true);
    assert.equal(executeFrontierCommand(root, ["op", "restore", operations[0]!.operationId]).ok, true);
    assert.equal(executeFrontierCommand(root, ["op", "undo", "missing"]).code, "not-found");

    assert.equal(isFrontierCommand("stack"), true);
    assert.equal(isFrontierCommand(undefined), false);
    assert.equal(isFrontierInvocation("review", ["record"]), true);
    assert.equal(isFrontierInvocation("hydrate", ["--filter={} "]), true);
    assert.equal(isFrontierInvocation("review", ["show"]), false);

    const one = formatFrontierEnvelope(created, true);
    assert.equal(one, formatFrontierEnvelope(created, true), "JSON output is byte deterministic");
    assert.doesNotMatch(one, /token|password|secret/iu);
    assert.match(formatFrontierEnvelope(created, false), /epoch:change:/u);
    assert.match(formatFrontierEnvelope(executeFrontierCommand(root, ["missing"]), false), /^invalid-command:/u);

    let randomByte = 0;
    let revisionSequence = 0;
    const dependencies = {
      random: () => new Uint8Array(32).fill(++randomByte),
      revisionId: () => assertRevisionId(`signed-event-${++revisionSequence}`),
    };
    const injectedRevision = executeFrontierCommand(root, ["new", "--message", "canonical"], 200, dependencies);
    assert.equal((injectedRevision.data as { id: string }).id, "signed-event-1");
    assert.doesNotMatch((injectedRevision.data as { id: string }).id, /^epoch:revision:/u);
    const canonicalRecords = [
      executeFrontierCommand(root, ["change", "create", "Canonical"], 201, dependencies),
      executeFrontierCommand(root, ["stack", "create", "Canonical stack"], 202, dependencies),
      executeFrontierCommand(root, ["split", "propose", "signed-event-1", "--plan", '{"groups":[]}'], 203, dependencies),
      executeFrontierCommand(root, ["weave", "create", "Canonical weave", "signed-event-1"], 204, dependencies),
    ];
    const expectedKinds: readonly CanonicalIdKind[] = ["change", "stack", "operation", "stack"];
    canonicalRecords.forEach((envelope, index) => {
      assert.equal(envelope.ok, true);
      assert.equal(parseCanonicalId((envelope.data as { id: string }).id).kind, expectedKinds[index]);
    });
    const fixedDependencies = { random: () => new Uint8Array(32) };
    assert.equal(executeFrontierCommand(root, ["change", "create", "Fixed"], 205, fixedDependencies).ok, true);
    assert.equal(executeFrontierCommand(root, ["change", "create", "Duplicate"], 206, fixedDependencies).code, "conflict");

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

    const statePath = join(root, ".epoch", "frontier-v1.json");
    for (const malformed of [
      { schemaVersion: 2, sequence: 0, records: {}, operations: [] },
      { schemaVersion: 1, sequence: 0.5, records: {}, operations: [] },
      { schemaVersion: 1, sequence: 0, records: "invalid", operations: [] },
      { schemaVersion: 1, sequence: 0, records: {}, operations: {} },
    ]) {
      writeFileSync(statePath, JSON.stringify(malformed));
      assert.equal(executeFrontierCommand(root, ["op", "log"]).code, "invalid-input");
    }
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
  const complete = await interopDoctor({
    exec(command, args) {
      if (command === "git" && args[0] === "version") return "build options";
      return `${command} version 1`;
    },
    adapters: [{ id: "z-adapter", status: "supported" }, { id: "a-adapter", status: "degraded" }],
    swhid: { id: "swhid", status: "supported", version: "1.2" },
  });
  assert.equal(complete.git.mode, "protocol-v2-subset");
  assert.equal(complete.optionalTools.every((probe) => probe.status === "supported"), true);
  assert.deepEqual(complete.adapters.map((adapter) => adapter.id), ["a-adapter", "z-adapter"]);
  assert.equal(complete.swhid.status, "supported");
  const unavailable = await interopDoctor({ exec() { throw new Error("unavailable"); } });
  assert.equal(unavailable.git.status, "unsupported");
  assert.equal(unavailable.git.mode, undefined);
}
