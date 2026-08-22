import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * A spectator cannot check anything for themselves.
 *
 * They did not choose the allow-list, cannot see what was dropped, and have no
 * way to tell a quiet stream from a broken one. The only thing this surface
 * owes them is an honest account of its own state — so the guarantees worth
 * pinning are the ones that keep that account from quietly degrading:
 * the region cannot be arranged away, a hole is always announced, and an
 * outcome that produced no content is still recorded rather than dropped.
 *
 * Asserted over the source rather than a live page on purpose. A browser test
 * proves the surface behaves once; this proves it cannot be reworded into
 * something reassuring.
 */

const APP = join(process.cwd(), "packages/Epoch.Community.Web/app");

function source(file: string): string {
  return readFileSync(join(APP, file), "utf8");
}

/** A slot is filled from a manifest, and a manifest could place nothing. */
function theSpectatorRegionIsNotManifestPlaced(): void {
  const board = source("board.html");
  const region = /<section[^>]*data-live-spectator[^>]*>/u.exec(board);

  assert.ok(region !== null, "board.html must author the spectator region itself");
  assert.ok(!region[0].includes("data-cw-slot"), "the spectator region must not be a manifest slot");
  assert.match(region[0], /role="region"/u);
  assert.match(region[0], /aria-labelledby="cw-spec-title"/u);
  assert.ok(
    board.indexOf("data-live-spectator") > board.indexOf("data-cw-harness"),
    "the region belongs to the static harness, not the morph mount",
  );
}

/**
 * The released feed is an append-only stream. `role="log"` with a polite live
 * region announces each release without stealing focus; `assertive` would
 * interrupt a reader on every action, and no live region at all would leave a
 * screen-reader user watching nothing.
 */
function theReleasedFeedIsAnAnnouncedLog(): void {
  const board = source("board.html");
  const feed = /<ol[^>]*data-spec-feed[^>]*>/u.exec(board)
    ?? /<ol[^>]*data-spec-feed[\s\S]*?>/u.exec(board);

  assert.ok(feed !== null, "the released feed must exist");
  assert.match(feed[0], /role="log"/u, "an append-only stream is a log");
  assert.match(feed[0], /aria-live="polite"/u, "announced, but never interrupting");
  assert.match(feed[0], /aria-label="Released actions"/u, "the log needs its own name");

  const gap = /<p[^>]*data-spec-gap[^>]*>/u.exec(board);
  assert.ok(gap !== null, "the gap notice must exist");
  assert.match(gap[0], /role="status"/u, "a hole is announced, not silent");
}

/** The one line that must survive every state. */
function theSpectatorIsToldHolesAreNamed(): void {
  const board = source("board.html");
  const creed = /<p[^>]*data-spec-creed[^>]*>([\s\S]*?)<\/p>/u.exec(board);

  assert.ok(creed !== null, "board.html must author the spectator statement");
  const text = creed[1].replace(/\s+/gu, " ").trim();
  assert.match(text, /in the order it released them/iu, "ordering is the claim being made");
  assert.match(text, /never quietly filled in/iu, "a hole is named, never invented");

  assert.ok(
    !source("live-spectator.js").includes("data-spec-creed"),
    "the statement must be markup the module never rewrites",
  );
}

/**
 * "Nothing arrived" and "three things arrived and were refused" must not look
 * the same. Every outcome is recorded, including the ones with no content.
 */
function everyOutcomeIsRecordedNotOnlyTheSuccesses(): void {
  const spectator = source("live-spectator.js");
  const record = /function record\([\s\S]*?\n {2}\}/u.exec(spectator);

  assert.ok(record !== null, "the module must record outcomes in one place");
  for (const kind of ["gap", "quarantined", "duplicate", "skipped"]) {
    assert.ok(record[0].includes(kind), `${kind} outcomes must be recorded, not dropped`);
  }
  // A gap is its own region rather than a list item: a reader scanning the
  // feed would scroll past a line and believe the stream was whole.
  assert.match(spectator, /gaps\.push\(/u, "a gap is tracked separately from the feed");
  assert.match(spectator, /data-spec-gap/u, "and rendered in its own announced region");
}

/**
 * The host's view preferences are theirs. Replaying them would reach into a
 * spectator's page and change it on the host's behalf.
 */
function theHostsViewPreferencesAreNeverReplayed(): void {
  const spectator = source("live-spectator.js");
  assert.match(
    spectator,
    /projection\.replayDecision\(envelope, catalog\)/u,
    "replay eligibility is decided by the shared projection, not here",
  );
  assert.match(spectator, /decision\.kind === "skip"/u, "a skip is honoured");
  assert.match(spectator, /kind: "skipped"/u, "and shown rather than silently discarded");
}

/** Author `display` beats the UA `[hidden]` rule at equal specificity. */
function theHiddenRegionKeepsNoLayoutBox(): void {
  assert.match(
    source("base.css"),
    /\.cw-spec\[hidden\]\s*\{\s*display:\s*none;\s*\}/u,
    ".cw-spec must restore display:none when hidden",
  );
}

export function runCommunityWebLiveSpectatorTests(): void {
  theSpectatorRegionIsNotManifestPlaced();
  theReleasedFeedIsAnAnnouncedLog();
  theSpectatorIsToldHolesAreNamed();
  everyOutcomeIsRecordedNotOnlyTheSuccesses();
  theHostsViewPreferencesAreNeverReplayed();
  theHiddenRegionKeepsNoLayoutBox();
  console.log("Community Web live spectator tests passed");
}
