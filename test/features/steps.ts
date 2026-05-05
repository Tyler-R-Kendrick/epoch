import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { After, Before, DataTable, Given, Then, When } from "@cucumber/cucumber";
import { bootstrapFromSeed, canonicalJson, Checkpoint, commitGit, createCheckpoint, createColdBackup, CRDTRegistry, EpochActorSystem, EpochRepository, Event, pruneEventLog, restoreFromCheckpoint, restoreFromColdBackup, SyncResult } from "@epoch/core";

interface WorldState {
  workspace: string;
  repo: EpochRepository;
  lastEvent?: Event;
  lastProposal?: Event;
  registry?: CRDTRegistry;
  merged?: unknown;
  error?: Error;
  createdFiles: string[];
  createdDirs: string[];
  peerRepo?: EpochRepository;
  actorRepo?: EpochActorSystem;
  gitRepo?: string;
  gitExportRepo?: string;
  syncResult?: SyncResult;
  lastIntentId?: string;
  hookNames?: string[];
  checkpoint?: Checkpoint;
  coldBackup?: ReturnType<typeof createColdBackup>;
  rememberedProposals?: Record<string, string>;
}

let state: WorldState;
const gitDefaultBranch = process.env.EPOCH_TEST_GIT_BRANCH ?? "main";

Before(function () {
  const workspace = mkdtempSync(join(tmpdir(), "epoch-feature-"));
  state = { workspace, repo: new EpochRepository(workspace), createdFiles: [], createdDirs: [] };
});

After(function () {
  state.actorRepo?.stop();
  for (const path of state.createdFiles) {
    rmSync(path, { force: true });
  }
  for (const path of state.createdDirs) {
    rmSync(path, { recursive: true, force: true });
  }
  rmSync(state.workspace, { recursive: true, force: true });
});

When("I start an Epoch actor repository as {string}", async function (author: string) {
  state.actorRepo = new EpochActorSystem(state.workspace);
  await state.actorRepo.init(author);
});

When("I start an Epoch actor for the existing repository", function () {
  state.actorRepo = new EpochActorSystem(state.workspace);
});

Given("the actor user identity directory is missing", function () {
  rmSync(state.repo.usersDir, { recursive: true, force: true });
});

When("I asynchronously record {string} with content {string} as {string}", async function (path: string, content: string, entityType: string) {
  assert.ok(state.actorRepo);
  const absolute = join(state.workspace, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content.replaceAll("\\n", "\n"), "utf8");
  state.lastEvent = await state.actorRepo.recordFile(path, entityType);
  state.lastProposal = state.lastEvent;
});

When("actor users concurrently record:", async function (table: DataTable) {
  assert.ok(state.actorRepo);
  const actorRepo = state.actorRepo;
  const rows = table.hashes();
  await Promise.all(rows.map(async (row) => {
    const absolute = join(state.workspace, row.path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, row.content.replaceAll("\\n", "\n"), "utf8");
    return actorRepo.user(row.author).recordFile(row.path, row.entityType);
  }));
});

When("I run actor sync with the peer repository", async function () {
  assert.ok(state.actorRepo);
  assert.ok(state.peerRepo);
  state.syncResult = await state.actorRepo.sync(state.peerRepo.root);
});

Then("the actor repository verifies successfully", async function () {
  assert.ok(state.actorRepo);
  assert.deepEqual(await state.actorRepo.verify(), []);
});

Then("the actor event log contains {int} event", async function (count: number) {
  assert.ok(state.actorRepo);
  assert.equal((await state.actorRepo.events()).length, count);
});

Then("the actor event log contains {int} events", async function (count: number) {
  assert.ok(state.actorRepo);
  assert.equal((await state.actorRepo.events()).length, count);
});

Then("the actor events include authors {string}", async function (expected: string) {
  assert.ok(state.actorRepo);
  const authors = [...new Set((await state.actorRepo.events()).map((event) => event.author))].sort();
  assert.deepEqual(authors, expected.split(",").sort());
});

Then("actor event authors have distinct signing keys", async function () {
  assert.ok(state.actorRepo);
  const keysByAuthor = new Map<string, Set<string>>();
  for (const event of await state.actorRepo.events()) {
    let keys = keysByAuthor.get(event.author);
    if (keys === undefined) {
      keys = new Set<string>();
      keysByAuthor.set(event.author, keys);
    }
    keys.add(event.authorPublicKey);
  }
  assert.ok(keysByAuthor.size > 1);
  for (const keys of keysByAuthor.values()) {
    assert.equal(keys.size, 1);
  }
  const uniqueKeyCount = new Set([...keysByAuthor.values()].map((keys) => [...keys][0])).size;
  assert.equal(uniqueKeyCount, keysByAuthor.size);
});

Given("a new workspace", function () {
  assert.ok(state.workspace);
});

Given("an Epoch repository hook recorder", function () {
  state.hookNames = [];
  state.repo = new EpochRepository(state.workspace, {
    hooks: [(event) => state.hookNames?.push(event.name)],
  });
});

When("I initialize an Epoch repository as {string}", function (author: string) {
  state.repo.init(author);
});

When("I record {string} with content {string} as {string}", function (path: string, content: string, entityType: string) {
  const absolute = join(state.workspace, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content.replaceAll("\\n", "\n"), "utf8");
  state.lastEvent = state.repo.recordFile(path, entityType);
  state.lastProposal = state.lastEvent;
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

Then(/^the event log contains (\d+) events?$/, function (count: number) {
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

Then("observed repository hooks include {string}", function (expected: string) {
  assert.ok(state.hookNames);
  for (const name of expected.split(",")) {
    assert.ok(state.hookNames.includes(name), `missing hook ${name}; observed ${state.hookNames.join(",")}`);
  }
});

Given("a peer Epoch repository initialized as {string}", function (author: string) {
  const workspace = mkdtempSync(join(tmpdir(), "epoch-peer-"));
  state.createdDirs.push(workspace);
  state.peerRepo = new EpochRepository(workspace);
  state.peerRepo.init(author);
});

When("I sync with the peer repository", function () {
  assert.ok(state.peerRepo);
  state.syncResult = state.repo.sync(state.peerRepo.root);
});

When("I create an intent for {string} with content {string} as {string}", function (path: string, content: string, entityType: string) {
  const absolute = join(state.workspace, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content.replaceAll("\\n", "\n"), "utf8");
  state.lastEvent = state.repo.intentFile(path, entityType);
  state.lastIntentId = state.lastEvent.id;
});

When("I create an intent for {string} with content {string} as {string} titled {string} described {string} labeled {string}", function (path: string, content: string, entityType: string, title: string, description: string, labels: string) {
  const absolute = join(state.workspace, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content.replaceAll("\\n", "\n"), "utf8");
  state.lastEvent = state.repo.intentFile(path, entityType, state.repo.identity(), { title, description, labels: splitLabels(labels) });
  state.lastIntentId = state.lastEvent.id;
});

When("{string} signs the intent merge", function (author: string) {
  assert.ok(state.lastIntentId);
  state.lastEvent = state.repo.mergeIntent(state.lastIntentId, author);
});

When("{string} signs the intent merge with reason {string} labeled {string}", function (author: string, reason: string, labels: string) {
  assert.ok(state.lastIntentId);
  state.lastEvent = state.repo.mergeIntent(state.lastIntentId, author, { reason, labels: splitLabels(labels) });
});

When("{string} rejects the intent with reason {string}", function (author: string, reason: string) {
  assert.ok(state.lastIntentId);
  state.lastEvent = state.repo.rejectIntent(state.lastIntentId, reason, author);
});

When("{string} rejects the intent with reason {string} labeled {string}", function (author: string, reason: string, labels: string) {
  assert.ok(state.lastIntentId);
  state.lastEvent = state.repo.rejectIntent(state.lastIntentId, reason, author, { labels: splitLabels(labels) });
});

When("{string} comments {string} on the intent labeled {string}", function (author: string, body: string, labels: string) {
  assert.ok(state.lastIntentId);
  state.lastEvent = state.repo.comment(body, state.lastIntentId, author, { labels: splitLabels(labels) });
});

Then("the last event comment body is {string}", function (expected: string) {
  assert.equal(state.lastEvent?.payload.body, expected);
});

Then("the last event comment references the last intent", function () {
  assert.ok(state.lastIntentId);
  assert.equal(state.lastEvent?.payload.intent, state.lastIntentId);
});

Then("the last event metadata title is {string}", function (expected: string) {
  assert.equal(metadataValue("title"), expected);
});

Then("the last event metadata description is {string}", function (expected: string) {
  assert.equal(metadataValue("description"), expected);
});

Then("the last event metadata reason is {string}", function (expected: string) {
  assert.equal(metadataValue("reason"), expected);
});

Then("the last event metadata labels are {string}", function (expected: string) {
  assert.deepEqual(metadataLabels(), splitLabels(expected));
});

Then("the last intent status is {string}", function (status: string) {
  assert.ok(state.lastIntentId);
  const decision = state.repo.policy().intents.find((item) => item.intent.id === state.lastIntentId);
  assert.ok(decision);
  assert.equal(decision.status, status);
});

Then("the main projection contains the last intent", function () {
  assert.ok(state.lastIntentId);
  assert.ok(state.repo.mainIntentIds().includes(state.lastIntentId));
});

Then("the main projection skips the last intent", function () {
  assert.ok(state.lastIntentId);
  assert.ok(!state.repo.mainIntentIds().includes(state.lastIntentId));
});

When("I append CRDT map value for {string} key {string} as {string} with JSON {}", function (entity: string, key: string, author: string, value: string) {
  state.lastEvent = state.repo.appendCRDTOperation({ kind: "map-set", entity, key, value: JSON.parse(value) }, author);
  state.lastProposal = state.lastEvent;
});

When("the peer appends CRDT map value for {string} key {string} as {string} with JSON {}", function (entity: string, key: string, author: string, value: string) {
  assert.ok(state.peerRepo);
  state.lastEvent = state.peerRepo.appendCRDTOperation({ kind: "map-set", entity, key, value: JSON.parse(value) }, author);
});

When("I append CRDT text {string} to {string} as {string}", function (value: string, entity: string, author: string) {
  state.lastEvent = state.repo.appendCRDTOperation({ kind: "text-insert", entity, value }, author);
  state.lastProposal = state.lastEvent;
});

When("the peer appends CRDT text {string} to {string} as {string}", function (value: string, entity: string, author: string) {
  assert.ok(state.peerRepo);
  state.lastEvent = state.peerRepo.appendCRDTOperation({ kind: "text-insert", entity, value }, author);
});

When("I run anti-entropy with the peer repository", function () {
  assert.ok(state.peerRepo);
  state.syncResult = state.repo.antiEntropy(state.peerRepo.root);
});

Then("the repository CRDT view {string} equals JSON:", function (entity: string, expected: string) {
  assert.equal(canonicalJson(state.repo.crdtView(entity)), canonicalJson(JSON.parse(expected)));
});

Then("the peer CRDT view {string} equals JSON:", function (entity: string, expected: string) {
  assert.ok(state.peerRepo);
  assert.equal(canonicalJson(state.peerRepo.crdtView(entity)), canonicalJson(JSON.parse(expected)));
});

Then("the repository CRDT view {string} equals text {string}", function (entity: string, expected: string) {
  assert.equal(state.repo.crdtView(entity), expected);
});

Then("the peer CRDT view {string} equals text {string}", function (entity: string, expected: string) {
  assert.ok(state.peerRepo);
  assert.equal(state.peerRepo.crdtView(entity), expected);
});

When("I create view {string} from {string}", function (name: string, parent: string) {
  state.repo.createView(name, { type: "all" }, parent);
});

When("I create view {string} with until all rule stopped at remembered proposal {string}", function (name: string, remembered: string) {
  const proposalId = state.rememberedProposals?.[remembered];
  assert.ok(proposalId);
  state.repo.createView(name, { type: "until", rule: { type: "all" }, stopProposalId: proposalId });
});

When("I checkout view {string}", function (name: string) {
  state.repo.checkoutView(name);
});

When("I delete view {string}", function (name: string) {
  state.repo.deleteView(name);
});

When("I promote view {string} to {string}", function (source: string, target: string) {
  state.lastEvent = state.repo.promoteToView(source, target);
});

When("I approve the last recorded proposal as {string}", function (author: string) {
  assert.ok(state.lastProposal);
  state.repo.appendApproval(state.lastProposal.id, author);
});

When("I reject the last recorded proposal as {string}", function (author: string) {
  assert.ok(state.lastProposal);
  state.repo.appendRejection(state.lastProposal.id, author);
});

When("I remember the last proposal as {string}", function (name: string) {
  assert.ok(state.lastProposal);
  state.rememberedProposals = { ...(state.rememberedProposals ?? {}), [name]: state.lastProposal.id };
});

Then("the current view is {string}", function (expected: string) {
  assert.equal(state.repo.currentView(), expected);
});

Then("the named views include {string}", function (expected: string) {
  assert.ok(state.repo.listViews().some((view) => view.name === expected));
});

Then("the named views do not include {string}", function (expected: string) {
  assert.ok(!state.repo.listViews().some((view) => view.name === expected));
});

Then("view {string} has file {string} with content {string}", function (view: string, path: string, expected: string) {
  assertViewFile(view, path, expected);
});

Then("view {string} requiring {int} approval has file {string} with content {string}", function (view: string, requiredApprovals: number, path: string, expected: string) {
  assertViewFile(view, path, expected, requiredApprovals);
});

Then("view {string} has no file {string}", function (view: string, path: string) {
  const stateForView = state.repo.computeViewState(view);
  assert.equal(stateForView.records[path], undefined);
});

function assertViewFile(view: string, path: string, expected: string, requiredApprovals = 0): void {
  const stateForView = state.repo.computeViewState(view, { requiredApprovals });
  const record = stateForView.records[path];
  assert.ok(record, `missing ${path} in view ${view}`);
  assert.equal(readFileSync(join(state.repo.blobsDir, record.blobSha256), "utf8"), expected.replaceAll("\\n", "\n"));
}

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

When("I create an HA checkpoint", function () {
  state.checkpoint = createCheckpoint(state.repo);
});

When("I prune the event log before the HA checkpoint", function () {
  assert.ok(state.checkpoint);
  pruneEventLog(state.repo, state.checkpoint.id);
});

Then("the local event file count is {int}", function (count: number) {
  assert.equal(readdirSync(state.repo.eventsDir).filter((name) => name.endsWith(".json")).length, count);
});

When("I restore from the HA checkpoint", function () {
  assert.ok(state.checkpoint);
  restoreFromCheckpoint(state.repo, state.checkpoint.id);
});

When("the peer bootstraps from the repository seed", async function () {
  assert.ok(state.peerRepo);
  state.syncResult = await bootstrapFromSeed(state.peerRepo, {
    peerId: state.repo.identity(),
    multiaddr: state.repo.root,
    trustLevel: "full",
  });
});

When("I create a cold backup", function () {
  state.coldBackup = createColdBackup(state.repo);
});

When("I restore the cold backup into a fresh repository", function () {
  assert.ok(state.coldBackup);
  const workspace = mkdtempSync(join(tmpdir(), "epoch-restore-"));
  state.createdDirs.push(workspace);
  state.peerRepo = new EpochRepository(workspace);
  restoreFromColdBackup(state.peerRepo, state.coldBackup);
});

Given("a Git repository with {string} containing {string}", function (path: string, content: string) {
  const workspace = mkdtempSync(join(tmpdir(), "epoch-git-"));
  state.createdDirs.push(workspace);
  state.gitRepo = workspace;
  execFileSync("git", ["-C", workspace, "-c", `init.defaultBranch=${gitDefaultBranch}`, "init"]);
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

function splitLabels(labels: string): string[] {
  return labels.split(",").map((label) => label.trim()).filter((label) => label.length > 0);
}

function metadataValue(key: string): unknown {
  const metadata = state.lastEvent?.payload.metadata;
  assert.equal(typeof metadata, "object");
  assert.ok(metadata !== null);
  return (metadata as Record<string, unknown>)[key];
}

function metadataLabels(): unknown {
  return metadataValue("labels");
}

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
