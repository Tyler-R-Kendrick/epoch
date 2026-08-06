#!/usr/bin/env node
// Accessibility gate for the Nightboard design exploration.
//
// Serves the live board, runs axe-core in Chromium at desktop and mobile
// widths, and fails on serious/critical violations. Evidence lands in
// docs/evidence/nightboard/axe.json.
//
// Usage: node scripts/run-nightboard-axe.mjs [--output <path>]

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { chromium } from "playwright";
import { serveNightboard } from "../docs/design-explorations/nightboard/serve.mjs";

const outputPath = outputFromArgs(process.argv.slice(2))
  ?? join("docs", "evidence", "nightboard", "axe.json");

const FAILING_IMPACTS = new Set(["serious", "critical"]);
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 960 },
  { name: "mobile", width: 390, height: 844 },
];

const axeSource = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const server = await serveNightboard();
const runs = [];
let browser;

try {
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    await page.goto(server.url, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    // Exercise a channel with markdown + code so scrollable regions and feed
    // chrome are in the tree axe actually sees.
    await page.waitForFunction(
      () => !!(window.NB_APP && typeof window.NB_APP.navigate === "function"),
      { timeout: 10000 },
    );
    await page.evaluate(() => {
      window.NB_APP.navigate("/projects/community/channels/bugs", { keepCli: true });
    });
    await page.waitForTimeout(300);
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
  if (browser) await browser.close();
  await server.close();
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
