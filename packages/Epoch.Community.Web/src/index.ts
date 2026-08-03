import { copyFileSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { EntityType, EpochRepository, type Event } from "@epoch/core";
import type {
  CommunityClient,
  CommunityRepository,
  CommunityWorkflow,
  CommunityWorkflowId,
} from "@epoch/community-core";

const SNAPSHOT_COMMUNITY_RECOVERY_MESSAGE = "Snapshot communities — channels belong to the community (not a repo). To promote signed work, reconnect EPOCH_COMMUNITY_API_URL, reload this page, then retry the action.";

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
      themeColor: "#0f1614",
      backgroundColor: "#f3f6f4",
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
  const spaces = buildCommunitySpaces(app.repositories);
  const devFeed = buildDevFeed({
    repositories: app.repositories,
    apiConnected: app.apiBaseUrl !== undefined,
  });
  const conversations = feed.conversations;
  const live = app.apiBaseUrl !== undefined;
  const snapshotMode = feed.source === "snapshot";
  const primaryRepo = app.repositories[0]?.slug ?? "epoch/epoch";
  const activeCommunity = spaces[0];
  const activeCommunityId = activeCommunity?.id ?? "epoch-civic";
  const defaultChannel = activeCommunity?.channels[0]?.id ?? "general";
  const communityConversations = conversations.filter((item) => item.communityId === activeCommunityId);
  const followingItems = filterDevFeedItems(devFeed.items, "following");
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
  <main id="epoch-community" data-design-system="epoch-community" data-community-web-shell data-product-mode="community" data-active-community="${escapeHtml(activeCommunityId)}" data-api-state="${live ? "connected" : "offline"}" data-feed-source="${feed.source}" data-dev-feed-source="${devFeed.source}">
    <aside class="channel-rail" data-community-channel-rail aria-label="Community navigation">
      <a class="brand" href="${escapeHtml(app.pwa.startUrl)}" translate="no" aria-label="${escapeHtml(app.pwa.name)}">
        <span class="brand-mark" aria-hidden="true">EC</span>
        <span class="brand-text">
          <span class="brand-name">Epoch</span>
          <span class="brand-sub" data-brand-sub>${escapeHtml(activeCommunity?.name ?? "Communities")}</span>
        </span>
      </a>
      <nav class="surface-list product-mode-list" aria-label="Discovery">
        <button class="surface-button" type="button" data-product-mode="network" aria-pressed="false">Network Feed</button>
      </nav>
      <div class="rail-section-label">Communities</div>
      <nav class="community-list" data-community-list aria-label="Communities">
        ${spaces.map((space) => `
        <button class="channel-button community-button" type="button" data-open-community="${escapeHtml(space.id)}" aria-pressed="${space.id === activeCommunityId ? "true" : "false"}">
          <span class="channel-button-label">${escapeHtml(space.name)}</span>
          <span class="channel-count">${space.channels.length}</span>
        </button>`).join("")}
      </nav>
      <div class="community-workspace-chrome" data-community-workspace-chrome>
        <div class="rail-section-label">Channels</div>
        <nav class="channel-list" data-channel-list aria-label="Community channels">
          ${(activeCommunity?.channels ?? communityChannels).map((channel) =>
            renderChannelButton(channel, communityConversations, channel.id === defaultChannel),
          ).join("")}
        </nav>
        <div class="rail-section-label">Agents</div>
        <nav class="agent-list" data-agent-list aria-label="Member agents">
          ${defaultCommunityAgents
            .filter((agent) => agent.communityIds.includes(activeCommunityId))
            .map((agent) => {
              const kind = agent.sessionKind === "live" ? "live" : "sample";
              const statusLabel = `${kind} · ${agent.status}`;
              return `
        <button class="channel-button agent-member" type="button" data-agent-member="${escapeHtml(agent.id)}" data-agent-status="${escapeHtml(agent.status)}" data-agent-session-kind="${escapeHtml(kind)}" aria-label="Member agent ${escapeHtml(agent.displayName)}, harness ${escapeHtml(agent.harness)}, ${escapeHtml(statusLabel)}">
          <span class="channel-button-label">@${escapeHtml(agent.displayName)}</span>
          <span class="agent-meta">${escapeHtml(agent.harness)} · ${escapeHtml(statusLabel)}</span>
        </button>`;
            }).join("") || `
        <p class="agent-list-empty">No member agents in this community yet.</p>`}
        </nav>
        <div class="rail-section-label">Linked projects</div>
        <nav class="repo-list" data-repo-list aria-label="Linked repositories">
          ${(activeCommunity?.linkedRepos ?? [primaryRepo]).map((slug) => {
            const repo = app.repositories.find((item) => item.slug === slug);
            const count = repo?.issues.length ?? 0;
            return `
        <button class="channel-button repo-button" type="button" data-open-repo="${escapeHtml(slug)}" aria-pressed="false">
          <span class="channel-button-label">${escapeHtml(slug)}</span>
          <span class="channel-count">${count}</span>
        </button>`;
          }).join("")}
        </nav>
        <nav class="surface-list repo-surface-list" data-repo-surfaces hidden aria-label="Repository surfaces">
          <button class="surface-button" type="button" data-surface="issues" aria-pressed="false">Issues <span class="channel-count">${feed.issues.length}</span></button>
          <button class="surface-button" type="button" data-surface="changes" aria-pressed="false">Changes <span class="channel-count">${feed.changes.length}</span></button>
        </nav>
      </div>
      <div class="rail-status" aria-live="polite">
        <span class="status-dot ${live && !snapshotMode ? "" : "status-dot-muted"}" aria-hidden="true"></span>
        <span data-connection-label>${live ? (snapshotMode ? "Live · empty" : "Live · communities") : "Snapshot · communities"}</span>
      </div>
    </aside>
    <section id="community-content" class="feed-shell" aria-labelledby="community-title">
      <header class="feed-header">
        <div class="feed-heading">
          <h1 id="community-title">${escapeHtml(activeCommunity?.name ?? "Community")}</h1>
          <p class="feed-repo" data-context-sub># ${escapeHtml(defaultChannel)} · community channel</p>
        </div>
        <div class="repository-meta" data-header-meta role="status" aria-label="Community state">
          <span class="identity-chip" data-identity-chip title="Portable ATProto identity (session)">
            <span class="identity-handle">@maya.epoch.community</span>
            <span class="identity-did">did:plc:maya</span>
          </span>
          <span class="meta-sep" aria-hidden="true"></span>
          <span>${spaces.length} communities</span>
          <span class="meta-sep" aria-hidden="true"></span>
          <span>${(activeCommunity?.channels.length ?? 0)} channels</span>
          <span class="meta-sep" aria-hidden="true"></span>
          <span data-atproto-status>${live ? "atproto:live" : "atproto:snapshot"}</span>
        </div>
      </header>
      ${renderCommunityHonestyBanner(live, snapshotMode)}
      <div class="surface-stage" data-surface-panel="network" hidden>
        <div class="feed-tabs" role="tablist" aria-label="Network Dev Feed tabs">
          <button class="feed-tab" type="button" role="tab" data-feed-tab="following" aria-selected="true">Following</button>
          <button class="feed-tab" type="button" role="tab" data-feed-tab="network" aria-selected="false">Network</button>
          <button class="feed-tab" type="button" role="tab" data-feed-tab="contributions" aria-selected="false">Contributions</button>
        </div>
        <ol class="dev-feed" data-dev-feed aria-label="Network Dev Feed">
          ${followingItems.map(renderDevFeedItem).join("") || emptyDevFeedItem("No followed activity yet.")}
        </ol>
      </div>
      <div class="feed-toolbar" role="group" aria-label="Current channel" data-channel-toolbar>
        <span class="channel-name" data-current-channel># ${escapeHtml(defaultChannel)}</span>
        <span class="channel-topic" data-current-topic>${escapeHtml(activeCommunity?.channels.find((c) => c.id === defaultChannel)?.topic ?? "Community conversation")}</span>
        <span class="members-strip" data-members-strip role="status" aria-label="Community members">
          <span class="members-label">Members</span>
          <span class="member-pill" title="maya">MY</span>
          <span class="member-pill" title="lea">LE</span>
          <span class="member-pill" title="ren">RE</span>
          <span class="member-pill" title="nora">NO</span>
          <span class="members-count" data-members-count>4 here · presence is sample/session</span>
        </span>
      </div>
      <div class="surface-stage" data-surface-panel="channels">
        <ol class="message-feed" data-message-feed aria-label="Community channel messages">
          ${conversations.map((conversation) => renderConversation(conversation, defaultChannel, activeCommunityId)).join("")}
        </ol>
        <form class="composer" data-comment-composer aria-label="Write a community message">
          <label class="composer-label" for="community-message">Message #${escapeHtml(defaultChannel)}</label>
          <textarea id="community-message" name="message" rows="2" data-composer-input placeholder="Write a message in this community channel"></textarea>
          <div class="composer-row">
            <span data-composer-meta>Signed as @maya · ${escapeHtml(activeCommunity?.name ?? "community")}</span>
            <span class="agent-working-status" data-agent-working-status role="status" aria-live="polite"></span>
            <button class="composer-share" type="button" data-share-ship>Share a ship</button>
            <button type="submit">Send</button>
          </div>
        </form>
      </div>
      <div class="surface-stage" data-surface-panel="issues" hidden>
        <div class="feed-toolbar artifact-toolbar">
          <span class="channel-name">Issues</span>
          <span class="channel-topic">Linked repository issues (forge list, not community hangout).</span>
        </div>
        <ol class="artifact-list" data-issue-list aria-label="Issue list">
          ${feed.issues.map(renderIssueListItem).join("") || emptyArtifactItem("No open issues in linked repositories.")}
        </ol>
      </div>
      <div class="surface-stage" data-surface-panel="changes" hidden>
        <div class="feed-toolbar artifact-toolbar">
          <span class="channel-name">Changes</span>
          <span class="channel-topic">Change proposals for linked repositories.</span>
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
    devFeedItems: devFeed.items,
    devFeedSource: devFeed.source,
    communities: spaces,
    productMode: "community",
    activeCommunity: activeCommunityId,
    activeRepo: primaryRepo,
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

export type CommunityChannelId =
  | "general"
  | "showcase"
  | "support"
  | "ideas"
  | "bugs"
  | "agent-runs"
  | "previews"
  | "governance";
export type CommunityFeedSource = "api" | "snapshot";
/** network = cross-community Dev Feed; community = Discord-like space; repo = linked project forge lists */
export type ProductMode = "network" | "community" | "repo";
export type DevFeedTab = "following" | "network" | "contributions" | "community";
export type DevFeedKind =
  | "follow"
  | "star"
  | "repo_create"
  | "release"
  | "issue_open"
  | "proposal"
  | "review"
  | "intent"
  | "agent_run"
  | "contribution"
  | "community_post";
export type CommunityChannelKind = "social" | "work";

interface CommunityChannel {
  readonly id: CommunityChannelId;
  readonly label: string;
  readonly topic: string;
  readonly kind: CommunityChannelKind;
}

/** Discord-analog: a community owns channels; repos are optional linked projects. */
export interface CommunitySpace {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string;
  readonly channels: readonly CommunityChannel[];
  readonly linkedRepos: readonly string[];
}

export interface DevFeedActor {
  readonly handle: string;
  readonly displayName?: string;
  readonly did?: string;
  readonly role?: string;
}

export interface DevFeedObject {
  readonly type: "repo" | "issue" | "proposal" | "actor" | "release";
  readonly label: string;
  readonly hrefHint?: string;
}

export interface DevFeedItem {
  readonly id: string;
  readonly kind: DevFeedKind;
  readonly actor: DevFeedActor;
  readonly verb: string;
  readonly object?: DevFeedObject;
  readonly body?: string;
  readonly repoSlug?: string;
  readonly channelHint?: CommunityChannelId;
  readonly trust: {
    readonly sig?: string;
    readonly anchor?: string;
    readonly atUri?: string;
    readonly source: "api" | "atproto" | "snapshot";
  };
  readonly createdAt: string;
  readonly tabs: readonly DevFeedTab[];
}

export interface DevFeedBuildResult {
  readonly source: CommunityFeedSource;
  readonly items: readonly DevFeedItem[];
  readonly followingHandles: readonly string[];
}

export interface CommunityConversationView {
  readonly id: string;
  readonly channel: CommunityChannelId;
  /** Community that owns this channel conversation (Discord-like). */
  readonly communityId: string;
  /** Optional linked repo when the message is forge-backed. */
  readonly repositorySlug?: string;
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
  /** Buzz-aligned: ACP harness id when author is a member agent. */
  readonly harness?: string;
  /** Buzz-aligned: human manager of a member agent ("managed by"). */
  readonly managedBy?: string;
  /** Optional signed intent id for agent work receipts. */
  readonly intentId?: string;
  /** Optional in-channel artifact card label (e.g. PR title). */
  readonly artifactCard?: string;
}

/** First-class channel member that is an AI agent (Buzz "agents as members"). */
export interface CommunityAgentMember {
  readonly id: string;
  readonly displayName: string;
  readonly harness: string;
  readonly managedBy: string;
  readonly scope: string;
  readonly status: "idle" | "working" | "needs-review";
  /**
   * `sample` = seed/demo membership (never claim live ACP Working).
   * `live` = real harness session (only then may UI assert live Working).
   */
  readonly sessionKind: "sample" | "live";
  readonly communityIds: readonly string[];
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

const defaultWorkChannels: readonly CommunityChannel[] = [
  { id: "support", label: "support", kind: "work", topic: "Get unstuck, accept answers, and turn repeated help into docs patches." },
  { id: "ideas", label: "ideas", kind: "work", topic: "Shape product ideas into signed intents, previews, and reviewable patches." },
  { id: "bugs", label: "bugs", kind: "work", topic: "Reproduce defects and connect reports to patches without losing context." },
  { id: "agent-runs", label: "agent-runs", kind: "work", topic: "Watch policy-bound agents propose work while humans keep merge authority." },
  { id: "previews", label: "previews", kind: "work", topic: "Review deploy previews, visual results, and release readiness in one thread." },
  { id: "governance", label: "governance", kind: "work", topic: "Handle moderation, legal hold, witnesses, and signed release trust." },
];

const defaultSocialChannels: readonly CommunityChannel[] = [
  { id: "general", label: "general", kind: "social", topic: "Day-to-day community hangout — independent of any single repository." },
  { id: "showcase", label: "showcase", kind: "social", topic: "Share demos, screenshots, and wins with the community." },
];

const defaultCommunityAgents: readonly CommunityAgentMember[] = [
  {
    id: "agent-ui-reviewer",
    displayName: "ui-reviewer",
    harness: "claude-code",
    managedBy: "maya",
    scope: "copy + tests only",
    status: "needs-review",
    sessionKind: "sample",
    communityIds: ["epoch-civic", "agent-guild"],
  },
  {
    id: "agent-scout",
    displayName: "scout",
    harness: "goose",
    managedBy: "lea",
    scope: "read history + draft plans",
    status: "working",
    sessionKind: "sample",
    communityIds: ["epoch-civic", "agent-guild"],
  },
  {
    id: "agent-patcher",
    displayName: "patcher",
    harness: "codex",
    managedBy: "maya",
    scope: "open draft PRs under policy",
    status: "idle",
    sessionKind: "sample",
    communityIds: ["agent-guild", "epoch-civic"],
  },
];

/** @deprecated use community space channels; kept as union of defaults for label maps */
const communityChannels: readonly CommunityChannel[] = [
  ...defaultSocialChannels,
  ...defaultWorkChannels,
];

/**
 * Build first-class communities (Discord servers analog).
 * Channels belong to the community; repositories are linked projects.
 */
export function buildCommunitySpaces(
  repositories: readonly CommunityRepository[],
): readonly CommunitySpace[] {
  const slugs = repositories.map((repo) => repo.slug);
  const primary = slugs[0] ?? "epoch/epoch";
  const secondary = slugs[1];
  return [
    {
      id: "epoch-civic",
      name: "Epoch Civic Workshop",
      slug: "epoch-civic",
      description: "Signed civic hangout for maintainers, contributors, and agents — community channels first, linked repos second.",
      channels: [...defaultSocialChannels, ...defaultWorkChannels],
      linkedRepos: secondary ? [primary, secondary] : [primary],
    },
    {
      id: "agent-guild",
      name: "Agent Guild",
      slug: "agent-guild",
      description: "Community for policy-bound agents, human review culture, and agent-run showcases.",
      channels: [
        { id: "general", label: "general", kind: "social", topic: "Agent operators and reviewers hang out here." },
        { id: "showcase", label: "showcase", kind: "social", topic: "Show agent runs, traces, and demos." },
        { id: "agent-runs", label: "agent-runs", kind: "work", topic: "Active agent runs awaiting human review." },
        { id: "ideas", label: "ideas", kind: "work", topic: "Agent product ideas promoted toward signed intents." },
        { id: "governance", label: "governance", kind: "work", topic: "Agent policy, hold, and witness discussion." },
      ],
      linkedRepos: [primary],
    },
  ];
}

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
  if (normalized.includes("showcase") || normalized.includes("demo")) {
    return "showcase";
  }
  return "support";
}

export function defaultCommunityIdForRepo(
  spaces: readonly CommunitySpace[],
  repoSlug: string,
): string {
  const match = spaces.find((space) => space.linkedRepos.includes(repoSlug));
  return match?.id ?? spaces[0]?.id ?? "epoch-civic";
}

/**
 * Build the network Dev Feed (ATProto-style contribution timeline).
 * Combines repository activity with social graph verbs (follow/star/create/release).
 * When API-connected with activity, contribution events are live; social verbs may
 * still include an honest snapshot/AT sample so the network plane is never empty-looking
 * without labeling.
 */
export function buildDevFeed(options: BuildCommunityFeedOptions): DevFeedBuildResult {
  const repoFeed = buildCommunityFeed(options);
  const contributionItems = contributionDevFeedItems(options.repositories, repoFeed.source);
  const socialItems = socialDevFeedItems(options.repositories, repoFeed.source);
  const items = [...socialItems, ...contributionItems].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  return {
    source: repoFeed.source,
    items,
    followingHandles: ["maya", "nora", "lea", "ren", "sam"],
  };
}

export function filterDevFeedItems(
  items: readonly DevFeedItem[],
  tab: DevFeedTab,
): readonly DevFeedItem[] {
  return items.filter((item) => item.tabs.includes(tab));
}

function contributionDevFeedItems(
  repositories: readonly CommunityRepository[],
  source: CommunityFeedSource,
): readonly DevFeedItem[] {
  const issueItems = repositories.flatMap((repo) =>
    repo.issues.map((issue, index) => ({
      id: `dev-issue-${repo.slug}-${issue.id}`,
      kind: "issue_open" as const,
      actor: { handle: issue.author, role: "contributor" },
      verb: "opened",
      object: { type: "issue" as const, label: `${issue.id}: ${issue.title}`, hrefHint: issue.id },
      body: issue.body.slice(0, 180) || undefined,
      repoSlug: repo.slug,
      channelHint: channelForIssue(issue.labels),
      trust: {
        sig: `sig:${issue.id.toLowerCase()}`,
        anchor: `issue:${issue.id}`,
        atUri: source === "api" ? `at://did:plc:demo/org.epoch.issue/${issue.id}` : undefined,
        source: source === "api" ? "api" as const : "snapshot" as const,
      },
      createdAt: `2026-08-01T1${index % 6}:1${index % 9}:00Z`,
      tabs: ["following", "network", "contributions"] as const,
    })),
  );
  const proposalItems = repositories.flatMap((repo) =>
    repo.changeProposals.map((proposal, index) => ({
      id: `dev-change-${repo.slug}-${proposal.id}`,
      kind: "proposal" as const,
      actor: { handle: proposal.author, role: "contributor" },
      verb: "proposed",
      object: { type: "proposal" as const, label: `${proposal.id}: ${proposal.title}`, hrefHint: proposal.id },
      body: proposal.body.slice(0, 180) || undefined,
      repoSlug: repo.slug,
      channelHint: "previews" as const,
      trust: {
        sig: `sig:${proposal.id.toLowerCase()}`,
        anchor: `change:${proposal.id}`,
        atUri: source === "api" ? `at://did:plc:demo/org.epoch.proposal/${proposal.id}` : undefined,
        source: source === "api" ? "api" as const : "snapshot" as const,
      },
      createdAt: `2026-08-01T1${(index + 2) % 6}:2${index % 9}:00Z`,
      tabs: ["following", "network", "contributions"] as const,
    })),
  );
  const agentItems = repositories.flatMap((repo) =>
    repo.issues
      .filter((issue) => issue.labels.some((label) => label.toLowerCase().includes("agent")))
      .map((issue, index) => ({
        id: `dev-agent-${repo.slug}-${issue.id}`,
        kind: "agent_run" as const,
        actor: { handle: "agent-ui-reviewer", role: "agent" },
        verb: "posted a run for",
        object: { type: "issue" as const, label: issue.id, hrefHint: issue.id },
        body: "Policy-bound agent work requires human review before merge.",
        repoSlug: repo.slug,
        channelHint: "agent-runs" as const,
        trust: {
          sig: `sig:agent-${issue.id.toLowerCase()}`,
          anchor: `agent-run://${issue.id}`,
          source: source === "api" ? "api" as const : "snapshot" as const,
        },
        createdAt: `2026-08-01T12:${30 + index}:00Z`,
        tabs: ["network", "contributions"] as const,
      })),
  );
  return [...issueItems, ...proposalItems, ...agentItems];
}

function socialDevFeedItems(
  repositories: readonly CommunityRepository[],
  source: CommunityFeedSource,
): readonly DevFeedItem[] {
  const primary = repositories[0]?.slug ?? "epoch/epoch";
  const secondary = repositories[1]?.slug ?? "epoch/community-kit";
  const trustSource = source === "api" ? "atproto" as const : "snapshot" as const;
  return [
    {
      id: "dev-star-lea-epoch",
      kind: "star",
      actor: { handle: "lea", did: "did:plc:lea", role: "contributor" },
      verb: "starred",
      object: { type: "repo", label: primary },
      repoSlug: primary,
      trust: {
        sig: "sig:star-lea",
        atUri: "at://did:plc:lea/org.epoch.feed.star/1",
        source: trustSource,
      },
      createdAt: "2026-08-01T14:20:00Z",
      tabs: ["following", "network"],
    },
    {
      id: "dev-follow-maya-nora",
      kind: "follow",
      actor: { handle: "maya", did: "did:plc:maya", role: "maintainer" },
      verb: "followed",
      object: { type: "actor", label: "@nora" },
      trust: {
        atUri: "at://did:plc:maya/org.epoch.graph.follow/nora",
        source: trustSource,
      },
      createdAt: "2026-08-01T14:05:00Z",
      tabs: ["following", "network"],
    },
    {
      id: "dev-create-maya-epoch",
      kind: "repo_create",
      actor: { handle: "maya", did: "did:plc:maya", role: "maintainer" },
      verb: "created",
      object: { type: "repo", label: primary },
      repoSlug: primary,
      body: "Event-driven DVCS for signed collaborative history.",
      trust: {
        sig: "sig:repo-create",
        atUri: "at://did:plc:maya/org.epoch.repo/epoch",
        source: trustSource,
      },
      createdAt: "2026-08-01T09:00:00Z",
      tabs: ["following", "network", "contributions"],
    },
    {
      id: "dev-release-maya",
      kind: "release",
      actor: { handle: "maya", did: "did:plc:maya", role: "maintainer" },
      verb: "released",
      object: { type: "release", label: "v0.2.0" },
      repoSlug: primary,
      body: "Signed artifacts with sha256 witnesses.",
      trust: {
        sig: "sig:release-0.2.0",
        anchor: "release://0.2.0",
        atUri: "at://did:plc:maya/org.epoch.release/0.2.0",
        source: trustSource,
      },
      createdAt: "2026-08-01T13:40:00Z",
      tabs: ["following", "network", "contributions"],
    },
    {
      id: "dev-star-sam-kit",
      kind: "star",
      actor: { handle: "sam", did: "did:plc:sam", role: "contributor" },
      verb: "starred",
      object: { type: "repo", label: secondary },
      repoSlug: secondary,
      trust: {
        atUri: "at://did:plc:sam/org.epoch.feed.star/kit",
        source: trustSource,
      },
      createdAt: "2026-08-01T13:10:00Z",
      tabs: ["network"],
    },
    {
      id: "dev-follow-ren-lea",
      kind: "follow",
      actor: { handle: "ren", did: "did:plc:ren", role: "contributor" },
      verb: "followed",
      object: { type: "actor", label: "@lea" },
      trust: {
        atUri: "at://did:plc:ren/org.epoch.graph.follow/lea",
        source: trustSource,
      },
      createdAt: "2026-08-01T12:50:00Z",
      tabs: ["network"],
    },
    {
      id: "dev-contribution-ren",
      kind: "contribution",
      actor: { handle: "ren", role: "contributor" },
      verb: "signed a contribution on",
      object: { type: "repo", label: primary },
      repoSlug: primary,
      body: "Patch event on preview keyboard focus.",
      trust: {
        sig: "sig:contrib-ren",
        anchor: "event://preview-focus",
        source: source === "api" ? "api" : "snapshot",
      },
      createdAt: "2026-08-01T12:15:00Z",
      tabs: ["following", "contributions"],
    },
  ];
}

/**
 * Build the repository channel feed from API-backed repository state when connected and
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

  const spaces = buildCommunitySpaces(options.repositories);
  if (options.apiConnected && hasApiActivity) {
    return {
      source: "api",
      conversations: [
        ...communitySocialConversations(spaces, "api"),
        ...agentMemberConversations(spaces, options.repositories[0]?.slug ?? "epoch/epoch", "api"),
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
    conversations: [
      ...communitySocialConversations(spaces, "snapshot"),
      ...agentMemberConversations(spaces, repository?.slug ?? "epoch/epoch", "snapshot"),
      ...snapshotConversations(repository),
    ],
    issues,
    changes,
  };
}

/** Buzz-aligned multi-agent handoff samples (member agents, harness, intent receipts). */
function agentMemberConversations(
  spaces: readonly CommunitySpace[],
  slug: string,
  source: CommunityFeedSource,
): readonly CommunityConversationView[] {
  const communityId = spaces[0]?.id ?? "epoch-civic";
  const guildId = spaces.find((space) => space.id === "agent-guild")?.id ?? communityId;
  return [
    {
      id: "agent-handoff-scout",
      channel: "agent-runs",
      communityId,
      repositorySlug: slug,
      author: "scout",
      role: "agent",
      title: "Scout: incident memory pass for install-cache failures",
      body: "@patcher I searched six months of #support + linked issues. Root themes: stale sandbox resume, cache path drift after view switch. Draft plan posted; waiting for scoped implementation.",
      time: "10:01",
      anchor: "agent-run://scout/201",
      signature: "sig:agent-scout-201",
      visibility: "community",
      state: "handoff",
      reactions: ["receipts"],
      linkedArtifact: "intent://install-cache-hardening",
      source,
      harness: "goose",
      managedBy: "lea",
      intentId: "intent-install-cache",
      artifactCard: "Intent · install-cache-hardening",
    },
    {
      id: "agent-handoff-patcher",
      channel: "agent-runs",
      communityId,
      repositorySlug: slug,
      author: "patcher",
      role: "agent",
      title: "Patcher: draft PR for install-cache hardening",
      body: "@scout plan accepted under policy. Opened a draft change with tests only; @maya human review still required before promote.",
      time: "10:02",
      anchor: "agent-run://patcher/202",
      signature: "sig:agent-patcher-202",
      visibility: "community",
      state: "needs review",
      reactions: ["tests passed"],
      linkedArtifact: "change://install-cache-hardening",
      linkedProposalId: "CHANGE-install-cache",
      source,
      harness: "codex",
      managedBy: "maya",
      intentId: "intent-install-cache",
      artifactCard: "Epoch · draft change CHANGE-install-cache",
    },
    {
      id: "agent-preview-copy",
      channel: "agent-runs",
      communityId: guildId,
      repositorySlug: slug,
      author: "ui-reviewer",
      role: "agent",
      title: "ui-reviewer drafted copy cleanup for preview card",
      body: "Policy allows copy and test updates only. Human review is still required before merge. Intent linked for receipts.",
      time: "10:03",
      anchor: "agent-run://ui-reviewer/173",
      signature: "sig:agent-173",
      visibility: "maintainers",
      state: "needs review",
      reactions: ["tests passed"],
      linkedArtifact: "preview-173",
      source,
      harness: "claude-code",
      managedBy: "maya",
      intentId: "intent-preview-copy",
      artifactCard: "Intent · preview-copy-cleanup",
    },
  ];
}

function apiIssueConversations(
  repositories: readonly CommunityRepository[],
): readonly CommunityConversationView[] {
  const spaces = buildCommunitySpaces(repositories);
  return repositories.flatMap((repo) =>
    repo.issues.map((issue) => ({
      id: `issue-${issue.id}`,
      channel: channelForIssue(issue.labels),
      communityId: defaultCommunityIdForRepo(spaces, repo.slug),
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
  const spaces = buildCommunitySpaces(repositories);
  return repositories.flatMap((repo) =>
    repo.changeProposals.map((proposal) => ({
      id: `change-${proposal.id}`,
      channel: "previews" as const,
      communityId: defaultCommunityIdForRepo(spaces, repo.slug),
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

/** Social community messages that do not require a repository (Discord #general / #showcase). */
function communitySocialConversations(
  spaces: readonly CommunitySpace[],
  source: CommunityFeedSource,
): readonly CommunityConversationView[] {
  return spaces.flatMap((space) => {
    const items: CommunityConversationView[] = [];
    if (space.channels.some((channel) => channel.id === "general")) {
      items.push({
        id: `${space.id}-general-welcome`,
        channel: "general",
        communityId: space.id,
        author: "maya",
        role: "maintainer",
        title: `Welcome to ${space.name}`,
        body: "This channel is the community hangout — no repository required. Link a project only when conversation becomes signed work.",
        time: "09:05",
        anchor: `community://${space.slug}/general`,
        signature: `sig:${space.slug}-welcome`,
        visibility: "community",
        state: "open",
        reactions: ["wave", "follow"],
        source,
      });
    }
    if (space.channels.some((channel) => channel.id === "showcase")) {
      items.push({
        id: `${space.id}-showcase-demo`,
        channel: "showcase",
        communityId: space.id,
        author: "lea",
        role: "contributor",
        title: "Shipped a calmer dual-plane shell",
        body: "Community channels first, linked repos second. Dropping a preview for folks hanging out here.",
        time: "11:22",
        anchor: `community://${space.slug}/showcase`,
        signature: `sig:${space.slug}-showcase`,
        visibility: "community",
        state: "open",
        reactions: ["nice", "follow"],
        source,
      });
    }
    return items;
  });
}

function snapshotConversations(
  repository: CommunityRepository | undefined,
): readonly CommunityConversationView[] {
  const slug = repository?.slug ?? "epoch/epoch";
  const maintainer = repository?.maintainers[0] ?? "maya";
  const communityId = "epoch-civic";
  return [
    {
      id: "idea-region-revenue",
      channel: "ideas",
      communityId,
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
      communityId,
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
      id: "preview-region-widget",
      channel: "previews",
      communityId,
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
      communityId,
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

function renderCommunityHonestyBanner(live: boolean, snapshotMode: boolean): string {
  if (!live) {
    return `<p class="api-banner" data-api-unconfigured data-feed-honesty="snapshot">${escapeHtml(SNAPSHOT_COMMUNITY_RECOVERY_MESSAGE)}</p>`;
  }
  if (snapshotMode) {
    return `<p class="api-banner" data-api-empty data-feed-honesty="live-empty">Live API connected. Community channels are ready; linked-repo activity will appear when issues/changes arrive.</p>`;
  }
  return `<p class="api-banner api-banner-live" data-feed-honesty="live">Live community — social channels are community-owned; linked projects add issues, changes, and signed intents.</p>`;
}

function emptyDevFeedItem(message: string): string {
  return `<li class="dev-feed-item dev-feed-empty"><p>${escapeHtml(message)}</p></li>`;
}

function renderDevFeedItem(item: DevFeedItem): string {
  const objectHtml = item.object
    ? item.object.type === "repo" || item.object.type === "issue" || item.object.type === "proposal"
      ? `<button class="dev-feed-object" type="button" data-feed-open-repo="${escapeHtml(item.repoSlug ?? "")}" data-feed-channel="${escapeHtml(item.channelHint ?? "")}" data-feed-issue="${escapeHtml(item.object.type === "issue" ? item.object.hrefHint ?? "" : "")}" data-feed-change="${escapeHtml(item.object.type === "proposal" ? item.object.hrefHint ?? "" : "")}">${escapeHtml(item.object.label)}</button>`
      : `<span class="dev-feed-object-text">${escapeHtml(item.object.label)}</span>`
    : "";
  const trustBits = [
    item.trust.sig ? escapeHtml(item.trust.sig) : "",
    item.trust.anchor ? escapeHtml(item.trust.anchor) : "",
    item.trust.atUri ? escapeHtml(item.trust.atUri) : "",
    `src:${item.trust.source}`,
  ].filter(Boolean);
  const openRepo = item.repoSlug
    ? `<button class="dev-feed-action" type="button" data-feed-open-repo="${escapeHtml(item.repoSlug)}" data-feed-channel="${escapeHtml(item.channelHint ?? "ideas")}">Open workspace</button>`
    : "";
  const channelHint = item.channelHint
    ? `<button class="dev-feed-action" type="button" data-feed-open-repo="${escapeHtml(item.repoSlug ?? "")}" data-feed-channel="${escapeHtml(item.channelHint)}">Open #${escapeHtml(item.channelHint)}</button>`
    : "";
  return `<li class="dev-feed-item" data-dev-feed-item data-kind="${escapeHtml(item.kind)}" data-tabs="${escapeHtml(item.tabs.join(","))}">
    <div class="avatar" aria-hidden="true">${escapeHtml(initials(item.actor.handle))}</div>
    <article class="dev-feed-body">
      <header class="dev-feed-meta">
        <strong class="dev-feed-handle">@${escapeHtml(item.actor.handle)}</strong>
        <span class="dev-feed-verb">${escapeHtml(item.verb)}</span>
        ${objectHtml}
        <time datetime="${escapeHtml(item.createdAt)}">${escapeHtml(formatFeedTime(item.createdAt))}</time>
      </header>
      ${item.body ? `<p>${escapeHtml(item.body)}</p>` : ""}
      <footer class="dev-feed-trust">${trustBits.map((bit) => `<span>${bit}</span>`).join("")}</footer>
      <div class="dev-feed-actions">${openRepo}${channelHint}</div>
    </article>
  </li>`;
}

function formatFeedTime(iso: string): string {
  const hour = iso.slice(11, 16);
  return hour || "now";
}

function initials(handle: string): string {
  return handle
    .split(/[^a-zA-Z0-9]+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2) || "?";
}

function renderChannelButton(
  channel: CommunityChannel,
  conversations: readonly CommunityConversationView[],
  selected = false,
): string {
  const count = conversations.filter((conversation) => conversation.channel === channel.id).length;
  return `<button class="channel-button" type="button" data-channel="${channel.id}" data-channel-kind="${channel.kind}" data-topic="${escapeHtml(channel.topic)}" aria-pressed="${selected ? "true" : "false"}">
    <span class="channel-button-label"># ${escapeHtml(channel.label)}</span>
    <span class="channel-count">${count}</span>
  </button>`;
}

function issueIdFromConversation(conversation: CommunityConversationView): string | undefined {
  if (conversation.id.startsWith("issue-")) {
    return conversation.id.slice("issue-".length);
  }
  return undefined;
}

function renderConversation(
  conversation: CommunityConversationView,
  activeChannel: CommunityChannelId = "general",
  activeCommunityId?: string,
): string {
  const inCommunity = activeCommunityId === undefined || conversation.communityId === activeCommunityId;
  const hidden = inCommunity && conversation.channel === activeChannel ? "" : " hidden";
  const linkedProposal = conversation.linkedProposalId === undefined
    ? ""
    : ` data-linked-proposal="${escapeHtml(conversation.linkedProposalId)}"`;
  const issueId = issueIdFromConversation(conversation);
  const issueAttr = issueId === undefined ? "" : ` data-issue-id="${escapeHtml(issueId)}"`;
  const changeId = conversation.id.startsWith("change-") ? conversation.id.slice("change-".length) : undefined;
  const changeAttr = changeId === undefined ? "" : ` data-change-id="${escapeHtml(changeId)}"`;
  const isAgent = conversation.role === "agent";
  const agentClass = isAgent ? " feed-message-agent" : "";
  const harnessBadge = conversation.harness
    ? `<span class="agent-harness" data-agent-harness title="ACP harness">${escapeHtml(conversation.harness)}</span>`
    : "";
  const managedBy = conversation.managedBy
    ? `<span class="agent-managed-by" data-agent-managed-by>managed by @${escapeHtml(conversation.managedBy)}</span>`
    : "";
  const artifactCard = conversation.artifactCard
    ? `<div class="message-artifact-card" data-artifact-card>
        <span class="message-artifact-kind">${escapeHtml(isAgent ? "Agent receipt" : "Artifact")}</span>
        <strong>${escapeHtml(conversation.artifactCard)}</strong>
        ${conversation.intentId ? `<a class="message-artifact-link" href="#intent-${escapeHtml(conversation.intentId)}" data-intent-link="${escapeHtml(conversation.intentId)}">Open signed intent</a>` : ""}
      </div>`
    : "";
  return `<li class="feed-message${agentClass}" data-message data-channel="${conversation.channel}" data-community-id="${escapeHtml(conversation.communityId)}" data-message-id="${escapeHtml(conversation.id)}" data-feed-item-source="${conversation.source}" data-author-role="${escapeHtml(conversation.role)}"${issueAttr}${changeAttr}${linkedProposal}${hidden}>
    <button class="message-hitbox" type="button" data-select-message="${escapeHtml(conversation.id)}" aria-label="Open signed actions for ${escapeHtml(conversation.title)}"></button>
    <div class="avatar${isAgent ? " avatar-agent" : ""}" aria-hidden="true">${escapeHtml(initials(conversation.author))}</div>
    <article class="message-body">
      <header class="message-meta">
        <strong>${escapeHtml(conversation.author)}</strong>
        <span>${escapeHtml(isAgent ? "member agent" : conversation.role)}</span>
        ${harnessBadge}
        ${managedBy}
        <time>${escapeHtml(conversation.time)}</time>
        <span data-message-state>${escapeHtml(conversation.state)}</span>
        ${conversation.source === "snapshot" ? `<span data-snapshot-badge>snapshot sample</span>` : ""}
      </header>
      <h2>${escapeHtml(conversation.title)}</h2>
      <p>${escapeHtml(conversation.body)}</p>
      ${artifactCard}
      <footer class="message-footer">
        <span>${escapeHtml(conversation.anchor)}</span>
        <span>${escapeHtml(conversation.signature)}</span>
        <span>${escapeHtml(conversation.visibility)}</span>
        ${conversation.intentId ? `<span data-intent-meta>intent:${escapeHtml(conversation.intentId)}</span>` : ""}
        ${conversation.linkedProposalId === undefined ? "" : `<span data-proposal-link>proposal:${escapeHtml(conversation.linkedProposalId)}</span>`}
      </footer>
      <div class="reaction-row" aria-label="Reactions">
        ${conversation.reactions.map((reaction) => `<button type="button" class="reaction" data-reaction="${escapeHtml(reaction)}">${escapeHtml(reaction)}</button>`).join("")}
      </div>
      <div class="message-action-tray" data-message-actions hidden>
        <dl>
          <div><dt>Anchor</dt><dd>${escapeHtml(conversation.anchor)}</dd></div>
          <div><dt>Signature</dt><dd>${escapeHtml(conversation.signature)}</dd></div>
          <div><dt>Artifact</dt><dd data-tray-artifact>${escapeHtml(conversation.linkedArtifact ?? conversation.repositorySlug ?? conversation.communityId)}</dd></div>
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

function renderSiteHistory(history: CommunitySiteEpochHistory): string {
  return `<section aria-label="Epoch site history">
      <h2>This site is built with Epoch</h2>
      <p>Branchable site changes are recorded as signed Epoch events before the Community site is materialized for deployment.</p>
      <dl class="site-history-facts">
        <div class="site-history-fact"><dt>Current view</dt><dd>${escapeHtml(history.currentView)}</dd></div>
        <div class="site-history-fact"><dt>Version</dt><dd>${escapeHtml(history.latestVersion.name)}</dd></div>
        <div class="site-history-fact"><dt>Rollback target</dt><dd>${escapeHtml(history.rollbackTarget.versionId)}</dd></div>
        <div class="site-history-fact"><dt>Verification</dt><dd>${history.verifyProblems.length === 0 ? "passed" : escapeHtml(history.verifyProblems.join(", "))}</dd></div>
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
        ? { conversations: [], repositories: [], issues: [], changes: [], feedSource: "snapshot", devFeedItems: [], communities: [], productMode: "community", activeCommunity: "epoch-civic", activeRepo: "epoch/epoch" }
        : JSON.parse(stateElement.textContent || "{}");
      let activeChannel = "general";
      let selectedMessage = null;
      let productMode = state.productMode || "community";
      let activeFeedTab = "following";
      let activeCommunity = state.activeCommunity || (state.communities && state.communities[0] && state.communities[0].id) || "epoch-civic";
      let activeRepo = state.activeRepo || (state.repositories && state.repositories[0] && state.repositories[0].slug) || "epoch/epoch";
      const actor = "maya";
      /** Session drafts keyed by communityId + channel — Slack/Discord power-user expectation (BUG-18). */
      const composerDrafts = new Map();

      const feed = document.querySelector("[data-message-feed]");
      const devFeedList = document.querySelector("[data-dev-feed]");
      const channelName = document.querySelector("[data-current-channel]");
      const channelTopic = document.querySelector("[data-current-topic]");
      const composer = document.querySelector("[data-comment-composer]");
      const composerLabel = document.querySelector(".composer-label");
      const composerInput = () => composer?.querySelector("textarea") || document.getElementById("community-message");
      const shareShipButton = document.querySelector("[data-share-ship]");
      const changeList = document.querySelector("[data-change-list]");
      const issueList = document.querySelector("[data-issue-list]");
      const shell = document.getElementById("epoch-community");
      const connectionLabel = document.querySelector("[data-connection-label]");
      const titleEl = document.getElementById("community-title");
      const contextSub = document.querySelector("[data-context-sub]");
      const brandSub = document.querySelector("[data-brand-sub]");
      const communityChrome = document.querySelector("[data-community-workspace-chrome]");
      const channelToolbar = document.querySelector("[data-channel-toolbar]");
      const channelList = document.querySelector("[data-channel-list]");
      const repoList = document.querySelector("[data-repo-list]");
      const repoSurfaces = document.querySelector("[data-repo-surfaces]");
      const honestyBanner = document.querySelector("[data-feed-honesty]");

      const channelTopics = {
        general: "Day-to-day community hangout — independent of any single repository.",
        showcase: "Share demos, screenshots, and wins with the community.",
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
          general: "general",
          showcase: "showcase",
          ideas: "idea",
          bugs: "bug",
          support: "support",
          "agent-runs": "agent",
          previews: "preview",
          governance: "governance",
        };
        return map[channel] || "general";
      }

      function channelForLabels(labels) {
        const normalized = (labels || []).map((label) => String(label).toLowerCase());
        if (normalized.includes("idea") || normalized.includes("ideas")) return "ideas";
        if (normalized.includes("bug") || normalized.includes("bugs")) return "bugs";
        if (normalized.includes("agent") || normalized.includes("agent-run")) return "agent-runs";
        if (normalized.includes("governance") || normalized.includes("security") || normalized.includes("moderation")) return "governance";
        if (normalized.includes("preview")) return "previews";
        if (normalized.includes("showcase") || normalized.includes("demo")) return "showcase";
        if (normalized.includes("general")) return "general";
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

      function currentCommunity() {
        return (state.communities || []).find((space) => space.id === activeCommunity) || (state.communities || [])[0];
      }

      function selectProductMode(mode) {
        if (mode === "network") productMode = "network";
        else if (mode === "repo") productMode = "repo";
        else productMode = "community";
        if (shell) {
          shell.dataset.productMode = productMode;
          shell.dataset.activeCommunity = activeCommunity;
        }
        document.querySelectorAll("button[data-product-mode]").forEach((button) => {
          button.setAttribute("aria-pressed", button.dataset.productMode === productMode ? "true" : "false");
        });
        if (communityChrome) communityChrome.hidden = productMode === "network";
        if (repoSurfaces) repoSurfaces.hidden = productMode !== "repo";
        if (productMode === "network") {
          selectSurface("network");
          if (titleEl) titleEl.textContent = "Network Feed";
          if (contextSub) contextSub.textContent = feedTabLabel(activeFeedTab) + " · cross-community ATProto activity";
          if (brandSub) brandSub.textContent = "Network · ATProto";
          if (channelToolbar) channelToolbar.hidden = true;
          if (honestyBanner) {
            honestyBanner.textContent = live()
              ? "Live Network Feed — cross-community ATProto follows, stars, releases, and contributions."
              : "Snapshot Network Feed — labeled ATProto samples. Live mutations disabled.";
          }
          renderDevFeedTab(activeFeedTab);
        } else if (productMode === "community") {
          const space = currentCommunity();
          selectSurface("channels");
          if (titleEl) titleEl.textContent = space ? space.name : "Community";
          if (brandSub) brandSub.textContent = space ? space.name : "Communities";
          if (channelToolbar) channelToolbar.hidden = false;
          document.querySelectorAll("[data-open-community]").forEach((button) => {
            button.setAttribute("aria-pressed", button.dataset.openCommunity === activeCommunity ? "true" : "false");
          });
          document.querySelectorAll("[data-open-repo]").forEach((button) => {
            button.setAttribute("aria-pressed", "false");
          });
          renderCommunityChannels();
          selectChannel(activeChannel || (space && space.channels[0] && space.channels[0].id) || "general");
          if (honestyBanner) {
            honestyBanner.textContent = live()
              ? "Live community — social channels are community-owned; linked projects add issues, changes, and signed intents."
              : ${JSON.stringify(SNAPSHOT_COMMUNITY_RECOVERY_MESSAGE)};
          }
        } else {
          selectSurface("issues");
          if (titleEl) titleEl.textContent = activeRepo;
          if (contextSub) contextSub.textContent = "Linked project · forge lists";
          if (brandSub) brandSub.textContent = activeRepo;
          if (channelToolbar) channelToolbar.hidden = true;
          document.querySelectorAll("[data-open-repo]").forEach((button) => {
            button.setAttribute("aria-pressed", button.dataset.openRepo === activeRepo ? "true" : "false");
          });
        }
      }

      function feedTabLabel(tab) {
        if (tab === "network") return "Network";
        if (tab === "contributions") return "Contributions";
        return "Following";
      }

      function renderCommunityChannels() {
        const space = currentCommunity();
        if (!channelList || !space) return;
        const counts = {};
        (state.conversations || []).forEach((item) => {
          if (item.communityId !== space.id) return;
          counts[item.channel] = (counts[item.channel] || 0) + 1;
        });
        channelList.innerHTML = (space.channels || []).map((channel) => {
          const selected = channel.id === activeChannel;
          return '<button class="channel-button" type="button" data-channel="' + escapeHtml(channel.id)
            + '" data-channel-kind="' + escapeHtml(channel.kind || "social")
            + '" data-topic="' + escapeHtml(channel.topic || "")
            + '" aria-pressed="' + (selected ? "true" : "false") + '">'
            + '<span class="channel-button-label"># ' + escapeHtml(channel.label || channel.id) + '</span>'
            + '<span class="channel-count">' + (counts[channel.id] || 0) + '</span></button>';
        }).join("");
        channelList.querySelectorAll("[data-channel]").forEach((button) => {
          button.addEventListener("click", () => selectChannel(button.dataset.channel || "general"));
        });
        if (repoList) {
          repoList.innerHTML = (space.linkedRepos || []).map((slug) => {
            const repo = (state.repositories || []).find((item) => item.slug === slug);
            const count = repo && repo.issues ? repo.issues.length : 0;
            return '<button class="channel-button repo-button" type="button" data-open-repo="' + escapeHtml(slug)
              + '" aria-pressed="' + (productMode === "repo" && activeRepo === slug ? "true" : "false") + '">'
              + '<span class="channel-button-label">' + escapeHtml(slug) + '</span>'
              + '<span class="channel-count">' + count + '</span></button>';
          }).join("");
          repoList.querySelectorAll("[data-open-repo]").forEach((button) => {
            button.addEventListener("click", () => openRepository(button.dataset.openRepo || activeRepo));
          });
        }
        renderAgentMembers(space.id);
        updateAgentWorkingStatus();
      }

      const communityAgents = ${JSON.stringify(defaultCommunityAgents)};

      function agentStatusLabel(agent) {
        const kind = agent.sessionKind === "live" ? "live" : "sample";
        return kind + " · " + agent.status;
      }

      function renderAgentMembers(communityId) {
        const agentList = document.querySelector("[data-agent-list]");
        if (!agentList) return;
        const members = (communityAgents || []).filter((agent) => (agent.communityIds || []).includes(communityId));
        if (members.length === 0) {
          agentList.innerHTML = '<p class="agent-list-empty">No member agents in this community yet.</p>';
          return;
        }
        agentList.innerHTML = members.map((agent) => {
          const kind = agent.sessionKind === "live" ? "live" : "sample";
          const label = agentStatusLabel(agent);
          return '<button class="channel-button agent-member" type="button" data-agent-member="' + escapeHtml(agent.id)
          + '" data-agent-status="' + escapeHtml(agent.status)
          + '" data-agent-session-kind="' + escapeHtml(kind)
          + '" aria-label="Member agent ' + escapeHtml(agent.displayName) + ', harness ' + escapeHtml(agent.harness) + ', ' + escapeHtml(label) + '">'
          + '<span class="channel-button-label">@' + escapeHtml(agent.displayName) + '</span>'
          + '<span class="agent-meta">' + escapeHtml(agent.harness) + ' · ' + escapeHtml(label) + '</span></button>';
        }).join("");
        agentList.querySelectorAll("[data-agent-member]").forEach((button) => {
          button.addEventListener("click", () => {
            selectChannel("agent-runs");
            const status = document.querySelector("[data-agent-working-status]");
            if (!status) return;
            const kind = button.getAttribute("data-agent-session-kind") || "sample";
            const name = (button.querySelector(".channel-button-label")?.textContent || "agent").replace(/^@/, "");
            if (kind === "live") {
              status.textContent = "@" + name + ": open agent-runs for live harness receipts";
              status.setAttribute("data-agent-live", "true");
              status.removeAttribute("data-agent-sample");
            } else {
              status.textContent = "@" + name + ": sample member · open agent-runs for harness receipts (not a live ACP session)";
              status.setAttribute("data-agent-sample", "true");
              status.removeAttribute("data-agent-live");
            }
          });
        });
      }

      function updateAgentWorkingStatus() {
        const status = document.querySelector("[data-agent-working-status]");
        if (!status) return;
        const inCommunity = (communityAgents || []).filter((agent) =>
          (agent.communityIds || []).includes(activeCommunity)
        );
        const liveWorking = inCommunity.filter((agent) =>
          agent.status === "working" && agent.sessionKind === "live"
        );
        const sampleWorking = inCommunity.filter((agent) =>
          agent.status === "working" && agent.sessionKind !== "live"
        );
        // Honesty: never claim live Working without a real ACP session.
        if (liveWorking.length > 0) {
          status.textContent = liveWorking.map((agent) =>
            "@" + agent.displayName + " · " + agent.harness + ": Working"
          ).join(" · ");
          status.setAttribute("data-agent-live", "true");
          status.removeAttribute("data-agent-sample");
          return;
        }
        if (sampleWorking.length > 0) {
          status.textContent = "Sample member agents · not a live ACP session";
          status.setAttribute("data-agent-sample", "true");
          status.removeAttribute("data-agent-live");
          return;
        }
        status.textContent = "";
        status.removeAttribute("data-agent-live");
        status.removeAttribute("data-agent-sample");
      }

      function openCommunity(communityId) {
        saveComposerDraft();
        activeCommunity = communityId || activeCommunity;
        const space = currentCommunity();
        activeChannel = (space && space.channels[0] && space.channels[0].id) || "general";
        selectedMessage = null;
        selectProductMode("community");
        restoreComposerDraft();
        renderAgentMembers(activeCommunity);
        updateAgentWorkingStatus();
      }

      function renderDevFeedTab(tab) {
        activeFeedTab = tab || "following";
        document.querySelectorAll("[data-feed-tab]").forEach((button) => {
          button.setAttribute("aria-selected", button.dataset.feedTab === activeFeedTab ? "true" : "false");
        });
        if (!devFeedList) return;
        const items = (state.devFeedItems || []).filter((item) => (item.tabs || []).includes(activeFeedTab));
        if (items.length === 0) {
          devFeedList.innerHTML = '<li class="dev-feed-item dev-feed-empty"><p>No activity in ' + escapeHtml(feedTabLabel(activeFeedTab)) + ' yet.</p></li>';
          return;
        }
        devFeedList.innerHTML = items.map(renderDevFeedItemClient).join("");
        if (contextSub && productMode === "network") {
          contextSub.textContent = feedTabLabel(activeFeedTab) + " · cross-community ATProto activity";
        }
      }

      function renderDevFeedItemClient(item) {
        const objectLabel = item.object ? escapeHtml(item.object.label) : "";
        const repo = item.repoSlug || "";
        const channel = item.channelHint || "";
        const objectBtn = item.object && (item.object.type === "repo" || item.object.type === "issue" || item.object.type === "proposal")
          ? '<button class="dev-feed-object" type="button" data-feed-open-repo="' + escapeHtml(repo) + '" data-feed-channel="' + escapeHtml(channel) + '">' + objectLabel + '</button>'
          : (objectLabel ? '<span class="dev-feed-object-text">' + objectLabel + '</span>' : "");
        const trust = [
          item.trust && item.trust.sig ? escapeHtml(item.trust.sig) : "",
          item.trust && item.trust.anchor ? escapeHtml(item.trust.anchor) : "",
          item.trust && item.trust.atUri ? escapeHtml(item.trust.atUri) : "",
          item.trust ? "src:" + escapeHtml(item.trust.source) : "",
        ].filter(Boolean).map((bit) => "<span>" + bit + "</span>").join("");
        const open = repo
          ? '<button class="dev-feed-action" type="button" data-feed-open-repo="' + escapeHtml(repo) + '" data-feed-channel="' + escapeHtml(channel || "ideas") + '">Open project</button>'
          : "";
        const openCh = channel
          ? '<button class="dev-feed-action" type="button" data-feed-open-community="' + escapeHtml(activeCommunity) + '" data-feed-channel="' + escapeHtml(channel) + '">Open #' + escapeHtml(channel) + '</button>'
          : "";
        const time = (item.createdAt || "").slice(11, 16) || "now";
        return '<li class="dev-feed-item" data-dev-feed-item data-kind="' + escapeHtml(item.kind) + '">'
          + '<div class="avatar" aria-hidden="true">' + escapeHtml(initials(item.actor && item.actor.handle)) + '</div>'
          + '<article class="dev-feed-body"><header class="dev-feed-meta">'
          + '<strong class="dev-feed-handle">@' + escapeHtml(item.actor && item.actor.handle) + '</strong>'
          + '<span class="dev-feed-verb">' + escapeHtml(item.verb) + '</span>'
          + objectBtn
          + '<time>' + escapeHtml(time) + '</time></header>'
          + (item.body ? '<p>' + escapeHtml(item.body) + '</p>' : '')
          + '<footer class="dev-feed-trust">' + trust + '</footer>'
          + '<div class="dev-feed-actions">' + open + openCh + '</div></article></li>';
      }

      function openRepository(slug, channel) {
        activeRepo = slug || activeRepo;
        selectProductMode("repo");
        if (channel) {
          // Jump into community channel context for the linked project conversation.
          activeChannel = channel;
        }
      }

      function selectSurface(surface) {
        document.querySelectorAll("[data-surface]").forEach((button) => {
          button.setAttribute("aria-pressed", button.dataset.surface === surface ? "true" : "false");
        });
        document.querySelectorAll("[data-surface-panel]").forEach((panel) => {
          panel.hidden = panel.getAttribute("data-surface-panel") !== surface;
        });
        if (channelToolbar) channelToolbar.hidden = surface !== "channels";
      }

      function draftKey(communityId, channel) {
        return String(communityId || "community") + "::" + String(channel || "general");
      }

      function saveComposerDraft() {
        const input = composerInput();
        if (!input) return;
        composerDrafts.set(draftKey(activeCommunity, activeChannel), input.value);
      }

      function restoreComposerDraft() {
        const input = composerInput();
        if (!input) return;
        const saved = composerDrafts.get(draftKey(activeCommunity, activeChannel));
        input.value = typeof saved === "string" ? saved : "";
      }

      function composerPlaceholder(channel) {
        const placeholders = {
          general: "Write a hangout message — no repository required",
          showcase: "Share what you're building — demo, release, or project link",
          support: "Ask for help or post a solved answer for the community",
          ideas: "Propose an idea that can become a signed intent",
          bugs: "Report a defect with steps and expected result",
          "agent-runs": "Link an agent run to its originating intent",
          previews: "Share a preview URL and what reviewers should check",
          governance: "Record a moderation, witness, or release trust note",
        };
        return placeholders[channel] || "Write a message in this community channel";
      }

      function applyComposerChrome() {
        const input = composerInput();
        if (composerLabel) composerLabel.textContent = "Message #" + activeChannel;
        if (input) {
          input.placeholder = composerPlaceholder(activeChannel);
          input.setAttribute("data-active-channel", activeChannel);
        }
        if (shareShipButton) {
          const showcase = activeChannel === "showcase";
          shareShipButton.hidden = false;
          shareShipButton.textContent = showcase ? "Ship template" : "Share a ship";
          shareShipButton.setAttribute("aria-label", showcase
            ? "Insert a share-what-you-built template in #showcase"
            : "Open #showcase to share what you are building");
        }
        const composerMeta = document.querySelector("[data-composer-meta]");
        const space = currentCommunity();
        if (composerMeta && space) composerMeta.textContent = "Signed as @" + actor + " · " + space.name;
      }

      function applyChannelFilter() {
        messages().forEach((message) => {
          const sameCommunity = !message.dataset.communityId || message.dataset.communityId === activeCommunity;
          message.hidden = !(sameCommunity && message.dataset.channel === activeChannel);
          if (message.dataset.messageId !== selectedMessage) {
            message.removeAttribute("data-selected-message");
            const tray = message.querySelector("[data-message-actions]");
            if (tray) tray.hidden = true;
          }
        });
        const space = currentCommunity();
        const channelMeta = space && (space.channels || []).find((item) => item.id === activeChannel);
        if (channelName) channelName.textContent = "# " + activeChannel;
        if (channelTopic) channelTopic.textContent = (channelMeta && channelMeta.topic) || channelTopics[activeChannel] || "";
        if (contextSub && productMode === "community") {
          contextSub.textContent = "# " + activeChannel + " · community channel";
        }
        applyComposerChrome();
        document.querySelectorAll("[data-channel][aria-pressed]").forEach((item) => {
          item.setAttribute("aria-pressed", item.dataset.channel === activeChannel ? "true" : "false");
        });
      }

      function selectChannel(channel) {
        saveComposerDraft();
        activeChannel = channel || "general";
        selectedMessage = null;
        if (productMode === "network") selectProductMode("community");
        else if (productMode === "repo") selectProductMode("community");
        selectSurface("channels");
        applyChannelFilter();
        restoreComposerDraft();
        updateAgentWorkingStatus();
        if (feed) feed.scrollTop = 0;
        const input = composerInput();
        if (input && activeChannel === "showcase") input.focus();
      }

      function openShareShip() {
        saveComposerDraft();
        if (activeChannel !== "showcase") {
          selectChannel("showcase");
        } else {
          applyComposerChrome();
        }
        const input = composerInput();
        if (!input) return;
        if (!input.value.trim()) {
          input.value = "Shipping: \\nWhat: \\nLink: \\nWho can try it: ";
          composerDrafts.set(draftKey(activeCommunity, "showcase"), input.value);
        }
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
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
        return '<li class="feed-message" data-message data-channel="' + channel + '" data-community-id="' + escapeHtml(activeCommunity) + '" data-message-id="' + escapeHtml(id) + '" data-feed-item-source="api" data-issue-id="' + escapeHtml(issue.id) + '">'
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
        return '<li class="feed-message" data-message data-channel="previews" data-community-id="' + escapeHtml(activeCommunity) + '" data-message-id="' + escapeHtml(id) + '" data-feed-item-source="api" data-change-id="' + escapeHtml(proposal.id) + '" data-linked-proposal="' + escapeHtml(proposal.id) + '">'
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
        const counts = { support: 0, ideas: 0, bugs: 0, "agent-runs": 0, previews: 0, governance: 0, general: 0, showcase: 0 };
        for (const issue of repo.issues || []) {
          counts[channelForLabels(issue.labels)] = (counts[channelForLabels(issue.labels)] || 0) + 1;
        }
        for (const _proposal of repo.changeProposals || []) {
          counts.previews += 1;
        }
        for (const item of state.conversations || []) {
          if (item.role === "agent") {
            counts["agent-runs"] = (counts["agent-runs"] || 0) + 1;
          } else if (item.channel === "general" || item.channel === "showcase") {
            counts[item.channel] = (counts[item.channel] || 0) + 1;
          }
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

      function identityChipHtml() {
        return '<span class="identity-chip" data-identity-chip title="Portable ATProto identity (session)">'
          + '<span class="identity-handle">@' + escapeHtml(actor) + '.epoch.community</span>'
          + '<span class="identity-did">did:plc:' + escapeHtml(actor) + '</span>'
          + '</span>';
      }

      function renderMetaParts(parts) {
        return identityChipHtml()
          + parts.map((part) => '<span class="meta-sep" aria-hidden="true"></span><span>' + escapeHtml(part) + '</span>').join("");
      }

      function updateRepositoryMeta(repo) {
        const meta = document.querySelector("[data-header-meta]");
        if (!meta) return;
        if (productMode === "network") {
          const count = (state.devFeedItems || []).length;
          meta.innerHTML = renderMetaParts([
            count + " events",
            "network",
            live() ? "atproto:live" : "atproto:snapshot",
          ]);
          return;
        }
        if (productMode === "community") {
          const space = currentCommunity();
          meta.innerHTML = renderMetaParts([
            (state.communities || []).length + " communities",
            ((space && space.channels) || []).length + " channels",
            live() ? "community:live" : "community:snapshot",
          ]);
          return;
        }
        meta.innerHTML = renderMetaParts([
          repo.visibility || "public",
          (repo.maintainers || []).length + " maintainer" + ((repo.maintainers || []).length === 1 ? "" : "s"),
          (repo.issues || []).length + " issues",
          (repo.changeProposals || []).length + " changes",
          live() ? "project:live" : "project:snapshot",
        ]);
      }

      function renderRepository(repo) {
        // Preserve multi-repo list; refresh the active slug in place when possible.
        const repos = Array.isArray(state.repositories) ? state.repositories.slice() : [];
        const idx = repos.findIndex((item) => item.slug === repo.slug);
        if (idx >= 0) repos[idx] = repo;
        else repos[0] = repo;
        state.repositories = repos;
        state.feedSource = live() ? "api" : state.feedSource;
        if (shell) {
          shell.dataset.feedSource = state.feedSource;
          shell.dataset.apiState = live() ? "connected" : "offline";
        }
        if (connectionLabel) {
          connectionLabel.textContent = live()
            ? (productMode === "feed" ? "Live · ATProto" : "Live")
            : "Snapshot · ATProto";
        }
        if (feed) {
          // Preserve community-owned social + member-agent messages; refresh forge-backed rows.
          const social = (state.conversations || []).filter((item) =>
            item.role !== "agent" && (
              item.channel === "general" || item.channel === "showcase" || (item.id && String(item.id).indexOf("issue-") !== 0 && String(item.id).indexOf("change-") !== 0 && !item.repositorySlug)
            ),
          );
          const socialHtml = social.map((item) => {
            const hidden = (item.communityId && item.communityId !== activeCommunity) || item.channel !== activeChannel ? " hidden" : "";
            return '<li class="feed-message" data-message data-channel="' + escapeHtml(item.channel)
              + '" data-community-id="' + escapeHtml(item.communityId || activeCommunity)
              + '" data-message-id="' + escapeHtml(item.id) + '" data-feed-item-source="' + escapeHtml(item.source || "api") + '"' + hidden + '>'
              + '<button class="message-hitbox" type="button" data-select-message="' + escapeHtml(item.id) + '" aria-label="Open signed actions for ' + escapeHtml(item.title) + '"></button>'
              + '<div class="avatar" aria-hidden="true">' + escapeHtml(initials(item.author)) + '</div>'
              + '<article class="message-body"><header class="message-meta"><strong>' + escapeHtml(item.author) + '</strong><span>' + escapeHtml(item.role || "member") + '</span><time>' + escapeHtml(item.time || "now") + '</time><span data-message-state>' + escapeHtml(item.state || "open") + '</span></header>'
              + '<h2>' + escapeHtml(item.title) + '</h2><p>' + escapeHtml(item.body || "") + '</p>'
              + '<footer class="message-footer"><span>' + escapeHtml(item.anchor || "") + '</span><span>' + escapeHtml(item.signature || "") + '</span><span>community</span></footer>'
              + '<div class="reaction-row">' + (item.reactions || []).map((reaction) => '<button type="button" class="reaction" data-reaction="' + escapeHtml(reaction) + '">' + escapeHtml(reaction) + '</button>').join("") + '</div>'
              + '<div class="message-action-tray" data-message-actions hidden><p class="action-status" data-action-status>Community channel message.</p></div></article></li>';
          }).join("");
          const agentHtml = (state.conversations || []).filter((item) => item.role === "agent").map((item) => {
            const hidden = (item.communityId && item.communityId !== activeCommunity) || item.channel !== activeChannel ? " hidden" : "";
            const harness = item.harness
              ? '<span class="agent-harness" data-agent-harness title="ACP harness">' + escapeHtml(item.harness) + '</span>'
              : "";
            const managed = item.managedBy
              ? '<span class="agent-managed-by" data-agent-managed-by>managed by @' + escapeHtml(item.managedBy) + '</span>'
              : "";
            const artifact = item.artifactCard
              ? '<div class="message-artifact-card" data-artifact-card><span class="message-artifact-kind">Agent receipt</span><strong>'
                + escapeHtml(item.artifactCard) + '</strong>'
                + (item.intentId
                  ? '<a class="message-artifact-link" href="#intent-' + escapeHtml(item.intentId) + '" data-intent-link="' + escapeHtml(item.intentId) + '">Open signed intent</a>'
                  : "")
                + '</div>'
              : "";
            const proposalAttr = item.linkedProposalId
              ? ' data-linked-proposal="' + escapeHtml(item.linkedProposalId) + '"'
              : "";
            return '<li class="feed-message feed-message-agent" data-message data-channel="' + escapeHtml(item.channel || "agent-runs")
              + '" data-community-id="' + escapeHtml(item.communityId || activeCommunity)
              + '" data-message-id="' + escapeHtml(item.id) + '" data-feed-item-source="' + escapeHtml(item.source || "api")
              + '" data-author-role="agent"' + proposalAttr + hidden + '>'
              + '<button class="message-hitbox" type="button" data-select-message="' + escapeHtml(item.id) + '" aria-label="Open signed actions for ' + escapeHtml(item.title) + '"></button>'
              + '<div class="avatar avatar-agent" aria-hidden="true">' + escapeHtml(initials(item.author)) + '</div>'
              + '<article class="message-body"><header class="message-meta"><strong>' + escapeHtml(item.author) + '</strong><span>member agent</span>'
              + harness + managed
              + '<time>' + escapeHtml(item.time || "now") + '</time><span data-message-state>' + escapeHtml(item.state || "open") + '</span></header>'
              + '<h2>' + escapeHtml(item.title) + '</h2><p>' + escapeHtml(item.body || "") + '</p>'
              + artifact
              + '<footer class="message-footer"><span>' + escapeHtml(item.anchor || "") + '</span><span>' + escapeHtml(item.signature || "") + '</span><span>' + escapeHtml(item.visibility || "community") + '</span>'
              + (item.intentId ? '<span data-intent-meta>intent:' + escapeHtml(item.intentId) + '</span>' : "")
              + (item.linkedProposalId ? '<span data-proposal-link>proposal:' + escapeHtml(item.linkedProposalId) + '</span>' : "")
              + '</footer>'
              + '<div class="reaction-row">' + (item.reactions || []).map((reaction) => '<button type="button" class="reaction" data-reaction="' + escapeHtml(reaction) + '">' + escapeHtml(reaction) + '</button>').join("") + '</div>'
              + '<div class="message-action-tray" data-message-actions hidden><p class="action-status" data-action-status>Human review required for signed project changes.</p></div></article></li>';
          }).join("");
          const issueHtml = (repo.issues || []).map((issue) => renderMessageFromIssue(issue, repo)).join("");
          const changeHtml = (repo.changeProposals || []).map((proposal) => renderMessageFromChange(proposal, repo)).join("");
          // Merge issue/change conversations back into state for channel counts; keep agent members.
          const spaces = state.communities || [];
          const communityId = activeCommunity;
          const issueConvos = (repo.issues || []).map((issue) => ({
            id: "issue-" + issue.id,
            channel: channelForLabels(issue.labels || []),
            communityId,
            repositorySlug: repo.slug,
            author: issue.author,
            role: "contributor",
            title: issue.title,
            body: issue.body || "",
            time: "live",
            anchor: "issue:" + issue.id,
            signature: "sig:" + String(issue.id).toLowerCase(),
            visibility: "community",
            state: issue.status,
            reactions: ["reply", "follow"],
            source: "api",
          }));
          const changeConvos = (repo.changeProposals || []).map((proposal) => ({
            id: "change-" + proposal.id,
            channel: "previews",
            communityId,
            repositorySlug: repo.slug,
            author: proposal.author,
            role: "contributor",
            title: proposal.title,
            body: proposal.body || "",
            time: "live",
            anchor: "change:" + proposal.id,
            signature: "sig:" + String(proposal.id).toLowerCase(),
            visibility: "community",
            state: proposal.status,
            reactions: ["review", "preview"],
            linkedProposalId: proposal.id,
            source: "api",
          }));
          const retained = (state.conversations || []).filter((item) =>
            !(item.repositorySlug === repo.slug && (String(item.id).indexOf("issue-") === 0 || String(item.id).indexOf("change-") === 0)),
          );
          state.conversations = retained.concat(issueConvos, changeConvos);
          feed.innerHTML = socialHtml + agentHtml + issueHtml + changeHtml;
          void spaces;
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
        if (productMode === "community" || productMode === "repo") applyChannelFilter();
        if (productMode === "community") renderCommunityChannels();
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
          item.dataset.communityId = activeCommunity;
          item.dataset.messageId = id;
          item.dataset.feedItemSource = "snapshot";
          item.innerHTML = '<div class="avatar" aria-hidden="true">MY</div><article class="message-body"><header class="message-meta"><strong>maya</strong><span>maintainer</span><time>now</time><span>local only</span></header><h2>Local note</h2><p></p><footer class="message-footer"><span>anchor:composer</span><span>sig:pending-local</span><span>community</span></footer></article>';
          item.querySelector("p").textContent = body;
          feed.append(item);
          applyChannelFilter();
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
          const actionLabel = {
            intent: "Mark intent",
            agent: "Request agent",
            answer: "Accept answer",
            docs: "Docs patch",
            report: "Report",
            approve: "Approve change",
          }[action] || "this action";
          setStatus(message, "Live API unavailable. Reconnect EPOCH_COMMUNITY_API_URL, reload this page, then retry " + actionLabel + ".");
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

      document.querySelectorAll("button[data-product-mode]").forEach((button) => {
        button.addEventListener("click", () => selectProductMode(button.dataset.productMode || "community"));
      });
      document.querySelectorAll("[data-feed-tab]").forEach((button) => {
        button.addEventListener("click", () => renderDevFeedTab(button.dataset.feedTab || "following"));
      });
      document.querySelectorAll("[data-open-community]").forEach((button) => {
        button.addEventListener("click", () => openCommunity(button.dataset.openCommunity || activeCommunity));
      });
      document.querySelectorAll("[data-open-repo]").forEach((button) => {
        button.addEventListener("click", () => openRepository(button.dataset.openRepo || activeRepo));
      });
      document.querySelectorAll("[data-surface]").forEach((button) => {
        button.addEventListener("click", () => {
          if (productMode !== "repo") selectProductMode("repo");
          selectSurface(button.dataset.surface || "issues");
        });
      });
      document.querySelectorAll("[data-channel][aria-pressed]").forEach((button) => {
        button.addEventListener("click", () => selectChannel(button.dataset.channel || "general"));
      });

      document.addEventListener("click", async (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const feedCommunity = target.closest("[data-feed-open-community]");
        if (feedCommunity) {
          event.preventDefault();
          openCommunity(feedCommunity.getAttribute("data-feed-open-community") || activeCommunity);
          const channel = feedCommunity.getAttribute("data-feed-channel");
          if (channel) selectChannel(channel);
          return;
        }

        const feedOpen = target.closest("[data-feed-open-repo]");
        if (feedOpen) {
          event.preventDefault();
          const channel = feedOpen.getAttribute("data-feed-channel");
          if (channel) {
            selectProductMode("community");
            selectChannel(channel);
          } else {
            openRepository(feedOpen.getAttribute("data-feed-open-repo") || activeRepo);
          }
          return;
        }

        const reviewButton = target.closest("[data-review-change]");
        if (reviewButton) {
          event.preventDefault();
          try {
            const updated = await postReview(reviewButton.getAttribute("data-review-change"), "approved");
            renderRepository(updated);
            if (productMode !== "repo") selectProductMode("repo");
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
        const input = composerInput();
        const value = input?.value || "";
        try {
          await handleComposerSubmit(value);
          if (input) input.value = "";
          composerDrafts.set(draftKey(activeCommunity, activeChannel), "");
        } catch (error) {
          if (input) input.placeholder = "Send failed: " + (error instanceof Error ? error.message : String(error));
        }
      });

      const liveComposerInput = composerInput();
      liveComposerInput?.addEventListener("input", () => {
        saveComposerDraft();
      });
      shareShipButton?.addEventListener("click", (event) => {
        event.preventDefault();
        openShareShip();
      });

      selectProductMode("community");
      applyComposerChrome();
      renderAgentMembers(activeCommunity);
      updateAgentWorkingStatus();
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
      --epoch-color-primary: #0f1614;
      --epoch-color-surface: #f3f6f4;
      --epoch-color-surface-raised: #ffffff;
      --epoch-color-surface-sunken: #e8eeeb;
      --epoch-color-ink: #0f1614;
      --epoch-color-muted: #5c6762;
      --epoch-color-line: #d7e0db;
      --epoch-color-accent: #b4532f;
      --epoch-color-accent-strong: #8f3f28;
      --epoch-color-teal: #2a6f6c;
      --epoch-color-mint: #d5ebe3;
      --epoch-color-gold: #c9a24a;
      --epoch-color-rail: #101714;
      --epoch-color-rail-text: #d7e2dc;
      --epoch-color-rail-muted: #8fa099;
      --epoch-color-rail-hover: #1a2420;
      --epoch-color-rail-active: #24322c;
      --epoch-color-success: #1a5c3e;
      --epoch-color-warning-bg: #fff6df;
      --epoch-color-warning-ink: #5b4420;
      --epoch-shadow-low: 0 1px 0 rgba(15, 22, 20, 0.04);
      --epoch-radius-xs: 2px;
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
      grid-template-rows: auto auto auto auto 1fr auto;
      gap: 0.55rem;
      padding: 0.75rem 0.55rem;
      border-inline-end: 1px solid #1c2622;
      background: var(--epoch-color-rail);
      color: var(--epoch-color-rail-text);
      overflow: hidden;
    }
    .rail-section-label {
      padding: 0.35rem 0.55rem 0.1rem;
      color: var(--epoch-color-rail-muted);
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .community-list,
    .repo-list {
      display: grid;
      align-content: start;
      gap: 0.1rem;
      min-width: 0;
      max-height: 7.5rem;
      overflow-y: auto;
    }
    .community-workspace-chrome {
      display: grid;
      align-content: start;
      gap: 0.4rem;
      min-height: 0;
      overflow: hidden;
    }
    .community-workspace-chrome .channel-list {
      max-height: min(20rem, 40vh);
      overflow-y: auto;
    }
    .product-mode-list {
      border-block-end: 1px solid #1c2622;
      padding-block-end: 0.4rem;
    }
    .community-button[aria-pressed="true"]::before,
    .channel-button[aria-pressed="true"]::before {
      content: "";
      position: absolute;
      inset-block: 0.35rem;
      inset-inline-start: 0;
      width: 2px;
      border-radius: 1px;
      background: var(--epoch-color-accent);
    }
    .repo-surface-list {
      border-block-start: 1px solid #1c2622;
      padding-block-start: 0.35rem;
    }

    .brand {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.55rem;
      align-items: center;
      padding: 0.2rem 0.4rem 0.35rem;
      color: inherit;
    }
    .brand-mark {
      display: grid;
      place-items: center;
      width: 1.85rem;
      height: 1.85rem;
      border-radius: var(--epoch-radius-sm);
      background: #1f3d34;
      color: #e8f3ee;
      font-size: 0.68rem;
      font-weight: 750;
      letter-spacing: -0.02em;
    }
    .brand-text { display: grid; gap: 0.05rem; min-width: 0; }
    .brand-name {
      font-size: 0.92rem;
      font-weight: 700;
      line-height: 1.1;
      letter-spacing: -0.01em;
    }
    .brand-sub {
      color: var(--epoch-color-rail-muted);
      font-size: 0.72rem;
      font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .surface-list,
    .channel-list {
      display: grid;
      align-content: start;
      gap: 0.1rem;
      min-width: 0;
    }
    .channel-list { overflow-y: auto; }
    .surface-button,
    .channel-button {
      position: relative;
      display: flex;
      width: 100%;
      min-height: 2rem;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.3rem 0.55rem;
      border: 0;
      border-radius: var(--epoch-radius-sm);
      background: transparent;
      color: var(--epoch-color-rail-muted);
      cursor: pointer;
      font: inherit;
      font-size: 0.88rem;
      font-weight: 500;
      text-align: start;
    }
    .surface-button:hover,
    .channel-button:hover {
      background: var(--epoch-color-rail-hover);
      color: var(--epoch-color-rail-text);
    }
    .surface-button[aria-pressed="true"],
    .channel-button[aria-pressed="true"] {
      background: var(--epoch-color-rail-active);
      color: #fff;
      font-weight: 650;
    }
    .surface-list {
      padding-block-end: 0.4rem;
      margin-block-end: 0.1rem;
      border-block-end: 1px solid #1c2622;
    }
    .channel-button-label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .agent-list {
      display: grid;
      gap: 0.15rem;
      padding: 0 0.35rem 0.45rem;
    }
    .agent-member {
      flex-direction: column;
      align-items: stretch;
      gap: 0.1rem;
      min-height: auto;
      padding-block: 0.35rem;
    }
    .agent-meta {
      color: var(--epoch-color-rail-muted);
      font-size: 0.68rem;
      font-weight: 500;
    }
    .agent-list-empty {
      margin: 0;
      padding: 0.25rem 0.45rem;
      color: var(--epoch-color-rail-muted);
      font-size: 0.72rem;
    }
    .avatar-agent {
      background: var(--epoch-color-mint);
      color: var(--epoch-color-success);
      font-size: 0.65rem;
    }
    .agent-harness,
    .agent-managed-by {
      color: var(--epoch-color-muted);
      font-size: 0.72rem;
      font-weight: 600;
    }
    .agent-harness {
      padding: 0.05rem 0.35rem;
      border: 1px solid var(--epoch-color-line);
      border-radius: var(--epoch-radius-xs);
      background: var(--epoch-color-surface-sunken);
    }
    .message-artifact-card {
      display: grid;
      gap: 0.2rem;
      margin: 0.45rem 0;
      padding: 0.45rem 0.55rem;
      border: 1px solid var(--epoch-color-line);
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-surface);
    }
    .message-artifact-kind {
      color: var(--epoch-color-muted);
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .message-artifact-link {
      color: var(--epoch-color-teal);
      font-size: 0.82rem;
      font-weight: 650;
      text-decoration: none;
    }
    .message-artifact-link:hover {
      text-decoration: underline;
    }
    .agent-working-status {
      flex: 1 1 auto;
      min-width: 0;
      color: var(--epoch-color-muted);
      font-size: 0.78rem;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .agent-working-status[data-agent-sample="true"] {
      color: var(--epoch-color-ink-muted);
      border-color: var(--epoch-color-line);
      background: var(--epoch-color-surface-sunken, #e8eeeb);
    }
    .agent-working-status[data-agent-live="true"] {
      color: var(--epoch-color-success);
    }
    .channel-count {
      flex: 0 0 auto;
      min-width: 1.25rem;
      color: var(--epoch-color-rail-muted);
      font-size: 0.72rem;
      font-variant-numeric: tabular-nums;
      text-align: end;
    }
    .surface-button[aria-pressed="true"] .channel-count,
    .channel-button[aria-pressed="true"] .channel-count {
      color: #c5d2cb;
    }

    .rail-status {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.4rem 0.55rem;
      color: var(--epoch-color-rail-muted);
      font-size: 0.76rem;
      font-weight: 600;
      border-block-start: 1px solid #1c2622;
    }
    .status-dot {
      width: 0.45rem;
      height: 0.45rem;
      border-radius: 50%;
      background: var(--epoch-color-success);
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
      padding: 0.65rem 1.15rem;
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
      line-height: 1.2;
      letter-spacing: -0.01em;
    }
    .feed-repo {
      margin: 0.1rem 0 0;
      color: var(--epoch-color-muted);
      font-size: 0.75rem;
      font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
    }
    .repository-meta {
      display: flex;
      flex-wrap: wrap;
      justify-content: end;
      align-items: center;
      gap: 0.35rem;
      max-width: 34rem;
      color: var(--epoch-color-muted);
      font-size: 0.78rem;
      font-weight: 500;
      line-height: 1.3;
      text-align: end;
    }
    .repository-meta .meta-sep {
      color: #a8b3ad;
      font-weight: 400;
    }
    .repository-meta .meta-sep::before { content: "·"; }
    .identity-chip {
      display: inline-flex;
      flex-direction: column;
      align-items: end;
      gap: 0.05rem;
      padding: 0.2rem 0.45rem;
      border: 1px solid var(--epoch-color-line);
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-surface);
      text-align: end;
    }
    .identity-handle {
      color: var(--epoch-color-ink);
      font-weight: 700;
      font-size: 0.78rem;
    }
    .identity-did {
      color: var(--epoch-color-muted);
      font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
      font-size: 0.68rem;
      font-weight: 500;
    }
    @media (max-width: 720px) {
      .identity-did {
        /* Collapse DID under handle on narrow viewports; full DID remains in title. */
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
      .identity-chip {
        position: relative;
      }
      .members-count {
        display: none;
      }
    }

    .api-banner {
      margin: 0;
      padding: 0.5rem 1.15rem;
      border-block-end: 1px solid #e0c991;
      background: var(--epoch-color-warning-bg);
      color: var(--epoch-color-warning-ink);
      font-size: 0.82rem;
      font-weight: 650;
    }
    .api-banner-live {
      border-block-end-color: #b7d8c8;
      background: var(--epoch-color-mint);
      color: #1a4a3c;
    }

    .feed-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.55rem 0.75rem;
      min-width: 0;
      padding: 0.45rem 1.15rem;
      border-block-end: 1px solid var(--epoch-color-line);
      background: var(--epoch-color-surface-raised);
    }
    .channel-name {
      flex: 0 0 auto;
      color: var(--epoch-color-ink);
      font-size: 0.95rem;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .channel-topic {
      flex: 1 1 10rem;
      min-width: 0;
      color: var(--epoch-color-muted);
      font-size: 0.84rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .members-strip {
      display: inline-flex;
      flex: 0 0 auto;
      align-items: center;
      gap: 0.3rem;
      margin-inline-start: auto;
      color: var(--epoch-color-muted);
      font-size: 0.72rem;
      font-weight: 600;
    }
    .members-label {
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-size: 0.66rem;
    }
    .member-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.4rem;
      height: 1.4rem;
      border-radius: 999px;
      background: var(--epoch-color-mint);
      color: var(--epoch-color-success);
      font-size: 0.62rem;
      font-weight: 700;
    }
    .members-count {
      color: var(--epoch-color-muted);
      font-weight: 500;
      max-width: 11rem;
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
    .surface-stage[data-surface-panel="network"] {
      grid-template-rows: auto minmax(0, 1fr);
    }

    .feed-tabs {
      display: flex;
      gap: 0.15rem;
      padding: 0.45rem 1.15rem 0;
      border-block-end: 1px solid var(--epoch-color-line);
      background: var(--epoch-color-surface-raised);
    }
    .feed-tab {
      appearance: none;
      border: 0;
      border-block-end: 2px solid transparent;
      background: transparent;
      color: var(--epoch-color-muted);
      cursor: pointer;
      font: inherit;
      font-size: 0.86rem;
      font-weight: 600;
      padding: 0.55rem 0.7rem;
    }
    .feed-tab:hover {
      color: var(--epoch-color-ink);
    }
    .feed-tab[aria-selected="true"] {
      color: var(--epoch-color-ink);
      border-block-end-color: var(--epoch-color-accent);
    }

    .dev-feed {
      margin: 0;
      padding: 0.25rem 0 1rem;
      overflow-y: auto;
      list-style: none;
    }
    .dev-feed-item {
      display: grid;
      grid-template-columns: 2rem minmax(0, 1fr);
      gap: 0.5rem;
      padding: 0.38rem 1.15rem;
      border-block-end: 1px solid var(--epoch-color-line);
    }
    .dev-feed-item:hover {
      background: var(--epoch-color-surface);
    }
    .dev-feed-item:last-child {
      border-block-end: 0;
    }
    .dev-feed-empty {
      display: block;
      color: var(--epoch-color-muted);
      font-weight: 600;
    }
    .dev-feed-body {
      display: grid;
      gap: 0.28rem;
      min-width: 0;
    }
    .dev-feed-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0.35rem;
      color: var(--epoch-color-muted);
      font-size: 0.82rem;
    }
    .dev-feed-handle {
      color: var(--epoch-color-ink);
      font-size: 0.92rem;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .dev-feed-verb {
      color: var(--epoch-color-muted);
      font-weight: 500;
    }
    .dev-feed-object,
    .dev-feed-object-text {
      color: var(--epoch-color-teal);
      font-weight: 700;
    }
    .dev-feed-object {
      appearance: none;
      border: 0;
      background: transparent;
      cursor: pointer;
      font: inherit;
      font-weight: 700;
      color: var(--epoch-color-teal);
      padding: 0;
      text-align: start;
    }
    .dev-feed-object:hover {
      color: var(--epoch-color-accent-strong);
      text-decoration: underline;
    }
    .dev-feed-meta time {
      margin-inline-start: auto;
      font-variant-numeric: tabular-nums;
    }
    .dev-feed-body p {
      max-width: 70ch;
      margin: 0;
      color: #2d3531;
      font-size: 0.92rem;
      line-height: 1.45;
    }
    .dev-feed-trust {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      color: var(--epoch-color-muted);
      font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
      font-size: 0.7rem;
    }
    .dev-feed-trust span + span::before {
      content: "·";
      margin-inline-end: 0.35rem;
      color: #a0aaa4;
    }
    .dev-feed-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-block-start: 0.1rem;
    }
    .dev-feed-action {
      appearance: none;
      display: inline-flex;
      align-items: center;
      min-height: 1.7rem;
      border: 1px solid var(--epoch-color-line);
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-surface-raised);
      color: var(--epoch-color-ink);
      cursor: pointer;
      font: inherit;
      font-size: 0.76rem;
      font-weight: 600;
      padding: 0.15rem 0.55rem;
    }
    .dev-feed-action:hover {
      border-color: var(--epoch-color-ink);
      background: var(--epoch-color-surface);
    }

    .message-feed {
      margin: 0;
      padding: 0.25rem 0 0.5rem;
      overflow-y: auto;
      list-style: none;
    }

    .feed-message {
      position: relative;
      display: grid;
      grid-template-columns: 2.15rem minmax(0, 1fr);
      gap: 0.6rem;
      padding: 0.4rem 1.15rem;
      border-block: 1px solid transparent;
    }
    .feed-message:hover {
      background: var(--epoch-color-surface);
      border-block-color: transparent;
    }
    .feed-message[data-selected-message="true"] {
      background: var(--epoch-color-surface-sunken);
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
      width: 2.1rem;
      height: 2.1rem;
      place-items: center;
      border-radius: var(--epoch-radius-sm);
      background: #1f3d34;
      color: #e8f3ee;
      font-size: 0.68rem;
      font-weight: 700;
    }
    .message-body {
      position: relative;
      z-index: 1;
      display: grid;
      gap: 0.22rem;
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
      gap: 0.35rem;
    }
    .message-meta {
      color: var(--epoch-color-muted);
      font-size: 0.76rem;
    }
    .message-meta strong {
      color: var(--epoch-color-ink);
      font-size: 0.9rem;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .message-body h2 {
      margin: 0;
      color: var(--epoch-color-ink);
      font-size: 0.95rem;
      font-weight: 700;
      line-height: 1.3;
      letter-spacing: -0.01em;
    }
    .message-body p {
      max-width: 70ch;
      margin: 0;
      color: #2d3531;
      font-size: 0.94rem;
      line-height: 1.5;
    }
    .message-footer {
      color: var(--epoch-color-muted);
      font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
      font-size: 0.7rem;
      opacity: 0.92;
    }
    .message-footer span + span::before {
      content: "·";
      margin-inline-end: 0.35rem;
      color: #a0aaa4;
    }
    [data-proposal-link] {
      color: var(--epoch-color-teal);
      font-weight: 700;
    }
    [data-snapshot-badge] {
      border: 1px solid #d4c49a;
      border-radius: var(--epoch-radius-xs);
      background: var(--epoch-color-warning-bg);
      color: var(--epoch-color-warning-ink);
      font-size: 0.68rem;
      font-weight: 600;
      padding: 0.05rem 0.3rem;
    }
    .reaction-row {
      gap: 0.28rem;
      margin-top: 0.15rem;
    }
    .reaction {
      display: inline-flex;
      align-items: center;
      min-height: 1.75rem;
      border: 1px solid var(--epoch-color-line);
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-surface-raised);
      color: var(--epoch-color-ink);
      cursor: pointer;
      font: inherit;
      font-size: 0.76rem;
      font-weight: 600;
      padding: 0.12rem 0.45rem;
      pointer-events: auto;
    }
    .reaction:hover {
      border-color: #b0bfb7;
      background: var(--epoch-color-surface);
      color: var(--epoch-color-ink);
    }
    .reaction:active {
      background: var(--epoch-color-surface-sunken);
    }
    .reaction:focus-visible {
      outline: 2px solid var(--epoch-color-accent);
      outline-offset: 1px;
    }

    .message-action-tray {
      display: grid;
      gap: 0.5rem;
      margin-block-start: 0.3rem;
      padding: 0.55rem 0.6rem;
      border: 1px solid var(--epoch-color-line);
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-surface);
    }
    .message-action-tray dl {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.5rem;
      margin: 0;
    }
    .message-action-tray dt {
      color: var(--epoch-color-muted);
      font-size: 0.66rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .message-action-tray dd {
      margin: 0.12rem 0 0;
      font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
      font-size: 0.72rem;
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
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.3rem 0.7rem;
    }
    .message-action-tray button:hover,
    .composer button:hover {
      background: var(--epoch-color-accent-strong);
      border-color: var(--epoch-color-accent-strong);
    }
    .message-action-tray button:active,
    .composer button:active {
      filter: brightness(0.96);
    }
    .message-action-tray button:not([data-action="intent"]) {
      border-color: #b0bfb7;
      background: var(--epoch-color-surface-raised);
      color: var(--epoch-color-ink);
    }
    .message-action-tray button:not([data-action="intent"]):hover {
      border-color: var(--epoch-color-ink);
      background: var(--epoch-color-surface);
      filter: none;
    }
    .message-action-tray button[data-action="intent"] {
      background: var(--epoch-color-teal);
      border-color: #215955;
    }
    .message-action-tray button[data-action="intent"]:hover {
      background: #32807c;
      border-color: #215955;
      filter: none;
    }
    .action-status {
      margin: 0;
      color: var(--epoch-color-muted);
      font-size: 0.82rem;
    }

    .composer {
      display: grid;
      gap: 0.35rem;
      padding: 0.7rem 1.15rem 0.9rem;
      border-block-start: 1px solid var(--epoch-color-line);
      background: var(--epoch-color-surface-raised);
      box-shadow: var(--epoch-shadow-low);
    }
    .composer-label {
      color: var(--epoch-color-muted);
      font-size: 0.76rem;
      font-weight: 600;
    }
    .composer-share {
      border: 1px solid var(--epoch-color-line);
      background: var(--epoch-color-surface);
      color: var(--epoch-color-ink);
      border-radius: var(--epoch-radius-sm);
      padding: 0.4rem 0.7rem;
      font: inherit;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
    }
    .composer-share:hover {
      border-color: var(--epoch-color-teal);
      color: var(--epoch-color-teal);
    }
    .composer textarea {
      width: 100%;
      min-height: 2.75rem;
      resize: vertical;
      border: 1px solid var(--epoch-color-line);
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-surface-raised);
      color: var(--epoch-color-ink);
      font: inherit;
      line-height: 1.45;
      padding: 0.55rem 0.7rem;
    }
    .composer textarea:focus {
      border-color: var(--epoch-color-accent);
      outline: 2px solid color-mix(in srgb, var(--epoch-color-accent) 35%, transparent);
      outline-offset: 0;
    }
    .composer-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      color: var(--epoch-color-muted);
      font-size: 0.74rem;
    }
    .composer button {
      min-height: 2rem;
      padding: 0.3rem 0.85rem;
      font-size: 0.8rem;
    }

    .artifact-list {
      margin: 0;
      padding: 0.65rem 1.15rem 1rem;
      overflow-y: auto;
      list-style: none;
      display: grid;
      align-content: start;
      gap: 0;
    }
    .artifact-item {
      display: grid;
      gap: 0.1rem;
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
      font-size: 0.72rem;
      font-weight: 700;
    }
    .artifact-item strong {
      color: var(--epoch-color-ink);
      font-size: 0.92rem;
    }
    .artifact-meta,
    .artifact-labels {
      color: var(--epoch-color-muted);
      font-size: 0.78rem;
    }
    .artifact-empty {
      color: var(--epoch-color-muted);
      font-weight: 600;
    }
    .artifact-actions {
      margin-top: 0.3rem;
    }
    .thread-comments {
      display: grid;
      gap: 0.3rem;
      margin: 0.15rem 0 0.05rem;
      padding: 0.4rem 0.55rem;
      border-left: 2px solid var(--epoch-color-line);
      background: var(--epoch-color-surface);
      border-radius: 0 var(--epoch-radius-sm) var(--epoch-radius-sm) 0;
    }
    .thread-comment {
      color: #2d3531;
      font-size: 0.86rem;
      line-height: 1.4;
    }
    .thread-comment strong {
      color: var(--epoch-color-ink);
      font-weight: 700;
      margin-inline-end: 0.3rem;
    }

    #community-content section[aria-label="Epoch site history"] {
      margin: 0.65rem 1.15rem 1rem;
      padding: 0.7rem 0.85rem;
      border: 1px solid var(--epoch-color-line);
      border-radius: var(--epoch-radius-md);
      background: var(--epoch-color-mint);
    }
    #community-content section[aria-label="Epoch site history"] h2 {
      margin: 0 0 0.3rem;
      font-size: 0.92rem;
    }
    #community-content section[aria-label="Epoch site history"] p,
    #community-content section[aria-label="Epoch site history"] dl {
      margin: 0;
      color: #2d3531;
      font-size: 0.82rem;
    }
    .site-history-facts {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.65rem 1rem;
      padding-block-start: 0.7rem;
    }
    .site-history-fact { min-width: 0; }
    .site-history-fact dt {
      color: var(--epoch-color-muted);
      font-size: 0.66rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    .site-history-fact dd {
      margin: 0.15rem 0 0;
      font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
      font-size: 0.74rem;
      overflow-wrap: anywhere;
    }

    @media (max-width: 800px) {
      #epoch-community {
        grid-template-columns: 1fr;
        height: auto;
        min-height: 100vh;
      }
      .channel-rail {
        grid-template-rows: auto;
        gap: 0.35rem;
        border-inline-end: 0;
        border-block-end: 1px solid #1c2622;
      }
      .site-history-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .community-list,
      .community-workspace-chrome .channel-list,
      .repo-list {
        grid-auto-columns: max-content;
        grid-auto-flow: column;
        max-height: none;
        overflow-x: auto;
        overflow-y: hidden;
        padding-block-end: 0.15rem;
      }
      .feed-header {
        align-items: start;
        flex-direction: column;
        gap: 0.35rem;
      }
      .repository-meta {
        justify-content: start;
        max-width: none;
        text-align: start;
      }
      .feed-shell { min-height: 70vh; }
      .message-action-tray dl { grid-template-columns: 1fr; }
    }

    @media (max-width: 800px) and (max-height: 600px) {
      .channel-rail {
        max-height: 32vh;
        overflow-y: auto;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      * {
        animation: none !important;
        transition: none !important;
      }
    }`;
}
