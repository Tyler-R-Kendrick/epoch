import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
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
  readonly personaMatrix: string;
  readonly personaE2eJourneys: string;
  readonly executableFeatureSpecs: readonly string[];
}

interface CommunityHcdWorld {
  hcdState?: CommunityHcdState;
  auditedFeatureSpec?: string;
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
    personaMatrix: read("docs/persona-feature-matrix.md"),
    personaE2eJourneys: read("docs/persona-e2e-journeys.md"),
    executableFeatureSpecs: readdirSync("features")
      .filter((entry) => entry.endsWith(".feature"))
      .map((entry) => `features/${entry}`)
      .sort(),
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

When("an agent audits the executable feature spec {string}", function (this: CommunityHcdWorld, featureSpec: string) {
  const hcdState = getHcdState(this);
  assertIncludes(hcdState.featureRegistry, featureSpec);
  this.auditedFeatureSpec = featureSpec;
});

Then("the persona feature matrix documents {string}", function (this: CommunityHcdWorld, featureSpec: string) {
  const hcdState = getHcdState(this);
  assert.ok(findMatrixRow(hcdState, featureSpec), `Expected persona feature matrix to document ${featureSpec}`);
});

Then("the persona feature matrix maps {string} to persona {string}", function (this: CommunityHcdWorld, featureSpec: string, persona: string) {
  const hcdState = getHcdState(this);
  assertIncludes(findMatrixRow(hcdState, featureSpec), persona);
});

Then("the persona feature matrix captures pain point {string}", function (this: CommunityHcdWorld, painPoint: string) {
  const hcdState = getHcdState(this);
  assertIncludes(findAuditedMatrixRow(this, hcdState), painPoint);
});

Then("the persona feature matrix captures human consideration {string}", function (this: CommunityHcdWorld, consideration: string) {
  const hcdState = getHcdState(this);
  assertIncludes(findAuditedMatrixRow(this, hcdState), consideration);
});

When("an agent audits the repository feature inventory", function (this: CommunityHcdWorld) {
  const hcdState = getHcdState(this);
  assert.ok(hcdState.executableFeatureSpecs.length > 0, "Expected executable feature specs to be present");
});

Then("every executable feature spec is documented in the feature registry", function (this: CommunityHcdWorld) {
  const hcdState = getHcdState(this);
  for (const featureSpec of hcdState.executableFeatureSpecs) {
    assertIncludes(hcdState.featureRegistry, featureSpec);
  }
});

Then("every executable feature spec is documented in the persona feature matrix", function (this: CommunityHcdWorld) {
  const hcdState = getHcdState(this);
  for (const featureSpec of hcdState.executableFeatureSpecs) {
    assert.ok(findMatrixRow(hcdState, featureSpec), `Expected persona feature matrix to document ${featureSpec}`);
  }
});

Then("every executable feature spec carries a persona-driven rule", function (this: CommunityHcdWorld) {
  const hcdState = getHcdState(this);
  for (const featureSpec of hcdState.executableFeatureSpecs) {
    const featureText = read(featureSpec);
    assertIncludes(featureText, "Rule: Persona-driven feature acceptance");
    assertIncludes(featureText, "Scenario Outline: Persona context");
    assertIncludes(featureText, "Examples:");
  }
});

Then("every documented persona has an executable end-to-end journey", function (this: CommunityHcdWorld) {
  const hcdState = getHcdState(this);
  const personaJourneySpec = read("features/persona_e2e_journeys.feature");
  for (const persona of documentedPersonas(hcdState)) {
    const tag = `@persona.${personaSlug(persona)}`;
    assertIncludes(hcdState.personaE2eJourneys, persona);
    assertIncludes(hcdState.personaE2eJourneys, tag);
    assertIncludes(personaJourneySpec, "@e2e");
    assertIncludes(personaJourneySpec, tag);
  }
});

Then("every executable feature spec is covered by a persona end-to-end journey", function (this: CommunityHcdWorld) {
  const hcdState = getHcdState(this);
  for (const featureSpec of hcdState.executableFeatureSpecs) {
    assertIncludes(hcdState.personaE2eJourneys, featureSpec);
  }
});

function findMatrixRow(hcdState: CommunityHcdState, featureSpec: string): string {
  return hcdState.personaMatrix
    .split(/\r?\n/u)
    .find((line) => line.includes(`\`${featureSpec}\``) || line.includes(featureSpec)) ?? "";
}

function documentedPersonas(hcdState: CommunityHcdState): readonly string[] {
  return hcdState.personaMatrix
    .split(/\r?\n/u)
    .filter((line) => line.startsWith("| ") && !line.includes("---") && !line.includes("Persona |"))
    .map((line) => line.split("|").map((cell) => cell.trim())[1])
    .filter((persona) => persona.startsWith("A "));
}

function personaSlug(persona: string): string {
  return persona
    .toLowerCase()
    .replace(/&/gu, "and")
    .replace(/[^a-z0-9]+/gu, "_")
    .replace(/^_+|_+$/gu, "")
    .replace(/^a_/u, "");
}

function findAuditedMatrixRow(world: CommunityHcdWorld, hcdState: CommunityHcdState): string {
  assert.ok(world.auditedFeatureSpec, "Expected a feature spec to be audited before matrix row assertions");
  return findMatrixRow(hcdState, world.auditedFeatureSpec);
}

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
