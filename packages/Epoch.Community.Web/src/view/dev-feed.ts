import type { DevFeedItem } from "../model/types";
import { formatFeedTime } from "../model/dev-feed";
import { escapeHtml, initials } from "./html";
import { asListState, renderEmptyState } from "./states";

export function emptyDevFeedItem(title: string, action?: string): string {
  return asListState(
    renderEmptyState({ title, action }),
    "dev-feed-item dev-feed-empty",
  );
}

export function renderDevFeedItem(item: DevFeedItem): string {
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
