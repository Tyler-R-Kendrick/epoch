import assert from "node:assert/strict";
import {
  encodePktLine,
  parsePktLines,
  protocolV2Advertisement,
  gitProtocolEnvironment,
} from "@epoch/git-proxy";
import {
  gitBlob,
  gitCommit,
  gitTree,
  createProjectionManifest,
  projectGitGraph,
  analyzeGitIngestLoss,
} from "@epoch/git-proxy";
import { GitReceiveQuarantine } from "@epoch/git-proxy";
import {
  REMOTE_HELPER_CAPABILITIES,
  parseRemoteHelperCommand,
  proposalRef,
  remoteHelperCapabilities,
  runGitRemoteEpoch,
} from "@epoch/git-proxy";
import { Readable } from "node:stream";
import {
  COMPATIBILITY_PROFILES,
  graphiteStack,
  gitButlerParallelBranches,
  jjChangeRevision,
} from "@epoch/git-proxy";

export async function runGitConvergenceFoundationTests(): Promise<void> {
  deterministicObjectsAndProjectionManifest();
  protocolV2IsBoundedAndFilterIsHonest();
  await receiveQuarantineVerifiesBeforePromotion();
  await remoteHelperAndCompatibilityProfilesAreExplicit();
}

function deterministicObjectsAndProjectionManifest(): void {
  const blob = gitBlob(Buffer.from("hello\n"));
  assert.equal(blob.oid, "ce013625030ba8dba906f756967f9e9ca394464a");
  const tree = gitTree([{ mode: "100644", name: "hello.txt", oid: blob.oid }]);
  const commit = gitCommit({ tree: tree.oid, parents: [], author: {
    name: "Epoch", email: "epoch@example.invalid", timestamp: 1_700_000_000, timezone: "+0000",
  }, committer: { name: "Epoch", email: "epoch@example.invalid", timestamp: 1_700_000_000, timezone: "+0000" },
  message: "projection", notes: { "Epoch-Event": "event-1" } });
  assert.equal(commit.oid.length, 40);
  assert.equal(gitCommit({ tree: tree.oid, parents: [], author: {
    name: "Epoch", email: "epoch@example.invalid", timestamp: 1_700_000_000, timezone: "+0000",
  }, committer: { name: "Epoch", email: "epoch@example.invalid", timestamp: 1_700_000_000, timezone: "+0000" },
  message: "projection", notes: { "Epoch-Event": "event-1" } }).oid, commit.oid);

  const manifest = createProjectionManifest({
    defaultRef: "refs/heads/main", refs: { "refs/heads/main": commit.oid },
    objects: [blob, tree, commit], customRefs: { "refs/epoch/for/change-1": commit.oid },
  });
  assert.equal(JSON.stringify(manifest).includes("/home/"), false);
  assert.equal(projectGitGraph(manifest).commits[0]?.oid, commit.oid);
  assert.deepEqual(analyzeGitIngestLoss({ hasSubmodules: true, hasReplaceRefs: false, hasSignedCommits: true }), {
    lossless: false, unsupported: ["signed-commit-attestation", "submodule-link"],
  });
}

function protocolV2IsBoundedAndFilterIsHonest(): void {
  assert.deepEqual(parsePktLines(Buffer.concat([encodePktLine("version 2\n"), Buffer.from("0000")])), ["version 2\n", null]);
  assert.doesNotMatch(protocolV2Advertisement({ promisorConfigured: false }), /filter/);
  assert.match(protocolV2Advertisement({ promisorConfigured: true }), /filter/);
  assert.equal(gitProtocolEnvironment({ "git-protocol": "version=2" }).GIT_PROTOCOL, "version=2");
  assert.throws(() => encodePktLine("x".repeat(65_532)), /too large/i);
}

async function receiveQuarantineVerifiesBeforePromotion(): Promise<void> {
  const promoted: string[] = [];
  const quarantine = new GitReceiveQuarantine(async (object) => { promoted.push(object.oid); });
  const blob = gitBlob(Buffer.from("safe"));
  quarantine.stage(blob);
  assert.deepEqual(promoted, []);
  await quarantine.promote(async (objects) => objects.every((object) => object.oid === blob.oid));
  assert.deepEqual(promoted, [blob.oid]);
  const rejected = new GitReceiveQuarantine(async () => { throw new Error("must not promote"); });
  rejected.stage(blob);
  await assert.rejects(rejected.promote(async () => false), /verification rejected/i);
  assert.equal(rejected.status, "rejected");
}

async function remoteHelperAndCompatibilityProfilesAreExplicit(): Promise<void> {
  assert.ok(REMOTE_HELPER_CAPABILITIES.includes("fetch"));
  assert.deepEqual(parseRemoteHelperCommand("fetch deadbeef refs/heads/main"), {
    command: "fetch", oid: "deadbeef", ref: "refs/heads/main",
  });
  assert.equal(proposalRef("change-1"), "refs/epoch/for/change-1");
  assert.deepEqual(remoteHelperCapabilities(), [...REMOTE_HELPER_CAPABILITIES]);
  await assert.doesNotReject(async () => {
    const output: string[] = [];
    const code = await runGitRemoteEpoch({
      input: Readable.from(["fetch abcdef refs/heads/main\n"]),
      output: { write(chunk) { output.push(chunk); } },
      remoteUrl: "epoch://local",
    });
    assert.equal(code, 1);
    assert.match(output.join(""), /authenticated Epoch endpoint/u);
  });
  assert.throws(() => proposalRef("../escape"), /proposal/i);
  assert.equal(jjChangeRevision("change", "header", "body-a"), jjChangeRevision("change", "header", "body-b"));
  assert.deepEqual(graphiteStack(["one", "two"]).map((item) => item.parent), [null, "one"]);
  assert.deepEqual(gitButlerParallelBranches(["left", "right"]).map((item) => item.parent), ["main", "main"]);
  assert.equal(COMPATIBILITY_PROFILES.mercurial.status, "subset");
  assert.equal(COMPATIBILITY_PROFILES.sapling.mode, "git-profile");
}
