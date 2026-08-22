import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The Live Space host panel is safety chrome, so its guarantees are structural.
 *
 * A Live Session is the one surface where a mistake is unrecoverable: released
 * bytes are already copied by the time anyone notices. The protections that
 * matter are therefore the ones a generated interface revision cannot reach —
 * the region exists in the page's own markup, the statement about what is
 * published is authored there rather than rendered, and no mutation is
 * annotated as a local preference an agent may take on a host's behalf.
 *
 * These are asserted over the source rather than a live page on purpose. A
 * browser test proves the panel behaves; this proves it cannot be arranged
 * away, which is a property of the files and not of one run.
 */

const APP = join(process.cwd(), "packages/Epoch.Community.Web/app");

function source(file: string): string {
  return readFileSync(join(APP, file), "utf8");
}

/**
 * A `data-cw-slot` is filled from a manifest, and a manifest a model wrote can
 * simply place nothing. What is published, and to whom, is not a layout
 * question, so the region is authored in board.html and is not a slot.
 */
function theHostRegionIsNotManifestPlaced(): void {
  const board = source("board.html");
  const region = /<section[^>]*data-live-host[^>]*>/u.exec(board);

  assert.ok(region !== null, "board.html must author the Live Space region itself");
  assert.ok(
    !region[0].includes("data-cw-slot"),
    "the Live Space region must not be a manifest-placed slot",
  );
  assert.match(region[0], /role="region"/u, "the region must be a landmark");
  assert.match(region[0], /aria-labelledby="cw-live-title"/u, "the landmark must carry its own name");

  const harness = board.indexOf("data-cw-harness");
  const mount = board.indexOf("data-mount");
  assert.ok(harness !== -1 && mount !== -1, "board.html must have both the harness and the mount");
  assert.ok(
    board.indexOf("data-live-host") > harness,
    "the region belongs to the static harness, not the morph mount",
  );
}

/**
 * The one line that must survive every state. A host who reads nothing else on
 * the panel has still been told the two things that decide whether starting is
 * safe: what is published, and that it cannot be taken back.
 */
function theSafetyStatementIsAuthoredNotRendered(): void {
  const board = source("board.html");
  const creed = /<p[^>]*data-live-creed[^>]*>([\s\S]*?)<\/p>/u.exec(board);

  assert.ok(creed !== null, "board.html must author the publication statement");
  const text = creed[1].replace(/\s+/gu, " ").trim();
  assert.match(text, /never your screen/iu, "the statement must rule out screen capture");
  assert.match(text, /never your keystrokes/iu, "the statement must rule out keystroke capture");
  assert.match(text, /cannot be recalled/iu, "the statement must say released bytes are unrecoverable");

  assert.ok(
    !source("live.js").includes("data-live-creed"),
    "the statement must be markup the panel never rewrites",
  );
}

/**
 * Hosting is other people's view of this work. A live mutation annotated as a
 * local preference would be one an agent could take without a human deciding
 * that an audience should exist.
 */
function everyLiveMutationIsSharedAndPermissioned(): void {
  const actions = source("actions.js");
  const readOnly = ["live.show", "live.preflight"];
  const declared = [...actions.matchAll(/\{ actionId: "(live\.[A-Za-z]+)"[^\n]*/gu)];

  assert.ok(declared.length >= 8, `expected the whole live action family, found ${declared.length}`);

  for (const match of declared) {
    const [line, actionId] = match;
    assert.ok(actionId !== undefined && line !== undefined, "a matched action must have both parts");
    if (readOnly.includes(actionId)) {
      assert.match(line, /sideEffect: "read"/u, `${actionId} reads, so it must say so`);
      continue;
    }
    assert.match(line, /sideEffect: "shared"/u, `${actionId} changes what an audience sees`);
    assert.match(line, /permission: "community\.participate"/u, `${actionId} must require participation`);
  }
}

/**
 * `start` and `end` are irreversible. Confirmation comes from a person at the
 * board, never from the fact that some caller asked — which is the same rule
 * the bus enforces underneath, restated here so the surface cannot drift from
 * it silently.
 */
function irreversibleStepsTakeConfirmationFromAPerson(): void {
  const app = source("app.js");
  const runtime = /function liveAction\([\s\S]*?\n {2}\}/u.exec(app);

  assert.ok(runtime !== null, "app.js must own a live action runtime");
  assert.match(
    runtime[0],
    /context\.origin === "pointer" \|\| context\.origin === "key"/u,
    "confirmation must be read from a human origin",
  );
  assert.match(runtime[0], /"start"\) return window\.CW_LIVE\.start\(byHand\)/u, "start confirms only by hand");
  assert.match(runtime[0], /"end"\) return window\.CW_LIVE\.end\(byHand\)/u, "end confirms only by hand");

  const live = source("live.js");
  assert.match(
    live,
    /start: function \(confirmed\) \{ return lifecycle\("start", confirmed === true\); \}/u,
    "start must require an explicit true rather than any truthy value",
  );
  assert.match(
    live,
    /end: function \(confirmed\) \{ return lifecycle\("end", confirmed === true\); \}/u,
    "end must require an explicit true rather than any truthy value",
  );
}

/**
 * The browser holds no Live Session state, so with no port the command family
 * must still exist and answer. A missing command is indistinguishable from a
 * broken page, and the panel would have nothing true to say.
 */
function theCommandFamilyIsRegisteredEvenWithNoDeployment(): void {
  const workspace = source("workspace.js");
  assert.match(
    workspace,
    /extensions: liveExtensions\(actorId\)/u,
    "the browser runtime must register the live command family",
  );
  assert.match(
    workspace,
    /function livePort\(\)\s*\{\s*return undefined;\s*\}/u,
    "the browser must not stand in a local fake for a hosted session",
  );
}

/**
 * A document-wide `[data-live-state]` lookup also matches <body>, which carries
 * a hosting flag for CSS. Writing textContent onto <body> erases the page — it
 * did, once — so panel lookups stay scoped to the host element and the body
 * flag keeps a different name.
 */
function panelLookupsCannotResolveToTheBody(): void {
  const live = source("live.js");

  assert.ok(
    !/\$\("\[data-live-(state|facts|preflight|controls)\]"\)/u.test(live),
    "panel elements must be looked up within the host, not document-wide",
  );
  assert.match(live, /host\.querySelector\("\[data-live-state\]"\)/u, "state is scoped to the host");
  assert.ok(
    !live.includes("document.body.dataset.liveState"),
    "the body flag must not share a name with a panel hook",
  );
  assert.match(live, /document\.body\.dataset\.liveHosting/u, "the body flag keeps a distinct name");
}

/**
 * An author `display` beats the UA `[hidden] { display: none }` rule at equal
 * specificity, so a panel with a `display` of its own keeps a layout box while
 * hidden. It did, and it moved the board on a phone.
 */
function theHiddenPanelKeepsNoLayoutBox(): void {
  const css = source("base.css");
  assert.match(css, /\.cw-live\[hidden\]\s*\{\s*display:\s*none;\s*\}/u,
    ".cw-live must restore display:none when hidden");
}

export function runCommunityWebLiveHostTests(): void {
  theHostRegionIsNotManifestPlaced();
  theSafetyStatementIsAuthoredNotRendered();
  everyLiveMutationIsSharedAndPermissioned();
  irreversibleStepsTakeConfirmationFromAPerson();
  theCommandFamilyIsRegisteredEvenWithNoDeployment();
  panelLookupsCannotResolveToTheBody();
  theHiddenPanelKeepsNoLayoutBox();
  console.log("Community Web live host tests passed");
}
