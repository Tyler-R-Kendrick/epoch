import { copyFileSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { EntityType, EpochRepository, type Event } from "@epoch/core";
import type {
  CommunityClient,
  CommunityRepository,
  CommunityWorkflow,
  CommunityWorkflowId,
} from "@epoch/community-core";

export interface PwaAppDescriptor {
  readonly name: string;
  readonly shortName: string;
  readonly startUrl: string;
  readonly display: "standalone";
  readonly themeColor: string;
  readonly backgroundColor: string;
  readonly offlineShell: boolean;
}

export interface CommunityRoute {
  readonly id: string;
  readonly path: string;
  readonly label: string;
  readonly workflow: CommunityWorkflowId;
}

export interface CommunityNavigationItem {
  readonly label: string;
  readonly routeId: string;
}

export interface CommunityDeploymentTarget {
  readonly id: "epoch-community";
  readonly kind: "community-webapp";
  readonly displayName: "Epoch Community";
  readonly version: string;
  readonly image: string;
  readonly route: string;
  readonly healthPath: string;
  readonly ports: readonly number[];
  readonly environment: readonly string[];
  readonly requiredServices: readonly string[];
}

export interface CommunityWebAppDefinition {
  readonly project: "Epoch.Community.Web";
  readonly product: "epoch-community";
  readonly pwa: PwaAppDescriptor;
  readonly routes: readonly CommunityRoute[];
  readonly navigation: readonly CommunityNavigationItem[];
  readonly workflows: readonly CommunityWorkflow[];
  readonly repositories: readonly CommunityRepository[];
  readonly deploymentTarget: CommunityDeploymentTarget;
  readonly apiBaseUrl?: string;
  readonly siteHistory?: CommunitySiteEpochHistory;
}

export interface CreateCommunityWebAppOptions {
  readonly client: CommunityClient;
  readonly basePath?: string;
  readonly apiBaseUrl?: string;
  readonly version?: string;
  readonly image?: string;
}

export interface CommunitySiteEpochOperation {
  readonly label: string;
  readonly eventId: string;
  readonly eventType: string;
  readonly view?: string;
  readonly version?: string;
  readonly target?: string;
}

export interface CommunitySiteEpochVersionSummary {
  readonly id: string;
  readonly name: string;
  readonly view: string;
  readonly files: readonly string[];
}

export interface CommunitySiteEpochHistory {
  readonly repository: "EpochRepository";
  readonly author: string;
  readonly currentView: string;
  readonly views: readonly string[];
  readonly eventTypes: readonly string[];
  readonly operations: readonly CommunitySiteEpochOperation[];
  readonly latestVersion: CommunitySiteEpochVersionSummary;
  readonly rollbackTarget: {
    readonly eventId: string;
    readonly versionId: string;
    readonly reason: string;
  };
  readonly verifyProblems: readonly string[];
}

export interface MaterializeCommunityWebSiteWithEpochOptions {
  readonly repositoryRoot: string;
  readonly outputDirectory: string;
  readonly author?: string;
  readonly draftView?: string;
  readonly initialVersionName?: string;
  readonly releaseVersionName?: string;
}

export interface MaterializedCommunityWebSite {
  readonly app: CommunityWebAppDefinition;
  readonly history: CommunitySiteEpochHistory;
  readonly outputDirectory: string;
  readonly materializedFiles: readonly string[];
  readonly manifestPath: string;
}

export async function createCommunityWebApp(
  options: CreateCommunityWebAppOptions,
): Promise<CommunityWebAppDefinition> {
  const basePath = normalizedBasePath(options.basePath ?? "/community");
  const workflows = await options.client.listWorkflows();
  const repositories = await options.client.listRepositories();
  const routes = createCommunityRoutes(basePath, workflows);

  return {
    project: "Epoch.Community.Web",
    product: "epoch-community",
    pwa: {
      name: "Epoch Community",
      shortName: "Epoch Community",
      startUrl: basePath,
      display: "standalone",
      themeColor: "#17221f",
      backgroundColor: "#eef3f1",
      offlineShell: true,
    },
    routes,
    navigation: routes.map((route) => ({ label: route.label, routeId: route.id })),
    workflows,
    repositories,
    deploymentTarget: createCommunityDeploymentTarget({
      basePath,
      version: options.version,
      image: options.image,
    }),
    apiBaseUrl: options.apiBaseUrl,
  };
}

export function createCommunityDeploymentTarget(options: {
  readonly basePath?: string;
  readonly version?: string;
  readonly image?: string;
} = {}): CommunityDeploymentTarget {
  return {
    id: "epoch-community",
    kind: "community-webapp",
    displayName: "Epoch Community",
    version: options.version ?? "0.1.0",
    image: options.image ?? "ghcr.io/epoch/community-web:0.1.0",
    route: normalizedBasePath(options.basePath ?? "/community"),
    healthPath: "/healthz",
    ports: [8080],
    environment: [
      "EPOCH_COMMUNITY_API_URL",
      "EPOCH_COMMUNITY_BASE_URL",
      "EPOCH_SIGNING_KEY_REF",
    ],
    requiredServices: [
      "epoch-node",
      "epoch-object-store",
      "epoch-sync-seed",
      "epoch-community-api",
    ],
  };
}

export function renderCommunityWebDocument(app: CommunityWebAppDefinition): string {
  const feed = buildCommunityFeed({
    repositories: app.repositories,
    apiConnected: app.apiBaseUrl !== undefined,
  });
  const conversations = feed.conversations;
  const live = app.apiBaseUrl !== undefined;
  const snapshotMode = feed.source === "snapshot";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="${escapeHtml(app.pwa.themeColor)}">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(app.pwa.name)}</title>
  <style>
${communityStyles()}
  </style>
</head>
<body>
  <a class="skip-link" href="#community-content">Skip to content</a>
  <main id="epoch-community" data-design-system="epoch-community" data-community-web-shell data-api-state="${live ? "connected" : "offline"}" data-feed-source="${feed.source}">
    <aside class="channel-rail" data-community-channel-rail aria-label="Community channels">
      <a class="brand" href="${escapeHtml(app.pwa.startUrl)}" translate="no" aria-label="${escapeHtml(app.pwa.name)}">
        <span class="brand-mark" aria-hidden="true">EC</span>
        <span class="brand-text">
          <span class="brand-name">Epoch</span>
          <span class="brand-sub">epoch/epoch</span>
        </span>
      </a>
      <nav class="surface-list" aria-label="Repository surfaces">
        <button class="surface-button" type="button" data-surface="channels" aria-pressed="true">Channels</button>
        <button class="surface-button" type="button" data-surface="issues" aria-pressed="false">Issues <span class="channel-count">${feed.issues.length}</span></button>
        <button class="surface-button" type="button" data-surface="changes" aria-pressed="false">Changes <span class="channel-count">${feed.changes.length}</span></button>
      </nav>
      <nav class="channel-list" data-channel-list aria-label="Channels">
        ${communityChannels.map((channel) => renderChannelButton(channel, conversations)).join("")}
      </nav>
      <div class="rail-status" aria-live="polite">
        <span class="status-dot ${live && !snapshotMode ? "" : "status-dot-muted"}" aria-hidden="true"></span>
        <span data-connection-label>${live ? (snapshotMode ? "Live · empty" : "Live") : "Snapshot"}</span>
      </div>
    </aside>
    <section id="community-content" class="feed-shell" aria-labelledby="community-title">
      <header class="feed-header">
        <div class="feed-heading">
          <h1 id="community-title">${escapeHtml(app.pwa.name)}</h1>
          <p class="feed-repo">epoch/epoch</p>
        </div>
        <div class="repository-meta" aria-label="Repository state">
          ${renderRepositoryMeta(app, feed)}
        </div>
      </header>
      ${renderFeedHonestyBanner(live, snapshotMode)}
      <div class="feed-toolbar" aria-label="Current channel" data-channel-toolbar>
        <span class="channel-name" data-current-channel># ideas</span>
        <span class="channel-topic" data-current-topic>Shape product ideas into signed intents, previews, and reviewable patches.</span>
      </div>
      <div class="surface-stage" data-surface-panel="channels">
        <ol class="message-feed" data-message-feed aria-label="Community feed">
          ${conversations.map((conversation) => renderConversation(conversation)).join("")}
        </ol>
        <form class="composer" data-comment-composer aria-label="Write a community message">
          <label class="composer-label" for="community-message">Message #ideas</label>
          <textarea id="community-message" name="message" rows="2" placeholder="Write a message"></textarea>
          <div class="composer-row">
            <span data-composer-meta>Signed as @maya</span>
            <button type="submit">Send</button>
          </div>
        </form>
      </div>
      <div class="surface-stage" data-surface-panel="issues" hidden>
        <div class="feed-toolbar artifact-toolbar">
          <span class="channel-name">Issues</span>
          <span class="channel-topic">Open issues for this repository.</span>
        </div>
        <ol class="artifact-list" data-issue-list aria-label="Issue list">
          ${feed.issues.map(renderIssueListItem).join("") || emptyArtifactItem("No open issues in the connected repository.")}
        </ol>
      </div>
      <div class="surface-stage" data-surface-panel="changes" hidden>
        <div class="feed-toolbar artifact-toolbar">
          <span class="channel-name">Changes</span>
          <span class="channel-topic">Change proposals for this repository.</span>
        </div>
        <ol class="artifact-list" data-change-list aria-label="Change proposal list">
          ${feed.changes.map(renderChangeListItem).join("") || emptyArtifactItem("No change proposals yet. Promote a message with Mark intent.")}
        </ol>
      </div>
      ${app.siteHistory === undefined ? "" : renderSiteHistory(app.siteHistory)}
    </section>
  </main>
  <script type="application/json" id="epoch-community-state">${escapeScriptJson(JSON.stringify({
    apiBaseUrl: app.apiBaseUrl,
    repositories: app.repositories,
    conversations,
    feedSource: feed.source,
    issues: feed.issues,
    changes: feed.changes,
  }))}</script>
  <script>
${communityRuntime()}
  </script>
</body>
</html>`;
}

export function materializeCommunityWebSiteWithEpoch(
  app: CommunityWebAppDefinition,
  options: MaterializeCommunityWebSiteWithEpochOptions,
): MaterializedCommunityWebSite {
  const author = options.author ?? "epoch-community-web";
  const draftView = options.draftView ?? "site/community-web-dogfood";
  const initialVersionName = options.initialVersionName ?? "community-site-initial";
  const releaseVersionName = options.releaseVersionName ?? "community-site-dogfooded";
  const repository = EpochRepository.openOrCreate(options.repositoryRoot, { author });
  const operations: CommunitySiteEpochOperation[] = [];

  writeCommunitySiteFile(repository.root, renderCommunityWebDocument(withSiteHistory(app, undefined)));
  const initialRecord = repository.recordFile("community/index.html", EntityType.html, author);
  operations.push(operation("Record initial site shell", initialRecord));
  const initialVersion = repository.createVersion({
    name: initialVersionName,
    description: "Initial Community Web shell before dogfooding the site through Epoch.",
    author,
  });
  operations.push(operation("Version initial site shell", initialVersion, { version: initialVersionName }));

  const branch = repository.createView(draftView, { type: "all" }, "main", {
    description: "Branch Community Web site copy and generated history before release.",
  }, author);
  operations.push(operation("Branchable site changes", branch, { view: draftView }));
  repository.checkoutView(draftView);

  const draftHistory = summarizeSiteHistory(repository, {
    author,
    latestVersion: initialVersion,
    operations,
    rollbackTarget: {
      eventId: initialVersion.id,
      versionId: initialVersion.id,
      reason: "Initial site version can be materialized again as the rollback target.",
    },
  });
  writeCommunitySiteFile(repository.root, renderCommunityWebDocument(withSiteHistory(app, withPlannedRelease(draftHistory, releaseVersionName))));
  const draftRecord = repository.recordFile("community/index.html", EntityType.html, author);
  operations.push(operation("Record branched site change", draftRecord, { view: draftView }));
  const approval = repository.appendApproval(draftRecord.id, author);
  operations.push(operation("Approve site change", approval, { target: draftRecord.id }));
  const merge = repository.promoteToView(draftView, "main", author);
  operations.push(operation("Merge branch into main", merge, { view: "main" }));
  repository.checkoutView("main");

  const rollback = repository.rollback(initialVersion.id, "Rollback target for the previous Community Web site version.");
  operations.push(operation("Rollback target", rollback, { target: initialVersion.id, version: initialVersionName }));

  const preReleaseHistory = summarizeSiteHistory(repository, {
    author,
    latestVersion: initialVersion,
    operations,
    rollbackTarget: {
      eventId: rollback.id,
      versionId: initialVersion.id,
      reason: "Rollback target for the previous Community Web site version.",
    },
  });
  writeCommunitySiteHistory(repository.root, withPlannedRelease(preReleaseHistory, releaseVersionName));
  const historyRecord = repository.recordFile("community/epoch-site-history.json", EntityType.json, author);
  operations.push(operation("Record site history manifest", historyRecord));

  const releaseVersion = repository.createVersion({
    name: releaseVersionName,
    description: "Community Web site materialized from an Epoch branch and merge flow.",
    author,
  });
  operations.push(operation("Version dogfooded Community Web site", releaseVersion, { version: releaseVersionName }));

  const history = summarizeSiteHistory(repository, {
    author,
    latestVersion: releaseVersion,
    operations,
    rollbackTarget: {
      eventId: rollback.id,
      versionId: initialVersion.id,
      reason: "Rollback target for the previous Community Web site version.",
    },
  });

  const materialized = repository.materializeVersion(releaseVersionName, {
    outDir: ".epoch-community-web-materialized",
    force: true,
  });
  const materializedRoot = join(repository.root, ".epoch-community-web-materialized");
  copyDirectory(materializedRoot, options.outputDirectory);
  writeCommunityRepositoryExport(options.outputDirectory, repository, history);

  return {
    app: withSiteHistory(app, history),
    history,
    outputDirectory: options.outputDirectory,
    materializedFiles: materialized.files,
    manifestPath: join(options.outputDirectory, "epoch-version.json"),
  };
}

function createCommunityRoutes(
  basePath: string,
  workflows: readonly CommunityWorkflow[],
): readonly CommunityRoute[] {
  return workflows.map((workflow) => ({
    id: workflow.id,
    path: `${basePath}/${workflow.id}`,
    label: workflow.label,
    workflow: workflow.id,
  }));
}

function normalizedBasePath(path: string): string {
  const prefixed = path.startsWith("/") ? path : `/${path}`;
  return prefixed.endsWith("/") && prefixed.length > 1 ? prefixed.slice(0, -1) : prefixed;
}

export type CommunityChannelId = "support" | "ideas" | "bugs" | "agent-runs" | "previews" | "governance";
export type CommunityFeedSource = "api" | "snapshot";

interface CommunityChannel {
  readonly id: CommunityChannelId;
  readonly label: string;
  readonly topic: string;
}

export interface CommunityConversationView {
  readonly id: string;
  readonly channel: CommunityChannelId;
  readonly repositorySlug: string;
  readonly author: string;
  readonly role: string;
  readonly title: string;
  readonly body: string;
  readonly time: string;
  readonly anchor: string;
  readonly signature: string;
  readonly visibility: string;
  readonly state: string;
  readonly reactions: readonly string[];
  readonly linkedArtifact?: string;
  readonly linkedProposalId?: string;
  readonly source: CommunityFeedSource;
}

export interface CommunityFeedIssueItem {
  readonly id: string;
  readonly title: string;
  readonly author: string;
  readonly status: string;
  readonly labels: readonly string[];
  readonly repositorySlug: string;
  readonly channel: CommunityChannelId;
}

export interface CommunityFeedChangeItem {
  readonly id: string;
  readonly title: string;
  readonly author: string;
  readonly status: string;
  readonly sourceView: string;
  readonly targetView: string;
  readonly repositorySlug: string;
}

export interface CommunityFeedBuildResult {
  readonly source: CommunityFeedSource;
  readonly conversations: readonly CommunityConversationView[];
  readonly issues: readonly CommunityFeedIssueItem[];
  readonly changes: readonly CommunityFeedChangeItem[];
}

export interface BuildCommunityFeedOptions {
  readonly repositories: readonly CommunityRepository[];
  /** True when a live Community API base URL is configured. */
  readonly apiConnected: boolean;
}

const communityChannels: readonly CommunityChannel[] = [
  { id: "support", label: "support", topic: "Get unstuck, accept answers, and turn repeated help into docs patches." },
  { id: "ideas", label: "ideas", topic: "Shape product ideas into signed intents, previews, and reviewable patches." },
  { id: "bugs", label: "bugs", topic: "Reproduce defects and connect reports to patches without losing context." },
  { id: "agent-runs", label: "agent-runs", topic: "Watch policy-bound agents propose work while humans keep merge authority." },
  { id: "previews", label: "previews", topic: "Review deploy previews, visual results, and release readiness in one thread." },
  { id: "governance", label: "governance", topic: "Handle moderation, legal hold, witnesses, and signed release trust." },
];

/**
 * Map issue labels onto channel-first surfaces.
 * idea → ideas, bug → bugs, agent → agent-runs; default support.
 */
export function channelForIssue(labels: readonly string[]): CommunityChannelId {
  const normalized = labels.map((label) => label.toLowerCase());
  if (normalized.includes("idea") || normalized.includes("ideas")) {
    return "ideas";
  }
  if (normalized.includes("bug") || normalized.includes("bugs")) {
    return "bugs";
  }
  if (normalized.includes("agent") || normalized.includes("agent-run")) {
    return "agent-runs";
  }
  if (normalized.includes("governance") || normalized.includes("security")) {
    return "governance";
  }
  return "support";
}

/**
 * Build the Community feed from API-backed repository state when connected and
 * non-empty; otherwise fall back to an explicitly labeled snapshot demo feed.
 * Live connected mode never mixes hard-coded demos into product activity.
 */
export function buildCommunityFeed(options: BuildCommunityFeedOptions): CommunityFeedBuildResult {
  const issues = options.repositories.flatMap((repo) =>
    repo.issues.map((issue) => ({
      id: issue.id,
      title: issue.title,
      author: issue.author,
      status: issue.status,
      labels: issue.labels,
      repositorySlug: repo.slug,
      channel: channelForIssue(issue.labels),
    })),
  );
  const changes = options.repositories.flatMap((repo) =>
    repo.changeProposals.map((proposal) => ({
      id: proposal.id,
      title: proposal.title,
      author: proposal.author,
      status: proposal.status,
      sourceView: proposal.sourceView,
      targetView: proposal.targetView,
      repositorySlug: repo.slug,
    })),
  );
  const hasApiActivity = issues.length > 0 || changes.length > 0;

  if (options.apiConnected && hasApiActivity) {
    return {
      source: "api",
      conversations: [
        ...apiIssueConversations(options.repositories),
        ...apiProposalConversations(options.repositories),
      ],
      issues,
      changes,
    };
  }

  const repository = options.repositories[0];
  return {
    source: "snapshot",
    conversations: snapshotConversations(repository),
    issues,
    changes,
  };
}

function apiIssueConversations(
  repositories: readonly CommunityRepository[],
): readonly CommunityConversationView[] {
  return repositories.flatMap((repo) =>
    repo.issues.map((issue) => ({
      id: `issue-${issue.id}`,
      channel: channelForIssue(issue.labels),
      repositorySlug: repo.slug,
      author: issue.author,
      role: "contributor",
      title: issue.title,
      body: issue.body.length === 0 ? "Can someone help confirm the next step?" : issue.body,
      time: "10:12",
      anchor: `issue:${issue.id}`,
      signature: `sig:${issue.id.toLowerCase()}`,
      visibility: "community",
      state: issue.status,
      reactions: ["reply", "follow"],
      source: "api" as const,
    })),
  );
}

function apiProposalConversations(
  repositories: readonly CommunityRepository[],
): readonly CommunityConversationView[] {
  return repositories.flatMap((repo) =>
    repo.changeProposals.map((proposal) => ({
      id: `change-${proposal.id}`,
      channel: "previews" as const,
      repositorySlug: repo.slug,
      author: proposal.author,
      role: "contributor",
      title: proposal.title,
      body: proposal.body.length === 0 ? `${proposal.sourceView} -> ${proposal.targetView}` : proposal.body,
      time: "10:28",
      anchor: `change:${proposal.id}`,
      signature: `sig:${proposal.id.toLowerCase()}`,
      visibility: "community",
      state: proposal.status,
      reactions: ["review", "preview"],
      linkedArtifact: proposal.sourceView,
      linkedProposalId: proposal.id,
      source: "api" as const,
    })),
  );
}

function snapshotConversations(
  repository: CommunityRepository | undefined,
): readonly CommunityConversationView[] {
  const slug = repository?.slug ?? "epoch/epoch";
  const maintainer = repository?.maintainers[0] ?? "maya";
  return [
    {
      id: "idea-region-revenue",
      channel: "ideas",
      repositorySlug: slug,
      author: "nora",
      role: "contributor",
      title: "Dashboard widget should group revenue by region",
      body: "The current widget answers total revenue, but support threads keep asking which region changed. Could this become a small widget setting instead of a separate report?",
      time: "09:41",
      anchor: "app://dashboard/widgets/revenue",
      signature: "sig:8f2a-region",
      visibility: "community",
      state: "discussion",
      reactions: ["7 useful", "3 follow"],
      source: "snapshot",
    },
    {
      id: "support-install-cache",
      channel: "support",
      repositorySlug: slug,
      author: "liam",
      role: "newcomer",
      title: "Install cache fails after switching views",
      body: "I can reproduce this after resuming a stale sandbox. The accepted answer should probably become a troubleshooting note.",
      time: "09:58",
      anchor: "docs://support/install-cache",
      signature: "sig:42ab-cache",
      visibility: "community",
      state: "answerable",
      reactions: ["4 same issue"],
      source: "snapshot",
    },
    {
      id: "agent-preview-copy",
      channel: "agent-runs",
      repositorySlug: slug,
      author: "agent-ui-reviewer",
      role: "agent",
      title: "Agent drafted copy cleanup for preview card",
      body: "Policy allows copy and test updates only. Human review is still required before merge.",
      time: "10:03",
      anchor: "agent-run://ui-reviewer/173",
      signature: "sig:agent-173",
      visibility: "maintainers",
      state: "needs review",
      reactions: ["tests passed"],
      linkedArtifact: "preview-173",
      source: "snapshot",
    },
    {
      id: "preview-region-widget",
      channel: "previews",
      repositorySlug: slug,
      author: maintainer,
      role: "maintainer",
      title: "Preview is ready for the region widget",
      body: "The preview renders the chart setting and keeps the old total view as default. Please test keyboard navigation before approval.",
      time: "10:19",
      anchor: "preview://region-widget",
      signature: "sig:preview-91c",
      visibility: "community",
      state: "review",
      reactions: ["open preview", "a11y"],
      linkedArtifact: "deploy-preview-91c",
      source: "snapshot",
    },
    {
      id: "governance-release-witnesses",
      channel: "governance",
      repositorySlug: slug,
      author: "samira",
      role: "security",
      title: "Release needs two witness signatures",
      body: "The release is blocked until the maintainer signature and CI witness agree on the exported artifact hash.",
      time: "10:31",
      anchor: "release://0.1.0",
      signature: "sig:release-witness",
      visibility: "maintainers",
      state: "blocked",
      reactions: ["legal hold available"],
      source: "snapshot",
    },
  ];
}

function renderFeedHonestyBanner(live: boolean, snapshotMode: boolean): string {
  if (!live) {
    return `<p class="api-banner" data-api-unconfigured data-feed-honesty="snapshot">API not connected. Showing the signed snapshot included with this build. Live actions (intent promotion) are disabled.</p>`;
  }
  if (snapshotMode) {
    return `<p class="api-banner" data-api-empty data-feed-honesty="live-empty">Live API connected, but this repository has no issues or changes yet. Channel demos are labeled snapshot samples until activity arrives.</p>`;
  }
  return `<p class="api-banner api-banner-live" data-feed-honesty="live" hidden>Live Community API — feed reflects repository activity.</p>`;
}

function renderChannelButton(
  channel: CommunityChannel,
  conversations: readonly CommunityConversationView[],
): string {
  const count = conversations.filter((conversation) => conversation.channel === channel.id).length;
  const selected = channel.id === "ideas";
  return `<button class="channel-button" type="button" data-channel="${channel.id}" data-topic="${escapeHtml(channel.topic)}" aria-pressed="${selected ? "true" : "false"}">
    <span class="channel-button-label"># ${escapeHtml(channel.label)}</span>
    <span class="channel-count">${count}</span>
  </button>`;
}

function renderRepositoryMeta(
  app: CommunityWebAppDefinition,
  feed: CommunityFeedBuildResult,
): string {
  const repository = app.repositories[0];
  if (repository === undefined) {
    return `<span>No repository</span>`;
  }

  const parts = [
    repository.visibility,
    `${repository.maintainers.length} maintainer${repository.maintainers.length === 1 ? "" : "s"}`,
    `${feed.issues.length} issues`,
    `${feed.changes.length} changes`,
    feed.source === "api" ? "feed:live" : "feed:snapshot",
  ];
  return parts.map((label, index) =>
    `${index === 0 ? "" : `<span class="meta-sep" aria-hidden="true">·</span>`}<span>${escapeHtml(label)}</span>`
  ).join("");
}

function issueIdFromConversation(conversation: CommunityConversationView): string | undefined {
  if (conversation.id.startsWith("issue-")) {
    return conversation.id.slice("issue-".length);
  }
  return undefined;
}

function renderConversation(conversation: CommunityConversationView): string {
  const hidden = conversation.channel === "ideas" ? "" : " hidden";
  const linkedProposal = conversation.linkedProposalId === undefined
    ? ""
    : ` data-linked-proposal="${escapeHtml(conversation.linkedProposalId)}"`;
  const issueId = issueIdFromConversation(conversation);
  const issueAttr = issueId === undefined ? "" : ` data-issue-id="${escapeHtml(issueId)}"`;
  const changeId = conversation.id.startsWith("change-") ? conversation.id.slice("change-".length) : undefined;
  const changeAttr = changeId === undefined ? "" : ` data-change-id="${escapeHtml(changeId)}"`;
  return `<li class="feed-message" data-message data-channel="${conversation.channel}" data-message-id="${escapeHtml(conversation.id)}" data-feed-item-source="${conversation.source}"${issueAttr}${changeAttr}${linkedProposal}${hidden}>
    <button class="message-hitbox" type="button" data-select-message="${escapeHtml(conversation.id)}" aria-label="Open signed actions for ${escapeHtml(conversation.title)}"></button>
    <div class="avatar" aria-hidden="true">${escapeHtml(initials(conversation.author))}</div>
    <article class="message-body">
      <header class="message-meta">
        <strong>${escapeHtml(conversation.author)}</strong>
        <span>${escapeHtml(conversation.role)}</span>
        <time>${escapeHtml(conversation.time)}</time>
        <span data-message-state>${escapeHtml(conversation.state)}</span>
        ${conversation.source === "snapshot" ? `<span data-snapshot-badge>snapshot sample</span>` : ""}
      </header>
      <h2>${escapeHtml(conversation.title)}</h2>
      <p>${escapeHtml(conversation.body)}</p>
      <footer class="message-footer">
        <span>${escapeHtml(conversation.anchor)}</span>
        <span>${escapeHtml(conversation.signature)}</span>
        <span>${escapeHtml(conversation.visibility)}</span>
        ${conversation.linkedProposalId === undefined ? "" : `<span data-proposal-link>proposal:${escapeHtml(conversation.linkedProposalId)}</span>`}
      </footer>
      <div class="reaction-row" aria-label="Reactions">
        ${conversation.reactions.map((reaction) => `<button type="button" class="reaction" data-reaction="${escapeHtml(reaction)}">${escapeHtml(reaction)}</button>`).join("")}
      </div>
      <div class="message-action-tray" data-message-actions hidden>
        <dl>
          <div><dt>Anchor</dt><dd>${escapeHtml(conversation.anchor)}</dd></div>
          <div><dt>Signature</dt><dd>${escapeHtml(conversation.signature)}</dd></div>
          <div><dt>Artifact</dt><dd data-tray-artifact>${escapeHtml(conversation.linkedArtifact ?? conversation.repositorySlug)}</dd></div>
        </dl>
        <div class="action-row">
          <button type="button" data-action="intent">Mark intent</button>
          <button type="button" data-action="agent">Request agent</button>
          <button type="button" data-action="answer">Accept answer</button>
          <button type="button" data-action="docs">Docs patch</button>
          <button type="button" data-action="report">Report</button>
          ${changeId === undefined ? "" : `<button type="button" data-action="approve">Approve change</button>`}
        </div>
        <p class="action-status" data-action-status>Human review required for signed project changes.</p>
      </div>
    </article>
  </li>`;
}

function renderIssueListItem(issue: CommunityFeedIssueItem): string {
  return `<li class="artifact-item" data-issue-id="${escapeHtml(issue.id)}">
    <span class="artifact-id">${escapeHtml(issue.id)}</span>
    <strong>${escapeHtml(issue.title)}</strong>
    <span class="artifact-meta">#${escapeHtml(issue.channel)} · ${escapeHtml(issue.status)} · ${escapeHtml(issue.author)}</span>
    <span class="artifact-labels">${issue.labels.map((label) => escapeHtml(label)).join(", ") || "unlabeled"}</span>
  </li>`;
}

function renderChangeListItem(change: CommunityFeedChangeItem): string {
  return `<li class="artifact-item" data-change-id="${escapeHtml(change.id)}">
    <span class="artifact-id">${escapeHtml(change.id)}</span>
    <strong>${escapeHtml(change.title)}</strong>
    <span class="artifact-meta">${escapeHtml(change.status)} · ${escapeHtml(change.author)}</span>
    <span class="artifact-labels">${escapeHtml(change.sourceView)} → ${escapeHtml(change.targetView)}</span>
  </li>`;
}

function emptyArtifactItem(message: string): string {
  return `<li class="artifact-item artifact-empty">${escapeHtml(message)}</li>`;
}

function initials(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

function renderSiteHistory(history: CommunitySiteEpochHistory): string {
  return `<section aria-label="Epoch site history">
      <h2>This site is built with Epoch</h2>
      <p>Branchable site changes are recorded as signed Epoch events before the Community site is materialized for deployment.</p>
      <dl>
        <dt>Current view</dt>
        <dd>${escapeHtml(history.currentView)}</dd>
        <dt>Version</dt>
        <dd>${escapeHtml(history.latestVersion.name)}</dd>
        <dt>Rollback target</dt>
        <dd>${escapeHtml(history.rollbackTarget.versionId)}</dd>
        <dt>Verification</dt>
        <dd>${history.verifyProblems.length === 0 ? "passed" : escapeHtml(history.verifyProblems.join(", "))}</dd>
      </dl>
    </section>`;
}

function withSiteHistory(
  app: CommunityWebAppDefinition,
  siteHistory: CommunitySiteEpochHistory | undefined,
): CommunityWebAppDefinition {
  return { ...app, siteHistory };
}

function writeCommunitySiteFile(repositoryRoot: string, html: string): void {
  const path = join(repositoryRoot, "community", "index.html");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, html, "utf8");
}

function writeCommunitySiteHistory(repositoryRoot: string, history: CommunitySiteEpochHistory): void {
  const path = join(repositoryRoot, "community", "epoch-site-history.json");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(history, null, 2)}\n`, "utf8");
}

function writeCommunityRepositoryExport(
  outputDirectory: string,
  repository: EpochRepository,
  history: CommunitySiteEpochHistory,
): void {
  const path = join(outputDirectory, "community", "epoch-repository.json");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify({
    ...repository.exportToMemoryTransport().exportSnapshot(),
    history,
  }, null, 2)}\n`, "utf8");
}

function copyDirectory(source: string, target: string): void {
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  for (const entry of readdirSync(source)) {
    const sourcePath = join(source, entry);
    const targetPath = join(target, entry);
    const stat = statSync(sourcePath);
    if (stat.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else if (stat.isFile()) {
      mkdirSync(dirname(targetPath), { recursive: true });
      copyFileSync(sourcePath, targetPath);
    }
  }
}

function operation(
  label: string,
  event: Event,
  details: Partial<Omit<CommunitySiteEpochOperation, "label" | "eventId" | "eventType">> = {},
): CommunitySiteEpochOperation {
  return {
    label,
    eventId: event.id,
    eventType: event.type,
    ...details,
  };
}

function summarizeSiteHistory(
  repository: EpochRepository,
  input: {
    readonly author: string;
    readonly latestVersion: Event;
    readonly operations: readonly CommunitySiteEpochOperation[];
    readonly rollbackTarget: CommunitySiteEpochHistory["rollbackTarget"];
  },
): CommunitySiteEpochHistory {
  return {
    repository: "EpochRepository",
    author: input.author,
    currentView: repository.currentView(),
    views: repository.listViews().map((view) => view.name),
    eventTypes: [...new Set(repository.events().map((event) => event.type))].sort(),
    operations: [...input.operations],
    latestVersion: versionSummary(input.latestVersion),
    rollbackTarget: input.rollbackTarget,
    verifyProblems: repository.verify(),
  };
}

function versionSummary(version: Event): CommunitySiteEpochVersionSummary {
  const files = Array.isArray(version.payload.files)
    ? version.payload.files.flatMap((file) => isVersionFile(file) ? [file.path] : [])
    : [];

  return {
    id: version.id,
    name: typeof version.payload.name === "string" ? version.payload.name : version.id,
    view: typeof version.payload.view === "string" ? version.payload.view : "main",
    files,
  };
}

function isVersionFile(value: unknown): value is { readonly path: string } {
  return typeof value === "object"
    && value !== null
    && "path" in value
    && typeof (value as { readonly path?: unknown }).path === "string";
}

function withPlannedRelease(
  history: CommunitySiteEpochHistory,
  releaseVersionName: string,
): CommunitySiteEpochHistory {
  return {
    ...history,
    latestVersion: {
      id: "pending-signed-version",
      name: releaseVersionName,
      view: "main",
      files: ["community/index.html", "community/epoch-site-history.json"],
    },
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeScriptJson(value: string): string {
  return value.replaceAll("<", "\\u003c").replaceAll(">", "\\u003e").replaceAll("&", "\\u0026");
}

function communityRuntime(): string {
  return `    (() => {
      const stateElement = document.getElementById("epoch-community-state");
      const state = stateElement === null
        ? { conversations: [], repositories: [], issues: [], changes: [], feedSource: "snapshot" }
        : JSON.parse(stateElement.textContent || "{}");
      let activeChannel = "ideas";
      let selectedMessage = null;
      const actor = "maya";

      const feed = document.querySelector("[data-message-feed]");
      const channelName = document.querySelector("[data-current-channel]");
      const channelTopic = document.querySelector("[data-current-topic]");
      const composer = document.querySelector("[data-comment-composer]");
      const composerLabel = document.querySelector(".composer-label");
      const changeList = document.querySelector("[data-change-list]");
      const issueList = document.querySelector("[data-issue-list]");
      const shell = document.getElementById("epoch-community");
      const connectionLabel = document.querySelector("[data-connection-label]");

      const channelTopics = {
        support: "Get unstuck, accept answers, and turn repeated help into docs patches.",
        ideas: "Shape product ideas into signed intents, previews, and reviewable patches.",
        bugs: "Reproduce defects and connect reports to patches without losing context.",
        "agent-runs": "Watch policy-bound agents propose work while humans keep merge authority.",
        previews: "Review deploy previews, visual results, and release readiness in one thread.",
        governance: "Handle moderation, legal hold, witnesses, and signed release trust.",
      };

      function apiBase() {
        return (state.apiBaseUrl || "").replace(/\\/$/, "");
      }

      function live() {
        return Boolean(state.apiBaseUrl);
      }

      function repository() {
        return state.repositories && state.repositories[0];
      }

      function messages() {
        return Array.from(document.querySelectorAll("[data-message]"));
      }

      function channelLabel(channel) {
        const map = {
          ideas: "idea",
          bugs: "bug",
          support: "support",
          "agent-runs": "agent",
          previews: "preview",
          governance: "governance",
        };
        return map[channel] || "support";
      }

      function channelForLabels(labels) {
        const normalized = (labels || []).map((label) => String(label).toLowerCase());
        if (normalized.includes("idea") || normalized.includes("ideas")) return "ideas";
        if (normalized.includes("bug") || normalized.includes("bugs")) return "bugs";
        if (normalized.includes("agent") || normalized.includes("agent-run")) return "agent-runs";
        if (normalized.includes("governance") || normalized.includes("security") || normalized.includes("moderation")) return "governance";
        if (normalized.includes("preview")) return "previews";
        return "support";
      }

      function initials(value) {
        return String(value || "?")
          .split(/[^a-zA-Z0-9]+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0].toUpperCase())
          .join("")
          .slice(0, 2) || "?";
      }

      function escapeHtml(value) {
        return String(value)
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#39;");
      }

      async function apiJson(method, path, body) {
        const response = await fetch(apiBase() + path, {
          method,
          headers: {
            Accept: "application/json",
            ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        const text = await response.text();
        const parsed = text.length === 0 ? null : JSON.parse(text);
        if (!response.ok) {
          const message = parsed && parsed.error ? parsed.error : response.statusText;
          throw new Error(message || ("HTTP " + response.status));
        }
        return parsed;
      }

      function selectSurface(surface) {
        document.querySelectorAll("[data-surface]").forEach((button) => {
          button.setAttribute("aria-pressed", button.dataset.surface === surface ? "true" : "false");
        });
        document.querySelectorAll("[data-surface-panel]").forEach((panel) => {
          panel.hidden = panel.getAttribute("data-surface-panel") !== surface;
        });
        const channelList = document.querySelector("[data-channel-list]");
        if (channelList) channelList.hidden = surface !== "channels";
        const channelToolbar = document.querySelector("[data-channel-toolbar]");
        if (channelToolbar) channelToolbar.hidden = surface !== "channels";
      }

      function applyChannelFilter() {
        messages().forEach((message) => {
          message.hidden = message.dataset.channel !== activeChannel;
          if (message.dataset.messageId !== selectedMessage) {
            message.removeAttribute("data-selected-message");
            const tray = message.querySelector("[data-message-actions]");
            if (tray) tray.hidden = true;
          }
        });
        if (channelName) channelName.textContent = "# " + activeChannel;
        if (channelTopic) channelTopic.textContent = channelTopics[activeChannel] || "";
        if (composerLabel) composerLabel.textContent = "Message #" + activeChannel;
        document.querySelectorAll("[data-channel][aria-pressed]").forEach((item) => {
          item.setAttribute("aria-pressed", item.dataset.channel === activeChannel ? "true" : "false");
        });
      }

      function selectChannel(channel) {
        activeChannel = channel || "ideas";
        selectedMessage = null;
        selectSurface("channels");
        applyChannelFilter();
        if (feed) feed.scrollTop = 0;
      }

      function selectMessage(id) {
        selectedMessage = id;
        messages().forEach((message) => {
          const selected = message.dataset.messageId === id;
          if (selected) message.setAttribute("data-selected-message", "true");
          else message.removeAttribute("data-selected-message");
          const tray = message.querySelector("[data-message-actions]");
          if (tray) tray.hidden = !selected;
        });
      }

      function setStatus(message, text) {
        const status = message?.querySelector("[data-action-status]");
        if (status) status.textContent = text;
      }

      function renderIssueItem(issue) {
        const channel = channelForLabels(issue.labels || []);
        const labels = (issue.labels || []).join(", ") || "unlabeled";
        return '<li class="artifact-item" data-issue-id="' + escapeHtml(issue.id) + '">'
          + '<span class="artifact-id">' + escapeHtml(issue.id) + '</span>'
          + '<strong>' + escapeHtml(issue.title) + '</strong>'
          + '<span class="artifact-meta">#' + escapeHtml(channel) + ' · ' + escapeHtml(issue.status) + ' · ' + escapeHtml(issue.author) + '</span>'
          + '<span class="artifact-labels">' + escapeHtml(labels) + '</span>'
          + '</li>';
      }

      function renderChangeItem(change) {
        return '<li class="artifact-item" data-change-id="' + escapeHtml(change.id) + '">'
          + '<span class="artifact-id">' + escapeHtml(change.id) + '</span>'
          + '<strong>' + escapeHtml(change.title) + '</strong>'
          + '<span class="artifact-meta">' + escapeHtml(change.status) + ' · ' + escapeHtml(change.author) + '</span>'
          + '<span class="artifact-labels">' + escapeHtml(change.sourceView || "") + ' → ' + escapeHtml(change.targetView || "") + '</span>'
          + '<div class="artifact-actions">'
          + '<button type="button" class="reaction" data-review-change="' + escapeHtml(change.id) + '">Approve</button>'
          + '</div>'
          + '</li>';
      }

      function renderMessageFromIssue(issue, repo) {
        const channel = channelForLabels(issue.labels || []);
        const id = "issue-" + issue.id;
        const commentNote = issue.comments && issue.comments.length
          ? " · " + issue.comments.length + " comment" + (issue.comments.length === 1 ? "" : "s")
          : "";
        return '<li class="feed-message" data-message data-channel="' + channel + '" data-message-id="' + escapeHtml(id) + '" data-feed-item-source="api" data-issue-id="' + escapeHtml(issue.id) + '">'
          + '<button class="message-hitbox" type="button" data-select-message="' + escapeHtml(id) + '" aria-label="Open signed actions for ' + escapeHtml(issue.title) + '"></button>'
          + '<div class="avatar" aria-hidden="true">' + escapeHtml(initials(issue.author)) + '</div>'
          + '<article class="message-body">'
          + '<header class="message-meta"><strong>' + escapeHtml(issue.author) + '</strong><span>contributor</span><time>live</time><span data-message-state>' + escapeHtml(issue.status + commentNote) + '</span></header>'
          + '<h2>' + escapeHtml(issue.title) + '</h2>'
          + '<p>' + escapeHtml(issue.body || "") + '</p>'
          + (issue.comments && issue.comments.length
            ? '<div class="thread-comments" data-thread-comments>' + issue.comments.map((comment) =>
              '<div class="thread-comment"><strong>' + escapeHtml(comment.author) + '</strong> <span>' + escapeHtml(comment.body) + '</span></div>'
            ).join("") + '</div>'
            : '')
          + '<footer class="message-footer"><span>issue:' + escapeHtml(issue.id) + '</span><span>sig:' + escapeHtml(issue.id.toLowerCase()) + '</span><span>community</span></footer>'
          + '<div class="reaction-row" aria-label="Reactions">'
          + '<button type="button" class="reaction" data-reaction="reply">reply</button>'
          + '<button type="button" class="reaction" data-reaction="follow">follow</button>'
          + '</div>'
          + '<div class="message-action-tray" data-message-actions hidden>'
          + '<dl><div><dt>Anchor</dt><dd>issue:' + escapeHtml(issue.id) + '</dd></div>'
          + '<div><dt>Signature</dt><dd>sig:' + escapeHtml(issue.id.toLowerCase()) + '</dd></div>'
          + '<div><dt>Artifact</dt><dd data-tray-artifact>' + escapeHtml(repo.slug) + '</dd></div></dl>'
          + '<div class="action-row">'
          + '<button type="button" data-action="intent">Mark intent</button>'
          + '<button type="button" data-action="agent">Request agent</button>'
          + '<button type="button" data-action="answer">Accept answer</button>'
          + '<button type="button" data-action="docs">Docs patch</button>'
          + '<button type="button" data-action="report">Report</button>'
          + '</div>'
          + '<p class="action-status" data-action-status>Human review required for signed project changes.</p>'
          + '</div></article></li>';
      }

      function renderMessageFromChange(proposal, repo) {
        const id = "change-" + proposal.id;
        return '<li class="feed-message" data-message data-channel="previews" data-message-id="' + escapeHtml(id) + '" data-feed-item-source="api" data-change-id="' + escapeHtml(proposal.id) + '" data-linked-proposal="' + escapeHtml(proposal.id) + '">'
          + '<button class="message-hitbox" type="button" data-select-message="' + escapeHtml(id) + '" aria-label="Open signed actions for ' + escapeHtml(proposal.title) + '"></button>'
          + '<div class="avatar" aria-hidden="true">' + escapeHtml(initials(proposal.author)) + '</div>'
          + '<article class="message-body">'
          + '<header class="message-meta"><strong>' + escapeHtml(proposal.author) + '</strong><span>contributor</span><time>live</time><span data-message-state>' + escapeHtml(proposal.status) + '</span></header>'
          + '<h2>' + escapeHtml(proposal.title) + '</h2>'
          + '<p>' + escapeHtml(proposal.body || (proposal.sourceView + " -> " + proposal.targetView)) + '</p>'
          + '<footer class="message-footer"><span>change:' + escapeHtml(proposal.id) + '</span><span>sig:' + escapeHtml(proposal.id.toLowerCase()) + '</span><span>community</span><span data-proposal-link>proposal:' + escapeHtml(proposal.id) + '</span></footer>'
          + '<div class="reaction-row" aria-label="Reactions">'
          + '<button type="button" class="reaction" data-reaction="review">review</button>'
          + '<button type="button" class="reaction" data-reaction="preview">preview</button>'
          + '</div>'
          + '<div class="message-action-tray" data-message-actions hidden>'
          + '<dl><div><dt>Anchor</dt><dd>change:' + escapeHtml(proposal.id) + '</dd></div>'
          + '<div><dt>Signature</dt><dd>sig:' + escapeHtml(proposal.id.toLowerCase()) + '</dd></div>'
          + '<div><dt>Artifact</dt><dd data-tray-artifact>' + escapeHtml(proposal.sourceView || repo.slug) + '</dd></div></dl>'
          + '<div class="action-row">'
          + '<button type="button" data-action="intent">Mark intent</button>'
          + '<button type="button" data-action="agent">Request agent</button>'
          + '<button type="button" data-action="answer">Accept answer</button>'
          + '<button type="button" data-action="docs">Docs patch</button>'
          + '<button type="button" data-action="report">Report</button>'
          + '<button type="button" data-action="approve">Approve change</button>'
          + '</div>'
          + '<p class="action-status" data-action-status>Human review required for signed project changes.</p>'
          + '</div></article></li>';
      }

      function updateChannelCounts(repo) {
        const counts = { support: 0, ideas: 0, bugs: 0, "agent-runs": 0, previews: 0, governance: 0 };
        for (const issue of repo.issues || []) {
          counts[channelForLabels(issue.labels)] = (counts[channelForLabels(issue.labels)] || 0) + 1;
        }
        for (const _proposal of repo.changeProposals || []) {
          counts.previews += 1;
        }
        document.querySelectorAll("[data-channel][aria-pressed]").forEach((button) => {
          const countEl = button.querySelector(".channel-count");
          if (countEl) countEl.textContent = String(counts[button.dataset.channel] || 0);
        });
        const issueCount = document.querySelector('[data-surface="issues"] .channel-count');
        if (issueCount) issueCount.textContent = String((repo.issues || []).length);
        const changeCount = document.querySelector('[data-surface="changes"] .channel-count');
        if (changeCount) changeCount.textContent = String((repo.changeProposals || []).length);
      }

      function updateRepositoryMeta(repo) {
        const meta = document.querySelector(".repository-meta");
        if (!meta) return;
        const parts = [
          repo.visibility || "public",
          (repo.maintainers || []).length + " maintainer" + ((repo.maintainers || []).length === 1 ? "" : "s"),
          (repo.issues || []).length + " issues",
          (repo.changeProposals || []).length + " changes",
          live() ? "feed:live" : "feed:snapshot",
        ];
        meta.innerHTML = parts.map((part, index) =>
          (index === 0 ? "" : '<span class="meta-sep" aria-hidden="true">·</span>') + "<span>" + escapeHtml(part) + "</span>"
        ).join("");
      }

      function renderRepository(repo) {
        state.repositories = [repo];
        state.feedSource = live() ? "api" : state.feedSource;
        if (shell) {
          shell.dataset.feedSource = state.feedSource;
          shell.dataset.apiState = live() ? "connected" : "offline";
        }
        if (connectionLabel) connectionLabel.textContent = live() ? "Live" : "Snapshot";
        if (feed) {
          const issueHtml = (repo.issues || []).map((issue) => renderMessageFromIssue(issue, repo)).join("");
          const changeHtml = (repo.changeProposals || []).map((proposal) => renderMessageFromChange(proposal, repo)).join("");
          feed.innerHTML = issueHtml + changeHtml;
        }
        if (issueList) {
          issueList.innerHTML = (repo.issues || []).length
            ? (repo.issues || []).map(renderIssueItem).join("")
            : '<li class="artifact-item artifact-empty">No open issues in the connected repository.</li>';
        }
        if (changeList) {
          changeList.innerHTML = (repo.changeProposals || []).length
            ? (repo.changeProposals || []).map(renderChangeItem).join("")
            : '<li class="artifact-item artifact-empty">No change proposals yet. Promote a message with Mark intent.</li>';
        }
        updateChannelCounts(repo);
        updateRepositoryMeta(repo);
        applyChannelFilter();
        if (selectedMessage) selectMessage(selectedMessage);
      }

      async function refreshRepository() {
        const repo = repository();
        if (!live() || !repo) return null;
        const updated = await apiJson("GET", "/repositories/" + encodeURIComponent(repo.slug));
        renderRepository(updated);
        return updated;
      }

      async function postIssue(input) {
        const repo = repository();
        if (!live() || !repo) throw new Error("Live API unavailable");
        return apiJson("POST", "/repositories/" + encodeURIComponent(repo.slug) + "/issues", input);
      }

      async function postComment(issueId, body) {
        const repo = repository();
        if (!live() || !repo) throw new Error("Live API unavailable");
        return apiJson(
          "POST",
          "/repositories/" + encodeURIComponent(repo.slug) + "/issues/" + encodeURIComponent(issueId) + "/comments",
          { author: actor, body },
        );
      }

      async function postChange(input) {
        const repo = repository();
        if (!live() || !repo) throw new Error("Live API unavailable");
        return apiJson("POST", "/repositories/" + encodeURIComponent(repo.slug) + "/changes", input);
      }

      async function postReview(changeId, decision) {
        const repo = repository();
        if (!live() || !repo) throw new Error("Live API unavailable");
        return apiJson(
          "POST",
          "/repositories/" + encodeURIComponent(repo.slug) + "/changes/" + encodeURIComponent(changeId) + "/reviews",
          { reviewer: actor, decision, body: decision === "approved" ? "Approved from Community Web." : "" },
        );
      }

      async function handleComposerSubmit(text) {
        const body = text.trim();
        if (!body) return;
        if (!live()) {
          // Snapshot mode: local-only append (fail closed for durable write).
          const id = "comment-" + Date.now();
          if (!feed) return;
          const item = document.createElement("li");
          item.className = "feed-message";
          item.dataset.message = "";
          item.dataset.channel = activeChannel;
          item.dataset.messageId = id;
          item.dataset.feedItemSource = "snapshot";
          item.innerHTML = '<div class="avatar" aria-hidden="true">MY</div><article class="message-body"><header class="message-meta"><strong>maya</strong><span>maintainer</span><time>now</time><span>local only</span></header><h2>Local note</h2><p></p><footer class="message-footer"><span>anchor:composer</span><span>sig:pending-local</span><span>community</span></footer></article>';
          item.querySelector("p").textContent = body;
          feed.append(item);
          return;
        }

        const selected = selectedMessage
          ? document.querySelector('[data-message-id="' + CSS.escape(selectedMessage) + '"]')
          : null;
        const issueId = selected?.dataset.issueId;
        if (issueId) {
          const updated = await postComment(issueId, body);
          renderRepository(updated);
          selectMessage("issue-" + issueId);
          return;
        }

        const title = body.split("\\n")[0].slice(0, 120) || "Community message";
        const updated = await postIssue({
          title,
          author: actor,
          body,
          labels: [channelLabel(activeChannel)],
        });
        renderRepository(updated);
        const created = (updated.issues || [])[updated.issues.length - 1];
        if (created) {
          selectChannel(channelForLabels(created.labels));
          selectMessage("issue-" + created.id);
        }
      }

      async function handleAction(action, message) {
        const title = message.querySelector("h2")?.textContent || "Community intent";
        const body = message.querySelector("p")?.textContent || "";
        const issueId = message.dataset.issueId;
        const changeId = message.dataset.changeId;
        const repo = repository();

        if (!live()) {
          if (action === "intent") {
            setStatus(message, "Live API unavailable. Intent promotion is disabled in snapshot mode.");
          } else {
            setStatus(message, "Live API unavailable. This action is disabled in snapshot mode.");
          }
          return;
        }

        try {
          if (action === "intent") {
            setStatus(message, "Recording intent candidate...");
            const updated = await postChange({
              title,
              author: actor,
              body,
              sourceView: "community/" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
              targetView: repo.defaultView || "main",
            });
            renderRepository(updated);
            const proposal = (updated.changeProposals || []).filter((item) => item.title === title).slice(-1)[0]
              || (updated.changeProposals || []).slice(-1)[0];
            if (proposal) {
              const next = document.querySelector('[data-message-id="change-' + CSS.escape(proposal.id) + '"]')
                || document.querySelector('[data-message-id="' + CSS.escape(message.dataset.messageId) + '"]');
              if (next) {
                selectChannel("previews");
                selectMessage("change-" + proposal.id);
                setStatus(next, "Intent candidate recorded from the live API: " + proposal.id + " (" + proposal.status + ").");
              }
            }
            return;
          }

          if (action === "agent") {
            setStatus(message, "Opening agent-run issue...");
            const updated = await postIssue({
              title: "Agent: " + title,
              author: "agent-ui-reviewer",
              body: "Agent requested from conversation.\\n\\n" + body + "\\n\\nHuman review remains required.",
              labels: ["agent"],
            });
            renderRepository(updated);
            const created = (updated.issues || []).slice(-1)[0];
            if (created) {
              selectChannel("agent-runs");
              selectMessage("issue-" + created.id);
              setStatus(document.querySelector('[data-message-id="issue-' + CSS.escape(created.id) + '"]'), "Agent run requested. Human review remains required.");
            }
            return;
          }

          if (action === "answer") {
            if (!issueId) {
              setStatus(message, "Select an issue thread to accept an answer.");
              return;
            }
            setStatus(message, "Recording accepted answer...");
            const updated = await postComment(issueId, "Accepted answer: " + body);
            renderRepository(updated);
            selectMessage("issue-" + issueId);
            setStatus(document.querySelector('[data-message-id="issue-' + CSS.escape(issueId) + '"]'), "Accepted answer captured for this thread.");
            return;
          }

          if (action === "docs") {
            setStatus(message, "Opening docs patch proposal...");
            const updated = await postChange({
              title: "Docs: " + title,
              author: actor,
              body: "Docs patch candidate linked from conversation.\\n\\n" + body,
              sourceView: "docs/" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
              targetView: repo.defaultView || "main",
            });
            renderRepository(updated);
            const proposal = (updated.changeProposals || []).slice(-1)[0];
            if (proposal) {
              selectChannel("previews");
              selectMessage("change-" + proposal.id);
              setStatus(document.querySelector('[data-message-id="change-' + CSS.escape(proposal.id) + '"]'), "Docs patch candidate linked to this conversation.");
            }
            return;
          }

          if (action === "report") {
            setStatus(message, "Opening moderation report...");
            const updated = await postIssue({
              title: "Moderation: " + title,
              author: actor,
              body: "Moderation report / legal-hold evidence.\\n\\nSource: " + title + "\\n\\n" + body,
              labels: ["governance", "moderation"],
            });
            renderRepository(updated);
            const created = (updated.issues || []).slice(-1)[0];
            if (created) {
              selectChannel("governance");
              selectMessage("issue-" + created.id);
              setStatus(document.querySelector('[data-message-id="issue-' + CSS.escape(created.id) + '"]'), "Moderation report opened with legal-hold evidence.");
            }
            return;
          }

          if (action === "approve") {
            if (!changeId) {
              setStatus(message, "No change proposal on this message.");
              return;
            }
            setStatus(message, "Submitting approval...");
            const updated = await postReview(changeId, "approved");
            renderRepository(updated);
            selectMessage("change-" + changeId);
            setStatus(document.querySelector('[data-message-id="change-' + CSS.escape(changeId) + '"]'), "Change approved by " + actor + ".");
          }
        } catch (error) {
          setStatus(message, "Action failed: " + (error instanceof Error ? error.message : String(error)));
        }
      }

      document.querySelectorAll("[data-surface]").forEach((button) => {
        button.addEventListener("click", () => selectSurface(button.dataset.surface || "channels"));
      });
      document.querySelectorAll("[data-channel][aria-pressed]").forEach((button) => {
        button.addEventListener("click", () => selectChannel(button.dataset.channel || "ideas"));
      });

      document.addEventListener("click", async (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const reviewButton = target.closest("[data-review-change]");
        if (reviewButton) {
          event.preventDefault();
          try {
            const updated = await postReview(reviewButton.getAttribute("data-review-change"), "approved");
            renderRepository(updated);
            selectSurface("changes");
          } catch (error) {
            console.error(error);
          }
          return;
        }

        const actionButton = target.closest("[data-action]");
        if (actionButton) {
          event.preventDefault();
          event.stopPropagation();
          const message = actionButton.closest("[data-message]");
          if (message) await handleAction(actionButton.dataset.action, message);
          return;
        }

        const reactionButton = target.closest(".reaction[data-reaction]");
        if (reactionButton) {
          event.preventDefault();
          event.stopPropagation();
          const message = reactionButton.closest("[data-message]");
          if (!message) return;
          const issueId = message.dataset.issueId;
          if (live() && issueId) {
            try {
              const updated = await postComment(issueId, "Reaction: " + reactionButton.dataset.reaction);
              renderRepository(updated);
              selectMessage("issue-" + issueId);
              setStatus(document.querySelector('[data-message-id="issue-' + CSS.escape(issueId) + '"]'), "Recorded reaction via comment.");
            } catch (error) {
              setStatus(message, "Reaction failed: " + (error instanceof Error ? error.message : String(error)));
            }
          } else {
            setStatus(message, live() ? "Reactions attach to issue threads." : "Live API unavailable for reactions.");
          }
          return;
        }

        const selectButton = target.closest("[data-select-message]");
        if (selectButton) {
          selectMessage(selectButton.dataset.selectMessage);
          return;
        }

        const message = target.closest("[data-message]");
        if (message && message.dataset.messageId && !target.closest("[data-message-actions]")) {
          selectMessage(message.dataset.messageId);
        }
      });

      composer?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const input = composer.querySelector("textarea");
        const value = input?.value || "";
        try {
          await handleComposerSubmit(value);
          if (input) input.value = "";
        } catch (error) {
          if (input) input.placeholder = "Send failed: " + (error instanceof Error ? error.message : String(error));
        }
      });

      selectSurface("channels");
      if (live() && repository()) {
        refreshRepository().catch((error) => {
          if (connectionLabel) connectionLabel.textContent = "Live · error";
          console.error(error);
        });
      }
    })();`;
}


function communityStyles(): string {
  return `    :root {
      color-scheme: light;
      --epoch-color-surface: #eef3f1;
      --epoch-color-surface-raised: #fbfbf8;
      --epoch-color-ink: #17221f;
      --epoch-color-muted: #5f6a65;
      --epoch-color-line: #cad8d2;
      --epoch-color-accent: #ba5e3f;
      --epoch-color-accent-strong: #843927;
      --epoch-color-teal: #2f7370;
      --epoch-color-mint: #d8ece5;
      --epoch-color-gold: #d8b765;
      --epoch-shadow-low: 0 1px 0 rgba(23, 34, 31, 0.04);
      --epoch-radius-sm: 4px;
      --epoch-radius-md: 8px;
      --epoch-space-1: 0.5rem;
      --epoch-space-2: 0.75rem;
      --epoch-space-3: 1rem;
      --epoch-space-4: 1.5rem;
      --epoch-space-5: 2rem;
      --epoch-space-6: 3rem;
      --rail-width: 15.5rem;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      font-size: 16px;
      background: var(--epoch-color-surface);
      color: var(--epoch-color-ink);
    }

    * { box-sizing: border-box; }
    [hidden] { display: none !important; }

    html, body {
      margin: 0;
      height: 100%;
    }

    body {
      min-width: 320px;
      background: var(--epoch-color-surface);
      color: var(--epoch-color-ink);
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }

    a { color: inherit; text-decoration: none; }
    a:hover { color: var(--epoch-color-accent-strong); }
    a:focus-visible,
    button:focus-visible,
    textarea:focus-visible {
      outline: 2px solid var(--epoch-color-accent);
      outline-offset: 2px;
    }

    .skip-link {
      position: fixed;
      inset-block-start: var(--epoch-space-3);
      inset-inline-start: var(--epoch-space-3);
      z-index: 20;
      padding: var(--epoch-space-2) var(--epoch-space-3);
      border: 1px solid var(--epoch-color-ink);
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-surface-raised);
      transform: translateY(-160%);
    }
    .skip-link:focus-visible { transform: none; }

    #epoch-community {
      display: grid;
      grid-template-columns: var(--rail-width) minmax(0, 1fr);
      height: 100vh;
      min-height: 100vh;
      background: var(--epoch-color-surface);
    }

    .channel-rail {
      display: grid;
      grid-template-rows: auto auto auto 1fr auto;
      gap: 0.75rem;
      padding: 0.85rem 0.65rem;
      border-inline-end: 1px solid #24302b;
      background: var(--epoch-color-ink);
      color: #e8efe9;
      overflow: hidden;
    }

    .brand {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.6rem;
      align-items: center;
      padding: 0.25rem 0.4rem;
      color: inherit;
    }
    .brand-mark {
      display: grid;
      place-items: center;
      width: 1.85rem;
      height: 1.85rem;
      border-radius: 3px;
      background: #315347;
      color: #eef6f1;
      font-size: 0.68rem;
      font-weight: 750;
    }
    .brand-text { display: grid; gap: 0.05rem; min-width: 0; }
    .brand-name {
      font-size: 0.95rem;
      font-weight: 750;
      line-height: 1.1;
    }
    .brand-sub {
      color: #9aaba2;
      font-size: 0.75rem;
      font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .surface-list,
    .channel-list {
      display: grid;
      align-content: start;
      gap: 0.15rem;
      min-width: 0;
    }
    .channel-list { overflow-y: auto; }
    .surface-button,
    .channel-button {
      display: flex;
      width: 100%;
      min-height: 1.9rem;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.28rem 0.5rem;
      border: 0;
      border-radius: 3px;
      background: transparent;
      color: #b7c3bc;
      cursor: pointer;
      font: inherit;
      font-size: 0.9rem;
      font-weight: 500;
      text-align: start;
    }
    .surface-button:hover,
    .channel-button:hover {
      background: rgba(255, 255, 255, 0.06);
      color: #f0f4f1;
    }
    .surface-button[aria-pressed="true"],
    .channel-button[aria-pressed="true"] {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      font-weight: 600;
    }
    .surface-list {
      padding-block-end: 0.45rem;
      margin-block-end: 0.15rem;
      border-block-end: 1px solid #2a3831;
    }
    .channel-button-label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .channel-count {
      flex: 0 0 auto;
      min-width: 1.25rem;
      color: #9aaba2;
      font-size: 0.75rem;
      font-variant-numeric: tabular-nums;
      text-align: end;
    }
    .surface-button[aria-pressed="true"] .channel-count,
    .channel-button[aria-pressed="true"] .channel-count {
      color: #d5e0d9;
    }

    .rail-status {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.35rem 0.55rem;
      color: #9aaba2;
      font-size: 0.78rem;
      font-weight: 600;
      border-block-start: 1px solid #2a3831;
    }
    .status-dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      background: #69d391;
    }
    .status-dot-muted { background: var(--epoch-color-gold); }

    .feed-shell {
      display: grid;
      grid-template-rows: auto auto auto minmax(0, 1fr);
      min-width: 0;
      min-height: 0;
      background: var(--epoch-color-surface-raised);
    }

    .feed-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.7rem 1.15rem;
      border-block-end: 1px solid var(--epoch-color-line);
      background: var(--epoch-color-surface-raised);
    }
    .feed-heading { min-width: 0; }
    .feed-header h1 {
      max-width: none;
      margin: 0;
      color: var(--epoch-color-ink);
      font-size: 1.05rem;
      font-weight: 700;
      line-height: 1.25;
    }
    .feed-repo {
      margin: 0.1rem 0 0;
      color: var(--epoch-color-muted);
      font-size: 0.78rem;
      font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
    }
    .repository-meta {
      display: flex;
      flex-wrap: wrap;
      justify-content: end;
      align-items: center;
      gap: 0.35rem;
      max-width: 28rem;
      color: var(--epoch-color-muted);
      font-size: 0.8rem;
      font-weight: 500;
      line-height: 1.3;
      text-align: end;
    }
    .repository-meta .meta-sep {
      color: #a8b3ad;
      font-weight: 400;
    }

    .api-banner {
      margin: 0;
      padding: 0.55rem 1.15rem;
      border-block-end: 1px solid #e0c991;
      background: #fff4cf;
      color: #5b4420;
      font-size: 0.84rem;
      font-weight: 650;
    }
    .api-banner-live {
      border-block-end-color: #b7d8c8;
      background: var(--epoch-color-mint);
      color: #1f4a38;
    }

    .feed-toolbar {
      display: flex;
      align-items: baseline;
      gap: 0.75rem;
      min-width: 0;
      padding: 0.65rem 1.15rem;
      border-block-end: 1px solid var(--epoch-color-line);
      background: var(--epoch-color-surface-raised);
    }
    .channel-name {
      flex: 0 0 auto;
      color: var(--epoch-color-ink);
      font-size: 0.98rem;
      font-weight: 750;
    }
    .channel-topic {
      min-width: 0;
      color: var(--epoch-color-muted);
      font-size: 0.86rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .surface-stage {
      display: grid;
      grid-template-rows: minmax(0, 1fr) auto;
      min-height: 0;
      height: 100%;
    }
    .surface-stage:has(.artifact-list) {
      grid-template-rows: auto minmax(0, 1fr);
    }

    .message-feed {
      margin: 0;
      padding: 0.35rem 0 0.75rem;
      overflow-y: auto;
      list-style: none;
    }

    .feed-message {
      position: relative;
      display: grid;
      grid-template-columns: 2.25rem minmax(0, 1fr);
      gap: 0.65rem;
      padding: 0.45rem 1.15rem;
      border-block: 1px solid transparent;
    }
    .feed-message:hover {
      background: #f5f2eb;
      border-block-color: transparent;
    }
    .feed-message[data-selected-message="true"] {
      background: #ebe6db;
    }

    .message-hitbox {
      position: absolute;
      inset: 0;
      z-index: 0;
      border: 0;
      background: transparent;
      cursor: pointer;
    }
    .avatar {
      position: relative;
      z-index: 1;
      display: grid;
      width: 2.15rem;
      height: 2.15rem;
      place-items: center;
      border-radius: 3px;
      background: #315347;
      color: #eef6f1;
      font-size: 0.68rem;
      font-weight: 700;
    }
    .message-body {
      position: relative;
      z-index: 1;
      display: grid;
      gap: 0.28rem;
      min-width: 0;
      pointer-events: none;
    }
    .message-body button { pointer-events: auto; }

    .message-meta,
    .message-footer,
    .reaction-row,
    .action-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.4rem;
    }
    .message-meta {
      color: var(--epoch-color-muted);
      font-size: 0.78rem;
    }
    .message-meta strong {
      color: var(--epoch-color-ink);
      font-size: 0.9rem;
      font-weight: 700;
    }
    .message-body h2 {
      margin: 0;
      color: var(--epoch-color-ink);
      font-size: 0.98rem;
      font-weight: 700;
      line-height: 1.3;
    }
    .message-body p {
      max-width: 70ch;
      margin: 0;
      color: #3a423d;
      font-size: 0.94rem;
      line-height: 1.5;
    }
    .message-footer {
      color: var(--epoch-color-muted);
      font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
      font-size: 0.72rem;
    }
    .message-footer span + span::before {
      content: "·";
      margin-inline-end: 0.4rem;
      color: #a0aaa4;
    }
    [data-proposal-link] {
      color: var(--epoch-color-teal);
      font-weight: 700;
    }
    [data-snapshot-badge] {
      border: 1px solid #d4c49a;
      border-radius: 2px;
      background: #f7f0d8;
      color: #5b4420;
      font-size: 0.7rem;
      font-weight: 600;
      padding: 0.05rem 0.3rem;
    }
    .reaction-row {
      gap: 0.3rem;
      margin-top: 0.2rem;
    }
    .reaction {
      display: inline-flex;
      align-items: center;
      min-height: 1.65rem;
      border: 1px solid var(--epoch-color-line);
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-surface-raised);
      color: var(--epoch-color-ink);
      cursor: pointer;
      font: inherit;
      font-size: 0.78rem;
      font-weight: 600;
      padding: 0.15rem 0.5rem;
      pointer-events: auto;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);
    }
    .reaction:hover {
      border-color: #a8b8b0;
      background: #fff;
      color: var(--epoch-color-ink);
    }
    .reaction:active {
      background: var(--epoch-color-surface);
      box-shadow: none;
    }
    .reaction:focus-visible {
      outline: 2px solid var(--epoch-color-accent);
      outline-offset: 1px;
    }

    .message-action-tray {
      display: grid;
      gap: 0.55rem;
      margin-block-start: 0.35rem;
      padding: 0.6rem 0.65rem;
      border: 1px solid var(--epoch-color-line);
      border-radius: var(--epoch-radius-sm);
      background: #faf8f3;
    }
    .message-action-tray dl {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.55rem;
      margin: 0;
    }
    .message-action-tray dt {
      color: var(--epoch-color-muted);
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    .message-action-tray dd {
      margin: 0.15rem 0 0;
      font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
      font-size: 0.75rem;
      word-break: break-word;
    }
    .message-action-tray button,
    .composer button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 2rem;
      border: 1px solid var(--epoch-color-ink);
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-ink);
      color: #fff;
      cursor: pointer;
      font: inherit;
      font-size: 0.82rem;
      font-weight: 600;
      padding: 0.35rem 0.7rem;
    }
    .message-action-tray button:hover,
    .composer button:hover {
      filter: brightness(1.08);
    }
    .message-action-tray button:active,
    .composer button:active {
      filter: brightness(0.96);
    }
    .message-action-tray button:not([data-action="intent"]) {
      border-color: #9eaea5;
      background: #fff;
      color: var(--epoch-color-ink);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
    }
    .message-action-tray button:not([data-action="intent"]):hover {
      border-color: var(--epoch-color-ink);
      background: var(--epoch-color-surface);
      filter: none;
    }
    .message-action-tray button[data-action="intent"] {
      background: var(--epoch-color-teal);
      border-color: #275f5c;
    }
    .message-action-tray button[data-action="intent"]:hover {
      background: #356f6c;
      filter: none;
    }
    .action-status {
      margin: 0;
      color: var(--epoch-color-muted);
      font-size: 0.84rem;
    }

    .composer {
      display: grid;
      gap: 0.35rem;
      padding: 0.65rem 1.15rem 0.85rem;
      border-block-start: 1px solid var(--epoch-color-line);
      background: var(--epoch-color-surface-raised);
    }
    .composer-label {
      color: var(--epoch-color-muted);
      font-size: 0.78rem;
      font-weight: 600;
    }
    .composer textarea {
      width: 100%;
      min-height: 2.75rem;
      resize: vertical;
      border: 1px solid var(--epoch-color-line);
      border-radius: var(--epoch-radius-sm);
      background: #fff;
      color: var(--epoch-color-ink);
      font: inherit;
      line-height: 1.45;
      padding: 0.55rem 0.65rem;
    }
    .composer-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      color: var(--epoch-color-muted);
      font-size: 0.76rem;
    }
    .composer button {
      min-height: 1.9rem;
      padding: 0.3rem 0.7rem;
      font-size: 0.82rem;
    }

    .artifact-list {
      margin: 0;
      padding: 0.75rem 1.15rem 1rem;
      overflow-y: auto;
      list-style: none;
      display: grid;
      align-content: start;
      gap: 0.45rem;
    }
    .artifact-item {
      display: grid;
      gap: 0.12rem;
      padding: 0.55rem 0;
      border-block-end: 1px solid var(--epoch-color-line);
      background: transparent;
    }
    .artifact-item:last-child {
      border-block-end: 0;
    }
    .artifact-id {
      color: var(--epoch-color-teal);
      font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .artifact-item strong {
      color: var(--epoch-color-ink);
      font-size: 0.94rem;
    }
    .artifact-meta,
    .artifact-labels {
      color: var(--epoch-color-muted);
      font-size: 0.8rem;
    }
    .artifact-empty {
      color: var(--epoch-color-muted);
      font-weight: 600;
    }
    .artifact-actions {
      margin-top: 0.35rem;
    }
    .thread-comments {
      display: grid;
      gap: 0.35rem;
      margin: 0.2rem 0 0.1rem;
      padding: 0.45rem 0.55rem;
      border-left: 2px solid var(--epoch-color-line);
      background: var(--epoch-color-surface);
    }
    .thread-comment {
      color: #3a423d;
      font-size: 0.86rem;
      line-height: 1.4;
    }
    .thread-comment strong {
      color: var(--epoch-color-ink);
      font-weight: 700;
      margin-inline-end: 0.3rem;
    }

    #community-content section[aria-label="Epoch site history"] {
      margin: 0.75rem 1.15rem 1rem;
      padding: 0.75rem 0.85rem;
      border: 1px solid var(--epoch-color-line);
      border-radius: var(--epoch-radius-md);
      background: var(--epoch-color-mint);
    }
    #community-content section[aria-label="Epoch site history"] h2 {
      margin: 0 0 0.3rem;
      font-size: 0.95rem;
    }
    #community-content section[aria-label="Epoch site history"] p,
    #community-content section[aria-label="Epoch site history"] dl {
      margin: 0;
      color: #3a423d;
      font-size: 0.84rem;
    }

    @media (max-width: 800px) {
      #epoch-community {
        grid-template-columns: 1fr;
        height: auto;
        min-height: 100vh;
      }
      .channel-rail {
        border-inline-end: 0;
        border-block-end: 1px solid #24302b;
      }
      .channel-list { max-height: 10rem; }
      .feed-shell { min-height: 70vh; }
      .message-action-tray dl { grid-template-columns: 1fr; }
    }

    @media (prefers-reduced-motion: reduce) {
      * {
        animation: none !important;
        transition: none !important;
      }
    }`;
}

