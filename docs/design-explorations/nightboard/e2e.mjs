/**
 * Feature regressions for the Nightboard console, driven through the browser.
 *
 * The fault suite proves the failure paths; this proves the features — with
 * the mouse, the keyboard and a touchscreen, from the state the page actually
 * boots into. It exists because click navigation shipped broken twice: every
 * hand-check had typed `cd` first, so no check ever clicked from where a
 * person actually starts.
 *
 *   node docs/design-explorations/nightboard/e2e.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { serveNightboard } from "./serve.mjs";

const own = process.argv[2] ? null : await serveNightboard();
const BASE = process.argv[2] || own.url;

const CASES = [
  {
    name: "mouse: parent-column click goes to the clicked channel",
    run: async (page) => {
      // Boot is /channels/general, so the parent column lists channels.
      await page.click('.cn-col[data-column="0"] .cn-item[data-key="bugs"]');
      return (await path(page)) === "/channels/bugs";
    },
  },
  {
    name: "mouse: breadcrumb, listing dir, and preview listing all navigate",
    run: async (page, log) => {
      await page.click('[data-goto="/"]');
      if ((await path(page)) !== "/") return log("crumb failed");
      await page.click('.cn-col[data-column="1"] .cn-item[data-key="projects"]');
      if ((await path(page)) !== "/projects") return log("listing dir failed: " + await path(page));
      // The preview now lists a project; clicking inside the preview must
      // resolve against the preview's own listing, not the current column's.
      await page.click('.cn-col[data-column="2"] .cn-item[data-kind="dir"]');
      const p = await path(page);
      return p.startsWith("/projects/") || log("preview click went to " + p);
    },
  },
  {
    name: "mouse: clicking a post selects it and opens the preview on it",
    run: async (page, log) => {
      await go(page, "/channels/general");
      await page.click('.cn-col[data-column="1"] .cn-item[data-i="2"]');
      const st = await page.evaluate(() => ({
        cursor: window.NB_APP.state.cursor, focus: window.NB_APP.state.focus,
      }));
      const marked = await page.evaluate(() => !!document.querySelector('.cn-node[data-here="true"]'));
      return (st.cursor === 2 && marked) || log(JSON.stringify(st) + " marked:" + marked);
    },
  },
  {
    name: "touch: tapping a channel navigates",
    touch: true,
    run: async (page) => {
      const item = await page.locator('.cn-col[data-column="0"] .cn-item[data-key="ideas"]').boundingBox();
      await page.touchscreen.tap(item.x + item.width / 2, item.y + item.height / 2);
      await page.waitForTimeout(200);
      return (await path(page)) === "/channels/ideas";
    },
  },
  {
    name: "gesture: phone pages snap between listing and preview",
    viewport: { width: 390, height: 700 },
    run: async (page, log) => {
      const cols = page.locator(".cn-cols");
      const snap = await cols.evaluate((el) => getComputedStyle(el).scrollSnapType);
      if (!snap.includes("x")) return log("no snap: " + snap);
      await cols.evaluate((el) => el.scrollTo({ left: el.clientWidth }));
      await page.waitForTimeout(250);
      const seen = await cols.evaluate((el) => el.scrollLeft > el.clientWidth / 2);
      return seen || log("did not reach the preview page");
    },
  },
  {
    name: "keyboard: arrows move, Enter descends, Esc switches modes",
    run: async (page, log) => {
      await go(page, "/channels");
      await page.keyboard.press("Escape");           // prompt → columns
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      const p = await path(page);
      if (!p.startsWith("/channels/")) return log("Enter went to " + p);
      await page.keyboard.press("Escape");           // columns → prompt
      const back = await page.evaluate(() =>
        document.activeElement === document.querySelector("[data-cli]"));
      return back || log("Esc did not return the prompt");
    },
  },
  {
    name: "threads: twists fold the subtree; promotion stays on the lane",
    run: async (page, log) => {
      await go(page, "/channels/general");
      const before = await count(page, ".cn-node");
      await page.click('[data-fold="p1"]');
      const after = await count(page, ".cn-node");
      const promoted = await count(page, '.cn-node[data-state-of="promoted"]');
      const lane = await page.evaluate(() => !document.querySelector('.cn-merge[data-no-lane="true"]'));
      await page.click('[data-fold="p1"]');
      const restored = await count(page, ".cn-node");
      return (after < before && promoted === 1 && lane && restored === before) ||
        log(`nodes ${before}→${after}→${restored}, promoted ${promoted}, lane ${lane}`);
    },
  },
  {
    name: "graph: the fork lane never draws at reply indentation",
    run: async (page, log) => {
      await go(page, "/channels/general");
      const stray = await page.evaluate(() =>
        document.querySelectorAll(".cn-replies .cn-branch").length);
      const rootLane = await page.evaluate(() =>
        document.querySelectorAll('.cn-graph > .cn-node[data-fork="true"] .cn-branch').length);
      return (stray === 0 && rootLane > 0) || log(`stray ${stray}, root ${rootLane}`);
    },
  },
  {
    name: "panes: drag resizes, dblclick collapses, single click reopens",
    run: async (page, log) => {
      const sp = await page.locator('.cn-split[data-split="1"]').boundingBox();
      await page.mouse.move(sp.x + 3, sp.y + 200);
      await page.mouse.down();
      await page.mouse.move(sp.x + 60, sp.y + 200, { steps: 4 });
      await page.mouse.up();
      await page.waitForTimeout(150);
      const widened = await track1(page);
      if (Math.abs(widened - 380) > 30) return log("drag gave " + widened);
      await page.dblclick('.cn-split[data-split="0"]');
      await page.waitForTimeout(150);
      if ((await track0(page)) !== 0) return log("dblclick did not collapse");
      await page.click('.cn-split[data-split="0"]');
      await page.waitForTimeout(150);
      return (await track0(page)) > 0 || log("click did not reopen");
    },
  },
  {
    name: "panes: zoom never survives a reload",
    run: async (page, log) => {
      await page.keyboard.press("Alt+z");
      await page.waitForTimeout(150);
      if ((await track0(page)) !== 0) return log("Alt+Z did not zoom");
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(300);
      const t0 = await track0(page);
      return t0 > 0 || log("columns still zero after reload");
    },
  },
  {
    name: "live: a tick keeps caret, selection and the input's text",
    run: async (page, log) => {
      await go(page, "/channels/general");
      await page.keyboard.type("cd /mem");
      const r = await page.evaluate(async () => {
        window.NB_APP.state.merged.push(Object.assign({}, window.NB_DATA.incoming[0],
          { id: "live-e2e", at: "23:57", sig: "sig-e2e" }));
        window.NB_APP.render(true);
        await new Promise((resolve) => setTimeout(resolve, 60));
        const input = document.querySelector("[data-cli]");
        return { v: input.value, f: document.activeElement === input };
      });
      return (r.v === "cd /mem" && r.f) || log(JSON.stringify(r));
    },
  },
  {
    name: "context: a channel states its facts from /channels and inside",
    run: async (page, log) => {
      await go(page, "/channels/general");
      const inside = await page.evaluate(() => document.querySelector(".cn-ctx")?.textContent || "");
      if (!inside.includes("#general")) return log("no strip inside: " + inside.slice(0, 40));
      await go(page, "/channels");
      const selecting = await page.evaluate(() => document.querySelector(".cn-ctx")?.textContent || "");
      return selecting.includes("#") || log("no strip when selecting");
    },
  },
  {
    name: "views: diff and raw render and the chips flip",
    run: async (page, log) => {
      await go(page, "/channels/general");
      await page.click('[data-view="diff"]');
      if ((await count(page, ".cn-hunk")) === 0) return log("no hunks");
      await page.click('[data-view="raw"]');
      if ((await count(page, ".cn-raw")) === 0) return log("no raw");
      await page.click('[data-view="graph"]');
      return (await count(page, ".cn-node")) > 0 || log("no graph back");
    },
  },
  {
    name: "cli: completion menu opens, Tab completes, Enter runs",
    run: async (page, log) => {
      await page.keyboard.type("cd pro");
      await page.waitForTimeout(150);
      await page.keyboard.press("Tab");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(200);
      const p = await path(page);
      return p === "/projects" || log("landed at " + p);
    },
  },
];

async function path(page) {
  await page.waitForTimeout(120);
  return page.evaluate(() => window.NB_APP.state.path);
}
async function go(page, to) {
  await page.evaluate((t) => window.NB_APP.navigate(t, { keepCli: true }), to);
  await page.waitForTimeout(120);
}
async function count(page, sel) {
  return page.evaluate((s) => document.querySelectorAll(s).length, sel);
}
async function track(page, i) {
  return page.evaluate((n) => {
    const t = getComputedStyle(document.querySelector(".cn-cols")).gridTemplateColumns.split(" ");
    return Math.round(parseFloat(t[n]));
  }, i);
}
const track0 = (page) => track(page, 0);
const track1 = (page) => track(page, 2);

const browser = await chromium.launch();
let failed = 0;
for (const testCase of CASES) {
  const context = await browser.newContext({
    viewport: testCase.viewport || { width: 1440, height: 900 },
    hasTouch: !!testCase.touch,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  let detail = "";
  let ok = false;
  try {
    ok = (await testCase.run(page, (d) => { detail = String(d).slice(0, 90); return false; })) === true;
  } catch (err) {
    detail = "threw: " + err.message.split("\n")[0].slice(0, 80);
  }
  if (errors.length) { ok = false; detail += " | pageerror: " + errors[0].slice(0, 60); }
  if (!ok) failed += 1;
  console.log((ok ? "  ok   " : "  FAIL ") + testCase.name + (detail ? "\n         " + detail : ""));
  await context.close();
}
await browser.close();
if (own) await own.close();
console.log(failed === 0 ? "\nall features hold" : `\n${failed} feature(s) broken`);
process.exit(failed === 0 ? 0 : 1);
