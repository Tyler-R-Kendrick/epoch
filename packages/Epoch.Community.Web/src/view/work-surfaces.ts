import type { CommunityFeedChangeItem, CommunityFeedIssueItem } from "../model/types";
import { escapeHtml } from "./html";
import { asListState, renderEmptyState } from "./states";

export function renderIssueListItem(issue: CommunityFeedIssueItem): string {
  return `<li class="artifact-item" data-issue-id="${escapeHtml(issue.id)}">
    <span class="artifact-id">${escapeHtml(issue.id)}</span>
    <strong>${escapeHtml(issue.title)}</strong>
    <span class="artifact-meta">#${escapeHtml(issue.channel)} · ${escapeHtml(issue.status)} · ${escapeHtml(issue.author)}</span>
    <span class="artifact-labels">${issue.labels.map((label) => escapeHtml(label)).join(", ") || "unlabeled"}</span>
  </li>`;
}

export function renderChangeListItem(change: CommunityFeedChangeItem): string {
  return `<li class="artifact-item" data-change-id="${escapeHtml(change.id)}">
    <span class="artifact-id">${escapeHtml(change.id)}</span>
    <strong>${escapeHtml(change.title)}</strong>
    <span class="artifact-meta">${escapeHtml(change.status)} · ${escapeHtml(change.author)}</span>
    <span class="artifact-labels">${escapeHtml(change.sourceView)} → ${escapeHtml(change.targetView)}</span>
    <div class="artifact-actions">
      <button type="button" class="reaction" data-review-change="${escapeHtml(change.id)}">Approve</button>
    </div>
  </li>`;
}

export function emptyArtifactItem(title: string, action?: string): string {
  return asListState(
    renderEmptyState({ title, action }),
    "artifact-item artifact-empty",
  );
}
