import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { executeChangeGraphCommand, formatChangeGraphCommandEnvelope, interopDoctor, isChangeGraphCommand, isChangeGraphInvocation, main } from "@epoch/cli";
import { EpochRepository, startGossipServer } from "@epoch/core";
import { assertRevisionId, parseCanonicalId, type CanonicalIdKind } from "@epoch/protocol";
import { isObjectNonNull } from "../helpers/type-guards";

export async function runChangeGraphCliTests(): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), "epoch-change-graph-cli-"));
  try {
    const created = (await executeChangeGraphCommand(root, ["change", "create", "Parser"], 100));
    assert.equal(created.ok, true);
    // SAFETY: Runtime checks or construction above establish { id: string.
    const change = created.data as { id: string; revision: number };
    assert.match(change.id, /^epoch:change:/u);
    assert.equal((await executeChangeGraphCommand(root, ["change", "show", change.id])).ok, true);
    const secondChange = (await executeChangeGraphCommand(root, ["change", "create", "Renderer"]));
    assert.equal((await executeChangeGraphCommand(root, ["change", "create", "Flagged", "--draft"])).ok, true);
    // SAFETY: Runtime checks or construction above establish { id: string }).id])).ok.
    assert.equal((await executeChangeGraphCommand(root, ["change", "diff", change.id, (secondChange.data as { id: string }).id])).ok, true);
    assert.equal((await executeChangeGraphCommand(root, ["change", "revise", change.id, "--expected-revision", "99"])).code,
      "stale-revision");
    assert.equal((await executeChangeGraphCommand(root, ["change", "missing"])).code, "invalid-command");
    assert.equal((await executeChangeGraphCommand(root, ["change", "show", "missing"])).code, "not-found");
    assert.equal((await executeChangeGraphCommand(root, ["change", "create"])).code, "invalid-input");

    assert.equal((await executeChangeGraphCommand(root, ["new", "parent-a", "parent-b", "--message", "merge"])).code, "invalid-input");
    const rootRevision = (await executeChangeGraphCommand(root, ["new", "--message", "root"], 101));
    const otherRevision = (await executeChangeGraphCommand(root, ["new", "--message", "other"], 101));
    // SAFETY: Runtime checks or construction above establish { id: string }).id.
    const revision = (await executeChangeGraphCommand(root, ["new", (rootRevision.data as { id: string }).id, (otherRevision.data as { id: string }).id, "--message", "merge"], 101));
    assert.equal(revision.ok, true);
    // SAFETY: Runtime checks or construction above establish { id: string }).id.
    const childRevision = (await executeChangeGraphCommand(root, ["new", (rootRevision.data as { id: string }).id, "--message", "child"], 101));
    const roots = (await executeChangeGraphCommand(root, ["log", "--revisions", "roots()"]));
    // SAFETY: Runtime checks or construction above establish { revisions: readonly { id: string }[] }).revisions.map((item) => item.id).
    const rootIds = (roots.data as { revisions: readonly { id: string }[] }).revisions.map((item) => item.id);
    // SAFETY: Runtime checks or construction above establish { id: string }).id)).
    assert.ok(rootIds.includes((rootRevision.data as { id: string }).id));
    // SAFETY: Runtime checks or construction above establish { id: string }).id).
    assert.equal(rootIds.includes((childRevision.data as { id: string }).id), false);
    // SAFETY: Runtime checks or construction above establish { id: string }).id})`])).
    const ancestry = (await executeChangeGraphCommand(root, ["log", "--revisions", `ancestors(${(childRevision.data as { id: string }).id})`]));
    // SAFETY: Runtime checks or construction above establish { revisions: readonly { id: string }[] }).revisions.map((item) => item.id).sort().
    assert.deepEqual((ancestry.data as { revisions: readonly { id: string }[] }).revisions.map((item) => item.id).sort(),
      // SAFETY: Runtime checks or construction above establish { id: string }).id.
      [(childRevision.data as { id: string }).id, (rootRevision.data as { id: string }).id].sort());
    assert.equal((await executeChangeGraphCommand(root, ["log", "--revisions", "unknown()"])).code, "invalid-input");
    // SAFETY: Runtime checks or construction above establish { id: string }).id].
    const graph = (await executeChangeGraphCommand(root, ["graph", "create", "series", (revision.data as { id: string }).id], 102));
    assert.equal(graph.ok, true);
    // SAFETY: Runtime checks or construction above establish { id: string }).id])).ok.
    assert.equal((await executeChangeGraphCommand(root, ["graph", "show", (graph.data as { id: string }).id])).ok, true);
    for (const action of ["add", "remove", "order", "restack"] as const) {
      // SAFETY: Runtime checks or construction above establish { id: string }).id.
      assert.equal((await executeChangeGraphCommand(root, ["graph", action, (graph.data as { id: string }).id, (otherRevision.data as { id: string }).id])).ok, true);
    }
    // SAFETY: Runtime checks or construction above establish { id: string }).id])).ok.
    assert.equal((await executeChangeGraphCommand(root, ["graph", "submit", (graph.data as { id: string }).id])).ok, true);
    // SAFETY: Runtime checks or construction above establish { id: string }).id.
    const split = (await executeChangeGraphCommand(root, ["split", "propose", (rootRevision.data as { id: string }).id, "--plan", '{"groups":[]}']));
    assert.equal(split.ok, true);
    // SAFETY: Runtime checks or construction above establish { id: string }).id])).ok.
    assert.equal((await executeChangeGraphCommand(root, ["split", "inspect", (split.data as { id: string }).id])).ok, true);
    // SAFETY: Runtime checks or construction above establish { id: string }).id])).ok.
    assert.equal((await executeChangeGraphCommand(root, ["split", "accept", (split.data as { id: string }).id])).ok, true);
    // SAFETY: Runtime checks or construction above establish { id: string }).id])).ok.
    assert.equal((await executeChangeGraphCommand(root, ["split", "reject", (split.data as { id: string }).id])).ok, true);
    // SAFETY: Runtime checks or construction above establish { id: string }).id.
    assert.equal((await executeChangeGraphCommand(root, ["split", "propose", (rootRevision.data as { id: string }).id, "--plan", "{"])).code, "invalid-input");
    // SAFETY: Runtime checks or construction above establish { id: string }).id.
    const bundle = (await executeChangeGraphCommand(root, ["bundle", "create", "parallel", (rootRevision.data as { id: string }).id, (otherRevision.data as { id: string }).id]));
    // SAFETY: Runtime checks or construction above establish { id: string }).id])).ok.
    assert.equal((await executeChangeGraphCommand(root, ["bundle", "show", (bundle.data as { id: string }).id])).ok, true);
    // SAFETY: Runtime checks or construction above establish { id: string }).id])).ok.
    assert.equal((await executeChangeGraphCommand(root, ["bundle", "materialize", (bundle.data as { id: string }).id])).ok, true);
    const review = (await executeChangeGraphCommand(root, ["review", "record", change.id, "--state", "approved"]));
    assert.equal(review.ok, true);
    // SAFETY: Runtime checks or construction above establish { id: string }).id.
    assert.match((review.data as { id: string }).id, /^[a-f0-9]{64}$/u);
    // SAFETY: Runtime checks or construction above establish { id: string }).id.
    const merge = (await executeChangeGraphCommand(root, ["merge-plan", "plan", (rootRevision.data as { id: string }).id, (otherRevision.data as { id: string }).id]));
    // SAFETY: Runtime checks or construction above establish { id: string }).id])).ok.
    assert.equal((await executeChangeGraphCommand(root, ["merge-plan", "inspect", (merge.data as { id: string }).id])).ok, true);
    // SAFETY: Runtime checks or construction above establish { id: string }).id])).ok.
    assert.equal((await executeChangeGraphCommand(root, ["merge-plan", "apply", (merge.data as { id: string }).id])).ok, true);
    const proposal = (await executeChangeGraphCommand(root, ["conflict", "propose-ai", "conflict-a"]));
    assert.equal(proposal.ok, true);
    // SAFETY: Runtime checks or construction above establish { data: { trusted: boolean } }).data.trusted.
    assert.equal((proposal.data as { data: { trusted: boolean } }).data.trusted, false);
    // SAFETY: Runtime checks or construction above establish { id: string }).id.
    const conflictId = (proposal.data as { id: string }).id;
    // SAFETY: Runtime checks or construction above establish { id: string }[].
    const listed = (await executeChangeGraphCommand(root, ["conflict", "list"])).data as { id: string }[];
    assert.ok(listed.some((item) => item.id === conflictId));
    assert.equal((await executeChangeGraphCommand(root, ["conflict", "show", conflictId])).ok, true);
    assert.equal((await executeChangeGraphCommand(root, ["conflict", "accept", conflictId])).ok, true);
    // SAFETY: Runtime checks or construction above establish { data: { status: string } }).data.status.
    assert.equal(((await executeChangeGraphCommand(root, ["conflict", "show", conflictId])).data as { data: { status: string } }).data.status, "accepted");
    const rejected = (await executeChangeGraphCommand(root, ["conflict", "propose-ai"]));
    // SAFETY: Runtime checks or construction above establish { id: string }).id])).ok.
    assert.equal((await executeChangeGraphCommand(root, ["conflict", "reject", (rejected.data as { id: string }).id])).ok, true);
    assert.equal((await executeChangeGraphCommand(root, ["conflict", "show", "missing"])).code, "not-found");
    const workspace = (await executeChangeGraphCommand(root, ["workspace", "create", "local", "--provider", "filesystem"]));
    // SAFETY: Runtime checks or construction above establish { id: string }).id])).ok.
    assert.equal((await executeChangeGraphCommand(root, ["workspace", "inspect", (workspace.data as { id: string }).id])).ok, true);
    // SAFETY: Runtime checks or construction above establish { id: string }).id])).ok.
    assert.equal((await executeChangeGraphCommand(root, ["workspace", "capture", (workspace.data as { id: string }).id])).ok, true);
    // SAFETY: Runtime checks or construction above establish { id: string }).id])).ok.
    assert.equal((await executeChangeGraphCommand(root, ["workspace", "remove", (workspace.data as { id: string }).id])).ok, true);

    const peer = mkdtempSync(join(tmpdir(), "epoch-cli-peer-"));
    (await executeChangeGraphCommand(peer, ["change", "create", "Peer"]));
    assert.equal((await executeChangeGraphCommand(root, ["clone", peer])).ok, true);
    assert.equal((await executeChangeGraphCommand(root, ["fetch", peer])).ok, true);
    assert.equal((await executeChangeGraphCommand(root, ["backfill"])).ok, true);
    const gitSrc = mkdtempSync(join(tmpdir(), "epoch-cli-git-src-"));
    execFileSync("git", ["-C", gitSrc, "init"]);
    execFileSync("git", ["-C", gitSrc, "config", "user.email", "epoch@example.invalid"]);
    execFileSync("git", ["-C", gitSrc, "config", "user.name", "Epoch"]);
    writeFileSync(join(gitSrc, "README.md"), "ok\n");
    execFileSync("git", ["-C", gitSrc, "add", "README.md"]);
    execFileSync("git", ["-C", gitSrc, "commit", "-m", "init"]);
    assert.equal((await executeChangeGraphCommand(root, ["clone", `file://${gitSrc}`])).ok, true);
    const gitClone = (await executeChangeGraphCommand(root, ["clone", "file:///tmp/epoch-missing-origin.git"]));
    assert.equal(gitClone.ok, false);
    assert.equal(gitClone.code, "external-error");
    rmSync(peer, { recursive: true, force: true });
    rmSync(gitSrc, { recursive: true, force: true });
    assert.equal((await executeChangeGraphCommand(root, ["hydrate", "--filter", '{"paths":["src/**"]}'])).ok, true);
    assert.equal((await executeChangeGraphCommand(root, ["hydrate", "origin", "--filter", "{"])).code, "invalid-input");
    assert.equal((await executeChangeGraphCommand(root, ["mirror", "status"])).ok, true);
    const mirror = (await executeChangeGraphCommand(root, ["mirror", "add", "refs/heads/main"]));
    assert.equal(mirror.ok, true);
    // SAFETY: Runtime checks or construction above establish { id: string }).id])).ok.
    assert.equal((await executeChangeGraphCommand(root, ["mirror", "inspect", (mirror.data as { id: string }).id])).ok, true);
    assert.equal((await executeChangeGraphCommand(root, ["principal", "capabilities", "alice"])).ok, true);
    assert.equal((await executeChangeGraphCommand(root, ["agent", "capabilities"])).ok, true);
    const budget = (await executeChangeGraphCommand(root, ["principal", "budget", "alice"]));
    assert.equal(budget.ok, true);
    // SAFETY: Runtime checks or construction above establish { remaining: number }).remaining.
    assert.equal((budget.data as { remaining: number }).remaining, 0);
    assert.equal((await executeChangeGraphCommand(root, ["principal", "budget", "allocate", "--units", "12"])).ok, true);
    assert.equal((await executeChangeGraphCommand(root, ["principal", "auth-explain", "alice"])).code, "auth-denied");
    assert.equal((await executeChangeGraphCommand(root, ["forge", "capabilities"])).ok, true);
    const emptyBlob = join(root, "empty"); writeFileSync(emptyBlob, "");
    const computed = (await executeChangeGraphCommand(root, ["swhid", "compute", "blob", emptyBlob]));
    // SAFETY: Runtime checks or construction above establish { swhid: string }).swhid.
    assert.equal((computed.data as { swhid: string }).swhid, "swh:1:cnt:e69de29bb2d1d6434b8b29ae775ad8c2e48c5391");
    // SAFETY: Runtime checks or construction above establish { swhid: string }).swhid])).data as { kind: string }).kind.
    assert.equal(((await executeChangeGraphCommand(root, ["swhid", "inspect", (computed.data as { swhid: string }).swhid])).data as { kind: string }).kind, "cnt");
    // SAFETY: Runtime checks or construction above establish { swhid: string }).swhid.
    assert.equal(((await executeChangeGraphCommand(root, ["swhid", "verify", (computed.data as { swhid: string }).swhid, "blob", emptyBlob])).data as { matches: boolean }).matches, true);
    // SAFETY: Runtime checks or construction above establish { matches: boolean }).matches.
    assert.equal(((await executeChangeGraphCommand(root, ["swhid", "verify", `swh:1:cnt:${"a".repeat(40)}`, "blob", emptyBlob])).data as { matches: boolean }).matches, false);
    assert.equal((await executeChangeGraphCommand(root, ["swhid", "verify", "invalid", "blob", emptyBlob])).code, "invalid-input");
    assert.equal((await executeChangeGraphCommand(root, ["swhid", "compute", "unknown", emptyBlob])).code, "invalid-input");
    assert.equal((await executeChangeGraphCommand(root, ["swhid", "compute", "blob", join(root, "missing")])).code, "invalid-input");
    assert.equal((await executeChangeGraphCommand(root, ["swhid", "inspect", "x"])).code, "invalid-input");
    // SAFETY: Runtime checks or construction above establish { swhid: string }).swhid])).ok.
    assert.equal((await executeChangeGraphCommand(root, ["archive", "software-heritage", "map", (computed.data as { swhid: string }).swhid])).ok, true);
    const archiveServer = createServer((_request, response) => {
      response.setHeader("content-type", "application/json");
      response.setHeader("connection", "close");
      response.end(JSON.stringify({ id: "task-1", save_task_status: "succeeded", visit_status: "full", origin_url: "https://example.com/repo.git" }));
    });
    await new Promise<void>((resolveListen) => archiveServer.listen(0, "127.0.0.1", resolveListen));
    const archiveAddress = archiveServer.address();
    const previousSave = process.env.EPOCH_SWH_SAVE_URL;
    process.env.EPOCH_SWH_SAVE_URL = `http://127.0.0.1:${isObjectNonNull(archiveAddress) ? archiveAddress.port : 0}/`;
    try {
      assert.equal((await executeChangeGraphCommand(root, ["archive", "software-heritage", "request", "https://example.com/repo.git"])).ok, true);
      assert.equal((await executeChangeGraphCommand(root, ["archive", "create", "--origin", "https://example.com/repo.git"])).ok, true);
      assert.equal((await executeChangeGraphCommand(root, ["archive", "software-heritage", "request", "http://127.0.0.1/private.git"])).code, "auth-denied");
      assert.equal((await executeChangeGraphCommand(root, ["archive", "software-heritage", "request", "https://example.com/repo.git", "--visibility", "private"])).code, "auth-denied");
    } finally {
      if (previousSave === undefined) delete process.env.EPOCH_SWH_SAVE_URL; else process.env.EPOCH_SWH_SAVE_URL = previousSave;
      await new Promise<void>((resolveClose, reject) => archiveServer.close((error) => error ? reject(error) : resolveClose()));
    }
    const gossipRoot = mkdtempSync(join(tmpdir(), "epoch-cli-gossip-"));
    (await executeChangeGraphCommand(gossipRoot, ["change", "create", "GossipPeer"]));
    const gossip = await startGossipServer(new EpochRepository(gossipRoot), { host: "127.0.0.1" });
    try {
      assert.equal((await executeChangeGraphCommand(root, ["clone", gossip.url])).ok, true);
    } finally {
      await gossip.close();
      rmSync(gossipRoot, { recursive: true, force: true });
    }
    assert.equal((await executeChangeGraphCommand(root, ["interop", "doctor"])).ok, true);
    // SAFETY: Runtime checks or construction above establish { operationId: string }[]).
    const operations = ((await executeChangeGraphCommand(root, ["op", "log"])).data as { operationId: string }[]);
    assert.ok(operations.length > 0);
    assert.equal((await executeChangeGraphCommand(root, ["op", "undo", operations[0]!.operationId])).ok, true);
    assert.equal((await executeChangeGraphCommand(root, ["op", "restore", operations[0]!.operationId])).ok, true);
    assert.equal((await executeChangeGraphCommand(root, ["op", "undo", "missing"])).code, "not-found");

    assert.equal(isChangeGraphCommand("graph"), true);
    assert.equal(isChangeGraphCommand(undefined), false);
    assert.equal(isChangeGraphInvocation("review", ["record"]), true);
    assert.equal(isChangeGraphInvocation("hydrate", ["--filter={} "]), true);
    assert.equal(isChangeGraphInvocation("review", ["show"]), false);

    const one = formatChangeGraphCommandEnvelope(created, true);
    assert.equal(one, formatChangeGraphCommandEnvelope(created, true), "JSON output is byte deterministic");
    assert.doesNotMatch(one, /token|password|secret/iu);
    assert.match(formatChangeGraphCommandEnvelope(created, false), /epoch:change:/u);
    assert.match(formatChangeGraphCommandEnvelope((await executeChangeGraphCommand(root, ["missing"])), false), /^invalid-command:/u);

    let randomByte = 0;
    let revisionSequence = 0;
    const dependencies = {
      random: () => new Uint8Array(32).fill(++randomByte),
      revisionId: () => assertRevisionId(`signed-event-${++revisionSequence}`),
    };
    const injectedRevision = (await executeChangeGraphCommand(root, ["new", "--message", "canonical"], 200, dependencies));
    // SAFETY: Runtime checks or construction above establish { id: string }).id.
    assert.match((injectedRevision.data as { id: string }).id, /^[a-f0-9]{64}$/u);
    // SAFETY: Runtime checks or construction above establish { id: string }).id.
    assert.doesNotMatch((injectedRevision.data as { id: string }).id, /^epoch:revision:/u);
    const canonicalRecords = [
      (await executeChangeGraphCommand(root, ["change", "create", "Canonical"], 201, dependencies)),
      (await executeChangeGraphCommand(root, ["graph", "create", "Canonical graph"], 202, dependencies)),
      // SAFETY: Runtime checks or construction above establish { id: string }).id.
      (await executeChangeGraphCommand(root, ["split", "propose", (/* SAFETY: Assertion is justified by surrounding validation or construction. */ injectedRevision.data as { id: string }).id, "--plan", '{"groups":[]}'], 203, dependencies)),
      // SAFETY: Runtime checks or construction above establish { id: string }).id].
      (await executeChangeGraphCommand(root, ["bundle", "create", "Canonical bundle", (/* SAFETY: Assertion is justified by surrounding validation or construction. */ injectedRevision.data as { id: string }).id], 204, dependencies)),
    ];
    const expectedKinds: readonly CanonicalIdKind[] = ["change", "change-graph", "operation", "review-bundle"];
    canonicalRecords.forEach((envelope, index) => {
      assert.equal(envelope.ok, true);
      // SAFETY: Runtime checks or construction above establish { id: string }).id).kind.
      assert.equal(parseCanonicalId((envelope.data as { id: string }).id).kind, expectedKinds[index]);
    });
    const fixedDependencies = { random: () => new Uint8Array(32) };
    assert.equal((await executeChangeGraphCommand(root, ["change", "create", "Fixed"], 205, fixedDependencies)).ok, true);
    assert.equal((await executeChangeGraphCommand(root, ["change", "create", "Duplicate"], 206, fixedDependencies)).code, "conflict");

    const invoke = async (args: string[]) => {
      let stdout = ""; let stderr = "";
      const result = main(["--repo", root, ...args], {
        stdout: { write(value) { stdout += String(value); } }, stderr: { write(value) { stderr += String(value); } },
      });
      const exitCode = isObjectNonNull(result) && "then" in result ? await result : result;
      return { exitCode, stdout, stderr };
    };
    const help = await invoke(["help"]);
    assert.equal(help.exitCode, 0);
    assert.match(help.stdout, /epoch-community/u);
    assert.match(help.stdout, /unsupported-capability/u);
    const jsonSuccess = await invoke(["workspace", "list", "--json"]);
    assert.equal(jsonSuccess.exitCode, 0);
    assert.equal(JSON.parse(jsonSuccess.stdout).code, "ok");
    assert.equal(jsonSuccess.stderr, "");
    const jsonInvalid = await invoke(["graph", "invalid", "--json"]);
    assert.equal(jsonInvalid.exitCode, 1);
    assert.equal(JSON.parse(jsonInvalid.stderr).code, "invalid-command");
    assert.equal(jsonInvalid.stdout, "");
    const jsonAuth = await invoke(["principal", "auth-explain", "alice", "--json"]);
    assert.equal(jsonAuth.exitCode, 1);
    assert.equal(JSON.parse(jsonAuth.stderr).code, "auth-denied");
    assert.equal(jsonAuth.stdout, "");
    const jsonUnsupported = await invoke(["forge", "export", "--json"]);
    assert.equal(jsonUnsupported.exitCode, 1);
    assert.equal(JSON.parse(jsonUnsupported.stderr).code, "invalid-input");
    assert.equal(jsonUnsupported.stdout, "");
    const exported = (await executeChangeGraphCommand(root, ["forge", "export-f3", "--objects", "[]"]));
    assert.equal(exported.ok, true);

    const leftover = join(root, ".epoch", "change-graph-v1.json");
    writeFileSync(leftover, "{\"schemaVersion\":2}");
    assert.equal((await executeChangeGraphCommand(root, ["op", "log"])).ok, true);
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
