import type { CommunityAgentMember, CommunityChannel, CommunityConversationView } from "../model/types";
import { escapeHtml } from "./html";

export function renderChannelButton(
  channel: CommunityChannel,
  conversations: readonly CommunityConversationView[],
  selected = false,
): string {
  const count = conversations.filter((conversation) => conversation.channel === channel.id).length;
  // Unread is client-derived (last-read lives in localStorage), so the server
  // renders an empty, hidden slot rather than guessing a state it cannot know.
  return `<button class="channel-button" type="button" data-channel="${channel.id}" data-channel-kind="${channel.kind}" data-topic="${escapeHtml(channel.topic)}" aria-pressed="${selected ? "true" : "false"}">
    <span class="channel-button-label"># ${escapeHtml(channel.label)}</span>
    <span class="channel-unread" data-channel-unread hidden></span>
    ${count > 0 ? `<span class="channel-count">${count}</span>` : ""}
  </button>`;
}

/**
 * One member-agent rail row.
 *
 * The server document and the client runtime each hand-maintained a copy of this
 * markup, so quieting the row in one place left the other rendering
 * "@ui-reviewer claude-code · samp" clipped at the rail edge. Same drift class as
 * the feed ordering; same fix — one function, both callers.
 *
 * The row shows the fact that changes (status). Harness and session kind are
 * real and stay reachable, in the accessible name and the tooltip, rather than
 * being three gray strings competing for a 250px column.
 */
export function renderAgentMemberButton(agent: CommunityAgentMember): string {
  const kind = agent.sessionKind === "live" ? "live" : "sample";
  const detail = `${agent.harness} · ${kind} · ${agent.status}`;
  return `<button class="channel-button agent-member" type="button"`
    + ` title="${escapeHtml(detail)}"`
    + ` data-agent-member="${escapeHtml(agent.id)}"`
    + ` data-agent-status="${escapeHtml(agent.status)}"`
    + ` data-agent-session-kind="${escapeHtml(kind)}"`
    + ` aria-label="Member agent ${escapeHtml(agent.displayName)}, harness ${escapeHtml(agent.harness)}, ${escapeHtml(kind)} session, ${escapeHtml(agent.status)}">`
    + `<span class="channel-button-label">@${escapeHtml(agent.displayName)}</span>`
    + `<span class="agent-meta" data-agent-meta>${escapeHtml(agent.status)}</span></button>`;
}
