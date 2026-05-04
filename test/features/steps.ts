import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { After, Before, DataTable, Given, Then, When } from "@cucumber/cucumber";
import { commitGit, CRDTRegistry, EpochRepository, Event, SyncResult } from "../../src";
import { canonicalJson } from "../../src/json";

interface WorldState {
  workspace: string;
  repo: EpochRepository;
  lastEvent?: Event;
  registry?: CRDTRegistry;
  merged?: unknown;
  error?: Error;
  createdFiles: string[];
  createdDirs: string[];
  peerRepo?: EpochRepository;
  gitRepo?: string;
  gitExportRepo?: string;
  syncResult?: SyncResult;
}

let state: WorldState;

Before(function () {
  const workspace = mkdtempSync(join(tmpdir(), "epoch-feature-"));
  state = { workspace, repo: new EpochRepository(workspace), createdFiles: [], createdDirs: [] };
});

After(function () {
  for (const path of state.createdFiles) {
    rmSync(path, { force: true });
  }
  for (const path of state.createdDirs) {
    rmSync(path, { recursive: true, force: true });
  }
  rmSync(state.workspace, { recursive: true, force: true });
});

Given("a new workspace", function () {
  assert.ok(state.workspace);
});

When("I initialize an Epoch repository as {string}", function (author: string) {
  state.repo.init(author);
});

When("I record {string} with content {string} as {string}", function (path: string, content: string, entityType: string) {
  const absolute = join(state.workspace, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content.replaceAll("\\n", "\n"), "utf8");
  state.lastEvent = state.repo.recordFile(path, entityType);
});

When("I try to record {string} with content {string} as {string}", function (path: string, content: string, entityType: string) {
  const absolute = join(state.workspace, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content.replaceAll("\\n", "\n"), "utf8");
  state.createdFiles.push(absolute);
  try {
    state.repo.recordFile(path, entityType);
  } catch (error) {
    state.error = error as Error;
  }
});

Then("the repository verifies successfully", function () {
  assert.deepEqual(state.repo.verify(), []);
});

Then("the event log contains {int} event", function (count: number) {
  assert.equal(state.repo.events().length, count);
});

Then("the recorded blob content equals {string}", function (expected: string) {
  assert.ok(state.lastEvent);
  assert.equal(readFileSync(join(state.repo.blobsDir, state.lastEvent.payload.blob_sha256 as string), "utf8"), expected.replaceAll("\\n", "\n"));
});

Then("the repository identity uses Ed25519 keys", function () {
  const identity = state.repo.identityDocument();
  assert.equal(identity.author, state.repo.identity());
  assert.match(identity.publicKey, /BEGIN PUBLIC KEY/);
  assert.match(identity.privateKey, /BEGIN PRIVATE KEY/);
});

Then("the recorded event is signed", function () {
  assert.ok(state.lastEvent?.signature);
});

When("I tamper with the recorded event size", function () {
  assert.ok(state.lastEvent);
  const path = join(state.repo.eventsDir, `${state.lastEvent.id}.json`);
  const event = JSON.parse(readFileSync(path, "utf8")) as { payload: { size: number } };
  event.payload.size = 999;
  writeFileSync(path, `${JSON.stringify(event)}\n`, "utf8");
});

When("I tamper with the recorded blob content", function () {
  assert.ok(state.lastEvent);
  writeFileSync(join(state.repo.blobsDir, state.lastEvent.payload.blob_sha256 as string), "tampered\n", "utf8");
});

Then("repository verification reports {string}", function (expected: string) {
  assert.match(state.repo.verify().join("\n"), new RegExp(expected));
});

Then("recording fails with {string}", function (expected: string) {
  assert.ok(state.error);
  assert.match(state.error.message, new RegExp(expected));
});

Given("a peer Epoch repository initialized as {string}", function (author: string) {
  const workspace = mkdtempSync(join(tmpdir(), "epoch-peer-"));
  state.createdDirs.push(workspace);
  state.peerRepo = new EpochRepository(workspace);
  state.peerRepo.init(author);
});

When("I run anti-entropy with the peer repository", function () {
  assert.ok(state.peerRepo);
  state.syncResult = state.repo.antiEntropy(state.peerRepo.root);
});

Then("the peer repository verifies successfully", function () {
  assert.ok(state.peerRepo);
  assert.deepEqual(state.peerRepo.verify(), []);
});

Then("the peer event log contains {int} event", function (count: number) {
  assert.ok(state.peerRepo);
  assert.equal(state.peerRepo.events().length, count);
});

Then("the peer recorded blob content equals {string}", function (expected: string) {
  assert.ok(state.peerRepo);
  const event = state.peerRepo.events()[0];
  assert.equal(readFileSync(join(state.peerRepo.blobsDir, event.payload.blob_sha256 as string), "utf8"), expected.replaceAll("\\n", "\n"));
});

Given("a Git repository with {string} containing {string}", function (path: string, content: string) {
  const workspace = mkdtempSync(join(tmpdir(), "epoch-git-"));
  state.createdDirs.push(workspace);
  state.gitRepo = workspace;
  execFileSync("git", ["-C", workspace, "-c", "init.defaultBranch=main", "init"]);
  const file = join(workspace, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content.replaceAll("\\n", "\n"), "utf8");
  execFileSync("git", ["-C", workspace, "add", path]);
  commitGit(workspace, "seed");
});

When("I import the Git repository", function () {
  assert.ok(state.gitRepo);
  state.repo.importFromGit(state.gitRepo);
});

When("I export to a Git repository", function () {
  const workspace = mkdtempSync(join(tmpdir(), "epoch-git-export-"));
  state.createdDirs.push(workspace);
  state.gitExportRepo = workspace;
  state.repo.exportToGit(workspace);
});

Then("the exported Git file {string} contains {string}", function (path: string, expected: string) {
  assert.ok(state.gitExportRepo);
  assert.equal(readFileSync(join(state.gitExportRepo, path), "utf8"), expected.replaceAll("\\n", "\n"));
});

Given("the default CRDT registry", function () {
  state.registry = CRDTRegistry.defaults();
});

When("I merge text\\/plain values:", function (table: DataTable) {
  assert.ok(state.registry);
  const row = table.hashes()[0];
  try {
    state.merged = state.registry.merge(
      "text/plain",
      row.base.replaceAll("\\n", "\n"),
      row.left.replaceAll("\\n", "\n"),
      row.right.replaceAll("\\n", "\n"),
    );
  } catch (error) {
    state.error = error as Error;
  }
});

Then("the merged text contains {string}", function (expected: string) {
  assert.equal(typeof state.merged, "string");
  assert.match(state.merged as string, new RegExp(expected));
});

Then("the merged text equals {string}", function (expected: string) {
  assert.equal(state.merged, expected.replaceAll("\\n", "\n"));
});

When("I merge application\\/json values:", function (table: DataTable) {
  assert.ok(state.registry);
  const row = table.hashes()[0];
  try {
    state.merged = state.registry.merge("application/json", JSON.parse(row.base), JSON.parse(row.left), JSON.parse(row.right));
  } catch (error) {
    state.error = error as Error;
  }
});

Then("the merged JSON equals:", function (expected: string) {
  assert.equal(canonicalJson(state.merged), canonicalJson(JSON.parse(expected)));
});

Then("the merge reports a conflict containing {string}", function (expected: string) {
  assert.ok(state.error);
  assert.match(state.error.message, new RegExp(expected));
});
