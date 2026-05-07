import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { After, Before, Given, Then, When } from "@cucumber/cucumber";
import { chromium, type Browser, type Page } from "playwright";
import { createServer, type ViteDevServer } from "vite";
import type { PlatformConsoleModel } from "@epoch/platform-web";

interface PlatformWebState {
  workspace: string;
  model: PlatformConsoleModel;
  browser?: Browser;
  page?: Page;
  server?: ViteDevServer;
}

let webState: PlatformWebState;

Before(function () {
  webState = {
    workspace: mkdtempSync(join(tmpdir(), "epoch-platform-web-")),
    model: {
      role: "operator",
      productionReady: false,
      projectName: "platform",
      environmentName: "production",
      deployableName: "api-web",
      primaryAction: "Create deployable",
      deploymentHealth: "healthy",
      communityEnabled: false,
    },
  };
});

After(async function () {
  await Promise.allSettled([
    webState.page?.close(),
    webState.browser?.close(),
    webState.server?.close(),
  ]);
  rmSync(webState.workspace, { recursive: true, force: true });
});

Given("an Epoch Platform web console model with Community disabled", function () {
  webState.model.communityEnabled = false;
});

Given("an Epoch Platform web console model with Community enabled", function () {
  webState.model.communityEnabled = true;
});

Given("the web console model is production ready", function () {
  webState.model.productionReady = true;
});

Given("the web console model role is {string}", function (role: string) {
  webState.model.role = role as PlatformConsoleModel["role"];
});

Given("the web console model has project {string} environment {string} deployable {string}", function (projectName: string, environmentName: string, deployableName: string) {
  webState.model.projectName = projectName;
  webState.model.environmentName = environmentName;
  webState.model.deployableName = deployableName;
});

Given("the web console model primary action is {string}", function (primaryAction: string) {
  webState.model.primaryAction = primaryAction;
});

Given("the web console model Community moderation state is {string}", function (moderationState: string) {
  webState.model.communityModerationState = moderationState;
});

Given(
  "the web console model Community project page has slug {string} readme {string} deploy badge {string} contribution prompt {string} bookmarks {int} discussions {int}",
  function (publicSlug: string, readme: string, deployStatusBadge: string, contributionPrompt: string, bookmarksCount: number, discussionsCount: number) {
    webState.model.communityProjectPage = {
      publicSlug,
      readme,
      deployStatusBadge,
      contributionPrompt,
      bookmarksCount,
      discussionsCount,
    };
  },
);

Given("the web console model mobile actions are {string}", function (actions: string) {
  webState.model.mobileActions = actions.split(",").map((action) => action.trim());
});

Given("the web console model home modules are {string}", function (modules: string) {
  webState.model.homeModules = modules.split(",").map((module) => module.trim());
});

Given("the web console model admin sections are {string}", function (sections: string) {
  webState.model.adminSections = sections.split(",").map((section) => section.trim());
});

Given("the web console model table columns are {string}", function (columns: string) {
  webState.model.tableColumns = columns.split(",").map((column) => column.trim());
});

Given("the web console model confirmation resource is {string}", function (resource: string) {
  webState.model.confirmationResource = resource;
});

Given("the web console model SDK equivalent is {string}", function (sdkEquivalent: string) {
  webState.model.sdkEquivalent = sdkEquivalent;
});

When("I render the Epoch Platform web console at width {int}", async function (width: number) {
  mkdirSync(webState.workspace, { recursive: true });
  writeFileSync(join(webState.workspace, "index.html"), "<!doctype html><main id=\"root\"></main><script type=\"module\" src=\"/src/main.js\"></script>\n", "utf8");
  mkdirSync(join(webState.workspace, "src"), { recursive: true });
  writeFileSync(join(webState.workspace, "src", "main.js"), browserSource(webState.model), "utf8");

  webState.server = await createServer({
    root: webState.workspace,
    logLevel: "silent",
    server: { host: "127.0.0.1", port: 0 },
    resolve: {
      alias: [
        { find: "@epoch/platform-web", replacement: join(process.cwd(), "packages", "Epoch.Platform.Web", "src", "index.ts") },
      ],
    },
  });
  await webState.server.listen();
  const url = webState.server.resolvedUrls?.local[0];
  assert.ok(url);

  webState.browser = await chromium.launch({ headless: true });
  webState.page = await webState.browser.newPage({ viewport: { width, height: 760 } });
  await webState.page.goto(url);
  await webState.page.locator("[data-epoch-platform-ready=\"true\"]").waitFor({ timeout: 10_000 });
});

Then("the web console shows {string}", async function (text: string) {
  assert.ok(webState.page);
  await assertVisibleText(webState.page, text);
});

Then("the web console primary action is {string}", async function (text: string) {
  assert.ok(webState.page);
  const button = webState.page.getByRole("button", { name: text });
  await button.waitFor({ timeout: 10_000 });
});

Then("the web console hides navigation item {string}", async function (text: string) {
  assert.ok(webState.page);
  assert.equal(await webState.page.getByRole("navigation").getByText(text, { exact: true }).count(), 0);
});

Then("the web console shows navigation item {string}", async function (text: string) {
  assert.ok(webState.page);
  await webState.page.getByRole("navigation").getByText(text, { exact: true }).waitFor({ timeout: 10_000 });
});

Then("the web console has accessible label {string}", async function (label: string) {
  assert.ok(webState.page);
  await webState.page.getByLabel(label).waitFor({ timeout: 10_000 });
});

Then("the web console uses mobile navigation", async function () {
  assert.ok(webState.page);
  await webState.page.locator("[data-navigation-mode=\"mobile\"]").waitFor({ timeout: 10_000 });
});

Then("the web console uses desktop navigation", async function () {
  assert.ok(webState.page);
  await webState.page.locator("[data-navigation-mode=\"desktop\"]").waitFor({ timeout: 10_000 });
});

async function assertVisibleText(page: Page, text: string): Promise<void> {
  await page.getByText(text, { exact: true }).first().waitFor({ timeout: 10_000 });
}

function browserSource(model: PlatformConsoleModel): string {
  return `
import { renderPlatformConsole } from "@epoch/platform-web";

renderPlatformConsole(document.getElementById("root"), ${JSON.stringify(model)});
`;
}
