import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeCommunityCli, isCommunityCliInvocation } from "@epoch/cli";
import { createMemoryEpochIntegrationStorage } from "@epoch/integration-core";
import {
  createCommunityRuntime,
  createWebMcpTools,
  defaultCommunityHarness,
  executeCommunityRuntimeCommand,
  registerWebMcpTools,
  TRUNK_VIEW,
  verifyStaticHarnessRelease,
  type DynamicUiManifest,
  type EpochCommandReceipt,
  type WebMcpToolDescriptor,
} from "@epoch/community-runtime";

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
  const cliReceipt = JSON.parse(cli.output) as EpochCommandReceipt;

  const tools = createWebMcpTools(viaTool);
  const create = tools.find((tool) => tool.name === "epoch_view_create");
  assert.ok(create);
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
