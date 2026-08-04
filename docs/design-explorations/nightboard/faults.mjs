/**
 * Fault-injection harness for the on-device generation path.
 *
 * There is no way to make a real Gemini Nano stall, get evicted, or return
 * prose on demand, so every failure mode is injected instead. Resilience that
 * has not been made to fail is a claim, not a property.
 *
 *   node docs/design-explorations/nightboard/faults.mjs [baseUrl]
 */
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://127.0.0.1:8902/";

/** Build a mock LanguageModel with a scripted personality. */
function mockScript(spec) {
  return `(() => {
    const spec = ${JSON.stringify(spec)};
    let attempt = 0;
    globalThis.LanguageModel = {
      async availability() { return spec.availability || "available"; },
      async create(opts) {
        if (spec.downloadEvents && opts && typeof opts.monitor === "function") {
          const listeners = [];
          opts.monitor({ addEventListener: (n, cb) => n === "downloadprogress" && listeners.push(cb) });
          for (const ev of spec.downloadEvents) {
            await new Promise((r) => setTimeout(r, ev.after || 0));
            listeners.forEach((cb) => cb({ loaded: ev.loaded }));
          }
        }
        if (spec.createDelay) await new Promise((r) => setTimeout(r, spec.createDelay));
        if (spec.createThrows) throw new Error(spec.createThrows);
        return {
          promptStreaming(_p, o) {
            attempt += 1;
            const mine = attempt;
            return (async function* () {
              if (spec.throwOnAttempt && spec.throwOnAttempt >= mine) {
                throw new Error(spec.throwMessage || "model is busy");
              }
              const chunks = spec.chunks || [];
              let acc = "";
              for (const c of chunks) {
                if (o && o.signal && o.signal.aborted) throw new DOMException("aborted", "AbortError");
                await new Promise((r) => setTimeout(r, spec.chunkDelay || 5));
                acc += c;
                yield spec.wholeTextEachChunk ? acc : c;
              }
              if (spec.hang) await new Promise(() => {});
            })();
          },
          destroy() {},
        };
      },
    };
  })();`;
}

const THEME_LANG =
  'root = Theme("Deep Blue", "#04122a", "#0a1e3d", "#cfe2ff", "#8fb2e0", "#5d7fae", "#1d3a63", ' +
  '"#4d9fff", "#02101f", "#ffd166", "#4dd6a0", "#ffb454", "#ff6b6b", "#7cc4ff")';

const CASES = [
  {
    name: "silent download reports progress anyway",
    spec: { availability: "downloadable", createDelay: 6000, chunks: [THEME_LANG] },
    check: async (page, log) => {
      await page.click("[data-gen-run]");
      await page.waitForTimeout(5200);
      const s = await page.textContent("[data-gen-status]");
      log(s);
      return /Waited \d+s|Fetching the on-device model/.test(s);
    },
  },
  {
    name: "download percentage normalises a 0-100 scale",
    spec: {
      availability: "downloadable",
      downloadEvents: [{ loaded: 25, after: 60 }, { loaded: 80, after: 60 }],
      createDelay: 300,
      chunks: [THEME_LANG],
    },
    check: async (page, log) => {
      await page.click("[data-gen-run]");
      await page.waitForTimeout(500);
      const seen = await page.evaluate(() => window.__pct || "");
      log(seen || "(captured via status)");
      return !/\d{3,}%/.test(await page.textContent("[data-gen-status]"));
    },
  },
  {
    name: "transient failure retries and then succeeds",
    spec: { throwOnAttempt: 1, throwMessage: "model is busy", chunks: [THEME_LANG] },
    check: async (page, log) => {
      await page.click("[data-gen-run]");
      await page.waitForTimeout(2500);
      const s = await page.textContent("[data-gen-status]");
      log(s.split("\n")[0]);
      return /Applied \d+ colours/.test(s);
    },
  },
  {
    name: "permanent failure reports what the model actually said",
    spec: { chunks: ["I'd be happy to help you with a blue theme!"] },
    check: async (page, log) => {
      await page.click("[data-gen-run]");
      await page.waitForTimeout(2500);
      const s = await page.textContent("[data-gen-status]");
      log(s.split("\n")[0]);
      return /no usable Theme/.test(s) && /happy to help/.test(s);
    },
  },
  {
    name: "a truncated stream still applies what arrived",
    spec: { chunks: ['root = Theme("Half", "#04122a", "#0a1e3d", "#cfe2ff"'] },
    check: async (page, log) => {
      await page.click("[data-gen-run]");
      await page.waitForTimeout(2000);
      const bg = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--nb-bg").trim());
      log("bg=" + bg);
      return bg === "#04122a";
    },
  },
  {
    name: "whole-text-per-chunk streams do not double",
    spec: { wholeTextEachChunk: true, chunks: THEME_LANG.match(/.{1,40}/g) },
    check: async (page, log) => {
      await page.click("[data-gen-run]");
      await page.waitForTimeout(2500);
      const src = await page.inputValue("[data-gen-ui-source]");
      log("len=" + src.length + " expected=" + THEME_LANG.length);
      return src.length === THEME_LANG.length;
    },
  },
  {
    name: "multi-chunk delta streaming applies the theme",
    spec: { chunkDelay: 8, chunks: THEME_LANG.match(/.{1,24}/g) },
    check: async (page, log) => {
      await page.click("[data-gen-run]");
      await page.waitForTimeout(2500);
      const bg = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--nb-bg").trim());
      const theme = await page.evaluate(() => document.body.dataset.theme);
      log("bg=" + bg + " theme=" + theme);
      return bg === "#04122a" && theme === "Deep Blue";
    },
  },
  {
    name: "cancel stops the stream",
    spec: { chunkDelay: 400, chunks: THEME_LANG.match(/.{1,10}/g), hang: true },
    check: async (page, log) => {
      await page.click("[data-gen-run]");
      await page.waitForTimeout(600);
      await page.click("[data-gen-cancel]");
      await page.waitForTimeout(400);
      const s = await page.textContent("[data-gen-status]");
      log(s);
      return /Cancelled/.test(s);
    },
  },
  {
    name: "an unavailable model falls back with instructions",
    spec: { availability: "unavailable" },
    check: async (page, log) => {
      await page.click("[data-gen-run]");
      await page.waitForTimeout(600);
      const s = await page.textContent("[data-gen-status]");
      log(s.split("\n")[0]);
      return /not available/.test(s) && /manual|by hand/i.test(s);
    },
  },
];

const browser = await chromium.launch();
let failed = 0;

for (const testCase of CASES) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(mockScript(testCase.spec));
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.click("[data-garden-open]");
  await page.fill("[data-gen-input]", "make everything blue");

  let detail = "";
  let ok = false;
  try {
    ok = await testCase.check(page, (d) => { detail = String(d).replace(/\s+/g, " ").slice(0, 96); });
  } catch (err) {
    detail = "threw: " + err.message.slice(0, 80);
  }
  if (errors.length) { ok = false; detail += " | pageerror: " + errors[0].slice(0, 60); }
  if (!ok) failed += 1;
  console.log((ok ? "  ok   " : "  FAIL ") + testCase.name + "\n         " + detail);
  await context.close();
}

await browser.close();
console.log(failed === 0 ? "\nall fault cases handled" : `\n${failed} fault case(s) unhandled`);
process.exit(failed === 0 ? 0 : 1);
