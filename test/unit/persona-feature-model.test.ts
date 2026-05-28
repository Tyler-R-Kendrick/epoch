import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

interface FeatureSpec {
  path: string;
  name: string;
  text: string;
}

interface ScenarioSpec {
  featurePath: string;
  keyword: "Scenario" | "Scenario Outline";
  name: string;
  personaTags: string[];
  rule: string;
  examples: number;
}

const personaTags = [
  "@persona.github_open_source_contributor",
  "@persona.maintainer",
  "@persona.platform_operator",
  "@persona.security_compliance_responder",
];

export function runPersonaFeatureModelTests(): void {
  const features = readFeatureSpecs();
  const scenarios = readScenarioSpecs(features);
  featureFilesDoNotModelPersonasAsFeatures(features);
  featureFilesDoNotContainMechanicalPersonaContextScenarios(features);
  featureScenariosCarryPersonaContext(scenarios);
  documentedPersonaTagsAreUsedOnRealFeatureScenarios(scenarios);
  executableFeatureSpecsStayDiscoverable(features);
  executableScenarioInventoryDocumentsEveryScenario(scenarios);
}

function featureFilesDoNotModelPersonasAsFeatures(features: readonly FeatureSpec[]): void {
  const invalidFiles = features
    .map((feature) => feature.name)
    .filter((name) =>
      name.startsWith("persona_")
      || name.includes("_persona_")
      || name.endsWith("_e2e_journeys.feature")
      || name.includes("human_centered_design")
      || name.includes("human-centered-design"),
    );
  assert.deepEqual(invalidFiles, [], "Personas are users in scenarios, not standalone feature files");

  const invalidTitles = features
    .filter((feature) => /^Feature: .*persona/im.test(feature.text) || /^Feature: .*human-centered design/im.test(feature.text))
    .map((feature) => feature.path);
  assert.deepEqual(invalidTitles, [], "Feature titles must describe product behavior, not persona/design governance");
}

function featureFilesDoNotContainMechanicalPersonaContextScenarios(features: readonly FeatureSpec[]): void {
  for (const feature of features) {
    assert.ok(!feature.text.includes("Rule: Persona-driven feature acceptance"), `${feature.path} contains a mechanical persona rule`);
    assert.ok(!feature.text.includes("Scenario Outline: Persona context"), `${feature.path} contains a matrix-only persona scenario`);
  }
}

function featureScenariosCarryPersonaContext(scenarios: readonly ScenarioSpec[]): void {
  for (const scenario of scenarios) {
    assert.notEqual(
      scenario.personaTags.length,
      0,
      `${scenario.featurePath} ${scenario.keyword}: ${scenario.name} must have at least one persona tag`,
    );
  }
}

function documentedPersonaTagsAreUsedOnRealFeatureScenarios(scenarios: readonly ScenarioSpec[]): void {
  const scenarioPersonaTags = new Set(scenarios.flatMap((scenario) => scenario.personaTags));
  for (const tag of personaTags) {
    assert.ok(scenarioPersonaTags.has(tag), `${tag} must tag a real product scenario`);
  }
}

function executableFeatureSpecsStayDiscoverable(features: readonly FeatureSpec[]): void {
  const featureRegistry = readFileSync("docs/features.md", "utf8");
  const personaMatrix = readFileSync("docs/persona-feature-matrix.md", "utf8");

  for (const feature of features) {
    assert.match(featureRegistry, new RegExp(escapeForRegExp(feature.path), "u"), `${feature.path} is missing from docs/features.md`);
    assert.match(personaMatrix, new RegExp(escapeForRegExp(feature.path), "u"), `${feature.path} is missing from docs/persona-feature-matrix.md`);
  }
}

function executableScenarioInventoryDocumentsEveryScenario(scenarios: readonly ScenarioSpec[]): void {
  const featureRegistry = readFileSync("docs/features.md", "utf8");
  const scenarioInventory = readFileSync("docs/feature-scenario-inventory.md", "utf8");
  const expectedRows = new Set(scenarios.map((scenario) => expectedScenarioInventoryRow(scenario)));
  const actualRows = scenarioInventory
    .split(/\r?\n/u)
    .filter((line) => /^\| `features\/.*` \| `@persona\./u.test(line));

  assert.match(
    featureRegistry,
    /docs\/feature-scenario-inventory\.md|feature-scenario-inventory\.md/u,
    "docs/features.md must link to the executable scenario inventory",
  );

  for (const scenario of scenarios) {
    const row = expectedScenarioInventoryRow(scenario);
    assert.ok(
      scenarioInventory.includes(row),
      `docs/feature-scenario-inventory.md is missing ${scenario.featurePath} ${scenario.keyword}: ${scenario.name}`,
    );
  }

  assert.deepEqual(
    new Set(actualRows),
    expectedRows,
    "docs/feature-scenario-inventory.md must not contain stale or malformed scenario records",
  );

  const scenarioCounts = scenarios.reduce((counts, scenario) => {
    counts.set(scenario.featurePath, (counts.get(scenario.featurePath) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
  for (const [featurePath, count] of scenarioCounts) {
    assert.ok(
      scenarioInventory.includes(`| \`${featurePath}\` | ${count} |`),
      `docs/feature-scenario-inventory.md is missing the scenario count for ${featurePath}`,
    );
  }
}

function readFeatureSpecs(): readonly FeatureSpec[] {
  return readdirSync("features")
    .filter((entry) => entry.endsWith(".feature"))
    .sort()
    .map((entry) => {
      const path = `features/${entry}`;
      return {
        path,
        name: basename(path),
        text: readFileSync(join("features", entry), "utf8"),
      };
    });
}

function readScenarioSpecs(features: readonly FeatureSpec[]): readonly ScenarioSpec[] {
  const scenarios: ScenarioSpec[] = [];

  for (const feature of features) {
    let pendingTags: string[] = [];
    let currentRule = "None";
    let currentScenario: ScenarioSpec | undefined;

    for (const line of feature.text.split(/\r?\n/u)) {
      const trimmed = line.trim();

      if (trimmed.startsWith("@")) {
        pendingTags = trimmed.split(/\s+/u);
        continue;
      }

      const rule = /^Rule:\s*(.+)$/u.exec(trimmed);
      if (rule != null) {
        currentRule = rule[1];
        currentScenario = undefined;
        continue;
      }

      const scenario = /^(Scenario|Scenario Outline):\s*(.+)$/u.exec(trimmed);
      if (scenario != null) {
        currentScenario = {
          featurePath: feature.path,
          keyword: scenario[1] as ScenarioSpec["keyword"],
          name: scenario[2],
          personaTags: pendingTags.filter((tag) => tag.startsWith("@persona.")),
          rule: currentRule,
          examples: 0,
        };
        scenarios.push(currentScenario);
        pendingTags = [];
        continue;
      }

      if (/^Examples:/u.test(trimmed) && currentScenario != null) {
        currentScenario.examples += 1;
      }
    }
  }

  return scenarios;
}

function expectedScenarioInventoryRow(scenario: ScenarioSpec): string {
  const cells = [
    `\`${scenario.featurePath}\``,
    `\`${scenario.personaTags.join(" ")}\``,
    scenario.keyword,
    escapeMarkdownTableCell(scenario.name),
    escapeMarkdownTableCell(scenario.rule),
    scenario.examples.toString(),
  ];
  return `| ${cells.join(" | ")} |`;
}

function escapeMarkdownTableCell(value: string): string {
  return value.replace(/\\/gu, "\\\\").replace(/\|/gu, "\\|");
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
