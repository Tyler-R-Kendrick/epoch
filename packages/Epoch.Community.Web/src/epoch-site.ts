import { isObject, isString } from "./value-kind";
import { copyFileSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { EntityType, EpochRepository, type Event } from "@epoch/core";
import type {
  CommunitySiteEpochHistory,
  CommunitySiteEpochOperation,
  CommunitySiteEpochVersionSummary,
  CommunityWebAppDefinition,
  MaterializeCommunityWebSiteWithEpochOptions,
  MaterializedCommunityWebSite,
} from "./model/types";
import { renderCommunityWebDocument } from "./render/document";

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
    name: isString(version.payload.name) ? version.payload.name : version.id,
    view: isString(version.payload.view) ? version.payload.view : "main",
    files,
  };
}

function isVersionFile<Value>(value: Value): value is Value & { readonly path: string } {
  return isObject(value)
    && "path" in value
    && isString(value.path);
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
