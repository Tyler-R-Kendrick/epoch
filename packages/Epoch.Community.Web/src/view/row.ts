/**
 * The one row primitive.
 *
 * The critique measured three row components for three lists: `.feed-message`
 * at 164px, `.dev-feed-item` at 59–133px, `.artifact-item` at 83px, with text
 * origins at 42.4px / 40.4px / 18.4px, internal gaps of 8px vs 1.6px, dividers
 * transparent / solid / solid, and hover wash / wash / none. They all represent
 * the same object: a thing that happened, by someone, that you can act on.
 *
 * Every list surface renders through this. Callers supply their own data
 * attributes and inner content; the primitive owns padding, the leading slot
 * width, the divider, the hover wash, and the typographic hierarchy — so those
 * cannot drift apart again.
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
