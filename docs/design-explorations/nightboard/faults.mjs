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
              const byAttempt = spec.chunksByAttempt;
              const chunks = byAttempt
                ? [byAttempt[Math.min(mine - 1, byAttempt.length - 1)]]
                : (spec.chunks || []);
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

// Tool names and shape come from the WebMCP registry now, so the fixtures use
// what the agent actually receives.
const TOOL_OK = JSON.stringify({ tool: "board_navigate", args: { path: "/channels/bugs" } });
const TOOL_BAD = JSON.stringify({ tool: "board_navigate", args: { path: "/nowhere/at/all" } });

const CASES = [
  {
    name: "silent model fetch keeps reporting",
    spec: { availability: "downloadable", createDelay: 6000, chunks: [TOOL_OK] },
    check: async (page, log) => {
      // Warming is gesture-gated at boot now, so its narration lands in the
      // status line; the point is still that silence is never the answer.
      const s = await page.textContent("[data-status-line]");
      log(s);
      return /fetch|Fetching|model/i.test(s);
    },
  },
  {
    name: "download percentage never exceeds 100",
    spec: {
      availability: "downloadable",
      downloadEvents: [{ loaded: 40, after: 50 }, { loaded: 95, after: 50 }],
      createDelay: 250, chunks: [TOOL_OK],
    },
    check: async (page, log) => {
      await ask(page, "go to bugs", 1200);
      const s = await transcript(page);
      log(s.slice(0, 90));
      return !/\d{3,}%/.test(s);
    },
  },
  {
    name: "transient failure retries then succeeds",
    spec: { throwOnAttempt: 1, throwMessage: "model is busy", chunks: [TOOL_OK] },
    check: async (page, log) => {
      await ask(page, "go to bugs", 3000);
      const path = await page.textContent(".cn-ps1");
      log(path);
      return /channels\/bugs/.test(path);
    },
  },
  {
    name: "a bad tool call is repaired, not rejected",
    spec: { chunksByAttempt: [TOOL_BAD, TOOL_OK] },
    check: async (page, log) => {
      await ask(page, "take me to the bug reports", 3200);
      const s = await transcript(page);
      const path = await page.textContent(".cn-ps1");
      log(path + " | " + s.replace(/\s+/g, " ").slice(0, 70));
      return /channels\/bugs/.test(path) && /failed/.test(s);
    },
  },
  {
    name: "prose instead of a tool call fails loudly",
    spec: { chunks: ["Sure! I can help you find the bug reports."] },
    check: async (page, log) => {
      await ask(page, "go to bugs", 3200);
      const s = await transcript(page);
      log(s.replace(/\s+/g, " ").slice(0, 80));
      return /error|did not return JSON/i.test(s);
    },
  },
  {
    name: "multi-chunk delta streaming still parses",
    spec: { chunkDelay: 6, chunks: TOOL_OK.match(/.{1,12}/g) },
    check: async (page, log) => {
      await ask(page, "go to bugs", 2600);
      const path = await page.textContent(".cn-ps1");
      log(path);
      return /channels\/bugs/.test(path);
    },
  },
  {
    name: "whole-text-per-chunk streams do not double",
    spec: { wholeTextEachChunk: true, chunks: TOOL_OK.match(/.{1,12}/g) },
    check: async (page, log) => {
      await ask(page, "go to bugs", 2600);
      const path = await page.textContent(".cn-ps1");
      log(path);
      return /channels\/bugs/.test(path);
    },
  },
  {
    name: "an unavailable model leaves CLI mode working",
    spec: { availability: "unavailable" },
    check: async (page, log) => {
      await ask(page, "go to bugs", 900);
      const s = await transcript(page);
      // The point is not the message; it is that the surface still works.
      await page.click("[data-mode-toggle]");
      await page.keyboard.type("cd bugs");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(400);
      const path = await page.textContent(".cn-ps1");
      log(s.replace(/\s+/g, " ").slice(0, 60) + " | then " + path);
      return /No on-device model/.test(s) && /channels\/bugs/.test(path);
    },
  },
];

async function ask(page, text, waitMs) {
  await page.keyboard.type(text);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(waitMs);
}

async function transcript(page) {
  return page.$eval(".cn-out", (el) => el.textContent).catch(() => "");
}

const browser = await chromium.launch();
let failed = 0;

for (const testCase of CASES) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(mockScript(testCase.spec));
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(250);
  // Every case runs through AI mode, because that is where the faults live.
  // AI is the default now, so ensure rather than toggle — a blind click turned
  // it off and made six cases "fail" for the wrong reason.
  const aiOn = await page.evaluate(() => window.NB_APP.state.ai);
  if (!aiOn) {
    await page.click("[data-mode-toggle]");
    await page.waitForTimeout(150);
  }
  // The warm-up may be gesture-gated; a keypress satisfies it.
  await page.keyboard.press("Shift");
  await page.waitForTimeout(200);

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
