import assert from "node:assert/strict";
import {
  createCommunityOperationsWebApp,
  renderCommunityOperationsDocument,
} from "@epoch/community-operations-web";
import { createInMemoryPlatformCore } from "@epoch/platform-core";
import { EpochPlatformSdk } from "@epoch/platform-sdk";

// Render smoke test for the Community Operations surface: the ops document must
// inline the shared @epoch/design-tokens :root block and alias every --ops-* token
// onto it (ADR-0010) — the pre-token near-miss literals must never come back.
export async function runCommunityOperationsWebTests(): Promise<void> {
  const sdk = new EpochPlatformSdk(createInMemoryPlatformCore({ communityEnabled: true }));
  const organization = sdk.organizations.create({ slug: "epoch", displayName: "Epoch" });
  const project = sdk.projects.create({
    organizationId: organization.id,
    slug: "community",
    displayName: "Epoch Community",
  });
  sdk.repositories.create({
    projectId: project.id,
    slug: "epoch-community",
    visibility: "public",
  });

  const app = await createCommunityOperationsWebApp({
    platform: sdk,
    projectId: project.id,
  });
  const html = renderCommunityOperationsDocument(app);

  opsDocumentInlinesEpochTokens(html);
  opsTokensAliasEpochTokens(html);
  opsDocumentCarriesNoDriftedPalette(html);
  opsKeySurfacesRender(html);
  emptyModerationQueueInvitesRatherThanLies(html);
  await moderationQueueSurfacesCommunityReports(sdk, project.id);
}

function emptyModerationQueueInvitesRatherThanLies(html: string): void {
  assert.match(html, /id="moderation"/u);
  assert.match(html, /No moderation reports/u);
  // With nothing open there is no count to show — an empty queue must not
  // manufacture urgency.
  assert.ok(!html.includes("data-moderation-open>"), "empty queue must not render an open count");
}

async function moderationQueueSurfacesCommunityReports(
  sdk: EpochPlatformSdk,
  projectId: string,
): Promise<void> {
  // Report actions open a moderation-labelled record in the community; the ops
  // queue must be derived from those same signed records.
  const app = await createCommunityOperationsWebApp({
    platform: sdk,
    projectId,
    communityRepositories: [{
      slug: "epoch/epoch",
      issues: [
        { id: "MOD-1", title: "Moderation: heated thread in #general", author: "maya", status: "open", labels: ["governance", "moderation"] },
        { id: "MOD-2", title: "Moderation: resolved spam report", author: "lea", status: "closed", labels: ["moderation"] },
        { id: "IDEA-9", title: "Not a moderation record", author: "ren", status: "open", labels: ["idea"] },
      ],
    }],
  });

  assert.equal(app.moderationReports.length, 2, "only moderation-labelled records join the queue");
  assert.equal(app.moderationReports[0]?.id, "MOD-1", "open reports sort ahead of closed ones");
  assert.equal(app.moderationReports[0]?.open, true);
  assert.equal(app.moderationReports[1]?.open, false);

  const html = renderCommunityOperationsDocument(app);
  assert.match(html, /Moderation: heated thread in #general/u);
  assert.match(html, /data-moderation-report="MOD-1"/u);
  assert.match(html, /data-moderation-open="true"/u);
  assert.match(html, /1 open/u);
  assert.match(html, /open · needs a decision/u);
  assert.match(html, /href="\/community\/c\/governance"/u);
  assert.ok(!html.includes("IDEA-9"), "non-moderation issues must not leak into the queue");
}

function opsDocumentInlinesEpochTokens(html: string): void {
  assert.match(html, /--epoch-color-ink: #0f1614;/u);
  assert.match(html, /--epoch-color-teal: #2a6f6c;/u);
  assert.match(html, /--epoch-color-accent: #b4532f;/u);
  assert.match(html, /--epoch-type-display-size: 2\.5rem;/u);
}

function opsTokensAliasEpochTokens(html: string): void {
  assert.match(html, /--ops-surface: var\(--epoch-color-surface\);/u);
  assert.match(html, /--ops-accent: var\(--epoch-color-teal\);/u);
  assert.match(html, /--ops-action: var\(--epoch-color-accent\);/u);
  assert.match(html, /--ops-radius: var\(--epoch-radius-md\);/u);
}

function opsDocumentCarriesNoDriftedPalette(html: string): void {
  // The retired near-miss copies of teal and accent (see token-conformance audit).
  assert.ok(!html.includes("#2f7370"), "ops must not re-introduce the drifted teal #2f7370");
  assert.ok(!html.includes("#ba5e3f"), "ops must not re-introduce the drifted accent #ba5e3f");
}

function opsKeySurfacesRender(html: string): void {
  assert.match(html, /<h1>Epoch Community Operations<\/h1>/u);
  assert.match(html, /id="workspaces"/u);
  assert.match(html, /id="workflows"/u);
  assert.match(html, /id="sandboxes"/u);
  assert.match(html, /id="runners"/u);
  assert.match(html, /id="activity"/u);
  assert.match(html, /class="skip-link"/u);
}
