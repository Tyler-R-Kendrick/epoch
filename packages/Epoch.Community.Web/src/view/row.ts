/**
 * The one row primitive. Replaced three components rendering the same object —
 * a thing that happened, by someone, that you can act on — at three densities
 * and three text origins. It owns padding, lead width, divider, hover wash and
 * hierarchy so those cannot drift apart again; callers supply content only.
 */
import { escapeHtml } from "./html";

export interface RowLead {
  /** Short initials or mark. Reserved width is fixed even when absent. */
  readonly text?: string;
  readonly variant?: "person" | "agent" | "none";
}

export interface RowInput {
  /** Attributes for the <li>, already escaped by the caller. */
  readonly attrs?: string;
  readonly classNames?: string;
  readonly lead?: RowLead;
  /** Small line above the title: actor, verb, time, state. Pre-rendered HTML. */
  readonly meta?: string;
  /** The one strong line. Optional when `titleHtml` supplies it directly. */
  readonly title?: string;
  /** Pre-rendered strong line (e.g. a navigable object button). */
  readonly titleHtml?: string;
  readonly body?: string;
  /** Extra blocks between body and footer (receipts, threads, cards). */
  readonly extra?: string;
  /** Quiet footer line: receipt marks, provenance disclosure. */
  readonly foot?: string;
  /** Right-aligned actions in the footer row. */
  readonly actions?: string;
  /** Anything that must sit outside the body column (overlay hitboxes). */
  readonly overlay?: string;
}

export function renderRow(input: RowInput): string {
  const variant = input.lead?.variant ?? "person";
  const lead = variant === "none"
    ? `<span class="row-lead row-lead-empty" aria-hidden="true"></span>`
    : `<span class="row-lead row-lead-${variant}" aria-hidden="true">${escapeHtml(input.lead?.text ?? "")}</span>`;
  const title = input.titleHtml ?? `<span class="row-title">${escapeHtml(input.title ?? "")}</span>`;
  const footParts = [
    input.foot ? `<span class="row-foot-facts">${input.foot}</span>` : "",
    input.actions ? `<span class="row-foot-actions">${input.actions}</span>` : "",
  ].filter(Boolean).join("");
  return `<li class="row ${input.classNames ?? ""}"${input.attrs ?? ""}>
    ${input.overlay ?? ""}
    ${lead}
    <div class="row-body">
      ${input.meta ? `<div class="row-meta">${input.meta}</div>` : ""}
      <h2 class="row-heading">${title}</h2>
      ${input.body ? `<p class="row-text">${escapeHtml(input.body)}</p>` : ""}
      ${input.extra ?? ""}
      ${footParts ? `<div class="row-foot">${footParts}</div>` : ""}
    </div>
  </li>`;
}
