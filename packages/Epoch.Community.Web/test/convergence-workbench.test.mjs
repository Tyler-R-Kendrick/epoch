import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { chromium } from "playwright";
import { createConvergenceFixture } from "../../Epoch.Community.Core/dist/convergence.js";
import { renderConvergenceWorkbench } from "../dist/view/convergence-workbench.js";

test("change graph keeps roving tree focus, detail selection, native review buttons, and mobile zoom", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 640 } });
    await page.setContent(`<!doctype html><html lang="en"><head><title>Convergence workbench test</title></head><body>${renderConvergenceWorkbench(createConvergenceFixture({ changes: "base,left,right", dependencies: "left>base,right>base", gates: true, conflict: true }))}</body></html>`);
    assert.equal(await page.locator('[role="treeitem"][tabindex="0"]').count(), 1);
    await page.locator('[role="treeitem"]').first().focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    const selected = await page.locator('[role="treeitem"][aria-selected="true"]').getAttribute("data-change-id");
    assert.equal(selected, "left");
    assert.equal(await page.locator("[data-review-detail]").getAttribute("data-change-id"), selected);
    assert.equal(await page.locator('[aria-label="Cumulative and individual review modes"] button').count(), 2);
    await page.locator('[data-review-mode="cumulative"]').focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator('[data-review-mode="cumulative"]').getAttribute("aria-pressed"), "true");
    await page.evaluate(() => { globalThis.document.documentElement.style.fontSize = "200%"; });
    assert.equal(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.document.documentElement.clientWidth), true);
    await page.addScriptTag({ content: readFileSync("node_modules/axe-core/axe.min.js", "utf8") });
    const violations = await page.evaluate(async () => (await globalThis.axe.run(globalThis.document, {
      resultTypes: ["violations"],
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    })).violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical"));
    assert.deepEqual(violations.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => node.target) })), []);
  } finally {
    await browser.close();
  }
});
