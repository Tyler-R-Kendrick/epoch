import { escapeHtml } from "./html";

/**
 * Empty / loading / error state system.
 *
 * One system for every list surface (message feed, dev feed, issues, changes,
 * agents, search). Voice rules live in docs/community-web-content-design.md:
 * name the object, state the truth, give a next verb. An empty state without a
 * next action is a failed state.
 */

/** `invite` asks for a contribution; `degraded` states a truth we cannot change yet. */
export type StateTone = "invite" | "degraded";

export interface EmptyStateInput {
  /** Names the object and its absence: "No messages in #showcase yet." */
  readonly title: string;
  /** The next verb the reader can act on now, or the recovery action when degraded. */
  readonly action?: string;
  readonly tone?: StateTone;
}

export function renderEmptyState(input: EmptyStateInput): string {
  const tone = input.tone ?? "invite";
  const action = input.action === undefined || input.action === ""
    ? ""
    : `<p class="state-action">${escapeHtml(input.action)}</p>`;
  return `<div class="state-block" data-state-kind="empty" data-state-tone="${tone}">
    <p class="state-title">${escapeHtml(input.title)}</p>
    ${action}
  </div>`;
}

/** Only for genuinely async paths — never fake latency to show this. */
export function renderLoadingState(label: string): string {
  return `<div class="state-block" data-state-kind="loading">
    <p class="state-title">${escapeHtml(label)}</p>
  </div>`;
}

export interface ErrorStateInput {
  /** What failed, in the reader's terms. */
  readonly what: string;
  /** Why, when we actually know. Omit rather than guess. */
  readonly why?: string;
  /** Retry affordance label; omitted when there is nothing to retry. */
  readonly retryLabel?: string;
  /** Value for data-state-retry, used by the client to wire the retry handler. */
  readonly retryAction?: string;
}

export function renderErrorState(input: ErrorStateInput): string {
  const sentence = input.why === undefined || input.why === ""
    ? input.what
    : `${input.what} — ${input.why}`;
  const retry = input.retryLabel === undefined || input.retryAction === undefined
    ? ""
    : `<button type="button" class="state-retry" data-state-retry="${escapeHtml(input.retryAction)}">${escapeHtml(input.retryLabel)}</button>`;
  return `<div class="state-block" data-state-kind="error">
    <p class="state-title">${escapeHtml(sentence)}</p>
    ${retry}
  </div>`;
}

/** List-item wrapper so `<ol>` surfaces stay valid markup. */
export function asListState(
  stateHtml: string,
  itemClass: string,
  options: { readonly hidden?: boolean } = {},
): string {
  const hidden = options.hidden === true ? " hidden" : "";
  return `<li class="${itemClass}" data-state-item${hidden}>${stateHtml}</li>`;
}

/** Zero-result copy for receipt search; names the query and the search scope. */
export function renderSearchZeroState(query: string): string {
  return renderEmptyState({
    title: `No receipts match “${query}”.`,
    action: "Search covers messages, intents, harness labels, and promote receipts in this community.",
  });
}

/**
 * Channel origin.
 *
 * The feed used to end in several hundred pixels of nothing with no marker for
 * where the channel starts — a plane the critique called a static document.
 * This states the beginning and who can read it, once, at the top.
 */
export function renderChannelOrigin(channel: string, communityName: string): string {
  return `<li class="row row-origin" data-channel-origin>
    <div class="row-body">
      <p class="row-origin-title">This is the start of # ${escapeHtml(channel)}</p>
      <p class="row-origin-note">Everyone in ${escapeHtml(communityName)} can read and post here.</p>
    </div>
  </li>`;
}
