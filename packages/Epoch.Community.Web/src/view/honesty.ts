import { escapeHtml } from "./html";

export const SNAPSHOT_COMMUNITY_RECOVERY_MESSAGE = "Snapshot communities — channels belong to the community (not a repo). To promote signed work, reconnect EPOCH_COMMUNITY_API_URL, reload this page, then retry the action.";

export function renderCommunityHonestyBanner(live: boolean, snapshotMode: boolean): string {
  if (!live) {
    return `<p class="api-banner" data-api-unconfigured data-feed-honesty="snapshot">${escapeHtml(SNAPSHOT_COMMUNITY_RECOVERY_MESSAGE)}</p>`;
  }
  if (snapshotMode) {
    return `<p class="api-banner" data-api-empty data-feed-honesty="live-empty">Live API connected. Community channels are ready; linked-repo activity will appear when issues/changes arrive.</p>`;
  }
  return `<p class="api-banner api-banner-live" data-feed-honesty="live">Live community — social channels are community-owned; linked projects add issues, changes, and signed intents.</p>`;
}
