import assert from "node:assert/strict";
import { createInMemoryCommunityApi } from "@epoch/community-api";
import { createCommunityWebApp, renderCommunityWebDocument } from "@epoch/community-web";

/**
 * Text budget.
 *
 * A full inventory of the pre-redesign UI found 54.2% of all rendered text was
 * explanation or status rather than labels, data, or content — and a default
 * load showed 16 explanation/status strings (777 characters) wrapped around a
 * single 150-character message, a 5:1 ratio of the product talking about itself
 * to actual content. The phrase "no repository required" appeared five times on
 * one screen and "sample/snapshot" seven times.
 *
 * These assertions exist so that cannot come back quietly.
 */
export async function runCommunityWebTextBudgetTests(): Promise<void> {
  const app = await createCommunityWebApp({
    client: createInMemoryCommunityApi({
      repositories: [{
        slug: "epoch/epoch",
        displayName: "Epoch",
        description: "Event-driven DVCS",
        maintainers: ["maya"],
      }],
    }),
  });
  const html = renderCommunityWebDocument(app);
  const visible = visibleText(html);

  retiredSermonsStayRetired(html);
  oneIdeaIsNotRestated(visible);
  livenessIsStatedOnce(visible);
  provenanceIsRenderedOnce(html);
}

/**
 * What a reader actually sees on first paint: no scripts, no styles, and none
 * of the screen-reader-only or collapsed-disclosure content. Counting those was
 * how an earlier version of this test reported 26 "snapshot" strings for a
 * screen that shows two.
 */
function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gu, " ")
    .replace(/<style[\s\S]*?<\/style>/gu, " ")
    .replace(/<span class="visually-hidden"[\s\S]*?<\/span>/gu, " ")
    .replace(/<div class="signature-provenance"[\s\S]*?<\/div>\s*<\/div>/gu, " ")
    .replace(/<div class="message-action-tray"[\s\S]*?<\/div>\s*<\/div>/gu, " ")
    .replace(/<[^>]+>/gu, " ")
    .replace(/\s+/gu, " ")
    .toLowerCase();
}

function retiredSermonsStayRetired(html: string): void {
  // The first-run strip cost 89px desktop / 124px mobile on all four planes and
  // described a rail that is absent on the Network plane.
  assert.ok(!html.includes("data-first-run-strip"), "the first-run orientation strip must stay deleted");
  // The banner reserved for state must not carry feature marketing again.
  assert.ok(
    !html.includes("social channels are community-owned"),
    "the honesty banner must state status, not sell the product",
  );
}

function oneIdeaIsNotRestated(visible: string): void {
  const occurrences = (needle: string): number => visible.split(needle).length - 1;
  // Was five times in one viewport across banner, strip, topic, body, placeholder.
  assert.ok(
    occurrences("no repository required") <= 2,
    `"no repository required" appears ${occurrences("no repository required")} times; budget is 2`,
  );
}

function livenessIsStatedOnce(visible: string): void {
  // Was seven "sample/snapshot" statements on one screen, with the banner and
  // the composer footer contradicting each other. The chrome now states it in
  // the header chip and, when degraded, the banner.
  assert.ok(
    !visible.includes("snapshot sample"),
    "the per-message snapshot badge must not be visible; the header chip already states the source",
  );
  assert.ok(
    !visible.includes("not a live acp session"),
    "the composer must not contradict the header state chip",
  );
}

function provenanceIsRenderedOnce(html: string): void {
  // Anchor/signature were rendered three times per message: ambient footer,
  // disclosure panel, and action tray.
  const ambientFooters = (html.match(/class="message-footer"/gu) ?? []).length;
  assert.equal(ambientFooters, 0, "provenance must live in the disclosure, not ambiently on every row");
}
