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
  readonly siteHistory?: CommunitySiteEpochHistory;
}

export interface CreateCommunityWebAppOptions {
  readonly client: CommunityClient;
  readonly basePath?: string;
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
      themeColor: "#1f6feb",
      backgroundColor: "#ffffff",
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
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(app.pwa.name)}</title>
</head>
<body>
  <main id="epoch-community">
    <header>
      <h1>${escapeHtml(app.pwa.name)}</h1>
      <p>${escapeHtml(app.project)}</p>
    </header>
    <nav aria-label="Community workflows">
      <ul>
        ${app.workflows.map((workflow) => `<li><a href="${escapeHtml(routeFor(app, workflow.id))}">${escapeHtml(workflow.label)}</a></li>`).join("")}
      </ul>
    </nav>
    <section aria-label="Repositories">
      <h2>Repositories</h2>
      ${app.repositories.map(renderRepository).join("")}
    </section>
    ${app.siteHistory === undefined ? "" : renderSiteHistory(app.siteHistory)}
  </main>
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

function renderRepository(repository: CommunityRepository): string {
  return `<article data-repository="${escapeHtml(repository.slug)}">
    <h3>${escapeHtml(repository.slug)}</h3>
    <p>${escapeHtml(repository.description)}</p>
    <dl>
      <dt>Maintainers</dt>
      <dd>${repository.maintainers.map(escapeHtml).join(", ")}</dd>
      <dt>Issues</dt>
      <dd>${repository.issues.length}</dd>
      <dt>Change proposals</dt>
      <dd>${repository.changeProposals.length}</dd>
    </dl>
  </article>`;
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

function routeFor(app: CommunityWebAppDefinition, workflowId: CommunityWorkflowId): string {
  return app.routes.find((route) => route.workflow === workflowId)?.path ?? app.pwa.startUrl;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}
