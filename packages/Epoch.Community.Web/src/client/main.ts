import type {
  CommunityChangeProposal,
  CommunityIssue,
  CommunityRepository,
} from "@epoch/community-core";
import type {
  CommunityAgentMember,
  CommunityChannelId,
  CommunityConversationView,
  CommunityFeedChangeItem,
  CommunityFeedIssueItem,
  CommunityFeedSource,
  CommunitySessionIdentity,
  CommunitySpace,
  DevFeedItem,
  DevFeedTab,
  ProductMode,
} from "../model/types";
import {
  channelForIssue,
  defaultCommunityAgents,
  defaultSocialChannels,
  defaultWorkChannels,
  emptyCopyForChannel,
} from "../model/channels";
import { messageMatchesReceiptSearch } from "../model/search";
import { emptyDevFeedItem, renderDevFeedItem } from "../view/dev-feed";
import { SNAPSHOT_COMMUNITY_RECOVERY_MESSAGE } from "../view/honesty";
import { escapeHtml } from "../view/html";
import { renderIdentityChip } from "../view/identity-chip";
import { renderConversation, renderSignerStrip } from "../view/message";
import { renderChannelButton } from "../view/rail";
import { asListState, renderEmptyState, renderSearchZeroState } from "../view/states";
import { emptyArtifactItem, renderChangeListItem, renderIssueListItem } from "../view/work-surfaces";

/** Serialized shape of the #epoch-community-state JSON island. */
interface CommunityClientState {
  apiBaseUrl?: string;
  repositories?: CommunityRepository[];
  conversations?: CommunityConversationView[];
  feedSource?: CommunityFeedSource | string;
  devFeedItems?: DevFeedItem[];
  communityAgents?: CommunityAgentMember[];
  communities?: CommunitySpace[];
  session?: Partial<CommunitySessionIdentity>;
  productMode?: ProductMode;
  activeCommunity?: string;
  activeRepo?: string;
}

function readState(): CommunityClientState {
  const stateElement = document.getElementById("epoch-community-state");
  if (stateElement === null) {
    return {
      conversations: [],
      repositories: [],
      feedSource: "snapshot",
      devFeedItems: [],
      communities: [],
      productMode: "community",
      activeCommunity: "epoch-civic",
      activeRepo: "epoch/epoch",
    };
  }
  return JSON.parse(stateElement.textContent || "{}") as CommunityClientState;
}

const state = readState();
let activeChannel: CommunityChannelId = "general";
let selectedMessage: string | null = null;
let productMode: ProductMode = state.productMode || "community";
let activeFeedTab: DevFeedTab = "following";
let activeCommunity = state.activeCommunity
  || state.communities?.[0]?.id
  || "epoch-civic";
let activeRepo = state.activeRepo
  || state.repositories?.[0]?.slug
  || "epoch/epoch";
const actor = "maya";
/** Session drafts keyed by communityId + channel — Slack/Discord power-user expectation (BUG-18). */
const composerDrafts = new Map<string, string>();
/** During boot, deep-link syncing replaces the entry instead of pushing a new one. */
let booting = true;

const feed = document.querySelector<HTMLElement>("[data-message-feed]");
const devFeedList = document.querySelector<HTMLElement>("[data-dev-feed]");
const channelName = document.querySelector<HTMLElement>("[data-current-channel]");
const channelTopic = document.querySelector<HTMLElement>("[data-current-topic]");
const composer = document.querySelector<HTMLFormElement>("[data-comment-composer]");
const composerLabel = document.querySelector<HTMLElement>(".composer-label");
const composerInput = (): HTMLTextAreaElement | null =>
  composer?.querySelector("textarea")
  ?? (document.getElementById("community-message") as HTMLTextAreaElement | null);
const shareShipButton = document.querySelector<HTMLButtonElement>("[data-share-ship]");
const changeList = document.querySelector<HTMLElement>("[data-change-list]");
const issueList = document.querySelector<HTMLElement>("[data-issue-list]");
const shell = document.getElementById("epoch-community");
const connectionLabel = document.querySelector<HTMLElement>("[data-connection-label]");
const titleEl = document.getElementById("community-title");
const contextSub = document.querySelector<HTMLElement>("[data-context-sub]");
const brandSub = document.querySelector<HTMLElement>("[data-brand-sub]");
const communityChrome = document.querySelector<HTMLElement>("[data-community-workspace-chrome]");
const channelToolbar = document.querySelector<HTMLElement>("[data-channel-toolbar]");
const channelList = document.querySelector<HTMLElement>("[data-channel-list]");
const repoList = document.querySelector<HTMLElement>("[data-repo-list]");
const repoSurfaces = document.querySelector<HTMLElement>("[data-repo-surfaces]");
const honestyBanner = document.querySelector<HTMLElement>("[data-feed-honesty]");

/** Fallback topics come from the shared channel constants — no drifted copy. */
const channelTopics = new Map<string, string>(
  [...defaultSocialChannels, ...defaultWorkChannels].map((channel) => [channel.id, channel.topic]),
);

function apiBase(): string {
  return (state.apiBaseUrl || "").replace(/\/$/, "");
}

function live(): boolean {
  return Boolean(state.apiBaseUrl);
}

function repository(): CommunityRepository | undefined {
  return state.repositories?.[0];
}

function conversations(): readonly CommunityConversationView[] {
  return state.conversations ?? [];
}

function messages(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-message]"));
}

function channelLabel(channel: string): string {
  const map: Record<string, string> = {
    general: "general",
    showcase: "showcase",
    ideas: "idea",
    bugs: "bug",
    support: "support",
    "agent-runs": "agent",
    previews: "preview",
    governance: "governance",
  };
  return map[channel] || "general";
}

async function apiJson(method: string, path: string, body?: unknown): Promise<CommunityRepository> {
  const response = await fetch(apiBase() + path, {
    method,
    headers: {
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const parsed = text.length === 0 ? null : JSON.parse(text);
  if (!response.ok) {
    const message = parsed && parsed.error ? String(parsed.error) : response.statusText;
    throw new Error(message || `HTTP ${response.status}`);
  }
  return parsed as CommunityRepository;
}

function currentCommunity(): CommunitySpace | undefined {
  return state.communities?.find((space) => space.id === activeCommunity) ?? state.communities?.[0];
}

/**
 * Deep links: /community/c/<channel>, /community/network, /community/repo/<slug>.
 * Playwright loads this page via page.setContent on an opaque origin where
 * history APIs can throw — routing must never break the app.
 */
function syncRoute(path: string): void {
  try {
    if (window.location.pathname === path) {
      return;
    }
    if (booting) {
      window.history.replaceState(null, "", path);
    } else {
      window.history.pushState(null, "", path);
    }
  } catch {
    // Opaque origin (about:blank) or sandboxed document: keep the app working.
  }
}

interface InitialRoute {
  readonly mode: ProductMode;
  readonly channel?: string;
  readonly repo?: string;
}

function initialRoute(): InitialRoute {
  try {
    const path = window.location.pathname || "";
    if (/^\/community\/network\/?$/.test(path)) {
      return { mode: "network" };
    }
    const repoMatch = /^\/community\/repo\/(.+?)\/?$/.exec(path);
    if (repoMatch?.[1]) {
      return { mode: "repo", repo: decodeURIComponent(repoMatch[1]) };
    }
    const channelMatch = /^\/community\/c\/([A-Za-z0-9_-]+)\/?$/.exec(path);
    if (channelMatch?.[1]) {
      return { mode: "community", channel: channelMatch[1] };
    }
  } catch {
    // Fall through to the default plane.
  }
  return { mode: "community" };
}

function selectProductMode(mode: string): void {
  if (mode === "network") productMode = "network";
  else if (mode === "repo") productMode = "repo";
  else productMode = "community";
  if (shell) {
    shell.dataset.productMode = productMode;
    shell.dataset.activeCommunity = activeCommunity;
  }
  document.querySelectorAll<HTMLElement>("button[data-product-mode]").forEach((button) => {
    button.setAttribute("aria-pressed", button.dataset.productMode === productMode ? "true" : "false");
  });
  if (communityChrome) communityChrome.hidden = productMode === "network";
  if (repoSurfaces) repoSurfaces.hidden = productMode !== "repo";
  if (productMode === "network") {
    syncRoute("/community/network");
    selectSurface("network");
    if (titleEl) titleEl.textContent = "Network Feed";
    if (contextSub) contextSub.textContent = `${feedTabLabel(activeFeedTab)} · cross-community ATProto activity`;
    if (brandSub) brandSub.textContent = "Network · ATProto";
    if (channelToolbar) channelToolbar.hidden = true;
    if (honestyBanner) {
      honestyBanner.textContent = live()
        ? "Live Network Feed — cross-community ATProto follows, stars, releases, and contributions."
        : "Snapshot Network Feed — labeled ATProto samples. Live mutations disabled.";
    }
    renderDevFeedTab(activeFeedTab);
  } else if (productMode === "community") {
    const space = currentCommunity();
    selectSurface("channels");
    if (titleEl) titleEl.textContent = space ? space.name : "Community";
    if (brandSub) brandSub.textContent = space ? space.name : "Communities";
    if (channelToolbar) channelToolbar.hidden = false;
    document.querySelectorAll<HTMLElement>("[data-open-community]").forEach((button) => {
      button.setAttribute("aria-pressed", button.dataset.openCommunity === activeCommunity ? "true" : "false");
    });
    document.querySelectorAll<HTMLElement>("[data-open-repo]").forEach((button) => {
      button.setAttribute("aria-pressed", "false");
    });
    renderCommunityChannels();
    selectChannel(activeChannel || space?.channels[0]?.id || "general");
    if (honestyBanner) {
      honestyBanner.textContent = live()
        ? "Live community — social channels are community-owned; linked projects add issues, changes, and signed intents."
        : SNAPSHOT_COMMUNITY_RECOVERY_MESSAGE;
    }
  } else {
    syncRoute(`/community/repo/${activeRepo}`);
    selectSurface("issues");
    if (titleEl) titleEl.textContent = activeRepo;
    if (contextSub) contextSub.textContent = "Linked project · forge lists";
    if (brandSub) brandSub.textContent = activeRepo;
    if (channelToolbar) channelToolbar.hidden = true;
    document.querySelectorAll<HTMLElement>("[data-open-repo]").forEach((button) => {
      button.setAttribute("aria-pressed", button.dataset.openRepo === activeRepo ? "true" : "false");
    });
  }
}

function feedTabLabel(tab: DevFeedTab): string {
  if (tab === "network") return "Network";
  if (tab === "contributions") return "Contributions";
  return "Following";
}

function renderCommunityChannels(): void {
  const space = currentCommunity();
  if (!channelList || !space) return;
  const communityConversations = conversations().filter((item) => item.communityId === space.id);
  channelList.innerHTML = (space.channels ?? [])
    .map((channel) => renderChannelButton(channel, communityConversations, channel.id === activeChannel))
    .join("");
  channelList.querySelectorAll<HTMLElement>("[data-channel]").forEach((button) => {
    button.addEventListener("click", () => selectChannel(button.dataset.channel || "general"));
  });
  if (repoList) {
    repoList.innerHTML = (space.linkedRepos ?? []).map((slug) => {
      const repo = state.repositories?.find((item) => item.slug === slug);
      const count = repo?.issues?.length ?? 0;
      return `<button class="channel-button repo-button" type="button" data-open-repo="${escapeHtml(slug)}" aria-pressed="${productMode === "repo" && activeRepo === slug ? "true" : "false"}">`
        + `<span class="channel-button-label">${escapeHtml(slug)}</span>`
        + `<span class="channel-count">${count}</span></button>`;
    }).join("");
    repoList.querySelectorAll<HTMLElement>("[data-open-repo]").forEach((button) => {
      button.addEventListener("click", () => openRepository(button.dataset.openRepo || activeRepo));
    });
  }
  renderAgentMembers(space.id);
  updateAgentWorkingStatus();
}

const communityAgents: readonly CommunityAgentMember[] =
  Array.isArray(state.communityAgents) && state.communityAgents.length > 0
    ? state.communityAgents
    : defaultCommunityAgents;

function agentStatusLabel(agent: CommunityAgentMember): string {
  const kind = agent.sessionKind === "live" ? "live" : "sample";
  return `${kind} · ${agent.status}`;
}

function renderAgentMembers(communityId: string): void {
  const agentList = document.querySelector<HTMLElement>("[data-agent-list]");
  if (!agentList) return;
  const members = communityAgents.filter((agent) => (agent.communityIds ?? []).includes(communityId));
  if (members.length === 0) {
    agentList.innerHTML = '<p class="agent-list-empty">No member agents in this community yet.</p>';
    return;
  }
  agentList.innerHTML = members.map((agent) => {
    const kind = agent.sessionKind === "live" ? "live" : "sample";
    const label = agentStatusLabel(agent);
    return `<button class="channel-button agent-member" type="button" data-agent-member="${escapeHtml(agent.id)}"`
      + ` data-agent-status="${escapeHtml(agent.status)}"`
      + ` data-agent-session-kind="${escapeHtml(kind)}"`
      + ` aria-label="Member agent ${escapeHtml(agent.displayName)}, harness ${escapeHtml(agent.harness)}, ${escapeHtml(label)}">`
      + `<span class="channel-button-label">@${escapeHtml(agent.displayName)}</span>`
      + `<span class="agent-meta">${escapeHtml(agent.harness)} · ${escapeHtml(label)}</span></button>`;
  }).join("");
  agentList.querySelectorAll<HTMLElement>("[data-agent-member]").forEach((button) => {
    button.addEventListener("click", () => {
      selectChannel("agent-runs");
      const status = document.querySelector<HTMLElement>("[data-agent-working-status]");
      if (!status) return;
      const kind = button.getAttribute("data-agent-session-kind") || "sample";
      const name = (button.querySelector(".channel-button-label")?.textContent || "agent").replace(/^@/, "");
      if (kind === "live") {
        status.textContent = `@${name}: open agent-runs for live harness receipts`;
        status.setAttribute("data-agent-live", "true");
        status.removeAttribute("data-agent-sample");
      } else {
        status.textContent = `@${name}: sample member · open agent-runs for harness receipts (not a live ACP session)`;
        status.setAttribute("data-agent-sample", "true");
        status.removeAttribute("data-agent-live");
      }
    });
  });
}

function updateAgentWorkingStatus(): void {
  const status = document.querySelector<HTMLElement>("[data-agent-working-status]");
  if (!status) return;
  const inCommunity = communityAgents.filter((agent) =>
    (agent.communityIds ?? []).includes(activeCommunity)
  );
  const liveWorking = inCommunity.filter((agent) =>
    agent.status === "working" && agent.sessionKind === "live"
  );
  const sampleWorking = inCommunity.filter((agent) =>
    agent.status === "working" && agent.sessionKind !== "live"
  );
  // Honesty: never claim live Working without a real ACP session.
  if (liveWorking.length > 0) {
    status.textContent = liveWorking.map((agent) =>
      `@${agent.displayName} · ${agent.harness}: Working`
    ).join(" · ");
    status.setAttribute("data-agent-live", "true");
    status.removeAttribute("data-agent-sample");
    return;
  }
  if (sampleWorking.length > 0) {
    status.textContent = "Sample member agents · not a live ACP session";
    status.setAttribute("data-agent-sample", "true");
    status.removeAttribute("data-agent-live");
    return;
  }
  status.textContent = "";
  status.removeAttribute("data-agent-live");
  status.removeAttribute("data-agent-sample");
}

function openCommunity(communityId: string): void {
  saveComposerDraft();
  activeCommunity = communityId || activeCommunity;
  const space = currentCommunity();
  activeChannel = space?.channels[0]?.id ?? "general";
  selectedMessage = null;
  selectProductMode("community");
  restoreComposerDraft();
  renderAgentMembers(activeCommunity);
  updateAgentWorkingStatus();
}

function renderDevFeedTab(tab: string): void {
  activeFeedTab = (tab as DevFeedTab) || "following";
  document.querySelectorAll<HTMLElement>("[data-feed-tab]").forEach((button) => {
    button.setAttribute("aria-selected", button.dataset.feedTab === activeFeedTab ? "true" : "false");
  });
  if (!devFeedList) return;
  const items = (state.devFeedItems ?? []).filter((item) => (item.tabs ?? []).includes(activeFeedTab));
  if (items.length === 0) {
    devFeedList.innerHTML = emptyDevFeedItem(`No activity in ${feedTabLabel(activeFeedTab)} yet.`);
    return;
  }
  devFeedList.innerHTML = items.map((item) => renderDevFeedItem(item)).join("");
  if (contextSub && productMode === "network") {
    contextSub.textContent = `${feedTabLabel(activeFeedTab)} · cross-community ATProto activity`;
  }
}

function openRepository(slug: string, channel?: string): void {
  activeRepo = slug || activeRepo;
  selectProductMode("repo");
  if (channel) {
    // Jump into community channel context for the linked project conversation.
    activeChannel = channel as CommunityChannelId;
  }
}

function selectSurface(surface: string): void {
  document.querySelectorAll<HTMLElement>("[data-surface]").forEach((button) => {
    button.setAttribute("aria-pressed", button.dataset.surface === surface ? "true" : "false");
  });
  document.querySelectorAll<HTMLElement>("[data-surface-panel]").forEach((panel) => {
    panel.hidden = panel.getAttribute("data-surface-panel") !== surface;
  });
  if (channelToolbar) channelToolbar.hidden = surface !== "channels";
}

function draftKey(communityId: string, channel: string): string {
  return `${communityId || "community"}::${channel || "general"}`;
}

function saveComposerDraft(): void {
  const input = composerInput();
  if (!input) return;
  composerDrafts.set(draftKey(activeCommunity, activeChannel), input.value);
}

function restoreComposerDraft(): void {
  const input = composerInput();
  if (!input) return;
  const saved = composerDrafts.get(draftKey(activeCommunity, activeChannel));
  input.value = typeof saved === "string" ? saved : "";
}

function composerPlaceholder(channel: string): string {
  const placeholders: Record<string, string> = {
    general: "Write a hangout message — no repository required",
    showcase: "Share what you're building — demo, release, or project link",
    support: "Ask for help or post a solved answer for the community",
    ideas: "Propose an idea that can become a signed intent",
    bugs: "Report a defect with steps and expected result",
    "agent-runs": "Link an agent run to its originating intent",
    previews: "Share a preview URL and what reviewers should check",
    governance: "Record a moderation, witness, or release trust note",
  };
  return placeholders[channel] || "Write a message in this community channel";
}

function applyComposerChrome(): void {
  const input = composerInput();
  if (composerLabel) composerLabel.textContent = `Message #${activeChannel}`;
  if (input) {
    input.placeholder = composerPlaceholder(activeChannel);
    input.setAttribute("data-active-channel", activeChannel);
  }
  if (shareShipButton) {
    const showcase = activeChannel === "showcase";
    shareShipButton.hidden = false;
    shareShipButton.textContent = showcase ? "Ship template" : "Share a ship";
    shareShipButton.setAttribute("aria-label", showcase
      ? "Insert a share-what-you-built template in #showcase"
      : "Open #showcase to share what you are building");
  }
  const composerMeta = document.querySelector<HTMLElement>("[data-composer-meta]");
  const space = currentCommunity();
  if (composerMeta && space) composerMeta.textContent = `Signed as @${actor} · ${space.name}`;
}

// ── Durable local preferences ────────────────────────────────────────────────
// localStorage throws on opaque origins (the test harness renders via
// setContent) and in some privacy modes. Every access degrades to "no stored
// preference" rather than breaking the app.

const STORAGE_PREFIX = "epoch-community:";
const LAST_READ_KEY = `${STORAGE_PREFIX}last-read`;
const FIRST_RUN_KEY = `${STORAGE_PREFIX}first-run-dismissed`;

function readStoredValue(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStoredValue(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* preference simply does not persist */
  }
}

function readLastReadMap(): Record<string, number> {
  const raw = readStoredValue(LAST_READ_KEY);
  if (raw === null) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, number>)
      : {};
  } catch {
    return {};
  }
}

function lastReadKey(communityId: string, channel: string): string {
  return `${communityId}|${channel}`;
}

// ── Unread ───────────────────────────────────────────────────────────────────
// Derived from real loaded receipts: the watermark is how many messages this
// member had already seen in a channel. A channel with no watermark is NOT
// unread — a first visit must never light up every channel (ADR-0025).

function channelMessageCount(communityId: string, channel: string): number {
  return (state.conversations ?? []).filter(
    (item) => (item.communityId ?? communityId) === communityId && item.channel === channel,
  ).length;
}

function markChannelRead(communityId: string, channel: string): void {
  const map = readLastReadMap();
  map[lastReadKey(communityId, channel)] = channelMessageCount(communityId, channel);
  writeStoredValue(LAST_READ_KEY, JSON.stringify(map));
}

function updateUnreadBadges(): void {
  const map = readLastReadMap();
  document.querySelectorAll<HTMLElement>("[data-channel][aria-pressed]").forEach((button) => {
    const channel = button.dataset.channel;
    const slot = button.querySelector<HTMLElement>("[data-channel-unread]");
    if (channel === undefined || slot === null) return;
    const seen = map[lastReadKey(activeCommunity, channel)];
    const total = channelMessageCount(activeCommunity, channel);
    const unread = seen === undefined ? 0 : Math.max(0, total - seen);
    if (unread > 0) {
      // Not colour-only: the count is text, and the button's accessible name
      // carries it for members who never see the dot.
      slot.textContent = String(unread);
      slot.hidden = false;
      button.setAttribute("data-channel-has-unread", "true");
      button.setAttribute("aria-label", `# ${channel}, ${unread} unread`);
    } else {
      slot.textContent = "";
      slot.hidden = true;
      button.removeAttribute("data-channel-has-unread");
      button.removeAttribute("aria-label");
    }
  });
}

// ── First-run orientation ────────────────────────────────────────────────────

function revealFirstRunStrip(): void {
  const strip = document.querySelector<HTMLElement>("[data-first-run-strip]");
  if (strip === null) return;
  strip.hidden = readStoredValue(FIRST_RUN_KEY) !== null;
}

function dismissFirstRunStrip(): void {
  const strip = document.querySelector<HTMLElement>("[data-first-run-strip]");
  if (strip !== null) strip.hidden = true;
  writeStoredValue(FIRST_RUN_KEY, "1");
}

// ── Search highlighting ──────────────────────────────────────────────────────
// Original text is kept so highlighting is reversible and never compounds.

const originalText = new WeakMap<Element, string>();

function highlightTargets(message: HTMLElement): HTMLElement[] {
  return Array.from(
    message.querySelectorAll<HTMLElement>(".message-body > h2, .message-body > p"),
  );
}

function clearHighlight(message: HTMLElement): void {
  highlightTargets(message).forEach((element) => {
    const original = originalText.get(element);
    if (original !== undefined) element.textContent = original;
  });
}

function applyHighlight(message: HTMLElement, query: string): void {
  highlightTargets(message).forEach((element) => {
    const source = originalText.get(element) ?? element.textContent ?? "";
    originalText.set(element, source);
    const lower = source.toLowerCase();
    let cursor = 0;
    let html = "";
    for (;;) {
      const index = lower.indexOf(query, cursor);
      if (index < 0) break;
      html += escapeHtml(source.slice(cursor, index));
      html += `<mark>${escapeHtml(source.slice(index, index + query.length))}</mark>`;
      cursor = index + query.length;
    }
    if (cursor === 0) {
      element.textContent = source;
      return;
    }
    html += escapeHtml(source.slice(cursor));
    element.innerHTML = html;
  });
}

// ── Feed state ───────────────────────────────────────────────────────────────

// ── Contribution lineage ─────────────────────────────────────────────────────

/**
 * Mark the origin message and its resulting change row as one contribution,
 * then move the reader to the change. The dimension the scorecard calls
 * `promote` is otherwise invisible: you can promote a message and never see
 * that the two records are the same piece of work.
 */
function showLineage(proposalId: string): void {
  if (proposalId === "") return;
  document.querySelectorAll<HTMLElement>("[data-lineage-origin]").forEach((element) => {
    element.removeAttribute("data-lineage-origin");
  });
  document.querySelectorAll<HTMLElement>("[data-lineage-target]").forEach((element) => {
    element.removeAttribute("data-lineage-target");
  });

  const origin = document.querySelector<HTMLElement>(
    `[data-message][data-linked-proposal="${CSS.escape(proposalId)}"]`,
  );
  origin?.setAttribute("data-lineage-origin", "true");

  const row = document.querySelector<HTMLElement>(
    `[data-change-list] [data-change-id="${CSS.escape(proposalId)}"]`,
  );
  if (row === null) {
    if (origin) setStatus(origin, "Lineage: this change is not in the linked project list yet.");
    return;
  }
  row.setAttribute("data-lineage-target", "true");
  if (productMode !== "repo") selectProductMode("repo");
  selectSurface("changes");
  row.scrollIntoView({ block: "center", behavior: "smooth" });
}

function updateFeedState(visibleCount: number, query: string): void {
  const stateItem = document.querySelector<HTMLElement>(".message-feed [data-state-item]");
  if (stateItem === null) return;
  if (visibleCount > 0) {
    stateItem.hidden = true;
    return;
  }
  const copy = emptyCopyForChannel(activeChannel);
  stateItem.innerHTML = query
    ? renderSearchZeroState(query)
    : renderEmptyState({ title: copy.title, action: copy.action });
  stateItem.hidden = false;
}

function receiptSearchQuery(): string {
  const input = document.querySelector<HTMLInputElement>("[data-receipt-search]");
  return input && typeof input.value === "string" ? input.value.trim().toLowerCase() : "";
}

function applyChannelFilter(): void {
  const q = receiptSearchQuery();
  const searchStatus = document.querySelector<HTMLElement>("[data-receipt-search-status]");
  let hits = 0;
  messages().forEach((message) => {
    const sameCommunity = !message.dataset.communityId || message.dataset.communityId === activeCommunity;
    const channelOk = message.dataset.channel === activeChannel;
    const text = (message.textContent || "").toLowerCase();
    const match = messageMatchesReceiptSearch(text, q);
    // Empty query: channel filter. Non-empty: search receipts across channels in the community.
    const visible = sameCommunity && (q ? match : channelOk);
    message.hidden = !visible;
    if (q && visible) {
      hits += 1;
      message.setAttribute("data-search-hit", "true");
      applyHighlight(message, q);
    } else {
      message.removeAttribute("data-search-hit");
      clearHighlight(message);
    }
    if (message.dataset.messageId !== selectedMessage) {
      message.removeAttribute("data-selected-message");
      const tray = message.querySelector<HTMLElement>("[data-message-actions]");
      if (tray) tray.hidden = true;
    }
  });
  if (searchStatus) {
    searchStatus.textContent = q
      ? `${hits} receipt match${hits === 1 ? "" : "es"} in community`
      : "";
  }
  const visibleCount = q
    ? hits
    : messages().filter((message) => !message.hidden).length;
  updateFeedState(visibleCount, q);
  const space = currentCommunity();
  const channelMeta = space?.channels?.find((item) => item.id === activeChannel);
  if (channelName) {
    channelName.textContent = q ? `# search · ${activeChannel}` : `# ${activeChannel}`;
  }
  if (channelTopic) {
    channelTopic.textContent = q
      ? "Searching messages, intents, harness labels, and promote receipts"
      : (channelMeta?.topic || channelTopics.get(activeChannel) || "");
  }
  if (contextSub && productMode === "community") {
    contextSub.textContent = q
      ? "Receipt search · community-wide"
      : `# ${activeChannel} · community channel`;
  }
  applyComposerChrome();
  document.querySelectorAll<HTMLElement>("[data-channel][aria-pressed]").forEach((item) => {
    item.setAttribute("aria-pressed", item.dataset.channel === activeChannel ? "true" : "false");
  });
  updateUnreadBadges();
}

function selectChannel(channel: string): void {
  saveComposerDraft();
  activeChannel = (channel as CommunityChannelId) || "general";
  selectedMessage = null;
  if (productMode === "network" || productMode === "repo") {
    selectProductMode("community");
  }
  syncRoute(`/community/c/${activeChannel}`);
  selectSurface("channels");
  // Opening a channel is what marks it read; the watermark is the message count
  // this member has now seen.
  markChannelRead(activeCommunity, activeChannel);
  applyChannelFilter();
  restoreComposerDraft();
  updateAgentWorkingStatus();
  if (feed) feed.scrollTop = 0;
  const input = composerInput();
  if (input && activeChannel === "showcase") input.focus();
}

function openShareShip(): void {
  saveComposerDraft();
  if (activeChannel !== "showcase") {
    selectChannel("showcase");
  } else {
    applyComposerChrome();
  }
  const input = composerInput();
  if (!input) return;
  if (!input.value.trim()) {
    input.value = "Shipping: \nWhat: \nLink: \nWho can try it: \nNetwork: appears on Network Feed when AT is live (sample until then)";
    composerDrafts.set(draftKey(activeCommunity, "showcase"), input.value);
  }
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
}

function selectMessage(id: string): void {
  selectedMessage = id;
  messages().forEach((message) => {
    const selected = message.dataset.messageId === id;
    if (selected) message.setAttribute("data-selected-message", "true");
    else message.removeAttribute("data-selected-message");
    const tray = message.querySelector<HTMLElement>("[data-message-actions]");
    if (tray) tray.hidden = !selected;
  });
}

function setStatus(message: Element | null, text: string): void {
  const status = message?.querySelector("[data-action-status]");
  if (status) status.textContent = text;
}

function issueListModel(issue: CommunityIssue, repo: CommunityRepository): CommunityFeedIssueItem {
  return {
    id: issue.id,
    title: issue.title,
    author: issue.author,
    status: issue.status,
    labels: issue.labels ?? [],
    repositorySlug: repo.slug,
    channel: channelForIssue(issue.labels ?? []),
  };
}

function changeListModel(proposal: CommunityChangeProposal, repo: CommunityRepository): CommunityFeedChangeItem {
  return {
    id: proposal.id,
    title: proposal.title,
    author: proposal.author,
    status: proposal.status,
    sourceView: proposal.sourceView ?? "",
    targetView: proposal.targetView ?? "",
    repositorySlug: repo.slug,
  };
}

function issueConversation(issue: CommunityIssue, repo: CommunityRepository): CommunityConversationView {
  return {
    id: `issue-${issue.id}`,
    channel: channelForIssue(issue.labels ?? []),
    communityId: activeCommunity,
    repositorySlug: repo.slug,
    author: issue.author,
    role: "contributor",
    title: issue.title,
    body: issue.body || "",
    time: "live",
    anchor: `issue:${issue.id}`,
    signature: `sig:${String(issue.id).toLowerCase()}`,
    visibility: "community",
    state: issue.status,
    reactions: ["reply", "follow"],
    comments: (issue.comments ?? []).map((comment) => ({ author: comment.author, body: comment.body })),
    source: "api",
  };
}

function changeConversation(proposal: CommunityChangeProposal, repo: CommunityRepository): CommunityConversationView {
  return {
    id: `change-${proposal.id}`,
    channel: "previews",
    communityId: activeCommunity,
    repositorySlug: repo.slug,
    author: proposal.author,
    role: "contributor",
    title: proposal.title,
    body: proposal.body || `${proposal.sourceView} -> ${proposal.targetView}`,
    time: "live",
    anchor: `change:${proposal.id}`,
    signature: `sig:${String(proposal.id).toLowerCase()}`,
    visibility: "community",
    state: proposal.status,
    reactions: ["review", "preview"],
    linkedArtifact: proposal.sourceView || undefined,
    linkedProposalId: proposal.id,
    source: "api",
  };
}

function updateChannelCounts(repo: CommunityRepository): void {
  const counts: Record<string, number> = {
    support: 0, ideas: 0, bugs: 0, "agent-runs": 0, previews: 0, governance: 0, general: 0, showcase: 0,
  };
  for (const issue of repo.issues ?? []) {
    const channel = channelForIssue(issue.labels ?? []);
    counts[channel] = (counts[channel] || 0) + 1;
  }
  for (const _proposal of repo.changeProposals ?? []) {
    counts.previews += 1;
  }
  for (const item of conversations()) {
    if (item.role === "agent") {
      counts["agent-runs"] = (counts["agent-runs"] || 0) + 1;
    } else if (item.channel === "general" || item.channel === "showcase") {
      counts[item.channel] = (counts[item.channel] || 0) + 1;
    }
  }
  document.querySelectorAll<HTMLElement>("[data-channel][aria-pressed]").forEach((button) => {
    const countEl = button.querySelector(".channel-count");
    if (countEl) countEl.textContent = String(counts[button.dataset.channel ?? ""] || 0);
  });
  const issueCount = document.querySelector('[data-surface="issues"] .channel-count');
  if (issueCount) issueCount.textContent = String((repo.issues ?? []).length);
  const changeCount = document.querySelector('[data-surface="changes"] .channel-count');
  if (changeCount) changeCount.textContent = String((repo.changeProposals ?? []).length);
}

/** Thin DOM wrapper over the shared renderSignerStrip template (honest presence). */
function updateSignerStrip(): void {
  const strip = document.querySelector<HTMLElement>("[data-members-strip]");
  if (!strip) return;
  strip.innerHTML = renderSignerStrip(conversations());
}

function sessionIdentity(): CommunitySessionIdentity {
  const session = state.session ?? {};
  return {
    authState: session.authState ?? (live() ? "api-session" : "sample-session"),
    handle: (session.handle ?? `${actor}.epoch.community`).replace(/^@/, ""),
    did: session.did ?? `did:plc:${actor}`,
  };
}

function renderMetaParts(parts: readonly string[]): string {
  return renderIdentityChip(sessionIdentity())
    + parts.map((part) => `<span class="meta-sep" aria-hidden="true"></span><span>${escapeHtml(part)}</span>`).join("");
}

function updateRepositoryMeta(repo: CommunityRepository): void {
  const meta = document.querySelector<HTMLElement>("[data-header-meta]");
  if (!meta) return;
  if (productMode === "network") {
    const count = (state.devFeedItems ?? []).length;
    meta.innerHTML = renderMetaParts([
      `${count} events`,
      "network",
      live() ? "atproto:live" : "atproto:snapshot",
    ]);
    return;
  }
  if (productMode === "community") {
    const space = currentCommunity();
    meta.innerHTML = renderMetaParts([
      `${(state.communities ?? []).length} communities`,
      `${(space?.channels ?? []).length} channels`,
      live() ? "community:live" : "community:snapshot",
    ]);
    return;
  }
  const maintainers = repo.maintainers ?? [];
  meta.innerHTML = renderMetaParts([
    repo.visibility || "public",
    `${maintainers.length} maintainer${maintainers.length === 1 ? "" : "s"}`,
    `${(repo.issues ?? []).length} issues`,
    `${(repo.changeProposals ?? []).length} changes`,
    live() ? "project:live" : "project:snapshot",
  ]);
}

function renderRepository(repo: CommunityRepository): void {
  // Preserve multi-repo list; refresh the active slug in place when possible.
  const repos = state.repositories ? [...state.repositories] : [];
  const index = repos.findIndex((item) => item.slug === repo.slug);
  if (index >= 0) repos[index] = repo;
  else repos[0] = repo;
  state.repositories = repos;
  state.feedSource = live() ? "api" : state.feedSource;
  if (shell) {
    shell.dataset.feedSource = String(state.feedSource ?? "snapshot");
    shell.dataset.apiState = live() ? "connected" : "offline";
  }
  if (connectionLabel) {
    connectionLabel.textContent = live() ? "Live" : "Snapshot · ATProto";
  }
  if (feed) {
    const existing = conversations();
    // Preserve community-owned social + member-agent messages; refresh forge-backed rows.
    const social = existing.filter((item) =>
      item.role !== "agent" && (
        item.channel === "general" || item.channel === "showcase"
        || (!item.id.startsWith("issue-") && !item.id.startsWith("change-") && item.repositorySlug === undefined)
      ),
    );
    const agents = existing.filter((item) => item.role === "agent");
    const issueConvos = (repo.issues ?? []).map((issue) => issueConversation(issue, repo));
    const changeConvos = (repo.changeProposals ?? []).map((proposal) => changeConversation(proposal, repo));
    // Merge issue/change conversations back into state for channel counts; keep agent members.
    const retained = existing.filter((item) =>
      !(item.repositorySlug === repo.slug && (item.id.startsWith("issue-") || item.id.startsWith("change-"))),
    );
    state.conversations = [...retained, ...issueConvos, ...changeConvos];
    // EPX-D001 closed here: every message — social, agent, issue, change — renders
    // through the shared renderConversation, so client refreshes keep the full
    // signed action tray and stay byte-identical with server-rendered markup.
    // The empty-state item lives in the same <ol>, so it must survive a refresh
    // that replaces the message list wholesale.
    feed.innerHTML = [...social, ...agents, ...issueConvos, ...changeConvos]
      .map((conversation) => renderConversation(conversation, activeChannel, activeCommunity))
      .join("")
      + asListState(renderEmptyState(emptyCopyForChannel(activeChannel)), "feed-state", { hidden: true });
    updateSignerStrip();
  }
  if (issueList) {
    const issues = repo.issues ?? [];
    issueList.innerHTML = issues.length
      ? issues.map((issue) => renderIssueListItem(issueListModel(issue, repo))).join("")
      : emptyArtifactItem("No open issues in the connected repository.");
  }
  if (changeList) {
    const proposals = repo.changeProposals ?? [];
    changeList.innerHTML = proposals.length
      ? proposals.map((proposal) => renderChangeListItem(changeListModel(proposal, repo))).join("")
      : emptyArtifactItem("No change proposals yet. Promote a message with Mark intent.");
  }
  updateChannelCounts(repo);
  updateRepositoryMeta(repo);
  if (productMode === "community" || productMode === "repo") applyChannelFilter();
  if (productMode === "community") renderCommunityChannels();
  if (selectedMessage) selectMessage(selectedMessage);
}

async function refreshRepository(): Promise<CommunityRepository | null> {
  const repo = repository();
  if (!live() || !repo) return null;
  const updated = await apiJson("GET", `/repositories/${encodeURIComponent(repo.slug)}`);
  renderRepository(updated);
  return updated;
}

interface PostIssueInput {
  readonly title: string;
  readonly author: string;
  readonly body: string;
  readonly labels: readonly string[];
}

interface PostChangeInput {
  readonly title: string;
  readonly author: string;
  readonly body: string;
  readonly sourceView: string;
  readonly targetView: string;
}

async function postIssue(input: PostIssueInput): Promise<CommunityRepository> {
  const repo = repository();
  if (!live() || !repo) throw new Error("Live API unavailable");
  return apiJson("POST", `/repositories/${encodeURIComponent(repo.slug)}/issues`, input);
}

async function postComment(issueId: string, body: string): Promise<CommunityRepository> {
  const repo = repository();
  if (!live() || !repo) throw new Error("Live API unavailable");
  return apiJson(
    "POST",
    `/repositories/${encodeURIComponent(repo.slug)}/issues/${encodeURIComponent(issueId)}/comments`,
    { author: actor, body },
  );
}

async function postChange(input: PostChangeInput): Promise<CommunityRepository> {
  const repo = repository();
  if (!live() || !repo) throw new Error("Live API unavailable");
  return apiJson("POST", `/repositories/${encodeURIComponent(repo.slug)}/changes`, input);
}

async function postReview(changeId: string, decision: string): Promise<CommunityRepository> {
  const repo = repository();
  if (!live() || !repo) throw new Error("Live API unavailable");
  return apiJson(
    "POST",
    `/repositories/${encodeURIComponent(repo.slug)}/changes/${encodeURIComponent(changeId)}/reviews`,
    { reviewer: actor, decision, body: decision === "approved" ? "Approved from Community Web." : "" },
  );
}

async function handleComposerSubmit(text: string): Promise<void> {
  const body = text.trim();
  if (!body) return;
  if (!live()) {
    // Snapshot mode: local-only append (fail closed for durable write).
    const id = `comment-${Date.now()}`;
    if (!feed) return;
    const item = document.createElement("li");
    item.className = "feed-message";
    item.dataset.message = "";
    item.dataset.channel = activeChannel;
    item.dataset.communityId = activeCommunity;
    item.dataset.messageId = id;
    item.dataset.feedItemSource = "snapshot";
    item.innerHTML = '<div class="avatar" aria-hidden="true">MY</div><article class="message-body"><header class="message-meta"><strong>maya</strong><span>maintainer</span><time>now</time><span>local only</span></header><h2>Local note</h2><p></p><footer class="message-footer"><span>anchor:composer</span><span>sig:pending-local</span><span>community</span></footer></article>';
    const paragraph = item.querySelector("p");
    if (paragraph) paragraph.textContent = body;
    feed.append(item);
    applyChannelFilter();
    return;
  }

  const selected = selectedMessage
    ? document.querySelector<HTMLElement>(`[data-message-id="${CSS.escape(selectedMessage)}"]`)
    : null;
  const issueId = selected?.dataset.issueId;
  if (issueId) {
    const updated = await postComment(issueId, body);
    renderRepository(updated);
    selectMessage(`issue-${issueId}`);
    return;
  }

  const title = body.split("\n")[0].slice(0, 120) || "Community message";
  const updated = await postIssue({
    title,
    author: actor,
    body,
    labels: [channelLabel(activeChannel)],
  });
  renderRepository(updated);
  const issues = updated.issues ?? [];
  const created = issues[issues.length - 1];
  if (created) {
    selectChannel(channelForIssue(created.labels ?? []));
    selectMessage(`issue-${created.id}`);
  }
}

async function handleAction(action: string, message: HTMLElement): Promise<void> {
  const title = message.querySelector("h2")?.textContent || "Community intent";
  const body = message.querySelector("p")?.textContent || "";
  const issueId = message.dataset.issueId;
  const changeId = message.dataset.changeId;
  const repo = repository();

  if (!live()) {
    const actionLabels: Record<string, string> = {
      intent: "Mark intent",
      agent: "Request agent",
      answer: "Accept answer",
      docs: "Docs patch",
      report: "Report",
      approve: "Approve change",
    };
    const actionLabel = actionLabels[action] || "this action";
    setStatus(message, `Live API unavailable. Reconnect EPOCH_COMMUNITY_API_URL, reload this page, then retry ${actionLabel}.`);
    return;
  }

  try {
    if (action === "intent") {
      setStatus(message, "Recording intent candidate...");
      const updated = await postChange({
        title,
        author: actor,
        body,
        sourceView: `community/${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
        targetView: repo?.defaultView || "main",
      });
      renderRepository(updated);
      const proposal = (updated.changeProposals ?? []).filter((item) => item.title === title).slice(-1)[0]
        || (updated.changeProposals ?? []).slice(-1)[0];
      if (proposal) {
        // Stamp promote receipt on the originating message when it still exists.
        message.setAttribute("data-linked-proposal", proposal.id);
        if (!message.querySelector("[data-promote-receipt]")) {
          const messageBody = message.querySelector(".message-body");
          if (messageBody) {
            const receipt = document.createElement("div");
            receipt.className = "message-promote-receipt";
            receipt.setAttribute("data-promote-receipt", "true");
            receipt.setAttribute("data-proposal-id", proposal.id);
            receipt.innerHTML = '<span class="promote-receipt-label">Signed promote</span><strong data-proposal-link>proposal:'
              + escapeHtml(proposal.id) + '</strong><span class="promote-receipt-state" data-promote-state>'
              + escapeHtml(proposal.status || "open") + " · human review required</span>";
            const footer = messageBody.querySelector(".message-footer");
            if (footer) messageBody.insertBefore(receipt, footer);
            else messageBody.appendChild(receipt);
          }
        }
        const next = document.querySelector(`[data-message-id="change-${CSS.escape(proposal.id)}"]`)
          || document.querySelector(`[data-message-id="${CSS.escape(message.dataset.messageId ?? "")}"]`);
        if (next) {
          selectChannel("previews");
          selectMessage(`change-${proposal.id}`);
          setStatus(
            next,
            `Intent candidate recorded from the live API: ${proposal.id}`
              + ` (${proposal.status}). Promote receipt recorded. Human review still required.`,
          );
        }
      }
      return;
    }

    if (action === "agent") {
      setStatus(message, "Opening agent-run issue...");
      const updated = await postIssue({
        title: `Agent: ${title}`,
        author: "agent-ui-reviewer",
        body: `Agent requested from conversation.\n\n${body}\n\nHuman review remains required.`,
        labels: ["agent"],
      });
      renderRepository(updated);
      const created = (updated.issues ?? []).slice(-1)[0];
      if (created) {
        selectChannel("agent-runs");
        selectMessage(`issue-${created.id}`);
        setStatus(document.querySelector(`[data-message-id="issue-${CSS.escape(created.id)}"]`), "Agent run requested. Human review remains required.");
      }
      return;
    }

    if (action === "answer") {
      if (!issueId) {
        setStatus(message, "Select an issue thread to accept an answer.");
        return;
      }
      setStatus(message, "Recording accepted answer...");
      const updated = await postComment(issueId, `Accepted answer: ${body}`);
      renderRepository(updated);
      selectMessage(`issue-${issueId}`);
      setStatus(document.querySelector(`[data-message-id="issue-${CSS.escape(issueId)}"]`), "Accepted answer captured for this thread.");
      return;
    }

    if (action === "docs") {
      setStatus(message, "Opening docs patch proposal...");
      const updated = await postChange({
        title: `Docs: ${title}`,
        author: actor,
        body: `Docs patch candidate linked from conversation.\n\n${body}`,
        sourceView: `docs/${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
        targetView: repo?.defaultView || "main",
      });
      renderRepository(updated);
      const proposal = (updated.changeProposals ?? []).slice(-1)[0];
      if (proposal) {
        selectChannel("previews");
        selectMessage(`change-${proposal.id}`);
        setStatus(document.querySelector(`[data-message-id="change-${CSS.escape(proposal.id)}"]`), "Docs patch candidate linked to this conversation.");
      }
      return;
    }

    if (action === "report") {
      setStatus(message, "Opening moderation report...");
      const updated = await postIssue({
        title: `Moderation: ${title}`,
        author: actor,
        body: `Moderation report / legal-hold evidence.\n\nSource: ${title}\n\n${body}`,
        labels: ["governance", "moderation"],
      });
      renderRepository(updated);
      const created = (updated.issues ?? []).slice(-1)[0];
      if (created) {
        selectChannel("governance");
        selectMessage(`issue-${created.id}`);
        setStatus(document.querySelector(`[data-message-id="issue-${CSS.escape(created.id)}"]`), "Moderation report opened with legal-hold evidence.");
      }
      return;
    }

    if (action === "approve") {
      if (!changeId) {
        setStatus(message, "No change proposal on this message.");
        return;
      }
      setStatus(message, "Submitting approval...");
      const updated = await postReview(changeId, "approved");
      renderRepository(updated);
      selectMessage(`change-${changeId}`);
      setStatus(document.querySelector(`[data-message-id="change-${CSS.escape(changeId)}"]`), `Change approved by ${actor}.`);
    }
  } catch (error) {
    setStatus(message, `Action failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function wireEventHandlers(): void {
  document.querySelectorAll<HTMLElement>("button[data-product-mode]").forEach((button) => {
    button.addEventListener("click", () => selectProductMode(button.dataset.productMode || "community"));
  });
  document.querySelectorAll<HTMLElement>("[data-feed-tab]").forEach((button) => {
    button.addEventListener("click", () => renderDevFeedTab(button.dataset.feedTab || "following"));
  });
  document.querySelectorAll<HTMLElement>("[data-open-community]").forEach((button) => {
    button.addEventListener("click", () => openCommunity(button.dataset.openCommunity || activeCommunity));
  });
  document.querySelectorAll<HTMLElement>("[data-open-repo]").forEach((button) => {
    button.addEventListener("click", () => openRepository(button.dataset.openRepo || activeRepo));
  });
  document.querySelectorAll<HTMLElement>("[data-surface]").forEach((button) => {
    button.addEventListener("click", () => {
      if (productMode !== "repo") selectProductMode("repo");
      selectSurface(button.dataset.surface || "issues");
    });
  });
  document.querySelectorAll<HTMLElement>("[data-channel][aria-pressed]").forEach((button) => {
    button.addEventListener("click", () => selectChannel(button.dataset.channel || "general"));
  });

  document.addEventListener("click", (event) => {
    void handleDelegatedClick(event);
  });

  composer?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = composerInput();
    const value = input?.value || "";
    try {
      await handleComposerSubmit(value);
      if (input) input.value = "";
      composerDrafts.set(draftKey(activeCommunity, activeChannel), "");
    } catch (error) {
      if (input) input.placeholder = `Send failed: ${error instanceof Error ? error.message : String(error)}`;
    }
  });

  const liveComposerInput = composerInput();
  liveComposerInput?.addEventListener("input", () => {
    saveComposerDraft();
  });
  shareShipButton?.addEventListener("click", (event) => {
    event.preventDefault();
    openShareShip();
  });

  const receiptSearch = document.querySelector<HTMLInputElement>("[data-receipt-search]");
  if (receiptSearch) {
    receiptSearch.addEventListener("input", () => applyChannelFilter());
    receiptSearch.addEventListener("search", () => applyChannelFilter());
    receiptSearch.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || receiptSearch.value === "") return;
      event.preventDefault();
      receiptSearch.value = "";
      applyChannelFilter();
      const status = document.querySelector<HTMLElement>("[data-receipt-search-status]");
      // Announce the return to the channel: clearing must not be silent for
      // anyone reading through the live region.
      if (status) status.textContent = `Search cleared. Showing # ${activeChannel}.`;
      receiptSearch.focus();
    });
  }

  document.querySelector<HTMLElement>("[data-first-run-dismiss]")
    ?.addEventListener("click", (event) => {
      event.preventDefault();
      dismissFirstRunStrip();
    });
}

async function handleDelegatedClick(event: MouseEvent): Promise<void> {
  const target = event.target;
  if (!(target instanceof Element)) return;

  // The shared dev-feed template routes both actions through data-feed-open-repo:
  // with a channel hint it opens the community channel, otherwise the project.
  const feedOpen = target.closest("[data-feed-open-repo]");
  if (feedOpen) {
    event.preventDefault();
    const channel = feedOpen.getAttribute("data-feed-channel");
    if (channel) {
      selectProductMode("community");
      selectChannel(channel);
    } else {
      openRepository(feedOpen.getAttribute("data-feed-open-repo") || activeRepo);
    }
    return;
  }

  const reviewButton = target.closest("[data-review-change]");
  if (reviewButton) {
    event.preventDefault();
    try {
      const updated = await postReview(reviewButton.getAttribute("data-review-change") ?? "", "approved");
      renderRepository(updated);
      if (productMode !== "repo") selectProductMode("repo");
      selectSurface("changes");
    } catch (error) {
      console.error(error);
    }
    return;
  }

  const actionButton = target.closest<HTMLElement>("[data-action]");
  if (actionButton) {
    event.preventDefault();
    event.stopPropagation();
    const message = actionButton.closest<HTMLElement>("[data-message]");
    if (message) await handleAction(actionButton.dataset.action ?? "", message);
    return;
  }

  const reactionButton = target.closest<HTMLElement>(".reaction[data-reaction]");
  if (reactionButton) {
    event.preventDefault();
    event.stopPropagation();
    const message = reactionButton.closest<HTMLElement>("[data-message]");
    if (!message) return;
    const issueId = message.dataset.issueId;
    if (live() && issueId) {
      try {
        const updated = await postComment(issueId, `Reaction: ${reactionButton.dataset.reaction}`);
        renderRepository(updated);
        selectMessage(`issue-${issueId}`);
        setStatus(document.querySelector(`[data-message-id="issue-${CSS.escape(issueId)}"]`), "Recorded reaction via comment.");
      } catch (error) {
        setStatus(message, `Reaction failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      setStatus(message, live() ? "Reactions attach to issue threads." : "Live API unavailable for reactions.");
    }
    return;
  }

  // Contribution lineage: follow a promoted message across to the change it
  // became, highlighting both ends so the path from talk to reviewable work is
  // visible rather than implied.
  const lineageButton = target.closest<HTMLElement>("[data-view-lineage]");
  if (lineageButton) {
    event.preventDefault();
    event.stopPropagation();
    const proposalId = lineageButton.getAttribute("data-view-lineage") ?? "";
    showLineage(proposalId);
    return;
  }

  // Provenance reveal: the signature mark expands the record behind it.
  const signatureMark = target.closest<HTMLElement>("[data-signature-reveal]");
  if (signatureMark) {
    event.preventDefault();
    event.stopPropagation();
    const message = signatureMark.closest<HTMLElement>("[data-message]");
    const panel = message?.querySelector<HTMLElement>("[data-provenance-panel]");
    if (panel) {
      const opening = panel.hidden;
      panel.hidden = !opening;
      signatureMark.setAttribute("aria-expanded", opening ? "true" : "false");
      if (opening) {
        // Restart the underline draw on each open.
        panel.removeAttribute("data-provenance-revealed");
        void panel.offsetWidth;
        panel.setAttribute("data-provenance-revealed", "true");
      }
    }
    return;
  }

  const selectButton = target.closest<HTMLElement>("[data-select-message]");
  if (selectButton) {
    selectMessage(selectButton.dataset.selectMessage ?? "");
    return;
  }

  const message = target.closest<HTMLElement>("[data-message]");
  if (message && message.dataset.messageId && !target.closest("[data-message-actions]")) {
    selectMessage(message.dataset.messageId);
  }
}

function boot(): void {
  wireEventHandlers();
  const route = initialRoute();
  if (route.channel !== undefined
    && (currentCommunity()?.channels ?? []).some((channel) => channel.id === route.channel)) {
    activeChannel = route.channel as CommunityChannelId;
  }
  const deepLinkedRepo = route.repo !== undefined
    && (state.repositories ?? []).some((repo) => repo.slug === route.repo);
  if (route.mode === "network") {
    selectProductMode("network");
  } else if (route.mode === "repo" && deepLinkedRepo && route.repo !== undefined) {
    openRepository(route.repo);
  } else {
    selectProductMode("community");
  }
  applyComposerChrome();
  renderAgentMembers(activeCommunity);
  updateAgentWorkingStatus();
  revealFirstRunStrip();
  updateUnreadBadges();
  booting = false;
  if (live() && repository()) {
    refreshRepository().catch((error) => {
      if (connectionLabel) connectionLabel.textContent = "Live · error";
      console.error(error);
    });
  }
}

boot();
