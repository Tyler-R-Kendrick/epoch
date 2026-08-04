import { escapeHtml } from "./html";

/**
 * Honesty surface.
 *
 * The critique found liveness declared eight times on one screen — banner, header
 * meta, rail status, identity chip, composer footer, and three agent rows — with
 * the banner and the composer footer contradicting each other. Worse, the band
 * reserved for state was spent on feature copy: "social channels are
 * community-owned; linked projects add issues, changes, and signed intents" is one
 * word of state and eighteen of marketing.
 *
 * So: the working state carries no band at all — `renderStateChip` in the header is
 * the single source. A band appears only when something is degraded, and then it
 * says only what happened and what to do about it.
 */

export const SNAPSHOT_COMMUNITY_RECOVERY_MESSAGE = "Snapshot data. To promote signed work, reconnect EPOCH_COMMUNITY_API_URL, reload this page, then retry the action.";

export const LIVE_EMPTY_MESSAGE = "Live. No linked-project activity yet.";

export function renderCommunityHonestyBanner(live: boolean, snapshotMode: boolean): string {
  if (!live) {
    return `<p class="api-banner" data-api-unconfigured data-feed-honesty="snapshot">${escapeHtml(SNAPSHOT_COMMUNITY_RECOVERY_MESSAGE)}</p>`;
  }
  if (snapshotMode) {
    return `<p class="api-banner" data-api-empty data-feed-honesty="live-empty">${escapeHtml(LIVE_EMPTY_MESSAGE)}</p>`;
  }
  // Working state needs no explanation. The header chip says "live".
  return `<p class="api-banner" data-feed-honesty="live" hidden></p>`;
}

/**
 * The one place liveness is stated. Text, not colour alone, so it survives
 * forced-colours and a screen reader.
 */
export function renderStateChip(live: boolean, snapshotMode: boolean): string {
  const state = !live ? "snapshot" : snapshotMode ? "live-empty" : "live";
  const label = !live ? "snapshot" : "live";
  return `<span class="state-chip" data-atproto-status data-state="${escapeHtml(state)}" title="Community data source">
    <span class="state-dot" aria-hidden="true"></span>${escapeHtml(label)}
  </span>`;
}
