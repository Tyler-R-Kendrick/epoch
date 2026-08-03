/**
 * First-run orientation strip.
 *
 * A dismissible strip, not a modal and not a tour — DESIGN.md refuses ceremony.
 * It explains the tri-plane IA in three lines written as product truths rather
 * than rule names (Rail Is Place, Feed Is Work, Contribution Verb).
 *
 * The server renders it hidden; the client reveals it only when localStorage
 * has no dismissal record, so a returning member never sees a flash of content
 * they already dismissed, and a browser without JS or storage simply never
 * shows an enhancement it cannot persist.
 */
export function renderFirstRunStrip(): string {
  const lines = [
    "Communities own the channels in the rail — no repository required to belong.",
    "Conversation in the feed becomes signed work you can review.",
    "Promote a message to turn talk into a reviewable change.",
  ];
  return `<aside class="first-run-strip" data-first-run-strip hidden aria-label="How this community works">
    <ol class="first-run-lines">
      ${lines.map((line) => `<li>${line}</li>`).join("")}
    </ol>
    <button type="button" class="first-run-dismiss" data-first-run-dismiss aria-label="Dismiss the orientation strip">Got it</button>
  </aside>`;
}
