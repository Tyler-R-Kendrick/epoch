import type { DevFeedItem } from "../model/types";
import { formatFeedTime } from "../model/dev-feed";
import { escapeHtml, initials } from "./html";
import { renderRow } from "./row";
import { asListState, renderEmptyState } from "./states";

export function emptyDevFeedItem(title: string, action?: string): string {
  return asListState(
    renderEmptyState({ title, action }),
    "row row-state",
  );
}

export function renderDevFeedItem(item: DevFeedItem): string {
  const objectHtml = item.object
    ? item.object.type === "repo" || item.object.type === "issue" || item.object.type === "change"
      ? `<button class="row-object" type="button" data-feed-open-repo="${escapeHtml(item.repoSlug ?? "")}" data-feed-channel="${escapeHtml(item.channelHint ?? "")}" data-feed-issue="${escapeHtml(item.object.type === "issue" ? item.object.hrefHint ?? "" : "")}" data-feed-change="${escapeHtml(item.object.type === "change" ? item.object.hrefHint ?? "" : "")}">${escapeHtml(item.object.label)}</button>`
      : `<span class="row-object-text">${escapeHtml(item.object.label)}</span>`
    : "";
  const openRepo = item.repoSlug
    ? `<button class="button-quiet" type="button" data-feed-open-repo="${escapeHtml(item.repoSlug)}" data-feed-channel="${escapeHtml(item.channelHint ?? "ideas")}">Open workspace</button>`
    : "";
  const channelHint = item.channelHint
    ? `<button class="button-quiet" type="button" data-feed-open-repo="${escapeHtml(item.repoSlug ?? "")}" data-feed-channel="${escapeHtml(item.channelHint)}">Open #${escapeHtml(item.channelHint)}</button>`
    : "";
  // The trust line used to be longer than the content it annotated — a 58-char
  // at:// URI under "@maya followed @nora". The signature is the mark; the full
  // record stays available rather than shouting on every row.
  const trust = `<span class="row-receipt" title="${escapeHtml([item.trust.sig, item.trust.anchor, item.trust.atUri, `src:${item.trust.source}`].filter(Boolean).join(" · "))}">
    <span class="row-receipt-mark" aria-hidden="true"></span>${escapeHtml(item.trust.sig ?? `src:${item.trust.source}`)}
  </span>`;
  return renderRow({
    classNames: "row-devfeed",
    attrs: ` data-dev-feed-item data-kind="${escapeHtml(item.kind)}" data-tabs="${escapeHtml(item.tabs.join(","))}"`,
    lead: { text: initials(item.actor.handle), variant: "person" },
    meta: `<strong class="row-actor">@${escapeHtml(item.actor.handle)}</strong>
      <span class="row-verb">${escapeHtml(item.verb)}</span>
      <time datetime="${escapeHtml(item.createdAt)}">${escapeHtml(formatFeedTime(item.createdAt))}</time>`,
    titleHtml: objectHtml || `<span class="row-title">${escapeHtml(item.verb)}</span>`,
    body: item.body,
    foot: trust,
    actions: `${openRepo}${channelHint}`,
  });
}
