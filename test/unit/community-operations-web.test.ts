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
