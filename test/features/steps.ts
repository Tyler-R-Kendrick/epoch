import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { After, Before, DataTable, Given, setDefaultTimeout, Then, When } from "@cucumber/cucumber";
import { chromium, type Browser, type BrowserServer, type Page } from "playwright";
import { createServer, type ViteDevServer } from "vite";
import { main as epochCliMain, type CliIO } from "@epoch/cli";
import { bootstrapFromSeed, canonicalJson, Compact, commitGit, createColdBackup, createCompact, CRDTRegistry, EpochActorSystem, EpochCLIGit, EpochCoreGit, EpochRepository, Event, pruneEventLogBeforeCompact, readEpochGitRemote, restoreFromColdBackup, restoreFromCompact, SyncResult } from "@epoch/core";
import { CRDTRegistry as WasmCRDTRegistry, EpochWasmGit } from "@epoch/wasm";
import { main as epochGitCliMain } from "epoch/Epoch.CLI.Git";
import { chromiumLaunchOptions } from "./playwright-options";

interface WorldState {
  workspace: string;
  repo: EpochRepository;
  lastEvent?: Event;
  lastIntent?: Event;
  registry?: CRDTRegistry;
  merged?: unknown;
  error?: Error;
  createdFiles: string[];
  createdDirs: string[];
  peerRepo?: EpochRepository;
  actorRepo?: EpochActorSystem;
  gitRepo?: string;
  gitExportRepo?: string;
  gitCloneRepo?: string;
  syncResult?: SyncResult;
  lastIntentId?: string;
  hookNames?: string[];
  compact?: Compact;
  coldBackup?: ReturnType<typeof createColdBackup>;
  rememberedEvents?: Record<string, string>;
  rememberedIntents?: Record<string, string>;
  rememberedCliOutput?: Record<string, string>;
  cliStdout?: string;
  cliStderr?: string;
  cliExitCode?: number;
  browser?: Browser;
  browserProcess?: BrowserServer;
  browserPage?: Page;
  browserServer?: ViteDevServer;
  browserDemoResults?: Record<string, string>;
  browserDemoScreenshotBytes?: number;
  collaborationProjection?: Record<string, unknown>;
  gateResult?: { passed: boolean; blockers: readonly string[] };
  reusableResolution?: unknown;
  redactedBlobHash?: string;
  liveVfsDemoResults?: Record<string, string>;
}

let state: WorldState;
const gitDefaultBranch = process.env.EPOCH_TEST_GIT_BRANCH ?? "main";
setDefaultTimeout(30_000);

async function closeWithTimeout(task: Promise<unknown> | undefined, label: string, timeoutMs = 5_000) {
  if (!task) {
    return;
  }

  await Promise.race([
    task,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

Before(function () {
  const workspace = mkdtempSync(join(tmpdir(), "epoch-feature-"));
  state = { workspace, repo: new EpochRepository(workspace), createdFiles: [], createdDirs: [] };
});

After(async function () {
  await Promise.allSettled([
    closeWithTimeout(state.browserPage?.close(), "browser page close"),
    closeWithTimeout(state.browser?.close(), "browser close"),
    closeWithTimeout(Promise.resolve(state.browserProcess?.kill()), "browser process kill"),
    closeWithTimeout(state.browserServer?.close(), "browser server close"),
  ]);
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
  state.lastIntent = state.lastEvent;
});

When("I write raw workspace file {string} with content {string}", function (path: string, content: string) {
  const absolute = join(state.workspace, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content.replaceAll("\\n", "\n"), "utf8");
});

When("I install a workspace extension named {string}", function (name: string) {
  const bin = join(state.workspace, ".epoch", "ext", "bin");
  mkdirSync(bin, { recursive: true });
  const executable = join(bin, `epoch-${name}`);
  writeFileSync(executable, `#!/bin/sh\necho "${name} ran"\n`, "utf8");
  chmodSync(executable, 0o755);
  writeFileSync(
    join(bin, `epoch-${name}.toml`),
    [`name = "${name}"`, "api = 1", `version = "1.0.0"`, `capabilities = ["command"]`].join("\n"),
    "utf8",
  );
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
  state.lastIntent = state.lastEvent;
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

When("I push {string} through the SDK as {string} versioned {string}", function (path: string, author: string, version: string) {
  state.repo = EpochRepository.openOrCreate(state.workspace, { author });
  const result = state.repo.push([path], { author, version });
  state.lastEvent = result.version;
});

When("I materialize version {string} through the SDK into {string}", function (version: string, outDir: string) {
  state.repo.materializeVersion(version, { outDir });
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

Then("the latest version is named {string}", function (expected: string) {
  const version = state.repo.events().filter((event) => event.type === "version").at(-1);
  assert.ok(version, "expected a version event");
  assert.equal(version.payload.name, expected);
});

Then("the version manifest includes file {string}", function (expected: string) {
  const version = state.repo.events().filter((event) => event.type === "version").at(-1);
  assert.ok(version, "expected a version event");
  const files = version.payload.files;
  assert.ok(Array.isArray(files), "expected version files");
  assert.ok(files.some((file) => typeof file === "object" && file !== null && "path" in file && file.path === expected));
});

Then("the version manifest does not include file {string}", function (expected: string) {
  const version = state.repo.events().filter((event) => event.type === "version").at(-1);
  assert.ok(version, "expected a version event");
  const files = version.payload.files;
  assert.ok(Array.isArray(files), "expected version files");
  assert.ok(!files.some((file) => typeof file === "object" && file !== null && "path" in file && file.path === expected));
});

Then("the version manifest includes entity {string}", function (expected: string) {
  const version = state.repo.events().filter((event) => event.type === "version").at(-1);
  assert.ok(version, "expected a version event");
  const entities = version.payload.entities;
  assert.ok(Array.isArray(entities), "expected version entities");
  assert.ok(entities.some((entity) => typeof entity === "object" && entity !== null && "name" in entity && entity.name === expected));
});

Then("workspace file {string} contains {string}", function (path: string, expected: string) {
  assert.equal(readFileSync(join(state.workspace, path), "utf8"), expected.replaceAll("\\n", "\n"));
});

Then("workspace file {string} exists", function (path: string) {
  assert.equal(existsSync(join(state.workspace, path)), true, `expected ${path} to exist`);
});

Then("workspace file {string} does not exist", function (path: string) {
  assert.equal(existsSync(join(state.workspace, path)), false, `expected ${path} to be absent`);
});

When("I delete workspace file {string}", function (path: string) {
  rmSync(join(state.workspace, path), { force: true });
});

Then("the working tree marks {string} as {string}", function (path: string, status: string) {
  const entry = state.repo.statusEntries().find((item) => item.path === path);
  assert.ok(entry, `expected a working tree entry for ${path}`);
  assert.equal(entry.status, status);
});

Then("workspace JSON file {string} has property {string} equal to {string}", function (path: string, propertyPath: string, expected: string) {
  const data = JSON.parse(readFileSync(join(state.workspace, path), "utf8")) as unknown;
  assert.equal(String(valueAtPath(data, propertyPath)), expected);
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
  state.lastEvent = state.repo.recordCodeOperation({ kind: "map-set", entity, key, value: JSON.parse(value) }, author);
  state.lastIntent = state.lastEvent;
});

When("the peer appends CRDT map value for {string} key {string} as {string} with JSON {}", function (entity: string, key: string, author: string, value: string) {
  assert.ok(state.peerRepo);
  state.lastEvent = state.peerRepo.recordCodeOperation({ kind: "map-set", entity, key, value: JSON.parse(value) }, author);
});

When("I append CRDT text {string} to {string} as {string}", function (value: string, entity: string, author: string) {
  state.lastEvent = state.repo.recordCodeOperation({ kind: "text-insert", entity, value }, author);
  state.lastIntent = state.lastEvent;
});

When("the peer appends CRDT text {string} to {string} as {string}", function (value: string, entity: string, author: string) {
  assert.ok(state.peerRepo);
  state.lastEvent = state.peerRepo.recordCodeOperation({ kind: "text-insert", entity, value }, author);
});

Then("the repository materialized view {string} equals JSON:", function (entity: string, expected: string) {
  assert.equal(canonicalJson(state.repo.materialize(entity)), canonicalJson(JSON.parse(expected)));
});

Then("the peer materialized view {string} equals JSON:", function (entity: string, expected: string) {
  assert.ok(state.peerRepo);
  assert.equal(canonicalJson(state.peerRepo.materialize(entity)), canonicalJson(JSON.parse(expected)));
});

Then("the repository materialized view {string} equals text {string}", function (entity: string, expected: string) {
  assert.equal(state.repo.materialize(entity), expected);
});

Then("the peer materialized view {string} equals text {string}", function (entity: string, expected: string) {
  assert.ok(state.peerRepo);
  assert.equal(state.peerRepo.materialize(entity), expected);
});

When("I create view {string} from {string}", function (name: string, parent: string) {
  state.repo.createView(name, { type: "all" }, parent);
});

When("I create view {string} with until all rule stopped at remembered intent {string}", function (name: string, remembered: string) {
  const intentId = state.rememberedIntents?.[remembered];
  assert.ok(intentId);
  state.repo.createView(name, { type: "until", rule: { type: "all" }, stopIntentId: intentId });
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

When("I approve the last recorded intent as {string}", function (author: string) {
  assert.ok(state.lastIntent);
  state.repo.appendApproval(state.lastIntent.id, author);
});

When("I reject the last recorded intent as {string}", function (author: string) {
  assert.ok(state.lastIntent);
  state.repo.appendRejection(state.lastIntent.id, author);
});

When("I remember the last intent as {string}", function (name: string) {
  assert.ok(state.lastIntent);
  state.rememberedIntents = { ...(state.rememberedIntents ?? {}), [name]: state.lastIntent.id };
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

Then(/^the peer event log contains (\d+) events?$/, function (count: number) {
  assert.ok(state.peerRepo);
  assert.equal(state.peerRepo.events().length, count);
});

Then("the peer recorded blob content equals {string}", function (expected: string) {
  assert.ok(state.peerRepo);
  const event = state.peerRepo.events()[0];
  assert.equal(readFileSync(join(state.peerRepo.blobsDir, event.payload.blob_sha256 as string), "utf8"), expected.replaceAll("\\n", "\n"));
});

Then("the peer file {string} blob content equals {string}", function (path: string, expected: string) {
  assert.ok(state.peerRepo);
  const event = state.peerRepo.events().find((candidate) => candidate.payload.path === path);
  assert.ok(event);
  assert.equal(readFileSync(join(state.peerRepo.blobsDir, event.payload.blob_sha256 as string), "utf8"), expected.replaceAll("\\n", "\n"));
});

When("I create an HA compact", function () {
  state.compact = createCompact(state.repo);
});

When("I create an HA compact targeting remembered event {string}", function (name: string) {
  const eventId = state.rememberedEvents?.[name];
  assert.ok(eventId);
  state.compact = createCompact(state.repo, eventId);
});

When("I prune the event log before the HA compact", function () {
  assert.ok(state.compact);
  pruneEventLogBeforeCompact(state.repo, state.compact.id);
});

Then("the local event file count is {int}", function (count: number) {
  assert.equal(readdirSync(state.repo.eventsDir).filter((name) => name.endsWith(".json")).length, count);
});

When("I restore from the HA compact", function () {
  assert.ok(state.compact);
  restoreFromCompact(state.repo, state.compact.id);
});

When("the peer bootstraps from the repository seed", async function () {
  assert.ok(state.peerRepo);
  state.syncResult = await bootstrapFromSeed(state.peerRepo, {
    peerId: state.repo.identity(),
    multiaddr: state.repo.root,
    trustLevel: "full",
  });
});

When("the peer tries to bootstrap from the repository seed as {string}", async function (peerId: string) {
  assert.ok(state.peerRepo);
  try {
    state.syncResult = await bootstrapFromSeed(state.peerRepo, {
      peerId,
      multiaddr: state.repo.root,
      trustLevel: "full",
    });
  } catch (error) {
    state.error = error as Error;
  }
});

Then("seed bootstrap fails with {string}", function (expected: string) {
  assert.ok(state.error);
  assert.match(state.error.message, new RegExp(expected));
});

When("I create a cold backup", function () {
  state.coldBackup = createColdBackup(state.repo);
});

When("I create a cold backup from the HA compact", function () {
  assert.ok(state.compact);
  state.coldBackup = createColdBackup(state.repo, { compact: state.compact });
});

When("I restore the cold backup into a fresh repository", function () {
  assert.ok(state.coldBackup);
  const workspace = mkdtempSync(join(tmpdir(), "epoch-restore-"));
  state.createdDirs.push(workspace);
  state.peerRepo = new EpochRepository(workspace);
  restoreFromColdBackup(state.peerRepo, state.coldBackup);
});

When("I remember the last event as {string}", function (name: string) {
  assert.ok(state.lastEvent);
  state.rememberedEvents = { ...(state.rememberedEvents ?? {}), [name]: state.lastEvent.id };
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

When("I clone the Git repository through Epoch Git compatibility", function () {
  assert.ok(state.gitRepo);
  const workspace = mkdtempSync(join(tmpdir(), "epoch-git-clone-"));
  rmSync(workspace, { recursive: true, force: true });
  state.createdDirs.push(workspace);
  state.gitCloneRepo = workspace;
  EpochCoreGit.clone(state.gitRepo, workspace, { author: "alice" });
  state.repo = new EpochRepository(workspace);
});

When("I stage Git file {string} with content {string}", function (path: string, content: string) {
  assert.ok(state.gitCloneRepo);
  const absolute = join(state.gitCloneRepo, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content.replaceAll("\\n", "\n"), "utf8");
  execFileSync("git", ["-C", state.gitCloneRepo, "add", path]);
});

When("I commit through Epoch Git compatibility with message {string}", function (message: string) {
  assert.ok(state.gitCloneRepo);
  new EpochCoreGit(state.gitCloneRepo).commit(message, { author: "alice" });
});

When("I run unsupported Epoch Git command {string}", function (command: string) {
  try {
    EpochCLIGit.run([command], state.workspace);
  } catch (error) {
    state.error = error as Error;
  }
});

When("I run the Epoch CLI with arguments:", function (table: DataTable) {
  return runCli(epochCliMain, ["--repo", state.workspace, ...argsFromTable(table)]);
});

When("I run the Epoch CLI with remembered argument {string}:", function (name: string, table: DataTable) {
  const remembered = state.rememberedCliOutput?.[name];
  assert.ok(remembered);
  const args = argsFromTable(table);
  const resolved = args.includes("__REMEMBERED__")
    ? args.map((arg) => arg === "__REMEMBERED__" ? remembered : arg)
    : [...args, remembered];
  return runCli(epochCliMain, ["--repo", state.workspace, ...resolved]);
});

When("I run the Epoch CLI with Git repository argument:", function (table: DataTable) {
  assert.ok(state.gitRepo);
  return runCli(epochCliMain, ["--repo", state.workspace, ...argsFromTable(table), state.gitRepo]);
});

When("I run the Epoch CLI export into a fresh Git repository", function () {
  const workspace = mkdtempSync(join(tmpdir(), "epoch-cli-export-"));
  state.createdDirs.push(workspace);
  state.gitExportRepo = workspace;
  return runCli(epochCliMain, ["--repo", state.workspace, "export", workspace]);
});

When("I run the Epoch Git CLI with arguments:", function (table: DataTable) {
  runCli(epochGitCliMain, argsFromTable(table));
});

When("I run the Epoch Git CLI in the Git repository with arguments:", function (table: DataTable) {
  assert.ok(state.gitRepo);
  runCli(epochGitCliMain, argsFromTable(table), state.gitRepo);
});

When("I remember the CLI output as {string}", function (name: string) {
  assert.ok(state.cliStdout);
  state.rememberedCliOutput = { ...(state.rememberedCliOutput ?? {}), [name]: state.cliStdout.trim() };
});

Then("the CLI exits with code {int}", function (code: number) {
  assert.equal(state.cliExitCode, code);
});

Then("the CLI output contains {string}", function (expected: string) {
  assert.match(state.cliStdout ?? "", new RegExp(escapeForRegExp(expected)));
});

Then("the CLI output does not contain {string}", function (unexpected: string) {
  assert.doesNotMatch(state.cliStdout ?? "", new RegExp(escapeForRegExp(unexpected)));
});

Then("the CLI error contains {string}", function (expected: string) {
  assert.match(state.cliStderr ?? "", new RegExp(escapeForRegExp(expected)));
});

When("I merge JSON through the WASM CRDT registry", function () {
  state.merged = WasmCRDTRegistry.defaults().merge("application/json", { name: "epoch", ready: false }, { name: "epoch", ready: false }, { name: "epoch", ready: true });
});

Then("the WASM merge result equals JSON {}", function (expected: string) {
  assert.equal(canonicalJson(state.merged), canonicalJson(JSON.parse(expected)));
});

When("I run unsupported WASM Git execute command {string}", function (command: string) {
  try {
    EpochWasmGit.execute(command);
  } catch (error) {
    state.error = error as Error;
  }
});

When("I run unsupported WASM Git clone for {string}", function (remote: string) {
  try {
    EpochWasmGit.clone(remote);
  } catch (error) {
    state.error = error as Error;
  }
});

Then("WASM Git fails with {string}", function (expected: string) {
  assert.ok(state.error);
  assert.match(state.error.message, new RegExp(escapeForRegExp(expected)));
});

When("I run the Epoch WASM React browser demo", async function () {
  const demoRoot = join(state.workspace, "wasm-react-demo");
  const sourceRoot = join(demoRoot, "src");
  mkdirSync(sourceRoot, { recursive: true });
  writeFileSync(join(demoRoot, "index.html"), "<!doctype html><div id=\"root\"></div><script type=\"module\" src=\"/src/main.js\"></script>\n", "utf8");
  writeFileSync(join(sourceRoot, "main.js"), browserDemoSource(), "utf8");

  state.browserServer = await createServer({
    root: demoRoot,
    logLevel: "silent",
    server: { host: "127.0.0.1", port: 0 },
    resolve: {
      alias: [
        { find: "@epoch/wasm-react", replacement: join(process.cwd(), "packages", "Epoch.WASM.React", "src", "index.ts") },
        { find: "react-dom/client", replacement: join(process.cwd(), "node_modules", "react-dom", "client.js") },
        { find: "react-dom", replacement: join(process.cwd(), "node_modules", "react-dom", "index.js") },
        { find: "react", replacement: join(process.cwd(), "node_modules", "react", "index.js") },
      ],
      dedupe: ["react", "react-dom"],
    },
  });
  await state.browserServer.listen();
  const url = state.browserServer.resolvedUrls?.local[0];
  assert.ok(url);

  state.browserProcess = await chromium.launchServer(chromiumLaunchOptions({ headless: true }));
  state.browser = await chromium.connect(state.browserProcess.wsEndpoint());
  state.browserPage = await state.browser.newPage({ viewport: { width: 640, height: 420 } });
  await state.browserPage.goto(url);
  await state.browserPage.locator("#epoch-react-demo[data-ready=\"true\"]").waitFor({ timeout: 10_000 });
  const screenshot = await state.browserPage.screenshot({ fullPage: true });
  state.browserDemoScreenshotBytes = screenshot.byteLength;
  assert.ok(screenshot.byteLength > 1_000, "expected a non-empty browser screenshot");
  const bounds = await state.browserPage.locator("#epoch-react-demo").boundingBox();
  assert.ok(bounds && bounds.width > 100 && bounds.height > 80, "expected rendered browser demo bounds");

  state.browserDemoResults = {
    current: await textContent(state.browserPage, "#current-state"),
    rewind: await textContent(state.browserPage, "#rewind-state"),
    rematerialized: await textContent(state.browserPage, "#rematerialized-state"),
    restored: await textContent(state.browserPage, "#restored-state"),
  };
});

Then("the browser-rendered Epoch React state is {string}", function (expected: string) {
  assert.equal(state.browserDemoResults?.current, expected);
});

Then("the browser-rendered rewind state is {string}", function (expected: string) {
  assert.equal(state.browserDemoResults?.rewind, expected);
});

Then("the browser-rendered rematerialized state is {string}", function (expected: string) {
  assert.equal(state.browserDemoResults?.rematerialized, expected);
});

Then("the browser-rendered restored state is {string}", function (expected: string) {
  assert.equal(state.browserDemoResults?.restored, expected);
  assert.ok((state.browserDemoScreenshotBytes ?? 0) > 1_000, "expected browser screenshot evidence");
});

When("I run the Epoch WASM React live VFS browser demo", async function () {
  const demoRoot = join(state.workspace, "wasm-react-live-vfs-demo");
  const sourceRoot = join(demoRoot, "src");
  mkdirSync(sourceRoot, { recursive: true });
  writeFileSync(join(demoRoot, "index.html"), "<!doctype html><div id=\"root\"></div><script type=\"module\" src=\"/src/main.js\"></script>\n", "utf8");
  writeFileSync(join(sourceRoot, "main.js"), browserLiveVfsDemoSource(), "utf8");

  state.browserServer = await createServer({
    root: demoRoot,
    logLevel: "silent",
    server: { host: "127.0.0.1", port: 0 },
    resolve: {
      alias: [
        { find: "@epoch/wasm-react", replacement: join(process.cwd(), "packages", "Epoch.WASM.React", "src", "index.ts") },
        { find: "react-dom/client", replacement: join(process.cwd(), "node_modules", "react-dom", "client.js") },
        { find: "react-dom", replacement: join(process.cwd(), "node_modules", "react-dom", "index.js") },
        { find: "react", replacement: join(process.cwd(), "node_modules", "react", "index.js") },
      ],
      dedupe: ["react", "react-dom"],
    },
  });
  await state.browserServer.listen();
  const url = state.browserServer.resolvedUrls?.local[0];
  assert.ok(url);

  state.browserProcess = await chromium.launchServer(chromiumLaunchOptions({ headless: true }));
  state.browser = await chromium.connect(state.browserProcess.wsEndpoint());
  state.browserPage = await state.browser.newPage({ viewport: { width: 640, height: 420 } });
  await state.browserPage.goto(url);
  await state.browserPage.locator("#epoch-live-vfs-demo[data-ready=\"true\"]").waitFor({ timeout: 10_000 });

  state.liveVfsDemoResults = {
    history: await textContent(state.browserPage, "#live-history"),
    entity: await textContent(state.browserPage, "#live-entity"),
  };
});

Then("the browser-rendered live VFS history is {string}", function (expected: string) {
  assert.equal(state.liveVfsDemoResults?.history, expected);
});

Then("the browser-rendered live VFS entity is {string}", function (expected: string) {
  assert.equal(state.liveVfsDemoResults?.entity, expected);
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

Then("the cloned Epoch Git provider is {string}", function (expected: string) {
  assert.ok(state.gitCloneRepo);
  assert.equal(readEpochGitRemote(state.gitCloneRepo)?.provider, expected);
});

Then("the cloned Epoch Git remote references the Git repository", function () {
  assert.ok(state.gitCloneRepo);
  assert.equal(readEpochGitRemote(state.gitCloneRepo)?.remote, state.gitRepo);
});

Then("the latest Epoch event has type {string}", function (expected: string) {
  assert.equal(state.repo.events().at(-1)?.type, expected);
});

Then("the event log contains event type {string}", function (expected: string) {
  assert.ok(state.repo.events().some((event) => event.type === expected), `missing event type ${expected}`);
});

Then("the latest recorded Git file {string} contains {string}", function (path: string, expected: string) {
  const event = state.repo.events().filter((candidate) => candidate.type === "record" && candidate.payload.path === path).at(-1);
  assert.ok(event);
  assert.equal(readFileSync(join(state.repo.blobsDir, event.payload.blob_sha256 as string), "utf8"), expected.replaceAll("\\n", "\n"));
});

Then("Git compatibility fails with {string}", function (expected: string) {
  assert.ok(state.error);
  assert.match(state.error.message, new RegExp(expected));
});

When("I create a signed issue titled {string} with body {string}", function (title: string, body: string) {
  state.lastEvent = (state.repo as unknown as { createIssue(title: string, body: string): Event }).createIssue(title, body);
});

When("{string} signs a review {string} on the intent with body {string}", function (author: string, stateName: string, body: string) {
  assert.ok(state.lastIntentId);
  state.lastEvent = (state.repo as unknown as { reviewIntent(intentId: string, state: string, body: string, author: string): Event }).reviewIntent(state.lastIntentId, stateName, body, author);
});

When("{string} records CI {string} as {string} for the intent", function (author: string, name: string, status: string) {
  assert.ok(state.lastIntentId);
  state.lastEvent = (state.repo as unknown as { recordCI(name: string, status: string, target: string, author: string): Event }).recordCI(name, status, state.lastIntentId, author);
});

Then("the collaboration projection contains issue {string}", function (title: string) {
  state.collaborationProjection = (state.repo as unknown as { collaboration(): Record<string, unknown> }).collaboration();
  const issues = state.collaborationProjection.issues;
  assert.ok(Array.isArray(issues));
  assert.ok(issues.some((issue) => typeof issue === "object" && issue !== null && (issue as Record<string, unknown>).title === title));
});

Then("the gate status for the intent requiring review {string} and CI {string} passes", function (reviewState: string, ciName: string) {
  assert.ok(state.lastIntentId);
  state.gateResult = (state.repo as unknown as { gateStatus(intentId: string, policy: Record<string, unknown>): { passed: boolean; blockers: readonly string[] } }).gateStatus(state.lastIntentId, {
    requiredReviewState: reviewState,
    requiredCi: [ciName],
  });
  assert.deepEqual(state.gateResult, { passed: true, blockers: [] });
});

When("I sync to the peer through a memory transport", function () {
  assert.ok(state.peerRepo);
  const transport = (state.repo as unknown as { exportToMemoryTransport(): unknown }).exportToMemoryTransport();
  state.syncResult = (state.peerRepo as unknown as { syncWithTransport(transport: unknown): SyncResult }).syncWithTransport(transport);
});

When("I record a reusable conflict resolution for {string} as {string}", function (path: string, entityType: string, table: DataTable) {
  const row = table.hashes()[0];
  state.lastEvent = (state.repo as unknown as {
    recordConflictResolution(input: Record<string, unknown>): Event;
  }).recordConflictResolution({
    path,
    entityType,
    base: JSON.parse(row.base),
    left: JSON.parse(row.left),
    right: JSON.parse(row.right),
    resolved: JSON.parse(row.resolved),
  });
});

Then("the repository reuses the conflict resolution for {string} as {string}", function (path: string, entityType: string, table: DataTable) {
  const row = table.hashes()[0];
  state.reusableResolution = (state.repo as unknown as {
    reusableConflictResolution(input: Record<string, unknown>): unknown;
  }).reusableConflictResolution({
    path,
    entityType,
    base: JSON.parse(row.base),
    left: JSON.parse(row.left),
    right: JSON.parse(row.right),
  });
});

Then("the reusable conflict resolution equals JSON:", function (expected: string) {
  assert.equal(canonicalJson(state.reusableResolution), canonicalJson(JSON.parse(expected)));
});

When("I append an operation event for command {string} with status {string}", function (command: string, status: string) {
  state.lastEvent = (state.repo as unknown as { appendOperation(command: string, status: string): Event }).appendOperation(command, status);
});

Then("the operation event log contains command {string} with status {string}", function (command: string, status: string) {
  const operations = (state.repo as unknown as { operations(): readonly Record<string, unknown>[] }).operations();
  assert.ok(operations.some((operation) => operation.command === command && operation.status === status));
});

When("I redact the last recorded blob with reason {string}", function (reason: string) {
  assert.ok(state.lastEvent);
  state.redactedBlobHash = state.lastEvent.payload.blob_sha256 as string;
  state.lastEvent = (state.repo as unknown as { redactBlob(blobHash: string, reason: string): Event }).redactBlob(state.redactedBlobHash, reason);
});

When("I remove the redacted blob from local storage", function () {
  assert.ok(state.redactedBlobHash);
  rmSync(join(state.repo.blobsDir, state.redactedBlobHash), { force: true });
});

Then("the redaction projection contains reason {string}", function (reason: string) {
  const redactions = (state.repo as unknown as { redactions(): readonly Record<string, unknown>[] }).redactions();
  assert.ok(redactions.some((redaction) => redaction.reason === reason));
});

When("I initialize an Epoch repository with custom {string} serialization as {string}", function (format: string, author: string) {
  const serializer = {
    format,
    extension: `.${format}`,
    serialize: (value: unknown) => `format=${format}\n${JSON.stringify(value)}\n`,
    deserialize: (text: string) => JSON.parse(text.split("\n").slice(1).join("\n")),
  };
  state.repo = new EpochRepository(state.workspace, { serializer } as never);
  state.repo.init(author);
});

Then("serialized event files use extension {string}", function (extension: string) {
  assert.ok(readdirSync(state.repo.eventsDir).some((name) => name.endsWith(extension)));
});

function splitLabels(labels: string): string[] {
  return labels.split(",").map((label) => label.trim()).filter((label) => label.length > 0);
}

function argsFromTable(table: DataTable): string[] {
  return table.raw().flat().map((arg) => {
    if (arg === "__LAST_BLOB_HASH__") {
      assert.ok(state.redactedBlobHash);
      return state.redactedBlobHash;
    }
    return arg;
  });
}

function runCli(main: (argv: string[], io: CliIO) => number | Promise<number>, argv: string[], cwd = state.workspace): void | Promise<void> {
  let stdout = "";
  let stderr = "";
  const originalCwd = process.cwd();
  const io: CliIO = {
    stdout: { write: (message) => { stdout += message; } },
    stderr: { write: (message) => { stderr += message; } },
  };
  process.chdir(cwd);
  const finish = (exitCode?: number): void => {
    if (exitCode !== undefined) state.cliExitCode = exitCode;
    process.chdir(originalCwd);
    state.cliStdout = stdout;
    state.cliStderr = stderr;
  };
  try {
    const result = main(argv, io);
    if (typeof result === "object" && result !== null && "then" in result) {
      return result.then((exitCode) => finish(exitCode), (error: unknown) => {
        finish();
        throw error;
      });
    }
    finish(result);
  } catch (error) {
    finish();
    throw error;
  }
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

async function textContent(page: Page, selector: string): Promise<string> {
  return (await page.locator(selector).textContent()) ?? "";
}

function browserDemoSource(): string {
  return `
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createEpochReactStore, createMemoryEpochReactStorage, useEpochState } from "@epoch/wasm-react";

function Counter() {
  const storage = useMemo(() => createMemoryEpochReactStorage(), []);
  const store = useMemo(() => createEpochReactStore({
    entity: "counter",
    initialState: { count: 0 },
    storage,
    storageKey: "epoch:counter",
    author: "browser",
  }), [storage]);
  const [_state, setState, epoch] = useEpochState(store);
  const [results, setResults] = useState({ current: "", rewind: "", rematerialized: "", restored: "" });

  useEffect(() => {
    setState((current) => ({ count: current.count + 1 }));
    const firstIncrement = store.history().at(-1);
    setState((current) => ({ count: current.count + 1 }));
    const current = "count: " + store.getSnapshot().state.count;
    if (firstIncrement) epoch.rewind(firstIncrement.id);
    const rewind = "count: " + store.getSnapshot().state.count;
    setState({ count: 5 });
    const rematerialized = "count: " + store.materialize("latest").count;
    const restoredStore = createEpochReactStore({
      entity: "counter",
      initialState: { count: 0 },
      storage,
      storageKey: "epoch:counter",
      author: "browser",
    });
    setResults({
      current,
      rewind,
      rematerialized,
      restored: "count: " + restoredStore.getSnapshot().state.count,
    });
  }, []);

  return React.createElement("main", {
    id: "epoch-react-demo",
    "data-ready": results.restored.length > 0 ? "true" : "false",
    style: {
      fontFamily: "system-ui, sans-serif",
      padding: "32px",
      color: "#10241f",
      background: "#f7fbf7",
      border: "1px solid #b7d7c5",
      width: "360px",
    },
  },
    React.createElement("h1", { style: { fontSize: "22px", margin: "0 0 16px" } }, "Epoch React Demo"),
    React.createElement("output", { id: "current-state" }, results.current),
    React.createElement("output", { id: "rewind-state", style: { display: "block", marginTop: "8px" } }, results.rewind),
    React.createElement("output", { id: "rematerialized-state", style: { display: "block", marginTop: "8px" } }, results.rematerialized),
    React.createElement("output", { id: "restored-state", style: { display: "block", marginTop: "8px" } }, results.restored),
  );
}

createRoot(document.getElementById("root")).render(React.createElement(Counter));
`;
}

function browserLiveVfsDemoSource(): string {
  return `
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createEpochLiveRepository, createMemoryEpochVfs, useEpochEntity, useEpochHistory } from "@epoch/wasm-react";

function LiveVfsDemo() {
  const vfs = useMemo(() => createMemoryEpochVfs(), []);
  const repository = useMemo(() => createEpochLiveRepository({ vfs, author: "browser" }), [vfs]);
  const history = useEpochHistory(repository);
  const counter = useEpochEntity(repository, "counter");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    repository.append("counter", { count: 1 });
    repository.append("counter", { count: 2 });
    setReady(true);
  }, [repository]);

  return React.createElement("main", {
    id: "epoch-live-vfs-demo",
    "data-ready": ready ? "true" : "false",
    style: { fontFamily: "system-ui, sans-serif", padding: "32px", width: "360px" },
  },
    React.createElement("output", { id: "live-history" }, "events: " + history.length),
    React.createElement("output", { id: "live-entity", style: { display: "block", marginTop: "8px" } }, "count: " + (counter.count ?? 0)),
  );
}

createRoot(document.getElementById("root")).render(React.createElement(LiveVfsDemo));
`;
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

function valueAtPath(value: unknown, propertyPath: string): unknown {
  return propertyPath.split(".").reduce<unknown>((current, key) => {
    assert.equal(typeof current, "object");
    assert.ok(current !== null);
    return (current as Record<string, unknown>)[key];
  }, value);
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

When("I merge text\\/csv values:", function (table: DataTable) {
  assert.ok(state.registry);
  const row = table.hashes()[0];
  try {
    state.merged = state.registry.merge(
      "text/csv",
      row.base.replaceAll("\\n", "\n"),
      row.left.replaceAll("\\n", "\n"),
      row.right.replaceAll("\\n", "\n"),
    );
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
