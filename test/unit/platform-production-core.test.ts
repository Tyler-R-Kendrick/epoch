import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFileSystemPlatformCore, PlatformError, signWebhookPayload } from "@epoch/platform-core";
import { EpochPlatformSdk } from "@epoch/platform-sdk";

export function runPlatformProductionCoreTests(): void {
  const workspace = mkdtempSync(join(tmpdir(), "epoch-platform-core-"));
  const restoreWorkspace = mkdtempSync(join(tmpdir(), "epoch-platform-restore-"));

  try {
    const firstSdk = new EpochPlatformSdk(createFileSystemPlatformCore({ dataDir: workspace, communityEnabled: false }));
    const organization = firstSdk.organizations.create({ slug: "acme", displayName: "Acme" });
    const project = firstSdk.projects.create({ organizationId: organization.id, slug: "platform", displayName: "Platform" });
    const repository = firstSdk.repositories.create({ projectId: project.id, slug: "api", visibility: "private" });
    const environment = firstSdk.environments.create({ projectId: project.id, name: "production", type: "production", protected: true });
    firstSdk.secrets.create({ environmentId: environment.id, name: "DATABASE_URL", value: "postgres://prod-secret" });
    firstSdk.api.registerWebhookEndpoint({ name: "ops", secret: "whsec" });

    const statePath = join(workspace, "platform-state.json");
    assert.equal(existsSync(statePath), true);
    const stateFile = readFileSync(statePath, "utf8");
    assert.equal(stateFile.includes("postgres://prod-secret"), false);
    const stateEnvelope = JSON.parse(stateFile) as { manifestHash?: string; snapshot?: unknown };
    assert.ok(stateEnvelope.manifestHash?.startsWith("sha256:"));
    assert.ok(stateEnvelope.snapshot);

    const secondSdk = new EpochPlatformSdk(createFileSystemPlatformCore({ dataDir: workspace }));
    assert.ok(secondSdk.projects.overview(project.id).repositories.some((item) => item.slug === "api"));
    assert.equal(secondSdk.secrets.findByName("DATABASE_URL").name, "DATABASE_URL");

    const payload = JSON.stringify({ event: "deployment.executed", repository: repository.id });
    const signature = signWebhookPayload("whsec", payload);
    assert.equal(secondSdk.api.verifyWebhook({ endpointName: "ops", payload, signature }), true);
    assert.equal(secondSdk.api.verifyWebhook({ endpointName: "ops", payload: `${payload} `, signature }), false);

    const backup = secondSdk.backups.start({ name: "nightly" });
    const verifiedBackup = secondSdk.backups.verify(backup.id);
    assert.equal(verifiedBackup.verificationStatus, "verified");
    assert.ok(verifiedBackup.artifactPath);
    assert.equal(existsSync(verifiedBackup.artifactPath), true);
    assert.ok(verifiedBackup.manifestHash?.startsWith("sha256:"));
    const backupArtifact = JSON.parse(readFileSync(verifiedBackup.artifactPath, "utf8")) as {
      manifest: { createdAt: string };
    };
    assert.notEqual(backupArtifact.manifest.createdAt, new Date(0).toISOString());
    assert.equal(Number.isNaN(Date.parse(backupArtifact.manifest.createdAt)), false);

    const restoredSdk = new EpochPlatformSdk(createFileSystemPlatformCore({
      dataDir: restoreWorkspace,
      restoreFromBackupArtifact: verifiedBackup.artifactPath,
    }));
    assert.ok(restoredSdk.projects.overview(project.id).repositories.some((item) => item.slug === "api"));
    assert.equal(restoredSdk.secrets.findByName("DATABASE_URL").name, "DATABASE_URL");

    stateEnvelope.manifestHash = "sha256:tampered";
    writeFileSync(statePath, JSON.stringify(stateEnvelope), "utf8");
    assert.throws(
      () => createFileSystemPlatformCore({ dataDir: workspace }),
      (error) => error instanceof PlatformError && error.code === "state_verification_failed",
    );
  } finally {
    rmSync(workspace, { recursive: true, force: true });
    rmSync(restoreWorkspace, { recursive: true, force: true });
  }
}
