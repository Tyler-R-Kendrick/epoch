import type { CommunityChannelId, CommunityConversationView } from "../model/types";
import { escapeHtml, initials } from "./html";
import { renderRow } from "./row";

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
    : `${signers.length} signer${signers.length === 1 ? "" : "s"}`;
  return `<span class="members-label">Signers</span>
          ${pills}
          <span class="members-count" data-members-count>${count}</span>`;
}

/**
 * Provenance reveal.
 *
 * The signature in the footer was decorative text — the exact "trust theater"
 * the critique protocol auto-fails on. It is now a disclosure that expands the
 * record behind the mark: what was signed, where it is anchored, who can see
 * it, and whether this came from the live API or a snapshot. Every value is
 * already-loaded state, so the panel can never claim verification the data
 * does not support.
 */
function renderProvenancePanel(conversation: CommunityConversationView): string {
  const rows: readonly (readonly [string, string])[] = [
    ["Signature", conversation.signature],
    ["Anchor", conversation.anchor],
    ["Author", `@${conversation.author}`],
    ["Visibility", conversation.visibility],
    ["Source", conversation.source === "api" ? "live Community API" : "snapshot sample"],
    ...(conversation.intentId === undefined
      ? []
      : [["Intent", `intent:${conversation.intentId}`] as const]),
    ...(conversation.linkedProposalId === undefined
      ? []
      : [["Proposal", `proposal:${conversation.linkedProposalId}`] as const]),
  ];
  return `<div class="signature-provenance" id="provenance-${escapeHtml(conversation.id)}" data-provenance-panel hidden>
        <dl>
          ${rows.map(([term, value]) =>
            `<div><dt>${escapeHtml(term)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
        </dl>
      </div>`;
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
  const comments = conversation.comments ?? [];
  const commentNote = comments.length > 0
    ? ` · ${comments.length} comment${comments.length === 1 ? "" : "s"}`
    : "";
  const threadComments = comments.length > 0
    ? `<div class="thread-comments" data-thread-comments>${comments.map((comment) =>
      `<div class="thread-comment"><strong>${escapeHtml(comment.author)}</strong> <span>${escapeHtml(comment.body)}</span></div>`).join("")}</div>`
    : "";
  const promoteReceipt = conversation.linkedProposalId !== undefined
    ? `<div class="message-promote-receipt" data-promote-receipt data-proposal-id="${escapeHtml(conversation.linkedProposalId)}">
        <span class="promote-receipt-label">Signed promote</span>
        <strong data-proposal-link>proposal:${escapeHtml(conversation.linkedProposalId)}</strong>
        <span class="promote-receipt-state" data-promote-state>${escapeHtml(conversation.state || "open")} · human review required</span>
        <button
          type="button"
          class="lineage-link"
          data-view-lineage="${escapeHtml(conversation.linkedProposalId)}"
        >View lineage</button>
      </div>`
    : conversation.intentId
    ? `<div class="message-promote-receipt" data-promote-receipt data-intent-id="${escapeHtml(conversation.intentId)}">
        <span class="promote-receipt-label">Signed intent</span>
        <strong data-intent-meta>intent:${escapeHtml(conversation.intentId)}</strong>
        <span class="promote-receipt-state" data-promote-state>${escapeHtml(conversation.state || "open")}</span>
      </div>`
    : "";
  const meta = [
    `<strong class="row-actor">${escapeHtml(conversation.author)}</strong>`,
    `<span class="row-role">${escapeHtml(isAgent ? "member agent" : conversation.role)}</span>`,
    harnessBadge,
    managedBy,
    `<time>${escapeHtml(conversation.time)}</time>`,
    `<span class="row-state" data-message-state>${escapeHtml(conversation.state + commentNote)}</span>`,
    // The global state chip already says snapshot; repeating it per message was
    // one of seven "sample/snapshot" statements on a single screen.
    conversation.source === "snapshot" ? `<span class="visually-hidden" data-snapshot-badge>snapshot sample</span>` : "",
  ].filter(Boolean).join("");

  const foot = `<button
          type="button"
          class="signature-mark"
          data-signature-reveal="${escapeHtml(conversation.id)}"
          aria-expanded="false"
          aria-controls="provenance-${escapeHtml(conversation.id)}"
          aria-label="Show provenance for ${escapeHtml(conversation.title)}"
        ><span class="row-receipt-mark" aria-hidden="true"></span>signed</button>${
    conversation.intentId ? `<span class="visually-hidden" data-intent-meta>intent:${escapeHtml(conversation.intentId)}</span>` : ""
  }${
    conversation.linkedProposalId === undefined ? "" : `<span class="visually-hidden" data-proposal-link>proposal:${escapeHtml(conversation.linkedProposalId)}</span>`
  }`;

  const actions = conversation.reactions
    .map((reaction) => `<button type="button" class="button-quiet reaction" data-reaction="${escapeHtml(reaction)}">${escapeHtml(reaction)}</button>`)
    .join("");

  const tray = `<div class="message-action-tray" data-message-actions hidden>
        <dl>
          <div><dt>Anchor</dt><dd>${escapeHtml(conversation.anchor)}</dd></div>
          <div><dt>Signature</dt><dd>${escapeHtml(conversation.signature)}</dd></div>
          <div><dt>Artifact</dt><dd data-tray-artifact>${escapeHtml(conversation.linkedArtifact ?? conversation.repositorySlug ?? conversation.communityId)}</dd></div>
        </dl>
        <div class="action-row">
          <button type="button" class="button-intent" data-action="intent">Mark intent</button>
          <button type="button" class="button-chip" data-action="agent">Request agent</button>
          <button type="button" class="button-chip" data-action="answer">Accept answer</button>
          <button type="button" class="button-chip" data-action="docs">Docs patch</button>
          <button type="button" class="button-chip" data-action="report">Report</button>
          ${changeId === undefined ? "" : `<button type="button" class="button-primary" data-action="approve">Approve change</button>`}
        </div>
        <p class="action-status" data-action-status>Human review required for signed project changes.</p>
      </div>`;

  return renderRow({
    classNames: `row-message${agentClass}`,
    attrs: ` data-message data-channel="${conversation.channel}" data-community-id="${escapeHtml(conversation.communityId)}" data-message-id="${escapeHtml(conversation.id)}" data-feed-item-source="${conversation.source}" data-author-role="${escapeHtml(conversation.role)}"${issueAttr}${changeAttr}${linkedProposal}${hidden}`,
    lead: { text: initials(conversation.author), variant: isAgent ? "agent" : "person" },
    meta,
    titleHtml: `<button type="button" class="row-title row-select" data-select-message="${escapeHtml(conversation.id)}" aria-label="Open signed actions for ${escapeHtml(conversation.title)}">${escapeHtml(conversation.title)}</button>`,
    body: conversation.body,
    extra: `${threadComments}${artifactCard}${promoteReceipt}${renderProvenancePanel(conversation)}${tray}`,
    foot,
    actions,
  });
}
