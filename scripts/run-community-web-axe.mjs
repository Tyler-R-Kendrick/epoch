#!/usr/bin/env node
// Accessibility gate for Community Web.
//
// Renders the real document, runs axe-core against it in Chromium at desktop
// and mobile widths, and fails on serious/critical violations. Evidence is
// written to docs/evidence/community-web/axe.json so the screen-reader persona
// has something falsifiable to review instead of a screenshot.
//
// Usage: node scripts/run-community-web-axe.mjs [--output <path>]

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { chromium } from "playwright";
import { createInMemoryCommunityApi } from "../packages/Epoch.Community.API/dist/index.js";
import { createCommunityWebApp, renderCommunityWebDocument } from "../packages/Epoch.Community.Web/dist/index.js";

const outputPath = outputFromArgs(process.argv.slice(2))
  ?? join("docs", "evidence", "community-web", "axe.json");

const FAILING_IMPACTS = new Set(["serious", "critical"]);
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 960 },
  { name: "mobile", width: 390, height: 844 },
];

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
  body: "Support threads keep asking which region changed.",
  labels: ["idea"],
});
await api.createChange("epoch/epoch", {
  id: "CHANGE-12",
  title: "Keep preview cards attached to conversation state",
  author: "maya",
  body: "Preview status should stay attached to the conversation.",
  sourceView: "maya/preview-card-thread",
  targetView: "main",
});

const app = await createCommunityWebApp({ client: api, apiBaseUrl: "https://community.test" });
const html = renderCommunityWebDocument(app);
const axeSource = readFileSync("node_modules/axe-core/axe.min.js", "utf8");

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {}),
});
const runs = [];

try {
  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    await page.route("https://community.test/**", async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname === "/community" || pathname === "/") {
        await route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: html });
        return;
      }
      // Offline API: the honest snapshot/degraded path must be accessible too.
      await route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
    });
    await page.goto("https://community.test/community", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(400);
    await page.addScriptTag({ content: axeSource });

    const result = await page.evaluate(async () => {
      return await window.axe.run(document, {
        resultTypes: ["violations"],
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
      });
    });

    runs.push({
      viewport: viewport.name,
      width: viewport.width,
      height: viewport.height,
      violations: result.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        nodes: violation.nodes.length,
        targets: violation.nodes.slice(0, 5).map((node) => node.target.join(" ")),
      })),
    });
    await page.close();
  }
} finally {
  await browser.close();
}

const failing = runs.flatMap((run) =>
  run.violations
    .filter((violation) => FAILING_IMPACTS.has(violation.impact))
    .map((violation) => ({ viewport: run.viewport, ...violation })),
);

const report = {
  tool: "axe-core",
  standard: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
  failingImpacts: [...FAILING_IMPACTS],
  pass: failing.length === 0,
  runs,
  failing,
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);

for (const run of runs) {
  const counts = run.violations.reduce((acc, violation) => {
    acc[violation.impact ?? "unknown"] = (acc[violation.impact ?? "unknown"] ?? 0) + 1;
    return acc;
  }, {});
  const summary = Object.entries(counts).map(([impact, count]) => `${impact}:${count}`).join(" ") || "clean";
  console.log(`axe ${run.viewport} (${run.width}x${run.height}): ${summary}`);
}
console.log(`report: ${outputPath}`);

if (failing.length > 0) {
  for (const violation of failing) {
    console.error(`FAIL [${violation.viewport}] ${violation.id} (${violation.impact}): ${violation.help}`);
    for (const target of violation.targets) {
      console.error(`  ${target}`);
    }
  }
  process.exitCode = 1;
}

function outputFromArgs(args) {
  const index = args.indexOf("--output");
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error("--output requires a path");
  }
  return value;
}
