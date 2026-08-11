import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { After, Given, Then, When } from "@cucumber/cucumber";
import { chromium, type Browser, type Page, type Response as PlaywrightResponse, type Route } from "playwright";
import { createCommunityApiFetchHandler, createInMemoryCommunityApi } from "@epoch/community-api";
import { type CommunityApiTransport, createCommunityClient } from "@epoch/community-core";
import { createCommunityWebApp, renderCommunityWebDocument } from "@epoch/community-web";
import { chromiumLaunchOptions } from "./playwright-options";

interface CommunityWebWorld {
  readonly api?: CommunityApiTransport;
  readonly apiHandler?: (request: Request) => Promise<Response>;
  readonly browser?: Browser;
  readonly page?: Page;
  /** Resolves when the runtime's boot-time refreshRepository GET has been answered (live API mode only). */
  readonly initialRefresh?: Promise<PlaywrightResponse | undefined>;
  /** Rendered document, kept so a scenario can reopen the page in the same origin. */
  readonly document?: string;
}

/** Matches the deployed route: vercel.json rewrites /community/* to the page. */
const COMMUNITY_PAGE_PATH = "/community";

let world: CommunityWebWorld = {};

/** Title of the message whose provenance a scenario revealed. */
let revealedMessageTitle = "";
let nightboardFocusedMessage = "";
let nightboardContextMenuResult: {
  readonly navStable: boolean;
  readonly downStayedInMenu: boolean;
  readonly upStayedInMenu: boolean;
  readonly focusRestored: boolean;
} | undefined;
let nightboardCdResult: {
  readonly labelled: boolean;
  readonly horizontal: boolean;
  readonly previewed: boolean;
  readonly cancelled: boolean;
  readonly committed: boolean;
} | undefined;
let nightboardPostActionResult: {
  readonly controls: Readonly<Record<string, string | null>>;
  readonly vote: number;
  readonly reactionOpened: boolean;
  readonly folded: boolean;
  readonly reposted: boolean;
  readonly shared: boolean;
  readonly copied: boolean;
  readonly replied: boolean;
} | undefined;
let nightboardStartupApplied = false;
let nightboardRouteSticky = false;
let nightboardBoReady = false;
let nightboardTrainableReady = false;
let nightboardFocusRestored = false;
let nightboardLinkResult: {
  readonly objectId: string;
  readonly canonical: string;
  readonly contextual: string;
  readonly exact: string;
} | undefined;
let nightboardSavedViewResult: {
  readonly id: string;
  readonly query: string;
  readonly resultIds: readonly string[];
} | undefined;
let nightboardThreadA11yResult: {
  readonly selected: string;
  readonly reading: string;
  readonly oneTabStop: boolean;
  readonly topology: boolean;
} | undefined;
let nightboardNavigationActions: readonly { readonly actionId: string; readonly objectId?: string }[] = [];
let nightboardJumpResult: {
  readonly cdStayed: boolean;
  readonly grouped: boolean;
  readonly explained: boolean;
  readonly locationStayed: boolean;
} | undefined;

const NIGHTBOARD_ROOT = join(process.cwd(), "docs", "design-explorations", "nightboard");
const NIGHTBOARD_CONTENT_TYPES: Readonly<Record<string, string>> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

After(async function () {
  await Promise.allSettled([
    closeWithTimeout(world.page?.context().close(), "community web browser context close"),
    closeWithTimeout(world.browser?.close(), "community web browser close"),
  ]);
  world = {};
});

Given("the Community Web live API has repository activity", async function () {
  const api = createInMemoryCommunityApi({
    repositories: [{
      slug: "epoch/epoch",
      displayName: "Epoch",
      description: "Event-driven version control for signed, collaborative repository history.",
      maintainers: ["maya"],
      topics: ["dvcs", "agents", "community"],
    }],
  });
  await api.openIssue("epoch/epoch", {
    id: "IDEA-3",
    title: "Dashboard widget should group revenue by region",
    author: "nora",
    body: "The current widget answers total revenue, but support threads keep asking which region changed. Could this become a small widget setting instead of a separate report?",
    labels: ["idea"],
  });
  await api.openIssue("epoch/epoch", {
    id: "BUG-17",
    title: "Preview keyboard focus skips the chart setting",
    author: "ren",
    body: "The preview works visually, but tab order jumps from the toolbar to the footer.",
    labels: ["bug"],
  });
  await api.proposeChange("epoch/epoch", {
    id: "CHANGE-12",
    title: "Keep preview cards attached to conversation state",
    author: "maya",
    body: "Preview status should stay attached to the conversation where review happens.",
    sourceView: "maya/preview-card-thread",
    targetView: "main",
  });

  world = {
    api,
    apiHandler: createCommunityApiFetchHandler(api),
  };
});

Given("Epoch Community is available", function () {
  assert.ok(existsSync(join(NIGHTBOARD_ROOT, "index.html")));
  assert.ok(existsSync(join(NIGHTBOARD_ROOT, "board.html")));
  assert.ok(existsSync(join(NIGHTBOARD_ROOT, "canvasui-fx.js")));
});

When("I open Epoch Community", async function () {
  const browser = await chromium.launch(chromiumLaunchOptions({ headless: true }));
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  await page.route("https://community.test/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const name = pathname === "/" ? "index.html" : basename(pathname);
    const file = join(NIGHTBOARD_ROOT, name);
    if (!existsSync(file)) {
      await route.fulfill({ status: 404, contentType: "text/plain", body: "not found" });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: NIGHTBOARD_CONTENT_TYPES[extname(file)] ?? "application/octet-stream",
      body: readFileSync(file),
    });
  });
  await page.goto("https://community.test/", { waitUntil: "domcontentloaded" });
  world = { ...world, browser, page };
});

Then("the landing presents the creator story with CanvasUI motion", async function () {
  const page = requirePage();
  await page.locator(".nb-landing").waitFor({ state: "visible" });
  await page.locator("#nb-landing-headline").waitFor({ state: "attached" });
  assert.equal(await page.locator("[data-landing-grid]").count(), 1);
  assert.equal(await page.evaluate(() => typeof (window as unknown as Record<string, unknown>).NB_CanvasUI), "object");
});

When("I enter the community board", async function () {
  const page = requirePage();
  await page.locator("#nb-enter-board").click();
  await page.waitForFunction(() => typeof (window as unknown as {
    NB_APP?: { navigate?: unknown };
  }).NB_APP?.navigate === "function");
});

Then("the tmux-style Nightboard is ready for keyboard collaboration", async function () {
  const page = requirePage();
  await page.locator('[data-mount][data-tui="true"]').waitFor({ state: "visible" });
  assert.equal(await page.locator(".nb-bar [data-gridroad]").count(), 1);
  assert.equal(await page.locator("[data-region=\"status\"] .nb-keys-cue").count(), 1);
  assert.equal(await page.evaluate(() => typeof (window as unknown as Record<string, unknown>).NB_APP), "object");
});

When("I open the Nightboard general channel from the prompt", async function () {
  const page = requirePage();
  const helpClose = page.locator("[data-help-close]:visible");
  if (await helpClose.count()) await helpClose.click();
  const prompt = page.locator("[data-cli]");
  await prompt.fill("cd /projects/community/channels/general");
  await prompt.press("Enter");
  await page.locator(".cn-comment").first().waitFor({ state: "visible" });
});

When("I move to the next Nightboard message and open its thread by keyboard", async function () {
  const page = requirePage();
  const first = page.locator('.cn-tree[role="feed"] .cn-comment[role="article"][tabindex="0"]');
  await first.waitFor({ state: "visible" });
  await first.focus();
  const before = await first.getAttribute("data-key");
  assert.ok(before);
  await page.keyboard.press("ArrowDown");
  await page.waitForFunction((previous) =>
    document.activeElement?.closest?.('.cn-comment[role="article"]')?.getAttribute("data-key") !== previous, before);
  const selected = page.locator('.cn-tree[role="feed"] .cn-comment[role="article"]:focus');
  await selected.waitFor({ state: "attached" });
  nightboardFocusedMessage = (await selected.getAttribute("data-key")) ?? "";
  assert.ok(nightboardFocusedMessage);
  assert.notEqual(nightboardFocusedMessage, before);
  await page.keyboard.press("Enter");
  await page.waitForFunction((expected) =>
    (window as unknown as { NB_APP: { state: { threadFocus?: string } } }).NB_APP.state.threadFocus === expected,
  nightboardFocusedMessage);
  await page.locator('.cn-thread-tree[role="tree"]').waitFor({ state: "visible" });
});

Then("the selected Nightboard message remains the single focused feed item", async function () {
  const page = requirePage();
  // Enter replaces the linear channel projection with its thread projection;
  // the same canonical message remains the sole roving focus target.
  assert.equal(await page.locator('.cn-thread-tree[role="tree"] .cn-comment[role="treeitem"][tabindex="0"]').count(), 1);
  const selected = page.locator('.cn-thread-tree[role="tree"] .cn-comment[role="treeitem"]:focus');
  assert.equal(await selected.getAttribute("data-key"), nightboardFocusedMessage);
  assert.equal(await selected.getAttribute("data-here"), "true");
  assert.equal(await selected.getAttribute("aria-current"), "true");
  assert.equal(
    await page.evaluate(() => (window as unknown as { NB_APP: { state: { threadFocus: string } } }).NB_APP.state.threadFocus),
    nightboardFocusedMessage,
  );
  const synchronized = await page.evaluate(() => {
    const app = (window as unknown as { NB_APP: { state: { threadFocus: string } } }).NB_APP;
    const tree = document.querySelector('.cn-thread-tree [role="treeitem"][aria-selected="true"]');
    const reading = document.querySelector('.cn-thread-reading article');
    return tree?.getAttribute("data-object-id") === reading?.getAttribute("data-object-id") &&
      tree?.getAttribute("data-key") === app.state.threadFocus;
  });
  assert.equal(synchronized, true);
});

When("I enter the community board with a resumable session update and workspace defaults", async function () {
  const page = requirePage();
  await page.evaluate(() => localStorage.setItem("nb-startup-signals-v1", JSON.stringify({
    continuation: { host: "codex", sessionId: "codex-cucumber", workspace: "epoch" },
    update: { current: "0.8.0", available: "0.9.0" },
    workspace: { id: "epoch", defaultsVersion: 2, appliedVersion: 1 },
  })));
  await page.locator("#nb-enter-board").click();
});

Then("the bottom line recommends one Ctrl+U restart action", async function () {
  const page = requirePage();
  await page.locator("[data-restart-cue]").waitFor({ state: "visible" });
  const status = await page.locator("[data-status-line]").innerText();
  assert.match(status, /Ctrl\+U.*update.*prime.*resume/i);
});

When("I restart Nightboard with Ctrl+U", async function () {
  const page = requirePage();
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded" }),
    page.keyboard.press("Control+u"),
  ]);
  nightboardStartupApplied = await page.evaluate(() => {
    const got = JSON.parse(localStorage.getItem("nb-startup-applied-v1") ?? "{}");
    return got.update === "0.9.0" && got.workspace === 2 && got.continuation === "codex-cucumber";
  });
});

Then("the session is continued on the updated workspace defaults", function () {
  assert.equal(nightboardStartupApplied, true);
});

When("I send repeated agent turns in one workspace", async function () {
  nightboardRouteSticky = await requirePage().evaluate(() => {
    const browserWindow = window as unknown as {
      NB_ROUTE: { pick(id: string, policy: unknown): { id: string } | null };
    };
    const policy = {
      version: "cucumber-v1",
      routes: [{ id: "local", model: "on-device" }, { id: "capable", model: "switchyard/capable" }],
    };
    const first = browserWindow.NB_ROUTE.pick("workspace-cucumber", policy);
    const second = browserWindow.NB_ROUTE.pick("workspace-cucumber", {
      ...policy, routes: [...policy.routes].reverse(),
    });
    return first?.id === "local" && second?.id === "local";
  });
});

Then("Nightboard keeps the same cache route until policy or failure invalidates it", function () {
  assert.equal(nightboardRouteSticky, true);
});

When("I open the default Bo agent", async function () {
  const page = requirePage();
  await page.evaluate(() => (window as unknown as {
    NB_APP: { navigate(path: string): void };
  }).NB_APP.navigate("/.agents/bo"));
  await page.locator('[data-blade-path="/.agents/bo"][data-blade-kind="list"]')
    .waitFor({ state: "visible" });
});

Then("Bo offers deterministic HoBo new build test debug and up actions", async function () {
  const results = await requirePage().evaluate(() => {
    const browserWindow = window as unknown as {
      NB_HOBO: { run(line: string): { ok: boolean; text: string } };
    };
    return [
      "new cucumber-app --template api",
      "build cucumber-app",
      "test cucumber-app",
      "debug cucumber-app",
      "up cucumber-app --plan",
    ].map((line) => browserWindow.NB_HOBO.run(line));
  });
  nightboardBoReady = results.every((result) => result.ok) &&
    /codegen --check/.test(results[1]?.text ?? "") && /dry-run/.test(results[4]?.text ?? "");
  assert.equal(nightboardBoReady, true);
});

Then("complex unsupported logic is emitted as a trainable stub", async function () {
  nightboardTrainableReady = await requirePage().evaluate(() => {
    const result = (window as unknown as {
      NB_HOBO: { run(line: string): { ok: boolean; text: string } };
    }).NB_HOBO.run("stub cucumber-app complex-billing-rule");
    return result.ok && /use training/.test(result.text) && /contract examples/.test(result.text);
  });
  assert.equal(nightboardTrainableReady, true);
});

When("I expand and restore the focused panel by keyboard", async function () {
  const page = requirePage();
  await page.evaluate(() => {
    const app = (window as unknown as {
      NB_APP: { state: { focus: number; columnFocus: boolean }; render(keep?: boolean): void };
    }).NB_APP;
    app.state.focus = 1;
    app.state.columnFocus = true;
    app.render(true);
  });
  await page.keyboard.press("z");
  const expanded = await page.locator(".cn-blades").getAttribute("data-focus-expanded");
  await page.keyboard.press("z");
  const restored = await page.locator(".cn-blades").getAttribute("data-focus-expanded");
  nightboardFocusRestored = expanded === "1" && restored === "";
});

Then("focus and selection remain in the same panel context", function () {
  assert.equal(nightboardFocusRestored, true);
});

When("I open one Nightboard message from its channel projection", async function () {
  const page = requirePage();
  await page.evaluate(() => (window as unknown as {
    NB_APP: { navigate(path: string, options?: Record<string, unknown>): void };
  }).NB_APP.navigate("/projects/community/channels/general", { keepCli: true }));
  await page.locator('.cn-comment[data-key="p3"]').focus();
  await page.keyboard.press("Enter");
  await page.locator('.cn-thread-tree[role="tree"]').waitFor({ state: "visible" });
  nightboardLinkResult = await page.evaluate(() => {
    const runtime = window as unknown as {
      NB_APP: { state: { path: string; threadFocus: string } };
      NB_DATA: { posts: Array<Record<string, unknown>> };
      NB_MAP: { objectRef(post: Record<string, unknown>): { objectId: string; revision?: string }; projectionIdForPath(path: string): string };
      NB_CORE: { objectUrl(ref: { objectId: string; revision?: string }, options?: Record<string, unknown>): string };
    };
    const post = runtime.NB_DATA.posts.find((item) => item.id === runtime.NB_APP.state.threadFocus);
    if (!post) throw new Error("focused Nightboard message was not found");
    const ref = runtime.NB_MAP.objectRef(post);
    const projectionId = runtime.NB_MAP.projectionIdForPath(runtime.NB_APP.state.path);
    return {
      objectId: ref.objectId,
      canonical: runtime.NB_CORE.objectUrl(ref, { origin: location.origin }),
      contextual: runtime.NB_CORE.objectUrl(ref, { projectionId, origin: location.origin }),
      exact: runtime.NB_CORE.objectUrl({ ...ref, revision: ref.revision ?? "fixture-revision" }, {
        revision: ref.revision ?? "fixture-revision",
        origin: location.origin,
      }),
    };
  });
});

Then("canonical contextual and exact links identify the same message without private content", async function () {
  assert.ok(nightboardLinkResult);
  const parsed = await requirePage().evaluate((links) => {
    const core = (window as unknown as {
      NB_CORE: { parseObjectUrl(url: string): { objectId?: string; projectionId?: string; revision?: string } };
    }).NB_CORE;
    return [core.parseObjectUrl(links.canonical), core.parseObjectUrl(links.contextual), core.parseObjectUrl(links.exact)];
  }, nightboardLinkResult);
  assert.deepEqual(parsed.map((item) => item.objectId), Array(3).fill(nightboardLinkResult.objectId));
  assert.equal(new URL(nightboardLinkResult.canonical).searchParams.has("projection"), false);
  assert.ok(new URL(nightboardLinkResult.contextual).searchParams.get("projection"));
  assert.ok(new URL(nightboardLinkResult.exact).searchParams.get("revision"));
  assert.doesNotMatch(JSON.stringify(nightboardLinkResult), /DO_NOT_LEAK_7f3c/);
});

When("I save and reopen the Nightboard needs-review view", async function () {
  const page = requirePage();
  nightboardSavedViewResult = await page.evaluate(() => {
    const runtime = window as unknown as {
      NB_QUERY: {
        normalize(query: string): { ast: unknown; canonical: string; error?: string };
        filterEntries(entries: unknown[], query: string): { entries: Array<{ post?: { ref?: { objectId: string }; objectId?: string; id: string } }>; error?: string };
      };
      NB_SAVED_VIEWS: { save(input: Record<string, unknown>): { projectionId: string; query: string }; get(id: string): { projectionId: string; query: string } };
      NB_MAP: { feedEntriesAt(path: string): Array<{ post?: { ref?: { objectId: string }; objectId?: string; id: string } }> };
    };
    const normalized = runtime.NB_QUERY.normalize(" ( state:needs-review ) ");
    if (normalized.error) throw new Error(normalized.error);
    const saved = runtime.NB_SAVED_VIEWS.save({ label: "needs review", query: normalized.canonical, ast: normalized.ast, sort: "new", visibility: "private" });
    const reopened = runtime.NB_SAVED_VIEWS.get(saved.projectionId);
    const projected = runtime.NB_QUERY.filterEntries(
      runtime.NB_MAP.feedEntriesAt("/projects/community/channels/general"), normalized.canonical,
    );
    if (projected.error) throw new Error(projected.error);
    const entries = projected.entries;
    return {
      id: reopened.projectionId,
      query: reopened.query,
      resultIds: entries.filter((entry) => entry.post).map((entry) => entry.post?.ref?.objectId ?? entry.post?.objectId ?? entry.post?.id ?? ""),
    };
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction((id) => !!(window as unknown as {
    NB_SAVED_VIEWS?: { get(savedId: string): unknown };
  }).NB_SAVED_VIEWS?.get(id), nightboardSavedViewResult.id);
});

Then("the saved view keeps its identity normalized query and canonical message state", async function () {
  assert.ok(nightboardSavedViewResult);
  const reopened = await requirePage().evaluate((id) => (window as unknown as {
    NB_SAVED_VIEWS: { get(savedId: string): { projectionId: string; query: string } };
  }).NB_SAVED_VIEWS.get(id), nightboardSavedViewResult.id);
  assert.equal(reopened.projectionId, nightboardSavedViewResult.id);
  assert.equal(reopened.query, nightboardSavedViewResult.query);
  assert.ok(nightboardSavedViewResult.resultIds.length > 0);
  assert.equal(new Set(nightboardSavedViewResult.resultIds).size, nightboardSavedViewResult.resultIds.length);
});

When("I traverse a Nightboard thread outline with tree keys", async function () {
  const page = requirePage();
  await page.evaluate(() => (window as unknown as { NB_APP: { navigate(path: string): void; openThread(id: string): void } }).NB_APP
    .navigate("/projects/community/channels/general"));
  await page.evaluate(() => (window as unknown as { NB_APP: { openThread(id: string): void } }).NB_APP.openThread("p3"));
  const current = page.locator('.cn-thread-tree [role="treeitem"][tabindex="0"]');
  await current.focus();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  nightboardThreadA11yResult = await page.evaluate(() => {
    const selected = document.querySelector('.cn-thread-tree [role="treeitem"][aria-selected="true"]');
    const reading = document.querySelector(".cn-thread-reading article");
    const items = Array.from(document.querySelectorAll('.cn-thread-tree [role="treeitem"]'));
    return {
      selected: selected?.getAttribute("data-object-id") ?? "",
      reading: reading?.getAttribute("data-object-id") ?? "",
      oneTabStop: items.filter((item) => item.getAttribute("tabindex") === "0").length === 1,
      topology: items.every((item) => Number(item.getAttribute("aria-level")) >= 1 &&
        Number(item.getAttribute("aria-posinset")) >= 1 && Number(item.getAttribute("aria-setsize")) >= 1),
    };
  });
});

Then("the thread outline and reading pane report the same selected object and topology", function () {
  assert.ok(nightboardThreadA11yResult);
  assert.ok(nightboardThreadA11yResult.selected);
  assert.equal(nightboardThreadA11yResult.reading, nightboardThreadA11yResult.selected);
  assert.equal(nightboardThreadA11yResult.oneTabStop, true);
  assert.equal(nightboardThreadA11yResult.topology, true);
});

When("I invoke namespace parent thread parent browser back and previous location", async function () {
  nightboardNavigationActions = await requirePage().evaluate(async () => {
    const runtime = window as unknown as {
      NB_ACTIONS: {
        invoke(actionId: string, input: Record<string, unknown>, context: Record<string, unknown>): Promise<unknown>;
        lastEvent(): { actionId: string; objectId?: string };
      };
      NB_APP: { state: { path: string; threadFocus?: string } };
      NB_MAP: { projectionIdForPath(path: string): string };
    };
    const actions = [
      ["nav.ascend", {}],
      ["thread.parent", {}],
      ["history.back", {}],
      ["history.previousLocation", {}],
    ] as const;
    const events: Array<{ actionId: string; objectId?: string }> = [];
    for (const [actionId, input] of actions) {
      await runtime.NB_ACTIONS.invoke(actionId, input, {
        origin: "diagnostic",
        context: "board",
        objectId: runtime.NB_APP.state.threadFocus,
        projectionId: runtime.NB_MAP.projectionIdForPath(runtime.NB_APP.state.path),
      });
      events.push(runtime.NB_ACTIONS.lastEvent());
    }
    return events;
  });
});

Then("each Nightboard navigation operation reports its distinct action and outcome", function () {
  assert.deepEqual(nightboardNavigationActions.map((event) => event.actionId), [
    "nav.ascend",
    "thread.parent",
    "history.back",
    "history.previousLocation",
  ]);
  assert.equal(new Set(nightboardNavigationActions.map((event) => event.actionId)).size, 4);
});

When("I compare ambiguous cd with the Nightboard global jump chooser", async function () {
  const page = requirePage();
  const prompt = page.locator("[data-cli]");
  const origin = await page.evaluate(() => (window as unknown as { NB_APP: { state: { path: string } } }).NB_APP.state.path);
  await prompt.fill("cd gen");
  await prompt.press("Enter");
  const afterCd = await page.evaluate(() => (window as unknown as { NB_APP: { state: { path: string } } }).NB_APP.state.path);
  await prompt.fill("zi general");
  await prompt.press("Enter");
  await page.waitForFunction(() => {
    const app = (window as unknown as {
      NB_APP: { state: { candIndex: number; completion?: { kind?: string } } };
    }).NB_APP;
    return app.state.completion?.kind === "jump" && app.state.candIndex === -1 &&
      !!document.querySelector('.cn-menu:not([hidden]) [role="option"]');
  });
  nightboardJumpResult = await page.evaluate(({ originPath, cdPath }) => {
    const state = (window as unknown as {
      NB_APP: { state: { path: string; candIndex: number; completion: { candidates: Array<{
        group?: string; value?: string; kind?: string; matchReason?: string;
        objectId?: string; projectionId?: string; id?: string;
      }> } } };
    }).NB_APP.state;
    const candidates = state.completion.candidates;
    const groups = Array.from(new Set(candidates.map((candidate) => candidate.group).filter(Boolean)));
    const allowedGroups = ["CURRENT", "RECENT", "SAVED VIEWS", "GLOBAL"];
    const rendered = document.querySelectorAll('.cn-menu:not([hidden]) [role="option"]');
    return {
      cdStayed: cdPath === originPath,
      grouped: groups.includes("CURRENT") && groups.includes("GLOBAL") &&
        groups.every((group) => allowedGroups.includes(group as string)),
      explained: candidates.length > 1 && candidates.every((candidate) =>
        !!candidate.value && !!candidate.kind && !!candidate.matchReason &&
        !!(candidate.objectId || candidate.projectionId || candidate.id)) &&
        state.candIndex === -1 && rendered.length > 1,
      locationStayed: state.path === originPath,
    };
  }, { originPath: origin, cdPath: afterCd });
});

Then("cd stays put while jump candidates await explicit acceptance with reasons", function () {
  assert.deepEqual(nightboardJumpResult, {
    cdStayed: true,
    grouped: true,
    explained: true,
    locationStayed: true,
  });
});

When("I operate every focused Nightboard post action by keyboard", async function () {
  const page = requirePage();
  const helpClose = page.locator("[data-help-close]:visible");
  if (await helpClose.count()) await helpClose.click();
  await page.evaluate(() => {
    const app = (window as unknown as {
      NB_APP: { state: {
        columnFocus: boolean; feedMark: string; votes: Record<string, number>;
        folded: Record<string, boolean>; reposts: Record<string, boolean>; reactPick: string | null;
      }; navigate(path: string): void; render(preserve?: boolean): void };
    }).NB_APP;
    app.navigate("/projects/community/channels/general");
    app.state.columnFocus = true;
    app.state.feedMark = "p1";
    app.state.votes = {};
    app.state.folded = {};
    app.state.reposts = {};
    app.state.reactPick = null;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (text: string) => {
        (window as unknown as { __postActionClipboard?: string }).__postActionClipboard = text;
      } },
    });
    app.render(true);
    document.querySelector<HTMLElement>('.cn-comment[data-key="p1"]')?.focus();
  });
  const article = page.locator('.cn-comment[data-key="p1"]');
  const controls = await article.evaluate((node) => ({
    up: node.querySelector('[data-vote="up"]')?.getAttribute("aria-keyshortcuts") ?? null,
    down: node.querySelector('[data-vote="down"]')?.getAttribute("aria-keyshortcuts") ?? null,
    react: node.querySelector("[data-react-pick]")?.getAttribute("aria-keyshortcuts") ?? null,
    fold: node.querySelector('[data-fold="p1"]')?.getAttribute("aria-keyshortcuts") ?? null,
    foldName: node.querySelector('[data-fold="p1"]')?.getAttribute("aria-label") ?? null,
    reply: node.querySelector("[data-reply]")?.getAttribute("aria-keyshortcuts") ?? null,
    repost: node.querySelector("[data-repost]")?.getAttribute("aria-keyshortcuts") ?? null,
    share: node.querySelector("[data-share-post]")?.getAttribute("aria-keyshortcuts") ?? null,
    copy: node.querySelector("[data-copy-post]")?.getAttribute("aria-keyshortcuts") ?? null,
  }));
  await page.keyboard.press("u");
  await page.keyboard.press("d");
  await page.keyboard.press("a");
  const reactionOpened = await page.evaluate(() =>
    (window as unknown as { NB_APP: { state: { reactPick: string | null } } }).NB_APP.state.reactPick === "p1");
  await page.keyboard.press("f");
  await page.keyboard.press("Shift+r");
  await page.keyboard.press("s");
  await page.waitForFunction(() => {
    const copied = (window as unknown as { __postActionClipboard?: string }).__postActionClipboard ?? "";
    try {
      const url = new URL(copied);
      return url.origin === location.origin && url.pathname === "/board.html" &&
        !!url.searchParams.get("projection") && !!url.searchParams.get("focus");
    } catch {
      return false;
    }
  });
  const shared = await page.evaluate(() => {
    const url = new URL((window as unknown as { __postActionClipboard: string }).__postActionClipboard);
    return url.origin === location.origin && url.pathname === "/board.html" &&
      !!url.searchParams.get("projection") && !!url.searchParams.get("focus");
  });
  await page.keyboard.press("y");
  await page.waitForFunction(() => /nightboard thread.*p1/i.test(
    (window as unknown as { __postActionClipboard?: string }).__postActionClipboard ?? ""));
  const acted = await page.evaluate(() => {
    const browserWindow = window as unknown as {
      __postActionClipboard?: string;
      NB_APP: { state: {
        votes: Record<string, number>; folded: Record<string, boolean>; reposts: Record<string, boolean>;
      } };
    };
    return {
      vote: browserWindow.NB_APP.state.votes.p1,
      folded: browserWindow.NB_APP.state.folded.p1 === true,
      reposted: browserWindow.NB_APP.state.reposts.p1 === true,
      copied: /nightboard thread.*p1/i.test(browserWindow.__postActionClipboard ?? ""),
    };
  });
  await page.keyboard.press("r");
  const replied = await page.evaluate(() => {
    const app = (window as unknown as {
      NB_APP: { composeContext(): { postId?: string } };
    }).NB_APP;
    return app.composeContext().postId === "p1" &&
      document.activeElement === document.querySelector("[data-cli]");
  });
  nightboardPostActionResult = { controls, reactionOpened, shared, replied, ...acted };
});

Then("repost and share are visible and every post action has keyboard parity", function () {
  assert.deepEqual(nightboardPostActionResult, {
    controls: {
      up: "u", down: "d", react: "a", fold: "f", foldName: "Collapse replies", reply: "r",
      repost: "Shift+R", share: "s", copy: "y",
    },
    vote: -1,
    reactionOpened: true,
    folded: true,
    reposted: true,
    shared: true,
    copied: true,
    replied: true,
  });
});

When("I browse Nightboard message directories with cd completion", async function () {
  const page = requirePage();
  const helpClose = page.locator("[data-help-close]:visible");
  if (await helpClose.count()) await helpClose.click();
  const prompt = page.locator("[data-cli]");
  await prompt.fill("cd /projects/community/channels/general");
  await prompt.press("Enter");
  await page.locator(".cn-comment").first().waitFor({ state: "visible" });
  const origin = await page.evaluate(() =>
    (window as unknown as { NB_APP: { state: { path: string } } }).NB_APP.state.path);

  await prompt.fill("cd p3");
  const p3 = page.locator('.cn-menu [role="option"]', { hasText: "p3" }).first();
  await p3.waitFor({ state: "visible" });
  const labelled = /Drafted a plan to split the cache key/i.test(await p3.locator("i").innerText());

  await prompt.fill("cd p");
  const selected = await page.evaluate(() =>
    (window as unknown as { NB_APP: { state: { completion: { candidates: Array<{ value: string }> } } } })
      .NB_APP.state.completion.candidates[0]?.value || "");
  await prompt.press("ArrowRight");
  await page.waitForFunction((path) =>
    (window as unknown as { NB_APP: { state: { path: string } } }).NB_APP.state.path !== path, origin);
  const drilled = await prompt.inputValue();
  await prompt.press("ArrowLeft");
  await page.waitForFunction((path) =>
    (window as unknown as { NB_APP: { state: { path: string } } }).NB_APP.state.path === path, origin);
  const horizontal = drilled.endsWith(selected) && await prompt.inputValue() === "cd p";

  await prompt.press("ArrowDown");
  await page.waitForFunction((path) =>
    (window as unknown as { NB_APP: { state: { path: string } } }).NB_APP.state.path !== path, origin);
  const previewed = await page.locator("[data-cd-preview]").isVisible();
  await prompt.press("Escape");
  await page.waitForFunction((path) =>
    (window as unknown as { NB_APP: { state: { path: string } } }).NB_APP.state.path === path, origin);
  const cancelled = await prompt.inputValue() === "cd p";

  await prompt.fill("");
  await prompt.fill("cd p");
  await prompt.press("ArrowDown");
  const acceptedPath = await page.evaluate(() =>
    (window as unknown as { NB_APP: { state: { path: string } } }).NB_APP.state.path);
  await prompt.press("Enter");
  await page.waitForFunction((path) =>
    (window as unknown as { NB_APP: { state: { path: string } } }).NB_APP.state.path === path, acceptedPath);
  nightboardCdResult = {
    labelled,
    horizontal,
    previewed,
    cancelled,
    committed: acceptedPath !== origin && await prompt.inputValue() === "",
  };
});

Then("message choices explain their content and cd typeahead can drill cancel or commit", function () {
  assert.deepEqual(nightboardCdResult, {
    labelled: true,
    horizontal: true,
    previewed: true,
    cancelled: true,
    committed: true,
  });
});

When("I open the general channel context menu and move down and up by keyboard", async function () {
  const page = requirePage();
  const helpClose = page.locator("[data-help-close]:visible");
  if (await helpClose.count()) await helpClose.click();
  const prompt = page.locator("[data-cli]");
  await prompt.fill("cd /projects/community/channels");
  await prompt.press("Enter");
  const item = page.locator('[data-blade-kind="list"] .cn-item[data-key="general"]').first();
  await item.waitFor({ state: "visible" });
  await item.focus();
  const before = await page.evaluate(() => {
    const state = (window as unknown as { NB_APP: { state: { cursor: number; focus: number } } }).NB_APP.state;
    return { cursor: state.cursor, focus: state.focus };
  });
  await item.click({ button: "right" });
  await page.waitForFunction(() => document.activeElement?.hasAttribute("data-ctx-prompt") === true);
  await page.keyboard.press("ArrowDown");
  await page.waitForFunction(() => document.activeElement?.hasAttribute("data-ctx-action") === true);
  const downStayedInMenu = await page.evaluate(() => document.activeElement?.getAttribute("role") === "menuitem");
  await page.keyboard.press("ArrowUp");
  await page.waitForFunction(() => document.activeElement?.hasAttribute("data-ctx-prompt") === true);
  const upStayedInMenu = await page.evaluate(() => document.activeElement?.getAttribute("role") === "menuitem");
  const after = await page.evaluate(() => {
    const state = (window as unknown as { NB_APP: { state: { cursor: number; focus: number } } }).NB_APP.state;
    return { cursor: state.cursor, focus: state.focus };
  });
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector("[data-ctx-menu]"));
  nightboardContextMenuResult = {
    navStable: before.cursor === after.cursor && before.focus === after.focus,
    downStayedInMenu,
    upStayedInMenu,
    focusRestored: await item.evaluate((element) => document.activeElement === element),
  };
});

Then("the Nightboard context menu retains focus without moving the nav selection", function () {
  assert.deepEqual(nightboardContextMenuResult, {
    navStable: true,
    downStayedInMenu: true,
    upStayedInMenu: true,
    focusRestored: true,
  });
});

When("I define the Nightboard review macro with voice phrase {string}", async function (phrase: string) {
  const page = requirePage();
  const helpClose = page.locator("[data-help-close]:visible");
  if (await helpClose.count()) await helpClose.click();
  const prompt = page.locator("[data-cli]");
  await prompt.fill("macro set review = cd /projects/community/channels/general; view state:needs-review");
  await prompt.press("Enter");
  await prompt.fill(`macro voice review = ${phrase}`);
  await prompt.press("Enter");
});

Then("the review macro persists as the {string} agent skill", async function (toolName: string) {
  const page = requirePage();
  const before = await page.evaluate((name) => {
    const root = window as unknown as {
      NB_POWER: { list: () => Array<{ name: string; voice: string }> };
      NB_MCP: { list: () => Array<{ name: string }> };
    };
    return {
      action: root.NB_POWER.list().find((item) => item.name === "review"),
      tool: root.NB_MCP.list().some((tool) => tool.name === name),
    };
  }, toolName);
  assert.equal(before.action?.voice, "start review");
  assert.equal(before.tool, true);
  await page.reload({ waitUntil: "domcontentloaded" });
  const after = await page.evaluate((name) => {
    const root = window as unknown as {
      NB_POWER: { list: () => Array<{ name: string; voice: string }> };
      NB_MCP: { list: () => Array<{ name: string }> };
    };
    return {
      action: root.NB_POWER.list().find((item) => item.name === "review"),
      tool: root.NB_MCP.list().some((tool) => tool.name === name),
    };
  }, toolName);
  assert.equal(after.action?.voice, "start review");
  assert.equal(after.tool, true);
});

Then("the exact voice phrase runs the same review macro", async function () {
  const parsed = await requirePage().evaluate(() => {
    const root = window as unknown as {
      NB_SPEECH: { parseUtterance: (phrase: string, mode: string) => { kind: string; line?: string } };
    };
    return root.NB_SPEECH.parseUtterance("start review", "commands");
  });
  assert.deepEqual({ kind: parsed.kind, line: parsed.line }, { kind: "command", line: "macro run review" });
});

Then("a near voice phrase does not run it", async function () {
  const parsed = await requirePage().evaluate(() => {
    const root = window as unknown as {
      NB_SPEECH: { parseUtterance: (phrase: string, mode: string) => { kind: string; line?: string } };
    };
    return root.NB_SPEECH.parseUtterance("start reviewing", "commands");
  });
  assert.equal(parsed.kind, "unknown");
  assert.equal(parsed.line, undefined);
});

Given("I open the Community Web channel experience", async function () {
  assert.ok(world.api);
  assert.ok(world.apiHandler);
  const app = await createCommunityWebApp({
    client: createCommunityClient(world.api),
    apiBaseUrl: "https://community.test",
  });
  await openCommunityWebPage(app, world.apiHandler);
});

Given("Community Web is running from an honest snapshot", async function () {
  const api = createInMemoryCommunityApi({
    repositories: [{
      slug: "epoch/epoch",
      displayName: "Epoch",
      description: "Event-driven version control for signed, collaborative repository history.",
      maintainers: ["maya"],
      topics: ["dvcs", "agents", "community"],
    }],
  });
  const app = await createCommunityWebApp({ client: createCommunityClient(api) });
  world = { api };
  await openCommunityWebPage(app);
});

async function openCommunityWebPage(
  app: Awaited<ReturnType<typeof createCommunityWebApp>>,
  apiHandler?: (request: Request) => Promise<Response>,
): Promise<void> {
  const videoDir = process.env.EPOCH_COMMUNITY_WEB_VIDEO_DIR;
  if (videoDir !== undefined) {
    mkdirSync(videoDir, { recursive: true });
  }
  const browser = await chromium.launch(chromiumLaunchOptions({
    headless: true,
  }));
  const page = await browser.newPage({
    recordVideo: videoDir === undefined
      ? undefined
      : {
        dir: videoDir,
        size: { width: 1440, height: 960 },
      },
    viewport: { width: 1440, height: 960 },
  });
  const document = renderCommunityWebDocument(app);
  // Serve the document from a real origin instead of setContent: an opaque
  // origin has no usable localStorage, and durable preferences (last-read
  // watermarks, first-run dismissal) are part of the shipped experience.
  await page.route("https://community.test/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/" || pathname === COMMUNITY_PAGE_PATH || pathname.startsWith(`${COMMUNITY_PAGE_PATH}/`)) {
      await route.fulfill({
        status: 200,
        contentType: "text/html; charset=utf-8",
        body: document,
      });
      return;
    }
    if (apiHandler === undefined) {
      await route.fulfill({ status: 404, contentType: "text/plain", body: "no api" });
      return;
    }
    await routeCommunityApi(route, apiHandler);
  });
  let initialRefresh: Promise<PlaywrightResponse | undefined> | undefined;
  if (apiHandler !== undefined) {
    // Register before navigation: the runtime refreshes the repository from the
    // live API during boot, and the response must not be missed by a late waiter.
    initialRefresh = page.waitForResponse(
      (response) => response.request().method() === "GET" && response.url().includes("/repositories/"),
      { timeout: 10_000 },
    ).catch(() => undefined);
  }
  await page.goto(`https://community.test${COMMUNITY_PAGE_PATH}`, { waitUntil: "domcontentloaded" });
  world = { ...world, browser, page, initialRefresh, document, apiHandler };
}

When("I open the Network Feed", async function () {
  const page = requirePage();
  await page.locator('button[data-product-mode="network"]').click();
  await page.locator("[data-surface-panel=\"network\"]:not([hidden])").waitFor({ state: "visible", timeout: 5_000 });
});

When("I switch to the Agent Guild community", async function () {
  const page = requirePage();
  await page.locator('[data-open-community="agent-guild"]').click();
  await page.locator("#community-title").waitFor({ state: "visible", timeout: 5_000 });
});

When("I open the agent-runs channel", async function () {
  await requirePage().locator('button[data-channel="agent-runs"]').click();
});

When("I open the ideas channel in the active community", async function () {
  const page = requirePage();
  await page.locator('button[data-channel="ideas"]').click();
  await page.locator("[data-surface-panel=\"channels\"]:not([hidden])").waitFor({ state: "visible", timeout: 5_000 });
  await page.locator(
    "[data-surface-panel=\"channels\"]:not([hidden]) [data-message]:not([hidden]) .row-heading",
    { hasText: "Dashboard widget should group revenue by region" },
  ).first().waitFor({ state: "visible", timeout: 5_000 });
});

When("I select the {string} community message", async function (title: string) {
  await selectCommunityMessage(title);
});

When("the community repository refreshes from the live API", async function () {
  const page = requirePage();
  assert.ok(world.initialRefresh, "live API scenarios track the runtime's boot-time repository refresh");
  const response = await world.initialRefresh;
  assert.ok(response, "the runtime should refresh the repository from the live API on load");
  // renderRepository rebuilds the whole feed just after the response resolves;
  // wait for the client-rendered welcome message to be back in the feed.
  await page.waitForTimeout(200);
  await page.locator('[data-message-id="epoch-civic-general-welcome"]')
    .waitFor({ state: "attached", timeout: 5_000 });
});

When("I mark the selected message as an intent candidate", async function () {
  const page = requirePage();
  await page.locator("[data-selected-message=\"true\"] [data-action=\"intent\"]").click();
});

When("I request an agent from the selected message", async function () {
  const page = requirePage();
  await page.locator("[data-selected-message=\"true\"] [data-action-more] > summary").click();
  await page.locator("[data-selected-message=\"true\"] [data-action=\"agent\"]").click();
});

When("I add a community reply {string}", async function (message: string) {
  const page = requirePage();
  await page.locator("#community-message").fill(message);
  await page.locator("[data-comment-composer] button[type=\"submit\"]").click();
});

When("I report the selected message", async function () {
  const page = requirePage();
  await page.locator("[data-selected-message=\"true\"] [data-action-more] > summary").click();
  await page.locator("[data-selected-message=\"true\"] [data-action=\"report\"]").click();
});

When("I search community receipts for {string}", async function (query: string) {
  const page = requirePage();
  const search = page.locator("[data-receipt-search]");
  await search.waitFor({ state: "visible", timeout: 5_000 });
  await search.fill(query);
  await page.waitForTimeout(200);
});

When("I use Community Web at a narrow mobile width", async function () {
  await requirePage().setViewportSize({ width: 390, height: 844 });
});

When("I zoom Community Web to 200 percent in a short viewport", async function () {
  const page = requirePage();
  await page.setViewportSize({ width: 720, height: 450 });
  await page.evaluate(() => {
    document.documentElement.style.zoom = "200%";
  });
});

Then("the Community Web shows a community with channels", async function () {
  const page = requirePage();
  assert.equal(await page.locator('[data-product-mode="community"]').count(), 1);
  assert.equal(await page.locator("[data-community-list]").count(), 1);
  assert.equal(await page.locator("[data-channel-list]").count(), 1);
  assert.equal(await page.locator("[data-surface-panel=\"channels\"]:not([hidden])").count(), 1);
  await assertVisible(page, "Epoch Civic Workshop");
  await assertVisible(page, "# general");
  await assertVisible(page, "Welcome to Epoch Civic Workshop");
});

Then("the active channel does not require a repository", async function () {
  const page = requirePage();
  // Social hangout channel is community-owned: it is active and writable with no
  // linked project selected. This asserts the rule rather than a sentence about it.
  assert.equal(await page.locator('button[data-channel="general"][aria-pressed="true"]').count(), 1);
  assert.equal(await page.locator("[data-repo-surfaces]:not([hidden])").count(), 0);
  const composer = page.locator("[data-comment-composer]");
  assert.equal(await composer.getAttribute("data-composer-available"), "true");
  assert.equal(await page.locator("[data-composer-input]").isDisabled(), false);
});

Then("the Community Web shows the Network Feed with activity tabs", async function () {
  const page = requirePage();
  assert.equal(await page.locator("[data-surface-panel=\"network\"]:not([hidden])").count(), 1);
  assert.equal(await page.locator('[data-feed-tab="following"]').count(), 1);
  assert.equal(await page.locator('[data-feed-tab="network"]').count(), 1);
  assert.equal(await page.locator('[data-feed-tab="contributions"]').count(), 1);
  const feedText = await page.locator("[data-dev-feed]").innerText();
  assert.match(feedText, /starred|followed|opened|released|proposed/i);
});

Then("the Community Web shows the Agent Guild channels", async function () {
  const page = requirePage();
  await assertVisible(page, "Agent Guild");
  assert.equal(await page.locator('[data-open-community="agent-guild"][aria-pressed="true"]').count(), 1);
  assert.equal(await page.locator('button[data-channel="agent-runs"][aria-pressed="true"]').count(), 1);
});

Then("signed project actions are collapsed until I select a message", async function () {
  const page = requirePage();
  assert.equal(await page.locator("[data-message-actions]:visible").count(), 0);
  await selectCommunityMessage("Dashboard widget should group revenue by region");
  await page.locator("[data-selected-message=\"true\"] [data-message-actions]").waitFor({ state: "visible", timeout: 5_000 });
  await page.locator("[data-selected-message=\"true\"] [data-action=\"intent\"]").waitFor({ state: "visible", timeout: 5_000 });
  assert.equal(await page.locator("[data-selected-message=\"true\"]").count(), 1);
});

Then("the live API records a change proposal for the selected conversation", async function () {
  const page = requirePage();
  assert.ok(world.api);
  await assertVisible(page, "Intent candidate recorded from the live API");
  const repository = await world.api.getRepository("epoch/epoch");
  const promoted = repository.changeProposals.find((proposal) =>
    proposal.title === "Dashboard widget should group revenue by region"
  );
  assert.ok(promoted);
  await assertVisible(page, `proposal:${promoted.id}`);
  assert.equal(await page.locator(`[data-change-list] [data-change-id="${promoted.id}"]`).count(), 1);
  assert.equal(
    await page.locator("[data-selected-message=\"true\"]").getAttribute("data-linked-proposal"),
    promoted.id,
  );
});

Then("the selected message shows that human review remains required", async function () {
  const page = requirePage();
  await assertVisible(page, "Agent run requested. Human review remains required.");
});

Then("the selected message explains how to reconnect and retry Mark intent", async function () {
  await assertVisible(
    requirePage(),
    "Reconnect the Community API (EPOCH_COMMUNITY_API_URL), reload this page, then retry Mark intent.",
  );
});

Then("the snapshot banner explains how to reconnect for signed work", async function () {
  await assertVisible(
    requirePage(),
    "You're viewing a saved snapshot — not live community activity. To promote signed work, reconnect the Community API (EPOCH_COMMUNITY_API_URL), reload this page, then retry the action.",
  );
});

Then("the reply appears in the message feed with signed comment metadata", async function () {
  const page = requirePage();
  await assertVisible(page, "Keyboard navigation works in the preview.");
  // Live API persists the composer post as a signed issue (or local snapshot metadata offline).
  const liveMeta = page.getByText("community", { exact: false });
  await liveMeta.first().waitFor({ state: "visible", timeout: 5_000 });
  assert.ok(world.api);
  const repository = await world.api.getRepository("epoch/epoch");
  assert.ok(
    repository.issues.some((issue) =>
      issue.title.includes("Keyboard navigation works in the preview.")
      || issue.body.includes("Keyboard navigation works in the preview.")
    ),
    "composer message should be recorded as a live issue",
  );
});

Then("the active conversation remains reachable without an oversized navigation rail", async function () {
  const page = requirePage();
  const feed = await page.locator("[data-message-feed]").boundingBox();
  assert.ok(feed);
  // The rail is a sheet on narrow screens: it must not occupy the content
  // column at rest. Four stacked horizontal scrollers used to eat 83% of the
  // first screen before the first message.
  // The sheet slides on a 180ms transition; settle before measuring.
  await page.waitForTimeout(300);
  const rail = await page.evaluate(() => {
    const element = document.querySelector("[data-community-channel-rail]");
    if (element === null) return null;
    const box = element.getBoundingClientRect();
    return { right: Math.round(box.right), width: Math.round(box.width) };
  });
  assert.ok(rail);
  assert.ok(
    rail.right <= 1,
    `rail must be off-canvas until requested on a narrow screen; its right edge is at ${rail.right}px`,
  );
  assert.ok(feed.y < 844 * 0.4, `message feed starts at ${feed.y}px — chrome is eating the first screen`);
  // And there must be a visible way to open it.
  await page.locator("[data-rail-toggle]").waitFor({ state: "visible", timeout: 5_000 });
});
Then("I can browse each navigation group without horizontal page overflow", async function () {
  const page = requirePage();
  const layout = await page.evaluate(() => ({
    pageOverflows: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    // Navigation is a vertical list in the sheet. It used to be four
    // horizontally-scrolling strips that clipped mid-word ("# su\u2310") and hid
    // six of nine channels behind a sideways swipe inside a vertical drawer.
    groups: ["[data-community-list]", "[data-channel-list]", "[data-repo-list]"].map((selector) => {
      const element = document.querySelector(selector);
      if (element === null) throw new Error(`Missing element ${selector}`);
      return {
        selector,
        overflowX: getComputedStyle(element).overflowX,
        clipped: element.scrollWidth > element.clientWidth + 1,
      };
    }),
  }));
  assert.equal(layout.pageOverflows, false);
  for (const group of layout.groups) {
    assert.notEqual(group.overflowX, "auto", `${group.selector} must not scroll sideways`);
    assert.equal(group.clipped, false, `${group.selector} clips its own content horizontally`);
  }

  // The page-level check alone gave a false pass: an ancestor with
  // overflow-x: hidden suppressed the document scrollbar while the message
  // feed itself rendered wider than the viewport and clipped message text.
  const feed = await page.evaluate(() => {
    const element = document.querySelector(".message-feed");
    if (element === null) throw new Error("Missing .message-feed");
    return { scrollWidth: element.scrollWidth, clientWidth: element.clientWidth };
  });
  assert.ok(
    feed.scrollWidth <= feed.clientWidth,
    `message feed content is clipped: scrollWidth ${feed.scrollWidth} > clientWidth ${feed.clientWidth}`,
  );
});

Then("conversation reactions meet the Community touch-target floor", async function () {
  const heights = await requirePage().locator(".reaction:visible").evaluateAll((buttons) =>
    buttons.map((button) => button.getBoundingClientRect().height)
  );
  assert.ok(heights.length > 0);
  assert.ok(Math.min(...heights) >= 28, `smallest reaction is ${Math.min(...heights)}px tall`);
});

Then("Community state remains readable and announced", async function () {
  const page = requirePage();
  const heading = await page.locator(".feed-heading").boundingBox();
  const state = page.locator("[data-header-meta]");
  const stateBox = await state.boundingBox();
  assert.ok(heading);
  assert.ok(stateBox);
  // The header is a single row now, so state sits beside the heading rather
  // than stacked beneath it — but the two must not overlap.
  assert.ok(
    stateBox.x >= heading.x + heading.width || stateBox.y >= heading.y + heading.height,
    "Community state overlaps the heading",
  );
  assert.equal(await state.getAttribute("role"), "status");
  // Liveness is stated once, in words, not by colour alone.
  const text = (await state.innerText()).trim();
  assert.match(text, /^(live|snapshot)$/u, `header state should be one word, got: ${text}`);
});

Then("the current channel context remains labeled", async function () {
  assert.equal(await requirePage().getByRole("group", { name: "Current channel" }).count(), 1);
});

Then("the zoomed navigation remains bounded above community content", async function () {
  const page = requirePage();
  const rail = await page.locator("[data-community-channel-rail]").boundingBox();
  const content = await page.locator("#community-content").boundingBox();
  assert.ok(rail);
  assert.ok(content);
  assert.ok(rail.height <= 300, `zoomed navigation rail is ${rail.height}px tall`);
  assert.ok(content.y < 450, `zoomed community content starts below the viewport at ${content.y}px`);
});

Then("the zoomed document has no horizontal page overflow", async function () {
  assert.equal(await requirePage().evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth
  ), false);
});

Then("the selected message shows legal-hold evidence status", async function () {
  const page = requirePage();
  await assertVisible(page, "Moderation report opened with legal-hold evidence.");
});

Then("the receipt search reports at least one match", async function () {
  const page = requirePage();
  const status = page.locator("[data-receipt-search-status]");
  await status.waitFor({ state: "visible", timeout: 5_000 });
  const text = await status.innerText();
  assert.match(text, /[1-9]\d* receipt match/i);
});

Then("a visible agent receipt includes harness {string}", async function (harness: string) {
  const page = requirePage();
  const hit = page.locator('[data-author-role="agent"][data-search-hit="true"]:visible, [data-author-role="agent"]:not([hidden])');
  await hit.first().waitFor({ state: "visible", timeout: 5_000 });
  const text = await hit.first().innerText();
  assert.match(text, new RegExp(harness, "i"));
});

Then("the Community Web shows a signed promote receipt for the new proposal", async function () {
  const page = requirePage();
  assert.ok(world.api);
  await assertVisible(page, "Intent candidate recorded from the live API");
  const repository = await world.api.getRepository("epoch/epoch");
  const promoted = repository.changeProposals.find((proposal) =>
    proposal.title === "Dashboard widget should group revenue by region"
  );
  assert.ok(promoted);
  const receipt = page.locator(
    `[data-promote-receipt][data-proposal-id="${promoted.id}"], [data-message]:not([hidden]) [data-promote-receipt]`,
  ).filter({ hasText: `proposal:${promoted.id}` });
  await receipt.first().waitFor({ state: "visible", timeout: 8_000 });
  await assertVisible(page, `proposal:${promoted.id}`);
  assert.equal(await page.locator(`[data-change-list] [data-change-id="${promoted.id}"]`).count(), 1);
});

Then("the selected message keeps the Mark intent and Report signed actions", async function () {
  const page = requirePage();
  const selected = page.locator('[data-selected-message="true"]');
  await selected.waitFor({ state: "attached", timeout: 5_000 });
  await selected.locator("[data-message-actions]").waitFor({ state: "visible", timeout: 5_000 });
  // EPX-D001: client-rendered social messages must keep the signed action tray after a live refresh.
  assert.equal(
    await selected.locator('[data-action="intent"]').count(),
    1,
    "Mark intent action must survive a live client refresh on community-owned messages",
  );
  assert.equal(
    await selected.locator('[data-action="report"]').count(),
    1,
    "Report action must survive a live client refresh on community-owned messages",
  );
});

Then("the identity chip uses auth state {string}", async function (authState: string) {
  const page = requirePage();
  const chip = page.locator("[data-identity-chip]");
  await chip.first().waitFor({ state: "visible", timeout: 5_000 });
  assert.equal(await chip.first().getAttribute("data-auth-state"), authState);
});

Then("the identity chip explains that AT OAuth is not linked", async function () {
  await assertVisible(requirePage(), "AT not linked");
});

async function routeCommunityApi(
  route: Route,
  apiHandler: ((request: Request) => Promise<Response>) | undefined,
): Promise<void> {
  assert.ok(apiHandler);
  const request = route.request();
  const response = await apiHandler(new Request(request.url(), {
    method: request.method(),
    headers: request.headers(),
    body: request.postData(),
  }));
  await route.fulfill({
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: await response.text(),
  });
}

function requirePage(): Page {
  assert.ok(world.page);
  return world.page;
}

async function selectCommunityMessage(title: string): Promise<void> {
  const page = requirePage();
  await page.getByRole("button", { name: `Open signed actions for ${title}` }).click();
}

async function assertVisible(page: Page, text: string): Promise<void> {
  await page.getByText(text, { exact: false }).first().waitFor({ state: "visible", timeout: 5_000 });
}

async function closeWithTimeout(task: Promise<unknown> | undefined, label: string): Promise<void> {
  if (task === undefined) {
    return;
  }

  await Promise.race([
    task.then(() => undefined),
    new Promise<void>((resolve) => {
      setTimeout(() => {
        console.warn(`${label} timed out; continuing cleanup`);
        resolve();
      }, 5_000);
    }),
  ]);
}

// ── Experience layer: empty states, search clearing, unread, first run ───────

When("I open the support channel in the active community", async function () {
  const page = requirePage();
  await page.locator('button[data-channel="support"]').click();
  await page.locator('[data-surface-panel="channels"]:not([hidden])').waitFor({ state: "visible", timeout: 5_000 });
});

When("I press Escape in the receipt search", async function () {
  const page = requirePage();
  const search = page.locator("[data-receipt-search]");
  await search.focus();
  await search.press("Escape");
  await page.waitForTimeout(150);
});

When("the ideas channel gains activity after I last read it", async function () {
  const page = requirePage();
  // Simulate having read #ideas when it was empty: the watermark is the message
  // count seen, so a lower watermark is exactly what storage would hold.
  await page.evaluate(() => {
    const key = "epoch-community:last-read";
    const raw = window.localStorage.getItem(key);
    const map: Record<string, number> = raw === null ? {} : JSON.parse(raw) as Record<string, number>;
    map["epoch-civic|ideas"] = 0;
    window.localStorage.setItem(key, JSON.stringify(map));
  });
  // Re-render badges by selecting another channel.
  await page.locator('button[data-channel="general"]').click();
  await page.waitForTimeout(150);
});

Then("the channel shows an empty state naming a next action", async function () {
  const page = requirePage();
  const state = page.locator('.message-feed [data-state-item]:not([hidden]) [data-state-kind="empty"]');
  await state.waitFor({ state: "visible", timeout: 5_000 });
  const title = await state.locator(".state-title").innerText();
  const action = await state.locator(".state-action").innerText();
  assert.match(title, /No questions in #support yet\./u);
  assert.ok(action.trim().length > 0, "empty state must offer a next action");
  assert.match(action, /Ask what you are stuck on/u);
});

Then("the feed shows a zero-result state naming {string}", async function (query: string) {
  const page = requirePage();
  const state = page.locator('.message-feed [data-state-item]:not([hidden]) [data-state-kind="empty"]');
  await state.waitFor({ state: "visible", timeout: 5_000 });
  const title = await state.locator(".state-title").innerText();
  assert.ok(title.includes(query), `zero-result state should name the query, got: ${title}`);
  const action = await state.locator(".state-action").innerText();
  assert.match(action, /Search covers messages, intents, harness labels, and promote receipts/u);
});

Then("the receipt search is empty and announces the channel", async function () {
  const page = requirePage();
  const value = await page.locator("[data-receipt-search]").inputValue();
  assert.equal(value, "");
  const status = await page.locator("[data-receipt-search-status]").innerText();
  assert.match(status, /Search cleared\./u);
  const visible = await page.locator('[data-surface-panel="channels"]:not([hidden]) [data-message]:not([hidden])').count();
  assert.ok(visible > 0, "clearing search must restore the channel messages");
});

Then("no channel shows an unread count on a first visit", async function () {
  const page = requirePage();
  const unread = await page.locator("[data-channel-has-unread]").count();
  assert.equal(unread, 0, "a first visit must not mark every channel unread");
});

Then("the ideas channel shows an unread count", async function () {
  const page = requirePage();
  const button = page.locator('button[data-channel="ideas"]');
  await button.locator("[data-channel-unread]:not([hidden])").waitFor({ state: "visible", timeout: 5_000 });
  const count = await button.locator("[data-channel-unread]").innerText();
  assert.match(count.trim(), /^[1-9]\d*$/u);
  const label = await button.getAttribute("aria-label");
  assert.match(label ?? "", /unread/u, "unread must be readable, not colour-only");
});

// ── Craft moments: provenance reveal and contribution lineage ────────────────

When("I reveal the provenance of the {string} message", async function (title: string) {
  const page = requirePage();
  const message = page.locator("[data-message]:not([hidden])", { hasText: title }).first();
  await message.waitFor({ state: "visible", timeout: 5_000 });
  await message.locator("[data-signature-reveal]").click();
  await message.locator("[data-provenance-panel]:not([hidden])").waitFor({ state: "visible", timeout: 5_000 });
  revealedMessageTitle = title;
});

When("I view the lineage of the promoted message", async function () {
  const page = requirePage();
  const lineage = page.locator("[data-message]:not([hidden]) [data-view-lineage]").first();
  await lineage.waitFor({ state: "visible", timeout: 5_000 });
  await lineage.click();
  await page.locator('[data-lineage-target="true"]').waitFor({ state: "visible", timeout: 5_000 });
});

Then("the provenance panel names the signature, anchor, and source", async function () {
  const page = requirePage();
  assert.ok(revealedMessageTitle, "a message must be revealed first");
  const message = page.locator("[data-message]:not([hidden])", { hasText: revealedMessageTitle }).first();
  const panel = message.locator("[data-provenance-panel]:not([hidden])");
  await panel.waitFor({ state: "visible", timeout: 5_000 });
  const text = await panel.innerText();
  // Labels are uppercased by CSS, so innerText returns them transformed.
  assert.match(text, /signature/iu);
  assert.match(text, /anchor/iu);
  assert.match(text, /source/iu);
  // The values themselves, not just the labels.
  assert.match(text, /sig:/u);
  // The panel must state which side of the honesty line the record came from.
  assert.match(text, /live Community API|snapshot sample/u);
  const expanded = await message.locator("[data-signature-reveal]").getAttribute("aria-expanded");
  assert.equal(expanded, "true", "the signature mark must report its expanded state");
});

Then("the origin message and the resulting change are marked as one contribution", async function () {
  const page = requirePage();
  await page.locator('[data-lineage-target="true"]').waitFor({ state: "visible", timeout: 5_000 });
  assert.equal(await page.locator('[data-lineage-origin="true"]').count(), 1, "origin message must be marked");
  assert.equal(await page.locator('[data-lineage-target="true"]').count(), 1, "resulting change must be marked");
  const originProposal = await page.locator('[data-lineage-origin="true"]').getAttribute("data-linked-proposal");
  const targetChange = await page.locator('[data-lineage-target="true"]').getAttribute("data-change-id");
  assert.ok(originProposal);
  assert.equal(originProposal, targetChange, "both ends must reference the same proposal");
});
