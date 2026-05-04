import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { After, Before, DataTable, Given, Then, When } from "@cucumber/cucumber";
import { CRDTRegistry, EpochRepository, Event } from "../../src";
import { canonicalJson } from "../../src/json";

interface WorldState {
  workspace: string;
  repo: EpochRepository;
  lastEvent?: Event;
  registry?: CRDTRegistry;
  merged?: unknown;
  error?: Error;
  outsideFiles: string[];
}

let state: WorldState;

Before(function () {
  const workspace = mkdtempSync(join(tmpdir(), "epoch-feature-"));
  state = { workspace, repo: new EpochRepository(workspace), outsideFiles: [] };
});

After(function () {
  for (const path of state.outsideFiles) {
    rmSync(path, { force: true });
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
  mkdirSync(join(absolute, ".."), { recursive: true });
  writeFileSync(absolute, content.replaceAll("\\n", "\n"), "utf8");
  state.lastEvent = state.repo.recordFile(path, entityType);
});

When("I try to record {string} with content {string} as {string}", function (path: string, content: string, entityType: string) {
  const absolute = join(state.workspace, path);
  mkdirSync(join(absolute, ".."), { recursive: true });
  writeFileSync(absolute, content.replaceAll("\\n", "\n"), "utf8");
  if (!absolute.startsWith(state.workspace)) {
    state.outsideFiles.push(absolute);
  }
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

When("I tamper with the recorded event size", function () {
  assert.ok(state.lastEvent);
  const path = join(state.repo.eventsDir, `${state.lastEvent.id}.json`);
  const event = JSON.parse(readFileSync(path, "utf8")) as { payload: { size: number } };
  event.payload.size = 999;
  writeFileSync(path, `${JSON.stringify(event)}\n`, "utf8");
});

Then("repository verification reports {string}", function (expected: string) {
  assert.match(state.repo.verify().join("\n"), new RegExp(expected));
});

Then("recording fails with {string}", function (expected: string) {
  assert.ok(state.error);
  assert.match(state.error.message, new RegExp(expected));
});

Given("the default CRDT registry", function () {
  state.registry = CRDTRegistry.defaults();
});

When("I merge text\\/plain values:", function (table: DataTable) {
  assert.ok(state.registry);
  const row = table.hashes()[0];
  state.merged = state.registry.merge(
    "text/plain",
    row.base.replaceAll("\\n", "\n"),
    row.left.replaceAll("\\n", "\n"),
    row.right.replaceAll("\\n", "\n"),
  );
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
