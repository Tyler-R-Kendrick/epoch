import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const evidenceDirectory = join(process.cwd(), "docs", "evidence", "community-operations");
const featureJsonPath = join(evidenceDirectory, "community_operations.feature.json");
const featureVideoPath = join(evidenceDirectory, "community_operations.webm");
const evidenceReadmePath = join(evidenceDirectory, "README.md");

export function runCommunityOperationsE2eArtifactTests(): void {
  communityOperationsEvidenceArtifactsAreRecorded();
  communityOperationsFeatureDocumentationLinksEvidence();
  communityOperationsRecorderIsRunnableFromPackageScripts();
}

function communityOperationsEvidenceArtifactsAreRecorded(): void {
  assert.ok(existsSync(featureJsonPath), "expected Community Operations Cucumber JSON evidence");
  assert.ok(existsSync(featureVideoPath), "expected Community Operations Playwright WebM evidence");

  const featureJson = JSON.parse(readFileSync(featureJsonPath, "utf8")) as unknown;
  assertCommunityOperationsFeatureJson(featureJson);
  assert.ok(statSync(featureVideoPath).size > 1_000, "expected non-empty Community Operations WebM evidence");
}

function communityOperationsFeatureDocumentationLinksEvidence(): void {
  assert.ok(existsSync(evidenceReadmePath), "expected Community Operations evidence README");
  const evidenceReadme = readFileSync(evidenceReadmePath, "utf8");
  const featureRegistry = readFileSync(join(process.cwd(), "docs", "features.md"), "utf8");

  assert.match(evidenceReadme, /\[Cucumber JSON evidence\]\(community_operations\.feature\.json\)/u);
  assert.match(evidenceReadme, /\[Playwright WebM evidence\]\(community_operations\.webm\)/u);
  assert.match(featureRegistry, /\[Community Operations evidence\]\(evidence\/community-operations\/README\.md\)/u);
  assert.match(featureRegistry, /\[Cucumber JSON\]\(evidence\/community-operations\/community_operations\.feature\.json\)/u);
  assert.match(featureRegistry, /\[Playwright WebM\]\(evidence\/community-operations\/community_operations\.webm\)/u);
}

function communityOperationsRecorderIsRunnableFromPackageScripts(): void {
  const packageManifest = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
    readonly scripts?: Record<string, string>;
  };

  assert.equal(
    packageManifest.scripts?.["e2e:community-operations"],
    "node scripts/run-community-operations-e2e.mjs",
  );
}

function assertCommunityOperationsFeatureJson(featureJson: unknown): void {
  assert.ok(Array.isArray(featureJson), "expected Cucumber JSON evidence array");
  const serialized = JSON.stringify(featureJson);

  assert.match(serialized, /Community maintainer operates project capabilities/u);
  assert.match(serialized, /repository source/u);
  assert.match(serialized, /epoch-community/u);
  assert.match(serialized, /runtime/u);
  assert.match(serialized, /node20/u);
  assert.match(serialized, /agent sandbox/u);
  assert.match(serialized, /patch-region-widget/u);
  assert.match(serialized, /visually validated operations dashboard/u);
}
