import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

interface FeatureSpec {
  path: string;
  name: string;
  text: string;
}

const personaTags = [
  "@persona.github_open_source_contributor",
  "@persona.maintainer",
  "@persona.platform_operator",
  "@persona.security_compliance_responder",
];

export function runPersonaFeatureModelTests(): void {
  const features = readFeatureSpecs();
  featureFilesDoNotModelPersonasAsFeatures(features);
  featureFilesDoNotContainMechanicalPersonaContextScenarios(features);
  documentedPersonaTagsAreUsedOnRealFeatureScenarios(features);
  executableFeatureSpecsStayDiscoverable(features);
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

function documentedPersonaTagsAreUsedOnRealFeatureScenarios(features: readonly FeatureSpec[]): void {
  const realFeatureText = features.map((feature) => feature.text).join("\n");
  for (const tag of personaTags) {
    assert.match(realFeatureText, new RegExp(`${escapeForRegExp(tag)}\\s+Scenario`, "u"), `${tag} must tag a real product scenario`);
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

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
