import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import { createMemoryEpochIntegrationStorage } from "@epoch/integration-core";
import {
  createCommunityRuntime,
  createWebMcpTools,
  executeCommunityRuntimeCommand,
  TRUNK_VIEW,
  type CommunityRuntime,
  type DynamicUiManifest,
  type EpochCommandReceipt,
  type UiSemanticDiff,
} from "@epoch/community-runtime";

/**
 * The self-evolving interface, driven through the same command bus the browser
 * UI, the CLI, and a WebMCP agent use. There is no browser here on purpose:
 * these scenarios are about what the workspace guarantees, and a screenshot
 * cannot show that a rejected proposal survived a rollback.
 */

const PROPOSAL_VIEW = "denser-feed";
const PROMPT = "Make my feed denser and put verification status beside each proposed change.";

const denserFeed: DynamicUiManifest = {
  abiVersion: 1,
  scope: "personal",
  placements: [
    { slot: "shell.primary-navigation", component: "PrimaryNav", action: "view.switch" },
    { slot: "shell.workspace-status", component: "WorkspaceStatus", action: "workspace.status" },
    { slot: "shell.workspace-status", component: "VerificationSummary", action: "change.show" },
    { slot: "board.thread-list", component: "ThreadList" },
    { slot: "board.recovery", component: "RecoveryControls", action: "ui.restoreLastKnownGood" },
  ],
  theme: { "--density-row": "32px" },
};

const unrenderable: DynamicUiManifest = {
  abiVersion: 1,
  scope: "personal",
  placements: [{ slot: "shell.nowhere", component: "ThreadList" }],
  theme: {},
};

interface UiWorld {
  runtime?: CommunityRuntime;
  diff?: UiSemanticDiff;
  unconfirmed?: EpochCommandReceipt;
  rendered?: { readonly manifest: DynamicUiManifest; readonly safeMode: boolean; readonly reason?: string };
  cliReceipt?: EpochCommandReceipt;
  toolReceipt?: { readonly commandId: string; readonly data: { readonly name: string } };
}

let world: UiWorld = {};

function openWorkspace(): CommunityRuntime {
  return createCommunityRuntime({
    namespace: "community-ui-evolution",
    actor: "did:epoch:contributor",
    policies: { capabilities: ["*"] },
    storage: createMemoryEpochIntegrationStorage(),
  });
}

function runtime(): CommunityRuntime {
  assert.ok(world.runtime, "no Community interface workspace is open");
  return world.runtime;
}

Given("a personal Community interface workspace on the installed harness", function () {
  world = { runtime: openWorkspace() };
  assert.equal(runtime().workspace.status().harnessVerified, true);
});

Given("a personal Community interface workspace whose current interface no longer validates", async function () {
  world = { runtime: openWorkspace() };
  await runtime().commands.execute({ kind: "ui.propose", input: { view: PROPOSAL_VIEW, manifest: denserFeed } });
  await runtime().commands.execute({ kind: "change.merge", input: { from: PROPOSAL_VIEW }, confirmed: true });
  await runtime().commands.execute({ kind: "ui.propose", input: { view: TRUNK_VIEW, manifest: unrenderable } });
});

When("I propose a denser feed that puts verification status beside each change", async function () {
  await runtime().commands.execute({ kind: "view.create", input: { name: PROPOSAL_VIEW, scope: "personal" } });
  await runtime().commands.execute({
    kind: "ui.propose",
    input: { view: PROPOSAL_VIEW, manifest: denserFeed, prompt: PROMPT, model: "on-device" },
  });
  const diff = await runtime().commands.execute<UiSemanticDiff>({
    kind: "ui.semanticDiff",
    input: { from: PROPOSAL_VIEW },
  });
  world.diff = diff.data;
  world.unconfirmed = await runtime().commands.execute({ kind: "change.merge", input: { from: PROPOSAL_VIEW } });
});

When("I open the board", function () {
  world.rendered = runtime().workspace.materialize();
});

When("I create the same proposal from the terminal and from an agent tool", async function () {
  const agent = openWorkspace();
  const cli = await executeCommunityRuntimeCommand(runtime(), ["view", "create", PROPOSAL_VIEW, "--json"]);
  // SAFETY: Runtime checks or construction above establish EpochCommandReceipt.
  world.cliReceipt = JSON.parse(cli.output) as EpochCommandReceipt;

  const create = createWebMcpTools(agent).find((tool) => tool.name === "epoch_view_create");
  assert.ok(create, "the agent is offered a view.create tool");
  // SAFETY: Runtime checks or construction above establish UiWorld["toolReceipt"].
  world.toolReceipt = JSON.parse(await create.execute({ name: PROPOSAL_VIEW })) as UiWorld["toolReceipt"];
});

Then("I see which widgets layout and theme tokens the proposal changes", function () {
  const diff = world.diff;
  assert.ok(diff);
  assert.ok(diff.widgets.some((entry) => entry.includes("VerificationSummary")));
  assert.ok(diff.theme.some((entry) => entry.includes("--density-row")));
  assert.equal(diff.empty, false);
});

Then("the proposal is not applied until I confirm it", async function () {
  assert.equal(world.unconfirmed?.policy.decision, "confirm");
  assert.equal(runtime().workspace.materialize().manifest.theme["--density-row"], undefined);

  const merged = await runtime().commands.execute({
    kind: "change.merge",
    input: { from: PROPOSAL_VIEW },
    confirmed: true,
  });
  assert.equal(merged.policy.decision, "allow");
  assert.equal(runtime().workspace.materialize().manifest.theme["--density-row"], "32px");
});

Then("accepting it records the prompt as a digest rather than the text I typed", function () {
  const provenance = runtime().workspace.head(PROPOSAL_VIEW).provenance;
  assert.equal(provenance.prompt, undefined);
  assert.ok((provenance.promptDigest ?? "").length > 0);
  assert.equal(provenance.model, "on-device");
});

Then("the installed harness renders its recovery interface instead of the broken one", function () {
  const rendered = world.rendered;
  assert.ok(rendered);
  assert.equal(rendered.safeMode, true);
  assert.deepEqual(rendered.manifest, runtime().harness.safeModeManifest);
  assert.ok(rendered.manifest.placements.some((placement) => placement.component === "RecoveryControls"));
});

Then("restoring the last working interface leaves the rejected proposal inspectable", async function () {
  const before = runtime().workspace.history(TRUNK_VIEW).length;
  const restored = await runtime().commands.execute({ kind: "ui.restoreLastKnownGood", confirmed: true });
  assert.equal(restored.policy.decision, "allow");
  assert.equal(runtime().workspace.materialize().safeMode, false);
  assert.equal(runtime().workspace.history(TRUNK_VIEW).length, before + 1, "recovery appends rather than rewrites");
  assert.ok(runtime().workspace.revision(TRUNK_VIEW, before).manifest.placements
    .some((placement) => placement.slot === "shell.nowhere"), "the revision that broke the board stays readable");
});

Then("both report the same command identity and resulting view", function () {
  assert.equal(world.cliReceipt?.kind, "view.create");
  assert.equal(world.cliReceipt?.commandId, world.toolReceipt?.commandId);
  assert.equal(world.toolReceipt?.data.name, PROPOSAL_VIEW);
});

Then("an agent without permission is refused even though the tool is offered", async function () {
  const reader = createCommunityRuntime({
    namespace: "community-ui-evolution-reader",
    actor: "did:epoch:reader",
    storage: createMemoryEpochIntegrationStorage(),
  });

  const create = createWebMcpTools(reader).find((tool) => tool.name === "epoch_view_create");
  assert.ok(create, "the tool is still advertised — visibility is not authorization");
  // SAFETY: Runtime checks or construction above establish { decision: string }.
  const result = JSON.parse(await create.execute({ name: PROPOSAL_VIEW })) as { decision: string };
  assert.equal(result.decision, "deny");
  assert.equal(reader.workspace.listViews().length, 1);
});
