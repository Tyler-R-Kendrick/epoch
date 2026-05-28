import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Given, Then, When } from "@cucumber/cucumber";

interface CommunityHcdState {
  readonly guide: string;
  readonly agents: string;
  readonly contributing: string;
  readonly prTemplate: string;
  readonly skill: string;
  readonly documentationReference: string;
  readonly featureRegistry: string;
  readonly featureSpec: string;
}

interface CommunityHcdWorld {
  hcdState?: CommunityHcdState;
}

Given("the Community human-centered design guidance is available", function (this: CommunityHcdWorld) {
  this.hcdState = {
    guide: read("docs/community-human-centered-design.md"),
    agents: read("AGENTS.md"),
    contributing: read("CONTRIBUTING.md"),
    prTemplate: read(".github/PULL_REQUEST_TEMPLATE.md"),
    skill: read("skills/epoch/SKILL.md"),
    documentationReference: read("skills/epoch/references/documentation.md"),
    featureRegistry: read("docs/features.md"),
    featureSpec: read("features/community_persona_driven_design.feature"),
  };
});

Given("the default Community persona is {string}", function (this: CommunityHcdWorld, persona: string) {
  const hcdState = getHcdState(this);
  assertIncludes(hcdState.guide, persona);
  assertIncludes(hcdState.agents, persona);
  assertIncludes(hcdState.skill, persona);
});

When("an agent plans a Community feature change", function (this: CommunityHcdWorld) {
  const hcdState = getHcdState(this);
  assertIncludes(hcdState.guide, "Community work");
});

When("the persona is trying to judge current repository state during degraded hosted-service availability", function (this: CommunityHcdWorld) {
  const hcdState = getHcdState(this);
  assertIncludes(hcdState.guide, "hosted services are degraded");
});

When("the persona is deciding whether to trust editor, workflow, signing-key, or extension access", function (this: CommunityHcdWorld) {
  const hcdState = getHcdState(this);
  assertIncludes(hcdState.guide, "editor extensions");
});

When("the persona is deciding whether to run AI assistance, CI, storage, or cloud automation", function (this: CommunityHcdWorld) {
  const hcdState = getHcdState(this);
  assertIncludes(hcdState.guide, "AI-assisted contribution");
});

When("the persona is contributing asynchronously under community pressure", function (this: CommunityHcdWorld) {
  const hcdState = getHcdState(this);
  assertIncludes(hcdState.guide, "global and asynchronous");
});

Then("the Community BDD contract requires a persona-driven Gherkin scenario", function (this: CommunityHcdWorld) {
  const hcdState = getHcdState(this);
  assertIncludes(hcdState.guide, "persona-driven Gherkin");
  assertIncludes(hcdState.featureRegistry, "community_persona_driven_design.feature");
  assertIncludes(hcdState.featureSpec, "Feature: Epoch Community persona-driven BDD");
});

Then("the scenario must name the contributor journey, pain point, trust question, degraded-state behavior, and validation evidence", function (this: CommunityHcdWorld) {
  const hcdState = getHcdState(this);
  for (const expected of [
    "contributor journey",
    "pain point",
    "trust question",
    "degraded-state behavior",
    "validation evidence",
  ]) {
    assertIncludes(hcdState.guide, expected);
  }
});

Then("the repository instructions require Community changes to update persona-driven feature scenarios", function (this: CommunityHcdWorld) {
  const hcdState = getHcdState(this);
  assertIncludes(hcdState.agents, "persona-driven feature scenarios");
  assertIncludes(hcdState.contributing, "persona-driven feature scenarios");
  assertIncludes(hcdState.prTemplate, "persona-driven");
  assertIncludes(hcdState.skill, "persona-driven");
  assertIncludes(hcdState.documentationReference, "persona-driven");
});

Then("the Community BDD contract requires methodology {string}", function (this: CommunityHcdWorld, methodology: string) {
  const hcdState = getHcdState(this);
  assertIncludes(hcdState.guide, methodology);
  assertIncludes(hcdState.agents, methodology);
  assertIncludes(hcdState.skill, methodology);
  assertIncludes(hcdState.featureSpec, methodology);
});

Then("the Community design-thinking loop covers stage {string}", function (this: CommunityHcdWorld, stage: string) {
  const hcdState = getHcdState(this);
  assertIncludes(hcdState.guide, stage);
  assertIncludes(hcdState.featureSpec, stage);
});

Then("the Community scenario catalog covers pain point {string}", function (this: CommunityHcdWorld, painPoint: string) {
  const hcdState = getHcdState(this);
  assertIncludes(hcdState.guide, painPoint);
  assertIncludes(hcdState.featureSpec, painPoint);
});

Then("the Community scenario catalog covers human consideration {string}", function (this: CommunityHcdWorld, consideration: string) {
  const hcdState = getHcdState(this);
  assertIncludes(hcdState.guide, consideration);
  assertIncludes(hcdState.featureSpec, consideration);
});

Then("the Community scenario catalog covers recovery option {string}", function (this: CommunityHcdWorld, recoveryOption: string) {
  const hcdState = getHcdState(this);
  assertIncludes(hcdState.guide, recoveryOption);
  assertIncludes(hcdState.featureSpec, recoveryOption);
});

function getHcdState(world: CommunityHcdWorld): CommunityHcdState {
  assert.ok(world.hcdState, "Community HCD guidance must be loaded before assertions run");
  return world.hcdState;
}

function read(path: string): string {
  return readFileSync(path, "utf8");
}

function assertIncludes(haystack: string, needle: string): void {
  assert.match(haystack, new RegExp(escapeForRegExp(needle), "iu"));
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
