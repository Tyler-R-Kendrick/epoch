import type { CommunitySessionIdentity } from "../model/types";
import { resolveSessionAuthNote } from "../model/session";
import { escapeHtml } from "./html";

/**
 * Portable ATProto identity chip — single template for the server document and
 * the compiled client runtime, with the auth note always sourced from
 * resolveSessionAuthNote so honesty copy cannot drift between the two.
 */
export function renderIdentityChip(session: CommunitySessionIdentity): string {
  const note = resolveSessionAuthNote(session.authState);
  return `<span class="identity-chip" data-identity-chip data-auth-state="${escapeHtml(session.authState)}" title="Portable ATProto identity (${escapeHtml(note)})">
            <span class="identity-handle">@${escapeHtml(session.handle.replace(/^@/, ""))}</span>
            <span class="identity-did">${escapeHtml(session.did)}</span>
            <span class="identity-auth-note" data-auth-note>${escapeHtml(note)}</span>
          </span>`;
}
