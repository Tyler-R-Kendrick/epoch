import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeChangeGraphCommand, formatChangeGraphCommandEnvelope, interopDoctor, isChangeGraphCommand, isChangeGraphInvocation, main } from "@epoch/cli";
import { EpochRepository } from "@epoch/core";
import { assertRevisionId, parseCanonicalId, type CanonicalIdKind } from "@epoch/protocol";

export async function runChangeGraphCliTests(): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), "epoch-change-graph-cli-"));
  try {
    const created = executeChangeGraphCommand(root, ["change", "create", "Parser", "parent-1"], 100);
    assert.equal(created.ok, true);
    const change = created.data as { id: string; revision: number };
    assert.match(change.id, /^epoch:change:/u);
    assert.equal(executeChangeGraphCommand(root, ["change", "show", change.id]).ok, true);
    const secondChange = executeChangeGraphCommand(root, ["change", "create", "Renderer"]);
    assert.equal(executeChangeGraphCommand(root, ["change", "create", "Flagged", "--draft"]).ok, true);
    assert.equal(executeChangeGraphCommand(root, ["change", "diff", change.id, (secondChange.data as { id: string }).id]).ok, true);
    assert.equal(executeChangeGraphCommand(root, ["change", "revise", change.id, "--expected-revision", "99"]).code,
      "stale-revision");
    assert.equal(executeChangeGraphCommand(root, ["change", "missing"]).code, "invalid-command");
    assert.equal(executeChangeGraphCommand(root, ["change", "show", "missing"]).code, "not-found");
    assert.equal(executeChangeGraphCommand(root, ["change", "create"]).code, "invalid-input");

    const revision = executeChangeGraphCommand(root, ["new", "parent-a", "parent-b", "--message", "merge"], 101);
    assert.equal(revision.ok, true);
    const rootRevision = executeChangeGraphCommand(root, ["new", "--message", "root"], 101);
    const childRevision = executeChangeGraphCommand(root, ["new", (rootRevision.data as { id: string }).id, "--message", "child"], 101);
    const roots = executeChangeGraphCommand(root, ["log", "--revisions", "roots()"]);
    assert.deepEqual((roots.data as { revisions: readonly { id: string }[] }).revisions.map((item) => item.id),
      [(rootRevision.data as { id: string }).id]);
    const ancestry = executeChangeGraphCommand(root, ["log", "--revisions", `ancestors(${(childRevision.data as { id: string }).id})`]);
    assert.deepEqual((ancestry.data as { revisions: readonly { id: string }[] }).revisions.map((item) => item.id).sort(),
      [(childRevision.data as { id: string }).id, (rootRevision.data as { id: string }).id].sort());
    assert.equal(executeChangeGraphCommand(root, ["log", "--revisions", "unknown()"]).code, "invalid-input");
    const graph = executeChangeGraphCommand(root, ["graph", "create", "series", (revision.data as { id: string }).id], 102);
    assert.equal(graph.ok, true);
    assert.equal(executeChangeGraphCommand(root, ["graph", "show", (graph.data as { id: string }).id]).ok, true);
    for (const action of ["add", "remove", "order", "restack"] as const) {
      assert.equal(executeChangeGraphCommand(root, ["graph", action, (graph.data as { id: string }).id, "revision-b"]).ok, true);
    }
    assert.equal(executeChangeGraphCommand(root, ["graph", "submit", (graph.data as { id: string }).id]).ok, true);
    const split = executeChangeGraphCommand(root, ["split", "propose", "revision-a", "--plan", '{"groups":[]}']);
    assert.equal(split.ok, true);
    assert.equal(executeChangeGraphCommand(root, ["split", "inspect", (split.data as { id: string }).id]).ok, true);
    assert.equal(executeChangeGraphCommand(root, ["split", "accept", (split.data as { id: string }).id]).ok, true);
    assert.equal(executeChangeGraphCommand(root, ["split", "reject", (split.data as { id: string }).id]).ok, true);
    assert.equal(executeChangeGraphCommand(root, ["split", "propose", "revision-a", "--plan", "{"]).code, "invalid-input");
    const bundle = executeChangeGraphCommand(root, ["bundle", "create", "parallel", "revision-a", "revision-b"]);
    assert.equal(executeChangeGraphCommand(root, ["bundle", "show", (bundle.data as { id: string }).id]).ok, true);
    assert.equal(executeChangeGraphCommand(root, ["bundle", "materialize", (bundle.data as { id: string }).id]).ok, true);
    const review = executeChangeGraphCommand(root, ["review", "record", change.id, "--state", "approved"]);
    assert.equal(review.ok, true);
    assert.match((review.data as { id: string }).id, /^[a-f0-9]{64}$/u);
    const merge = executeChangeGraphCommand(root, ["merge-plan", "plan", "target", "revision-a"]);
    assert.equal(executeChangeGraphCommand(root, ["merge-plan", "inspect", (merge.data as { id: string }).id]).ok, true);
    assert.equal(executeChangeGraphCommand(root, ["merge-plan", "apply", (merge.data as { id: string }).id]).ok, true);
    assert.equal(executeChangeGraphCommand(root, ["conflict", "propose-ai", "conflict-a"]).code, "unsupported-capability");
    assert.deepEqual(executeChangeGraphCommand(root, ["conflict", "list"]).data, []);
    assert.equal(executeChangeGraphCommand(root, ["conflict", "show", "missing"]).code, "not-found");
    const workspace = executeChangeGraphCommand(root, ["workspace", "create", "local", "--provider", "filesystem"]);
    assert.equal(executeChangeGraphCommand(root, ["workspace", "inspect", (workspace.data as { id: string }).id]).ok, true);
    assert.equal(executeChangeGraphCommand(root, ["workspace", "capture", (workspace.data as { id: string }).id]).ok, true);
    assert.equal(executeChangeGraphCommand(root, ["workspace", "remove", (workspace.data as { id: string }).id]).ok, true);

    for (const command of ["clone", "fetch", "hydrate", "backfill"] as const) {
      const result = executeChangeGraphCommand(root, [command, "origin", "--filter", '{"paths":["src/**"]}']);
      assert.equal(result.ok, false);
      assert.equal(result.code, "unsupported-capability");
    }
    assert.equal(executeChangeGraphCommand(root, ["clone", "origin"]).code, "unsupported-capability");
    assert.equal(executeChangeGraphCommand(root, ["hydrate", "origin", "--filter", "{"]).code, "invalid-input");
    assert.equal(executeChangeGraphCommand(root, ["mirror", "status"]).code, "unsupported-capability");
    assert.equal(executeChangeGraphCommand(root, ["principal", "capabilities", "alice"]).ok, true);
    assert.equal(executeChangeGraphCommand(root, ["agent", "capabilities"]).ok, true);
    assert.equal(executeChangeGraphCommand(root, ["principal", "budget", "alice"]).code, "unsupported-capability");
    assert.equal(executeChangeGraphCommand(root, ["principal", "auth-explain", "alice"]).code, "auth-denied");
    assert.equal(executeChangeGraphCommand(root, ["forge", "capabilities"]).ok, true);
    const emptyBlob = join(root, "empty"); writeFileSync(emptyBlob, "");
    const computed = executeChangeGraphCommand(root, ["swhid", "compute", "blob", emptyBlob]);
    assert.equal((computed.data as { swhid: string }).swhid, "swh:1:cnt:e69de29bb2d1d6434b8b29ae775ad8c2e48c5391");
    assert.equal((executeChangeGraphCommand(root, ["swhid", "inspect", (computed.data as { swhid: string }).swhid]).data as { kind: string }).kind, "cnt");
    assert.equal((executeChangeGraphCommand(root, ["swhid", "verify", (computed.data as { swhid: string }).swhid, "blob", emptyBlob]).data as { matches: boolean }).matches, true);
    assert.equal((executeChangeGraphCommand(root, ["swhid", "verify", `swh:1:cnt:${"a".repeat(40)}`, "blob", emptyBlob]).data as { matches: boolean }).matches, false);
    assert.equal(executeChangeGraphCommand(root, ["swhid", "verify", "invalid", "blob", emptyBlob]).code, "invalid-input");
    assert.equal(executeChangeGraphCommand(root, ["swhid", "compute", "unknown", emptyBlob]).code, "invalid-input");
    assert.equal(executeChangeGraphCommand(root, ["swhid", "compute", "blob", join(root, "missing")]).code, "invalid-input");
    assert.equal(executeChangeGraphCommand(root, ["swhid", "inspect", "x"]).code, "invalid-input");
    assert.equal(executeChangeGraphCommand(root, ["archive", "create"]).code, "unsupported-capability");
    assert.equal(executeChangeGraphCommand(root, ["interop", "doctor"]).code, "unsupported-capability");
    const operations = (executeChangeGraphCommand(root, ["op", "log"]).data as { operationId: string }[]);
    assert.ok(operations.length > 0);
    assert.equal(executeChangeGraphCommand(root, ["op", "undo", operations[0]!.operationId]).ok, true);
    assert.equal(executeChangeGraphCommand(root, ["op", "restore", operations[0]!.operationId]).ok, true);
    assert.equal(executeChangeGraphCommand(root, ["op", "undo", "missing"]).code, "not-found");

    assert.equal(isChangeGraphCommand("graph"), true);
    assert.equal(isChangeGraphCommand(undefined), false);
    assert.equal(isChangeGraphInvocation("review", ["record"]), true);
    assert.equal(isChangeGraphInvocation("hydrate", ["--filter={} "]), true);
    assert.equal(isChangeGraphInvocation("review", ["show"]), false);

    const one = formatChangeGraphCommandEnvelope(created, true);
    assert.equal(one, formatChangeGraphCommandEnvelope(created, true), "JSON output is byte deterministic");
    assert.doesNotMatch(one, /token|password|secret/iu);
    assert.match(formatChangeGraphCommandEnvelope(created, false), /epoch:change:/u);
    assert.match(formatChangeGraphCommandEnvelope(executeChangeGraphCommand(root, ["missing"]), false), /^invalid-command:/u);

    let randomByte = 0;
    let revisionSequence = 0;
    const dependencies = {
      random: () => new Uint8Array(32).fill(++randomByte),
      revisionId: () => assertRevisionId(`signed-event-${++revisionSequence}`),
    };
    const injectedRevision = executeChangeGraphCommand(root, ["new", "--message", "canonical"], 200, dependencies);
    assert.match((injectedRevision.data as { id: string }).id, /^[a-f0-9]{64}$/u);
    assert.doesNotMatch((injectedRevision.data as { id: string }).id, /^epoch:revision:/u);
    const canonicalRecords = [
      executeChangeGraphCommand(root, ["change", "create", "Canonical"], 201, dependencies),
      executeChangeGraphCommand(root, ["graph", "create", "Canonical graph"], 202, dependencies),
      executeChangeGraphCommand(root, ["split", "propose", "signed-event-1", "--plan", '{"groups":[]}'], 203, dependencies),
      executeChangeGraphCommand(root, ["bundle", "create", "Canonical bundle", "signed-event-1"], 204, dependencies),
    ];
    const expectedKinds: readonly CanonicalIdKind[] = ["change", "change-graph", "operation", "review-bundle"];
    canonicalRecords.forEach((envelope, index) => {
      assert.equal(envelope.ok, true);
      assert.equal(parseCanonicalId((envelope.data as { id: string }).id).kind, expectedKinds[index]);
    });
    const fixedDependencies = { random: () => new Uint8Array(32) };
    assert.equal(executeChangeGraphCommand(root, ["change", "create", "Fixed"], 205, fixedDependencies).ok, true);
    assert.equal(executeChangeGraphCommand(root, ["change", "create", "Duplicate"], 206, fixedDependencies).code, "conflict");

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
    const jsonInvalid = invoke(["graph", "invalid", "--json"]);
    assert.equal(jsonInvalid.exitCode, 1);
    assert.equal(JSON.parse(jsonInvalid.stderr).code, "invalid-command");
    assert.equal(jsonInvalid.stdout, "");
    const jsonAuth = invoke(["principal", "auth-explain", "alice", "--json"]);
    assert.equal(jsonAuth.exitCode, 1);
    assert.equal(JSON.parse(jsonAuth.stderr).code, "auth-denied");
    assert.equal(jsonAuth.stdout, "");
    const jsonUnsupported = invoke(["forge", "export", "--json"]);
    assert.equal(jsonUnsupported.exitCode, 1);
    assert.equal(JSON.parse(jsonUnsupported.stderr).code, "invalid-input");
    assert.equal(jsonUnsupported.stdout, "");
    const exported = executeChangeGraphCommand(root, ["forge", "export-f3", "--objects", "[]"]);
    assert.equal(exported.ok, true);

    const leftover = join(root, ".epoch", "change-graph-v1.json");
    writeFileSync(leftover, "{\"schemaVersion\":2}");
    assert.equal(executeChangeGraphCommand(root, ["op", "log"]).ok, true);
    assert.deepEqual(new EpochRepository(root).verify(), []);
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
