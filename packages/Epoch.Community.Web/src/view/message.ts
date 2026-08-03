import type { CommunityChannelId, CommunityConversationView } from "../model/types";
import { escapeHtml, initials } from "./html";

/**
 * Honest presence: the strip lists distinct receipt authors from the loaded
 * conversations. No invented "online" counts — only who has actually signed.
 */
export function renderSignerStrip(conversations: readonly CommunityConversationView[]): string {
  const signers = [...new Set(conversations.map((conversation) => conversation.author))];
  const pills = signers
    .slice(0, 4)
    .map((author) => `<span class="member-pill" title="${escapeHtml(author)}">${escapeHtml(initials(author))}</span>`)
    .join("");
  const count = signers.length === 0
    ? "No signed receipts yet"
    : `${signers.length} signer${signers.length === 1 ? "" : "s"} · derived from receipts`;
  return `<span class="members-label">Signers</span>
          ${pills}
          <span class="members-count" data-members-count>${count}</span>`;
}

function issueIdFromConversation(conversation: CommunityConversationView): string | undefined {
  if (conversation.id.startsWith("issue-")) {
    return conversation.id.slice("issue-".length);
  }
  return undefined;
}

export function renderConversation(
  conversation: CommunityConversationView,
  activeChannel: CommunityChannelId = "general",
  activeCommunityId?: string,
): string {
  const inCommunity = activeCommunityId === undefined || conversation.communityId === activeCommunityId;
  const hidden = inCommunity && conversation.channel === activeChannel ? "" : " hidden";
  const linkedProposal = conversation.linkedProposalId === undefined
    ? ""
    : ` data-linked-proposal="${escapeHtml(conversation.linkedProposalId)}"`;
  const issueId = issueIdFromConversation(conversation);
  const issueAttr = issueId === undefined ? "" : ` data-issue-id="${escapeHtml(issueId)}"`;
  const changeId = conversation.id.startsWith("change-") ? conversation.id.slice("change-".length) : undefined;
  const changeAttr = changeId === undefined ? "" : ` data-change-id="${escapeHtml(changeId)}"`;
  const isAgent = conversation.role === "agent";
  const agentClass = isAgent ? " feed-message-agent" : "";
  const harnessBadge = conversation.harness
    ? `<span class="agent-harness" data-agent-harness title="ACP harness">${escapeHtml(conversation.harness)}</span>`
    : "";
  const managedBy = conversation.managedBy
    ? `<span class="agent-managed-by" data-agent-managed-by>managed by @${escapeHtml(conversation.managedBy)}</span>`
    : "";
  const artifactCard = conversation.artifactCard
    ? `<div class="message-artifact-card" data-artifact-card>
        <span class="message-artifact-kind">${escapeHtml(isAgent ? "Agent receipt" : "Artifact")}</span>
        <strong>${escapeHtml(conversation.artifactCard)}</strong>
        ${conversation.intentId ? `<a class="message-artifact-link" href="#intent-${escapeHtml(conversation.intentId)}" data-intent-link="${escapeHtml(conversation.intentId)}">Open signed intent</a>` : ""}
      </div>`
    : "";
  const promoteReceipt = conversation.linkedProposalId !== undefined
    ? `<div class="message-promote-receipt" data-promote-receipt data-proposal-id="${escapeHtml(conversation.linkedProposalId)}">
        <span class="promote-receipt-label">Signed promote</span>
        <strong data-proposal-link>proposal:${escapeHtml(conversation.linkedProposalId)}</strong>
        <span class="promote-receipt-state" data-promote-state>${escapeHtml(conversation.state || "open")} · human review required</span>
      </div>`
    : conversation.intentId
    ? `<div class="message-promote-receipt" data-promote-receipt data-intent-id="${escapeHtml(conversation.intentId)}">
        <span class="promote-receipt-label">Signed intent</span>
        <strong data-intent-meta>intent:${escapeHtml(conversation.intentId)}</strong>
        <span class="promote-receipt-state" data-promote-state>${escapeHtml(conversation.state || "open")}</span>
      </div>`
    : "";
  return `<li class="feed-message${agentClass}" data-message data-channel="${conversation.channel}" data-community-id="${escapeHtml(conversation.communityId)}" data-message-id="${escapeHtml(conversation.id)}" data-feed-item-source="${conversation.source}" data-author-role="${escapeHtml(conversation.role)}"${issueAttr}${changeAttr}${linkedProposal}${hidden}>
    <button class="message-hitbox" type="button" data-select-message="${escapeHtml(conversation.id)}" aria-label="Open signed actions for ${escapeHtml(conversation.title)}"></button>
    <div class="avatar${isAgent ? " avatar-agent" : ""}" aria-hidden="true">${escapeHtml(initials(conversation.author))}</div>
    <article class="message-body">
      <header class="message-meta">
        <strong>${escapeHtml(conversation.author)}</strong>
        <span>${escapeHtml(isAgent ? "member agent" : conversation.role)}</span>
        ${harnessBadge}
        ${managedBy}
        <time>${escapeHtml(conversation.time)}</time>
        <span data-message-state>${escapeHtml(conversation.state)}</span>
        ${conversation.source === "snapshot" ? `<span data-snapshot-badge>snapshot sample</span>` : ""}
      </header>
      <h2>${escapeHtml(conversation.title)}</h2>
      <p>${escapeHtml(conversation.body)}</p>
      ${artifactCard}
      ${promoteReceipt}
      <footer class="message-footer">
        <span>${escapeHtml(conversation.anchor)}</span>
        <span>${escapeHtml(conversation.signature)}</span>
        <span>${escapeHtml(conversation.visibility)}</span>
        ${conversation.intentId ? `<span data-intent-meta>intent:${escapeHtml(conversation.intentId)}</span>` : ""}
        ${conversation.linkedProposalId === undefined ? "" : `<span data-proposal-link>proposal:${escapeHtml(conversation.linkedProposalId)}</span>`}
      </footer>
      <div class="reaction-row" aria-label="Reactions">
        ${conversation.reactions.map((reaction) => `<button type="button" class="reaction" data-reaction="${escapeHtml(reaction)}">${escapeHtml(reaction)}</button>`).join("")}
      </div>
      <div class="message-action-tray" data-message-actions hidden>
        <dl>
          <div><dt>Anchor</dt><dd>${escapeHtml(conversation.anchor)}</dd></div>
          <div><dt>Signature</dt><dd>${escapeHtml(conversation.signature)}</dd></div>
          <div><dt>Artifact</dt><dd data-tray-artifact>${escapeHtml(conversation.linkedArtifact ?? conversation.repositorySlug ?? conversation.communityId)}</dd></div>
        </dl>
        <div class="action-row">
          <button type="button" data-action="intent">Mark intent</button>
          <button type="button" data-action="agent">Request agent</button>
          <button type="button" data-action="answer">Accept answer</button>
          <button type="button" data-action="docs">Docs patch</button>
          <button type="button" data-action="report">Report</button>
          ${changeId === undefined ? "" : `<button type="button" data-action="approve">Approve change</button>`}
        </div>
        <p class="action-status" data-action-status>Human review required for signed project changes.</p>
      </div>
    </article>
  </li>`;
}
