import type { CommunityFeedChangeItem, CommunityFeedIssueItem } from "../model/types";
import { escapeHtml } from "./html";
import { renderRow } from "./row";
import { asListState, renderEmptyState } from "./states";

/**
 * Issue and change rows render through the shared row primitive.
 *
 * They previously had no interactive element at all while styling the id in the
 * same teal-700 used for links everywhere else — five false affordances and
 * zero real ones. The id is now the real navigation target.
 */
export function renderIssueListItem(issue: CommunityFeedIssueItem): string {
  // The channel already names the kind; printing the label again ("#ideas" then
  // "idea") spent a quarter of the row's ink restating one fact.
  const labels = issue.labels.filter((label) => !issue.channel.startsWith(label.toLowerCase()));
  return renderRow({
    classNames: "row-artifact",
    attrs: ` data-issue-id="${escapeHtml(issue.id)}"`,
    lead: { variant: "none" },
    meta: `<button type="button" class="row-id" data-open-artifact="${escapeHtml(issue.id)}" data-open-channel="${escapeHtml(issue.channel)}">${escapeHtml(issue.id)}</button>`,
    title: issue.title,
    foot: [
      `<span>#${escapeHtml(issue.channel)}</span>`,
      `<span>${escapeHtml(issue.status)}</span>`,
      `<span>${escapeHtml(issue.author)}</span>`,
      labels.length > 0 ? `<span>${labels.map((label) => escapeHtml(label)).join(", ")}</span>` : "",
    ].filter(Boolean).join(""),
  });
}

export function renderChangeListItem(change: CommunityFeedChangeItem): string {
  return renderRow({
    classNames: "row-artifact",
    attrs: ` data-change-id="${escapeHtml(change.id)}"`,
    lead: { variant: "none" },
    meta: `<button type="button" class="row-id" data-open-artifact="${escapeHtml(change.id)}" data-open-channel="previews">${escapeHtml(change.id)}</button>`,
    title: change.title,
    foot: [
      `<span>${escapeHtml(change.status)}</span>`,
      `<span>${escapeHtml(change.author)}</span>`,
      `<span>${escapeHtml(change.sourceView)} → ${escapeHtml(change.targetView)}</span>`,
    ].join(""),
    // Approving a signed change is the highest-consequence action in the
    // product; it shipped as a 28px reaction chip identical to "wave".
    actions: `<button type="button" class="button-primary" data-review-change="${escapeHtml(change.id)}">Approve</button>`,
  });
}

export function emptyArtifactItem(title: string, action?: string): string {
  return asListState(
    renderEmptyState({ title, action }),
    "row row-state",
  );
}
