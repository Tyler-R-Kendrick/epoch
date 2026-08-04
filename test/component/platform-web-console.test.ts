import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { renderPlatformConsole } from "@epoch/platform-web";

export function runPlatformWebConsoleTests(): void {
  withPlatformConsoleDom(360, (root) => {
    renderPlatformConsole(root, {
      role: "operator",
      productionReady: true,
      projectName: "platform",
      environmentName: "production",
      deployableName: "api-web",
      primaryAction: "Deploy to production",
      deploymentHealth: "healthy",
      communityEnabled: false,
    });

    assert.equal(root?.querySelector("[data-epoch-platform-ready=\"true\"]")?.getAttribute("data-navigation-mode"), "mobile");
    assert.match(root?.textContent ?? "", /Production ready/);
    assert.match(root?.textContent ?? "", /platform \/ production \/ api-web/);
    assert.equal(root?.querySelector("[aria-label=\"Ask AI about platform\"]")?.textContent, "AI");
    assert.ok(!root?.textContent?.includes("Community review"));

    // The console inlines the shared @epoch/design-tokens :root block and styles
    // itself with it — the raw GitHub-Primer palette must never come back.
    const styleText = root?.querySelector("style")?.textContent ?? "";
    assert.match(styleText, /--epoch-color-ink: #1a1a17;/);
    assert.match(styleText, /var\(--epoch-color-success\)/);
    assert.ok(!styleText.includes("#1f883d"), "platform console must not re-introduce Primer green #1f883d");
    assert.ok(!styleText.includes("#f6f8fa"), "platform console must not re-introduce Primer gray #f6f8fa");
  });

  withPlatformConsoleDom(1180, (root) => {
    renderPlatformConsole(root, {
      role: "maintainer",
      productionReady: true,
      projectName: "platform",
      environmentName: "production",
      deployableName: "api-web",
      primaryAction: "Deploy to production",
      deploymentHealth: "healthy",
      communityEnabled: true,
      communityModerationState: "approved",
      runnerCount: 1,
      latestDeploymentState: "succeeded",
      packageName: "api-web",
      packageVersion: "1.0.0",
      searchResults: [
        { type: "repository", label: "api" },
        { type: "deployable", label: "api-web" },
      ],
      communityFollowers: 2,
      communityStars: 1,
      communityFeed: ["alice opened discussion Roadmap"],
      moderationQueueCount: 1,
    });

    assert.equal(root?.querySelector("[data-epoch-platform-ready=\"true\"]")?.getAttribute("data-navigation-mode"), "desktop");
    assert.match(root?.textContent ?? "", /Community/);
    assert.match(root?.querySelector("[aria-label=\"Operational telemetry\"]")?.textContent ?? "", /1 runner online/);
    assert.match(root?.querySelector("[aria-label=\"Operational telemetry\"]")?.textContent ?? "", /Latest deploy: succeeded/);
    assert.match(root?.querySelector("[aria-label=\"Search results\"]")?.textContent ?? "", /api repository/);
    assert.match(root?.querySelector("[aria-label=\"Package distribution\"]")?.textContent ?? "", /api-web 1.0.0/);
    assert.match(root?.querySelector("[aria-label=\"Community activity\"]")?.textContent ?? "", /2 followers/);
    assert.match(root?.querySelector("[aria-label=\"Community activity\"]")?.textContent ?? "", /1 star/);
    assert.match(root?.querySelector("[aria-label=\"Community activity\"]")?.textContent ?? "", /alice opened discussion Roadmap/);
    assert.match(root?.querySelector("[aria-label=\"Community moderation\"]")?.textContent ?? "", /1 moderation item/);
  });
}

function withPlatformConsoleDom(width: number, run: (root: Element | null) => void): void {
  const dom = new JSDOM("<!doctype html><main id=\"root\"></main>", {
    url: "https://epoch.local/",
    pretendToBeVisual: true,
  });
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;

  try {
    Object.defineProperty(globalThis, "window", { value: dom.window, configurable: true });
    Object.defineProperty(globalThis, "document", { value: dom.window.document, configurable: true });
    Object.defineProperty(dom.window, "innerWidth", { value: width, configurable: true });
    const root = dom.window.document.getElementById("root");

    run(root);
  } finally {
    Object.defineProperty(globalThis, "window", { value: previousWindow, configurable: true });
    Object.defineProperty(globalThis, "document", { value: previousDocument, configurable: true });
  }
}
