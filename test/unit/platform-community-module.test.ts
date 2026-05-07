import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFileSystemPlatformCore, PlatformError } from "@epoch/platform-core";
import { EpochPlatformCommunity } from "@epoch/platform-community";
import { EpochPlatformSdk } from "@epoch/platform-sdk";

export function runPlatformCommunityModuleTests(): void {
  const workspace = mkdtempSync(join(tmpdir(), "epoch-platform-community-"));
  const restoreWorkspace = mkdtempSync(join(tmpdir(), "epoch-platform-community-restore-"));

  try {
    const sdk = new EpochPlatformSdk(createFileSystemPlatformCore({ dataDir: workspace, communityEnabled: false }));
    const community = new EpochPlatformCommunity(sdk);
    assert.equal(community.status().enabled, false);
    assert.equal(community.status().workerStatus.enabled, false);
    assert.throws(
      () => community.profiles.create({ handle: "alice", displayName: "Alice", visibility: "public" }),
      (error) => error instanceof PlatformError && error.code === "feature_disabled",
    );

    const organization = sdk.organizations.create({ slug: "acme", displayName: "Acme" });
    const project = sdk.projects.create({ organizationId: organization.id, slug: "platform", displayName: "Platform" });
    sdk.repositories.create({ projectId: project.id, slug: "private-api", visibility: "private" });
    const maintainerUser = sdk.identity.createUser({ handle: "maintainer", displayName: "Maintainer" });
    const maintainerTeam = sdk.identity.createTeam({ organizationId: organization.id, name: "maintainers" });
    sdk.identity.addUserToTeam({ userId: maintainerUser.id, teamId: maintainerTeam.id });
    sdk.identity.grantTeamRole({
      teamId: maintainerTeam.id,
      role: "community-maintainer",
      resourceType: "project",
      resourceId: project.id,
    });

    community.enable({ reviewedBy: "admin", visibilityPolicy: "public profiles and approved project showcases" });
    assert.equal(community.status().enabled, true);
    assert.equal(community.status().visibilityPolicy?.reviewedBy, "admin");

    assert.throws(
      () => community.projects.publish({ projectId: project.id, publicSlug: "epoch-platform", summary: "Self-host Epoch", requestedBy: "visitor" }),
      (error) => error instanceof PlatformError && error.code === "permission_denied",
    );

    const pendingProject = community.projects.publish({
      projectId: project.id,
      publicSlug: "epoch-platform",
      summary: "Self-host Epoch",
      requestedBy: "maintainer",
      readme: "Enterprise-ready self-hosted forge and deployment platform.",
      deployStatusBadge: "healthy",
      contributionPrompt: "Start with a good first issue.",
    });
    assert.equal(pendingProject.moderationState, "pending_review");
    assert.equal(community.projects.search({ query: "epoch" }).length, 0);

    const profile = community.profiles.create({
      userId: maintainerUser.id,
      handle: "alice",
      displayName: "Alice",
      bio: "Maintains self-hosted platform templates.",
      links: ["https://example.test/alice"],
      avatarRef: "avatars/alice.png",
      visibility: "public",
    });

    assert.throws(
      () => community.projects.star({ communityProjectId: pendingProject.id, profileId: profile.id }),
      (error) => error instanceof PlatformError && error.code === "visibility_denied",
    );

    const approvedProject = community.projects.approve(pendingProject.id, { moderator: "mod" });
    community.projects.addTopic(approvedProject.id, { topic: "self-hosting" });
    community.projects.addShowcaseAsset(approvedProject.id, { asset: "logo.png" });
    community.projects.publishRelease(approvedProject.id, { version: "v1.0.0" });
    community.projects.follow({ communityProjectId: approvedProject.id, profileId: profile.id });
    community.projects.star({ communityProjectId: approvedProject.id, profileId: profile.id });
    community.projects.bookmark({ communityProjectId: approvedProject.id, profileId: profile.id });
    const discussion = community.discussions.open({
      communityProjectId: approvedProject.id,
      profileId: profile.id,
      title: "Roadmap",
      body: "How should deploy previews work?",
      visibility: "public",
    });
    community.profiles.recordContribution({ communityProjectId: approvedProject.id, profileId: profile.id, narrative: "Published the production deployment template." });

    const publicPage = community.projects.getPageBySlug("epoch-platform");
    assert.equal(publicPage.readme?.includes("self-hosted forge"), true);
    assert.equal(publicPage.deployStatusBadge, "healthy");
    assert.equal(publicPage.contributionPrompt, "Start with a good first issue.");
    assert.equal(publicPage.bookmarksCount, 1);
    assert.equal(publicPage.discussionsCount, 1);
    assert.equal(JSON.stringify(publicPage).includes("private-api"), false);
    assert.equal(community.projects.search({ query: "self-hosting" }).at(0)?.publicSlug, "epoch-platform");
    assert.equal(community.profiles.get(profile.id).reputation, 10);

    const feed = community.feed.personalized({ profileId: profile.id });
    assert.ok(feed.some((event: { verb: string; objectId?: string }) => event.verb === "discussion.opened" && event.objectId === discussion.id));
    assert.ok(feed.every((event: { visibility: string }) => event.visibility === "public"));

    const report = community.moderation.reportDiscussion({ discussionId: discussion.id, reason: "possible spam" });
    assert.equal(report.triage?.severity, "medium");
    assert.equal(community.moderation.queue().at(0)?.triage?.summary.includes("possible spam"), true);
    community.moderation.takeDownDiscussion(discussion.id, { moderator: "mod", reason: "abuse" });
    community.profiles.block({ profileId: profile.id, blockedProfileId: "profile_mod" });
    const legalHold = community.moderation.exportLegalHold({ communityProjectId: approvedProject.id });
    assert.ok(legalHold.discussions.some((item: { title: string; moderationState: string }) => item.title === "Roadmap" && item.moderationState === "taken_down"));

    const backup = sdk.backups.verify(sdk.backups.start({ name: "community" }).id);
    assert.ok(backup.artifactPath && existsSync(backup.artifactPath));
    const restoredSdk = new EpochPlatformSdk(createFileSystemPlatformCore({
      dataDir: restoreWorkspace,
      restoreFromBackupArtifact: backup.artifactPath,
    }));
    const restoredCommunity = new EpochPlatformCommunity(restoredSdk);
    assert.equal(restoredCommunity.projects.getPageBySlug("epoch-platform").bookmarksCount, 1);
    assert.equal(restoredCommunity.feed.personalized({ profileId: profile.id }).some((event: { verb: string }) => event.verb === "discussion.opened"), true);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
    rmSync(restoreWorkspace, { recursive: true, force: true });
  }
}
