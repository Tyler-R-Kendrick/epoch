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
  const conversations = communityConversations(app);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="${escapeHtml(app.pwa.themeColor)}">
  <title>${escapeHtml(app.pwa.name)}</title>
  <style>
${communityStyles()}
  </style>
</head>
<body>
  <a class="skip-link" href="#community-content">Skip to content</a>
  <main id="epoch-community" data-design-system="epoch-community" data-community-web-shell data-api-state="${app.apiBaseUrl === undefined ? "offline" : "connected"}">
    <aside class="channel-rail" data-community-channel-rail aria-label="Community channels">
      <a class="brand" href="${escapeHtml(app.pwa.startUrl)}" translate="no" aria-label="${escapeHtml(app.pwa.name)}">
        <span class="brand-mark" aria-hidden="true">EC</span>
      </a>
      <nav class="channel-list" aria-label="Channels">
        ${communityChannels.map((channel) => renderChannelButton(channel, conversations)).join("")}
      </nav>
      <div class="rail-status" aria-live="polite">
        <span class="status-dot ${app.apiBaseUrl === undefined ? "status-dot-muted" : ""}" aria-hidden="true"></span>
        <span>${app.apiBaseUrl === undefined ? "Snapshot" : "Live"}</span>
      </div>
    </aside>
    <section id="community-content" class="feed-shell" aria-labelledby="community-title">
      <header class="feed-header">
        <div>
          <p class="feed-kicker">epoch/epoch</p>
          <h1 id="community-title">${escapeHtml(app.pwa.name)}</h1>
        </div>
        <div class="repository-strip" aria-label="Repository state">
          ${renderRepositoryPills(app)}
        </div>
      </header>
      ${app.apiBaseUrl === undefined ? `<p class="api-banner" data-api-unconfigured>API not connected. Showing the signed snapshot included with this build.</p>` : ""}
      <div class="feed-toolbar" aria-label="Current channel">
        <span class="channel-name" data-current-channel># ideas</span>
        <span class="channel-topic" data-current-topic>Shape product ideas into signed intents, previews, and reviewable patches.</span>
      </div>
      <ol class="message-feed" data-message-feed aria-label="Community feed">
        ${conversations.map(renderConversation).join("")}
      </ol>
      <form class="composer" data-comment-composer aria-label="Write a community message">
        <label class="composer-label" for="community-message">Message #ideas</label>
        <textarea id="community-message" name="message" rows="3" placeholder="Share a question, idea, review note, or preview result"></textarea>
        <div class="composer-row">
          <span data-composer-meta>Signed as @maya · visible to community</span>
          <button type="submit">Send</button>
        </div>
      </form>
    </section>
    ${app.siteHistory === undefined ? "" : renderSiteHistory(app.siteHistory)}
  </main>
  <script type="application/json" id="epoch-community-state">${escapeScriptJson(JSON.stringify({
    apiBaseUrl: app.apiBaseUrl,
    repositories: app.repositories,
    conversations,
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

type CommunityChannelId = "support" | "ideas" | "bugs" | "agent-runs" | "previews" | "governance";

interface CommunityChannel {
  readonly id: CommunityChannelId;
  readonly label: string;
  readonly topic: string;
}

interface CommunityConversationView {
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
}

const communityChannels: readonly CommunityChannel[] = [
  { id: "support", label: "support", topic: "Get unstuck, accept answers, and turn repeated help into docs patches." },
  { id: "ideas", label: "ideas", topic: "Shape product ideas into signed intents, previews, and reviewable patches." },
  { id: "bugs", label: "bugs", topic: "Reproduce defects and connect reports to patches without losing context." },
  { id: "agent-runs", label: "agent-runs", topic: "Watch policy-bound agents propose work while humans keep merge authority." },
  { id: "previews", label: "previews", topic: "Review deploy previews, visual results, and release readiness in one thread." },
  { id: "governance", label: "governance", topic: "Handle moderation, legal hold, witnesses, and signed release trust." },
];

function communityConversations(app: CommunityWebAppDefinition): readonly CommunityConversationView[] {
  const repository = app.repositories[0];
  const slug = repository?.slug ?? "epoch/epoch";
  const maintainer = repository?.maintainers[0] ?? "maya";
  const issueConversations = app.repositories.flatMap((repo) =>
    repo.issues.map((issue) => ({
      id: `issue-${issue.id}`,
      channel: issue.labels.includes("bug") ? "bugs" as const : "support" as const,
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
    })),
  );
  const proposalConversations = app.repositories.flatMap((repo) =>
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
    })),
  );

  return [
    ...issueConversations,
    ...proposalConversations,
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
    },
  ];
}

function renderChannelButton(
  channel: CommunityChannel,
  conversations: readonly CommunityConversationView[],
): string {
  const count = conversations.filter((conversation) => conversation.channel === channel.id).length;
  const selected = channel.id === "ideas";
  return `<button class="channel-button" type="button" data-channel="${channel.id}" data-topic="${escapeHtml(channel.topic)}" aria-pressed="${selected ? "true" : "false"}">
    <span># ${escapeHtml(channel.label)}</span>
    <span class="channel-count">${count}</span>
  </button>`;
}

function renderRepositoryPills(app: CommunityWebAppDefinition): string {
  const repository = app.repositories[0];
  if (repository === undefined) {
    return `<span>No repository</span>`;
  }

  return [
    repository.visibility,
    `${repository.maintainers.length} maintainer${repository.maintainers.length === 1 ? "" : "s"}`,
    `${repository.issues.length} issues`,
    `${repository.changeProposals.length} changes`,
  ].map((label) => `<span>${escapeHtml(label)}</span>`).join("");
}

function renderConversation(conversation: CommunityConversationView): string {
  const hidden = conversation.channel === "ideas" ? "" : " hidden";
  return `<li class="feed-message" data-message data-channel="${conversation.channel}" data-message-id="${escapeHtml(conversation.id)}"${hidden}>
    <button class="message-hitbox" type="button" data-select-message="${escapeHtml(conversation.id)}" aria-label="Open signed actions for ${escapeHtml(conversation.title)}"></button>
    <div class="avatar" aria-hidden="true">${escapeHtml(initials(conversation.author))}</div>
    <article class="message-body">
      <header class="message-meta">
        <strong>${escapeHtml(conversation.author)}</strong>
        <span>${escapeHtml(conversation.role)}</span>
        <time>${escapeHtml(conversation.time)}</time>
        <span data-message-state>${escapeHtml(conversation.state)}</span>
      </header>
      <h2>${escapeHtml(conversation.title)}</h2>
      <p>${escapeHtml(conversation.body)}</p>
      <footer class="message-footer">
        <span>${escapeHtml(conversation.anchor)}</span>
        <span>${escapeHtml(conversation.signature)}</span>
        <span>${escapeHtml(conversation.visibility)}</span>
      </footer>
      <div class="reaction-row" aria-label="Reactions">
        ${conversation.reactions.map((reaction) => `<span>${escapeHtml(reaction)}</span>`).join("")}
      </div>
      <div class="message-action-tray" data-message-actions hidden>
        <dl>
          <div><dt>Anchor</dt><dd>${escapeHtml(conversation.anchor)}</dd></div>
          <div><dt>Signature</dt><dd>${escapeHtml(conversation.signature)}</dd></div>
          <div><dt>Artifact</dt><dd>${escapeHtml(conversation.linkedArtifact ?? conversation.repositorySlug)}</dd></div>
        </dl>
        <div class="action-row">
          <button type="button" data-action="intent">Mark intent</button>
          <button type="button" data-action="agent">Request agent</button>
          <button type="button" data-action="answer">Accept answer</button>
          <button type="button" data-action="docs">Docs patch</button>
          <button type="button" data-action="report">Report</button>
        </div>
        <p class="action-status" data-action-status>Human review required for signed project changes.</p>
      </div>
    </article>
  </li>`;
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
      const state = stateElement === null ? { conversations: [], repositories: [] } : JSON.parse(stateElement.textContent || "{}");
      let activeChannel = "ideas";
      let selectedMessage = null;

      const feed = document.querySelector("[data-message-feed]");
      const channelName = document.querySelector("[data-current-channel]");
      const channelTopic = document.querySelector("[data-current-topic]");
      const composer = document.querySelector("[data-comment-composer]");
      const composerLabel = document.querySelector(".composer-label");

      function messages() {
        return Array.from(document.querySelectorAll("[data-message]"));
      }

      function selectChannel(button) {
        activeChannel = button.dataset.channel || "ideas";
        selectedMessage = null;
        document.querySelectorAll("[data-channel][aria-pressed]").forEach((item) => {
          item.setAttribute("aria-pressed", item === button ? "true" : "false");
        });
        if (channelName) channelName.textContent = "# " + activeChannel;
        if (channelTopic) channelTopic.textContent = button.dataset.topic || "";
        if (composerLabel) composerLabel.textContent = "Message #" + activeChannel;
        messages().forEach((message) => {
          message.hidden = message.dataset.channel !== activeChannel;
          message.removeAttribute("data-selected-message");
          const tray = message.querySelector("[data-message-actions]");
          if (tray) tray.hidden = true;
        });
      }

      function selectMessage(id) {
        selectedMessage = id;
        messages().forEach((message) => {
          const selected = message.dataset.messageId === id;
          if (selected) {
            message.setAttribute("data-selected-message", "true");
          } else {
            message.removeAttribute("data-selected-message");
          }
          const tray = message.querySelector("[data-message-actions]");
          if (tray) tray.hidden = !selected;
        });
      }

      async function postIntent(message, status) {
        const repository = state.repositories && state.repositories[0];
        if (!state.apiBaseUrl || !repository) return false;
        const title = message.querySelector("h2")?.textContent || "Community intent";
        const body = message.querySelector("p")?.textContent || "";
        const response = await fetch(state.apiBaseUrl.replace(/\\/$/, "") + "/repositories/" + encodeURIComponent(repository.slug) + "/changes", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            title,
            author: "maya",
            body,
            sourceView: "community/" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
            targetView: repository.defaultView || "main",
          }),
        });
        status.textContent = response.ok ? "Intent candidate recorded from the live API." : "Intent request failed.";
        return response.ok;
      }

      function appendComment(text) {
        if (!feed || text.trim().length === 0) return;
        const id = "comment-" + Date.now();
        const item = document.createElement("li");
        item.className = "feed-message";
        item.dataset.message = "";
        item.dataset.channel = activeChannel;
        item.dataset.messageId = id;
        item.innerHTML = '<div class="avatar" aria-hidden="true">MY</div><article class="message-body"><header class="message-meta"><strong>maya</strong><span>maintainer</span><time>now</time><span>signed</span></header><h2>New reply</h2><p></p><footer class="message-footer"><span>anchor:composer</span><span>sig:pending-local</span><span>community</span></footer></article>';
        const body = item.querySelector("p");
        if (body) body.textContent = text.trim();
        feed.append(item);
      }

      document.querySelectorAll("[data-channel][aria-pressed]").forEach((button) => {
        button.addEventListener("click", () => selectChannel(button));
      });
      document.querySelectorAll("[data-select-message]").forEach((button) => {
        button.addEventListener("click", () => selectMessage(button.dataset.selectMessage));
      });
      feed?.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element) || target.closest("[data-action]")) return;
        const message = target.closest("[data-message]");
        if (message && message.dataset.messageId) selectMessage(message.dataset.messageId);
      });
      document.querySelectorAll("[data-action]").forEach((button) => {
        button.addEventListener("click", async (event) => {
          event.stopPropagation();
          const message = button.closest("[data-message]");
          const status = message?.querySelector("[data-action-status]");
          if (!message || !status) return;
          const action = button.dataset.action;
          if (action === "intent") {
            status.textContent = "Recording intent candidate...";
            await postIntent(message, status);
          } else if (action === "agent") {
            status.textContent = "Agent run requested. Human review remains required.";
          } else if (action === "answer") {
            status.textContent = "Accepted answer captured for this thread.";
          } else if (action === "docs") {
            status.textContent = "Docs patch candidate linked to this conversation.";
          } else if (action === "report") {
            status.textContent = "Moderation report opened with legal-hold evidence.";
          }
        });
      });
      composer?.addEventListener("submit", (event) => {
        event.preventDefault();
        const input = composer.querySelector("textarea");
        appendComment(input?.value || "");
        if (input) input.value = "";
      });
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
      --epoch-shadow-low: 0 16px 40px rgba(23, 34, 31, 0.08);
      --epoch-radius-sm: 4px;
      --epoch-radius-md: 8px;
      --epoch-space-1: 0.5rem;
      --epoch-space-2: 0.75rem;
      --epoch-space-3: 1rem;
      --epoch-space-4: 1.5rem;
      --epoch-space-5: 2rem;
      --epoch-space-6: 3rem;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      font-size: 16px;
      letter-spacing: 0;
      background: var(--epoch-color-surface);
    }

    * {
      box-sizing: border-box;
    }

    html {
      scroll-behavior: smooth;
    }

    body {
      min-width: 320px;
      margin: 0;
      color: var(--epoch-color-ink);
      background:
        linear-gradient(90deg, rgba(47, 115, 112, 0.08) 1px, transparent 1px),
        linear-gradient(180deg, rgba(47, 115, 112, 0.06) 1px, transparent 1px),
        var(--epoch-color-surface);
      background-size: 42px 42px;
      -webkit-font-smoothing: antialiased;
      -webkit-tap-highlight-color: rgba(186, 94, 63, 0.18);
      text-rendering: optimizeLegibility;
      touch-action: manipulation;
    }

    a {
      color: inherit;
      text-decoration-thickness: 1px;
      text-underline-offset: 0.2em;
    }

    a:hover {
      color: var(--epoch-color-accent-strong);
    }

    a:focus-visible {
      outline: 3px solid rgba(186, 94, 63, 0.42);
      outline-offset: 3px;
    }

    .skip-link {
      position: fixed;
      inset-block-start: var(--epoch-space-3);
      inset-inline-start: var(--epoch-space-3);
      z-index: 10;
      padding: var(--epoch-space-2) var(--epoch-space-3);
      border: 1px solid var(--epoch-color-ink);
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-surface-raised);
      color: var(--epoch-color-ink);
      transform: translateY(-140%);
      transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
    }

    .skip-link:focus-visible {
      transform: translateY(0);
    }

    #epoch-community {
      min-height: 100vh;
      overflow-x: hidden;
      display: grid;
      grid-template-columns: 17rem minmax(0, 1fr);
      background: #f6f2ea;
    }

    #community-content,
    #repositories {
      scroll-margin-top: var(--epoch-space-5);
    }

    .channel-rail {
      position: sticky;
      inset-block-start: 0;
      display: grid;
      grid-template-rows: auto 1fr auto;
      gap: 1rem;
      height: 100vh;
      padding: 1rem;
      border-inline-end: 1px solid #24302b;
      background: #17221f;
      color: #f7efe2;
    }

    .channel-rail .brand {
      display: inline-flex;
      width: 2.75rem;
      height: 2.75rem;
      align-items: center;
      justify-content: center;
      color: #f7efe2;
    }

    .channel-list {
      display: grid;
      align-content: start;
      gap: 0.35rem;
      min-width: 0;
      overflow-y: auto;
    }

    .channel-button {
      display: flex;
      width: 100%;
      min-height: 2.75rem;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.55rem 0.65rem;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: #c9d0ca;
      cursor: pointer;
      font: inherit;
      font-weight: 750;
      letter-spacing: 0;
      text-align: start;
    }

    .channel-button:hover,
    .channel-button[aria-pressed="true"] {
      background: #26362f;
      color: #fff9ed;
    }

    .channel-count {
      display: grid;
      min-width: 1.55rem;
      height: 1.55rem;
      place-items: center;
      border-radius: 999px;
      background: #394d43;
      color: #fff9ed;
      font-size: 0.78rem;
      font-variant-numeric: tabular-nums;
    }

    .rail-status {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      color: #bac6bd;
      font-size: 0.82rem;
      font-weight: 700;
    }

    .status-dot {
      width: 0.62rem;
      height: 0.62rem;
      border-radius: 999px;
      background: #69d391;
      box-shadow: 0 0 0 4px rgba(105, 211, 145, 0.15);
    }

    .status-dot-muted {
      background: #d8b765;
      box-shadow: 0 0 0 4px rgba(216, 183, 101, 0.18);
    }

    .feed-shell {
      display: grid;
      grid-template-rows: auto auto auto minmax(0, 1fr) auto;
      height: 100vh;
      min-width: 0;
      background: #f6f2ea;
    }

    .feed-header,
    .feed-toolbar,
    .composer {
      border-block-end: 1px solid #ded5c5;
      background: rgba(255, 251, 242, 0.92);
    }

    .feed-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      min-width: 0;
      padding: 0.95rem 1.25rem;
    }

    .feed-kicker {
      margin: 0 0 0.2rem;
      color: #756c5f;
      font-size: 0.78rem;
      font-weight: 800;
      text-transform: uppercase;
    }

    .feed-header h1 {
      max-width: none;
      margin: 0;
      font-size: 1.35rem;
      line-height: 1.1;
    }

    .repository-strip {
      display: flex;
      flex-wrap: wrap;
      justify-content: end;
      gap: 0.45rem;
      min-width: 0;
    }

    .repository-strip span,
    .reaction-row span {
      border: 1px solid #d7cbb8;
      border-radius: 999px;
      background: #fffaf0;
      color: #4a4035;
      font-size: 0.78rem;
      font-weight: 750;
      padding: 0.38rem 0.55rem;
    }

    .api-banner {
      margin: 0;
      padding: 0.7rem 1.25rem;
      border-block-end: 1px solid #e0c991;
      background: #fff4cf;
      color: #5b4420;
      font-size: 0.86rem;
      font-weight: 700;
    }

    .feed-toolbar {
      display: flex;
      align-items: baseline;
      gap: 0.75rem;
      min-width: 0;
      padding: 0.75rem 1.25rem;
    }

    .channel-name {
      flex: 0 0 auto;
      color: #1f2b25;
      font-weight: 850;
    }

    .channel-topic {
      min-width: 0;
      color: #746b5f;
      font-size: 0.9rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .message-feed {
      display: grid;
      align-content: start;
      gap: 0;
      min-height: 0;
      margin: 0;
      padding: 0.55rem 0 1rem;
      overflow-y: auto;
      list-style: none;
    }

    .feed-message {
      position: relative;
      display: grid;
      grid-template-columns: 2.75rem minmax(0, 1fr);
      gap: 0.85rem;
      min-width: 0;
      padding: 0.8rem 1.25rem;
    }

    .feed-message:hover,
    .feed-message[data-selected-message="true"] {
      background: #fffaf0;
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
      width: 2.5rem;
      height: 2.5rem;
      place-items: center;
      border-radius: 7px;
      background: #315347;
      color: #fff9ed;
      font-size: 0.78rem;
      font-weight: 850;
    }

    .message-body {
      position: relative;
      z-index: 1;
      display: grid;
      gap: 0.42rem;
      min-width: 0;
      pointer-events: none;
    }

    .message-body button,
    .message-body a,
    .message-body textarea {
      pointer-events: auto;
    }

    .message-meta,
    .message-footer,
    .reaction-row,
    .action-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.45rem;
      min-width: 0;
    }

    .message-meta {
      color: #746b5f;
      font-size: 0.82rem;
    }

    .message-meta strong {
      color: #1d2823;
      font-size: 0.95rem;
    }

    .message-body h2 {
      margin: 0;
      color: #1d2823;
      font-size: 1rem;
      line-height: 1.25;
    }

    .message-body p {
      max-width: 74ch;
      margin: 0;
      color: #3f443d;
      line-height: 1.55;
    }

    .message-footer {
      color: #756c5f;
      font-family: "Cascadia Mono", Consolas, monospace;
      font-size: 0.76rem;
    }

    .message-action-tray {
      display: grid;
      gap: 0.75rem;
      margin-block-start: 0.55rem;
      padding: 0.75rem;
      border: 1px solid #d7cbb8;
      border-radius: 8px;
      background: #fffdf7;
      box-shadow: 0 10px 30px rgba(32, 42, 36, 0.07);
    }

    .message-action-tray[hidden] {
      display: none;
    }

    .message-action-tray dl {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.65rem;
      margin: 0;
    }

    .message-action-tray button,
    .composer button {
      min-height: 2.35rem;
      border: 1px solid #26362f;
      border-radius: 6px;
      background: #1f2b25;
      color: #fff9ed;
      cursor: pointer;
      font: inherit;
      font-weight: 800;
      padding: 0.45rem 0.65rem;
    }

    .message-action-tray button:not(:first-child) {
      border-color: #d7cbb8;
      background: #fffaf0;
      color: #26362f;
    }

    .action-status {
      margin: 0;
      color: #746b5f;
      font-size: 0.86rem;
    }

    .composer {
      display: grid;
      gap: 0.55rem;
      padding: 0.85rem 1.25rem 1rem;
      border-block-start: 1px solid #ded5c5;
      border-block-end: 0;
    }

    .composer-label {
      color: #3f443d;
      font-size: 0.86rem;
      font-weight: 800;
    }

    .composer textarea {
      width: 100%;
      min-height: 4.5rem;
      resize: vertical;
      border: 1px solid #d7cbb8;
      border-radius: 8px;
      background: #fffdf7;
      color: #1d2823;
      font: inherit;
      line-height: 1.45;
      padding: 0.75rem;
    }

    .composer-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      color: #746b5f;
      font-size: 0.82rem;
    }

    .hero-shell {
      padding: max(var(--epoch-space-4), env(safe-area-inset-top)) var(--epoch-space-4) var(--epoch-space-6);
      background: linear-gradient(135deg, rgba(216, 236, 229, 0.92), rgba(238, 243, 241, 0.84));
      border-block-end: 1px solid var(--epoch-color-line);
    }

    .topbar,
    .hero-grid,
    .workflow-rail,
    .content-shell {
      width: min(1160px, calc(100% - 2rem));
      margin-inline: auto;
    }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--epoch-space-3);
      margin-block-end: var(--epoch-space-6);
    }

    .brand,
    .topbar-link,
    .button,
    .repo-open-link,
    .repo-actions a {
      border-radius: var(--epoch-radius-sm);
      font-weight: 700;
      text-decoration: none;
    }

    .brand {
      display: inline-flex;
      align-items: center;
      gap: var(--epoch-space-2);
      min-width: 0;
      font-size: 0.95rem;
    }

    .brand-mark {
      display: grid;
      width: 2.25rem;
      height: 2.25rem;
      place-items: center;
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-ink);
      color: var(--epoch-color-surface-raised);
      font-size: 0.75rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
    }

    .topbar-link {
      padding: 0.55rem 0.75rem;
      border: 1px solid var(--epoch-color-line);
      background: rgba(251, 251, 248, 0.62);
      color: var(--epoch-color-ink);
    }

    .hero-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(320px, 0.78fr);
      gap: var(--epoch-space-6);
      align-items: center;
    }

    .hero-copy {
      min-width: 0;
    }

    .eyebrow,
    .repo-visibility {
      margin: 0 0 var(--epoch-space-2);
      color: var(--epoch-color-accent-strong);
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    h1,
    h2,
    h3,
    p {
      overflow-wrap: break-word;
    }

    h1 {
      max-width: 11ch;
      margin: 0;
      font-size: 4rem;
      line-height: 0.95;
      text-wrap: balance;
    }

    h2 {
      margin: 0;
      font-size: 1.85rem;
      line-height: 1.1;
      text-wrap: balance;
    }

    h3 {
      margin: 0;
      font-size: 1.1rem;
      line-height: 1.2;
    }

    .lede {
      max-width: 62ch;
      margin: var(--epoch-space-4) 0 0;
      color: var(--epoch-color-muted);
      font-size: 1.08rem;
      line-height: 1.7;
    }

    .hero-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--epoch-space-2);
      margin-block-start: var(--epoch-space-5);
    }

    .button {
      display: inline-flex;
      min-height: 44px;
      align-items: center;
      justify-content: center;
      padding: 0.78rem 1rem;
      border: 1px solid transparent;
      transition:
        background-color 180ms cubic-bezier(0.22, 1, 0.36, 1),
        border-color 180ms cubic-bezier(0.22, 1, 0.36, 1),
        color 180ms cubic-bezier(0.22, 1, 0.36, 1),
        transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
    }

    .button:hover,
    .repo-open-link:hover,
    .repo-actions a:hover {
      transform: translateY(-1px);
    }

    .button-primary {
      background: var(--epoch-color-ink);
      color: var(--epoch-color-surface-raised);
    }

    .button-primary:hover {
      background: var(--epoch-color-accent-strong);
      color: var(--epoch-color-surface-raised);
    }

    .button-secondary {
      border-color: var(--epoch-color-line);
      background: var(--epoch-color-surface-raised);
      color: var(--epoch-color-ink);
    }

    .history-panel {
      min-width: 0;
      border: 1px solid rgba(23, 34, 31, 0.14);
      border-radius: var(--epoch-radius-md);
      background: rgba(251, 251, 248, 0.72);
      box-shadow: var(--epoch-shadow-low);
    }

    .history-graph {
      padding: var(--epoch-space-4);
    }

    .history-graph svg {
      display: block;
      width: 100%;
      height: auto;
    }

    .graph-rail {
      fill: none;
      stroke: var(--epoch-color-ink);
      stroke-linecap: round;
      stroke-width: 3;
    }

    .graph-rail-muted {
      opacity: 0.42;
      stroke: var(--epoch-color-teal);
    }

    .graph-node {
      fill: var(--epoch-color-surface-raised);
      stroke: var(--epoch-color-ink);
      stroke-width: 3;
    }

    .graph-node-accent {
      fill: var(--epoch-color-accent);
    }

    .graph-node-teal {
      fill: var(--epoch-color-teal);
    }

    .graph-node-gold {
      fill: var(--epoch-color-gold);
    }

    .history-stats,
    .repo-facts {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: var(--epoch-space-2);
      margin: var(--epoch-space-3) 0 0;
    }

    .history-stats div,
    .repo-facts div {
      min-width: 0;
    }

    dt {
      color: var(--epoch-color-muted);
      font-size: 0.78rem;
      font-weight: 700;
    }

    dd {
      margin: 0.15rem 0 0;
      color: var(--epoch-color-ink);
      font-size: 1rem;
      font-weight: 750;
      font-variant-numeric: tabular-nums;
    }

    .workflow-rail {
      display: grid;
      grid-template-columns: repeat(7, minmax(9.25rem, 1fr));
      gap: var(--epoch-space-2);
      margin-block: calc(-1 * var(--epoch-space-5)) var(--epoch-space-6);
      overflow-x: auto;
      padding: var(--epoch-space-2) 0 var(--epoch-space-3);
      scroll-padding-inline: var(--epoch-space-3);
    }

    .workflow-link {
      display: grid;
      gap: 0.28rem;
      min-height: 112px;
      min-width: 0;
      padding: var(--epoch-space-3);
      border: 1px solid var(--epoch-color-line);
      border-radius: var(--epoch-radius-md);
      background: var(--epoch-color-surface-raised);
      color: var(--epoch-color-ink);
      text-decoration: none;
      transition:
        border-color 180ms cubic-bezier(0.22, 1, 0.36, 1),
        box-shadow 180ms cubic-bezier(0.22, 1, 0.36, 1),
        transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
    }

    .workflow-link:hover {
      border-color: rgba(186, 94, 63, 0.46);
      box-shadow: var(--epoch-shadow-low);
      transform: translateY(-2px);
    }

    .workflow-label {
      font-weight: 800;
    }

    .workflow-purpose {
      color: var(--epoch-color-muted);
      font-size: 0.82rem;
      line-height: 1.45;
    }

    .content-shell {
      padding-block-end: var(--epoch-space-6);
    }

    .section-heading {
      display: grid;
      gap: var(--epoch-space-2);
      max-width: 66ch;
      margin-block-end: var(--epoch-space-4);
    }

    .section-heading p:last-child {
      margin: 0;
      color: var(--epoch-color-muted);
      line-height: 1.6;
    }

    .repo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 310px), 1fr));
      gap: var(--epoch-space-3);
    }

    .repo-card {
      display: grid;
      gap: var(--epoch-space-3);
      min-width: 0;
      padding: var(--epoch-space-4);
      border: 1px solid var(--epoch-color-line);
      border-radius: var(--epoch-radius-md);
      background: var(--epoch-color-surface-raised);
      box-shadow: 0 1px 0 rgba(23, 34, 31, 0.04);
    }

    .repo-card-header {
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: var(--epoch-space-3);
    }

    .repo-card p {
      margin: 0;
      color: var(--epoch-color-muted);
      line-height: 1.58;
    }

    .repo-open-link,
    .repo-actions a {
      display: inline-flex;
      min-height: 40px;
      align-items: center;
      justify-content: center;
      padding: 0.55rem 0.72rem;
      border: 1px solid var(--epoch-color-line);
      background: var(--epoch-color-surface);
      transition:
        background-color 180ms cubic-bezier(0.22, 1, 0.36, 1),
        border-color 180ms cubic-bezier(0.22, 1, 0.36, 1),
        transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
    }

    .repo-open-link {
      flex: 0 0 auto;
    }

    .repo-open-link:hover,
    .repo-actions a:hover {
      border-color: rgba(47, 115, 112, 0.45);
      background: var(--epoch-color-mint);
      color: var(--epoch-color-ink);
    }

    .topic-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .topic-list li,
    .topic-empty {
      border: 1px solid rgba(47, 115, 112, 0.24);
      border-radius: 999px;
      background: rgba(216, 236, 229, 0.6);
      color: var(--epoch-color-teal);
      font-size: 0.78rem;
      font-weight: 750;
      line-height: 1;
      padding: 0.45rem 0.6rem;
    }

    .repo-facts {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      padding-block-start: var(--epoch-space-3);
      border-block-start: 1px solid var(--epoch-color-line);
    }

    .repo-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--epoch-space-2);
    }

    .empty-state {
      border-style: dashed;
    }

    @media (max-width: 860px) {
      #epoch-community {
        grid-template-columns: 1fr;
        grid-template-rows: auto minmax(0, 1fr);
      }

      .channel-rail {
        position: sticky;
        z-index: 4;
        inset-block-start: 0;
        grid-template-columns: auto minmax(0, 1fr) auto;
        grid-template-rows: auto;
        height: auto;
        padding: 0.65rem;
      }

      .channel-list {
        grid-auto-columns: max-content;
        grid-auto-flow: column;
        grid-template-columns: none;
        overflow-x: auto;
        overflow-y: hidden;
      }

      .feed-shell {
        height: calc(100vh - 4.05rem);
      }

      .feed-header {
        align-items: start;
        flex-direction: column;
      }

      .repository-strip {
        justify-content: start;
      }

      .message-action-tray dl {
        grid-template-columns: 1fr;
      }

      .hero-grid {
        grid-template-columns: 1fr;
      }

      h1 {
        max-width: 100%;
        font-size: 3rem;
      }

      .history-stats {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 560px) {
      .feed-toolbar,
      .composer-row {
        align-items: stretch;
        flex-direction: column;
      }

      .channel-topic {
        white-space: normal;
      }

      .feed-message {
        grid-template-columns: 2.35rem minmax(0, 1fr);
        padding-inline: 0.75rem;
      }

      .avatar {
        width: 2.15rem;
        height: 2.15rem;
      }

      .hero-shell {
        padding-inline: var(--epoch-space-3);
      }

      .topbar,
      .hero-grid,
      .workflow-rail,
      .content-shell {
        width: min(100% - 1rem, 1160px);
      }

      .topbar {
        align-items: stretch;
        flex-direction: column;
        margin-block-end: var(--epoch-space-5);
      }

      .topbar-link {
        text-align: center;
      }

      h1 {
        font-size: 2.35rem;
      }

      .workflow-rail {
        grid-auto-columns: minmax(16rem, 82vw);
        grid-auto-flow: column;
        grid-template-columns: none;
      }

      .repo-card-header,
      .repo-actions,
      .hero-actions {
        align-items: stretch;
        flex-direction: column;
      }

      .repo-facts {
        grid-template-columns: 1fr;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      html {
        scroll-behavior: auto;
      }

      *,
      *::before,
      *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        scroll-behavior: auto !important;
        transition-duration: 0.01ms !important;
      }
    }`;
}
