import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { After, Given, Then, When } from "@cucumber/cucumber";
import { chromium, type Browser, type Page, type Route } from "playwright";
import { createCommunityApiFetchHandler, createInMemoryCommunityApi } from "@epoch/community-api";
import { type CommunityApiTransport, createCommunityClient } from "@epoch/community-core";
import { createCommunityWebApp, renderCommunityWebDocument } from "@epoch/community-web";

interface CommunityWebWorld {
  readonly api?: CommunityApiTransport;
  readonly apiHandler?: (request: Request) => Promise<Response>;
  readonly browser?: Browser;
  readonly page?: Page;
}

let world: CommunityWebWorld = {};

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
  const videoDir = process.env.EPOCH_COMMUNITY_WEB_VIDEO_DIR;
  if (videoDir !== undefined) {
    mkdirSync(videoDir, { recursive: true });
  }

  const app = await createCommunityWebApp({
    client: createCommunityClient(world.api),
    apiBaseUrl: "https://community.test",
  });
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath !== undefined && executablePath.length > 0 ? { executablePath } : {}),
  });
  const page = await browser.newPage({
    recordVideo: videoDir === undefined
      ? undefined
      : {
        dir: videoDir,
        size: { width: 1440, height: 960 },
      },
    viewport: { width: 1440, height: 960 },
  });
  await page.route("https://community.test/**", (route) => routeCommunityApi(route, world.apiHandler));
  await page.setContent(renderCommunityWebDocument(app), { waitUntil: "domcontentloaded" });
  world = { ...world, browser, page };
});

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
  assert.equal(await page.locator('button[data-channel="agent-runs"]').count(), 1);
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

Then("the selected message shows legal-hold evidence status", async function () {
  const page = requirePage();
  await assertVisible(page, "Moderation report opened with legal-hold evidence.");
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
