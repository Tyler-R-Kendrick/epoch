import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInMemoryCommunityApi } from "@epoch/community-api";
import {
  buildCommunityFeed,
  buildCommunitySpaces,
  buildDevFeed,
  channelForIssue,
  createCommunityWebApp,
  filterDevFeedItems,
  materializeCommunityWebSiteWithEpoch,
  renderCommunityWebDocument,
} from "@epoch/community-web";

interface VercelConfig {
  readonly installCommand?: string;
  readonly buildCommand?: string;
  readonly outputDirectory?: string;
  readonly rewrites?: readonly {
    readonly source: string;
    readonly destination: string;
  }[];
}

export async function runCommunityWebVercelTests(): Promise<void> {
  vercelConfigBuildsTheCommunityWebOutput();
  communityFeedHelpersPreferApiActivityAndLabelSnapshotFallback();
  communityDevFeedBuildsVerbLedNetworkTimeline();
  await communityWebMaterializesTheSiteThroughEpochHistory();
  await communityWebHtmlIncludesLiveChannelExperience();
  await communityWebSnapshotModeLabelsHonestyAndDisablesLiveIntentCopy();
  renderScriptProducesDeployableCommunityHtml();
}

function communityDevFeedBuildsVerbLedNetworkTimeline(): void {
  const repos = [{
    slug: "epoch/epoch",
    displayName: "Epoch",
    description: "Event-driven DVCS",
    visibility: "public" as const,
    defaultView: "main",
    maintainers: ["maya"],
    topics: [],
    issues: [{
      id: "IDEA-3",
      title: "Dashboard widget should group revenue by region",
      author: "nora",
      body: "Region breakdown idea",
      labels: ["idea"],
      status: "open" as const,
      comments: [],
    }],
    changeProposals: [],
    discussions: [],
  }];
  const spaces = buildCommunitySpaces(repos);
  assert.ok(spaces.length >= 2);
  assert.ok(spaces[0]?.channels.some((channel) => channel.id === "general"));
  assert.ok(spaces[0]?.channels.some((channel) => channel.id === "showcase"));
  assert.ok((spaces[0]?.linkedRepos.length ?? 0) >= 1);

  const devFeed = buildDevFeed({
    repositories: repos,
    apiConnected: true,
  });
  assert.ok(devFeed.items.length > 0);
  assert.ok(devFeed.items.some((item) => item.kind === "star"));
  assert.ok(devFeed.items.some((item) => item.kind === "follow"));
  assert.ok(devFeed.items.some((item) => item.kind === "issue_open" && item.actor.handle === "nora"));
  const following = filterDevFeedItems(devFeed.items, "following");
  const contributions = filterDevFeedItems(devFeed.items, "contributions");
  assert.ok(following.length > 0);
  assert.ok(contributions.every((item) => item.tabs.includes("contributions")));

  const feed = buildCommunityFeed({ repositories: repos, apiConnected: true });
  assert.ok(feed.conversations.some((item) => item.channel === "general" && item.communityId === "epoch-civic"));
}

function communityFeedHelpersPreferApiActivityAndLabelSnapshotFallback(): void {
  assert.equal(channelForIssue(["idea"]), "ideas");
  assert.equal(channelForIssue(["bug", "a11y"]), "bugs");
  assert.equal(channelForIssue(["help"]), "support");
  assert.equal(channelForIssue(["agent"]), "agent-runs");

  const emptyFeed = buildCommunityFeed({
    repositories: [{
      slug: "epoch/epoch",
      displayName: "Epoch",
      description: "Event-driven DVCS",
      visibility: "public",
      defaultView: "main",
      maintainers: ["maya"],
      topics: [],
      issues: [],
      changeProposals: [],
      discussions: [],
    }],
    apiConnected: true,
  });
  assert.equal(emptyFeed.source, "snapshot");
  assert.ok(emptyFeed.conversations.some((item) => item.title.includes("Dashboard widget")));
  assert.ok(emptyFeed.conversations.every((item) => item.source === "snapshot"));

  const liveFeed = buildCommunityFeed({
    repositories: [{
      slug: "epoch/epoch",
      displayName: "Epoch",
      description: "Event-driven DVCS",
      visibility: "public",
      defaultView: "main",
      maintainers: ["maya"],
      topics: [],
      issues: [{
        id: "IDEA-3",
        title: "Dashboard widget should group revenue by region",
        author: "nora",
        body: "Region breakdown idea",
        labels: ["idea"],
        status: "open",
        comments: [],
      }, {
        id: "BUG-17",
        title: "Preview keyboard focus skips the chart setting",
        author: "ren",
        body: "Tab order bug",
        labels: ["bug"],
        status: "open",
        comments: [],
      }],
      changeProposals: [{
        id: "CHANGE-12",
        title: "Keep preview cards attached to conversation state",
        author: "maya",
        body: "Attach previews",
        sourceView: "maya/preview-card-thread",
        targetView: "main",
        status: "open",
        reviews: [],
      }],
      discussions: [],
    }],
    apiConnected: true,
  });
  assert.equal(liveFeed.source, "api");
  assert.equal(liveFeed.issues.length, 2);
  assert.equal(liveFeed.changes.length, 1);
  assert.ok(liveFeed.conversations.every((item) => item.source === "api"));
  assert.ok(liveFeed.conversations.some((item) => item.channel === "ideas" && item.id === "issue-IDEA-3"));
  assert.ok(liveFeed.conversations.some((item) => item.channel === "bugs" && item.id === "issue-BUG-17"));
  assert.ok(liveFeed.conversations.some((item) => item.channel === "previews" && item.linkedProposalId === "CHANGE-12"));
  assert.equal(
    liveFeed.conversations.some((item) => item.id === "agent-preview-copy"),
    false,
    "live API feed must not mix hard-coded snapshot demos",
  );

  const offlineFeed = buildCommunityFeed({
    repositories: liveFeed.issues.length > 0
      ? [{
        slug: "epoch/epoch",
        displayName: "Epoch",
        description: "Event-driven DVCS",
        visibility: "public",
        defaultView: "main",
        maintainers: ["maya"],
        topics: [],
        issues: [],
        changeProposals: [],
        discussions: [],
      }]
      : [],
    apiConnected: false,
  });
  assert.equal(offlineFeed.source, "snapshot");
}

function vercelConfigBuildsTheCommunityWebOutput(): void {
  const config = JSON.parse(readFileSync("vercel.json", "utf8")) as VercelConfig;

  assert.equal(config.installCommand, "npm install");
  assert.equal(config.buildCommand, "npm run build && npm run vercel:community-web");
  assert.equal(config.outputDirectory, "packages/Epoch.Community.Web/.vercel-output");
  assert.deepEqual(config.rewrites?.map((rewrite) => rewrite.source), [
    "/",
    "/community/(.*)",
    "/healthz",
  ]);
}

function renderScriptProducesDeployableCommunityHtml(): void {
  const outputDirectory = mkdtempSync(join(tmpdir(), "epoch-community-web-"));

  execFileSync(process.execPath, [
    "scripts/render-community-web.mjs",
    "--output",
    outputDirectory,
  ], { stdio: "pipe" });

  const html = readFileSync(join(outputDirectory, "community", "index.html"), "utf8");
  assert.match(html, /<h1 id="community-title">Epoch Civic Workshop<\/h1>/u);
  assert.match(html, /epoch\/epoch/u);
  assert.match(html, /This site is built with Epoch/u);
  assert.match(html, /data-community-channel-rail/u);
  assert.match(html, /data-product-mode="community"/u);
  assert.match(html, /data-community-list/u);
  assert.match(html, /data-channel="general"/u);
  assert.match(html, /data-open-community="agent-guild"/u);
  assert.match(html, /data-product-mode="network"/u);
  assert.match(html, /data-dev-feed/u);
  assert.match(html, /data-message-feed/u);
  assert.match(html, /Dashboard widget should group revenue by region/u);
  assert.match(html, /Welcome to Epoch Civic Workshop/u);
  assert.match(html, /data-feed-source="snapshot"/u);
  assert.match(html, /data-api-unconfigured/u);
  assert.match(html, /data-surface="issues"/u);
  assert.match(html, /data-surface="changes"/u);
  assert.ok(existsSync(join(outputDirectory, "community", "epoch-repository.json")));
  assert.match(html, /data-design-system="epoch-community"/u);
  assert.match(html, /href="#community-content">Skip to content/u);
  assert.match(html, /--epoch-color-surface: #f3f6f4/u);
  assert.doesNotMatch(html, /data-community-web-cockpit/u);
  assert.doesNotMatch(html, /data-community-thread-context/u);
  assert.equal(readFileSync(join(outputDirectory, "healthz"), "utf8"), "ok\n");
}

async function communityWebHtmlIncludesLiveChannelExperience(): Promise<void> {
  const api = createInMemoryCommunityApi({
    repositories: [{
      slug: "epoch/epoch",
      displayName: "Epoch",
      description: "Event-driven DVCS",
      maintainers: ["alice"],
    }],
  });
  await api.openIssue("epoch/epoch", {
    id: "IDEA-3",
    title: "Dashboard widget should group revenue by region",
    author: "nora",
    body: "Region breakdown idea",
    labels: ["idea"],
  });
  await api.openIssue("epoch/epoch", {
    id: "BUG-17",
    title: "Preview keyboard focus skips the chart setting",
    author: "ren",
    body: "Tab order bug",
    labels: ["bug"],
  });
  await api.proposeChange("epoch/epoch", {
    id: "CHANGE-12",
    title: "Keep preview cards attached to conversation state",
    author: "maya",
    body: "Attach previews",
    sourceView: "maya/preview-card-thread",
    targetView: "main",
  });

  const app = await createCommunityWebApp({
    client: api,
    apiBaseUrl: "https://community.test",
  });
  const html = renderCommunityWebDocument(app);

  assert.match(html, /data-community-web-shell/u);
  assert.match(html, /data-api-state="connected"/u);
  assert.match(html, /data-product-mode="community"/u);
  assert.match(html, /data-community-list/u);
  assert.match(html, /data-channel="general"/u);
  assert.match(html, /data-dev-feed/u);
  assert.match(html, /data-feed-source="api"/u);
  assert.match(html, /"apiBaseUrl":"https:\/\/community\.test"/u);
  assert.match(html, /data-action="intent"/u);
  assert.match(html, /data-action="agent"/u);
  assert.match(html, /data-action="report"/u);
  assert.match(html, /state\.apiBaseUrl/u);
  assert.match(html, /refreshRepository/u);
  assert.match(html, /commentOnIssue|\/comments/u);
  assert.match(html, /Live API unavailable\. Intent promotion is disabled in snapshot mode\./u);
  assert.match(html, /data-surface="issues"/u);
  assert.match(html, /data-surface="changes"/u);
  assert.match(html, /data-issue-id="IDEA-3"/u);
  assert.match(html, /data-change-id="CHANGE-12"/u);
  assert.match(html, /data-message-id="issue-IDEA-3"/u);
  assert.doesNotMatch(html, /data-message-id="agent-preview-copy"/u);
  assert.match(html, /handleComposerSubmit/u);
  assert.match(html, /postChange|postIssue/u);
}

async function communityWebSnapshotModeLabelsHonestyAndDisablesLiveIntentCopy(): Promise<void> {
  const app = await createCommunityWebApp({
    client: createInMemoryCommunityApi({
      repositories: [{
        slug: "epoch/epoch",
        displayName: "Epoch",
        description: "Event-driven DVCS",
        maintainers: ["alice"],
      }],
    }),
  });
  const html = renderCommunityWebDocument(app);

  assert.match(html, /data-api-state="offline"/u);
  assert.match(html, /data-product-mode="community"/u);
  assert.match(html, /data-feed-source="snapshot"/u);
  assert.match(html, /data-api-unconfigured/u);
  assert.match(html, /data-feed-honesty="snapshot"/u);
  assert.match(html, /Snapshot communities|channels belong to the community/u);
  assert.match(html, /data-snapshot-badge/u);
  assert.match(html, /Dashboard widget should group revenue by region/u);
  assert.match(html, /Welcome to Epoch Civic Workshop/u);
  assert.match(html, /atproto:snapshot|community:snapshot/u);
}

async function communityWebMaterializesTheSiteThroughEpochHistory(): Promise<void> {
  const workspace = mkdtempSync(join(tmpdir(), "epoch-community-dogfood-"));
  const outputDirectory = join(workspace, "deploy");
  const app = await createCommunityWebApp({
    client: createInMemoryCommunityApi({
      repositories: [{
        slug: "epoch/epoch",
        displayName: "Epoch",
        description: "Event-driven DVCS",
        maintainers: ["alice"],
      }],
    }),
  });

  const result = materializeCommunityWebSiteWithEpoch(app, {
    repositoryRoot: join(workspace, "site-repository"),
    outputDirectory,
  });

  assert.equal(result.history.verifyProblems.length, 0);
  assert.equal(result.history.currentView, "main");
  assert.equal(result.history.latestVersion.name, "community-site-dogfooded");
  assert.ok(result.history.views.includes("site/community-web-dogfood"));
  assert.ok(result.history.eventTypes.includes("record"));
  assert.ok(result.history.eventTypes.includes("view-definition"));
  assert.ok(result.history.eventTypes.includes("approval"));
  assert.ok(result.history.eventTypes.includes("rollback"));
  assert.ok(result.history.eventTypes.includes("version"));
  assert.ok(result.materializedFiles.includes("community/index.html"));
  assert.ok(result.materializedFiles.includes("community/epoch-site-history.json"));

  const html = readFileSync(join(outputDirectory, "community", "index.html"), "utf8");
  assert.match(html, /This site is built with Epoch/u);
  assert.match(html, /Branchable site changes/u);
  assert.match(html, /Rollback target/u);

  const manifest = JSON.parse(readFileSync(join(outputDirectory, "epoch-version.json"), "utf8")) as {
    readonly name: string;
    readonly files: readonly { readonly path: string }[];
  };
  assert.equal(manifest.name, "community-site-dogfooded");
  assert.ok(manifest.files.some((file) => file.path === "community/index.html"));

  const repositoryExport = JSON.parse(readFileSync(join(outputDirectory, "community", "epoch-repository.json"), "utf8")) as {
    readonly events: readonly unknown[];
    readonly heads: readonly string[];
  };
  assert.ok(repositoryExport.events.length >= 7);
  assert.ok(repositoryExport.heads.length > 0);
}
