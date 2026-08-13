import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  createCommunityClient,
} from "@epoch/community-core";
import {
  createInMemoryCommunityApi,
} from "@epoch/community-api";
import { main as communityCliMain } from "@epoch/community-cli";
import { createCommunityWebApp } from "@epoch/community-web";
import { createPlatformWebApp } from "@epoch/platform-web";

export async function runPlatformBoundaryTests(): Promise<void> {
  await webTreatsCommunityAsADeployableAppWithoutOwningCommunityWorkflows();
  await communityOwnsRepositoryCollaborationWorkflowsThroughCore();
  await communityCliUsesCoreClient();
  communityPackagesHaveTheExpectedDependencyDirection();
  compiledTestsImportCommunityCoreFromThePackage();
}

async function webTreatsCommunityAsADeployableAppWithoutOwningCommunityWorkflows(): Promise<void> {
  const client = createCommunityClient(createInMemoryCommunityApi({
    repositories: [{
      slug: "epoch/epoch",
      displayName: "Epoch",
      description: "Event-driven DVCS",
      maintainers: ["alice"],
      topics: ["dvcs", "crdt"],
    }],
  }));
  const community = await createCommunityWebApp({ client });
  const web = createPlatformWebApp({ deployableApps: [community.deploymentTarget] });

  assert.equal(web.project, "Epoch.Platform.Web");
  assert.equal(community.project, "Epoch.Community.Web");
  assert.ok(web.pwa.offlineShell);
  assert.ok(community.pwa.offlineShell);
  assert.ok(web.managedServices.some((service) => service.id === "epoch-community"));
  assert.ok(web.managedServices.every((service) => service.epochHostingOnly));
  assert.equal(web.communityWorkflows.length, 0);
  assert.ok(community.workflows.length >= 6);
  assert.ok(community.workflows.some((workflow) => workflow.id === "issue-tracking"));
  assert.ok(community.workflows.some((workflow) => workflow.id === "change-review"));
  assert.ok(community.workflows.length > web.managedServices.length);
  assert.deepEqual(community.repositories.map((repository) => repository.slug), ["epoch/epoch"]);
}

async function communityOwnsRepositoryCollaborationWorkflowsThroughCore(): Promise<void> {
  const client = createCommunityClient(createInMemoryCommunityApi());
  await client.createRepository({
    slug: "epoch/epoch",
    displayName: "Epoch",
    description: "Event-driven DVCS",
    maintainers: ["alice"],
    topics: ["dvcs", "crdt"],
  });

  await client.openIssue("epoch/epoch", {
    title: "Document platform split",
    author: "bob",
    labels: ["architecture"],
  });
  const created = await client.createChange("epoch/epoch", {
    title: "Separate Web and Community apps",
    author: "carol",
    sourceView: "carol/platform-split",
    targetView: "main",
  });
  const repository = await client.reviewChange("epoch/epoch", created.changes[0].id, {
    reviewer: "alice",
    decision: "approved",
    body: "The boundary is clear.",
  });

  assert.equal(repository.issues[0].status, "open");
  assert.equal(repository.changes[0].status, "approved");
  assert.deepEqual(repository.changes[0].reviews.map((review) => review.reviewer), ["alice"]);
}

async function communityCliUsesCoreClient(): Promise<void> {
  const client = createCommunityClient(createInMemoryCommunityApi({
    repositories: [{
      slug: "epoch/epoch",
      displayName: "Epoch",
      description: "Event-driven DVCS",
      maintainers: ["alice"],
    }],
  }));
  const stdout: string[] = [];
  const stderr: string[] = [];

  const exitCode = await communityCliMain(["repositories"], {
    stdout: (line) => stdout.push(line),
    stderr: (line) => stderr.push(line),
  }, { client });

  assert.equal(exitCode, 0);
  assert.deepEqual(stderr, []);
  assert.match(stdout.join("\n"), /epoch\/epoch/u);
}

function compiledTestsImportCommunityCoreFromThePackage(): void {
  const relativeCore = /from\s+["'](?:\.\.\/)+packages\/Epoch\.Community\.Core\/src\//;
  const offenders = files(join(process.cwd(), "test"))
    .filter((filePath) => filePath.endsWith(".ts") || filePath.endsWith(".js") || filePath.endsWith(".mjs"))
    .filter((filePath) => relativeCore.test(readFileSync(filePath, "utf8")));
  assert.deepEqual(
    offenders,
    [],
    "compiled tests must import @epoch/community-core; relative Core src emit is incomplete on CI: " + offenders.join(", "),
  );
}

function communityPackagesHaveTheExpectedDependencyDirection(): void {
  const repoRoot = process.cwd();
  assert.equal(existsSync(join(repoRoot, "packages", "Epoch.Platform" + ".Community")), false);
  assertPackageContains(join(repoRoot, "packages", "Epoch.Community.API"), "@epoch/community-core");
  assertPackageContains(join(repoRoot, "packages", "Epoch.Community.CLI"), "@epoch/community-core");
  assertPackageContains(join(repoRoot, "packages", "Epoch.Community.Web"), "@epoch/community-core");
  assertPackageDoesNotContain(join(repoRoot, "packages", "Epoch.Platform.Web"), "@epoch/community-web");
  assertPackageDoesNotContain(join(repoRoot, "packages", "Epoch.Platform.Web"), "@epoch/community-core");
  assertPackageDoesNotContain(join(repoRoot, "packages", "Epoch.Community.Core"), "@epoch/community-api");
  assertPackageDoesNotContain(join(repoRoot, "packages", "Epoch.Community.Core"), "@epoch/community-web");
  assertPackageDoesNotContain(join(repoRoot, "packages", "Epoch.Community.Core"), "@epoch/community-cli");
  assertPackageDoesNotContain(join(repoRoot, "packages", "Epoch.Community.API"), "@epoch/community-web");
  assertPackageDoesNotContain(join(repoRoot, "packages", "Epoch.Community.API"), "@epoch/community-cli");
  assertPackageDoesNotContain(join(repoRoot, "packages", "Epoch.Community.Web"), "@epoch/community-api");
  assertPackageDoesNotContain(join(repoRoot, "packages", "Epoch.Community.CLI"), "@epoch/community-api");
}

function assertPackageContains(packageRoot: string, requiredImport: string): void {
  assert.ok(
    files(packageRoot).some((filePath) => readFileSync(filePath, "utf8").includes(requiredImport)),
    `${packageRoot} must use ${requiredImport}`,
  );
}

function assertPackageDoesNotContain(packageRoot: string, forbiddenImport: string): void {
  for (const filePath of files(packageRoot)) {
    const contents = readFileSync(filePath, "utf8");
    assert.equal(
      contents.includes(forbiddenImport),
      false,
      `${filePath} must not import ${forbiddenImport}`,
    );
  }
}

function files(directory: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(directory)) {
    const absolute = join(directory, entry);
    const stats = statSync(absolute);
    if (stats.isDirectory()) {
      result.push(...files(absolute));
    } else {
      result.push(absolute);
    }
  }
  return result;
}
