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
 * One member-agent rail row, shared by the server document and the client
 * runtime — separate copies drifted until one rendered "@ui-reviewer
 * claude-code · samp" clipped. Shows the fact that changes; harness and session
 * kind stay in the accessible name and tooltip rather than crowding a 250px column.
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
