import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CommunityWebAppDefinition } from "../model/types";
import { defaultCommunityAgents, defaultSocialChannels, defaultWorkChannels, emptyCopyForChannel } from "../model/channels";
import { buildDevFeed, filterDevFeedItems } from "../model/dev-feed";
import { buildCommunityFeed } from "../model/feed";
import { defaultSessionForApi, withLiveAgentSessions } from "../model/session";
import { buildCommunitySpaces } from "../model/spaces";
import { emptyDevFeedItem, renderDevFeedItem } from "../view/dev-feed";
import { renderCommunityHonestyBanner, renderStateChip } from "../view/honesty";
import { escapeHtml, escapeScriptJson } from "../view/html";
import { renderIdentityChip } from "../view/identity-chip";
import { renderConversation, renderSignerStrip } from "../view/message";
import { renderChannelButton } from "../view/rail";
import { renderSiteHistory } from "../view/site-history";
import { asListState, renderEmptyState } from "../view/states";
import { emptyArtifactItem, renderChangeListItem, renderIssueListItem } from "../view/work-surfaces";
import { renderServiceWorkerRegistration } from "./pwa";
import { communityStyles } from "./styles";

let cachedRuntimeBundle: string | undefined;

/**
 * The client runtime is a real compiled entry (src/client/main.ts) bundled by
 * Vite into dist/client/runtime.js and inlined here so the document stays a
 * single self-contained HTML string (Vercel SSG, Playwright setContent, Epoch
 * dogfooding all rely on that contract). This module compiles to CJS at
 * dist/render/document.js, so the bundle is resolved relative to __dirname.
 */
function communityRuntimeBundle(): string {
  if (cachedRuntimeBundle === undefined) {
    const bundlePath = join(__dirname, "..", "client", "runtime.js");
    try {
      cachedRuntimeBundle = readFileSync(bundlePath, "utf8");
    } catch {
      throw new Error(
        `Community Web client runtime bundle missing at ${bundlePath}. `
        + "Build it with: npm run build -w @epoch/community-web (vite build emits dist/client/runtime.js).",
      );
    }
  }
  return cachedRuntimeBundle;
}

export function renderCommunityWebDocument(app: CommunityWebAppDefinition): string {
  const feed = buildCommunityFeed({
    repositories: app.repositories,
    apiConnected: app.apiBaseUrl !== undefined,
  });
  const spaces = buildCommunitySpaces(app.repositories);
  const devFeed = buildDevFeed({
    repositories: app.repositories,
    apiConnected: app.apiBaseUrl !== undefined,
  });
  const conversations = feed.conversations;
  const live = app.apiBaseUrl !== undefined;
  const snapshotMode = feed.source === "snapshot";
  const session = app.session ?? defaultSessionForApi(app.apiBaseUrl);
  const communityAgents = withLiveAgentSessions(defaultCommunityAgents, app.liveAgentIds);
  const primaryRepo = app.repositories[0]?.slug ?? "epoch/epoch";
  const activeCommunity = spaces[0];
  const activeCommunityId = activeCommunity?.id ?? "epoch-civic";
  const defaultChannel = activeCommunity?.channels[0]?.id ?? "general";
  const communityConversations = conversations.filter((item) => item.communityId === activeCommunityId);
  const followingItems = filterDevFeedItems(devFeed.items, "following");
  const defaultChannelEmptyCopy = emptyCopyForChannel(defaultChannel);
  const defaultChannelHasMessages = communityConversations.some(
    (item) => item.channel === defaultChannel,
  );
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="${escapeHtml(app.pwa.themeColor)}">
  <meta name="color-scheme" content="light">
  <link rel="manifest" href="${escapeHtml(manifestHref(app))}">
  <title>${escapeHtml(app.pwa.name)}</title>
  <style>
${communityStyles()}
  </style>
</head>
<body>
  <a class="skip-link" href="#community-content">Skip to content</a>
  <main id="epoch-community" data-design-system="epoch-community" data-community-web-shell data-product-mode="community" data-active-community="${escapeHtml(activeCommunityId)}" data-api-state="${live ? "connected" : "offline"}" data-feed-source="${feed.source}" data-dev-feed-source="${devFeed.source}">
    <aside id="community-rail" class="channel-rail" data-community-channel-rail aria-label="Community navigation">
      <a class="brand" href="${escapeHtml(app.pwa.startUrl)}" translate="no" aria-label="${escapeHtml(app.pwa.name)}">
        <span class="brand-mark" aria-hidden="true">EC</span>
        <span class="brand-text">
          <span class="brand-name">Epoch</span>
          <span class="brand-sub" data-brand-sub>${escapeHtml(activeCommunity?.name ?? "Communities")}</span>
        </span>
      </a>
      <nav class="surface-list product-mode-list" aria-label="Discovery">
        <button class="surface-button" type="button" data-product-mode="network" aria-pressed="false">Network Feed</button>
      </nav>
      <div class="rail-section-label">Communities</div>
      <nav class="community-list" data-community-list aria-label="Communities">
        ${spaces.map((space) => `
        <button class="channel-button community-button" type="button" data-open-community="${escapeHtml(space.id)}" aria-pressed="${space.id === activeCommunityId ? "true" : "false"}">
          <span class="channel-button-label">${escapeHtml(space.name)}</span>
          <span class="channel-count">${space.channels.length}</span>
        </button>`).join("")}
      </nav>
      <div class="community-workspace-chrome" data-community-workspace-chrome>
        <div class="rail-section-label">Channels</div>
        <nav class="channel-list" data-channel-list aria-label="Community channels">
          ${(activeCommunity?.channels ?? [...defaultSocialChannels, ...defaultWorkChannels]).map((channel) =>
            renderChannelButton(channel, communityConversations, channel.id === defaultChannel),
          ).join("")}
        </nav>
        <div class="rail-section-label">Agents</div>
        <nav class="agent-list" data-agent-list aria-label="Member agents">
          ${communityAgents
            .filter((agent) => agent.communityIds.includes(activeCommunityId))
            .map((agent) => {
              const kind = agent.sessionKind === "live" ? "live" : "sample";
              const statusLabel = `${kind} · ${agent.status}`;
              return `
        <button class="channel-button agent-member" type="button" data-agent-member="${escapeHtml(agent.id)}" data-agent-status="${escapeHtml(agent.status)}" data-agent-session-kind="${escapeHtml(kind)}" aria-label="Member agent ${escapeHtml(agent.displayName)}, harness ${escapeHtml(agent.harness)}, ${escapeHtml(statusLabel)}">
          <span class="channel-button-label">@${escapeHtml(agent.displayName)}</span>
          <span class="agent-meta">${escapeHtml(agent.harness)} · ${escapeHtml(statusLabel)}</span>
        </button>`;
            }).join("") || `
        <p class="agent-list-empty">No member agents in this community yet.</p>`}
        </nav>
        <div class="rail-section-label">Linked projects</div>
        <nav class="repo-list" data-repo-list aria-label="Linked repositories">
          ${(activeCommunity?.linkedRepos ?? [primaryRepo]).map((slug) => {
            const repo = app.repositories.find((item) => item.slug === slug);
            const count = repo?.issues.length ?? 0;
            return `
        <button class="channel-button repo-button" type="button" data-open-repo="${escapeHtml(slug)}" aria-pressed="false">
          <span class="channel-button-label">${escapeHtml(slug)}</span>
          <span class="channel-count">${count}</span>
        </button>`;
          }).join("")}
        </nav>
        <nav class="surface-list repo-surface-list" data-repo-surfaces hidden aria-label="Repository surfaces">
          <button class="surface-button" type="button" data-surface="issues" aria-pressed="false">Issues <span class="channel-count">${feed.issues.length}</span></button>
          <button class="surface-button" type="button" data-surface="changes" aria-pressed="false">Changes <span class="channel-count">${feed.changes.length}</span></button>
        </nav>
      </div>
      <div class="rail-identity" data-rail-identity>
        ${renderIdentityChip(session)}
        <span class="visually-hidden" data-connection-label>${live ? "live" : "snapshot"}</span>
      </div>
    </aside>
    <section id="community-content" class="feed-shell" aria-labelledby="community-title">
      <header class="feed-header">
        <button class="rail-toggle" type="button" data-rail-toggle aria-expanded="false" aria-controls="community-rail" aria-label="Show communities and channels">
          <span aria-hidden="true">☰</span>
        </button>
        <div class="feed-heading">
          <h1 id="community-title">${escapeHtml(activeCommunity?.name ?? "Community")}</h1>
          <p class="feed-repo" data-context-sub># ${escapeHtml(defaultChannel)} · community channel</p>
        </div>
        <div class="repository-meta" data-header-meta role="status" aria-label="Community state">
          ${renderStateChip(live, snapshotMode)}
        </div>
      </header>
      ${renderCommunityHonestyBanner(live, snapshotMode)}
      <div class="surface-stage" data-surface-panel="network" hidden>
        <div class="feed-tabs" role="tablist" aria-label="Network Dev Feed tabs">
          <button class="feed-tab" type="button" role="tab" data-feed-tab="following" aria-selected="true">Following</button>
          <button class="feed-tab" type="button" role="tab" data-feed-tab="network" aria-selected="false">Network</button>
          <button class="feed-tab" type="button" role="tab" data-feed-tab="contributions" aria-selected="false">Contributions</button>
        </div>
        <ol class="dev-feed" data-dev-feed aria-label="Network Dev Feed">
          ${followingItems.map(renderDevFeedItem).join("") || emptyDevFeedItem(
            "No followed activity yet.",
            "Follow builders and communities to fill this feed.",
          )}
        </ol>
      </div>
      <div class="feed-toolbar" role="group" aria-label="Current channel" data-channel-toolbar>
        <span class="channel-name" data-current-channel># ${escapeHtml(defaultChannel)}</span>
        <span class="channel-topic" data-current-topic>${escapeHtml(activeCommunity?.channels.find((c) => c.id === defaultChannel)?.topic ?? "Community conversation")}</span>
        <label class="receipt-search" data-receipt-search-wrap>
          <span class="visually-hidden">Search messages, intents, and agent receipts</span>
          <input type="search" data-receipt-search placeholder="Search receipts…" autocomplete="off" enterkeyhint="search" />
        </label>
        <span class="receipt-search-status" data-receipt-search-status role="status" aria-live="polite"></span>
        <span class="members-strip" data-members-strip role="status" aria-label="Signers in loaded receipts">
          ${renderSignerStrip(conversations)}
        </span>
      </div>
      <div class="surface-stage" data-surface-panel="channels">
        <ol class="message-feed" data-message-feed aria-label="Community channel messages">
          ${conversations.map((conversation) => renderConversation(conversation, defaultChannel, activeCommunityId)).join("")}
          ${asListState(
            renderEmptyState(defaultChannelEmptyCopy),
            "feed-state",
            { hidden: defaultChannelHasMessages },
          )}
        </ol>
      </div>
      <div class="surface-stage" data-surface-panel="issues" hidden>
        <div class="feed-toolbar artifact-toolbar">
          <span class="channel-name">Issues</span>
          <span class="channel-topic">Linked repository issues (forge list, not community hangout).</span>
        </div>
        <ol class="artifact-list" data-issue-list aria-label="Issue list">
          ${feed.issues.map(renderIssueListItem).join("") || emptyArtifactItem(
            "No open issues in linked repositories.",
            "Open one from a conversation with Mark intent, or from the project itself.",
          )}
        </ol>
      </div>
      <div class="surface-stage" data-surface-panel="changes" hidden>
        <div class="feed-toolbar artifact-toolbar">
          <span class="channel-name">Changes</span>
          <span class="channel-topic">Change proposals for linked repositories.</span>
        </div>
        <ol class="artifact-list" data-change-list aria-label="Change proposal list">
          ${feed.changes.map(renderChangeListItem).join("") || emptyArtifactItem(
            "No change proposals yet.",
            "Promote a message with Mark intent to turn talk into a reviewable change.",
          )}
        </ol>
      </div>
      <form class="composer" data-comment-composer aria-label="Write a community message">
        <label class="composer-label visually-hidden" for="community-message">Message #${escapeHtml(defaultChannel)}</label>
        <textarea id="community-message" name="message" rows="1" data-composer-input placeholder="Message #${escapeHtml(defaultChannel)}"></textarea>
        <div class="composer-row">
          <span class="composer-meta" data-composer-meta>signed as @maya</span>
          <span class="agent-working-status" data-agent-working-status role="status" aria-live="polite"></span>
          <button class="button-primary" type="submit">Send</button>
        </div>
      </form>
      ${app.siteHistory === undefined ? "" : renderSiteHistory(app.siteHistory)}
    </section>
  </main>
  <script type="application/json" id="epoch-community-state">${escapeScriptJson(JSON.stringify({
    apiBaseUrl: app.apiBaseUrl,
    repositories: app.repositories,
    conversations,
    feedSource: feed.source,
    issues: feed.issues,
    changes: feed.changes,
    devFeedItems: devFeed.items,
    devFeedSource: devFeed.source,
    session,
    liveAgentIds: app.liveAgentIds ?? [],
    communityAgents,
    communities: spaces,
    productMode: "community",
    activeCommunity: activeCommunityId,
    activeRepo: primaryRepo,
  }))}</script>
  <script>
${communityRuntimeBundle()}
  </script>
  <script>
    ${renderServiceWorkerRegistration(app)}
  </script>
</body>
</html>`;
}

/** Manifest sits beside the page so the SSG output and the app agree. */
function manifestHref(app: CommunityWebAppDefinition): string {
  const base = app.pwa.startUrl.endsWith("/") ? app.pwa.startUrl : `${app.pwa.startUrl}/`;
  return `${base}manifest.webmanifest`;
}
