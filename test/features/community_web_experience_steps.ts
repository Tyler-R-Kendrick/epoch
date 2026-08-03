import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
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
    "[data-surface-panel=\"channels\"]:not([hidden]) [data-message]:not([hidden]) h2",
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
  await page.locator("[data-selected-message=\"true\"] [data-action=\"agent\"]").click();
});

When("I add a community reply {string}", async function (message: string) {
  const page = requirePage();
  await page.locator("#community-message").fill(message);
  await page.locator("[data-comment-composer] button[type=\"submit\"]").click();
});

When("I report the selected message", async function () {
  const page = requirePage();
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
  // Social hangout channel is community-owned.
  assert.equal(await page.locator('button[data-channel="general"][aria-pressed="true"]').count(), 1);
  await assertVisible(page, "no repository required");
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
    "Reconnect EPOCH_COMMUNITY_API_URL, reload this page, then retry Mark intent.",
  );
});

Then("the snapshot banner explains how to reconnect for signed work", async function () {
  await assertVisible(
    requirePage(),
    "To promote signed work, reconnect EPOCH_COMMUNITY_API_URL, reload this page, then retry the action.",
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
  const rail = await page.locator("[data-community-channel-rail]").boundingBox();
  const feed = await page.locator("[data-message-feed]").boundingBox();
  assert.ok(rail);
  assert.ok(feed);
  assert.ok(rail.height <= 360, `navigation rail is ${rail.height}px tall`);
  assert.ok(feed.y < 844, `message feed starts below the viewport at ${feed.y}px`);
});

Then("I can browse each navigation group without horizontal page overflow", async function () {
  const page = requirePage();
  const layout = await page.evaluate(() => ({
    pageOverflows: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    groups: ["[data-community-list]", "[data-channel-list]", "[data-repo-list]"].map((selector) => {
      const element = document.querySelector(selector);
      if (element === null) {
        throw new Error(`Missing element ${selector}`);
      }
      return getComputedStyle(element).overflowX;
    }),
  }));
  assert.equal(layout.pageOverflows, false);
  assert.ok(layout.groups.every((overflow) => overflow === "auto"), layout.groups.join(", "));

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
  assert.ok(stateBox.y >= heading.y + heading.height, "Community state overlaps the heading");
  assert.equal(await state.getAttribute("role"), "status");
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
  await assertVisible(requirePage(), "AT OAuth not linked");
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

When("I dismiss the first-run orientation strip", async function () {
  const page = requirePage();
  await page.locator("[data-first-run-dismiss]").click();
  await page.locator("[data-first-run-strip]").waitFor({ state: "hidden", timeout: 5_000 });
});

When("I reopen the Community Web channel experience", async function () {
  const page = requirePage();
  await page.goto(`https://community.test${COMMUNITY_PAGE_PATH}`, { waitUntil: "domcontentloaded" });
  await page.locator("[data-community-web-shell]").waitFor({ state: "visible", timeout: 5_000 });
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

Then("the first-run orientation strip explains the rail, feed, and promote path", async function () {
  const page = requirePage();
  const strip = page.locator("[data-first-run-strip]");
  await strip.waitFor({ state: "visible", timeout: 5_000 });
  const text = await strip.innerText();
  assert.match(text, /rail/iu);
  assert.match(text, /signed work/iu);
  assert.match(text, /Promote a message/iu);
});

Then("the first-run orientation strip stays dismissed", async function () {
  const page = requirePage();
  await page.waitForTimeout(200);
  const visible = await page.locator("[data-first-run-strip]:not([hidden])").count();
  assert.equal(visible, 0, "dismissal must persist across reopening the page");
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
