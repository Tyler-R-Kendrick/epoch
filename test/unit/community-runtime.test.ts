import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeCommunityCli, isCommunityCliInvocation } from "@epoch/cli";
import { createMemoryEpochIntegrationStorage } from "@epoch/integration-core";
import {
  createCommunityRuntime,
  openDurableStorage,
  resolveBrowserIdentity,
  DEFAULT_PROJECT_SLUG,
  createWebMcpTools,
  defaultCommunityHarness,
  executeCommunityRuntimeCommand,
  isCommunityRuntimeInvocation,
  registerWebMcpTools,
  TRUNK_VIEW,
  verifyStaticHarnessRelease,
  type DynamicUiManifest,
  type EpochCommandReceipt,
  type WebMcpToolDescriptor,
} from "@epoch/community-runtime";

type TestJsonValue = boolean | null | number | string | TestJsonObject | readonly TestJsonValue[] | undefined;
interface TestJsonObject {
  readonly [key: string]: TestJsonValue;
}

const fullAccess = { capabilities: ["*"] } as const;
const clock = (): string => "2026-08-12T00:00:00.000Z";

const denserFeed: DynamicUiManifest = {
  abiVersion: 1,
  scope: "personal",
  placements: [
    { slot: "shell.primary-navigation", component: "PrimaryNav", action: "view.switch" },
    { slot: "shell.workspace-status", component: "WorkspaceStatus", action: "workspace.status" },
    { slot: "shell.workspace-status", component: "VerificationSummary", action: "change.show" },
    { slot: "board.thread-list", component: "ThreadList" },
    { slot: "board.context-panel", component: "LiveActivity" },
    { slot: "board.recovery", component: "RecoveryControls", action: "ui.restoreLastKnownGood" },
  ],
  theme: { "--density-row": "32px" },
};

const forbidden: DynamicUiManifest = {
  abiVersion: 1,
  scope: "personal",
  placements: [
    { slot: "board.thread-list", component: "RecoveryControls", action: "ui.enterSafeMode" },
    { slot: "shell.nowhere", component: "ThreadList" },
  ],
  theme: { "--accent": "url(https://example.invalid/track.png)" },
};

export async function runCommunityRuntimeTests(): Promise<void> {
  await proposalReachesMergeThroughOneCommandPath();
  await consequentialCommandsWaitForConfirmation();
  await historySurvivesReloadAndRollbackKeepsEvidence();
  await invalidManifestsAreRecordedButNeverRendered();
  await capabilitiesAreEnforcedBelowTheToolLayer();
  await everyAdapterReturnsTheSameReceipt();
  await theEpochBinaryOwnsBothCommandGroups();
  await remainingRuntimeCliCommandsAreRouted();
  await theDefaultProjectOwnsTheInterface();
  await socialRecordsAreChangeFeeds();
  await durableStorageCarriesAWorkspaceForward();
  await identityIsStablePerDevice();
  await twoParticipantsConvergeThroughBundles();
  harnessDigestDetectsTampering();
  console.log("community runtime tests passed");
}

function runtimeWith(storage = createMemoryEpochIntegrationStorage()) {
  return createCommunityRuntime({
    namespace: "community-runtime-test",
    actor: "did:epoch:tester",
    policies: fullAccess,
    now: clock,
    storage,
  });
}

async function proposalReachesMergeThroughOneCommandPath(): Promise<void> {
  const runtime = runtimeWith();
  const status = await runtime.commands.execute({ kind: "workspace.status" });
  assert.equal(status.policy.decision, "allow");
  assert.equal(status.readOnly, true);
  assert.deepEqual(status.eventIds, []);

  const created = await runtime.commands.execute({
    kind: "view.create",
    input: { name: "denser-feed", from: TRUNK_VIEW, scope: "personal" },
  });
  assert.equal(created.proposalRef, "refs/ui/proposals/denser-feed");

  const proposed = await runtime.commands.execute({
    kind: "ui.propose",
    input: { view: "denser-feed", manifest: denserFeed, prompt: "make my feed denser", model: "test-model" },
  });
  assert.equal(proposed.validation.state, "valid");
  assert.equal(proposed.eventIds.length, 1);

  // The prompt is private by default: only its digest is retained.
  const head = runtime.workspace.head("denser-feed");
  assert.equal(head.provenance.prompt, undefined);
  assert.ok((head.provenance.promptDigest ?? "").length > 0);
  assert.equal(head.provenance.model, "test-model");

  const diff = await runtime.commands.execute<{ widgets: readonly string[]; theme: readonly string[] }>({
    kind: "ui.semanticDiff",
    input: { from: "denser-feed" },
  });
  assert.ok(diff.data.widgets.includes("added VerificationSummary to shell.workspace-status"));
  assert.ok(diff.data.theme.includes("--density-row: unset → 32px"));

  const merged = await runtime.commands.execute({
    kind: "change.merge",
    input: { from: "denser-feed" },
    confirmed: true,
  });
  assert.equal(merged.policy.decision, "allow");
  assert.equal(runtime.workspace.head(TRUNK_VIEW).provenance.mergedFrom, "denser-feed");
  assert.deepEqual(runtime.workspace.status().lastKnownGood, { view: TRUNK_VIEW, revision: 2 });

  const rendered = runtime.workspace.materialize();
  assert.equal(rendered.safeMode, false);
  assert.equal(rendered.manifest.theme["--density-row"], "32px");
}

async function consequentialCommandsWaitForConfirmation(): Promise<void> {
  const runtime = runtimeWith();
  await runtime.commands.execute({ kind: "view.create", input: { name: "quiet", from: TRUNK_VIEW } });
  await runtime.commands.execute({ kind: "ui.propose", input: { view: "quiet", manifest: denserFeed } });

  const unconfirmed = await runtime.commands.execute({ kind: "change.merge", input: { from: "quiet" } });
  assert.equal(unconfirmed.policy.decision, "confirm");
  assert.equal(unconfirmed.confirmation.required, true);
  assert.deepEqual(unconfirmed.eventIds, []);
  assert.equal(runtime.workspace.history(TRUNK_VIEW).length, 1, "an unconfirmed merge must not touch the trunk");
}

async function historySurvivesReloadAndRollbackKeepsEvidence(): Promise<void> {
  const storage = createMemoryEpochIntegrationStorage();
  const first = runtimeWith(storage);
  await first.commands.execute({ kind: "view.create", input: { name: "denser-feed" } });
  await first.commands.execute({ kind: "ui.propose", input: { view: "denser-feed", manifest: denserFeed } });
  await first.commands.execute({ kind: "change.merge", input: { from: "denser-feed" }, confirmed: true });
  const eventsBefore = first.workspace.status().events;

  // A reload is a new runtime over the same storage: the ledger is the state.
  const reloaded = runtimeWith(storage);
  assert.equal(reloaded.workspaceId, first.workspaceId);
  assert.equal(reloaded.workspace.status().events, eventsBefore);
  assert.equal(reloaded.workspace.materialize().manifest.theme["--density-row"], "32px");

  const rolledBack = await reloaded.commands.execute({
    kind: "change.revert",
    input: { view: TRUNK_VIEW, revision: 1 },
    confirmed: true,
  });
  assert.equal(rolledBack.policy.decision, "allow");
  assert.equal(reloaded.workspace.materialize().manifest.theme["--density-row"], undefined);
  assert.equal(reloaded.workspace.history(TRUNK_VIEW).length, 3, "rollback appends; it never rewrites");
  assert.equal(reloaded.workspace.revision(TRUNK_VIEW, 2).provenance.mergedFrom, "denser-feed",
    "the merged revision stays inspectable after rollback");
  assert.ok(reloaded.workspace.status().events > eventsBefore);
}

async function invalidManifestsAreRecordedButNeverRendered(): Promise<void> {
  const runtime = runtimeWith();
  await runtime.commands.execute({ kind: "view.create", input: { name: "bad-idea" } });
  const proposed = await runtime.commands.execute({
    kind: "ui.propose",
    input: { view: "bad-idea", manifest: forbidden },
  });

  assert.equal(proposed.validation.state, "invalid");
  assert.ok(proposed.validation.errors.some((error) => error.includes("unknown slot 'shell.nowhere'")));
  assert.ok(proposed.validation.errors.some((error) => error.includes("does not accept category 'recovery'")));
  assert.ok(proposed.validation.errors.some((error) => error.includes("unsafe value")));
  assert.equal(proposed.eventIds.length, 1, "a rejected proposal is still recorded");

  await assert.rejects(
    runtime.commands.execute({ kind: "change.merge", input: { from: "bad-idea" }, confirmed: true }),
    /fails harness validation/u,
  );

  // A head that stops validating boots the signed harness instead of rendering.
  await runtime.commands.execute({ kind: "ui.propose", input: { view: TRUNK_VIEW, manifest: forbidden } });
  const rendered = runtime.workspace.materialize();
  assert.equal(rendered.safeMode, true);
  assert.match(rendered.reason ?? "", /fails validation/u);
  assert.deepEqual(rendered.manifest, runtime.harness.safeModeManifest);
  assert.equal(runtime.workspace.status().state, "unrenderable");

  // Recovery controls stay reachable from the safe-mode manifest.
  assert.ok(rendered.manifest.placements.some((placement) => placement.component === "RecoveryControls"));
}

async function capabilitiesAreEnforcedBelowTheToolLayer(): Promise<void> {
  const runtime = createCommunityRuntime({
    namespace: "community-runtime-readonly",
    actor: "did:epoch:reader",
    now: clock,
    storage: createMemoryEpochIntegrationStorage(),
  });

  const tools = createWebMcpTools(runtime);
  const propose = tools.find((tool) => tool.name === "epoch_ui_propose");
  assert.ok(propose, "the propose tool is still advertised");
  assert.equal(propose.annotations.readOnlyHint, false);

  // Visibility is not authorization: the tool exists, the command still refuses.
  // SAFETY: Runtime checks or construction above establish {.
  const result = JSON.parse(await propose.execute({ view: TRUNK_VIEW, manifest: denserFeed })) as {
    decision: string;
    eventIds: readonly string[];
  };
  assert.equal(result.decision, "deny");
  assert.deepEqual(result.eventIds, []);
  assert.equal(runtime.workspace.history(TRUNK_VIEW).length, 1);

  const status = tools.find((tool) => tool.name === "epoch_workspace_status");
  assert.ok(status);
  assert.equal(status.annotations.readOnlyHint, true);
  // SAFETY: Runtime checks or construction above establish { decision: string }).decision.
  assert.equal((JSON.parse(await status.execute({})) as { decision: string }).decision, "allow");

  const showChange = tools.find((tool) => tool.name === "epoch_change_show");
  assert.ok(showChange);
  assert.equal(showChange.annotations.untrustedContentHint, true,
    "community-authored revision content is data, not instructions");

  const registrations: string[] = [];
  const registered = await registerWebMcpTools({
    registerTool: async (descriptor: WebMcpToolDescriptor, options) => {
      assert.ok(options?.signal, "native tools must be registered with an abort signal");
      registrations.push(descriptor.name);
    },
  }, tools, { signal: new AbortController().signal });
  assert.deepEqual(registered, registrations);
  assert.ok(registrations.includes("epoch_change_merge"));
}

async function everyAdapterReturnsTheSameReceipt(): Promise<void> {
  const viaCli = runtimeWith();
  const viaTool = runtimeWith();

  const cli = await executeCommunityRuntimeCommand(viaCli, ["view", "create", "denser-feed", "--json"]);
  assert.equal(cli.ok, true);
  // SAFETY: Runtime checks or construction above establish EpochCommandReceipt.
  const cliReceipt = JSON.parse(cli.output) as EpochCommandReceipt;

  const tools = createWebMcpTools(viaTool);
  const create = tools.find((tool) => tool.name === "epoch_view_create");
  assert.ok(create);
  // SAFETY: Runtime checks or construction above establish { commandId: string }.
  const toolReceipt = JSON.parse(await create.execute({ name: "denser-feed" })) as { commandId: string };

  assert.equal(cliReceipt.kind, "view.create");
  assert.equal(cliReceipt.source, "cli");
  assert.equal(
    cliReceipt.commandId,
    toolReceipt.commandId,
    "the CLI and a WebMCP tool issuing the same command against the same base must produce the same receipt id",
  );

  const human = await executeCommunityRuntimeCommand(viaCli, ["ui", "merge", "denser-feed"]);
  assert.equal(human.ok, false);
  assert.match(human.output, /confirmation required/u);

  const usage = await executeCommunityRuntimeCommand(viaCli, ["ui", "nonsense"]);
  assert.equal(usage.ok, false);
  assert.match(usage.output, /epoch ui status/u);
}

async function remainingRuntimeCliCommandsAreRouted(): Promise<void> {
  const runtime = runtimeWith();
  assert.equal(isCommunityRuntimeInvocation(["ui"]), true);
  assert.equal(isCommunityRuntimeInvocation(["view"]), true);
  assert.equal(isCommunityRuntimeInvocation(["log"]), false);

  const created = await executeCommunityRuntimeCommand(runtime, ["view", "create", "coverage-view", "--scope", "personal", "--json"]);
  assert.equal(created.ok, true);
  assert.equal((await executeCommunityRuntimeCommand(runtime, ["ui", "status", "--json"])).ok, true);
  assert.equal((await executeCommunityRuntimeCommand(runtime, ["ui", "verify", "--json"])).ok, true);
  assert.equal((await executeCommunityRuntimeCommand(runtime, ["ui", "views", "--json"])).ok, true);
  assert.equal((await executeCommunityRuntimeCommand(runtime, ["view", "list", "--json"])).ok, true);
  assert.equal((await executeCommunityRuntimeCommand(runtime, ["ui", "log", "--json"])).ok, true);
  assert.equal((await executeCommunityRuntimeCommand(runtime, ["ui", "preview", "--json"])).ok, true);
  assert.equal((await executeCommunityRuntimeCommand(runtime, ["ui", "validate", "coverage-view", "--json"])).ok, true);
  const proposed = await executeCommunityRuntimeCommand(runtime, [
    "ui", "propose", "coverage-view", "--manifest", JSON.stringify(denserFeed), "--prompt", "denser", "--model", "test", "--retain-prompt", "--json",
  ]);
  assert.equal(proposed.ok, true);
  assert.equal((await executeCommunityRuntimeCommand(runtime, ["ui", "diff", "coverage-view", "--json"])).ok, true);
  assert.equal((await executeCommunityRuntimeCommand(runtime, ["ui", "safe-mode", "on", "--json"])).ok, true);
  assert.equal((await executeCommunityRuntimeCommand(runtime, ["ui", "safe-mode", "off", "--confirm", "--json"])).ok, true);
  assert.equal((await executeCommunityRuntimeCommand(runtime, ["view", "switch", "coverage-view", "--json"])).ok, true);
  assert.equal((await executeCommunityRuntimeCommand(runtime, ["ui", "rollback", "coverage-view"])).ok, false);
  const exported = await executeCommunityRuntimeCommand(runtime, ["ui", "export", "--json"]);
  assert.equal(exported.ok, true);
  const imported = await executeCommunityRuntimeCommand(runtime, ["ui", "import", "bundle.json"]);
  assert.equal(imported.ok, false);
  assert.match(imported.output, /cannot read bundle files|ENOENT|invalid-input|Unexpected/);
}

async function theEpochBinaryOwnsBothCommandGroups(): Promise<void> {
  assert.equal(isCommunityCliInvocation("ui", ["status"]), true);
  assert.equal(isCommunityCliInvocation("view", ["list"]), true);
  assert.equal(isCommunityCliInvocation("community", ["repositories"]), true);
  assert.equal(isCommunityCliInvocation("log", []), false, "the repository log command still belongs to Core");

  const root = mkdtempSync(join(tmpdir(), "epoch-community-cli-"));
  try {
    const written: string[] = [];
    const errors: string[] = [];
    const io = { stdout: (message: string) => written.push(message), stderr: (message: string) => errors.push(message) };

    assert.equal(await executeCommunityCli(root, "view", ["create", "denser-feed"], io), true);
    assert.equal(await executeCommunityCli(root, "ui", ["merge", "denser-feed"], io), false,
      "a merge without --confirm changes nothing from the CLI either");
    assert.match(errors.join(""), /confirmation required/u);
    assert.equal(await executeCommunityCli(root, "ui", ["merge", "denser-feed", "--confirm"], io), true);

    // The workspace is on disk, so a second process sees the merged trunk.
    // SAFETY: Runtime checks or construction above establish { data: { views: number } }.
    const status = JSON.parse((await capture(root, ["status", "--json"])).split("\n")[0]) as { data: { views: number } };
    assert.equal(status.data.views, 2);

    // The forge group configures itself; no host-injected context required.
    assert.equal(await executeCommunityCli(root, "community", ["repositories"], io), false);
    assert.match(errors.join(""), /No Community remote configured/u);

    async function capture(repoRoot: string, args: readonly string[]): Promise<string> {
      const lines: string[] = [];
      await executeCommunityCli(repoRoot, "ui", args, {
        stdout: (message) => lines.push(message),
        stderr: (message) => lines.push(message),
      });
      return lines.join("");
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

async function theDefaultProjectOwnsTheInterface(): Promise<void> {
  const storage = createMemoryEpochIntegrationStorage();
  const runtime = runtimeWith(storage);

  // A fresh workspace can already recover: its opening revision came from the
  // installed harness and validated, so it is a known-good one.
  assert.deepEqual(runtime.workspace.status().lastKnownGood, { view: TRUNK_VIEW, revision: 1 });

  const first = await runtime.commands.execute<{ slug: string; uiView: string; created: boolean }>({
    kind: "project.ensureDefault",
  });
  assert.equal(first.data.slug, DEFAULT_PROJECT_SLUG);
  assert.equal(first.data.uiView, TRUNK_VIEW, "the default project owns the interface the browser renders");
  assert.equal(first.data.created, true);
  assert.equal(first.eventIds.length, 1);

  // Opening it again is not creating it again.
  const second = await runtime.commands.execute<{ created: boolean }>({ kind: "project.ensureDefault" });
  assert.equal(second.data.created, false);
  assert.deepEqual(second.eventIds, []);

  // A reload sees the same project rather than a new one.
  const reloaded = runtimeWith(storage);
  const afterReload = await reloaded.commands.execute<{ created: boolean; revision: number }>({
    kind: "project.ensureDefault",
  });
  assert.equal(afterReload.data.created, false);
  assert.equal(afterReload.data.revision, 1);

  const listed = await reloaded.commands.execute<readonly { slug: string }[]>({ kind: "project.list" });
  assert.deepEqual(listed.data.map((project) => project.slug), [DEFAULT_PROJECT_SLUG]);
  assert.equal(listed.readOnly, true);

  // Breaking the interface still leaves a way back, without erasing the break.
  await reloaded.commands.execute({ kind: "ui.propose", input: { view: TRUNK_VIEW, manifest: forbidden } });
  assert.equal(reloaded.workspace.materialize().safeMode, true);
  const restored = await reloaded.commands.execute({ kind: "ui.restoreLastKnownGood", confirmed: true });
  assert.equal(restored.policy.decision, "allow");
  assert.equal(reloaded.workspace.materialize().safeMode, false);
  assert.equal(reloaded.workspace.revision(TRUNK_VIEW, 2).manifest.placements[0]?.slot, "board.thread-list",
    "the revision that broke the interface stays readable");
}

async function socialRecordsAreChangeFeeds(): Promise<void> {
  const storage = createMemoryEpochIntegrationStorage();
  const runtime = runtimeWith(storage);

  const opened = await runtime.commands.execute<{ changeId: string; revisionId: string; edited: boolean }>({
    kind: "feed.append",
    input: { feed: "general", kind: "post", body: "cold install fails on a fresh clone", subject: "cold install" },
  });
  assert.equal(opened.policy.decision, "allow");
  assert.ok(opened.changeId?.startsWith("chg_"), "a social record has a native change identity");
  assert.equal(opened.data.edited, false);
  assert.equal(opened.eventIds.length, 1);

  const edited = await runtime.commands.execute<{ changeId: string; revisionId: string; edited: boolean; revision: number }>({
    kind: "feed.append",
    input: {
      feed: "general",
      kind: "post",
      body: "cold install fails on a fresh clone — it is the lockfile",
      changeId: opened.data.changeId,
    },
  });
  assert.equal(edited.data.changeId, opened.data.changeId, "an edit keeps the record's identity");
  assert.notEqual(edited.data.revisionId, opened.data.revisionId, "an edit is a new revision");
  assert.equal(edited.data.revision, 2);
  assert.equal(edited.data.edited, true);

  // "Edited" is readable rather than assertable: the earlier wording is there.
  const history = await runtime.commands.execute<readonly { body: string; revisionId: string }[]>({
    kind: "feed.history",
    input: { feed: "general", changeId: opened.data.changeId },
  });
  assert.equal(history.data.length, 2);
  assert.match(history.data[0].body, /cold install fails on a fresh clone$/u);
  assert.equal(history.readOnly, true);

  const records = await runtime.commands.execute<readonly { changeId: string; body: string }[]>({
    kind: "feed.read",
    input: { feed: "general" },
  });
  assert.equal(records.data.length, 1, "a feed shows one current record per change, not one per edit");
  assert.match(records.data[0].body, /it is the lockfile/u);

  // Editing something that was never opened is refused rather than inventing it.
  await assert.rejects(
    runtime.commands.execute({
      kind: "feed.append",
      input: { feed: "general", kind: "post", body: "ghost", changeId: "chg_deadbeef" },
    }),
    /No social record/u,
  );

  const reloaded = runtimeWith(storage);
  const afterReload = await reloaded.commands.execute<readonly { revisionIds: readonly string[] }[]>({
    kind: "feed.read",
    input: { feed: "general" },
  });
  assert.deepEqual(afterReload.data[0].revisionIds, [opened.data.revisionId, edited.data.revisionId]);
}

async function durableStorageCarriesAWorkspaceForward(): Promise<void> {
  // The IndexedDB path is exercised by the browser suite; this covers the
  // decisions that matter when it is unavailable, which is when a silent
  // failure would cost someone their workspace.
  const legacy = createMemoryEpochIntegrationStorage({
    "epoch:community-web:/.epoch-live/events/e1.json": "{}",
    "epoch:community-web:identity": "{}",
    "unrelated:key": "leave me alone",
  });

  const storage = await openDurableStorage({ namespace: "epoch:community-web", indexedDB: undefined, migrateFrom: legacy });
  assert.equal(storage.kind, "memory", "no IndexedDB means an honest in-memory workspace");
  assert.equal(storage.migrated, 2, "the existing workspace is carried over, not abandoned");
  assert.equal(storage.getItem("unrelated:key"), null, "another product's keys are not adopted");
  assert.equal(storage.pendingWrites(), 0);
  assert.equal(storage.lastError(), undefined);

  storage.setItem("epoch:community-web:/.epoch-live/events/e2.json", "{\"id\":2}");
  await storage.flush();
  const exported = storage.snapshot();
  assert.equal(Object.keys(exported).length, 3);

  const target = await openDurableStorage({ namespace: "epoch:community-web", indexedDB: undefined });
  assert.equal(target.length, 0);
  await target.restore(exported);
  assert.deepEqual(target.snapshot(), exported, "an exported workspace can be imported whole");

  // A migrated workspace opens as itself: same id, same history.
  const runtime = createCommunityRuntime({
    namespace: "migrated", actor: "did:epoch:tester", policies: fullAccess, now: clock, storage: target,
  });
  assert.ok(runtime.workspace.status().events >= 1);
}

async function identityIsStablePerDevice(): Promise<void> {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
  };

  const first = await resolveBrowserIdentity({ namespace: "epoch:community-web", storage });
  assert.equal(first.kind, "device");
  assert.match(first.actor, /^did:epoch:/u);
  assert.equal(first.created, true);
  assert.ok(first.publicKey, "a device identity carries a public key to bind a claim to later");

  const second = await resolveBrowserIdentity({ namespace: "epoch:community-web", storage });
  assert.equal(second.actor, first.actor, "the same device keeps the same actor");
  assert.equal(second.created, false);

  // The private half never leaves: what is stored is the public key only.
  // SAFETY: Runtime checks or construction above establish Record<string.
  const stored = JSON.parse(store.get("epoch:community-web:identity") ?? "{}") as TestJsonObject;
  assert.deepEqual(Object.keys(stored).sort(), ["actor", "publicKey", "version"]);
  // SAFETY: Runtime checks or construction above establish { d?: string }).d.
  assert.equal((stored.publicKey as { d?: string }).d, undefined, "no private key material is stored");

  // Without WebCrypto, say so rather than fake a durable identity.
  const withoutCrypto = await resolveBrowserIdentity({
    namespace: "epoch:community-web",
    storage: { getItem: () => null, setItem: () => {} },
    // SAFETY: Runtime checks or construction above establish Crypto.
    crypto: {} as Crypto,
  });
  assert.equal(withoutCrypto.kind, "ephemeral");
  assert.equal(withoutCrypto.actor, "did:epoch:anonymous");
}

async function twoParticipantsConvergeThroughBundles(): Promise<void> {
  const laptop = runtimeWith();
  const desktop = runtimeWith();

  await laptop.commands.execute({ kind: "view.create", input: { name: "denser-feed" } });
  await laptop.commands.execute({ kind: "ui.propose", input: { view: "denser-feed", manifest: denserFeed } });
  await laptop.commands.execute({ kind: "change.merge", input: { from: "denser-feed" }, confirmed: true });

  const bundle = await laptop.commands.execute<{ events: readonly unknown[]; digest: string }>({
    kind: "workspace.export",
  });
  assert.equal(bundle.readOnly, true);
  assert.ok(bundle.data.events.length > 0);

  // Importing is consequential, so it waits for a confirmation like any merge.
  const held = await desktop.commands.execute({ kind: "workspace.import", input: { bundle: bundle.data } });
  assert.equal(held.policy.decision, "confirm");

  const imported = await desktop.commands.execute<{ applied: number; skipped: number }>({
    kind: "workspace.import",
    input: { bundle: bundle.data },
    confirmed: true,
  });
  assert.ok(imported.data.applied > 0);
  // Both workspaces opened identically, so their opening events are the same
  // events — content-addressed ids converge instead of duplicating.
  assert.ok(imported.data.skipped > 0, "identical opening history is recognised, not duplicated");
  assert.equal(desktop.workspace.materialize().manifest.theme["--density-row"], "32px",
    "the desktop now renders what the laptop merged");

  const again = await desktop.commands.execute<{ applied: number }>({
    kind: "workspace.import",
    input: { bundle: bundle.data },
    confirmed: true,
  });
  assert.equal(again.data.applied, 0, "importing the same bundle twice changes nothing");

  // A bundle is something someone else made: importing one is when to be suspicious.
  await assert.rejects(
    desktop.commands.execute({
      kind: "workspace.import",
      input: { bundle: { ...bundle.data, digest: "cafebabe" } },
      confirmed: true,
    }),
    /digest does not match/u,
  );
  await assert.rejects(
    desktop.commands.execute({ kind: "workspace.import", input: { bundle: { hello: "world" } }, confirmed: true }),
    /not an Epoch workspace bundle/u,
  );
}

function harnessDigestDetectsTampering(): void {
  const harness = defaultCommunityHarness();
  assert.equal(verifyStaticHarnessRelease(harness), true);
  const tampered = {
    ...harness,
    components: [...harness.components, { id: "Exfiltrate", category: "panel", actions: [] }],
  };
  assert.equal(verifyStaticHarnessRelease(tampered), false,
    "a harness whose component allowlist was widened at runtime must fail verification");
}
