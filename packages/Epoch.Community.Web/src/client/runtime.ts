import { defaultCommunityAgents } from "../model/channels";
import { messageMatchesReceiptSearch } from "../model/search";
import { SNAPSHOT_COMMUNITY_RECOVERY_MESSAGE } from "../view/honesty";

export function communityRuntime(): string {
  return `    (() => {
      // Single search implementation: the exported, unit-tested helper is inlined
      // verbatim so server tests and the shipped runtime execute the same code.
      ${messageMatchesReceiptSearch.toString()}
      const stateElement = document.getElementById("epoch-community-state");
      const state = stateElement === null
        ? { conversations: [], repositories: [], issues: [], changes: [], feedSource: "snapshot", devFeedItems: [], communities: [], productMode: "community", activeCommunity: "epoch-civic", activeRepo: "epoch/epoch" }
        : JSON.parse(stateElement.textContent || "{}");
      let activeChannel = "general";
      let selectedMessage = null;
      let productMode = state.productMode || "community";
      let activeFeedTab = "following";
      let activeCommunity = state.activeCommunity || (state.communities && state.communities[0] && state.communities[0].id) || "epoch-civic";
      let activeRepo = state.activeRepo || (state.repositories && state.repositories[0] && state.repositories[0].slug) || "epoch/epoch";
      const actor = "maya";
      /** Session drafts keyed by communityId + channel — Slack/Discord power-user expectation (BUG-18). */
      const composerDrafts = new Map();

      const feed = document.querySelector("[data-message-feed]");
      const devFeedList = document.querySelector("[data-dev-feed]");
      const channelName = document.querySelector("[data-current-channel]");
      const channelTopic = document.querySelector("[data-current-topic]");
      const composer = document.querySelector("[data-comment-composer]");
      const composerLabel = document.querySelector(".composer-label");
      const composerInput = () => composer?.querySelector("textarea") || document.getElementById("community-message");
      const shareShipButton = document.querySelector("[data-share-ship]");
      const changeList = document.querySelector("[data-change-list]");
      const issueList = document.querySelector("[data-issue-list]");
      const shell = document.getElementById("epoch-community");
      const connectionLabel = document.querySelector("[data-connection-label]");
      const titleEl = document.getElementById("community-title");
      const contextSub = document.querySelector("[data-context-sub]");
      const brandSub = document.querySelector("[data-brand-sub]");
      const communityChrome = document.querySelector("[data-community-workspace-chrome]");
      const channelToolbar = document.querySelector("[data-channel-toolbar]");
      const channelList = document.querySelector("[data-channel-list]");
      const repoList = document.querySelector("[data-repo-list]");
      const repoSurfaces = document.querySelector("[data-repo-surfaces]");
      const honestyBanner = document.querySelector("[data-feed-honesty]");

      const channelTopics = {
        general: "Day-to-day community hangout — independent of any single repository.",
        showcase: "Share demos, screenshots, and wins with the community.",
        support: "Get unstuck, accept answers, and turn repeated help into docs patches.",
        ideas: "Shape product ideas into signed intents, previews, and reviewable patches.",
        bugs: "Reproduce defects and connect reports to patches without losing context.",
        "agent-runs": "Watch policy-bound agents propose work while humans keep merge authority.",
        previews: "Review deploy previews, visual results, and release readiness in one thread.",
        governance: "Handle moderation, legal hold, witnesses, and signed release trust.",
      };

      function apiBase() {
        return (state.apiBaseUrl || "").replace(/\\/$/, "");
      }

      function live() {
        return Boolean(state.apiBaseUrl);
      }

      function repository() {
        return state.repositories && state.repositories[0];
      }

      function messages() {
        return Array.from(document.querySelectorAll("[data-message]"));
      }

      function channelLabel(channel) {
        const map = {
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

      function channelForLabels(labels) {
        const normalized = (labels || []).map((label) => String(label).toLowerCase());
        if (normalized.includes("idea") || normalized.includes("ideas")) return "ideas";
        if (normalized.includes("bug") || normalized.includes("bugs")) return "bugs";
        if (normalized.includes("agent") || normalized.includes("agent-run")) return "agent-runs";
        if (normalized.includes("governance") || normalized.includes("security") || normalized.includes("moderation")) return "governance";
        if (normalized.includes("preview")) return "previews";
        if (normalized.includes("showcase") || normalized.includes("demo")) return "showcase";
        if (normalized.includes("general")) return "general";
        return "support";
      }

      function initials(value) {
        return String(value || "?")
          .split(/[^a-zA-Z0-9]+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0].toUpperCase())
          .join("")
          .slice(0, 2) || "?";
      }

      function escapeHtml(value) {
        return String(value)
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#39;");
      }

      async function apiJson(method, path, body) {
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
          const message = parsed && parsed.error ? parsed.error : response.statusText;
          throw new Error(message || ("HTTP " + response.status));
        }
        return parsed;
      }

      function currentCommunity() {
        return (state.communities || []).find((space) => space.id === activeCommunity) || (state.communities || [])[0];
      }

      function selectProductMode(mode) {
        if (mode === "network") productMode = "network";
        else if (mode === "repo") productMode = "repo";
        else productMode = "community";
        if (shell) {
          shell.dataset.productMode = productMode;
          shell.dataset.activeCommunity = activeCommunity;
        }
        document.querySelectorAll("button[data-product-mode]").forEach((button) => {
          button.setAttribute("aria-pressed", button.dataset.productMode === productMode ? "true" : "false");
        });
        if (communityChrome) communityChrome.hidden = productMode === "network";
        if (repoSurfaces) repoSurfaces.hidden = productMode !== "repo";
        if (productMode === "network") {
          selectSurface("network");
          if (titleEl) titleEl.textContent = "Network Feed";
          if (contextSub) contextSub.textContent = feedTabLabel(activeFeedTab) + " · cross-community ATProto activity";
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
          document.querySelectorAll("[data-open-community]").forEach((button) => {
            button.setAttribute("aria-pressed", button.dataset.openCommunity === activeCommunity ? "true" : "false");
          });
          document.querySelectorAll("[data-open-repo]").forEach((button) => {
            button.setAttribute("aria-pressed", "false");
          });
          renderCommunityChannels();
          selectChannel(activeChannel || (space && space.channels[0] && space.channels[0].id) || "general");
          if (honestyBanner) {
            honestyBanner.textContent = live()
              ? "Live community — social channels are community-owned; linked projects add issues, changes, and signed intents."
              : ${JSON.stringify(SNAPSHOT_COMMUNITY_RECOVERY_MESSAGE)};
          }
        } else {
          selectSurface("issues");
          if (titleEl) titleEl.textContent = activeRepo;
          if (contextSub) contextSub.textContent = "Linked project · forge lists";
          if (brandSub) brandSub.textContent = activeRepo;
          if (channelToolbar) channelToolbar.hidden = true;
          document.querySelectorAll("[data-open-repo]").forEach((button) => {
            button.setAttribute("aria-pressed", button.dataset.openRepo === activeRepo ? "true" : "false");
          });
        }
      }

      function feedTabLabel(tab) {
        if (tab === "network") return "Network";
        if (tab === "contributions") return "Contributions";
        return "Following";
      }

      function renderCommunityChannels() {
        const space = currentCommunity();
        if (!channelList || !space) return;
        const counts = {};
        (state.conversations || []).forEach((item) => {
          if (item.communityId !== space.id) return;
          counts[item.channel] = (counts[item.channel] || 0) + 1;
        });
        channelList.innerHTML = (space.channels || []).map((channel) => {
          const selected = channel.id === activeChannel;
          return '<button class="channel-button" type="button" data-channel="' + escapeHtml(channel.id)
            + '" data-channel-kind="' + escapeHtml(channel.kind || "social")
            + '" data-topic="' + escapeHtml(channel.topic || "")
            + '" aria-pressed="' + (selected ? "true" : "false") + '">'
            + '<span class="channel-button-label"># ' + escapeHtml(channel.label || channel.id) + '</span>'
            + '<span class="channel-count">' + (counts[channel.id] || 0) + '</span></button>';
        }).join("");
        channelList.querySelectorAll("[data-channel]").forEach((button) => {
          button.addEventListener("click", () => selectChannel(button.dataset.channel || "general"));
        });
        if (repoList) {
          repoList.innerHTML = (space.linkedRepos || []).map((slug) => {
            const repo = (state.repositories || []).find((item) => item.slug === slug);
            const count = repo && repo.issues ? repo.issues.length : 0;
            return '<button class="channel-button repo-button" type="button" data-open-repo="' + escapeHtml(slug)
              + '" aria-pressed="' + (productMode === "repo" && activeRepo === slug ? "true" : "false") + '">'
              + '<span class="channel-button-label">' + escapeHtml(slug) + '</span>'
              + '<span class="channel-count">' + count + '</span></button>';
          }).join("");
          repoList.querySelectorAll("[data-open-repo]").forEach((button) => {
            button.addEventListener("click", () => openRepository(button.dataset.openRepo || activeRepo));
          });
        }
        renderAgentMembers(space.id);
        updateAgentWorkingStatus();
      }

      const communityAgents = Array.isArray(state.communityAgents) && state.communityAgents.length > 0
        ? state.communityAgents
        : ${JSON.stringify(defaultCommunityAgents)};

      function agentStatusLabel(agent) {
        const kind = agent.sessionKind === "live" ? "live" : "sample";
        return kind + " · " + agent.status;
      }

      function renderAgentMembers(communityId) {
        const agentList = document.querySelector("[data-agent-list]");
        if (!agentList) return;
        const members = (communityAgents || []).filter((agent) => (agent.communityIds || []).includes(communityId));
        if (members.length === 0) {
          agentList.innerHTML = '<p class="agent-list-empty">No member agents in this community yet.</p>';
          return;
        }
        agentList.innerHTML = members.map((agent) => {
          const kind = agent.sessionKind === "live" ? "live" : "sample";
          const label = agentStatusLabel(agent);
          return '<button class="channel-button agent-member" type="button" data-agent-member="' + escapeHtml(agent.id)
          + '" data-agent-status="' + escapeHtml(agent.status)
          + '" data-agent-session-kind="' + escapeHtml(kind)
          + '" aria-label="Member agent ' + escapeHtml(agent.displayName) + ', harness ' + escapeHtml(agent.harness) + ', ' + escapeHtml(label) + '">'
          + '<span class="channel-button-label">@' + escapeHtml(agent.displayName) + '</span>'
          + '<span class="agent-meta">' + escapeHtml(agent.harness) + ' · ' + escapeHtml(label) + '</span></button>';
        }).join("");
        agentList.querySelectorAll("[data-agent-member]").forEach((button) => {
          button.addEventListener("click", () => {
            selectChannel("agent-runs");
            const status = document.querySelector("[data-agent-working-status]");
            if (!status) return;
            const kind = button.getAttribute("data-agent-session-kind") || "sample";
            const name = (button.querySelector(".channel-button-label")?.textContent || "agent").replace(/^@/, "");
            if (kind === "live") {
              status.textContent = "@" + name + ": open agent-runs for live harness receipts";
              status.setAttribute("data-agent-live", "true");
              status.removeAttribute("data-agent-sample");
            } else {
              status.textContent = "@" + name + ": sample member · open agent-runs for harness receipts (not a live ACP session)";
              status.setAttribute("data-agent-sample", "true");
              status.removeAttribute("data-agent-live");
            }
          });
        });
      }

      function updateAgentWorkingStatus() {
        const status = document.querySelector("[data-agent-working-status]");
        if (!status) return;
        const inCommunity = (communityAgents || []).filter((agent) =>
          (agent.communityIds || []).includes(activeCommunity)
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
            "@" + agent.displayName + " · " + agent.harness + ": Working"
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

      function openCommunity(communityId) {
        saveComposerDraft();
        activeCommunity = communityId || activeCommunity;
        const space = currentCommunity();
        activeChannel = (space && space.channels[0] && space.channels[0].id) || "general";
        selectedMessage = null;
        selectProductMode("community");
        restoreComposerDraft();
        renderAgentMembers(activeCommunity);
        updateAgentWorkingStatus();
      }

      function renderDevFeedTab(tab) {
        activeFeedTab = tab || "following";
        document.querySelectorAll("[data-feed-tab]").forEach((button) => {
          button.setAttribute("aria-selected", button.dataset.feedTab === activeFeedTab ? "true" : "false");
        });
        if (!devFeedList) return;
        const items = (state.devFeedItems || []).filter((item) => (item.tabs || []).includes(activeFeedTab));
        if (items.length === 0) {
          devFeedList.innerHTML = '<li class="dev-feed-item dev-feed-empty"><p>No activity in ' + escapeHtml(feedTabLabel(activeFeedTab)) + ' yet.</p></li>';
          return;
        }
        devFeedList.innerHTML = items.map(renderDevFeedItemClient).join("");
        if (contextSub && productMode === "network") {
          contextSub.textContent = feedTabLabel(activeFeedTab) + " · cross-community ATProto activity";
        }
      }

      function renderDevFeedItemClient(item) {
        const objectLabel = item.object ? escapeHtml(item.object.label) : "";
        const repo = item.repoSlug || "";
        const channel = item.channelHint || "";
        const objectBtn = item.object && (item.object.type === "repo" || item.object.type === "issue" || item.object.type === "proposal")
          ? '<button class="dev-feed-object" type="button" data-feed-open-repo="' + escapeHtml(repo) + '" data-feed-channel="' + escapeHtml(channel) + '">' + objectLabel + '</button>'
          : (objectLabel ? '<span class="dev-feed-object-text">' + objectLabel + '</span>' : "");
        const trust = [
          item.trust && item.trust.sig ? escapeHtml(item.trust.sig) : "",
          item.trust && item.trust.anchor ? escapeHtml(item.trust.anchor) : "",
          item.trust && item.trust.atUri ? escapeHtml(item.trust.atUri) : "",
          item.trust ? "src:" + escapeHtml(item.trust.source) : "",
        ].filter(Boolean).map((bit) => "<span>" + bit + "</span>").join("");
        const open = repo
          ? '<button class="dev-feed-action" type="button" data-feed-open-repo="' + escapeHtml(repo) + '" data-feed-channel="' + escapeHtml(channel || "ideas") + '">Open project</button>'
          : "";
        const openCh = channel
          ? '<button class="dev-feed-action" type="button" data-feed-open-community="' + escapeHtml(activeCommunity) + '" data-feed-channel="' + escapeHtml(channel) + '">Open #' + escapeHtml(channel) + '</button>'
          : "";
        const time = (item.createdAt || "").slice(11, 16) || "now";
        return '<li class="dev-feed-item" data-dev-feed-item data-kind="' + escapeHtml(item.kind) + '">'
          + '<div class="avatar" aria-hidden="true">' + escapeHtml(initials(item.actor && item.actor.handle)) + '</div>'
          + '<article class="dev-feed-body"><header class="dev-feed-meta">'
          + '<strong class="dev-feed-handle">@' + escapeHtml(item.actor && item.actor.handle) + '</strong>'
          + '<span class="dev-feed-verb">' + escapeHtml(item.verb) + '</span>'
          + objectBtn
          + '<time>' + escapeHtml(time) + '</time></header>'
          + (item.body ? '<p>' + escapeHtml(item.body) + '</p>' : '')
          + '<footer class="dev-feed-trust">' + trust + '</footer>'
          + '<div class="dev-feed-actions">' + open + openCh + '</div></article></li>';
      }

      function openRepository(slug, channel) {
        activeRepo = slug || activeRepo;
        selectProductMode("repo");
        if (channel) {
          // Jump into community channel context for the linked project conversation.
          activeChannel = channel;
        }
      }

      function selectSurface(surface) {
        document.querySelectorAll("[data-surface]").forEach((button) => {
          button.setAttribute("aria-pressed", button.dataset.surface === surface ? "true" : "false");
        });
        document.querySelectorAll("[data-surface-panel]").forEach((panel) => {
          panel.hidden = panel.getAttribute("data-surface-panel") !== surface;
        });
        if (channelToolbar) channelToolbar.hidden = surface !== "channels";
      }

      function draftKey(communityId, channel) {
        return String(communityId || "community") + "::" + String(channel || "general");
      }

      function saveComposerDraft() {
        const input = composerInput();
        if (!input) return;
        composerDrafts.set(draftKey(activeCommunity, activeChannel), input.value);
      }

      function restoreComposerDraft() {
        const input = composerInput();
        if (!input) return;
        const saved = composerDrafts.get(draftKey(activeCommunity, activeChannel));
        input.value = typeof saved === "string" ? saved : "";
      }

      function composerPlaceholder(channel) {
        const placeholders = {
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

      function applyComposerChrome() {
        const input = composerInput();
        if (composerLabel) composerLabel.textContent = "Message #" + activeChannel;
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
        const composerMeta = document.querySelector("[data-composer-meta]");
        const space = currentCommunity();
        if (composerMeta && space) composerMeta.textContent = "Signed as @" + actor + " · " + space.name;
      }

      function receiptSearchQuery() {
        const input = document.querySelector("[data-receipt-search]");
        return input && typeof input.value === "string" ? input.value.trim().toLowerCase() : "";
      }

      function applyChannelFilter() {
        const q = receiptSearchQuery();
        const searchStatus = document.querySelector("[data-receipt-search-status]");
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
          } else {
            message.removeAttribute("data-search-hit");
          }
          if (message.dataset.messageId !== selectedMessage) {
            message.removeAttribute("data-selected-message");
            const tray = message.querySelector("[data-message-actions]");
            if (tray) tray.hidden = true;
          }
        });
        if (searchStatus) {
          searchStatus.textContent = q
            ? (hits + " receipt match" + (hits === 1 ? "" : "es") + " in community")
            : "";
        }
        const space = currentCommunity();
        const channelMeta = space && (space.channels || []).find((item) => item.id === activeChannel);
        if (channelName) {
          channelName.textContent = q ? "# search · " + activeChannel : "# " + activeChannel;
        }
        if (channelTopic) {
          channelTopic.textContent = q
            ? "Searching messages, intents, harness labels, and promote receipts"
            : ((channelMeta && channelMeta.topic) || channelTopics[activeChannel] || "");
        }
        if (contextSub && productMode === "community") {
          contextSub.textContent = q
            ? "Receipt search · community-wide"
            : ("# " + activeChannel + " · community channel");
        }
        applyComposerChrome();
        document.querySelectorAll("[data-channel][aria-pressed]").forEach((item) => {
          item.setAttribute("aria-pressed", item.dataset.channel === activeChannel ? "true" : "false");
        });
      }

      function selectChannel(channel) {
        saveComposerDraft();
        activeChannel = channel || "general";
        selectedMessage = null;
        if (productMode === "network") selectProductMode("community");
        else if (productMode === "repo") selectProductMode("community");
        selectSurface("channels");
        applyChannelFilter();
        restoreComposerDraft();
        updateAgentWorkingStatus();
        if (feed) feed.scrollTop = 0;
        const input = composerInput();
        if (input && activeChannel === "showcase") input.focus();
      }

      function openShareShip() {
        saveComposerDraft();
        if (activeChannel !== "showcase") {
          selectChannel("showcase");
        } else {
          applyComposerChrome();
        }
        const input = composerInput();
        if (!input) return;
        if (!input.value.trim()) {
          input.value = "Shipping: \\nWhat: \\nLink: \\nWho can try it: \\nNetwork: appears on Network Feed when AT is live (sample until then)";
          composerDrafts.set(draftKey(activeCommunity, "showcase"), input.value);
        }
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }

      function selectMessage(id) {
        selectedMessage = id;
        messages().forEach((message) => {
          const selected = message.dataset.messageId === id;
          if (selected) message.setAttribute("data-selected-message", "true");
          else message.removeAttribute("data-selected-message");
          const tray = message.querySelector("[data-message-actions]");
          if (tray) tray.hidden = !selected;
        });
      }

      function setStatus(message, text) {
        const status = message?.querySelector("[data-action-status]");
        if (status) status.textContent = text;
      }

      function renderIssueItem(issue) {
        const channel = channelForLabels(issue.labels || []);
        const labels = (issue.labels || []).join(", ") || "unlabeled";
        return '<li class="artifact-item" data-issue-id="' + escapeHtml(issue.id) + '">'
          + '<span class="artifact-id">' + escapeHtml(issue.id) + '</span>'
          + '<strong>' + escapeHtml(issue.title) + '</strong>'
          + '<span class="artifact-meta">#' + escapeHtml(channel) + ' · ' + escapeHtml(issue.status) + ' · ' + escapeHtml(issue.author) + '</span>'
          + '<span class="artifact-labels">' + escapeHtml(labels) + '</span>'
          + '</li>';
      }

      function renderChangeItem(change) {
        return '<li class="artifact-item" data-change-id="' + escapeHtml(change.id) + '">'
          + '<span class="artifact-id">' + escapeHtml(change.id) + '</span>'
          + '<strong>' + escapeHtml(change.title) + '</strong>'
          + '<span class="artifact-meta">' + escapeHtml(change.status) + ' · ' + escapeHtml(change.author) + '</span>'
          + '<span class="artifact-labels">' + escapeHtml(change.sourceView || "") + ' → ' + escapeHtml(change.targetView || "") + '</span>'
          + '<div class="artifact-actions">'
          + '<button type="button" class="reaction" data-review-change="' + escapeHtml(change.id) + '">Approve</button>'
          + '</div>'
          + '</li>';
      }

      function renderMessageFromIssue(issue, repo) {
        const channel = channelForLabels(issue.labels || []);
        const id = "issue-" + issue.id;
        const commentNote = issue.comments && issue.comments.length
          ? " · " + issue.comments.length + " comment" + (issue.comments.length === 1 ? "" : "s")
          : "";
        return '<li class="feed-message" data-message data-channel="' + channel + '" data-community-id="' + escapeHtml(activeCommunity) + '" data-message-id="' + escapeHtml(id) + '" data-feed-item-source="api" data-issue-id="' + escapeHtml(issue.id) + '">'
          + '<button class="message-hitbox" type="button" data-select-message="' + escapeHtml(id) + '" aria-label="Open signed actions for ' + escapeHtml(issue.title) + '"></button>'
          + '<div class="avatar" aria-hidden="true">' + escapeHtml(initials(issue.author)) + '</div>'
          + '<article class="message-body">'
          + '<header class="message-meta"><strong>' + escapeHtml(issue.author) + '</strong><span>contributor</span><time>live</time><span data-message-state>' + escapeHtml(issue.status + commentNote) + '</span></header>'
          + '<h2>' + escapeHtml(issue.title) + '</h2>'
          + '<p>' + escapeHtml(issue.body || "") + '</p>'
          + (issue.comments && issue.comments.length
            ? '<div class="thread-comments" data-thread-comments>' + issue.comments.map((comment) =>
              '<div class="thread-comment"><strong>' + escapeHtml(comment.author) + '</strong> <span>' + escapeHtml(comment.body) + '</span></div>'
            ).join("") + '</div>'
            : '')
          + '<footer class="message-footer"><span>issue:' + escapeHtml(issue.id) + '</span><span>sig:' + escapeHtml(issue.id.toLowerCase()) + '</span><span>community</span></footer>'
          + '<div class="reaction-row" aria-label="Reactions">'
          + '<button type="button" class="reaction" data-reaction="reply">reply</button>'
          + '<button type="button" class="reaction" data-reaction="follow">follow</button>'
          + '</div>'
          + '<div class="message-action-tray" data-message-actions hidden>'
          + '<dl><div><dt>Anchor</dt><dd>issue:' + escapeHtml(issue.id) + '</dd></div>'
          + '<div><dt>Signature</dt><dd>sig:' + escapeHtml(issue.id.toLowerCase()) + '</dd></div>'
          + '<div><dt>Artifact</dt><dd data-tray-artifact>' + escapeHtml(repo.slug) + '</dd></div></dl>'
          + '<div class="action-row">'
          + '<button type="button" data-action="intent">Mark intent</button>'
          + '<button type="button" data-action="agent">Request agent</button>'
          + '<button type="button" data-action="answer">Accept answer</button>'
          + '<button type="button" data-action="docs">Docs patch</button>'
          + '<button type="button" data-action="report">Report</button>'
          + '</div>'
          + '<p class="action-status" data-action-status>Human review required for signed project changes.</p>'
          + '</div></article></li>';
      }

      function renderMessageFromChange(proposal, repo) {
        const id = "change-" + proposal.id;
        return '<li class="feed-message" data-message data-channel="previews" data-community-id="' + escapeHtml(activeCommunity) + '" data-message-id="' + escapeHtml(id) + '" data-feed-item-source="api" data-change-id="' + escapeHtml(proposal.id) + '" data-linked-proposal="' + escapeHtml(proposal.id) + '">'
          + '<button class="message-hitbox" type="button" data-select-message="' + escapeHtml(id) + '" aria-label="Open signed actions for ' + escapeHtml(proposal.title) + '"></button>'
          + '<div class="avatar" aria-hidden="true">' + escapeHtml(initials(proposal.author)) + '</div>'
          + '<article class="message-body">'
          + '<header class="message-meta"><strong>' + escapeHtml(proposal.author) + '</strong><span>contributor</span><time>live</time><span data-message-state>' + escapeHtml(proposal.status) + '</span></header>'
          + '<h2>' + escapeHtml(proposal.title) + '</h2>'
          + '<p>' + escapeHtml(proposal.body || (proposal.sourceView + " -> " + proposal.targetView)) + '</p>'
          + '<div class="message-promote-receipt" data-promote-receipt data-proposal-id="' + escapeHtml(proposal.id) + '">'
          + '<span class="promote-receipt-label">Signed promote</span>'
          + '<strong data-proposal-link>proposal:' + escapeHtml(proposal.id) + '</strong>'
          + '<span class="promote-receipt-state" data-promote-state>' + escapeHtml(proposal.status || "open") + ' · human review required</span></div>'
          + '<footer class="message-footer"><span>change:' + escapeHtml(proposal.id) + '</span><span>sig:' + escapeHtml(proposal.id.toLowerCase()) + '</span><span>community</span><span data-proposal-link>proposal:' + escapeHtml(proposal.id) + '</span></footer>'
          + '<div class="reaction-row" aria-label="Reactions">'
          + '<button type="button" class="reaction" data-reaction="review">review</button>'
          + '<button type="button" class="reaction" data-reaction="preview">preview</button>'
          + '</div>'
          + '<div class="message-action-tray" data-message-actions hidden>'
          + '<dl><div><dt>Anchor</dt><dd>change:' + escapeHtml(proposal.id) + '</dd></div>'
          + '<div><dt>Signature</dt><dd>sig:' + escapeHtml(proposal.id.toLowerCase()) + '</dd></div>'
          + '<div><dt>Artifact</dt><dd data-tray-artifact>' + escapeHtml(proposal.sourceView || repo.slug) + '</dd></div></dl>'
          + '<div class="action-row">'
          + '<button type="button" data-action="intent">Mark intent</button>'
          + '<button type="button" data-action="agent">Request agent</button>'
          + '<button type="button" data-action="answer">Accept answer</button>'
          + '<button type="button" data-action="docs">Docs patch</button>'
          + '<button type="button" data-action="report">Report</button>'
          + '<button type="button" data-action="approve">Approve change</button>'
          + '</div>'
          + '<p class="action-status" data-action-status>Human review required for signed project changes.</p>'
          + '</div></article></li>';
      }

      function updateChannelCounts(repo) {
        const counts = { support: 0, ideas: 0, bugs: 0, "agent-runs": 0, previews: 0, governance: 0, general: 0, showcase: 0 };
        for (const issue of repo.issues || []) {
          counts[channelForLabels(issue.labels)] = (counts[channelForLabels(issue.labels)] || 0) + 1;
        }
        for (const _proposal of repo.changeProposals || []) {
          counts.previews += 1;
        }
        for (const item of state.conversations || []) {
          if (item.role === "agent") {
            counts["agent-runs"] = (counts["agent-runs"] || 0) + 1;
          } else if (item.channel === "general" || item.channel === "showcase") {
            counts[item.channel] = (counts[item.channel] || 0) + 1;
          }
        }
        document.querySelectorAll("[data-channel][aria-pressed]").forEach((button) => {
          const countEl = button.querySelector(".channel-count");
          if (countEl) countEl.textContent = String(counts[button.dataset.channel] || 0);
        });
        const issueCount = document.querySelector('[data-surface="issues"] .channel-count');
        if (issueCount) issueCount.textContent = String((repo.issues || []).length);
        const changeCount = document.querySelector('[data-surface="changes"] .channel-count');
        if (changeCount) changeCount.textContent = String((repo.changeProposals || []).length);
      }

      function updateSignerStrip() {
        // Mirrors renderSignerStrip: distinct receipt authors, never invented presence.
        const strip = document.querySelector("[data-members-strip]");
        if (!strip) return;
        const signers = [];
        (state.conversations || []).forEach((item) => {
          if (item.author && signers.indexOf(item.author) < 0) signers.push(item.author);
        });
        const pills = signers.slice(0, 4).map((author) =>
          '<span class="member-pill" title="' + escapeHtml(author) + '">' + escapeHtml(initials(author)) + '</span>'
        ).join("");
        const count = signers.length === 0
          ? "No signed receipts yet"
          : signers.length + " signer" + (signers.length === 1 ? "" : "s") + " · derived from receipts";
        strip.innerHTML = '<span class="members-label">Signers</span>' + pills
          + '<span class="members-count" data-members-count>' + count + '</span>';
      }

      function sessionIdentity() {
        const session = state.session || {};
        const authState = session.authState
          || (live() ? "api-session" : "sample-session");
        const handle = (session.handle || (actor + ".epoch.community")).replace(/^@/, "");
        const did = session.did || ("did:plc:" + actor);
        const note = authState === "authenticated"
          ? "AT session linked"
          : authState === "api-session"
            ? "live API session · AT OAuth not linked"
            : authState === "unauthenticated"
              ? "not signed in"
              : "session sample · not AT login";
        return { authState, handle, did, note };
      }

      function identityChipHtml() {
        const identity = sessionIdentity();
        return '<span class="identity-chip" data-identity-chip data-auth-state="' + escapeHtml(identity.authState)
          + '" title="Portable ATProto identity (' + escapeHtml(identity.note) + ')">'
          + '<span class="identity-handle">@' + escapeHtml(identity.handle) + '</span>'
          + '<span class="identity-did">' + escapeHtml(identity.did) + '</span>'
          + '<span class="identity-auth-note" data-auth-note>' + escapeHtml(identity.note) + '</span>'
          + '</span>';
      }

      function renderMetaParts(parts) {
        return identityChipHtml()
          + parts.map((part) => '<span class="meta-sep" aria-hidden="true"></span><span>' + escapeHtml(part) + '</span>').join("");
      }

      function updateRepositoryMeta(repo) {
        const meta = document.querySelector("[data-header-meta]");
        if (!meta) return;
        if (productMode === "network") {
          const count = (state.devFeedItems || []).length;
          meta.innerHTML = renderMetaParts([
            count + " events",
            "network",
            live() ? "atproto:live" : "atproto:snapshot",
          ]);
          return;
        }
        if (productMode === "community") {
          const space = currentCommunity();
          meta.innerHTML = renderMetaParts([
            (state.communities || []).length + " communities",
            ((space && space.channels) || []).length + " channels",
            live() ? "community:live" : "community:snapshot",
          ]);
          return;
        }
        meta.innerHTML = renderMetaParts([
          repo.visibility || "public",
          (repo.maintainers || []).length + " maintainer" + ((repo.maintainers || []).length === 1 ? "" : "s"),
          (repo.issues || []).length + " issues",
          (repo.changeProposals || []).length + " changes",
          live() ? "project:live" : "project:snapshot",
        ]);
      }

      function renderRepository(repo) {
        // Preserve multi-repo list; refresh the active slug in place when possible.
        const repos = Array.isArray(state.repositories) ? state.repositories.slice() : [];
        const idx = repos.findIndex((item) => item.slug === repo.slug);
        if (idx >= 0) repos[idx] = repo;
        else repos[0] = repo;
        state.repositories = repos;
        state.feedSource = live() ? "api" : state.feedSource;
        if (shell) {
          shell.dataset.feedSource = state.feedSource;
          shell.dataset.apiState = live() ? "connected" : "offline";
        }
        if (connectionLabel) {
          connectionLabel.textContent = live() ? "Live" : "Snapshot · ATProto";
        }
        if (feed) {
          // Preserve community-owned social + member-agent messages; refresh forge-backed rows.
          const social = (state.conversations || []).filter((item) =>
            item.role !== "agent" && (
              item.channel === "general" || item.channel === "showcase" || (item.id && String(item.id).indexOf("issue-") !== 0 && String(item.id).indexOf("change-") !== 0 && !item.repositorySlug)
            ),
          );
          const socialHtml = social.map((item) => {
            const hidden = (item.communityId && item.communityId !== activeCommunity) || item.channel !== activeChannel ? " hidden" : "";
            return '<li class="feed-message" data-message data-channel="' + escapeHtml(item.channel)
              + '" data-community-id="' + escapeHtml(item.communityId || activeCommunity)
              + '" data-message-id="' + escapeHtml(item.id) + '" data-feed-item-source="' + escapeHtml(item.source || "api") + '"' + hidden + '>'
              + '<button class="message-hitbox" type="button" data-select-message="' + escapeHtml(item.id) + '" aria-label="Open signed actions for ' + escapeHtml(item.title) + '"></button>'
              + '<div class="avatar" aria-hidden="true">' + escapeHtml(initials(item.author)) + '</div>'
              + '<article class="message-body"><header class="message-meta"><strong>' + escapeHtml(item.author) + '</strong><span>' + escapeHtml(item.role || "member") + '</span><time>' + escapeHtml(item.time || "now") + '</time><span data-message-state>' + escapeHtml(item.state || "open") + '</span></header>'
              + '<h2>' + escapeHtml(item.title) + '</h2><p>' + escapeHtml(item.body || "") + '</p>'
              + '<footer class="message-footer"><span>' + escapeHtml(item.anchor || "") + '</span><span>' + escapeHtml(item.signature || "") + '</span><span>community</span></footer>'
              + '<div class="reaction-row">' + (item.reactions || []).map((reaction) => '<button type="button" class="reaction" data-reaction="' + escapeHtml(reaction) + '">' + escapeHtml(reaction) + '</button>').join("") + '</div>'
              + '<div class="message-action-tray" data-message-actions hidden><p class="action-status" data-action-status>Community channel message.</p></div></article></li>';
          }).join("");
          const agentHtml = (state.conversations || []).filter((item) => item.role === "agent").map((item) => {
            const hidden = (item.communityId && item.communityId !== activeCommunity) || item.channel !== activeChannel ? " hidden" : "";
            const harness = item.harness
              ? '<span class="agent-harness" data-agent-harness title="ACP harness">' + escapeHtml(item.harness) + '</span>'
              : "";
            const managed = item.managedBy
              ? '<span class="agent-managed-by" data-agent-managed-by>managed by @' + escapeHtml(item.managedBy) + '</span>'
              : "";
            const artifact = item.artifactCard
              ? '<div class="message-artifact-card" data-artifact-card><span class="message-artifact-kind">Agent receipt</span><strong>'
                + escapeHtml(item.artifactCard) + '</strong>'
                + (item.intentId
                  ? '<a class="message-artifact-link" href="#intent-' + escapeHtml(item.intentId) + '" data-intent-link="' + escapeHtml(item.intentId) + '">Open signed intent</a>'
                  : "")
                + '</div>'
              : "";
            const proposalAttr = item.linkedProposalId
              ? ' data-linked-proposal="' + escapeHtml(item.linkedProposalId) + '"'
              : "";
            return '<li class="feed-message feed-message-agent" data-message data-channel="' + escapeHtml(item.channel || "agent-runs")
              + '" data-community-id="' + escapeHtml(item.communityId || activeCommunity)
              + '" data-message-id="' + escapeHtml(item.id) + '" data-feed-item-source="' + escapeHtml(item.source || "api")
              + '" data-author-role="agent"' + proposalAttr + hidden + '>'
              + '<button class="message-hitbox" type="button" data-select-message="' + escapeHtml(item.id) + '" aria-label="Open signed actions for ' + escapeHtml(item.title) + '"></button>'
              + '<div class="avatar avatar-agent" aria-hidden="true">' + escapeHtml(initials(item.author)) + '</div>'
              + '<article class="message-body"><header class="message-meta"><strong>' + escapeHtml(item.author) + '</strong><span>member agent</span>'
              + harness + managed
              + '<time>' + escapeHtml(item.time || "now") + '</time><span data-message-state>' + escapeHtml(item.state || "open") + '</span></header>'
              + '<h2>' + escapeHtml(item.title) + '</h2><p>' + escapeHtml(item.body || "") + '</p>'
              + artifact
              + (item.linkedProposalId
                ? '<div class="message-promote-receipt" data-promote-receipt data-proposal-id="' + escapeHtml(item.linkedProposalId) + '"><span class="promote-receipt-label">Signed promote</span><strong data-proposal-link>proposal:'
                  + escapeHtml(item.linkedProposalId) + '</strong><span class="promote-receipt-state" data-promote-state>'
                  + escapeHtml(item.state || "open") + ' · human review required</span></div>'
                : (item.intentId
                  ? '<div class="message-promote-receipt" data-promote-receipt data-intent-id="' + escapeHtml(item.intentId) + '"><span class="promote-receipt-label">Signed intent</span><strong data-intent-meta>intent:'
                    + escapeHtml(item.intentId) + '</strong><span class="promote-receipt-state" data-promote-state>'
                    + escapeHtml(item.state || "open") + '</span></div>'
                  : ""))
              + '<footer class="message-footer"><span>' + escapeHtml(item.anchor || "") + '</span><span>' + escapeHtml(item.signature || "") + '</span><span>' + escapeHtml(item.visibility || "community") + '</span>'
              + (item.intentId ? '<span data-intent-meta>intent:' + escapeHtml(item.intentId) + '</span>' : "")
              + (item.linkedProposalId ? '<span data-proposal-link>proposal:' + escapeHtml(item.linkedProposalId) + '</span>' : "")
              + '</footer>'
              + '<div class="reaction-row">' + (item.reactions || []).map((reaction) => '<button type="button" class="reaction" data-reaction="' + escapeHtml(reaction) + '">' + escapeHtml(reaction) + '</button>').join("") + '</div>'
              + '<div class="message-action-tray" data-message-actions hidden><p class="action-status" data-action-status>Human review required for signed project changes.</p></div></article></li>';
          }).join("");
          const issueHtml = (repo.issues || []).map((issue) => renderMessageFromIssue(issue, repo)).join("");
          const changeHtml = (repo.changeProposals || []).map((proposal) => renderMessageFromChange(proposal, repo)).join("");
          // Merge issue/change conversations back into state for channel counts; keep agent members.
          const communityId = activeCommunity;
          const issueConvos = (repo.issues || []).map((issue) => ({
            id: "issue-" + issue.id,
            channel: channelForLabels(issue.labels || []),
            communityId,
            repositorySlug: repo.slug,
            author: issue.author,
            role: "contributor",
            title: issue.title,
            body: issue.body || "",
            time: "live",
            anchor: "issue:" + issue.id,
            signature: "sig:" + String(issue.id).toLowerCase(),
            visibility: "community",
            state: issue.status,
            reactions: ["reply", "follow"],
            source: "api",
          }));
          const changeConvos = (repo.changeProposals || []).map((proposal) => ({
            id: "change-" + proposal.id,
            channel: "previews",
            communityId,
            repositorySlug: repo.slug,
            author: proposal.author,
            role: "contributor",
            title: proposal.title,
            body: proposal.body || "",
            time: "live",
            anchor: "change:" + proposal.id,
            signature: "sig:" + String(proposal.id).toLowerCase(),
            visibility: "community",
            state: proposal.status,
            reactions: ["review", "preview"],
            linkedProposalId: proposal.id,
            source: "api",
          }));
          const retained = (state.conversations || []).filter((item) =>
            !(item.repositorySlug === repo.slug && (String(item.id).indexOf("issue-") === 0 || String(item.id).indexOf("change-") === 0)),
          );
          state.conversations = retained.concat(issueConvos, changeConvos);
          feed.innerHTML = socialHtml + agentHtml + issueHtml + changeHtml;
          updateSignerStrip();
        }
        if (issueList) {
          issueList.innerHTML = (repo.issues || []).length
            ? (repo.issues || []).map(renderIssueItem).join("")
            : '<li class="artifact-item artifact-empty">No open issues in the connected repository.</li>';
        }
        if (changeList) {
          changeList.innerHTML = (repo.changeProposals || []).length
            ? (repo.changeProposals || []).map(renderChangeItem).join("")
            : '<li class="artifact-item artifact-empty">No change proposals yet. Promote a message with Mark intent.</li>';
        }
        updateChannelCounts(repo);
        updateRepositoryMeta(repo);
        if (productMode === "community" || productMode === "repo") applyChannelFilter();
        if (productMode === "community") renderCommunityChannels();
        if (selectedMessage) selectMessage(selectedMessage);
      }

      async function refreshRepository() {
        const repo = repository();
        if (!live() || !repo) return null;
        const updated = await apiJson("GET", "/repositories/" + encodeURIComponent(repo.slug));
        renderRepository(updated);
        return updated;
      }

      async function postIssue(input) {
        const repo = repository();
        if (!live() || !repo) throw new Error("Live API unavailable");
        return apiJson("POST", "/repositories/" + encodeURIComponent(repo.slug) + "/issues", input);
      }

      async function postComment(issueId, body) {
        const repo = repository();
        if (!live() || !repo) throw new Error("Live API unavailable");
        return apiJson(
          "POST",
          "/repositories/" + encodeURIComponent(repo.slug) + "/issues/" + encodeURIComponent(issueId) + "/comments",
          { author: actor, body },
        );
      }

      async function postChange(input) {
        const repo = repository();
        if (!live() || !repo) throw new Error("Live API unavailable");
        return apiJson("POST", "/repositories/" + encodeURIComponent(repo.slug) + "/changes", input);
      }

      async function postReview(changeId, decision) {
        const repo = repository();
        if (!live() || !repo) throw new Error("Live API unavailable");
        return apiJson(
          "POST",
          "/repositories/" + encodeURIComponent(repo.slug) + "/changes/" + encodeURIComponent(changeId) + "/reviews",
          { reviewer: actor, decision, body: decision === "approved" ? "Approved from Community Web." : "" },
        );
      }

      async function handleComposerSubmit(text) {
        const body = text.trim();
        if (!body) return;
        if (!live()) {
          // Snapshot mode: local-only append (fail closed for durable write).
          const id = "comment-" + Date.now();
          if (!feed) return;
          const item = document.createElement("li");
          item.className = "feed-message";
          item.dataset.message = "";
          item.dataset.channel = activeChannel;
          item.dataset.communityId = activeCommunity;
          item.dataset.messageId = id;
          item.dataset.feedItemSource = "snapshot";
          item.innerHTML = '<div class="avatar" aria-hidden="true">MY</div><article class="message-body"><header class="message-meta"><strong>maya</strong><span>maintainer</span><time>now</time><span>local only</span></header><h2>Local note</h2><p></p><footer class="message-footer"><span>anchor:composer</span><span>sig:pending-local</span><span>community</span></footer></article>';
          item.querySelector("p").textContent = body;
          feed.append(item);
          applyChannelFilter();
          return;
        }

        const selected = selectedMessage
          ? document.querySelector('[data-message-id="' + CSS.escape(selectedMessage) + '"]')
          : null;
        const issueId = selected?.dataset.issueId;
        if (issueId) {
          const updated = await postComment(issueId, body);
          renderRepository(updated);
          selectMessage("issue-" + issueId);
          return;
        }

        const title = body.split("\\n")[0].slice(0, 120) || "Community message";
        const updated = await postIssue({
          title,
          author: actor,
          body,
          labels: [channelLabel(activeChannel)],
        });
        renderRepository(updated);
        const created = (updated.issues || [])[updated.issues.length - 1];
        if (created) {
          selectChannel(channelForLabels(created.labels));
          selectMessage("issue-" + created.id);
        }
      }

      async function handleAction(action, message) {
        const title = message.querySelector("h2")?.textContent || "Community intent";
        const body = message.querySelector("p")?.textContent || "";
        const issueId = message.dataset.issueId;
        const changeId = message.dataset.changeId;
        const repo = repository();

        if (!live()) {
          const actionLabel = {
            intent: "Mark intent",
            agent: "Request agent",
            answer: "Accept answer",
            docs: "Docs patch",
            report: "Report",
            approve: "Approve change",
          }[action] || "this action";
          setStatus(message, "Live API unavailable. Reconnect EPOCH_COMMUNITY_API_URL, reload this page, then retry " + actionLabel + ".");
          return;
        }

        try {
          if (action === "intent") {
            setStatus(message, "Recording intent candidate...");
            const updated = await postChange({
              title,
              author: actor,
              body,
              sourceView: "community/" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
              targetView: repo.defaultView || "main",
            });
            renderRepository(updated);
            const proposal = (updated.changeProposals || []).filter((item) => item.title === title).slice(-1)[0]
              || (updated.changeProposals || []).slice(-1)[0];
            if (proposal) {
              // Stamp promote receipt on the originating message when it still exists.
              message.setAttribute("data-linked-proposal", proposal.id);
              if (!message.querySelector("[data-promote-receipt]")) {
                const body = message.querySelector(".message-body");
                if (body) {
                  const receipt = document.createElement("div");
                  receipt.className = "message-promote-receipt";
                  receipt.setAttribute("data-promote-receipt", "true");
                  receipt.setAttribute("data-proposal-id", proposal.id);
                  receipt.innerHTML = '<span class="promote-receipt-label">Signed promote</span><strong data-proposal-link>proposal:'
                    + escapeHtml(proposal.id) + '</strong><span class="promote-receipt-state" data-promote-state>'
                    + escapeHtml(proposal.status || "open") + " · human review required</span>";
                  const footer = body.querySelector(".message-footer");
                  if (footer) body.insertBefore(receipt, footer);
                  else body.appendChild(receipt);
                }
              }
              const next = document.querySelector('[data-message-id="change-' + CSS.escape(proposal.id) + '"]')
                || document.querySelector('[data-message-id="' + CSS.escape(message.dataset.messageId) + '"]');
              if (next) {
                selectChannel("previews");
                selectMessage("change-" + proposal.id);
                setStatus(
                  next,
                  "Intent candidate recorded from the live API: " + proposal.id
                    + " (" + proposal.status + "). Promote receipt recorded. Human review still required.",
                );
              }
            }
            return;
          }

          if (action === "agent") {
            setStatus(message, "Opening agent-run issue...");
            const updated = await postIssue({
              title: "Agent: " + title,
              author: "agent-ui-reviewer",
              body: "Agent requested from conversation.\\n\\n" + body + "\\n\\nHuman review remains required.",
              labels: ["agent"],
            });
            renderRepository(updated);
            const created = (updated.issues || []).slice(-1)[0];
            if (created) {
              selectChannel("agent-runs");
              selectMessage("issue-" + created.id);
              setStatus(document.querySelector('[data-message-id="issue-' + CSS.escape(created.id) + '"]'), "Agent run requested. Human review remains required.");
            }
            return;
          }

          if (action === "answer") {
            if (!issueId) {
              setStatus(message, "Select an issue thread to accept an answer.");
              return;
            }
            setStatus(message, "Recording accepted answer...");
            const updated = await postComment(issueId, "Accepted answer: " + body);
            renderRepository(updated);
            selectMessage("issue-" + issueId);
            setStatus(document.querySelector('[data-message-id="issue-' + CSS.escape(issueId) + '"]'), "Accepted answer captured for this thread.");
            return;
          }

          if (action === "docs") {
            setStatus(message, "Opening docs patch proposal...");
            const updated = await postChange({
              title: "Docs: " + title,
              author: actor,
              body: "Docs patch candidate linked from conversation.\\n\\n" + body,
              sourceView: "docs/" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
              targetView: repo.defaultView || "main",
            });
            renderRepository(updated);
            const proposal = (updated.changeProposals || []).slice(-1)[0];
            if (proposal) {
              selectChannel("previews");
              selectMessage("change-" + proposal.id);
              setStatus(document.querySelector('[data-message-id="change-' + CSS.escape(proposal.id) + '"]'), "Docs patch candidate linked to this conversation.");
            }
            return;
          }

          if (action === "report") {
            setStatus(message, "Opening moderation report...");
            const updated = await postIssue({
              title: "Moderation: " + title,
              author: actor,
              body: "Moderation report / legal-hold evidence.\\n\\nSource: " + title + "\\n\\n" + body,
              labels: ["governance", "moderation"],
            });
            renderRepository(updated);
            const created = (updated.issues || []).slice(-1)[0];
            if (created) {
              selectChannel("governance");
              selectMessage("issue-" + created.id);
              setStatus(document.querySelector('[data-message-id="issue-' + CSS.escape(created.id) + '"]'), "Moderation report opened with legal-hold evidence.");
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
            selectMessage("change-" + changeId);
            setStatus(document.querySelector('[data-message-id="change-' + CSS.escape(changeId) + '"]'), "Change approved by " + actor + ".");
          }
        } catch (error) {
          setStatus(message, "Action failed: " + (error instanceof Error ? error.message : String(error)));
        }
      }

      document.querySelectorAll("button[data-product-mode]").forEach((button) => {
        button.addEventListener("click", () => selectProductMode(button.dataset.productMode || "community"));
      });
      document.querySelectorAll("[data-feed-tab]").forEach((button) => {
        button.addEventListener("click", () => renderDevFeedTab(button.dataset.feedTab || "following"));
      });
      document.querySelectorAll("[data-open-community]").forEach((button) => {
        button.addEventListener("click", () => openCommunity(button.dataset.openCommunity || activeCommunity));
      });
      document.querySelectorAll("[data-open-repo]").forEach((button) => {
        button.addEventListener("click", () => openRepository(button.dataset.openRepo || activeRepo));
      });
      document.querySelectorAll("[data-surface]").forEach((button) => {
        button.addEventListener("click", () => {
          if (productMode !== "repo") selectProductMode("repo");
          selectSurface(button.dataset.surface || "issues");
        });
      });
      document.querySelectorAll("[data-channel][aria-pressed]").forEach((button) => {
        button.addEventListener("click", () => selectChannel(button.dataset.channel || "general"));
      });

      document.addEventListener("click", async (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const feedCommunity = target.closest("[data-feed-open-community]");
        if (feedCommunity) {
          event.preventDefault();
          openCommunity(feedCommunity.getAttribute("data-feed-open-community") || activeCommunity);
          const channel = feedCommunity.getAttribute("data-feed-channel");
          if (channel) selectChannel(channel);
          return;
        }

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
            const updated = await postReview(reviewButton.getAttribute("data-review-change"), "approved");
            renderRepository(updated);
            if (productMode !== "repo") selectProductMode("repo");
            selectSurface("changes");
          } catch (error) {
            console.error(error);
          }
          return;
        }

        const actionButton = target.closest("[data-action]");
        if (actionButton) {
          event.preventDefault();
          event.stopPropagation();
          const message = actionButton.closest("[data-message]");
          if (message) await handleAction(actionButton.dataset.action, message);
          return;
        }

        const reactionButton = target.closest(".reaction[data-reaction]");
        if (reactionButton) {
          event.preventDefault();
          event.stopPropagation();
          const message = reactionButton.closest("[data-message]");
          if (!message) return;
          const issueId = message.dataset.issueId;
          if (live() && issueId) {
            try {
              const updated = await postComment(issueId, "Reaction: " + reactionButton.dataset.reaction);
              renderRepository(updated);
              selectMessage("issue-" + issueId);
              setStatus(document.querySelector('[data-message-id="issue-' + CSS.escape(issueId) + '"]'), "Recorded reaction via comment.");
            } catch (error) {
              setStatus(message, "Reaction failed: " + (error instanceof Error ? error.message : String(error)));
            }
          } else {
            setStatus(message, live() ? "Reactions attach to issue threads." : "Live API unavailable for reactions.");
          }
          return;
        }

        const selectButton = target.closest("[data-select-message]");
        if (selectButton) {
          selectMessage(selectButton.dataset.selectMessage);
          return;
        }

        const message = target.closest("[data-message]");
        if (message && message.dataset.messageId && !target.closest("[data-message-actions]")) {
          selectMessage(message.dataset.messageId);
        }
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
          if (input) input.placeholder = "Send failed: " + (error instanceof Error ? error.message : String(error));
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

      selectProductMode("community");
      applyComposerChrome();
      renderAgentMembers(activeCommunity);
      updateAgentWorkingStatus();
      const receiptSearch = document.querySelector("[data-receipt-search]");
      if (receiptSearch) {
        receiptSearch.addEventListener("input", () => applyChannelFilter());
        receiptSearch.addEventListener("search", () => applyChannelFilter());
      }
      if (live() && repository()) {
        refreshRepository().catch((error) => {
          if (connectionLabel) connectionLabel.textContent = "Live · error";
          console.error(error);
        });
      }
    })();`;
}
