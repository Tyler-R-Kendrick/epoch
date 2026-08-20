import { isRecord, type BrowserEpoch } from "@epoch/integration-core";
import { digestOf, identifier } from "./digest";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;


/**
 * Social records as change feeds.
 *
 * A post, an issue, a review, a comment: every one of them is editable, and an
 * editable record with a single mutable body is a record whose past is a matter
 * of trust. Here each is a feed — a stable change identity with an append-only
 * line of revisions. Editing appends; nothing overwrites. "Edited" stops being
 * a badge that asks you to take someone's word for it and becomes a revision
 * you can read.
 *
 * The identity is native: a `changeId` derived from the feed's opening content,
 * and a `revisionId` per revision, both content digests rather than counters, so
 * two participants that saw the same edit agree on what to call it. A social
 * record can therefore point at repository truth instead of describing it.
 */
export type SocialRecordKind = "post" | "issue" | "review" | "comment" | "proposal";

export interface SocialRecordInput {
  readonly feed: string;
  readonly kind: SocialRecordKind;
  readonly body: string;
  readonly author?: string;
  readonly subject?: string;
  /** Set to edit an existing record; omit to open a new one. */
  readonly changeId?: string;
  readonly links?: Readonly<Record<string, string>>;
}

export interface SocialRevision {
  readonly changeId: string;
  readonly revisionId: string;
  readonly feed: string;
  readonly kind: SocialRecordKind;
  readonly body: string;
  readonly author: string;
  readonly subject?: string;
  readonly revision: number;
  readonly editOf?: string;
  readonly links?: Readonly<Record<string, string>>;
}

export interface SocialRecordSummary extends SocialRevision {
  readonly eventId: string;
  readonly revisionIds: readonly string[];
  readonly edited: boolean;
}

const FEED_PREFIX = "feeds/";

export function feedEntity(feed: string): string {
  return `${FEED_PREFIX}${feed}`;
}

export function appendSocialRevision(
  epoch: BrowserEpoch,
  input: SocialRecordInput,
): SocialRecordSummary {
  const feed = requireText(input.feed, "feed");
  const body = requireText(input.body, "body");
  const author = input.author ?? epoch.author;
  const existing = input.changeId === undefined
    ? undefined
    : revisionsOf(epoch, feed).filter((entry) => entry.changeId === input.changeId);
  if (input.changeId !== undefined && (existing === undefined || existing.length === 0)) {
    throw new Error(`No social record ${input.changeId} in feed '${feed}'.`);
  }

  const previous = existing?.at(-1);
  const changeId = previous?.changeId
    ?? identifier("chg", { feed, kind: input.kind, body, author, opened: true });
  const revision = (previous?.revision ?? 0) + 1;
  const record: SocialRevision = {
    changeId,
    revisionId: identifier("rev", { changeId, revision, body, author }),
    feed,
    kind: input.kind,
    body,
    author,
    revision,
    ...(!(input.subject === undefined) && { subject: input.subject }),
    ...(!(previous === undefined) && { editOf: previous.revisionId }),
    ...(!(input.links === undefined) && { links: input.links }),
  };

  const result = epoch.trackChange<SocialRevision>({
    entity: feedEntity(feed),
    surface: "social",
    source: "community-runtime",
    summary: previous === undefined
      ? `opened ${input.kind} ${changeId} in ${feed}`
      : `revised ${input.kind} ${changeId} in ${feed}`,
    payload: record,
    metadata: {
      feed,
      changeId,
      revisionId: record.revisionId,
      bodyDigest: digestOf(body),
    },
  });

  const revisionIds = [...(existing ?? []).map((entry) => entry.revisionId), record.revisionId];
  return {
    ...record,
    eventId: result.event.id,
    revisionIds,
    edited: revisionIds.length > 1,
  };
}

/** Every revision in a feed, oldest first. */
export function revisionsOf(epoch: BrowserEpoch, feed: string): readonly SocialRevision[] {
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  return epoch.repository.history()
    .filter((event) => event.entity === feedEntity(feed))
    .map((event) => (event.payload as { payload?: unknown }).payload)
    .filter(isSocialRevision);
}

/** The current state of each record in a feed: the last revision of each change. */
export function recordsOf(epoch: BrowserEpoch, feed: string): readonly SocialRecordSummary[] {
  const byChange = new Map<string, SocialRevision[]>();
  for (const revision of revisionsOf(epoch, feed)) {
    const line = byChange.get(revision.changeId) ?? [];
    line.push(revision);
    byChange.set(revision.changeId, line);
  }

  return [...byChange.values()].map((line) => {
    const head = line[line.length - 1];
    return {
      ...head,
      eventId: "",
      revisionIds: line.map((entry) => entry.revisionId),
      edited: line.length > 1,
    };
  });
}

export function historyOf(epoch: BrowserEpoch, feed: string, changeId: string): readonly SocialRevision[] {
  return revisionsOf(epoch, feed).filter((revision) => revision.changeId === changeId);
}

export function listFeeds(epoch: BrowserEpoch): readonly string[] {
  const feeds = new Set<string>();
  for (const event of epoch.repository.history()) {
    if (event.entity.startsWith(FEED_PREFIX)) feeds.add(event.entity.slice(FEED_PREFIX.length));
  }

  return [...feeds].sort();
}

function isSocialRevision(value: BoundaryValue): value is SocialRevision {
  return isRecord(value)
    && typeof value.changeId === "string"
    && typeof value.revisionId === "string"
    && typeof value.feed === "string"
    && typeof value.body === "string"
    && typeof value.revision === "number";
}

function requireText(value: string, label: string): string {
  const trimmed = String(value ?? "").trim();
  if (trimmed.length === 0) throw new Error(`A social record ${label} is required.`);
  return trimmed;
}
