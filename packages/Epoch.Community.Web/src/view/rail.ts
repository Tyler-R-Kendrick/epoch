import type { CommunityChannel, CommunityConversationView } from "../model/types";
import { escapeHtml } from "./html";

export function renderChannelButton(
  channel: CommunityChannel,
  conversations: readonly CommunityConversationView[],
  selected = false,
): string {
  const count = conversations.filter((conversation) => conversation.channel === channel.id).length;
  return `<button class="channel-button" type="button" data-channel="${channel.id}" data-channel-kind="${channel.kind}" data-topic="${escapeHtml(channel.topic)}" aria-pressed="${selected ? "true" : "false"}">
    <span class="channel-button-label"># ${escapeHtml(channel.label)}</span>
    <span class="channel-count">${count}</span>
  </button>`;
}
