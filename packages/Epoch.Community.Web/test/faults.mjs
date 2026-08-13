/**
 * Fault-injection harness for the on-device generation path.
 *
 * There is no way to make a real Gemini Nano stall, get evicted, or return
 * prose on demand, so every failure mode is injected instead. Resilience that
 * has not been made to fail is a claim, not a property.
 *
 *   node packages/Epoch.Community.Web/test/faults.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { serveCommunityWebApp } from "../scripts/serve.mjs";

const own = process.argv[2] ? null : await serveCommunityWebApp();
const BASE = process.argv[2] || `${own.url}board.html`;

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
const TOOL_OK = JSON.stringify({ tool: "board_navigate", args: { path: "/projects/community/channels/bugs" } });
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
      await page.keyboard.type("cd ../bugs");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(400);
      const path = await page.textContent(".cn-ps1");
      log(s.replace(/\s+/g, " ").slice(0, 60) + " | then " + path);
      return /No on-device model/.test(s) && /channels\/bugs/.test(path);
    },
  },
  {
    // The live tick used to rebuild the whole DOM, which ate half-typed
    // commands, reset scroll, and restarted any animation — the board
    // "glitched" every nine seconds. The property that fixed it: a render is a
    // morph, so a node that did not change is the same node afterwards.
    name: "a live tick keeps the surface, the caret and the animation",
    spec: { availability: "unavailable" },
    check: async (page, log) => {
      const r = await page.evaluate(async () => {
        const item = document.querySelector(".cn-item");
        item.__tag = 1;
        const input = document.querySelector("[data-cli]");
        input.focus();
        input.value = "cd /chan";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        // A live post lands somewhere else; the board re-renders.
        window.CW_APP.state.merged.push(Object.assign({}, window.CW_DATA.incoming[0], {
          id: "live-901", at: "23:58", sig: "sig-tick",
        }));
        window.CW_APP.render(true);
        await new Promise((resolve) => setTimeout(resolve, 60));
        return {
          sameNode: document.querySelector(".cn-item").__tag === 1,
          value: input.value,
          focused: document.activeElement === input,
        };
      });
      log(JSON.stringify(r));
      return r.sameNode && r.value === "cd /chan" && r.focused;
    },
  },
  {
    // Arrival motion must actually run — and only for the node that arrived.
    name: "a new post animates in; the rest of the board does not",
    spec: { availability: "unavailable" },
    check: async (page, log) => {
      const r = await page.evaluate(async () => {
        window.CW_APP.navigate("/projects/community/channels/general", { keepCli: true });
        window.CW_APP.state.merged.push(Object.assign({}, window.CW_DATA.incoming[0], {
          id: "live-902", at: "23:59", channel: "general", sig: "sig-anim",
        }));
        window.CW_APP.render(true);
        await new Promise((resolve) => setTimeout(resolve, 50));
        const live = document.querySelector('[data-live="true"]');
        const names = live ? live.getAnimations({ subtree: true }).map((a) => a.animationName) : [];
        // Epoch brand chrome keeps idle sheen/scan animations; those are not
        // board-arrival motion. Count only non-brand animations.
        const total = document.getAnimations().filter((a) => {
          const t = a.effect && a.effect.target;
          return t && !t.closest(".nb-brand, .nb-brand-fig, .nb-brand-tag, .nb-brand-scan");
        }).length;
        return { names, total };
      });
      log(JSON.stringify(r));
      return r.names.includes("cn-arrive") && r.total <= 4;
    },
  },
  {
    // The canvas lens needs HTML-in-canvas, which this Chromium does not have.
    // The failure that matters is not "it did not draw" — it is a tool that
    // returns ok for an effect that silently did nothing, which is how an agent
    // ends up insisting the board changed when it did not.
    name: "an unsupported canvas lens fails instead of no-opping",
    spec: { availability: "unavailable" },
    check: async (page, log) => {
      const res = await page.evaluate(() => window.CW_MCP.call("fx_asciify", { on: true }));
      const intact = await page.evaluate(() => !!document.querySelector("[data-exp='console'] .cn-item"));
      log((res.content[0].text || "").slice(0, 70) + " | board intact: " + intact);
      return res.isError === true && /HTML-in-canvas|did not load/.test(res.content[0].text) && intact;
    },
  },
  {
    name: "a malformed canonical route fails with an unavailable state",
    spec: { availability: "unavailable" },
    check: async (page, log) => {
      const result = await page.evaluate(() => ({
        restored: window.CW_APP.restoreNavigation({ projectionId: "missing-view", objectId: "missing-object" }),
        status: document.querySelector("[data-status-line]")?.textContent || "",
      }));
      log(JSON.stringify(result));
      return result.restored === false && /unavailable/.test(result.status);
    },
  },
  {
    name: "a missing reply parent remains a tombstone ancestor",
    spec: { availability: "unavailable" },
    check: async (page, log) => {
      const result = await page.evaluate(() => {
        const child = { id: "fault-orphan", channel: "general", who: "lea", at: "12:31", state: "open", body: "orphan", re: "fault-missing" };
        const graph = window.CW_MAP.messageGraph(window.CW_DATA.posts.concat(child));
        return { parent: graph.parentOf(child.id), root: graph.rootOf(child.id) };
      });
      log(JSON.stringify(result));
      return result.parent?.objectId === "fault-missing" && result.parent?.kind === "tombstone" && result.root?.objectId === "fault-missing";
    },
  },
  {
    name: "an invalid query names the unknown field without evaluating it",
    spec: { availability: "unavailable" },
    check: async (page, log) => {
      const result = await page.evaluate(() => window.CW_QUERY.parse("sttae:needs-review"));
      log(JSON.stringify(result));
      return /sttae/.test(result.error || "") && /state/.test(result.error || "");
    },
  },
  {
    name: "an unauthorized private saved projection fails closed",
    spec: { availability: "unavailable" },
    check: async (page, log) => {
      const result = await page.evaluate(() => {
        const view = window.CW_SAVED_VIEWS.save({ label: "Private fault", query: "", visibility: "private" });
        return window.CW_SAVED_VIEWS.open(view.projectionId, window.CW_DATA.posts, { includePrivate: false });
      });
      log(JSON.stringify(result));
      return result.view === null && /unauthorized/.test(result.error || "");
    },
  },
  {
    name: "a malformed board migration preserves an actionable recovery state",
    spec: { availability: "unavailable" },
    check: async (page, log) => {
      const result = await page.evaluate(() => window.CW_SESSION.migrateBoardState(null));
      log(JSON.stringify(result));
      return result.recovery?.reason === "malformed" && /export|reset/.test(result.recovery?.message || "");
    },
  },
  {
    name: "ambiguous deterministic navigation does not change location",
    spec: { availability: "unavailable" },
    check: async (page, log) => {
      const result = await page.evaluate(async () => {
        const before = window.CW_APP.state.path;
        const response = await window.CW_MCP.call("board_navigate", { path: "gen" });
        return { before, after: window.CW_APP.state.path, isError: response.isError, text: response.content?.[0]?.text || "" };
      });
      log(JSON.stringify(result));
      return result.before === result.after && result.isError === true && /path|exact|not found/i.test(result.text);
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

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {},
);
let failed = 0;

for (const testCase of CASES) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(() => {
    try { localStorage.setItem("nb-keys-onboarded", "1"); } catch { /* fine */ }
  });
  await context.addInitScript(mockScript(testCase.spec));
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(250);
  await page.evaluate(() => window.CW_APP.goHome({ silent: true }));
  // Every case runs through AI mode, because that is where the faults live.
  // AI is the default now, so ensure rather than toggle — a blind click turned
  // it off and made six cases "fail" for the wrong reason.
  const aiOn = await page.evaluate(() => window.CW_APP.state.ai);
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
if (own) await own.close();
console.log(failed === 0 ? "\nall fault cases handled" : `\n${failed} fault case(s) unhandled`);
process.exit(failed === 0 ? 0 : 1);
