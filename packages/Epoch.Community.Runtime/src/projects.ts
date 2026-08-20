import { isRecord, type BrowserEpoch } from "@epoch/integration-core";
import { TRUNK_VIEW } from "./workspace";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;


/**
 * Projects, and the default `.epoch` project.
 *
 * A forge needs somewhere for a person's own configuration to live that is a
 * real repository rather than a settings blob. GitHub answers this with a
 * `.github` repository; Community Web answers it with `.epoch`: a project that
 * exists in every workspace, owns the dynamic interface the browser renders,
 * and has the same history, diff, merge, and rollback as anything else.
 *
 * It is created once, on first boot, and never silently recreated — if it is
 * there, its recorded revision is what the harness renders.
 */
export const DEFAULT_PROJECT_SLUG = ".epoch";

export interface CommunityProjectRecord {
  readonly slug: string;
  readonly title: string;
  readonly kind: "default" | "project";
  /** The view whose head is this project's dynamic interface. */
  readonly uiView: string;
  readonly description?: string;
}

export interface CommunityProjectSummary extends CommunityProjectRecord {
  readonly revision: number;
  readonly eventId: string;
  readonly created: boolean;
}

const PROJECT_PREFIX = "projects/";

export function projectEntity(slug: string): string {
  return `${PROJECT_PREFIX}${slug}`;
}

export function readProject(epoch: BrowserEpoch, slug: string): CommunityProjectRecord | undefined {
  const tracked = epoch.readOptionalTrackedEntity<CommunityProjectRecord>(projectEntity(slug));
  return tracked !== undefined && isProjectRecord(tracked.payload) ? tracked.payload : undefined;
}

export function listProjects(epoch: BrowserEpoch): readonly CommunityProjectSummary[] {
  const slugs = new Set<string>();
  for (const event of epoch.repository.history()) {
    if (event.entity.startsWith(PROJECT_PREFIX)) slugs.add(event.entity.slice(PROJECT_PREFIX.length));
  }

  return [...slugs].sort().flatMap((slug) => {
    const record = readProject(epoch, slug);
    if (record === undefined) return [];
    const latest = epoch.versionLedger(projectEntity(slug)).at(-1);
    return [{
      ...record,
      revision: latest?.revision ?? 1,
      eventId: latest?.eventId ?? "",
      created: false,
    }];
  });
}

export interface EnsureProjectInput {
  readonly slug?: string;
  readonly title?: string;
  readonly description?: string;
  readonly uiView?: string;
}

export function ensureProject(epoch: BrowserEpoch, input: EnsureProjectInput = {}): CommunityProjectSummary {
  const slug = input.slug ?? DEFAULT_PROJECT_SLUG;
  const existing = readProject(epoch, slug);
  if (existing !== undefined) {
    const latest = epoch.versionLedger(projectEntity(slug)).at(-1);
    return { ...existing, revision: latest?.revision ?? 1, eventId: latest?.eventId ?? "", created: false };
  }

  const record: CommunityProjectRecord = {
    slug,
    title: input.title ?? (slug === DEFAULT_PROJECT_SLUG ? "Your Epoch project" : slug),
    kind: slug === DEFAULT_PROJECT_SLUG ? "default" : "project",
    uiView: input.uiView ?? TRUNK_VIEW,
    ...(input.description === undefined
      ? slug === DEFAULT_PROJECT_SLUG
        ? { description: "Holds the interface this browser renders, with the same history as any other project." }
        : {}
      : { description: input.description }),
  };

  const result = epoch.trackChange<CommunityProjectRecord>({
    entity: projectEntity(slug),
    surface: "gen-ui",
    source: "community-runtime",
    summary: `created project ${slug}`,
    payload: record,
    metadata: { project: slug, uiView: record.uiView },
  });

  return { ...record, revision: result.revision, eventId: result.event.id, created: true };
}

function isProjectRecord(value: BoundaryValue): value is CommunityProjectRecord {
  return isRecord(value)
    && typeof value.slug === "string"
    && typeof value.title === "string"
    && typeof value.uiView === "string"
    && (value.kind === "default" || value.kind === "project");
}
