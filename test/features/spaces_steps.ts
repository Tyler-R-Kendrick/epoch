import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { After, Given, Then, When } from "@cucumber/cucumber";
import {
  EpochRepository,
  FileSystemWorkspaceProvider,
  SignedSpaceStore,
  SpaceError,
  type SpaceAnchorResolution,
  type SpaceRecord,
} from "@epoch/core";

interface SpaceWorld {
  workspace?: string;
  store?: SignedSpaceStore;
  spaceId?: string;
  lastRecord?: SpaceRecord;
  lastError?: SpaceError;
  anchorId?: string;
  resolution?: SpaceAnchorResolution;
  createdDirs: string[];
}

let world: SpaceWorld = { createdDirs: [] };

const BOARD = '{"rail":{"width":24},"stream":{"rows":40}}';
const REFORMATTED = '{\n  "stream": {\n    "rows": 40\n  },\n  "rail": {\n    "width": 24\n  }\n}\n';
const WITHOUT_RAIL = '{"stream":{"rows":40}}';

function store(): SignedSpaceStore {
  if (world.store === undefined) throw new Error("no space store in scope");
  return world.store;
}

function spaceId(): string {
  if (world.spaceId === undefined) throw new Error("no space in scope");
  return world.spaceId;
}

/** Run an action that is expected to be refused, and keep the refusal. */
function attempt(action: () => unknown): void {
  world.lastError = undefined;
  try { action(); }
  catch (error) {
    if (!(error instanceof SpaceError)) throw error;
    world.lastError = error;
  }
}

function refusal(): SpaceError {
  if (world.lastError === undefined) throw new Error("expected the action to be refused, but it succeeded");
  return world.lastError;
}

After(function () {
  for (const directory of world.createdDirs) rmSync(directory, { recursive: true, force: true });
  world = { createdDirs: [] };
});

Given("a maintainer has opened a space called {string} over the main view", function (title: string) {
  const workspace = mkdtempSync(join(tmpdir(), "epoch-space-feature-"));
  world.createdDirs.push(workspace);
  world.workspace = workspace;
  world.store = SignedSpaceStore.open(workspace, { author: "maintainer" });
  world.spaceId = store().createSpace({ title, view: "main" }).id;
});

Given("a contributor has joined the space and recorded a turn", function () {
  store().join(spaceId(), { principal: "contributor", role: "collaborator" });
  store().recordTurn(spaceId(), { request: "tighten the notice blade", principal: "contributor" });
});

Given("a member agent has joined the space with a budget of {int} units", function (units: number) {
  store().join(spaceId(), { principal: "member-agent", role: "agent" });
  store().allocateTurnBudget(spaceId(), { principal: "member-agent", units });
});

Given("the contributor has anchored a comment to the {string} setting in a board configuration", function (setting: string) {
  store().join(spaceId(), { principal: "contributor", role: "collaborator" });
  const revisionId = new EpochRepository(world.workspace!).events()[0]!.id;
  world.anchorId = store().recordAnchor(spaceId(), {
    revisionId, path: "board.json", structuralPath: `object#0/member:${setting}`,
    content: BOARD, principal: "contributor",
  }).id;
});

When("the contributor joins the space as a collaborator", function () {
  world.lastRecord = store().join(spaceId(), { principal: "contributor", role: "collaborator" });
});

When("the contributor records a turn asking for the rail to be narrowed", function () {
  world.lastRecord = store().recordTurn(spaceId(), { request: "narrow the rail to 20 columns", principal: "contributor" });
});

When("the maintainer removes the contributor from the space", function () {
  store().leave(spaceId(), { principal: "contributor" });
});

When("the agent records a turn costing {int} units", function (units: number) {
  world.lastRecord = store().recordTurn(spaceId(), { request: "reindex the board", principal: "member-agent", units });
});

When("an agent tries to record captured edits before any consent is given", function () {
  store().join(spaceId(), { principal: "member-agent", role: "agent" });
  attempt(() => store().recordCapturedOperation(spaceId(), {
    path: "rail.json", content: BOARD, principal: "member-agent",
  }));
});

When("the maintainer opens a capture session scoped to {string} retained for {string}", function (scope: string, retention: string) {
  world.lastRecord = store().openCapture(spaceId(), { scope, retention, principal: "member-agent" });
});

When("the operator binds a filesystem workspace to the space", function () {
  world.lastRecord = store().bindWorkspace(spaceId(), {
    provider: new FileSystemWorkspaceProvider(world.workspace!),
  });
});

When("the configuration is reformatted and its settings are reordered", function () {
  world.resolution = store().resolveAnchor(world.anchorId!, { content: REFORMATTED });
});

Then("the turn is recorded against the contributor's own grant", function () {
  const participant = store().participants(spaceId()).find((item) => item.role === "collaborator");
  assert.ok(participant !== undefined, "the contributor should hold a grant");
  assert.equal(world.lastRecord?.data.grantId, participant.grantId);
});

Then("the space shows the contributor among its active participants", function () {
  const active = store().participants(spaceId()).filter((item) => item.active);
  assert.equal(active.some((item) => item.role === "collaborator"), true);
});

Then("the contributor can no longer record a turn in the space", function () {
  attempt(() => store().recordTurn(spaceId(), { request: "one more thing", principal: "contributor" }));
  assert.equal(refusal().code, "grant-denied");
});

Then("the space no longer counts the contributor as an active participant", function () {
  assert.equal(store().showSpace(spaceId()).data.participantCount, 1);
});

Then("the agent has {int} unit remaining", function (remaining: number) {
  assert.equal(world.lastRecord?.data.remaining, remaining);
});

Then("a further turn costing {int} units is refused as over budget", function (units: number) {
  attempt(() => store().recordTurn(spaceId(), { request: "reindex again", principal: "member-agent", units }));
  assert.equal(refusal().code, "budget-exceeded");
});

Then("the capture is refused because no capture session is open", function () {
  assert.equal(refusal().code, "policy-denied");
});

Then("the agent's captured edit is recorded against that session", function () {
  const sessionId = world.lastRecord?.id;
  const recorded = store().recordCapturedOperation(spaceId(), {
    path: "rail.json", content: BOARD, principal: "member-agent",
  });
  assert.equal(recorded.data.sessionId, sessionId);
});

Then("closing the session seals it with the number of operations it captured", function () {
  const closed = store().closeCapture(spaceId(), { principal: "member-agent" });
  assert.equal(closed.data.operationCount, 1);
  assert.equal(store().captureSessions(spaceId()).every((item) => item.data.open === false), true);
});

Then("the bound workspace reports execution as disabled", function () {
  assert.equal(world.lastRecord?.data.execution, "disabled");
});

Then("binding a workspace that claims isolated execution is refused", function () {
  assert.throws(() => store().bindWorkspace(spaceId(), {
    provider: new FileSystemWorkspaceProvider(world.workspace!), execution: "isolated",
  }), /cannot claim isolated execution/u);
});

Then("the comment still points at the {string} setting", function (setting: string) {
  assert.equal(world.resolution?.status, "moved");
  assert.equal(world.resolution?.structuralPath, `object#0/member:${setting}`);
});

Then("the comment reports itself unresolved once the {string} setting is deleted", function (setting: string) {
  const resolved = store().resolveAnchor(world.anchorId!, { content: WITHOUT_RAIL });
  assert.equal(resolved.status, "unresolved");
  assert.equal(resolved.structuralPath, `object#0/member:${setting}`);
});
