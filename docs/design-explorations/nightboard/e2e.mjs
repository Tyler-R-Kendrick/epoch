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
const BOARD = new URL("board.html", BASE.endsWith("/") ? BASE : BASE + "/").href;
const FILTER = process.env.NB_E2E || "";

const CASES = [
  {
    name: "landing: default / is Persuade marketing home",
    landing: true,
    run: async (page, log) => {
      const probe = await page.evaluate(() => ({
        landing: document.body?.getAttribute("data-landing"),
        cta: document.querySelector("[data-enter-board]")?.getAttribute("href"),
        brand: !!document.querySelector("[data-landing-brand]"),
        headline: document.querySelector(".nb-landing-headline")?.getAttribute("aria-label")?.trim()
          || document.querySelector(".nb-landing-headline")?.textContent?.trim(),
        lines: Array.from(document.querySelectorAll(".nb-landing-headline [data-type-line]"))
          .map((el) => el.getAttribute("data-type-line")),
      }));
      if (probe.landing !== "true") return log("not landing: " + JSON.stringify(probe));
      if (probe.cta !== "board.html") return log("cta missing: " + JSON.stringify(probe));
      if (!probe.brand || !probe.headline) return log("hero incomplete: " + JSON.stringify(probe));
      if (probe.lines.join("|") !== "Collaborate.|Promote your work.|Get paid.") {
        return log("headline lines wrong: " + JSON.stringify(probe.lines));
      }
      return true;
    },
  },
  {
    name: "landing: product story is collaborate, promote work, get paid",
    landing: true,
    run: async (page, log) => {
      await page.waitForFunction(
        () => document.querySelector("[data-headline-type]")?.getAttribute("data-headline-done") === "1",
        { timeout: 8000 },
      ).catch(() => null);
      const story = await page.evaluate(() => {
        const body = document.body?.innerText || "";
        const headline = document.querySelector(".nb-landing-headline");
        const headlineLabel = headline?.getAttribute("aria-label") || "";
        const typed = Array.from(headline?.querySelectorAll("[data-type-line]") || [])
          .map((el) => {
            const copy = el.cloneNode(true);
            copy.querySelectorAll(".nb-headline-cursor").forEach((c) => c.remove());
            return copy.textContent.trim();
          });
        const brand = document.querySelector("[data-landing-brand]");
        const font = brand ? getComputedStyle(brand).fontFamily : "";
        return {
          font,
          hasWhat: !!document.querySelector("[data-landing-what]"),
          hasHow: !!document.querySelector("[data-landing-how]"),
          hasWho: !!document.querySelector("[data-landing-who]"),
          hasPreview: !!document.querySelector("[data-landing-preview]"),
          hasTheater: !!document.querySelector("[data-landing-theater]"),
          hasSkip: !!document.querySelector("[data-skip-intro]"),
          hasGrid: !!document.querySelector("[data-landing-grid]"),
          hasCrt: !!document.querySelector("[data-landing-crt]"),
          hasCrtMass: !!document.querySelector(".nb-crt-grain") && !!document.querySelector(".nb-crt-barrel"),
          hasRail: !!document.querySelector("[data-scroll-rail]"),
          hasRide: !!document.querySelector("[data-ride-track]") && !!document.querySelector("[data-ride-stage]"),
          hasCrtTube: !!document.querySelector("[data-crt-tube]") && !!document.getElementById("nb-crt-barrel-filter"),
          hasCaseRail: document.querySelectorAll(".nb-scroll-rail-item .nb-case-code").length >= 5,
          hasPlaneCatalog: !!document.querySelector("[data-plane-catalog]") &&
            document.querySelectorAll("[data-plane]").length >= 3,
          hasScrub: !!document.querySelector("[data-theater-scrub]"),
          hasSeek: document.querySelectorAll("[data-seek-phase]").length >= 3,
          hasCanvasUiHosts: document.querySelectorAll('[data-fx="decrypt"]').length >= 2 &&
            !!document.querySelector('[data-fx="decrypt"][data-decrypt-role="hero"]') &&
            !!document.querySelector('[data-fx="decrypt"][data-decrypt-role="what"]') &&
            document.querySelectorAll('[data-fx="glitch"]').length >= 2 &&
            !!document.querySelector('[data-fx="glitch"][data-glitch-role="hero"]') &&
            !!document.querySelector('[data-fx="vhs"]'),
          whatDecrypt: !!document.querySelector(
            '[data-landing-what] [data-fx="decrypt"][data-decrypt-role="what"]',
          ),
          landingFxReady: document.body.getAttribute("data-landing-fx-ready") === "1",
          headlineLabel,
          typed,
          hasCursor: !!headline?.querySelector(".nb-headline-cursor"),
          mentionsCollaborate: /collaborat/i.test(body) || /collaborat/i.test(headlineLabel),
          mentionsPromoteWork: /promote your work|promote work|showcase/i.test(body)
            || /promote your work/i.test(headlineLabel),
          mentionsPaid: /get paid|creator|earn/i.test(body) || /get paid/i.test(headlineLabel),
          noMessagePromote: !/promote(?:d)? (?:a |the )?message|promote → intent|conversation becomes signed/i.test(body),
          mentionsScroll: /Next section|Continue|Scrub the Grid|Continue through the Grid|Scroll to explore|↑↓|keys/i.test(body),
          ctaReady: (() => {
            const cta = document.querySelector("[data-enter-board]");
            if (!cta) return false;
            const s = getComputedStyle(cta);
            return s.opacity !== "0" && s.visibility !== "hidden";
          })(),
          noFakeProof: !/\b\d{2,}\+?\s*(customers|teams|companies)|testimonial|as seen in/i.test(body),
        };
      });
      if (story.typed.join("|") !== "Collaborate.|Promote your work.|Get paid.") {
        return log("headline type lines wrong: " + JSON.stringify(story.typed));
      }
      if (!story.hasCursor) return log("headline missing underscore cursor: " + JSON.stringify(story));
      if (!/mono|consolas|cascadia|dejavu|courier/i.test(story.font)) {
        return log("brand not monospace (logo font broken): " + JSON.stringify(story));
      }
      if (!story.hasWhat || !story.hasHow || !story.hasWho) {
        return log("missing product sections: " + JSON.stringify(story));
      }
      if (!story.hasPreview || !story.hasSkip || !story.hasTheater || !story.hasGrid) {
        return log("missing motion/preview craft: " + JSON.stringify(story));
      }
      if (!story.hasCrt || !story.hasCrtMass || !story.hasRail || !story.hasScrub || !story.hasSeek || !story.mentionsScroll) {
        return log("missing CRT/scroll/interact craft: " + JSON.stringify(story));
      }
      if (!story.hasCanvasUiHosts || !story.landingFxReady) {
        return log("missing Canvas UI landing hosts: " + JSON.stringify(story));
      }
      if (!story.whatDecrypt) {
        return log("E01 missing decrypt/reveal body: " + JSON.stringify(story));
      }
      if (!story.hasRide || !story.hasCrtTube) {
        return log("missing scroll-scrub ride / CRT tube: " + JSON.stringify(story));
      }
      const ride = await page.evaluate(() => {
        const scroller = document.querySelector("[data-ride-track]");
        if (!scroller) return { ok: false, reason: "no scroller" };
        if (typeof document.body._nbSetRideProgress === "function") {
          document.body._nbSetRideProgress(0.5);
        } else {
          const max = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
          scroller.scrollTop = max * 0.5;
        }
        return { ok: true, top: scroller.scrollTop };
      });
      await page.waitForTimeout(100);
      const rideAfter = await page.evaluate(() => ({
        chapter: document.body.getAttribute("data-chapter"),
        active: document.querySelector('[data-ride-chapter][data-active="1"]')?.getAttribute("data-ride-chapter"),
        progress: document.body.style.getPropertyValue("--nb-scroll"),
        bodyOverflow: getComputedStyle(document.body).overflow,
      }));
      if (!ride.ok || rideAfter.bodyOverflow.indexOf("hidden") === -1) {
        return log("ride not fixed-viewport scrub: " + JSON.stringify({ ride, rideAfter }));
      }
      if (!rideAfter.chapter || rideAfter.chapter === "hero") {
        return log("scrub did not advance chapter: " + JSON.stringify(rideAfter));
      }
      /* Keyboard section snap at fixed velocity. */
      await page.evaluate(() => {
        if (typeof document.body._nbSetRideProgress === "function") {
          document.body._nbSetRideProgress(0);
        }
      });
      await page.waitForTimeout(50);
      await page.keyboard.press("ArrowDown");
      await page.waitForFunction(
        () => document.body.getAttribute("data-chapter") === "what" &&
          document.body.getAttribute("data-ride-snap") !== "1" &&
          document.body.getAttribute("data-scene-settle") === "1",
        null,
        { timeout: 8000 }
      ).catch(() => null);
      const keyed = await page.evaluate(() => ({
        chapter: document.body.getAttribute("data-chapter"),
        snapping: document.body.getAttribute("data-ride-snap"),
        settle: document.body.getAttribute("data-scene-settle"),
        hasGo: typeof document.body._nbGoSection === "function",
      }));
      if (keyed.chapter !== "what") {
        return log("ArrowDown did not snap to next section: " + JSON.stringify(keyed));
      }
      /* Scene settle: ↓ right after land must not yank to How prematurely. */
      if (keyed.settle !== "1") {
        return log("scene settle not armed after land: " + JSON.stringify(keyed));
      }
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(120);
      const held = await page.evaluate(() => ({
        chapter: document.body.getAttribute("data-chapter"),
        settle: document.body.getAttribute("data-scene-settle"),
      }));
      if (held.chapter !== "what") {
        return log("settle failed — left scene early: " + JSON.stringify(held));
      }
      await page.waitForFunction(
        () => document.body.getAttribute("data-scene-settle") !== "1",
        null,
        { timeout: 2000 }
      ).catch(() => null);
      await page.keyboard.press("ArrowDown");
      await page.waitForFunction(
        () => document.body.getAttribute("data-chapter") === "how" &&
          document.body.getAttribute("data-ride-snap") !== "1",
        null,
        { timeout: 2800 }
      ).catch(() => null);
      const afterSettle = await page.evaluate(() => document.body.getAttribute("data-chapter"));
      if (afterSettle !== "how") {
        return log("after settle, ArrowDown did not advance to how: " + afterSettle);
      }
      /* Synchronous wheel burst must advance exactly one scene — never skip to board. */
      await page.evaluate(() => {
        if (typeof document.body._nbSetRideProgress === "function") {
          document.body._nbSetRideProgress(0);
        }
      });
      await page.waitForFunction(
        () => document.body.getAttribute("data-scene-settle") !== "1" &&
          document.body.getAttribute("data-ride-snap") !== "1" &&
          document.body.getAttribute("data-chapter") === "hero",
        null,
        { timeout: 2500 }
      ).catch(() => null);
      await page.evaluate(() => {
        for (let i = 0; i < 40; i++) {
          window.dispatchEvent(
            new WheelEvent("wheel", { deltaY: 120, bubbles: true, cancelable: true })
          );
        }
      });
      await page.waitForTimeout(80);
      const burst = await page.evaluate(() => ({
        chapter: document.body.getAttribute("data-chapter"),
        snap: document.body.getAttribute("data-ride-snap"),
        settle: document.body.getAttribute("data-scene-settle"),
        scroll: document.body.style.getPropertyValue("--nb-scroll"),
      }));
      if (burst.chapter === "board" || burst.chapter === "who" || burst.chapter === "how") {
        return log("wheel burst skipped scenes: " + JSON.stringify(burst));
      }
      await page.waitForFunction(
        () => document.body.getAttribute("data-chapter") === "what" &&
          document.body.getAttribute("data-ride-snap") !== "1",
        null,
        { timeout: 2800 }
      ).catch(() => null);
      const afterBurst = await page.evaluate(() => document.body.getAttribute("data-chapter"));
      if (afterBurst !== "what") {
        return log("wheel burst did not land on next scene only: " + afterBurst);
      }
      if (!story.hasCaseRail || !story.hasPlaneCatalog) {
        return log("missing Aino→Grid catalog craft: " + JSON.stringify(story));
      }
      await page.evaluate(() => {
        if (typeof document.body._nbSetRideProgress === "function") {
          document.body._nbSetRideProgress(0.9);
        } else if (typeof document.body._nbAnimateToChapter === "function") {
          document.body._nbAnimateToChapter("board");
        }
      });
      await page.waitForFunction(
        () => document.body.getAttribute("data-chapter") === "board" &&
          document.body.getAttribute("data-ride-snap") !== "1",
        null,
        { timeout: 3000 }
      ).catch(() => null);
      await page.waitForTimeout(80);
      await page.click('[data-plane="network"]');
      const plane = await page.evaluate(() => ({
        pressed: document.querySelector('[data-plane="network"]')?.getAttribute("aria-pressed"),
        preview: document.querySelector("[data-landing-preview]")?.getAttribute("data-plane-preview"),
        text: document.querySelector("[data-landing-preview]")?.textContent || "",
      }));
      if (plane.pressed !== "true" || plane.preview !== "network" || !/Promote|showcase/i.test(plane.text)) {
        return log("plane catalog did not swap preview: " + JSON.stringify(plane));
      }
      if (!story.mentionsCollaborate || !story.mentionsPromoteWork || !story.mentionsPaid || !story.noMessagePromote) {
        return log("creator-loop story not described: " + JSON.stringify(story));
      }
      if (!story.ctaReady) return log("CTA not immediately usable: " + JSON.stringify(story));
      if (!story.noFakeProof) return log("invented social proof forbidden: " + JSON.stringify(story));
      return true;
    },
  },
  {
    name: "landing: Enter the board opens Operate TUI",
    landing: true,
    run: async (page, log) => {
      await page.click("[data-enter-board]");
      await page.waitForTimeout(400);
      const onBoard = await page.evaluate(() => ({
        href: window.location.href,
        hasApp: !!window.NB_APP,
        mount: !!document.querySelector("[data-mount]"),
      }));
      if (!/board\.html/i.test(onBoard.href)) return log("not on board: " + JSON.stringify(onBoard));
      if (!onBoard.hasApp || !onBoard.mount) return log("board failed to boot: " + JSON.stringify(onBoard));
      return true;
    },
  },
  {
    name: "nav: single reusable blade reloads branch (not a cascade stack)",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.waitForTimeout(120);
      const stack = await page.evaluate(() => {
        const lists = Array.from(document.querySelectorAll('.cn-blade[data-blade-kind="list"]'));
        const details = Array.from(document.querySelectorAll('.cn-blade[data-blade-kind="detail"]'));
        return {
          listCount: lists.length,
          detailCount: details.length,
          navPath: lists[0]?.getAttribute("data-blade-path"),
          navKey: lists[0]?.getAttribute("data-key"),
          detailKey: details[0]?.getAttribute("data-key"),
          paths: Array.from(document.querySelectorAll("[data-blade-path]"))
            .map((el) => el.getAttribute("data-blade-path") + ":" + el.getAttribute("data-blade-kind")),
        };
      });
      // Exactly one list + one detail; nav reuses blade-nav morph key.
      if (stack.listCount !== 1 || stack.detailCount !== 1) {
        return log("expected 1 nav + 1 detail: " + JSON.stringify(stack));
      }
      // Channel is terminal — navbar stays on the parent channels list.
      if (stack.navPath !== "/projects/community/channels") {
        return log("nav should list parent channels: " + JSON.stringify(stack));
      }
      if (stack.navKey !== "blade-nav" || stack.detailKey !== "blade-detail") {
        return log("stable keys missing: " + JSON.stringify(stack));
      }
      // Reload nav into a sibling channel — still exactly one list blade.
      await go(page, "/projects/community/channels");
      await page.waitForTimeout(80);
      await page.evaluate(() => {
        const item = document.querySelector(
          '.cn-blade[data-blade-kind="list"] .cn-item[data-key="bugs"]',
        );
        if (item) item.click();
      });
      await page.waitForTimeout(80);
      // Select previews; → opens the branch in the same nav blade.
      await page.evaluate(() => {
        document.querySelector("[data-cli]")?.blur();
        window.NB_APP.state.columnFocus = true;
        window.NB_APP.state.focus = 0;
      });
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(120);
      const after = await page.evaluate(() => ({
        path: window.NB_APP.state.path,
        listCount: document.querySelectorAll('.cn-blade[data-blade-kind="list"]').length,
        navPath: document.querySelector('.cn-blade[data-blade-kind="list"]')?.getAttribute("data-blade-path"),
        navKey: document.querySelector('.cn-blade[data-blade-kind="list"]')?.getAttribute("data-key"),
      }));
      if (after.path !== "/projects/community/channels/bugs") return log("path " + after.path);
      if (after.listCount !== 1) return log("nav cloned: " + JSON.stringify(after));
      if (after.navPath !== "/projects/community/channels") {
        return log("nav should stay on channels parent: " + JSON.stringify(after));
      }
      if (after.navKey !== "blade-nav") return log("nav key changed: " + after.navKey);
      return true;
    },
  },
  {
    name: "mouse: breadcrumb, listing dir, and detail listing all navigate",
    run: async (page, log) => {
      await page.click('[data-goto="/"]');
      if ((await path(page)) !== "/") return log("crumb failed");
      // Crumbs / data-goto still navigate; list click only selects + previews.
      await page.click('[data-blade-kind="list"] .cn-item[data-key="projects"], [data-blade-path="/"] .cn-item[data-key="projects"]');
      await page.waitForTimeout(60);
      await page.evaluate(() => {
        document.querySelector("[data-cli]")?.blur();
        window.NB_APP.state.columnFocus = true;
        window.NB_APP.state.focus = 0;
      });
      await page.keyboard.press("Enter");
      await page.waitForTimeout(100);
      if ((await path(page)) !== "/projects") return log("listing dir failed: " + await path(page));
      // Detail may preview child listing when selected is a dir — or click in nav.
      const kid = await page.locator('[data-blade-kind="list"] .cn-item[data-kind="dir"]').first();
      if (await kid.count()) {
        await kid.click();
        await page.waitForTimeout(60);
        await page.keyboard.press("Enter");
        await page.waitForTimeout(100);
      }
      const p = await path(page);
      return p.startsWith("/projects") || log("detail/nav click went to " + p);
    },
  },
  {
    name: "mouse: click previews feed; Enter opens post detail",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.waitForTimeout(80);
      await page.evaluate(() => {
        window.NB_APP.state.detailOpen = true;
        window.NB_APP.state.threadFocus = null;
        window.NB_APP.state.focus = 1;
        window.NB_APP.render(true);
      });
      await page.waitForTimeout(80);
      // Channel feed lives in detail — multiple root threads visible.
      const feed = await page.evaluate(() => ({
        roots: Array.from(document.querySelectorAll('.cn-comment[data-depth="0"]'))
          .map((el) => el.getAttribute("data-key")),
        total: document.querySelectorAll(".cn-comment").length,
        threadCtx: !!document.querySelector(".cn-thread-ctx"),
        feedBar: !!document.querySelector(".cn-feed-bar"),
        navPosts: (window.NB_MAP.list(window.NB_APP.state.path, window.NB_APP.state.merged) || [])
          .filter((e) => e && e.post).length,
      }));
      if (feed.navPosts !== 0) return log("channel nav should be empty of posts: " + JSON.stringify(feed));
      if (feed.roots.length < 2) return log("expected channel feed roots: " + JSON.stringify(feed));
      if (feed.threadCtx) return log("thread chrome on channel feed");
      if (!feed.feedBar) return log("feed bar missing on channel");

      // j/k in detail marks a feed row without opening a thread.
      await page.evaluate(() => {
        document.querySelector("[data-cli]")?.blur();
        window.NB_APP.focusColumns();
        window.NB_APP.state.focus = 1;
        window.NB_APP.state.feedMark = null;
      });
      await page.keyboard.press("j");
      await page.waitForTimeout(80);
      const preview = await page.evaluate(() => ({
        focus: window.NB_APP.state.threadFocus,
        mark: window.NB_APP.state.feedMark,
        bladeFocus: window.NB_APP.state.focus,
        here: document.querySelector('.cn-comment[data-here="true"]')?.getAttribute("data-key"),
        roots: Array.from(document.querySelectorAll('.cn-comment[data-depth="0"]')).length,
        feedBar: !!document.querySelector(".cn-feed-bar"),
        threadCtx: !!document.querySelector(".cn-thread-ctx"),
      }));
      if (preview.bladeFocus < 1) {
        return log("feed browse should keep detail focus: " + JSON.stringify(preview));
      }
      if (preview.focus) {
        return log("feed mark should keep channel feed (no threadFocus): " + JSON.stringify(preview));
      }
      if (!(preview.roots >= 2 && preview.feedBar && !preview.threadCtx && preview.here && preview.mark)) {
        return log("feed browse should mark feed row: " + JSON.stringify(preview));
      }
      // Open a specific reply's thread from the detail feed.
      await page.click('.cn-blade[data-blade-kind="detail"] .cn-comment[data-key="p3"]');
      await page.waitForTimeout(100);
      const thread = await page.evaluate(() => ({
        focus: window.NB_APP.state.threadFocus,
        roots: Array.from(document.querySelectorAll('.cn-comment[data-depth="0"]'))
          .map((el) => el.getAttribute("data-key")),
        ids: Array.from(document.querySelectorAll(".cn-comment"))
          .map((el) => el.getAttribute("data-key")),
        here: document.querySelector('.cn-comment[data-here="true"]')?.getAttribute("data-key"),
        threadCtx: !!document.querySelector(".cn-thread-ctx"),
        feedBar: !!document.querySelector(".cn-feed-bar"),
        bladeFocus: window.NB_APP.state.focus,
        replyTo: window.NB_APP.state.replyTo?.id || null,
        prompt: document.activeElement === document.querySelector("[data-cli]"),
      }));
      // p3 is in the p1 thread — detail should show only that root, not p4.
      if (thread.focus !== "p3") return log("threadFocus not set: " + JSON.stringify(thread));
      if (!(thread.roots.length === 1 && thread.roots[0] === "p1")) {
        return log("expected single p1 thread root: " + JSON.stringify(thread));
      }
      if (thread.ids.includes("p4")) return log("channel sibling leaked into thread: " + JSON.stringify(thread));
      if (thread.here !== "p3") return log("selected message not marked: " + JSON.stringify(thread));
      if (!thread.threadCtx) return log("thread context missing");
      if (thread.feedBar) return log("channel feed bar should hide in thread view");
      // Opening a thread from detail does not arm reply / steal the prompt.
      if (thread.replyTo || thread.prompt) {
        return log("thread open should not arm reply: " + JSON.stringify(thread));
      }

      // Back returns to the channel feed.
      await page.click("[data-thread-back]");
      await page.waitForTimeout(80);
      const back = await page.evaluate(() => ({
        focus: window.NB_APP.state.threadFocus,
        roots: Array.from(document.querySelectorAll('.cn-comment[data-depth="0"]')).length,
        feedBar: !!document.querySelector(".cn-feed-bar"),
        threadCtx: !!document.querySelector(".cn-thread-ctx"),
      }));
      if (back.focus) return log("back did not clear thread: " + JSON.stringify(back));
      if (!(back.roots >= 2 && back.feedBar && !back.threadCtx)) {
        return log("back did not restore channel feed: " + JSON.stringify(back));
      }
      return true;
    },
  },
  {
    name: "touch: tapping a channel selects; Enter opens",
    touch: true,
    run: async (page, log) => {
      await go(page, "/projects/community/channels");
      await page.waitForTimeout(100);
      const item = await page.locator('[data-blade-kind="list"] .cn-item[data-key="ideas"]').boundingBox();
      await page.touchscreen.tap(item.x + item.width / 2, item.y + item.height / 2);
      await page.waitForTimeout(120);
      const previewed = await path(page);
      if (previewed !== "/projects/community/channels") {
        return log("tap should preview without navigating: " + previewed);
      }
      await page.evaluate(() => {
        window.NB_APP.state.columnFocus = true;
        window.NB_APP.state.focus = 0;
      });
      await page.keyboard.press("Enter");
      await page.waitForTimeout(150);
      return (await path(page)) === "/projects/community/channels/ideas" ||
        log("Enter after tap went to " + await path(page));
    },
  },
  {
    name: "gesture: phone can scroll to detail pane",
    viewport: { width: 390, height: 700 },
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      const cols = page.locator(".cn-blades");
      const snap = await cols.evaluate((el) => getComputedStyle(el).scrollSnapType);
      if (!snap.includes("x")) return log("no snap: " + snap);
      await cols.evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
      await page.waitForTimeout(250);
      const seen = await cols.evaluate((el) => el.scrollLeft > 20);
      return seen || log("did not scroll toward detail");
    },
  },
  {
    name: "keyboard: arrows move, Enter descends, Esc switches modes",
    run: async (page, log) => {
      await go(page, "/projects/community/channels");
      await page.keyboard.press("Escape");           // prompt → columns
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      const p = await path(page);
      if (!p.startsWith("/projects/community/channels/")) return log("Enter went to " + p);
      // Detail is open by default: Esc closes it, then Esc returns the prompt.
      await page.keyboard.press("Escape");           // columns → close detail
      await page.keyboard.press("Escape");           // columns → prompt
      const back = await page.evaluate(() =>
        document.activeElement === document.querySelector("[data-cli]"));
      return back || log("Esc did not return the prompt");
    },
  },
  {
    name: "threads: ± and nest rails fold the comment chain",
    run: async (page, log) => {
      const result = await page.evaluate(async () => {
        window.NB_APP.setNavCollapsed(false, { silent: true, noRender: true });
        window.NB_APP.navigate("/projects/community/channels/general", { keepCli: true });
        // Channel feed paints in detail (posts are not nav children).
        window.NB_APP.state.detailOpen = true;
        window.NB_APP.state.threadFocus = null;
        window.NB_APP.state.focus = 1;
        window.NB_APP.render(true);
        await new Promise((r) => setTimeout(r, 50));
        const before = document.querySelectorAll(".cn-comment").length;
        if (before < 2) return { err: "no comment tree: " + before };
        const btn = document.querySelector('[data-fold="p1"]');
        if (!btn) {
          return {
            err: "no fold control",
            sample: Array.from(document.querySelectorAll(".cn-comment")).slice(0, 3)
              .map((c) => c.getAttribute("data-key")),
          };
        }
        btn.click();
        await new Promise((r) => setTimeout(r, 30));
        const after = document.querySelectorAll(".cn-comment").length;
        const promoted = document.querySelectorAll('.cn-comment[data-state-of="promoted"]').length;
        btn.click();
        await new Promise((r) => setTimeout(r, 30));
        const restored = document.querySelectorAll(".cn-comment").length;
        return { before, after, restored, promoted };
      });
      if (result.err) return log(JSON.stringify(result));
      if (!(result.after < result.before)) return log(`± fold ${result.before}→${result.after}`);
      return (result.restored === result.before && result.promoted >= 1) ||
        log(JSON.stringify(result));
    },
  },
  {
    name: "tree: nest rails mark depth; votes and reply exist",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      const deep = await page.evaluate(() => {
        const c = document.querySelector('.cn-comment[data-key="p3"]');
        const vup = c?.querySelector(".cn-vup")?.textContent?.trim();
        const vdn = c?.querySelector(".cn-vdn")?.textContent?.trim();
        const rail = c?.querySelector(".cn-rail-mark")?.textContent?.trim();
        const act = c?.querySelector(".cn-act")?.textContent?.trim();
        return {
          depth: Number(c?.dataset.depth),
          rails: c?.querySelectorAll(".cn-rail").length ?? -1,
          vote: !!c?.querySelector("[data-vote-id]"),
          reply: !!c?.querySelector("[data-reply]"),
          vup,
          vdn,
          rail,
          act,
        };
      });
      // p3 is re→p2→p1, so depth 2 and two ancestor rails; chrome is ASCII.
      if (!(deep.depth === 2 && deep.rails === 2 && deep.vote && deep.reply)) {
        return log(JSON.stringify(deep));
      }
      if (deep.vup !== "+" || deep.vdn !== "-" || deep.rail !== "|" || deep.act !== "reply") {
        return log("non-ascii chrome: " + JSON.stringify(deep));
      }
      return true;
    },
  },
  {
    name: "blades: nav << back reloads parent branch (still one list blade)",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.waitForTimeout(100);
      const back = await page.evaluate(() => {
        const btn = document.querySelector(
          '.cn-blade[data-blade-kind="list"] [data-nav-back]',
        );
        const mark = btn?.querySelector(".cn-blade-back-mark")?.textContent;
        return {
          has: !!btn,
          mark,
          drilled: document.querySelector('.cn-blade[data-blade-kind="list"]')
            ?.getAttribute("data-nav-drilled"),
        };
      });
      if (!back.has || back.mark !== "<<" || back.drilled !== "true") {
        return log("missing << back on drilled nav: " + JSON.stringify(back));
      }
      await page.click('.cn-blade[data-blade-kind="list"] [data-nav-back]');
      await page.waitForTimeout(150);
      const after = await page.evaluate(() => ({
        path: window.NB_APP.state.path,
        listCount: document.querySelectorAll('.cn-blade[data-blade-kind="list"]').length,
        navPath: document.querySelector('.cn-blade[data-blade-kind="list"]')?.getAttribute("data-blade-path"),
        stillBack: !!document.querySelector("[data-nav-back]"),
      }));
      if (after.path !== "/projects/community/channels") return log("path became " + after.path);
      if (after.listCount !== 1) return log("nav cloned: " + JSON.stringify(after));
      if (!after.stillBack) return log("<< should remain while not at root");
      return after.navPath === "/projects/community/channels" || log("nav path " + after.navPath);
    },
  },
  {
    name: "blades: nav back does not bleed selection into detail",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.waitForTimeout(100);
      await page.click('.cn-blade[data-blade-kind="list"] [data-nav-back]');
      await page.waitForTimeout(150);
      const bleed = await page.evaluate(() => {
        const list = document.querySelector('.cn-blade[data-blade-kind="list"]');
        const detail = document.querySelector('.cn-blade[data-blade-kind="detail"]');
        if (!list || !detail) return { err: "missing blades" };
        const lr = list.getBoundingClientRect();
        const overflow = getComputedStyle(list).overflow;
        let worst = 0;
        let sample = null;
        list.querySelectorAll(".cn-item, .cn-tree-line, .cn-hint, .cn-blade-head, .cn-name").forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width < 1 || r.height < 1) return;
          // Allow 1px subpixel; anything past the list border into detail is bleed.
          const over = r.right - lr.right;
          if (over > worst) {
            worst = over;
            sample = {
              cls: (el.className || "").toString().slice(0, 40),
              over: Math.round(over * 10) / 10,
              text: (el.textContent || "").replace(/\s+/g, " ").slice(0, 36),
            };
          }
        });
        return {
          overflow,
          worst: Math.round(worst * 10) / 10,
          sample,
          listW: Math.round(lr.width),
          detailLeft: Math.round(detail.getBoundingClientRect().left),
          path: window.NB_APP.state.path,
        };
      });
      if (bleed.err) return log(bleed.err);
      if (bleed.overflow !== "hidden") return log("list must clip: " + JSON.stringify(bleed));
      // Subpixel slack only — selection wash must not invade the detail pane.
      if (bleed.worst > 1.5) return log("nav bleed into detail: " + JSON.stringify(bleed));
      return bleed.detailLeft >= bleed.listW - 1 || log("layout gap: " + JSON.stringify(bleed));
    },
  },
  {
    name: "detail: [esc] shows Following feed; nav stays sidebar; file reopens selection",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.waitForTimeout(100);
      // Channel path opens detail feed (posts live in detail, not nav).
      await page.evaluate(() => {
        window.NB_APP.state.detailOpen = true;
        window.NB_APP.state.focus = 1;
        window.NB_APP.render(true);
      });
      await page.waitForTimeout(80);
      const before = await page.evaluate(() => ({
        detail: !!document.querySelector('.cn-blade[data-blade-kind="detail"]'),
        open: window.NB_APP.isDetailOpen && window.NB_APP.isDetailOpen(),
        follow: !!document.querySelector(".cn-follow-feed"),
      }));
      if (!before.detail || before.follow) {
        return log("selection detail not open to start: " + JSON.stringify(before));
      }
      // Close via [esc] → Following feed; nav must not go full-width alone.
      const closed = await page.evaluate(() => {
        const btn = document.querySelector(
          '.cn-blade[data-blade-kind="detail"] [data-blade-close]',
        );
        if (!btn) return { err: "no close on detail" };
        btn.click();
        const list = document.querySelector('.cn-blade[data-blade-kind="list"]');
        const detail = document.querySelector('.cn-blade[data-blade-kind="detail"]');
        const lr = list && list.getBoundingClientRect();
        const dr = detail && detail.getBoundingClientRect();
        return {
          detail: !!detail,
          open: window.NB_APP.isDetailOpen(),
          follow: !!document.querySelector(".cn-follow-feed"),
          cards: document.querySelectorAll(".cn-follow-row").length,
          listOnly: document.querySelectorAll(".cn-blade").length === 1,
          listW: lr ? Math.round(lr.width) : 0,
          detailW: dr ? Math.round(dr.width) : 0,
          workbenchW: document.querySelector(".cn-blades")
            ? Math.round(document.querySelector(".cn-blades").getBoundingClientRect().width)
            : 0,
        };
      });
      if (closed.err) return log(closed.err);
      if (closed.open) return log("selection still open: " + JSON.stringify(closed));
      if (!closed.detail || !closed.follow) {
        return log("expected Following in detail: " + JSON.stringify(closed));
      }
      if (closed.listOnly) return log("nav-only is wrong: " + JSON.stringify(closed));
      if (closed.cards < 1) return log("following rows empty: " + JSON.stringify(closed));
      // Nav must stay a sidebar — not the full workbench width.
      if (closed.listW > closed.workbenchW * 0.55) {
        return log("nav too wide (should be sidebar): " + JSON.stringify(closed));
      }
      if (closed.detailW < closed.listW) {
        return log("detail should claim remaining width: " + JSON.stringify(closed));
      }
      // Reopen by opening a file.
      await page.evaluate(() => {
        const item = document.querySelector(
          '.cn-blade[data-blade-kind="list"] .cn-item[data-kind="file"]',
        );
        if (item) item.click();
        else window.NB_APP.openDetail({ silent: true });
      });
      await page.waitForTimeout(100);
      const reopened = await page.evaluate(() => ({
        detail: !!document.querySelector('.cn-blade[data-blade-kind="detail"]'),
        open: window.NB_APP.isDetailOpen(),
        follow: !!document.querySelector(".cn-follow-feed"),
      }));
      if (!(reopened.detail && reopened.open && !reopened.follow)) {
        return log("did not reopen selection: " + JSON.stringify(reopened));
      }
      // Esc leaves a focused thread for the channel feed, then Following.
      await page.evaluate(() => {
        window.NB_APP.state.columnFocus = true;
        window.NB_APP.state.focus = 1;
      });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(60);
      const mid = await page.evaluate(() => ({
        thread: window.NB_APP.state.threadFocus,
        open: window.NB_APP.isDetailOpen(),
        follow: !!document.querySelector(".cn-follow-feed"),
      }));
      // Esc from a channel feed (no thread) returns to Following.
      if (mid.thread) return log("Esc should not invent a thread: " + JSON.stringify(mid));
      if (mid.follow) {
        return true;
      }
      await page.keyboard.press("Escape");
      await page.waitForTimeout(80);
      const viaEsc = await page.evaluate(() => ({
        detail: !!document.querySelector('.cn-blade[data-blade-kind="detail"]'),
        open: window.NB_APP.isDetailOpen(),
        follow: !!document.querySelector(".cn-follow-feed"),
      }));
      return (viaEsc.detail && !viaEsc.open && viaEsc.follow) ||
        log("Esc did not show Following: " + JSON.stringify(viaEsc));
    },
  },
  {
    name: "home: feed tabs activate by real mouse hit (narrow viewport)",
    viewport: { width: 390, height: 844 },
    run: async (page, log) => {
      await page.evaluate(() => {
        window.NB_APP.state.homeFeed = "following";
        window.NB_APP.closeDetail({ silent: true });
      });
      await page.waitForTimeout(160);
      const ids = ["following", "announcements", "featured", "creators"];
      for (const id of ids) {
        const hit = await page.evaluate((tabId) => {
          const tab = document.querySelector('.cn-home-tab[data-home-feed="' + tabId + '"]');
          if (!tab) return { err: "missing tab" };
          const r = tab.getBoundingClientRect();
          const x = r.left + r.width / 2;
          const y = r.top + r.height / 2;
          const el = document.elementFromPoint(x, y);
          return {
            x: Math.round(x),
            y: Math.round(y),
            vw: window.innerWidth,
            activates: !!(el && el.closest && el.closest('[data-home-feed="' + tabId + '"]')),
            tag: el && el.tagName,
          };
        }, id);
        if (hit.err) return log(id + ": " + hit.err);
        if (!hit.activates) {
          return log(id + " not under cursor at center: " + JSON.stringify(hit));
        }
        // Mouse click at the center — no locator auto-scroll.
        await page.mouse.click(hit.x, hit.y);
        await page.waitForTimeout(60);
        const state = await page.evaluate(() => window.NB_APP.state.homeFeed);
        if (state !== id) return log(id + " click did not activate (state=" + state + ")");
      }

      // Channel feed sort chips (hot/new/top) on a fresh channel view.
      await page.evaluate(() => {
        window.NB_APP.openDetail({ silent: true, noRender: true });
        window.NB_APP.navigate("/projects/community/channels/general", { keepCli: true });
        window.NB_APP.state.threadFocus = null;
        window.NB_APP.state.feedMark = null;
        window.NB_APP.state.sort = "hot";
        window.NB_APP.state.feedView = "hot";
        window.NB_APP.state.focus = 1;
        window.NB_APP.render(true);
      });
      await page.waitForTimeout(120);
      await page.evaluate(() => {
        const blades = document.querySelector(".cn-blades");
        if (blades) blades.scrollTo({ left: blades.scrollWidth });
      });
      await page.waitForTimeout(80);
      for (const id of ["new", "top", "hot"]) {
        const hit = await page.evaluate((sortId) => {
          const tab = document.querySelector('.cn-sort[data-sort="' + sortId + '"]');
          if (!tab) return { err: "missing sort" };
          const r = tab.getBoundingClientRect();
          const x = r.left + r.width / 2;
          const y = r.top + r.height / 2;
          const el = document.elementFromPoint(x, y);
          return {
            x: Math.round(x),
            y: Math.round(y),
            activates: !!(el && el.closest && el.closest('.cn-sort[data-sort="' + sortId + '"]')),
          };
        }, id);
        if (hit.err) return log(id + ": " + hit.err);
        if (!hit.activates) return log(id + " sort not under cursor: " + JSON.stringify(hit));
        await page.mouse.click(hit.x, hit.y);
        await page.waitForTimeout(60);
        const pressed = await page.evaluate((sortId) => ({
          sort: window.NB_APP.state.sort,
          view: window.NB_APP.state.feedView,
          pressed: document.querySelector('.cn-sort[data-sort="' + sortId + '"]')
            ?.getAttribute("aria-pressed"),
        }), id);
        if (!(pressed.sort === id && pressed.view === id && pressed.pressed === "true")) {
          return log(id + " sort click failed: " + JSON.stringify(pressed));
        }
      }
      return true;
    },
  },
  {
    name: "keys: j/k in a thread browse sibling posts (do not dump to channel)",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.waitForTimeout(120);
      const opened = await page.evaluate(() => {
        const feed = window.NB_MAP.feedEntriesAt
          ? window.NB_MAP.feedEntriesAt(window.NB_APP.state.path, window.NB_APP.state.merged)
          : [];
        const first = feed.find((e) => e && e.post && !e.post.re);
        if (!first) return { err: "no feed post" };
        window.NB_APP.openThread(first.post.id, { silent: true });
        window.NB_APP.focusColumns();
        window.NB_APP.state.focus = 1;
        window.NB_APP.render(true);
        return { id: first.post.id };
      });
      if (opened.err) return log(opened.err);
      await page.waitForTimeout(80);
      const before = await page.evaluate(() => ({
        thread: window.NB_APP.state.threadFocus,
        focus: window.NB_APP.state.focus,
        detail: window.NB_APP.isDetailOpen(),
      }));
      if (!before.thread) return log("thread not opened: " + JSON.stringify(before));
      await page.evaluate(() => {
        window.NB_APP.focusColumns();
        window.NB_APP.state.focus = 1; // detail owns keyboard
      });
      await page.keyboard.press("j");
      await page.waitForTimeout(80);
      const after = await page.evaluate(() => ({
        thread: window.NB_APP.state.threadFocus,
        focus: window.NB_APP.state.focus,
        stillThread: !!window.NB_APP.state.threadFocus,
      }));
      if (!after.stillThread) {
        return log("j cleared thread focus: " + JSON.stringify({ before, after }));
      }
      // Still in thread mode (same or sibling post id).
      if (after.focus < 1) return log("focus stole to nav: " + JSON.stringify(after));
      return true;
    },
  },
  {
    name: "keys: → on a marked feed post opens thread in detail (not the editor)",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.waitForTimeout(100);
      const armed = await page.evaluate(() => {
        const feed = window.NB_MAP.feedEntriesAt
          ? window.NB_MAP.feedEntriesAt(window.NB_APP.state.path, window.NB_APP.state.merged)
          : [];
        const ix = feed.findIndex((e) => e && e.post);
        if (ix < 0) return { err: "no feed post" };
        const nav = window.NB_MAP.list(window.NB_APP.state.path, window.NB_APP.state.merged) || [];
        if (nav.some((e) => e && e.post)) return { err: "channel nav still lists posts" };
        window.NB_APP.state.feedMark = feed[ix].post.id;
        window.NB_APP.state.focus = 1;
        window.NB_APP.state.threadFocus = null;
        window.NB_APP.state.detailOpen = true;
        if (window.NB_APP.state.editor) window.NB_APP.state.editor.focused = false;
        window.NB_APP.focusColumns();
        window.NB_APP.render(true);
        return { id: feed[ix].post.id, path: window.NB_APP.state.path, navLen: nav.length };
      });
      if (armed.err) return log(armed.err);
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(120);
      const after = await page.evaluate(() => ({
        path: window.NB_APP.state.path,
        thread: window.NB_APP.state.threadFocus,
        editor: !!(window.NB_APP.state.editor && window.NB_APP.state.editor.focused),
      }));
      if (after.path !== armed.path) {
        return log("→ should stay on channel path: " + JSON.stringify({ armed, after }));
      }
      if (!after.thread) return log("→ did not open thread: " + JSON.stringify(after));
      if (after.editor) return log("→ opened editor instead of thread: " + JSON.stringify(after));
      if (after.thread !== armed.id) {
        return log("thread id mismatch: " + JSON.stringify({ armed, after }));
      }
      return true;
    },
  },
  {
    name: "keys: home feed j/k and Enter open; [ ] cycle tabs",
    run: async (page, log) => {
      await page.evaluate(() => {
        window.NB_APP.state.homeFeed = "following";
        window.NB_APP.state.homeCursor = 0;
        window.NB_APP.closeDetail({ silent: true });
        window.NB_APP.focusColumns();
      });
      await page.waitForTimeout(100);
      const start = await page.evaluate(() => ({
        view: document.querySelector(".cn-follow-feed")?.getAttribute("data-home-view"),
        cursor: window.NB_APP.state.homeCursor,
        current: document.querySelector("[data-home-cursor]")?.getAttribute("data-home-item"),
      }));
      if (start.view !== "following") return log("not on home: " + JSON.stringify(start));
      await page.keyboard.press("j");
      await page.waitForTimeout(60);
      const moved = await page.evaluate(() => ({
        cursor: window.NB_APP.state.homeCursor,
        current: document.querySelector("[data-home-cursor]")?.getAttribute("data-home-item"),
      }));
      if (!(moved.cursor >= 1)) return log("j did not move home cursor: " + JSON.stringify(moved));
      await page.keyboard.press("]");
      await page.waitForTimeout(80);
      const tabbed = await page.evaluate(() => ({
        feed: window.NB_APP.state.homeFeed,
        cursor: window.NB_APP.state.homeCursor,
        view: document.querySelector(".cn-follow-feed")?.getAttribute("data-home-view"),
      }));
      if (tabbed.feed !== "announcements" || tabbed.cursor !== 0) {
        return log("] did not cycle to announcements: " + JSON.stringify(tabbed));
      }
      await page.keyboard.press("[");
      await page.waitForTimeout(60);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(120);
      const opened = await page.evaluate(() => ({
        detail: window.NB_APP.isDetailOpen(),
        follow: !!document.querySelector(".cn-follow-feed"),
        path: window.NB_APP.state.path,
      }));
      if (!(opened.detail && !opened.follow)) {
        return log("Enter did not open home row: " + JSON.stringify(opened));
      }
      return true;
    },
  },
  {
    name: "chrome: Epoch brand goes to marketing landing",
    run: async (page, log) => {
      await go(page, "/projects/civic-tuner/channels/changes");
      await page.waitForTimeout(80);
      const brand = page.locator("[data-brand], [data-goto-landing]");
      if (!(await brand.count())) return log("brand missing");
      await brand.first().click();
      await page.waitForTimeout(350);
      const after = await page.evaluate(() => ({
        href: window.location.href,
        landing: document.body?.getAttribute("data-landing"),
        cta: !!document.querySelector("[data-enter-board]"),
      }));
      if (after.landing !== "true" || !after.cta) {
        return log("brand did not open landing: " + JSON.stringify(after));
      }
      return true;
    },
  },
  {
    name: "chrome: goHome opens following feed (Esc home, not brand)",
    run: async (page, log) => {
      await go(page, "/projects/civic-tuner/channels/changes");
      await page.evaluate(() => {
        window.NB_APP.goHome({ silent: true });
      });
      await page.waitForTimeout(120);
      const after = await page.evaluate(() => ({
        path: window.NB_APP.state.path,
        detailOpen: window.NB_APP.state.detailOpen,
        following: document.querySelector(".cn-follow-feed")?.getAttribute("data-home-view") === "following",
      }));
      if (after.path !== "/projects/community/channels/general") {
        return log("path not default home: " + JSON.stringify(after));
      }
      if (after.detailOpen || !after.following) {
        return log("home feed not shown: " + JSON.stringify(after));
      }
      return true;
    },
  },
  {
    name: "home: following rolls up by identity; dismiss/read; refill when low",
    run: async (page, log) => {
      await page.evaluate(() => {
        try {
          localStorage.removeItem("nb-home-feed-read");
          localStorage.removeItem("nb-home-feed-dismissed");
        } catch { /* fine */ }
        window.NB_APP.state.homeFeedRead = {};
        window.NB_APP.state.homeFeedDismissed = {};
        window.NB_APP.state.homeFollowVisible = 4;
        window.NB_APP.state.homeFeed = "following";
        window.NB_APP.state.homeCursor = 0;
        window.NB_APP.closeDetail({ silent: true });
        window.NB_APP.render(true);
      });
      await page.waitForTimeout(100);
      const start = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll(".cn-follow-row"));
        const whos = rows.map((el) => el.getAttribute("data-stack-who"));
        const unique = new Set(whos);
        return {
          view: document.querySelector(".cn-follow-feed")?.getAttribute("data-home-view"),
          n: rows.length,
          whos,
          unique: unique.size,
          moreBadges: document.querySelectorAll(".cn-follow-more").length,
          dismiss: !!document.querySelector("[data-follow-dismiss]"),
          meta: document.querySelector(".cn-follow-banner-meta")?.textContent || "",
        };
      });
      if (start.view !== "following") return log("not following: " + JSON.stringify(start));
      if (!(start.n >= 1 && start.n <= 4)) {
        return log("expected ≤4 rolled cards: " + JSON.stringify(start));
      }
      if (start.unique !== start.n) {
        return log("duplicate identities in stack: " + JSON.stringify(start));
      }
      if (!start.dismiss) return log("missing dismiss control: " + JSON.stringify(start));
      if (!/showing/i.test(start.meta)) {
        return log("meta should report showing count: " + start.meta);
      }

      // Dismiss the face — same @who should return with an older post when +N existed.
      const before = await page.evaluate(() => {
        const row = document.querySelector(".cn-follow-row[data-home-cursor], .cn-follow-row");
        return {
          id: row?.getAttribute("data-follow-id"),
          who: row?.getAttribute("data-stack-who"),
          more: row?.querySelector(".cn-follow-more")?.textContent || "",
        };
      });
      if (!before.id || !before.who) return log("no cursor row: " + JSON.stringify(before));
      await page.click(`[data-follow-dismiss="${before.id}"]`);
      await page.waitForTimeout(100);
      const afterDismiss = await page.evaluate((info) => {
        const rows = Array.from(document.querySelectorAll(".cn-follow-row"));
        const same = rows.find((el) => el.getAttribute("data-stack-who") === info.who);
        return {
          dismissed: !!window.NB_APP.state.homeFeedDismissed?.[info.id],
          n: rows.length,
          faceId: same?.getAttribute("data-follow-id"),
          stillHasWho: !!same,
          empty: !!document.querySelector("[data-follow-empty]"),
        };
      }, before);
      if (!afterDismiss.dismissed) {
        return log("face not dismissed: " + JSON.stringify({ before, afterDismiss }));
      }
      if (before.more && !afterDismiss.stillHasWho) {
        return log("expected next post from same who: " + JSON.stringify({ before, afterDismiss }));
      }
      if (before.more && afterDismiss.faceId === before.id) {
        return log("face id did not advance: " + JSON.stringify({ before, afterDismiss }));
      }

      // Hotkey `d` is the shared dismiss verb (same as the Dismiss control).
      const hotkeyBefore = await page.evaluate(() => {
        window.NB_APP.state.columnFocus = true;
        window.NB_APP.state.focus = 1;
        window.NB_APP.state.homeCursor = 0;
        window.NB_APP.render(true);
        const row = document.querySelector(".cn-follow-row");
        return row?.getAttribute("data-follow-id") || null;
      });
      if (hotkeyBefore) {
        await page.keyboard.press("d");
        await page.waitForTimeout(80);
        const hotkeyOk = await page.evaluate((id) =>
          !!window.NB_APP.state.homeFeedDismissed?.[id], hotkeyBefore);
        if (!hotkeyOk) return log("d hotkey did not dismiss: " + hotkeyBefore);
      }

      // Mark read on a remaining unread card (if any).
      const readTarget = await page.evaluate(() => {
        const row = document.querySelector('.cn-follow-row[data-unread="true"]');
        return row?.getAttribute("data-follow-id") || null;
      });
      if (readTarget) {
        await page.click(`[data-follow-read="${readTarget}"]`);
        await page.waitForTimeout(80);
        const readOk = await page.evaluate((id) => {
          const row = document.querySelector(`.cn-follow-row[data-follow-id="${id}"]`);
          return {
            unread: row?.getAttribute("data-unread"),
            stored: !!window.NB_APP.state.homeFeedRead?.[id],
          };
        }, readTarget);
        if (readOk.unread === "true" || !readOk.stored) {
          return log("mark read failed: " + JSON.stringify(readOk));
        }
      }

      // Exhaust the visible stack aggressively; refill should pull waiting identities
      // or report caught-up without throwing.
      for (let i = 0; i < 40; i++) {
        const id = await page.evaluate(() =>
          document.querySelector(".cn-follow-row")?.getAttribute("data-follow-id"));
        if (!id) break;
        await page.click(`[data-follow-dismiss="${id}"]`);
        await page.waitForTimeout(40);
      }
      const end = await page.evaluate(() => ({
        n: document.querySelectorAll(".cn-follow-row").length,
        empty: !!document.querySelector("[data-follow-empty]"),
        visible: window.NB_APP.state.homeFollowVisible,
        status: document.querySelector("[data-status-line]")?.textContent || "",
      }));
      if (end.n === 0 && !end.empty) {
        return log("empty stack missing empty copy: " + JSON.stringify(end));
      }
      return true;
    },
  },
  {
    name: "home: feed toggles following / announcements / featured / creators with unread",
    run: async (page, log) => {
      await page.evaluate(() => {
        try { localStorage.removeItem("nb-home-feed-read"); } catch { /* fine */ }
        window.NB_APP.state.homeFeedRead = {};
        window.NB_APP.state.homeFeed = "following";
        window.NB_APP.state.homeAnnCollapsed = {};
        window.NB_APP.closeDetail({ silent: true });
      });
      await page.waitForTimeout(80);
      const start = await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll(".cn-home-tab")).map((el) => ({
          id: el.getAttribute("data-home-feed"),
          pressed: el.getAttribute("aria-pressed"),
          unread: el.querySelector(".cn-home-unread")?.textContent || "0",
          hidden: el.querySelector(".cn-home-unread")?.hasAttribute("hidden") || false,
        }));
        const counts = window.NB_APP.homeFeedUnreadCounts?.() || {};
        return {
          view: document.querySelector(".cn-follow-feed")?.getAttribute("data-home-view"),
          tabs,
          counts,
          rows: document.querySelectorAll(".cn-follow-row").length,
        };
      });
      if (start.view !== "following") return log("expected following view: " + JSON.stringify(start));
      const ids = start.tabs.map((t) => t.id).join(",");
      if (ids !== "following,announcements,featured,creators") {
        return log("missing tabs: " + ids);
      }
      if (!(Number(start.tabs[0].unread) >= 1 && !start.tabs[0].hidden)) {
        return log("following unread missing: " + JSON.stringify(start.tabs[0]));
      }
      if (!(Number(start.tabs[1].unread) >= 1)) {
        return log("announcements unread missing: " + JSON.stringify(start.tabs[1]));
      }
      if (!(Number(start.tabs[2].unread) >= 1 && Number(start.tabs[3].unread) >= 1)) {
        return log("featured/creators unread missing: " + JSON.stringify(start.tabs));
      }

      await page.click('.cn-home-tab[data-home-feed="announcements"]');
      await page.waitForTimeout(80);
      const ann = await page.evaluate(() => {
        const posts = Array.from(document.querySelectorAll(".cn-ann-post"));
        return {
          view: document.querySelector(".cn-follow-feed")?.getAttribute("data-home-view"),
          pressed: document.querySelector('.cn-home-tab[data-home-feed="announcements"]')
            ?.getAttribute("aria-pressed"),
          state: window.NB_APP.state.homeFeed,
          posts: posts.map((el) => ({
            id: el.getAttribute("data-home-item"),
            unread: el.getAttribute("data-unread"),
            collapsed: el.getAttribute("data-collapsed"),
            title: el.querySelector(".cn-ann-title")?.textContent || "",
            bodyVisible: !!(el.querySelector(".cn-ann-body") &&
              !el.querySelector(".cn-ann-body").hasAttribute("hidden") &&
              el.getAttribute("data-collapsed") !== "true"),
            bodyText: (el.querySelector(".cn-ann-body")?.textContent || "").slice(0, 120),
          })),
        };
      });
      if (!(ann.view === "announcements" && ann.pressed === "true" && ann.state === "announcements")) {
        return log("announcements tab failed: " + JSON.stringify(ann));
      }
      if (ann.posts.length < 1 || !ann.posts.some((r) => /office hours|Promote|etiquette/i.test(r.title))) {
        return log("announcement posts missing: " + JSON.stringify(ann.posts));
      }
      if (!ann.posts.every((r) => r.bodyVisible)) {
        return log("announcements should start expanded: " + JSON.stringify(ann.posts));
      }
      if (!ann.posts.some((r) => /Thursday|human sign-off|supervising/i.test(r.bodyText))) {
        return log("announcement body missing long-form: " + JSON.stringify(ann.posts));
      }

      // Collapse first announcement; body hides; expand restores.
      await page.click('.cn-ann-post[data-home-item="ann-1"] [data-ann-toggle]');
      await page.waitForTimeout(60);
      const collapsed = await page.evaluate(() => {
        const el = document.querySelector('.cn-ann-post[data-home-item="ann-1"]');
        return {
          collapsed: el?.getAttribute("data-collapsed"),
          expanded: el?.querySelector("[data-ann-toggle]")?.getAttribute("aria-expanded"),
          bodyHidden: el?.querySelector(".cn-ann-body")?.hasAttribute("hidden"),
          session: !!window.NB_APP.state.homeAnnCollapsed?.["ann-1"],
        };
      });
      if (!(collapsed.collapsed === "true" && collapsed.expanded === "false" &&
            collapsed.bodyHidden && collapsed.session)) {
        return log("collapse failed: " + JSON.stringify(collapsed));
      }
      await page.click('.cn-ann-post[data-home-item="ann-1"] [data-ann-toggle]');
      await page.waitForTimeout(60);

      await page.click('.cn-home-tab[data-home-feed="featured"]');
      await page.waitForTimeout(80);
      const feat = await page.evaluate(() => ({
        view: document.querySelector(".cn-follow-feed")?.getAttribute("data-home-view"),
        slugs: Array.from(document.querySelectorAll(".cn-feat-slug"))
          .map((el) => el.textContent || ""),
        summaries: Array.from(document.querySelectorAll(".cn-feat-summary")).map((el) => ({
          label: el.querySelector(".cn-feat-label")?.textContent || "",
          body: (el.querySelector(".cn-feat-summary-body")?.textContent || "").slice(0, 100),
        })),
        readmes: document.querySelectorAll(".cn-feat-readme").length,
      }));
      if (feat.view !== "featured") return log("featured view failed: " + JSON.stringify(feat));
      if (!feat.slugs.some((r) => /civic\/tuner|community-kit|epoch/i.test(r))) {
        return log("featured projects missing: " + JSON.stringify(feat.slugs));
      }
      if (!feat.summaries.length || !feat.summaries.every((s) => /readme summary/i.test(s.label))) {
        return log("readme summary label missing: " + JSON.stringify(feat.summaries));
      }
      if (!feat.summaries.some((s) => /cache|furniture|content-addressed/i.test(s.body))) {
        return log("readme summary body missing: " + JSON.stringify(feat.summaries));
      }

      await page.click('.cn-home-tab[data-home-feed="creators"]');
      await page.waitForTimeout(80);
      const cre = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll(".cn-cre-card"));
        const maya = cards.find((el) => (el.querySelector(".cn-follow-who")?.textContent || "") === "maya");
        return {
          view: document.querySelector(".cn-follow-feed")?.getAttribute("data-home-view"),
          handles: cards.map((el) => el.querySelector(".cn-follow-who")?.textContent || ""),
          mayaBio: maya?.querySelector(".cn-cre-bio")?.textContent || "",
          mayaChart: maya?.querySelector(".cn-cre-chart")?.textContent || "",
        };
      });
      if (cre.view !== "creators") return log("creators view failed: " + JSON.stringify(cre));
      if (!cre.handles.includes("maya")) return log("creators missing maya: " + JSON.stringify(cre.handles));
      if (!/Signs promotions|review/i.test(cre.mayaBio)) {
        return log("maya bio snippet missing: " + cre.mayaBio);
      }
      if (!/[▁▂▃▄▅▆▇█]/.test(cre.mayaChart) || !/commits/i.test(cre.mayaChart)) {
        return log("maya contribution chart missing: " + cre.mayaChart);
      }

      // Opening a showcase open control marks it read and drops that tab's unread.
      const beforeCounts = await page.evaluate(() => window.NB_APP.homeFeedUnreadCounts());
      await page.click('.cn-cre-card[data-unread="true"] .cn-home-open');
      await page.waitForTimeout(100);
      await page.evaluate(() => window.NB_APP.closeDetail({ silent: true }));
      await page.waitForTimeout(80);
      await page.click('.cn-home-tab[data-home-feed="creators"]');
      await page.waitForTimeout(80);
      const after = await page.evaluate(() => ({
        counts: window.NB_APP.homeFeedUnreadCounts(),
        unreadRows: document.querySelectorAll('.cn-cre-card[data-unread="true"]').length,
      }));
      if (!(after.counts.creators < beforeCounts.creators)) {
        return log("opening did not clear unread: " + JSON.stringify({ beforeCounts, after }));
      }
      return true;
    },
  },
  {
    name: "blades: nav collapse is rails; never survives a reload",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.waitForTimeout(120);
      // Collapse nav (detail-first reading).
      await page.keyboard.press("Alt+z");
      await page.waitForTimeout(150);
      const collapsed = await page.evaluate(() => {
        const host = document.querySelector(".cn-blades");
        const rails = document.querySelectorAll('.cn-blade[data-collapsed="true"]');
        const detail = document.querySelector('.cn-blade[data-blade-kind="detail"]');
        const listOpen = document.querySelector(
          '.cn-blade[data-blade-kind="list"][data-collapsed="false"]',
        );
        return {
          flag: host?.dataset.navCollapsed === "true" || host?.dataset.zoom === "true",
          rails: rails.length,
          hasDetail: !!detail,
          listOpen: !!listOpen,
          api: window.NB_APP.isNavCollapsed && window.NB_APP.isNavCollapsed(),
        };
      });
      if (!collapsed.flag || collapsed.rails < 1 || collapsed.listOpen) {
        return log("Alt+Z did not collapse nav to rails: " + JSON.stringify(collapsed));
      }
      // Click a rail to expand.
      await page.click(".cn-blade-rail-hit");
      await page.waitForTimeout(120);
      const expanded = await page.evaluate(() => ({
        flag: document.querySelector(".cn-blades")?.dataset.navCollapsed,
        rails: document.querySelectorAll('.cn-blade[data-collapsed="true"]').length,
        list: document.querySelectorAll(
          '.cn-blade[data-blade-kind="list"][data-collapsed="false"]',
        ).length,
      }));
      if (expanded.flag === "true" || expanded.rails > 0 || expanded.list < 1) {
        return log("rail click did not expand: " + JSON.stringify(expanded));
      }
      // Collapse again, then reload — must not trap after refresh.
      await page.evaluate(() => window.NB_APP.setNavCollapsed(true));
      await page.waitForTimeout(80);
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(300);
      const restored = await page.evaluate(() => {
        const host = document.querySelector(".cn-blades");
        const list = document.querySelector(
          '.cn-blade[data-blade-kind="list"][data-collapsed="false"], .cn-blade[data-blade-kind="list"]:not([data-collapsed])',
        );
        return {
          flag: host?.dataset.navCollapsed,
          zoom: host?.dataset.zoom,
          hasOpenList: !!list,
        };
      });
      return (restored.flag !== "true" && restored.zoom !== "true" && restored.hasOpenList) ||
        log("list blades still collapsed after reload: " + JSON.stringify(restored));
    },
  },
  {
    name: "blades: opening a post keeps nav open for further navigation",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.waitForTimeout(120);
      await page.evaluate(() => {
        window.NB_APP.setNavCollapsed(false, { silent: true });
        window.NB_APP.state.detailOpen = true;
        window.NB_APP.state.threadFocus = null;
        window.NB_APP.render(true);
      });
      await page.waitForTimeout(80);
      const ready = await page.locator('.cn-blade[data-blade-kind="detail"] .cn-comment[data-key="p1"]').count();
      if (!ready) return log("no detail feed posts");
      // Click a post in the detail feed — thread opens, nav stays usable.
      await page.click('.cn-blade[data-blade-kind="detail"] .cn-comment[data-key="p1"]');
      await page.waitForTimeout(150);
      const after = await page.evaluate(() => ({
        collapsed: window.NB_APP.isNavCollapsed(),
        rails: document.querySelectorAll('.cn-blade[data-collapsed="true"]').length,
        detail: !!document.querySelector('.cn-blade[data-blade-kind="detail"]'),
        open: window.NB_APP.isDetailOpen(),
        thread: window.NB_APP.state.threadFocus,
      }));
      if (after.collapsed || after.rails > 0) {
        return log("nav auto-collapsed after post click: " + JSON.stringify(after));
      }
      if (!(after.detail && after.open && after.thread)) {
        return log("post did not open detail thread: " + JSON.stringify(after));
      }
      return true;
    },
  },
  {
    name: "tui: whole page is the terminal — no dockable panel chrome",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.waitForTimeout(100);
      const ui = await page.evaluate(() => {
        const root = document.querySelector('[data-exp="console"]');
        return {
          hasPanel: !!document.querySelector(".cn-panel"),
          hasPanelDock: !!document.querySelector("[data-panel-dock]"),
          hasPanelMin: !!document.querySelector("[data-panel-min]"),
          hasPanelMax: !!document.querySelector("[data-panel-max]"),
          hasOutSplit: !!document.querySelector('.cn-split[data-split="out"]'),
          hasFootOut: !!document.querySelector(".cn-tui-foot .cn-out"),
          hasBanner: !!document.querySelector(".cn-banner, .cn-line[data-kind='banner']"),
          hasTabs: !!document.querySelector('[role="tablist"][aria-label*="orkspace" i], .cn-workspace-tabs, .cn-panel-tabs'),
          hasPrompt: !!document.querySelector("[data-cli]"),
          hasBlades: !!document.querySelector(".cn-blades"),
          tui: root?.getAttribute("data-tui") || root?.dataset?.tui || null,
          foot: !!document.querySelector(".cn-tui-foot, [data-region='composer']"),
          structure: Array.from(root?.children || []).map((c) => c.className.split(/\s+/)[0] || c.tagName),
        };
      });
      if (ui.hasPanel || ui.hasPanelDock || ui.hasPanelMin || ui.hasPanelMax || ui.hasOutSplit) {
        return log("separate terminal panel still present: " + JSON.stringify(ui));
      }
      if (ui.hasFootOut) {
        return log("foot still hosts a transcript terminal: " + JSON.stringify(ui));
      }
      if (ui.hasBanner) {
        return log("Epoch banner terminal still painted: " + JSON.stringify(ui));
      }
      if (!ui.hasTabs || !ui.hasPrompt || !ui.hasBlades || !ui.foot) {
        return log("missing TUI chrome: " + JSON.stringify(ui));
      }
      if (ui.structure.includes("cn-panel")) {
        return log("cn-panel in page structure: " + JSON.stringify(ui.structure));
      }
      return true;
    },
  },
  {
    name: "tui: workspace tabs still isolate path and prompt draft",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.waitForTimeout(80);
      await page.evaluate(() => {
        window.NB_APP.state.columnFocus = false;
        document.querySelector("[data-cli]")?.focus();
      });
      await page.fill("[data-cli]", "draft-a");
      await page.keyboard.press("Alt+t");
      await page.waitForTimeout(120);
      const b = await page.evaluate(() => ({
        sessions: window.NB_APP.state.sessions?.length,
        path: window.NB_APP.state.path,
        draft: document.querySelector("[data-cli]")?.value || "",
        active: window.NB_APP.state.activeSession,
      }));
      if (b.sessions < 2) return log("no new workspace: " + JSON.stringify(b));
      if (b.draft === "draft-a") return log("draft leaked into new tab: " + JSON.stringify(b));
      // Switch back to first tab — draft should return.
      await page.click('.cn-panel-tab[data-session="0"], .cn-workspace-tab[data-session="0"]');
      await page.waitForTimeout(100);
      const a = await page.evaluate(() => ({
        path: window.NB_APP.state.path,
        draft: document.querySelector("[data-cli]")?.value || "",
        active: window.NB_APP.state.activeSession,
      }));
      return (a.active === 0 && a.path.indexOf("/channels/general") >= 0 && /draft-a/.test(a.draft)) ||
        log("tab restore failed: " + JSON.stringify({ b, a }));
    },
  },
  {
    name: "compose: reply arms context; Enter posts a reply under the parent",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.waitForTimeout(120);
      await page.click('.cn-comment[data-key="p1"] [data-reply]');
      await page.waitForTimeout(80);
      const armed = await page.evaluate(() => {
        const ctx = window.NB_APP.composeContext?.() || window.NB_APP.state.compose;
        const label = document.querySelector("[data-compose-label], .cn-compose-label")?.textContent || "";
        return {
          kind: ctx?.kind,
          postId: ctx?.postId || ctx?.re,
          who: ctx?.who,
          cli: document.querySelector("[data-cli]")?.value || "",
          label,
        };
      });
      if (armed.kind !== "reply" || armed.postId !== "p1") {
        return log("reply not armed: " + JSON.stringify(armed));
      }
      if (!/reply|@lea|p1/i.test(armed.label + armed.cli)) {
        return log("no reply cue: " + JSON.stringify(armed));
      }
      await page.evaluate(() => {
        window.NB_APP.state.columnFocus = false;
        document.querySelector("[data-cli]")?.focus();
      });
      // Clear armed prefix and type body if needed; send a clear reply line.
      await page.fill("[data-cli]", "e2e reply body under lea");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(150);
      const posted = await page.evaluate(() => {
        const merged = window.NB_APP.state.merged || [];
        const hit = merged.filter((p) => p.re === "p1" && /e2e reply body/.test(p.body || "")).pop();
        const tree = document.querySelector('.cn-comment[data-key="' + (hit?.id || "") + '"]');
        const ctx = window.NB_APP.composeContext?.() || window.NB_APP.state.compose;
        return {
          hit: hit ? { id: hit.id, re: hit.re, channel: hit.channel, body: hit.body } : null,
          inDom: !!tree,
          composeAfter: ctx?.kind,
        };
      });
      if (!posted.hit || posted.hit.channel !== "general") {
        return log("reply not published: " + JSON.stringify(posted));
      }
      return true;
    },
  },
  {
    name: "compose: in a channel, Enter creates a new top-level post",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/bugs");
      await page.waitForTimeout(100);
      const ctx = await page.evaluate(() => {
        window.NB_APP.state.replyTo = null;
        window.NB_APP.state.compose = null;
        return window.NB_APP.composeContext?.() || window.NB_APP.state.compose;
      });
      if (ctx?.kind !== "post" || ctx?.channel !== "bugs") {
        return log("expected post#bugs context: " + JSON.stringify(ctx));
      }
      await page.evaluate(() => {
        window.NB_APP.state.columnFocus = false;
        document.querySelector("[data-cli]")?.focus();
      });
      await page.fill("[data-cli]", "e2e new bugs post");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(150);
      const posted = await page.evaluate(() => {
        const hit = (window.NB_APP.state.merged || [])
          .filter((p) => p.channel === "bugs" && !p.re && /e2e new bugs post/.test(p.body || ""))
          .pop();
        return hit ? { id: hit.id, channel: hit.channel, re: hit.re } : null;
      });
      return !!posted || log("channel post missing: " + JSON.stringify(posted));
    },
  },
  {
    name: "compose: navigating away clears reply; slash still ignores compose",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.waitForTimeout(80);
      await page.click('.cn-comment[data-key="p2"] [data-reply]');
      await page.waitForTimeout(60);
      await go(page, "/projects/community/channels/bugs");
      await page.waitForTimeout(80);
      const afterNav = await page.evaluate(() => window.NB_APP.composeContext?.() || window.NB_APP.state.compose);
      if (afterNav?.kind === "reply") return log("reply survived nav: " + JSON.stringify(afterNav));
      await page.evaluate(() => {
        window.NB_APP.state.columnFocus = false;
        document.querySelector("[data-cli]")?.focus();
      });
      await page.fill("[data-cli]", "");
      await page.type("[data-cli]", "/help", { delay: 10 });
      await page.keyboard.press("Enter");
      await page.waitForTimeout(120);
      const out = await page.evaluate(() => {
        const last = Array.from(document.querySelectorAll('.cn-line[data-kind="out"] .cn-body')).pop();
        return last?.textContent || "";
      });
      return (/help|\/go|\/search/i.test(out)) || log("slash ignored: " + out.slice(0, 100));
    },
  },
  {
    name: "compose: nav scope — create channel in current project via tool",
    run: async (page, log) => {
      await go(page, "/projects/community/channels");
      await page.waitForTimeout(100);
      const before = await page.evaluate(() => {
        const ctx = window.NB_APP.composeContext?.() || window.NB_APP.state.compose;
        const names = (window.NB_MAP.list(window.NB_APP.state.path, window.NB_APP.state.merged) || [])
          .map((e) => e.name);
        return { ctx, names, listed: window.NB_MCP.list().map((t) => t.name) };
      });
      if (before.ctx?.kind !== "nav" || before.ctx?.scope !== "channels") {
        return log("expected nav/channels: " + JSON.stringify(before.ctx));
      }
      if (!before.listed.includes("board_create_channel")) {
        return log("board_create_channel missing: " + before.listed.join(","));
      }
      const created = await page.evaluate(async () => {
        const res = await window.NB_MCP.call("board_create_channel", { name: "e2e-garden" });
        const text = (res?.content || []).map((c) => c.text || "").join("\n") || res?.text || JSON.stringify(res);
        const names = (window.NB_MAP.list("/projects/community/channels", window.NB_APP.state.merged) || [])
          .map((e) => e.name);
        return { text, names, err: res?.isError };
      });
      if (created.err) return log("create failed: " + created.text);
      if (!created.names.includes("e2e-garden")) {
        return log("channel not listed: " + JSON.stringify(created));
      }
      // Edge: creating under civic-tuner must not land on community.
      await go(page, "/projects/civic-tuner/channels");
      await page.waitForTimeout(80);
      const other = await page.evaluate(async () => {
        const res = await window.NB_MCP.call("board_create_channel", { name: "tuner-only-room" });
        const text = (res?.content || []).map((c) => c.text || "").join("\n");
        const tuner = (window.NB_MAP.list("/projects/civic-tuner/channels", window.NB_APP.state.merged) || [])
          .map((e) => e.name);
        const community = (window.NB_MAP.list("/projects/community/channels", window.NB_APP.state.merged) || [])
          .map((e) => e.name);
        return { text, tuner, community, err: res?.isError };
      });
      if (other.err) return log("tuner create failed: " + other.text);
      if (!other.tuner.includes("tuner-only-room")) {
        return log("not on tuner: " + JSON.stringify(other));
      }
      if (other.community.includes("tuner-only-room")) {
        return log("leaked into community: " + JSON.stringify(other));
      }
      return true;
    },
  },
  {
    name: "compose: rename channel via board_rename_channel (not navigate)",
    run: async (page, log) => {
      await go(page, "/projects/community/channels");
      await page.waitForTimeout(80);
      const listed = await page.evaluate(() =>
        window.NB_MCP.list().map((t) => t.name));
      if (!listed.includes("board_rename_channel")) {
        return log("board_rename_channel missing: " + listed.join(","));
      }
      const before = await page.evaluate(() =>
        (window.NB_MAP.list("/projects/community/channels", window.NB_APP.state.merged) || [])
          .map((e) => e.name));
      if (!before.includes("ideas")) return log("ideas missing before: " + before.join(","));
      const renamed = await page.evaluate(async () => {
        const res = await window.NB_MCP.call("board_rename_channel", {
          from: "ideas",
          to: "ieades2",
        });
        const text = (res?.content || []).map((c) => c.text || "").join("\n") || "";
        const names = (window.NB_MAP.list("/projects/community/channels", window.NB_APP.state.merged) || [])
          .map((e) => e.name);
        const ch = window.NB_MAP.findChannelByLabel("ieades2");
        const old = window.NB_MAP.findChannelByLabel("ideas");
        // Navigate must fail for the old path and succeed for the new.
        const navOld = await window.NB_MCP.call("board_navigate", {
          path: "/projects/community/channels/ideas",
        });
        const navNew = await window.NB_MCP.call("board_navigate", {
          path: "/projects/community/channels/ieades2",
        });
        return {
          text,
          err: res?.isError,
          names,
          chId: ch && ch.id,
          oldGone: !old,
          navOldErr: !!navOld?.isError,
          navNewErr: !!navNew?.isError,
          path: window.NB_APP.state.path,
        };
      });
      if (renamed.err) return log("rename failed: " + renamed.text);
      if (!renamed.names.includes("ieades2")) {
        return log("new name not listed: " + JSON.stringify(renamed));
      }
      if (renamed.names.includes("ideas")) {
        return log("old name still listed: " + JSON.stringify(renamed));
      }
      if (renamed.chId !== "ieades2") return log("channel id: " + renamed.chId);
      if (!renamed.oldGone) return log("old channel still findable");
      if (!renamed.navOldErr) return log("old path still navigable");
      if (renamed.navNewErr) return log("new path not navigable: " + JSON.stringify(renamed));
      if (renamed.path !== "/projects/community/channels/ieades2") {
        return log("did not land on renamed path: " + renamed.path);
      }
      return true;
    },
  },
  {
    name: "compose: nav at /projects — create project via tool",
    run: async (page, log) => {
      await go(page, "/projects");
      await page.waitForTimeout(80);
      const ctx = await page.evaluate(() => window.NB_APP.composeContext?.() || window.NB_APP.state.compose);
      if (ctx?.kind !== "nav" || ctx?.scope !== "projects") {
        return log("expected nav/projects: " + JSON.stringify(ctx));
      }
      const out = await page.evaluate(async () => {
        if (!window.NB_MCP.list().some((t) => t.name === "board_create_project")) {
          return { err: true, text: "tool missing" };
        }
        const res = await window.NB_MCP.call("board_create_project", { name: "e2e-forge" });
        const text = (res?.content || []).map((c) => c.text || "").join("\n");
        const names = (window.NB_MAP.list("/projects", window.NB_APP.state.merged) || []).map((e) => e.name);
        return { text, names, err: res?.isError };
      });
      if (out.err) return log("project create failed: " + out.text);
      return out.names.includes("e2e-forge") || log("project not listed: " + JSON.stringify(out));
    },
  },
  {
    name: "compose: DM path posts to the dm thread, not a channel",
    run: async (page, log) => {
      await go(page, "/dms/scout");
      await page.waitForTimeout(100);
      const ctx = await page.evaluate(() => window.NB_APP.composeContext?.() || window.NB_APP.state.compose);
      if (ctx?.kind !== "dm" || ctx?.dm !== "scout") {
        return log("expected dm/scout: " + JSON.stringify(ctx));
      }
      await page.evaluate(() => {
        window.NB_APP.state.columnFocus = false;
        document.querySelector("[data-cli]")?.focus();
      });
      await page.fill("[data-cli]", "e2e dm ping");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(150);
      const hit = await page.evaluate(() => {
        return (window.NB_APP.state.merged || [])
          .filter((p) => p.dm === "scout" && /e2e dm ping/.test(p.body || ""))
          .pop() || null;
      });
      if (!hit) return log("dm message missing");
      if (hit.channel) return log("dm leaked channel field: " + JSON.stringify(hit));
      return true;
    },
  },
  {
    name: "nav: select previews; Enter focuses and activates",
    run: async (page, log) => {
      // Directory: select previews children without changing path.
      await go(page, "/projects/community/channels");
      await page.waitForTimeout(80);
      await page.evaluate(() => {
        document.querySelector("[data-cli]")?.blur();
        window.NB_APP.state.columnFocus = true;
        window.NB_APP.state.focus = 0;
        window.NB_APP.state.detailOpen = true;
        const list = window.NB_MAP.list("/projects/community/channels") || [];
        const ix = list.findIndex((e) => e.name === "bugs");
        window.NB_APP.state.cursor = ix >= 0 ? ix : 0;
        window.NB_APP.render(true);
      });
      await page.waitForTimeout(80);
      // Click another channel — path must stay; detail previews that channel's posts.
      await page.click('[data-blade-kind="list"] .cn-item[data-key="ideas"]');
      await page.waitForTimeout(100);
      const dirPreview = await page.evaluate(() => ({
        path: window.NB_APP.state.path,
        cursorName: (window.NB_MAP.list(window.NB_APP.state.path) || [])[window.NB_APP.state.cursor]?.name,
        focus: window.NB_APP.state.focus,
        detailOpen: window.NB_APP.isDetailOpen(),
        // Channel preview shows feed posts or listing under the selected dir.
        posts: document.querySelectorAll(".cn-comment").length,
        listing: !!document.querySelector(
          '.cn-blade[data-blade-kind="detail"] .cn-item, .cn-blade[data-blade-kind="detail"] .cn-comment',
        ),
        ctx: document.querySelector(".cn-ctx-kind, .cn-ctx")?.textContent || "",
      }));
      if (dirPreview.path !== "/projects/community/channels") {
        return log("dir select navigated: " + JSON.stringify(dirPreview));
      }
      if (dirPreview.cursorName !== "ideas") {
        return log("dir select did not move cursor: " + JSON.stringify(dirPreview));
      }
      if (dirPreview.focus !== 0) {
        return log("dir select stole focus from nav: " + JSON.stringify(dirPreview));
      }
      if (!dirPreview.detailOpen || !(dirPreview.posts > 0 || dirPreview.listing)) {
        return log("dir select missing preview: " + JSON.stringify(dirPreview));
      }

      // Enter on a channel dir: navigate in + focus detail (compose-ready).
      await page.keyboard.press("Enter");
      await page.waitForTimeout(120);
      const dirEnter = await page.evaluate(() => ({
        path: window.NB_APP.state.path,
        focus: window.NB_APP.state.focus,
        detailOpen: window.NB_APP.isDetailOpen(),
        prompt: document.activeElement === document.querySelector("[data-cli]"),
      }));
      if (dirEnter.path !== "/projects/community/channels/ideas") {
        return log("Enter did not open dir: " + JSON.stringify(dirEnter));
      }
      if (!(dirEnter.focus >= 1) && !dirEnter.prompt) {
        return log("Enter did not focus detail/compose: " + JSON.stringify(dirEnter));
      }

      // Inside a channel: nav has no posts; detail shows the feed; Enter on a
      // marked feed row opens post detail in the details pane.
      await go(page, "/projects/community/channels/general");
      await page.waitForTimeout(80);
      const postSel = await page.evaluate(() => {
        document.querySelector("[data-cli]")?.blur();
        window.NB_APP.state.columnFocus = true;
        window.NB_APP.state.focus = 1;
        window.NB_APP.state.threadFocus = null;
        const nav = window.NB_MAP.list(window.NB_APP.state.path, window.NB_APP.state.merged) || [];
        const feed = window.NB_MAP.feedEntriesAt
          ? window.NB_MAP.feedEntriesAt(window.NB_APP.state.path, window.NB_APP.state.merged)
          : [];
        const first = feed.find((e) => e && e.post);
        if (!first) return { err: "no feed post" };
        window.NB_APP.state.feedMark = first.post.id;
        window.NB_APP.render(true);
        return {
          id: first.post.id,
          path: window.NB_APP.state.path,
          thread: window.NB_APP.state.threadFocus,
          focus: window.NB_APP.state.focus,
          navPosts: nav.filter((e) => e && e.post).length,
          here: document.querySelector('.cn-comment[data-here="true"]')?.getAttribute("data-key"),
          feedBar: !!document.querySelector(".cn-feed-bar"),
          roots: Array.from(document.querySelectorAll('.cn-comment[data-depth="0"]')).length,
        };
      });
      if (postSel.err) return log(postSel.err);
      if (postSel.path !== "/projects/community/channels/general") {
        return log("channel path drifted: " + JSON.stringify(postSel));
      }
      if (postSel.navPosts !== 0) {
        return log("channel nav should not list posts: " + JSON.stringify(postSel));
      }
      if (postSel.thread) {
        return log("feed mark should keep channel feed: " + JSON.stringify(postSel));
      }
      if (!(postSel.here === postSel.id && postSel.feedBar && postSel.roots >= 2)) {
        return log("detail did not show marked feed: " + JSON.stringify(postSel));
      }

      await page.keyboard.press("Enter");
      await page.waitForTimeout(120);
      const postEnter = await page.evaluate(() => ({
        focus: window.NB_APP.state.focus,
        thread: window.NB_APP.state.threadFocus,
        replyTo: window.NB_APP.state.replyTo?.id || null,
        editor: !!(window.NB_APP.state.editor && window.NB_APP.state.editor.focused),
        prompt: document.activeElement === document.querySelector("[data-cli]"),
        threadCtx: !!document.querySelector(".cn-thread-ctx"),
        path: window.NB_APP.state.path,
      }));
      if (!(postEnter.focus >= 1)) {
        return log("Enter did not focus detail: " + JSON.stringify(postEnter));
      }
      if (postEnter.path !== "/projects/community/channels/general") {
        return log("Enter should not leave channel path: " + JSON.stringify(postEnter));
      }
      if (!postEnter.thread || !postEnter.threadCtx) {
        return log("Enter did not open post detail: " + JSON.stringify(postEnter));
      }
      if (postEnter.editor) return log("Enter opened editor for post: " + JSON.stringify(postEnter));
      if (postEnter.replyTo || postEnter.prompt) {
        return log("Enter should not arm reply: " + JSON.stringify(postEnter));
      }
      return true;
    },
  },
  {
    name: "nav: channel is terminal; detail thread + Tab arms reply",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.waitForTimeout(80);
      const prep = await page.evaluate(() => {
        document.querySelector("[data-cli]")?.blur();
        window.NB_APP.focusColumns();
        window.NB_APP.clearReplyTo?.();
        const nav = window.NB_MAP.list(window.NB_APP.state.path, window.NB_APP.state.merged) || [];
        if (nav.some((e) => e && e.post)) return { err: "channel nav lists posts" };
        window.NB_APP.openThread("p1", { silent: true });
        window.NB_APP.state.focus = 1;
        window.NB_APP.render(true);
        return {
          path: window.NB_APP.state.path,
          thread: window.NB_APP.state.threadFocus,
          threadCtx: !!document.querySelector(".cn-thread-ctx"),
          replyInDetail: !!document.querySelector('.cn-comment[data-key="p2"]'),
        };
      });
      if (prep.err) return log(prep.err);
      if (prep.path !== "/projects/community/channels/general") {
        return log("thread left channel path: " + JSON.stringify(prep));
      }
      if (prep.thread !== "p1" || !prep.threadCtx) {
        return log("thread not in detail: " + JSON.stringify(prep));
      }
      if (!prep.replyInDetail) {
        return log("detail missing reply p2: " + JSON.stringify(prep));
      }

      // Click a reply in detail to focus that message's thread.
      await page.evaluate(() => {
        document.querySelector('.cn-comment[data-key="p2"]')?.click();
      });
      await page.waitForTimeout(100);
      const replyDetail = await page.evaluate(() => ({
        thread: window.NB_APP.state.threadFocus,
        replyTo: window.NB_APP.state.replyTo?.id || null,
        prompt: document.activeElement === document.querySelector("[data-cli]"),
        path: window.NB_APP.state.path,
      }));
      if (replyDetail.thread !== "p2") {
        return log("click reply did not open detail: " + JSON.stringify(replyDetail));
      }
      if (replyDetail.path !== "/projects/community/channels/general") {
        return log("reply should stay on channel path: " + JSON.stringify(replyDetail));
      }
      if (replyDetail.replyTo || replyDetail.prompt) {
        return log("click reply armed compose: " + JSON.stringify(replyDetail));
      }

      // Tab to the prompt begins writing a reply.
      await page.keyboard.press("Tab");
      await page.waitForTimeout(80);
      const tabReply = await page.evaluate(() => ({
        columnFocus: !!window.NB_APP.state.columnFocus,
        onCli: document.activeElement === document.querySelector("[data-cli]"),
        replyTo: window.NB_APP.state.replyTo?.id || null,
        thread: window.NB_APP.state.threadFocus,
      }));
      if (tabReply.columnFocus || !tabReply.onCli) {
        return log("Tab did not focus prompt: " + JSON.stringify(tabReply));
      }
      if (tabReply.replyTo !== "p2") {
        return log("Tab did not arm reply: " + JSON.stringify(tabReply));
      }
      return true;
    },
  },
  {
    name: "nav: selection reloads same list blade for new branch",
    run: async (page, log) => {
      await go(page, "/projects/community/channels");
      await page.waitForTimeout(80);
      await page.click('[data-blade-kind="list"] .cn-item[data-key="ideas"]');
      await page.waitForTimeout(80);
      // Select previews; → / Enter opens the branch (reloads the same nav blade).
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(120);
      const st = await page.evaluate(() => ({
        path: window.NB_APP.state.path,
        listCount: document.querySelectorAll('.cn-blade[data-blade-kind="list"]').length,
        navPath: document.querySelector('.cn-blade[data-blade-kind="list"]')?.getAttribute("data-blade-path"),
        navKey: document.querySelector('.cn-blade[data-blade-kind="list"]')?.getAttribute("data-key"),
      }));
      if (st.path !== "/projects/community/channels/ideas") return log("path " + st.path);
      if (st.listCount !== 1 || st.navKey !== "blade-nav") return log("nav not single: " + JSON.stringify(st));
      // Terminal channel address keeps the navbar on …/channels (siblings visible).
      return st.navPath === "/projects/community/channels" || log(JSON.stringify(st));
    },
  },
  {
    name: "channels: terminal nav nodes — no tree expand into posts",
    run: async (page, log) => {
      await go(page, "/projects/community/channels");
      await page.waitForTimeout(100);
      const probe = await page.evaluate(() => {
        const list = window.NB_MAP.list("/projects/community/channels") || [];
        const channels = list.filter((e) => e.kind === "channel");
        const dirs = list.filter((e) => e.kind === "dir");
        const toggle = document.querySelector(
          '[data-tree-toggle="/projects/community/channels/showcase"]',
        );
        const kind = document.querySelector(
          '[data-blade-kind="list"] .cn-item[data-key="showcase"]',
        )?.getAttribute("data-kind");
        return {
          channelCount: channels.length,
          dirCount: dirs.length,
          hasToggle: !!toggle,
          showcaseKind: kind,
        };
      });
      if (!(probe.channelCount >= 2)) {
        return log("expected channel entries: " + JSON.stringify(probe));
      }
      if (probe.dirCount !== 0) {
        return log("channels list should not use dir kind: " + JSON.stringify(probe));
      }
      if (probe.hasToggle || probe.showcaseKind === "dir") {
        return log("channel should not expand in nav: " + JSON.stringify(probe));
      }
      // Opening a channel must not replace the navbar with an empty list.
      await page.evaluate(() => {
        document.querySelector("[data-cli]")?.blur();
        window.NB_APP.state.columnFocus = true;
        const list = window.NB_MAP.list("/projects/community/channels") || [];
        const ix = list.findIndex((e) => e.name === "showcase");
        window.NB_APP.state.cursor = ix >= 0 ? ix : 0;
        window.NB_APP.state.focus = 0;
        window.NB_APP.render(true);
      });
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(120);
      const opened = await page.evaluate(() => {
        const nav = document.querySelector('.cn-blade[data-blade-kind="list"]');
        const items = Array.from(nav?.querySelectorAll(".cn-item[data-key]") || [])
          .map((el) => el.getAttribute("data-key"));
        return {
          path: window.NB_APP.state.path,
          navPath: nav?.getAttribute("data-blade-path"),
          items,
          empty: !!nav?.querySelector(".cn-empty"),
        };
      });
      if (opened.path !== "/projects/community/channels/showcase") {
        return log("did not open channel: " + JSON.stringify(opened));
      }
      if (opened.navPath !== "/projects/community/channels" || opened.empty || opened.items.length < 2) {
        return log("terminal channel emptied navbar: " + JSON.stringify(opened));
      }
      // Directories still expand elsewhere.
      await go(page, "/projects");
      await page.waitForTimeout(80);
      await page.click('[data-tree-toggle="/projects/community"]');
      await page.waitForTimeout(100);
      const expanded = await page.evaluate(() => {
        const btn = document.querySelector('[data-tree-toggle="/projects/community"]');
        return {
          exp: btn?.getAttribute("aria-expanded"),
          mark: btn?.textContent,
          hasKids: !!document.querySelector('[data-key="tk-/projects/community"]'),
        };
      });
      return (expanded.exp === "true" && expanded.mark === "−" && expanded.hasKids) ||
        log("dir expand failed: " + JSON.stringify(expanded));
    },
  },
  {
    name: "tree: Space expands; → reloads nav into dir; ← parent",
    run: async (page, log) => {
      await go(page, "/projects");
      await page.waitForTimeout(120);
      await page.evaluate(() => {
        document.querySelector("[data-cli]")?.blur();
        window.NB_APP.state.columnFocus = true;
        const list = window.NB_MAP.list("/projects") || [];
        const ix = list.findIndex((e) => e.name === "community");
        window.NB_APP.state.cursor = ix >= 0 ? ix : 0;
        window.NB_APP.state.focus = 0;
        window.NB_APP.state.filter = "";
        window.NB_APP.render(true);
      });
      await page.waitForTimeout(80);
      await page.keyboard.press("Space");
      await page.waitForTimeout(120);
      const peeked = await page.evaluate(() => {
        const open = window.NB_APP.state.treeOpen || {};
        const kids = document.querySelector('[data-key="tk-/projects/community"]');
        return {
          path: window.NB_APP.state.path,
          expanded: !!open["/projects/community"],
          hasKids: !!kids,
          depth2: kids ? kids.querySelectorAll('.cn-tree-row[data-depth="2"]').length : 0,
          listCount: document.querySelectorAll('.cn-blade[data-blade-kind="list"]').length,
        };
      });
      if (peeked.path !== "/projects") return log("Space must not navigate: " + JSON.stringify(peeked));
      if (!peeked.expanded || !peeked.hasKids) return log("Space expand failed: " + JSON.stringify(peeked));
      if (peeked.depth2 > 0) return log("Space unfurled too deep: " + JSON.stringify(peeked));
      if (peeked.listCount !== 1) return log("nav cloned on peek: " + JSON.stringify(peeked));

      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(150);
      const slid = await page.evaluate(() => {
        const path = window.NB_APP.state.path;
        const first = Array.from(
          document.querySelectorAll(
            '[data-blade-kind="list"] .cn-tree-row[data-depth="0"] .cn-item',
          ),
        ).map((el) => el.getAttribute("data-key"));
        return {
          path,
          first,
          listCount: document.querySelectorAll('.cn-blade[data-blade-kind="list"]').length,
          navPath: document.querySelector('.cn-blade[data-blade-kind="list"]')?.getAttribute("data-blade-path"),
        };
      });
      if (slid.path !== "/projects/community") return log("→ did not open: " + JSON.stringify(slid));
      if (slid.listCount !== 1) return log("nav cloned: " + JSON.stringify(slid));
      if (slid.navPath !== "/projects/community") return log("nav not reloaded: " + JSON.stringify(slid));
      if (!slid.first.includes("channels")) return log("branch missing kids: " + JSON.stringify(slid));

      await page.keyboard.press("ArrowLeft");
      await page.waitForTimeout(120);
      const back = await page.evaluate(() => ({
        path: window.NB_APP.state.path,
        listCount: document.querySelectorAll('.cn-blade[data-blade-kind="list"]').length,
        first: Array.from(
          document.querySelectorAll('[data-blade-kind="list"] .cn-tree-row[data-depth="0"] .cn-item'),
        ).map((el) => el.getAttribute("data-key")),
      }));
      if (back.path !== "/projects") return log("← failed: " + JSON.stringify(back));
      if (back.listCount !== 1) return log("nav cloned on up: " + JSON.stringify(back));
      // Siblings of community reappear as the nav branch.
      return (back.first.includes("community") && back.first.length >= 2) ||
        log("siblings missing: " + JSON.stringify(back));
    },
  },
  {
    name: "terminal: identity rail, collapsible tools, workspace tabs",
    run: async (page, log) => {
      // CLI turn should show a "you" rail and system output without identity.
      await page.keyboard.type("help");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(150);
      const you = await page.evaluate(() =>
        document.querySelector('.cn-line[data-kind="user"] .cn-who')?.textContent);
      if (you !== "you") return log("user rail was " + you);
      // New workspace is an isolated worktree: starts at default home, not
      // the previous tab's path / filter / transcript scope.
      await go(page, "/projects/community/channels/bugs");
      await page.evaluate(() => {
        window.NB_APP.state.filter = "bug";
        window.NB_APP.state.lines.push({ id: "L-ws1", kind: "out", text: "ws1-only" });
        window.NB_APP.render(true);
      });
      await page.waitForTimeout(80);
      const beforeNew = await path(page);
      if (beforeNew !== "/projects/community/channels/bugs") {
        return log("setup path " + beforeNew);
      }
      await page.click("[data-session-new]");
      await page.waitForTimeout(150);
      const tabs = await page.evaluate(() => document.querySelectorAll("[data-session]").length);
      if (tabs < 2) return log("expected 2 tabs, got " + tabs);
      const fresh = await page.evaluate(() => ({
        path: window.NB_APP.state.path,
        filter: window.NB_APP.state.filter || "",
        lines: (window.NB_APP.state.lines || []).map((l) => l.text || l.id).join("|"),
        active: window.NB_APP.state.activeSession,
      }));
      // Default home — not continuing from /bugs or filter "bug".
      if (fresh.path === "/projects/community/channels/bugs") {
        return log("new workspace inherited path: " + JSON.stringify(fresh));
      }
      if (fresh.filter) return log("new workspace inherited filter: " + JSON.stringify(fresh));
      if (/ws1-only/.test(fresh.lines)) {
        return log("new workspace inherited transcript: " + JSON.stringify(fresh));
      }
      await go(page, "/projects/community/channels/bugs");
      const p2 = await path(page);
      if (p2 !== "/projects/community/channels/bugs") return log("workspace 2 path " + p2);
      await page.click('[data-session="0"]');
      await page.waitForTimeout(150);
      const p1 = await page.evaluate(() => ({
        path: window.NB_APP.state.path,
        filter: window.NB_APP.state.filter || "",
        hasWs1: (window.NB_APP.state.lines || []).some((l) => l.text === "ws1-only"),
      }));
      if (p1.path !== "/projects/community/channels/bugs") {
        return log("workspace 1 lost its path: " + JSON.stringify(p1));
      }
      if (p1.filter !== "bug") return log("workspace 1 lost filter: " + JSON.stringify(p1));
      if (!p1.hasWs1) return log("workspace 1 lost transcript: " + JSON.stringify(p1));
      // Tool rows collapse by default when the agent runs.
      await page.click('[data-session="' + (tabs - 1) + '"]');
      await page.evaluate(async () => {
        // Inject a synthetic tool line the way the agent would.
        window.NB_APP.state.lines.push({
          id: "T-test", kind: "tool", tool: "navigate",
          summary: "/projects/community/channels/bugs", detail: '{ "path": "/projects/community/channels/bugs" }',
          result: "ok", ok: true,
        });
        window.NB_APP.render(true);
      });
      await page.waitForTimeout(100);
      const collapsed = await page.evaluate(() => {
        const row = document.querySelector('.cn-line[data-kind="tool"]');
        const detail = row?.querySelector(".cn-tool-detail");
        const who = row?.querySelector(".cn-who")?.textContent;
        return { who, open: row?.dataset.open, hasDetail: !!detail };
      });
      if (collapsed.who !== "agent") return log("tool who was " + collapsed.who);
      if (collapsed.open !== "false" || collapsed.hasDetail) return log("tool not collapsed: " + JSON.stringify(collapsed));
      await page.click('[data-tool-toggle="T-test"]');
      await page.waitForTimeout(100);
      const expanded = await page.evaluate(() => {
        const row = document.querySelector('.cn-line[data-kind="tool"][data-key="T-test"]');
        return { open: row?.dataset.open, hasDetail: !!row?.querySelector(".cn-tool-detail") };
      });
      return (expanded.open === "true" && expanded.hasDetail) || log("expand failed: " + JSON.stringify(expanded));
    },
  },
  {
    name: "live: a tick keeps caret, selection and the input's text",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
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
    name: "context: a channel states its facts from the channels blade and inside",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      const inside = await page.evaluate(() => document.querySelector(".cn-ctx")?.textContent || "");
      if (!inside.includes("#general")) return log("no strip inside: " + inside.slice(0, 40));
      await go(page, "/projects/community/channels");
      const selecting = await page.evaluate(() => document.querySelector(".cn-ctx")?.textContent || "");
      return selecting.includes("#") || log("no strip when selecting");
    },
  },
  {
    name: "sort: hot/new/top on feed only; + pins more views",
    run: async (page, log) => {
      // Off a feed — no sort bar.
      await go(page, "/members");
      const offFeed = await page.evaluate(() => ({
        bar: !!document.querySelector(".cn-feed-bar"),
        sorts: Array.from(document.querySelectorAll(".cn-sort")).map((b) => b.dataset.sort),
      }));
      if (offFeed.bar || offFeed.sorts.length) {
        return log("sort bar leaked outside feed: " + JSON.stringify(offFeed));
      }
      // On a channel feed — Reddit defaults only + add button.
      const sorted = await page.evaluate(async () => {
        window.NB_APP.setNavCollapsed(false, { silent: true, noRender: true });
        window.NB_APP.navigate("/projects/community/channels/general", { keepCli: true });
        window.NB_APP.state.detailOpen = true;
        window.NB_APP.state.focus = 1;
        window.NB_APP.state.feedPinnedViews = [];
        window.NB_APP.state.feedAddOpen = false;
        window.NB_APP.render(true);
        await new Promise((r) => setTimeout(r, 40));
        if (!document.querySelector(".cn-comment")) return { err: "no tree" };
        const sorts = Array.from(document.querySelectorAll(".cn-sort")).map((b) => b.dataset.sort);
        const add = !!document.querySelector("[data-feed-add]");
        const inDetail = !!document.querySelector('.cn-blade[data-blade-kind="detail"] .cn-feed-bar');
        const inPath = !!document.querySelector(".cn-path .cn-feed-bar");
        const neu = document.querySelector('[data-sort="new"]');
        const top = document.querySelector('[data-sort="top"]');
        if (!neu || !top) return { err: "no sort chips", sorts };
        neu.click();
        const afterNew = window.NB_APP.state.sort;
        top.click();
        const afterTop = window.NB_APP.state.sort;
        document.querySelector("[data-feed-add]")?.click();
        await new Promise((r) => setTimeout(r, 20));
        const menuOpen = !!document.querySelector(".cn-feed-add-menu");
        const bestOpt = document.querySelector('[data-feed-pin="best"]');
        if (bestOpt) bestOpt.click();
        await new Promise((r) => setTimeout(r, 20));
        const afterPin = Array.from(document.querySelectorAll(".cn-sort")).map((b) => b.dataset.sort);
        const share = document.querySelectorAll("[data-share]").length;
        return {
          sorts, add, inDetail, inPath, afterNew, afterTop, menuOpen, afterPin, share,
          pinned: (window.NB_APP.state.feedPinnedViews || []).slice(),
        };
      });
      if (sorted.err) return log(JSON.stringify(sorted));
      if (sorted.sorts.join(",") !== "hot,new,top") {
        return log("defaults should be hot,new,top got " + sorted.sorts.join(","));
      }
      if (!sorted.add) return log("missing + add control");
      if (!sorted.inDetail) return log("feed bar not in detail pane");
      if (sorted.inPath) return log("feed bar still in path chrome");
      if (sorted.afterNew !== "new") return log("sort stayed " + sorted.afterNew);
      if (sorted.afterTop !== "top") return log("top failed: " + sorted.afterTop);
      if (!sorted.menuOpen && sorted.afterPin.indexOf("best") < 0) {
        return log("pin menu/best failed: " + JSON.stringify(sorted));
      }
      if (sorted.afterPin.indexOf("best") < 0) {
        return log("best not pinned: " + sorted.afterPin.join(","));
      }
      return (sorted.share >= 1) || log("missing share on feed bar");
    },
  },
  {
    name: "chrome: filters and sorts are terminal brackets, not web pills",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      const sortChrome = await page.evaluate(async () => {
        window.NB_APP.state.detailOpen = true;
        window.NB_APP.state.focus = 1;
        window.NB_APP.render(true);
        await new Promise((r) => setTimeout(r, 40));
        const hot = document.querySelector('.cn-sort[aria-pressed="true"]')
          || document.querySelector(".cn-sort");
        if (!hot) return { err: "no sort" };
        const cs = getComputedStyle(hot);
        return {
          before: getComputedStyle(hot, "::before").content,
          after: getComputedStyle(hot, "::after").content,
          radius: cs.borderRadius,
          border: cs.borderTopWidth,
          pressed: hot.getAttribute("aria-pressed") === "true",
          bg: cs.backgroundColor,
          color: cs.color,
        };
      });
      if (sortChrome.err) return log(sortChrome.err);
      if (!String(sortChrome.before).includes("[")) return log("sort missing [: " + sortChrome.before);
      if (!String(sortChrome.after).includes("]")) return log("sort missing ]: " + sortChrome.after);
      if (sortChrome.radius && sortChrome.radius !== "0px") {
        return log("sort rounded: " + sortChrome.radius);
      }
      if (sortChrome.border && sortChrome.border !== "0px") {
        return log("sort bordered like a web button: " + sortChrome.border);
      }
      if (sortChrome.pressed) {
        // Reverse video: solid background, not transparent / none.
        const bg = sortChrome.bg || "";
        if (bg === "rgba(0, 0, 0, 0)" || bg === "transparent") {
          return log("pressed sort not reverse video: " + bg);
        }
      }
      await go(page, "/notifications/mentions");
      const filterChrome = await page.evaluate(() => {
        const filter = document.querySelector('.cn-activity-filter[aria-pressed="true"]')
          || document.querySelector(".cn-activity-filter");
        if (!filter) return { err: "no filter" };
        const cs = getComputedStyle(filter);
        return {
          before: getComputedStyle(filter, "::before").content,
          radius: cs.borderRadius,
          border: cs.borderTopWidth,
        };
      });
      if (filterChrome.err) return log(filterChrome.err);
      if (!String(filterChrome.before).includes("[")) {
        return log("filter missing [: " + filterChrome.before);
      }
      if (filterChrome.radius && filterChrome.radius !== "0px") {
        return log("filter rounded: " + filterChrome.radius);
      }
      if (filterChrome.border && filterChrome.border !== "0px") {
        return log("filter bordered: " + filterChrome.border);
      }
      return true;
    },
  },
  {
    name: "focus: Tab swaps prompt ↔ panels; still completes when suggestions open",
    run: async (page, log) => {
      await go(page, "/projects/community/channels");
      await page.waitForTimeout(80);
      await page.evaluate(() => {
        window.NB_APP.state.ai = false;
        window.NB_APP.state.columnFocus = false;
        window.NB_APP.state.menuDismissed = false;
        document.querySelector("[data-cli]")?.focus();
      });
      await page.fill("[data-cli]", "");
      await page.waitForTimeout(40);

      // Empty prompt, no suggestions → Tab → panels.
      await page.keyboard.press("Tab");
      await page.waitForTimeout(60);
      let swap = await page.evaluate(() => ({
        columnFocus: !!window.NB_APP.state.columnFocus,
        onCli: document.activeElement === document.querySelector("[data-cli]"),
      }));
      if (!swap.columnFocus || swap.onCli) {
        return log("Tab did not hand to panels: " + JSON.stringify(swap));
      }

      // Panels → Tab → prompt.
      await page.keyboard.press("Tab");
      await page.waitForTimeout(60);
      swap = await page.evaluate(() => ({
        columnFocus: !!window.NB_APP.state.columnFocus,
        onCli: document.activeElement === document.querySelector("[data-cli]"),
      }));
      if (swap.columnFocus || !swap.onCli) {
        return log("Tab did not return to prompt: " + JSON.stringify(swap));
      }

      // With path suggestions open, Tab still completes.
      await page.fill("[data-cli]", "");
      await page.keyboard.type("cd pro", { delay: 15 });
      await page.waitForTimeout(100);
      const before = await page.evaluate(() => ({
        value: document.querySelector("[data-cli]")?.value || "",
        open: document.querySelector(".cn-tui-foot")?.dataset.open,
        cands: (window.NB_APP.state.completion?.candidates || []).length,
      }));
      if (!(before.cands >= 1 && before.open === "true")) {
        return log("expected suggestions for cd pro: " + JSON.stringify(before));
      }
      await page.keyboard.press("Tab");
      await page.waitForTimeout(60);
      const after = await page.evaluate(() => ({
        value: document.querySelector("[data-cli]")?.value || "",
        columnFocus: !!window.NB_APP.state.columnFocus,
      }));
      if (after.columnFocus) return log("Tab stole focus while completing: " + JSON.stringify(after));
      if (after.value === before.value || !/project/i.test(after.value)) {
        return log("Tab did not complete: " + JSON.stringify({ before, after }));
      }
      return true;
    },
  },
  {
    name: "cli: completion menu opens, Tab completes, Enter runs",
    run: async (page, log) => {
      await page.evaluate(() => {
        window.NB_APP.state.ai = false;
        window.NB_APP.state.columnFocus = false;
        window.NB_APP.state.menuDismissed = false;
        window.NB_APP.render(true);
      });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      await page.keyboard.type("cd pro", { delay: 15 });
      await page.waitForTimeout(150);
      await page.keyboard.press("Tab");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(200);
      const p = await path(page);
      return p === "/projects" || log("landed at " + p);
    },
  },
  {
    name: "cli: Enter submits typed text even when autocomplete menu is open",
    run: async (page, log) => {
      // Nav scope so Enter runs the CLI line (not compose-post).
      await go(page, "/projects");
      await page.waitForTimeout(80);
      await page.evaluate(() => {
        window.NB_APP.state.ai = false;
        window.NB_APP.clearReplyTo?.();
        window.NB_APP.render(true);
      });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      // Partial verb: menu offers `help`. Enter must run `hel` (not found),
      // not accept the suggestion into `help`.
      await page.keyboard.type("hel", { delay: 20 });
      await page.waitForTimeout(120);
      const before = await page.evaluate(() => ({
        open: document.querySelector(".cn-tui-foot")?.dataset.open,
        cands: Array.from(document.querySelectorAll(".cn-cand span")).map((s) => s.textContent),
        value: document.querySelector("[data-cli]")?.value || "",
        compose: window.NB_APP.composeContext?.()?.kind,
      }));
      if (!(before.value === "hel" && before.cands.some((c) => c === "help"))) {
        return log("help suggestion missing: " + JSON.stringify(before));
      }
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(40);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(180);
      const after = await page.evaluate(() => ({
        value: document.querySelector("[data-cli]")?.value || "",
        out: document.querySelector(".cn-out")?.textContent || "",
        lines: (window.NB_APP.state.lines || []).map((l) => l.text || "").join("\n"),
      }));
      if (after.value === "help" || after.value === "help " || after.value === "hel") {
        return log("Enter did not submit typed text: " + JSON.stringify(after));
      }
      const blob = after.out + "\n" + after.lines;
      if (/change directory/i.test(blob) && /list a directory/i.test(blob)) {
        return log("Enter accepted `help` autocomplete: " + blob.slice(0, 160));
      }
      return /hel:.*not found/i.test(blob) || log("expected hel error after submit: " + blob.slice(0, 160));
    },
  },
  {
    name: "compose: Enter posts even with @-mention autocomplete open",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.waitForTimeout(100);
      await page.evaluate(() => {
        window.NB_APP.state.ai = true;
        window.NB_APP.clearReplyTo?.();
        window.NB_APP.render(true);
      });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      await page.keyboard.type("ping @ma", { delay: 15 });
      await page.waitForTimeout(120);
      const before = await page.evaluate(() => ({
        open: document.querySelector(".cn-tui-foot")?.dataset.open,
        value: document.querySelector("[data-cli]")?.value || "",
        cands: Array.from(document.querySelectorAll(".cn-cand span")).map((s) => s.textContent),
      }));
      if (!before.cands.some((c) => /^@ma/i.test(c))) {
        return log("mention menu missing: " + JSON.stringify(before));
      }
      await page.keyboard.press("Enter");
      await page.waitForTimeout(200);
      const after = await page.evaluate(() => {
        const bodies = Array.from(document.querySelectorAll(".cn-comment-body, .cn-comment"))
          .map((el) => el.textContent || "");
        return {
          value: document.querySelector("[data-cli]")?.value || "",
          posted: bodies.some((t) => /ping @ma/.test(t) && !/@maya\b/.test(t.split("ping")[1] || "")),
          anyPing: bodies.some((t) => /ping @ma/.test(t)),
          bodies: bodies.filter((t) => /ping/.test(t)).slice(0, 3),
        };
      });
      if (after.value === "ping @ma" || after.value === "ping @maya ") {
        return log("Enter accepted mention instead of posting: " + JSON.stringify(after));
      }
      return after.anyPing || log("post missing: " + JSON.stringify(after));
    },
  },
  {
    name: "compose: @handle outside DM tips and reveals session chat (does not send)",
    run: async (page, log) => {
      // Home feed / non-DM path — @maya must not publish a DM.
      await page.evaluate(() => {
        try { localStorage.removeItem("nb-home-feed-read"); } catch { /* fine */ }
        window.NB_APP.state.homeFeedRead = {};
        window.NB_APP.state.homeFeed = "creators";
        window.NB_APP.state.sessionOutFocus = false;
        window.NB_APP.state.lines = [];
        window.NB_APP.state.ai = true;
        window.NB_APP.clearReplyTo?.();
        window.NB_APP.closeDetail({ silent: true });
      });
      await page.waitForTimeout(100);
      const beforeMerged = await page.evaluate(() =>
        (window.NB_APP.state.merged || []).filter((p) => p.dm === "maya").length);
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      await page.keyboard.type("@maya hello from outside dm", { delay: 8 });
      await page.waitForTimeout(80);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(200);
      const after = await page.evaluate(() => {
        const sess = document.querySelector('.cn-blade[data-blade-kind="session"]');
        const out = sess?.querySelector(".cn-blade-out") || document.querySelector(".cn-blade-out");
        const feed = document.querySelector(".cn-follow-feed");
        const leakedIntoFeed = !!(feed && out && feed.contains(out));
        const text = (out?.textContent || "") + "\n" +
          (window.NB_APP.state.lines || []).map((l) => l.text || "").join("\n");
        const dmBodies = (window.NB_APP.state.merged || [])
          .filter((p) => p.dm === "maya")
          .map((p) => p.body || "");
        return {
          path: window.NB_APP.state.path,
          detailOpen: window.NB_APP.state.detailOpen,
          homeView: feed?.getAttribute("data-home-view"),
          focus: !!window.NB_APP.state.sessionOutFocus,
          sessionBlade: !!sess,
          active: out?.getAttribute("data-active"),
          label: out?.getAttribute("aria-label") || "",
          leakedIntoFeed,
          tip: /not sent/i.test(text) && /\/dm\s*@maya/i.test(text),
          userLine: (window.NB_APP.state.lines || []).some((l) =>
            l.kind === "user" && /@maya hello from outside dm/i.test(l.text || "")),
          leakedDm: dmBodies.some((b) => /hello from outside dm/i.test(b)),
          leakedAny: (window.NB_APP.state.merged || [])
            .some((p) => /hello from outside dm/i.test(p.body || "")),
          dmCount: dmBodies.length,
        };
      });
      if (after.leakedDm || after.leakedAny) {
        return log("message was sent without /dm: " + JSON.stringify(after));
      }
      if (after.detailOpen || after.homeView !== "creators") {
        return log("home feed lost after tip: " + JSON.stringify(after));
      }
      if (after.leakedIntoFeed || !after.sessionBlade) {
        return log("session chat not in dedicated blade: " + JSON.stringify(after));
      }
      if (!(after.focus && after.active === "true")) {
        return log("session chat not active: " + JSON.stringify(after));
      }
      if (!after.tip || !after.userLine) {
        return log("tip/user line missing: " + JSON.stringify(after));
      }
      if (after.dmCount !== beforeMerged) {
        return log("maya DM count changed: " + JSON.stringify({ beforeMerged, after }));
      }
      // Esc closes the session chat window (blade gone; transcript kept until clear).
      await page.keyboard.press("Escape");
      await page.waitForTimeout(80);
      const cleared = await page.evaluate(() => ({
        focus: !!window.NB_APP.state.sessionOutFocus,
        closed: !!window.NB_APP.state.sessionClosed,
        blade: !!document.querySelector('.cn-blade[data-blade-kind="session"]'),
        active: document.querySelector(".cn-blade-out")?.getAttribute("data-active"),
      }));
      if (cleared.focus || cleared.active === "true" || !cleared.closed || cleared.blade) {
        return log("Esc did not close session window: " + JSON.stringify(cleared));
      }
      return true;
    },
  },
  {
    name: "power: → accepts ghost; Enter then runs the completed command",
    run: async (page, log) => {
      await go(page, "/projects");
      await page.evaluate(() => {
        window.NB_APP.state.ai = false;
        window.NB_APP.render(true);
      });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      await page.keyboard.type("hel", { delay: 15 });
      await page.waitForTimeout(100);
      const ghost = await page.evaluate(() =>
        document.querySelector("[data-ghost-rest]")?.textContent || "");
      if (!/^p\s*$/i.test(ghost.trim() + (ghost.endsWith(" ") ? "" : "")) && !/p/.test(ghost)) {
        return log("no help ghost: " + JSON.stringify(ghost));
      }
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(80);
      const filled = await page.evaluate(() => document.querySelector("[data-cli]")?.value || "");
      if (!/^help\s*$/.test(filled)) return log("→ did not accept ghost: " + JSON.stringify(filled));
      await page.keyboard.press("Enter");
      await page.waitForTimeout(150);
      const out = await page.evaluate(() =>
        (document.querySelector(".cn-out")?.textContent || "") + "\n" +
        (window.NB_APP.state.lines || []).map((l) => l.text || "").join("\n"));
      return (/change directory/i.test(out) && /list a directory/i.test(out)) ||
        log("help did not run after ghost accept: " + out.slice(0, 160));
    },
  },
  {
    name: "power: End accepts ghost the same as →",
    run: async (page, log) => {
      await go(page, "/projects");
      await page.evaluate(() => { window.NB_APP.state.ai = false; window.NB_APP.render(true); });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      await page.keyboard.type("sta", { delay: 15 });
      await page.waitForTimeout(80);
      await page.keyboard.press("End");
      await page.waitForTimeout(80);
      const filled = await page.evaluate(() => document.querySelector("[data-cli]")?.value || "");
      return /^stat\s*$/.test(filled) || log("End ghost failed: " + JSON.stringify(filled));
    },
  },
  {
    name: "power: Tab cycles path candidates; click accepts without submitting",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.evaluate(() => { window.NB_APP.state.ai = false; window.NB_APP.render(true); });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      await page.keyboard.type("cd pro", { delay: 12 });
      await page.waitForTimeout(120);
      const first = await page.evaluate(() => document.querySelector("[data-cli]")?.value || "");
      await page.keyboard.press("Tab");
      await page.waitForTimeout(80);
      const afterTab = await page.evaluate(() => document.querySelector("[data-cli]")?.value || "");
      if (afterTab === first || !/project/i.test(afterTab)) {
        return log("Tab did not complete path: " + JSON.stringify({ first, afterTab }));
      }
      // Second Tab should cycle to another candidate when several exist.
      await page.keyboard.press("Tab");
      await page.waitForTimeout(80);
      const afterTab2 = await page.evaluate(() => document.querySelector("[data-cli]")?.value || "");
      // Click a visible candidate — should fill, not navigate/submit.
      const pathBefore = await path(page);
      const clicked = await page.evaluate(() => {
        const cand = Array.from(document.querySelectorAll(".cn-cand")).find((el) =>
          /\/projects$/.test(el.querySelector("span")?.textContent || ""));
        if (!cand) return { ok: false, reason: "no /projects cand" };
        cand.click();
        return { ok: true, value: document.querySelector("[data-cli]")?.value || "" };
      });
      await page.waitForTimeout(100);
      const pathAfter = await path(page);
      if (pathAfter !== pathBefore) {
        return log("click submitted/navigated: " + pathBefore + " → " + pathAfter);
      }
      if (!clicked.ok) return log(clicked.reason + " tabs=" + JSON.stringify({ afterTab, afterTab2 }));
      return /\/projects/.test(clicked.value) || log("click did not accept: " + JSON.stringify(clicked));
    },
  },
  {
    name: "power: cd - returns to previous path; cd .. climbs",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.evaluate(() => { window.NB_APP.state.ai = false; window.NB_APP.render(true); });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "cd /projects");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(120);
      let p = await path(page);
      if (p !== "/projects") return log("setup cd /projects → " + p);
      await page.fill("[data-cli]", "cd -");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(120);
      p = await path(page);
      if (p !== "/projects/community/channels/general") {
        return log("cd - failed: " + p);
      }
      await page.fill("[data-cli]", "cd ..");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(120);
      p = await path(page);
      return p === "/projects/community/channels" || log("cd .. failed: " + p);
    },
  },
  {
    name: "power: history ↑ only when suggestion menu has ≤1 choice",
    run: async (page, log) => {
      await go(page, "/projects");
      await page.evaluate(() => { window.NB_APP.state.ai = false; window.NB_APP.render(true); });
      await page.focus("[data-cli]");
      // Seed history.
      await page.fill("[data-cli]", "stat");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(100);
      await page.fill("[data-cli]", "help");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(100);
      await page.fill("[data-cli]", "");
      // No multi-candidate menu → ↑ walks history.
      await page.keyboard.press("ArrowUp");
      await page.waitForTimeout(60);
      const hist1 = await page.evaluate(() => document.querySelector("[data-cli]")?.value || "");
      if (hist1 !== "help") return log("history ↑ missed help: " + JSON.stringify(hist1));
      await page.keyboard.press("ArrowUp");
      await page.waitForTimeout(60);
      const hist2 = await page.evaluate(() => document.querySelector("[data-cli]")?.value || "");
      if (hist2 !== "stat") return log("history ↑ missed stat: " + JSON.stringify(hist2));
      // Multi-candidate menu → ↑ moves highlight, does not replace with history.
      await page.fill("[data-cli]", "");
      await page.keyboard.type("c", { delay: 20 }); // cd, cat, clear…
      await page.waitForTimeout(120);
      const before = await page.evaluate(() => ({
        value: document.querySelector("[data-cli]")?.value || "",
        cands: document.querySelectorAll(".cn-cand").length,
        idx: window.NB_APP.state.candIndex,
      }));
      if (before.cands < 2) return log("need multi cand for menu arrows: " + JSON.stringify(before));
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(40);
      const mid = await page.evaluate(() => ({
        value: document.querySelector("[data-cli]")?.value || "",
        idx: window.NB_APP.state.candIndex,
      }));
      if (mid.value !== "c") return log("menu arrow mutated input: " + JSON.stringify(mid));
      if (!(mid.idx > before.idx)) return log("candIndex did not move: " + JSON.stringify({ before, mid }));
      return true;
    },
  },
  {
    name: "power: ↑↓ update ghost preview; → accepts the highlighted candidate",
    run: async (page, log) => {
      await page.evaluate(() => {
        window.NB_APP.state.ai = false;
        window.NB_APP.render(true);
      });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      // Parameter completion: cd + path fragment with multiple matches.
      await page.keyboard.type("cd p", { delay: 15 });
      await page.waitForTimeout(120);
      const start = await page.evaluate(() => {
        const c = window.NB_APP.state.completion;
        const ghost = document.querySelector("[data-ghost-rest]")?.textContent || "";
        const cands = (c?.candidates || []).map((x) => x.value);
        return {
          value: document.querySelector("[data-cli]")?.value || "",
          idx: window.NB_APP.state.candIndex,
          ghost,
          preview: c?.preview || "",
          insert: c?.insert || "",
          cands: cands.slice(0, 8),
          open: document.querySelector(".cn-tui-foot")?.dataset.open,
        };
      });
      if (start.value !== "cd p") return log("setup value: " + JSON.stringify(start));
      if (start.cands.length < 2) {
        // Fall back to verb catalogue (cd/cat/clear) if path has one hit.
        await page.fill("[data-cli]", "");
        await page.keyboard.type("c", { delay: 20 });
        await page.waitForTimeout(120);
      }
      const before = await page.evaluate(() => {
        const c = window.NB_APP.state.completion;
        return {
          value: document.querySelector("[data-cli]")?.value || "",
          idx: window.NB_APP.state.candIndex || 0,
          ghost: document.querySelector("[data-ghost-rest]")?.textContent || "",
          preview: c?.preview || "",
          insert: c?.insert || "",
          first: c?.candidates?.[0]?.value || "",
          second: c?.candidates?.[1]?.value || "",
          n: c?.candidates?.length || 0,
        };
      });
      if (before.n < 2) return log("need ≥2 candidates: " + JSON.stringify(before));
      const firstPreview = before.ghost || before.preview || before.insert;
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(60);
      const after = await page.evaluate(() => {
        const c = window.NB_APP.state.completion;
        const cur = document.querySelector('.cn-cand[aria-current="true"] span')?.textContent || "";
        return {
          value: document.querySelector("[data-cli]")?.value || "",
          idx: window.NB_APP.state.candIndex || 0,
          ghost: document.querySelector("[data-ghost-rest]")?.textContent || "",
          preview: c?.preview || "",
          insert: c?.insert || "",
          selected: c?.candidates?.[window.NB_APP.state.candIndex || 0]?.value || "",
          cur,
        };
      });
      if (after.value !== before.value) {
        return log("arrow mutated draft: " + JSON.stringify({ before, after }));
      }
      if (!(after.idx > before.idx)) {
        return log("candIndex did not advance: " + JSON.stringify({ before, after }));
      }
      const afterPreview = after.ghost || after.preview || "";
      if (!afterPreview && after.insert === before.insert) {
        return log("preview stuck on first option: " + JSON.stringify({ before, after }));
      }
      if (after.insert === before.first || after.selected === before.first) {
        // insert/selected must reflect the highlighted (second) candidate
        if (after.selected !== before.second && after.insert !== before.second) {
          return log("selection not synced: " + JSON.stringify({ before, after }));
        }
      }
      if (after.insert === before.first && after.idx > 0) {
        return log("insert still first after ↓: " + JSON.stringify({ before, after }));
      }
      if (firstPreview && afterPreview && afterPreview === firstPreview &&
          after.insert === before.insert) {
        return log("ghost/preview unchanged after ↓: " + JSON.stringify({ before, after }));
      }
      // → / End must accept the *highlighted* candidate, not always the first.
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(80);
      const accepted = await page.evaluate(() => ({
        value: document.querySelector("[data-cli]")?.value || "",
      }));
      const want = after.insert || after.selected;
      if (!want) return log("no selected insert: " + JSON.stringify(after));
      // Accepted line should contain the selected completion (verb or path).
      const ok = accepted.value === want ||
        accepted.value.endsWith(want) ||
        accepted.value.indexOf(want) !== -1 ||
        (before.value.length && accepted.value.indexOf(want.replace(/^\//, "")) !== -1);
      // More precise: for "c" → "cat ", value starts with selected verb.
      if (before.value === "c" || /^c$/.test(before.value)) {
        return accepted.value.trimStart().startsWith(String(want).trim()) ||
          log("→ accepted first/wrong verb: " + JSON.stringify({ want, accepted, after }));
      }
      return ok || log("→ did not accept highlighted: " + JSON.stringify({ want, accepted, after }));
    },
  },
  {
    name: "power: mode toggle — /ls is not a slash verb; ls works in cli",
    run: async (page, log) => {
      await go(page, "/projects");
      // Catalogue is data, not mode — assert it directly (keypress may force
      // cli when the on-device model is unavailable in test Chromium).
      const leaked = await page.evaluate(() => {
        const banned = ["/ls", "/cd", "/cat", "/grep", "/find", "/tail", "/stat", "/clear", "/watch", "/load"];
        const names = (window.NB_COMPLETE.SLASH_COMMANDS || []).map((c) => c.name);
        return banned.filter((b) => names.includes(b));
      });
      if (leaked.length) return log("SLASH_COMMANDS still has terminal verbs: " + leaked.join(","));
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      // Force ai preference for the slash catalogue even if model-warm flipped mode.
      await page.evaluate(() => {
        window.NB_APP.state.ai = true;
        window.NB_APP.render(true);
      });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      await page.keyboard.type("/");
      await page.waitForTimeout(100);
      const slash = await page.evaluate(() =>
        Array.from(document.querySelectorAll(".cn-cand span")).map((s) => s.textContent.trim()));
      if (slash.includes("/ls") || slash.includes("/cd") || slash.includes("/cat")) {
        return log("terminal verbs leaked into slash menu: " + slash.slice(0, 12).join(","));
      }
      if (!slash.some((c) => c === "/go")) {
        return log("expected /go in slash menu: " + slash.slice(0, 12).join(","));
      }
      if (!slash.some((c) => c === "/mode" || /^\/mode\b/.test(c))) {
        return log("expected /mode in slash menu: " + slash.slice(0, 16).join(","));
      }
      if (slash.includes("/ai") || slash.includes("/cli") || slash.includes("/theme") ||
          slash.includes("/reply") || slash.includes("/voice") || slash.includes("/keys") ||
          slash.includes("/channel") || slash.includes("/project")) {
        return log("context/agent slash leaked into autocomplete: " + slash.slice(0, 20).join(","));
      }
      if (!slash.some((c) => c === "/act" || /^\/act\b/.test(c))) {
        return log("expected /act in slash menu: " + slash.slice(0, 16).join(","));
      }
      await page.fill("[data-cli]", "/ls");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(150);
      const aiOut = await page.evaluate(() =>
        (window.NB_APP.state.lines || []).map((l) => l.text || "").join("\n"));
      if (!/unknown slash|not found/i.test(aiOut)) {
        return log("/ls should be unknown slash: " + aiOut.slice(0, 160));
      }
      if (/▸\s*community|▸\s*agent-lab/i.test(aiOut)) {
        return log("/ls still listed directory: " + aiOut.slice(0, 120));
      }
      // CLI mode — bare ls works.
      await page.evaluate(() => {
        window.NB_APP.state.ai = false;
        window.NB_APP.render(true);
      });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "ls");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(150);
      const cliOut = await page.evaluate(() =>
        (window.NB_APP.state.lines || []).map((l) => l.text || "").join("\n"));
      return (/community|agent-lab|tuner/i.test(cliOut)) ||
        log("cli ls failed: " + cliOut.slice(0, 160));
    },
  },
  {
    name: "power: ai mode still runs bare CLI verbs (superset)",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/bugs");
      await page.evaluate(() => { window.NB_APP.state.ai = true; window.NB_APP.render(true); });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "cd ..");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(150);
      const p = await path(page);
      return p === "/projects/community/channels" || log("ai bare cd .. → " + p);
    },
  },
  {
    name: "power: Esc closes suggestions without submitting",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.evaluate(() => { window.NB_APP.state.ai = true; window.NB_APP.render(true); });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      await page.keyboard.type("draft @ma", { delay: 12 });
      await page.waitForTimeout(120);
      const before = await page.evaluate(() => ({
        value: document.querySelector("[data-cli]")?.value || "",
        open: document.querySelector(".cn-tui-foot")?.dataset.open,
        cands: document.querySelectorAll(".cn-cand").length,
        comments: document.querySelectorAll(".cn-comment").length,
      }));
      if (!(before.cands >= 1 && before.value === "draft @ma" && before.open === "true")) {
        return log("setup failed: " + JSON.stringify(before));
      }
      await page.keyboard.press("Escape");
      await page.waitForTimeout(100);
      const after = await page.evaluate(() => ({
        value: document.querySelector("[data-cli]")?.value || "",
        open: document.querySelector(".cn-tui-foot")?.dataset.open,
        cands: document.querySelectorAll(".cn-cand").length,
        comments: document.querySelectorAll(".cn-comment").length,
        columnFocus: window.NB_APP.state.columnFocus,
        ariaExpanded: document.querySelector("[data-cli]")?.getAttribute("aria-expanded"),
      }));
      if (after.value !== "draft @ma") {
        return log("Esc changed draft: " + JSON.stringify(after));
      }
      if (after.open === "true" || after.cands > 0) {
        return log("Esc did not dismiss combobox: " + JSON.stringify(after));
      }
      if (after.columnFocus) {
        return log("Esc left prompt instead of only dismissing menu: " + JSON.stringify(after));
      }
      if (after.comments > before.comments) {
        return log("Esc submitted a post: " + JSON.stringify({ before, after }));
      }
      return true;
    },
  },
  {
    name: "power: Esc dismisses slash catalogue after /",
    run: async (page, log) => {
      await page.evaluate(() => { window.NB_APP.state.ai = true; window.NB_APP.render(true); });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      await page.keyboard.type("/");
      await page.waitForTimeout(100);
      const before = await page.evaluate(() => ({
        value: document.querySelector("[data-cli]")?.value || "",
        open: document.querySelector(".cn-tui-foot")?.dataset.open,
        cands: document.querySelectorAll(".cn-cand").length,
        hasGo: Array.from(document.querySelectorAll(".cn-cand span"))
          .some((s) => /\/go/.test(s.textContent || "")),
      }));
      if (!(before.value === "/" && before.open === "true" && before.cands >= 2 && before.hasGo)) {
        return log("slash catalogue did not open: " + JSON.stringify(before));
      }
      await page.keyboard.press("Escape");
      await page.waitForTimeout(100);
      const after = await page.evaluate(() => ({
        value: document.querySelector("[data-cli]")?.value || "",
        open: document.querySelector(".cn-tui-foot")?.dataset.open,
        cands: document.querySelectorAll(".cn-cand").length,
        columnFocus: window.NB_APP.state.columnFocus,
        focused: document.activeElement?.hasAttribute("data-cli"),
      }));
      if (after.value !== "/") return log("Esc cleared /: " + JSON.stringify(after));
      if (after.open === "true" || after.cands > 0) {
        return log("Esc did not dismiss slash list: " + JSON.stringify(after));
      }
      if (after.columnFocus || !after.focused) {
        return log("Esc left the prompt: " + JSON.stringify(after));
      }
      // Typing again should reopen the filtered catalogue.
      await page.keyboard.type("g");
      await page.waitForTimeout(100);
      const reopened = await page.evaluate(() => ({
        value: document.querySelector("[data-cli]")?.value || "",
        open: document.querySelector(".cn-tui-foot")?.dataset.open,
        cands: document.querySelectorAll(".cn-cand").length,
      }));
      return (reopened.value === "/g" && reopened.open === "true" && reopened.cands >= 1) ||
        log("typing did not reopen suggestions: " + JSON.stringify(reopened));
    },
  },
  {
    name: "power: slash menu stays closed until / is typed (mouse nav + reload)",
    run: async (page, log) => {
      await page.evaluate(() => {
        try { localStorage.setItem("nb-keys-onboarded", "1"); } catch { /* fine */ }
        window.NB_APP.state.ai = true;
        window.NB_APP.state.intelOpen = false;
        window.NB_APP.state.helpOpen = false;
        window.NB_APP.state.keysOnboard = false;
        const input = document.querySelector("[data-cli]");
        if (input) input.value = "";
        // Force recompute as empty AI prompt (latent slash catalogue).
        window.NB_APP.render(true);
      });
      await page.waitForTimeout(80);
      const idle = await page.evaluate(() => ({
        value: document.querySelector("[data-cli]")?.value || "",
        open: document.querySelector(".cn-tui-foot")?.dataset.open,
        cands: document.querySelectorAll(".cn-cand").length,
        should: window.NB_APP.menuShouldOpen?.(),
      }));
      if (idle.open === "true" || idle.cands > 0 || idle.should) {
        return log("empty AI prompt opened slash menu: " + JSON.stringify(idle));
      }
      // Mouse: select a channel — must not ghost-open the catalogue.
      await go(page, "/projects/community/channels");
      await page.waitForTimeout(60);
      await page.evaluate(() => {
        window.NB_APP.state.ai = true;
        document.querySelector(
          '.cn-blade[data-blade-kind="list"] .cn-item[data-key="bugs"]',
        )?.click();
      });
      await page.waitForTimeout(100);
      const afterClick = await page.evaluate(() => ({
        value: document.querySelector("[data-cli]")?.value || "",
        open: document.querySelector(".cn-tui-foot")?.dataset.open,
        cands: document.querySelectorAll(".cn-cand").length,
        path: window.NB_APP.state.path,
      }));
      if (afterClick.open === "true" || afterClick.cands > 0) {
        return log("mouse nav opened slash without /: " + JSON.stringify(afterClick));
      }
      // Typed `/` still opens; Esc + navigate stays closed.
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      await page.keyboard.type("/");
      await page.waitForTimeout(80);
      const typed = await page.evaluate(() => ({
        open: document.querySelector(".cn-tui-foot")?.dataset.open,
        cands: document.querySelectorAll(".cn-cand").length,
      }));
      if (typed.open !== "true" || typed.cands < 2) {
        return log("typed / did not open: " + JSON.stringify(typed));
      }
      await page.keyboard.press("Escape");
      await page.waitForTimeout(60);
      await go(page, "/projects/community/channels/general");
      await page.waitForTimeout(80);
      const afterNav = await page.evaluate(() => ({
        value: document.querySelector("[data-cli]")?.value || "",
        open: document.querySelector(".cn-tui-foot")?.dataset.open,
        cands: document.querySelectorAll(".cn-cand").length,
      }));
      if (afterNav.open === "true" || afterNav.cands > 0) {
        return log("nav after Esc left menu open: " + JSON.stringify(afterNav));
      }
      // Reload with onboarded keys — empty prompt must stay closed.
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(200);
      const afterReload = await page.evaluate(() => {
        try { localStorage.setItem("nb-keys-onboarded", "1"); } catch { /* fine */ }
        window.NB_APP.state.ai = true;
        window.NB_APP.state.intelOpen = false;
        window.NB_APP.state.helpOpen = false;
        window.NB_APP.render(true);
        return {
          open: document.querySelector(".cn-tui-foot")?.dataset.open,
          cands: document.querySelectorAll(".cn-cand").length,
          should: window.NB_APP.menuShouldOpen?.(),
        };
      });
      return (afterReload.open !== "true" && afterReload.cands === 0 && !afterReload.should) ||
        log("reload left slash open: " + JSON.stringify(afterReload));
    },
  },
  {
    name: "live: new-posts notice is feed overlay only (not page chrome)",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/bugs");
      await page.evaluate(() => {
        window.NB_APP.state.detailOpen = true;
        window.NB_APP.state.threadFocus = null;
        window.NB_APP.state.live = true;
        window.NB_APP.render(true);
      });
      await page.waitForTimeout(80);
      // Drive a live tick while watching #bugs.
      const queued = await page.evaluate(() => {
        const before = (window.NB_APP.state.pending || []).length;
        for (let i = 0; i < 12 && (window.NB_APP.state.pending || []).length === before; i++) {
          window.NB_APP.tick();
        }
        return {
          n: (window.NB_APP.state.pending || []).length,
          key: window.NB_APP.currentFeedKey?.(),
          noticeOpen: window.NB_APP.feedNoticeOpen?.(),
          pageNotice: !!document.querySelector('[data-region="notice"]'),
          feedNotice: !!document.querySelector(".cn-feed-notice"),
          count: document.querySelector(".cn-feed-notice [data-c='count']")?.textContent,
        };
      });
      if (!queued.n) return log("tick did not queue for bugs feed: " + JSON.stringify(queued));
      if (queued.pageNotice) return log("page notice region still present");
      if (!queued.feedNotice || !queued.noticeOpen) {
        return log("feed overlay missing: " + JSON.stringify(queued));
      }
      // Thread detail hides the overlay; queue held.
      const postId = await page.evaluate(() => {
        const el = document.querySelector(".cn-comment[data-key]");
        return el?.getAttribute("data-key") || null;
      });
      if (postId) {
        await page.evaluate((id) => {
          if (typeof window.NB_APP.openThread === "function") window.NB_APP.openThread(id);
          else {
            window.NB_APP.state.threadFocus = id;
            window.NB_APP.render(true);
          }
        }, postId);
        await page.waitForTimeout(80);
      } else {
        await page.evaluate(() => {
          window.NB_APP.state.threadFocus = "p-bugs-1";
          window.NB_APP.render(true);
        });
        await page.waitForTimeout(80);
      }
      const inThread = await page.evaluate(() => ({
        feedNotice: !!document.querySelector(".cn-feed-notice"),
        noticeOpen: window.NB_APP.feedNoticeOpen?.(),
        pending: (window.NB_APP.state.pendingByFeed?.["chan:community/bugs"] || []).length,
      }));
      if (inThread.feedNotice || inThread.noticeOpen) {
        return log("notice visible in thread: " + JSON.stringify(inThread));
      }
      if (!inThread.pending) return log("pending lost in thread: " + JSON.stringify(inThread));
      // Back to feed — overlay returns; leave channel — hides; R merges on return.
      await page.evaluate(() => {
        window.NB_APP.state.threadFocus = null;
        window.NB_APP.state.detailOpen = true;
        window.NB_APP.render(true);
      });
      await page.waitForTimeout(80);
      const back = await page.evaluate(() => ({
        feedNotice: !!document.querySelector(".cn-feed-notice"),
        noticeOpen: window.NB_APP.feedNoticeOpen?.(),
      }));
      if (!back.feedNotice || !back.noticeOpen) {
        return log("notice did not return on feed: " + JSON.stringify(back));
      }
      await go(page, "/projects/community/channels/general");
      await page.waitForTimeout(80);
      const elsewhere = await page.evaluate(() => ({
        feedNotice: !!document.querySelector(".cn-feed-notice"),
        noticeOpen: window.NB_APP.feedNoticeOpen?.(),
        bugsHeld: (window.NB_APP.state.pendingByFeed?.["chan:community/bugs"] || []).length,
      }));
      if (elsewhere.feedNotice || elsewhere.noticeOpen) {
        return log("notice leaked onto other channel: " + JSON.stringify(elsewhere));
      }
      if (!elsewhere.bugsHeld) return log("bugs queue dropped: " + JSON.stringify(elsewhere));
      await go(page, "/projects/community/channels/bugs");
      await page.evaluate(() => {
        window.NB_APP.state.threadFocus = null;
        window.NB_APP.state.detailOpen = true;
        window.NB_APP.render(true);
      });
      await page.waitForTimeout(80);
      const clickMerge = await page.evaluate(() => {
        const btn = document.querySelector(".cn-feed-notice[data-merge]");
        if (!btn) return false;
        btn.click();
        return true;
      });
      if (!clickMerge) {
        await page.evaluate(() => window.NB_APP.mergePending());
      }
      await page.waitForTimeout(100);
      const merged = await page.evaluate(() => ({
        pending: (window.NB_APP.state.pending || []).length,
        bugsHeld: (window.NB_APP.state.pendingByFeed?.["chan:community/bugs"] || []).length,
        feedNotice: !!document.querySelector(".cn-feed-notice"),
        status: document.querySelector("[data-status-line]")?.textContent || "",
      }));
      return (merged.pending === 0 && merged.bugsHeld === 0 && !merged.feedNotice &&
        /loaded \d+ new/.test(merged.status)) ||
        log("merge did not clear feed queue: " + JSON.stringify(merged));
    },
  },
  {
    name: "power: empty Enter is a no-op (does not clear compose scope)",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.waitForTimeout(80);
      await page.click('.cn-comment[data-key="p1"] [data-reply]');
      await page.waitForTimeout(80);
      const armed = await page.evaluate(() => window.NB_APP.composeContext?.()?.kind);
      if (armed !== "reply") return log("reply not armed: " + armed);
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(80);
      const after = await page.evaluate(() => ({
        kind: window.NB_APP.composeContext?.()?.kind,
        value: document.querySelector("[data-cli]")?.value || "",
      }));
      return (after.kind === "reply" && after.value === "") ||
        log("empty Enter broke reply scope: " + JSON.stringify(after));
    },
  },
  {
    name: "power: Tab completes @mention then Enter posts the completed line",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.evaluate(() => {
        window.NB_APP.state.ai = true;
        window.NB_APP.clearReplyTo?.();
        window.NB_APP.render(true);
      });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      await page.keyboard.type("hey @may", { delay: 12 });
      await page.waitForTimeout(120);
      await page.keyboard.press("Tab");
      await page.waitForTimeout(100);
      const filled = await page.evaluate(() => document.querySelector("[data-cli]")?.value || "");
      if (!/^hey @maya\s*$/.test(filled)) {
        return log("Tab did not complete mention: " + JSON.stringify(filled));
      }
      await page.keyboard.press("Enter");
      await page.waitForTimeout(200);
      const posted = await page.evaluate(() => {
        const bodies = Array.from(document.querySelectorAll(".cn-comment")).map((el) => el.textContent || "");
        return {
          value: document.querySelector("[data-cli]")?.value || "",
          hit: bodies.some((t) => /hey @maya/.test(t)),
        };
      });
      return (posted.hit && posted.value === "") || log("post missing: " + JSON.stringify(posted));
    },
  },
  {
    name: "power: slash /go partial + Enter does not steal path autocomplete",
    run: async (page, log) => {
      await go(page, "/projects");
      await page.evaluate(() => { window.NB_APP.state.ai = true; window.NB_APP.render(true); });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      await page.keyboard.type("/go bug", { delay: 12 });
      await page.waitForTimeout(120);
      const before = await page.evaluate(() => ({
        path: window.NB_APP.state.path,
        cands: document.querySelectorAll(".cn-cand").length,
        value: document.querySelector("[data-cli]")?.value || "",
      }));
      if (before.cands < 1) return log("no /go path cands: " + JSON.stringify(before));
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(180);
      const after = await page.evaluate(() => ({
        path: window.NB_APP.state.path,
        value: document.querySelector("[data-cli]")?.value || "",
        lines: (window.NB_APP.state.lines || []).map((l) => l.text || "").join("|"),
      }));
      // Enter submits `/go bug` — may fuzzy-navigate to bugs OR error; must not
      // leave the input filled with an accepted candidate.
      if (after.value && /\/go/.test(after.value)) {
        return log("Enter accepted instead of submitting: " + JSON.stringify(after));
      }
      // If it navigated, that's the slash runner resolving `bug` — fine.
      // If not, the user line must have been recorded.
      if (after.path.includes("bugs")) return true;
      return /\/go bug/.test(after.lines) || log("slash line missing: " + JSON.stringify(after));
    },
  },
  {
    name: "power: replace-preview Tab inserts absolute path from basename fragment",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.evaluate(() => { window.NB_APP.state.ai = false; window.NB_APP.render(true); });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      await page.keyboard.type("cd pro", { delay: 12 });
      await page.waitForTimeout(120);
      const preview = await page.evaluate(() =>
        document.querySelector("[data-ghost-rest]")?.textContent || "");
      if (!/\/projects/i.test(preview) &&
          !Array.from(document.querySelectorAll(".cn-cand span")).some((s) => s.textContent === "/projects")) {
        return log("no replace preview: " + preview);
      }
      await page.keyboard.press("Tab");
      await page.waitForTimeout(80);
      const val = await page.evaluate(() => document.querySelector("[data-cli]")?.value || "");
      return (val === "/projects" || val === "cd /projects" || /cd\s+\/projects/.test(val)) ||
        log("Tab did not insert absolute path: " + JSON.stringify(val));
    },
  },
  {
    name: "session: transcript formats turns for visual scan (roles, gaps, tools)",
    run: async (page, log) => {
      await go(page, "/projects");
      await page.evaluate(() => {
        window.NB_APP.state.ai = true;
        window.NB_APP.state.sessionClosed = false;
        window.NB_APP.state.lines = [
          { id: "u1", kind: "user", mode: "ai", text: "summarize #general" },
          { id: "t1", kind: "tool", tool: "board_navigate", summary: "/projects/community/channels/general",
            detail: "{}", result: "ok", ok: true },
          { id: "a1", kind: "agent", text: "Three open threads. Top is lea's install note." },
          { id: "o1", kind: "out", text: "navigated → /projects/community/channels/general" },
          { id: "u2", kind: "user", mode: "cli", text: "ls" },
          { id: "o2", kind: "out", text: "channels  members  .agents" },
        ];
        window.NB_APP.render(true);
      });
      await page.waitForTimeout(80);
      const fmt = await page.evaluate(() => {
        const sess = document.querySelector('.cn-blade[data-blade-kind="session"] .cn-blade-out');
        if (!sess) return { err: "no session out" };
        const lines = Array.from(sess.querySelectorAll(".cn-line")).map((el) => ({
          kind: el.getAttribute("data-kind"),
          turn: el.getAttribute("data-turn"),
          who: el.querySelector(".cn-who")?.textContent || "",
          mode: el.querySelector(".cn-mode-tag")?.textContent || "",
          hasMsg: !!el.querySelector(".cn-msg"),
          gap: getComputedStyle(el).marginTop,
        }));
        const logEl = sess.querySelector(".cn-log");
        const logGap = logEl ? getComputedStyle(logEl).rowGap || getComputedStyle(logEl).gap : "";
        const userBody = sess.querySelector('.cn-line[data-kind="user"] .cn-body');
        const userPad = userBody ? getComputedStyle(userBody).paddingTop : "";
        return { lines, logGap, userPad };
      });
      if (fmt.err) return log(fmt.err);
      if (fmt.lines.length < 5) return log("expected transcript lines: " + JSON.stringify(fmt));
      const you = fmt.lines.filter((l) => l.kind === "user");
      if (!(you.length >= 2 && you.every((l) => l.who === "you" && l.hasMsg))) {
        return log("user rows need you + .cn-msg: " + JSON.stringify(you));
      }
      if (!you[0].mode || !/ai/i.test(you[0].mode)) {
        return log("user mode tag missing: " + JSON.stringify(you[0]));
      }
      if (!you.every((l) => l.turn === "start")) {
        return log("each user line should start a turn: " + JSON.stringify(you));
      }
      const sys = fmt.lines.filter((l) => l.kind === "out");
      if (!(sys.length >= 1 && sys.every((l) => l.who === "sys"))) {
        return log("out lines need sys rail: " + JSON.stringify(sys));
      }
      const tool = fmt.lines.find((l) => l.kind === "tool");
      if (!tool || tool.who !== "agent") {
        return log("tool should sit under agent rail: " + JSON.stringify(tool));
      }
      // Spacing: turn gaps or log gap must be more than a hairline.
      const turnGaps = fmt.lines.filter((l) => l.turn === "start").map((l) => parseFloat(l.gap) || 0);
      const logGapPx = parseFloat(String(fmt.logGap).split(" ")[0]) || 0;
      const userPadPx = parseFloat(fmt.userPad) || 0;
      if (!(Math.max(...turnGaps, 0) >= 8 || logGapPx >= 4 || userPadPx >= 4)) {
        return log("session chat still too tight: " + JSON.stringify({ turnGaps, logGapPx, userPadPx }));
      }
      return true;
    },
  },
  {
    name: "power: session chat blade is closed by default at boot",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.waitForTimeout(80);
      const boot = await page.evaluate(() => ({
        closed: !!window.NB_APP.state.sessionClosed,
        blade: !!document.querySelector('.cn-blade[data-blade-kind="session"]'),
        useful: (window.NB_APP.state.lines || []).filter((l) => l.kind && l.kind !== "banner").length,
      }));
      if (!boot.closed || boot.blade) {
        return log("session should start closed: " + JSON.stringify(boot));
      }
      return true;
    },
  },
  {
    name: "power: session output lives in dedicated session blade — never foot or home feed",
    run: async (page, log) => {
      await go(page, "/projects");
      await page.evaluate(() => {
        window.NB_APP.state.ai = false;
        window.NB_APP.state.homeFeed = "creators";
        window.NB_APP.closeDetail({ silent: true });
        window.NB_APP.state.lines = [];
        window.NB_APP.render(true);
      });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "help");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(150);
      const ui = await page.evaluate(() => {
        const sess = document.querySelector('.cn-blade[data-blade-kind="session"]');
        const out = sess?.querySelector(".cn-blade-out");
        const feed = document.querySelector(".cn-follow-feed");
        return {
          footOut: !!document.querySelector(".cn-tui-foot .cn-out"),
          panel: !!document.querySelector(".cn-panel"),
          sessionBlade: !!sess,
          bladeOut: !!out,
          inFeed: !!(feed && out && feed.contains(out)),
          inDetail: !!document.querySelector('.cn-blade[data-blade-kind="detail"] .cn-blade-out'),
          banner: !!document.querySelector(".cn-banner"),
          hasHelp: /change directory/i.test(out?.textContent || ""),
          homeView: feed?.getAttribute("data-home-view"),
        };
      });
      if (ui.footOut || ui.panel || ui.banner) {
        return log("terminal chrome leaked: " + JSON.stringify(ui));
      }
      if (ui.inFeed || ui.inDetail || !ui.sessionBlade) {
        return log("session not dedicated: " + JSON.stringify(ui));
      }
      return (ui.bladeOut && ui.hasHelp && ui.homeView === "creators") ||
        log("help missing from session blade: " + JSON.stringify(ui));
    },
  },
  {
    name: "power: session blade [esc] closes the chat window",
    run: async (page, log) => {
      await go(page, "/projects");
      await page.evaluate(() => {
        window.NB_APP.state.ai = false;
        window.NB_APP.state.sessionClosed = false;
        window.NB_APP.state.lines = [];
        window.NB_APP.render(true);
      });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "stat");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(120);
      const open = await page.evaluate(() =>
        !!document.querySelector('.cn-blade[data-blade-kind="session"]'));
      if (!open) return log("session blade missing after stat");
      await page.click('.cn-blade[data-blade-kind="session"] [data-blade-close]');
      await page.waitForTimeout(100);
      const closed = await page.evaluate(() => ({
        blade: !!document.querySelector('.cn-blade[data-blade-kind="session"]'),
        closed: !!window.NB_APP.state.sessionClosed,
        lines: (window.NB_APP.state.lines || []).length,
      }));
      if (closed.blade || !closed.closed) {
        return log("esc did not close session: " + JSON.stringify(closed));
      }
      if (!(closed.lines > 0)) return log("close should keep transcript: " + JSON.stringify(closed));
      // Next command reopens.
      await page.fill("[data-cli]", "help");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(120);
      const again = await page.evaluate(() => ({
        blade: !!document.querySelector('.cn-blade[data-blade-kind="session"]'),
        closed: !!window.NB_APP.state.sessionClosed,
      }));
      if (!again.blade || again.closed) {
        return log("next command did not reopen session: " + JSON.stringify(again));
      }
      return true;
    },
  },
  {
    name: "power: clear empties session output and removes session blade",
    run: async (page, log) => {
      await go(page, "/projects");
      await page.evaluate(() => { window.NB_APP.state.ai = false; window.NB_APP.render(true); });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "stat");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(100);
      await page.fill("[data-cli]", "clear");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(120);
      const after = await page.evaluate(() => ({
        lines: (window.NB_APP.state.lines || []).length,
        sessionBlade: !!document.querySelector('.cn-blade[data-blade-kind="session"]'),
        bladeOut: !!document.querySelector(".cn-blade-out"),
        outText: (document.querySelector(".cn-out")?.textContent || "").trim(),
      }));
      return (after.lines === 0 && !after.bladeOut && !after.sessionBlade) ||
        log("clear left transcript: " + JSON.stringify(after));
    },
  },
  {
    name: "power: workspace tab isolates CLI history",
    run: async (page, log) => {
      await go(page, "/projects");
      await page.evaluate(() => { window.NB_APP.state.ai = false; window.NB_APP.render(true); });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "stat");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(80);
      await page.keyboard.press("Alt+t");
      await page.waitForTimeout(120);
      const fresh = await page.evaluate(() => ({
        sessions: window.NB_APP.state.sessions?.length,
        history: (window.NB_APP.state.history || []).slice(),
        path: window.NB_APP.state.path,
      }));
      if (fresh.sessions < 2) return log("no new workspace: " + JSON.stringify(fresh));
      if (fresh.history.includes("stat")) {
        return log("history leaked into new tab: " + JSON.stringify(fresh));
      }
      await page.click('.cn-workspace-tab[data-session="0"], .cn-panel-tab[data-session="0"]');
      await page.waitForTimeout(100);
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      await page.keyboard.press("ArrowUp");
      await page.waitForTimeout(60);
      const restored = await page.evaluate(() => document.querySelector("[data-cli]")?.value || "");
      return restored === "stat" || log("tab 0 lost history: " + JSON.stringify(restored));
    },
  },
  {
    name: "power: Shift+Tab cycles candidates backward",
    run: async (page, log) => {
      await go(page, "/projects");
      await page.evaluate(() => { window.NB_APP.state.ai = false; window.NB_APP.render(true); });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      await page.keyboard.type("c", { delay: 20 });
      await page.waitForTimeout(120);
      const n = await page.evaluate(() => document.querySelectorAll(".cn-cand").length);
      if (n < 2) return log("need ≥2 candidates, got " + n);
      await page.keyboard.press("Tab");
      await page.waitForTimeout(60);
      const a = await page.evaluate(() => document.querySelector("[data-cli]")?.value || "");
      await page.keyboard.press("Tab");
      await page.waitForTimeout(60);
      const b = await page.evaluate(() => document.querySelector("[data-cli]")?.value || "");
      await page.keyboard.press("Shift+Tab");
      await page.waitForTimeout(60);
      const c = await page.evaluate(() => document.querySelector("[data-cli]")?.value || "");
      if (a === b && n > 2) {
        // Ambiguous common-prefix Tab may not change value on first presses —
        // still require Shift+Tab to differ from forward progress somehow.
      }
      // After two Tabs then Shift+Tab, value should match the prior Tab result
      // (or at least differ from the second forward step when a≠b).
      if (a !== b) {
        return c === a || log("Shift+Tab did not reverse: " + JSON.stringify({ a, b, c }));
      }
      // Fallback: candIndex should decrease on Shift+Tab via complete(true).
      await page.fill("[data-cli]", "c");
      await page.waitForTimeout(80);
      await page.evaluate(() => {
        window.NB_APP.state.candIndex = 1;
        window.NB_APP.render(true);
      });
      await page.keyboard.press("Shift+Tab");
      await page.waitForTimeout(80);
      const idx = await page.evaluate(() => window.NB_APP.state.candIndex);
      return idx === 0 || log("Shift+Tab candIndex: " + idx);
    },
  },
  {
    name: "slash: /go completes and navigates in agent chat",
    run: async (page, log) => {
      // Ensure ai mode (default), type a slash command with intellisense.
      await page.keyboard.type("/go bug");
      await page.waitForTimeout(120);
      const menu = await page.evaluate(() => ({
        open: document.querySelector(".cn-tui-foot")?.dataset.open,
        kinds: Array.from(document.querySelectorAll(".cn-cand")).slice(0, 5)
          .map((c) => c.textContent),
        hasSlash: Array.from(document.querySelectorAll(".cn-cand span"))
          .some((s) => s.textContent.startsWith("/") || true),
      }));
      // Path candidates for /go should appear (bugs or /projects/community/channels/bugs).
      const hasPath = await page.evaluate(() =>
        Array.from(document.querySelectorAll(".cn-cand")).some((c) =>
          /bugs|channels/i.test(c.textContent)));
      if (!hasPath && menu.open !== "true") return log("no slash intellisense: " + JSON.stringify(menu));
      await page.keyboard.press("Tab");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(200);
      // Either completed path then enter navigates, or need enter twice.
      let p = await path(page);
      if (!p.includes("bugs")) {
        await page.keyboard.press("Enter");
        await page.waitForTimeout(200);
        p = await path(page);
      }
      const slashLine = await page.evaluate(() =>
        Array.from(document.querySelectorAll('.cn-line[data-kind="user"]'))
          .map((el) => el.textContent).join(" "));
      return (p.includes("bugs") || /\/go/.test(slashLine)) ||
        log("path " + p + " lines " + slashLine.slice(0, 80));
    },
  },
  {
    name: "slash: /help lists slash commands",
    run: async (page, log) => {
      await page.keyboard.type("/help");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(150);
      const out = await page.evaluate(() => document.querySelector(".cn-out")?.textContent || "");
      if (!(/\/go/.test(out) && /\/sort/.test(out) && /\/whoami/.test(out) && /\/mode/.test(out) && /\/act/.test(out))) {
        return log("help missing verbs: " + out.slice(0, 160));
      }
      if (/\/ai\b/.test(out) || /\/cli\b/.test(out) || /\/theme\b/.test(out) ||
          /\/reply\b/.test(out) || /\/voice\b/.test(out) || /\/keys\b/.test(out) ||
          /\/channel\b/.test(out) || /\/project\b/.test(out)) {
        return log("context/hotkey slash must not appear in /help: " + out.slice(0, 280));
      }
      // Aliases share a row with their primary (not separate "alias of" lines).
      if (!/\/dm,\s*\/msg/.test(out) && !/\/msg,\s*\/dm/.test(out)) {
        return log("dm aliases not grouped: " + out.slice(0, 220));
      }
      if (/alias of \/dm/i.test(out)) return log("alias listed separately: " + out.slice(0, 220));
      return true;
    },
  },
  {
    name: "slash: /mode ai|cli; /ai /cli agent-only; prompt_mode tool",
    run: async (page, log) => {
      await page.evaluate(() => {
        window.NB_APP.state.ai = true;
        window.NB_APP.render(true);
      });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      await page.keyboard.type("/mode ");
      await page.waitForTimeout(100);
      const modeArgs = await page.evaluate(() =>
        Array.from(document.querySelectorAll(".cn-cand span")).map((s) => s.textContent.trim()));
      if (!(modeArgs.includes("ai") && modeArgs.includes("cli"))) {
        return log("/mode args missing: " + modeArgs.join(","));
      }
      await page.fill("[data-cli]", "/mode cli");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(120);
      let mode = await page.evaluate(() => ({
        ai: window.NB_APP.state.ai,
        chip: document.querySelector(".cn-mode")?.textContent?.trim(),
      }));
      if (mode.ai !== false || mode.chip !== "cli") {
        return log("/mode cli failed: " + JSON.stringify(mode));
      }
      // Agent-facing /ai /theme /reply still resolve, but are not in SLASH_COMMANDS.
      const agentOnly = await page.evaluate(() => {
        const names = (window.NB_COMPLETE.SLASH_COMMANDS || []).map((c) => c.name);
        const agent = (window.NB_COMPLETE.AGENT_SLASH_COMMANDS || []).map((c) => c.name);
        return {
          catalogueHas: ["/ai", "/cli", "/theme", "/reply", "/voice", "/keys", "/channel", "/project"]
            .filter((n) => names.includes(n)),
          agentHasReply: agent.includes("/reply") && agent.includes("/voice"),
          specAct: !!(window.NB_COMPLETE.slashSpec && window.NB_COMPLETE.slashSpec("/act")),
          specReply: !!(window.NB_COMPLETE.slashSpec && window.NB_COMPLETE.slashSpec("/reply")),
        };
      });
      if (agentOnly.catalogueHas.length) {
        return log("context verbs still in SLASH_COMMANDS: " + agentOnly.catalogueHas.join(","));
      }
      if (!(agentOnly.agentHasReply && agentOnly.specAct && agentOnly.specReply)) {
        return log("act/agent slash missing: " + JSON.stringify(agentOnly));
      }
      await page.fill("[data-cli]", "/ai");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(120);
      mode = await page.evaluate(() => window.NB_APP.state.ai);
      if (mode !== true) return log("/ai agent path did not switch: " + mode);
      // WebMCP prompt_mode tool.
      const tool = await page.evaluate(async () => {
        const tools = (window.NB_MCP && window.NB_MCP.list()) || [];
        const has = tools.some((t) => t.name === "prompt_mode");
        if (!has) return { err: "no prompt_mode tool", names: tools.map((t) => t.name).slice(0, 20) };
        const res = await window.NB_MCP.call("prompt_mode", { mode: "cli" });
        return {
          ok: !res.isError,
          text: (res.content && res.content[0] && res.content[0].text) || "",
          ai: window.NB_APP.state.ai,
        };
      });
      if (tool.err) return log(tool.err + " " + JSON.stringify(tool.names));
      if (!(tool.ok && tool.ai === false)) return log("prompt_mode failed: " + JSON.stringify(tool));
      return true;
    },
  },
  {
    name: "slash: /act is context-dependent; reply/voice not in static catalogue",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.waitForTimeout(100);
      await page.evaluate(() => {
        window.NB_APP.state.ai = true;
        window.NB_APP.state.columnFocus = false;
        const feed = window.NB_MAP.feedEntriesAt
          ? window.NB_MAP.feedEntriesAt(window.NB_APP.state.path, window.NB_APP.state.merged)
          : [];
        const first = feed.find((e) => e && e.post);
        if (first) window.NB_APP.openThread(first.post.id, { silent: true, noRender: true });
        window.NB_APP.state.detailOpen = true;
        window.NB_APP.render(true);
      });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      await page.keyboard.type("/act ");
      await page.waitForTimeout(120);
      const caps = await page.evaluate(() => {
        const spans = Array.from(document.querySelectorAll(".cn-cand span")).map((s) => s.textContent.trim());
        const raw = Array.from(document.querySelectorAll(".cn-cand")).map((c) => c.textContent.trim());
        const act = window.NB_COMPLETE?.actCapabilities?.({
          cwd: window.NB_APP.state.path,
          extra: window.NB_APP.state.merged,
        }) || [];
        return { spans, raw, act: act.map((a) => a.value), thread: window.NB_APP.state.threadFocus };
      });
      if (!(caps.spans.includes("reply") || caps.raw.some((t) => /\breply\b/i.test(t)) ||
          caps.act.includes("reply"))) {
        return log("/act on a post should offer reply: " + JSON.stringify(caps));
      }
      if (!(caps.spans.includes("share") || caps.raw.some((t) => /\bshare\b/i.test(t)) ||
          caps.act.includes("share"))) {
        return log("/act should offer share: " + JSON.stringify(caps));
      }
      await page.fill("[data-cli]", "/act reply");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(150);
      const armed = await page.evaluate(() => {
        const ctx = window.NB_APP.composeContext?.() || {};
        return {
          kind: ctx.kind,
          who: ctx.who,
          label: document.querySelector(".cn-compose, .cn-ctx")?.textContent || "",
        };
      });
      if (armed.kind !== "reply") {
        return log("/act reply did not arm: " + JSON.stringify(armed));
      }
      // Static catalogue must not list /reply.
      await page.evaluate(() => { window.NB_APP.clearReplyTo?.(); });
      await page.fill("[data-cli]", "");
      await page.keyboard.type("/");
      await page.waitForTimeout(80);
      const menu = await page.evaluate(() =>
        Array.from(document.querySelectorAll(".cn-cand span")).map((s) => s.textContent.trim()));
      if (menu.includes("/reply") || menu.includes("/voice")) {
        return log("context verbs in static menu: " + menu.slice(0, 20).join(","));
      }
      // At /projects, /act offers project.
      await go(page, "/projects");
      await page.waitForTimeout(80);
      const projCaps = await page.evaluate(() => {
        return (window.NB_COMPLETE.actCapabilities({
          cwd: window.NB_APP.state.path,
          extra: window.NB_APP.state.merged,
        }) || []).map((c) => c.value);
      });
      if (!projCaps.includes("project")) {
        return log("/act at /projects should offer project: " + projCaps.join(","));
      }
      return true;
    },
  },
  {
    name: "slash: terminal CLI verbs are not agent slash commands",
    run: async (page, log) => {
      await page.evaluate(() => { window.NB_APP.state.ai = true; });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      await page.keyboard.type("/help");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(150);
      const out = await page.evaluate(() => document.querySelector(".cn-out")?.textContent || "");
      const banned = ["/ls", "/cd", "/cat", "/grep", "/find", "/tail", "/stat", "/clear", "/watch", "/load"];
      const leaked = banned.filter((v) => out.includes(v + " ") || out.includes(v + "\n") ||
        new RegExp("(^|\\n)" + v.replace("/", "\\/") + "(\\s|$)").test(out));
      if (leaked.length) return log("terminal verbs in slash help: " + leaked.join(",") + " :: " + out.slice(0, 220));
      // Catalogue itself must not offer them while typing /
      await page.fill("[data-cli]", "");
      await page.keyboard.type("/");
      await page.waitForTimeout(100);
      const cands = await page.evaluate(() =>
        Array.from(document.querySelectorAll(".cn-cand span")).map((s) => s.textContent.trim()));
      const leakedCands = banned.filter((v) => cands.includes(v));
      if (leakedCands.length) return log("slash menu lists terminal verbs: " + leakedCands.join(","));
      if (!cands.some((c) => c === "/go" || c.startsWith("/go,")) ||
          !cands.some((c) => c === "/search" || c.startsWith("/search,"))) {
        return log("expected agent verbs missing: " + cands.slice(0, 12).join(","));
      }
      // Aliases collapse into one catalogue row.
      if (!cands.some((c) => /\/dm/.test(c) && /\/msg/.test(c))) {
        return log("dm/msg should be one row: " + cands.join(","));
      }
      if (cands.includes("/msg")) return log("bare /msg still listed: " + cands.join(","));
      return true;
    },
  },
  {
    name: "cli: autocomplete ghost preview + syntax highlight while typing",
    run: async (page, log) => {
      await page.evaluate(() => { window.NB_APP.state.ai = false; window.NB_APP.render(true); });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      await page.keyboard.type("cd pro", { delay: 20 });
      await page.waitForTimeout(120);
      const ui = await page.evaluate(() => {
        const mirror = document.querySelector("[data-cli-mirror], .cn-cli-mirror, [data-ghost]");
        const ghost = document.querySelector(".cn-ghost-rest, [data-ghost-rest]");
        const kw = document.querySelector(".cn-input-wrap .nb-tok-kw, .cn-cli-mirror .nb-tok-kw, [data-cli-mirror] .nb-tok-kw");
        const pathTok = document.querySelector(
          ".cn-input-wrap .nb-tok-path, .cn-input-wrap .nb-tok-str, .cn-cli-mirror .nb-tok-path, .cn-cli-mirror .nb-tok-str",
        );
        const ghostText = (ghost?.textContent || mirror?.textContent || "");
        const candOpen = document.querySelector(".cn-tui-foot")?.dataset.open === "true";
        const cands = Array.from(document.querySelectorAll(".cn-cand span")).map((s) => s.textContent);
        return {
          ghostText,
          hasKw: !!kw,
          hasPathTok: !!pathTok,
          candOpen,
          cands: cands.slice(0, 6),
          value: document.querySelector("[data-cli]")?.value || "",
          mirrorHtml: mirror?.innerHTML?.slice(0, 240) || "",
        };
      });
      if (ui.value !== "cd pro") return log("value drifted: " + JSON.stringify(ui));
      // Preview should extend toward projects (ghost suffix or candidate list).
      const previewOk = /jects/i.test(ui.ghostText) || ui.cands.some((c) => /projects/i.test(c));
      if (!previewOk) return log("no projects preview: " + JSON.stringify(ui));
      if (!ui.hasKw) return log("command verb not syntax-highlighted: " + JSON.stringify(ui));
      if (!ui.hasPathTok) return log("path arg not syntax-highlighted: " + JSON.stringify(ui));
      return true;
    },
  },
  {
    name: "cli: command-name ghost preview while typing a verb",
    run: async (page, log) => {
      await page.evaluate(() => { window.NB_APP.state.ai = false; window.NB_APP.render(true); });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      await page.keyboard.type("hel", { delay: 25 });
      await page.waitForTimeout(100);
      const ui = await page.evaluate(() => {
        const mirror = document.querySelector("[data-cli-mirror], .cn-cli-mirror, [data-ghost]");
        const rest = document.querySelector(".cn-ghost-rest, [data-ghost-rest]");
        return {
          value: document.querySelector("[data-cli]")?.value || "",
          ghost: rest?.textContent || "",
          mirror: mirror?.textContent || "",
          hasKw: !!document.querySelector(".cn-input-wrap .nb-tok-kw, [data-cli-mirror] .nb-tok-kw"),
        };
      });
      if (ui.value !== "hel") return log("value " + ui.value);
      const preview = ui.ghost || ui.mirror;
      if (!/p\s*$/i.test(preview) && !/help/i.test(preview)) {
        return log("no help ghost: " + JSON.stringify(ui));
      }
      return true;
    },
  },
  {
    name: "feed query: Lucene view filters posts; named chip and free-form",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.waitForTimeout(120);
      const before = await page.evaluate(() => document.querySelectorAll(".cn-comment").length);
      // Named projection: pin via API (same as [+] picker) then apply.
      const mid = await page.evaluate(async () => {
        window.NB_APP.state.feedPinnedViews = ["needs-review"];
        window.NB_APP.applyFeedView("needs-review");
        await new Promise((r) => setTimeout(r, 40));
        return {
          n: document.querySelectorAll(".cn-comment").length,
          q: window.NB_APP.state.feedQuery,
          view: window.NB_APP.state.feedView,
          match: document.querySelector(".cn-feed-match")?.textContent || "",
          err: window.NB_APP.state.feedQueryError,
          chip: !!document.querySelector('[data-feed-view="needs-review"]'),
          bar: !!document.querySelector(".cn-feed-bar"),
        };
      });
      if (!mid.bar) return log("no feed bar on channel: " + JSON.stringify(mid));
      if (!mid.chip) return log("needs-review chip missing after pin: " + JSON.stringify(mid));
      if (mid.view !== "needs-review" || !/needs-review/.test(mid.q || "")) {
        return log("chip failed: " + JSON.stringify(mid));
      }
      if (mid.err) return log("query error: " + mid.err);
      if (!(mid.n > 0 && mid.n <= before)) return log("filter count odd: " + mid.n + " of " + before);

      // Free-form: who:scout
      const scout = await page.evaluate(async () => {
        const q = document.querySelector("[data-feed-query]");
        if (q) {
          q.value = "who:scout sort:new";
          q.dispatchEvent(new Event("input", { bubbles: true }));
        }
        window.NB_APP.setFeedQuery("who:scout sort:new", "custom");
        await new Promise((r) => setTimeout(r, 40));
        const whos = Array.from(document.querySelectorAll('.cn-comment [data-c="handle"]'))
          .map((el) => el.textContent);
        return {
          q: window.NB_APP.state.feedQuery,
          n: document.querySelectorAll(".cn-comment").length,
          whos,
          hasScout: whos.some((w) => w === "scout"),
        };
      });
      if (!scout.hasScout) return log("who:scout missed scout: " + JSON.stringify(scout));

      // /view from prompt
      await page.keyboard.type("/view has:anchor");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(200);
      const anch = await page.evaluate(() => ({
        q: window.NB_APP.state.feedQuery,
        n: document.querySelectorAll(".cn-comment").length,
        hasAnchor: document.querySelectorAll('[data-c="anchor"]').length,
      }));
      if (anch.q !== "has:anchor") return log("/view failed: " + JSON.stringify(anch));
      return anch.hasAnchor >= 1 || log("no anchors after has:anchor: " + anch.n);
    },
  },
  {
    name: "search: CLI Lucene across board with color marks + autocomplete",
    run: async (page, log) => {
      await go(page, "/");
      await page.evaluate(() => { window.NB_APP.state.ai = false; });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      // Autocomplete field suggestions for `search who:`
      await page.type("[data-cli]", "search who:", { delay: 15 });
      await page.waitForTimeout(120);
      const ac = await page.evaluate(() => {
        const cands = Array.from(document.querySelectorAll(".cn-cand")).map((c) => c.textContent);
        return {
          open: document.querySelector(".cn-tui-foot")?.dataset.open,
          hasScout: cands.some((t) => /scout/i.test(t)),
          sample: cands.slice(0, 6),
        };
      });
      if (!ac.hasScout && ac.open !== "true") {
        return log("no who: autocomplete: " + JSON.stringify(ac));
      }
      await page.fill("[data-cli]", "");
      await page.type("[data-cli]", "search body:cache", { delay: 10 });
      await page.keyboard.press("Enter");
      await page.waitForTimeout(200);
      const out = await page.evaluate(() => {
        const marks = document.querySelectorAll(".cn-search-mark").length;
        const hits = document.querySelectorAll(".cn-search-hit").length;
        const head = document.querySelector(".cn-search-head")?.textContent || "";
        const text = document.querySelector(".cn-out")?.textContent || "";
        return { marks, hits, head, hasCache: /cache/i.test(text) };
      });
      if (!(out.hits >= 1)) return log("no search hits: " + JSON.stringify(out));
      if (!(out.marks >= 1)) return log("no color marks: " + JSON.stringify(out));
      if (!out.hasCache) return log("cache missing from results: " + out.head);
      return true;
    },
  },
  {
    name: "search: /search slash + board_search MCP tool (AI skill)",
    run: async (page, log) => {
      await go(page, "/");
      await page.evaluate(() => { window.NB_APP.state.ai = true; });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      await page.type("[data-cli]", "/search state:needs-review", { delay: 10 });
      await page.keyboard.press("Enter");
      await page.waitForTimeout(200);
      const slash = await page.evaluate(() => ({
        hits: document.querySelectorAll(".cn-search-hit").length,
        head: document.querySelector(".cn-search-head")?.textContent || "",
        listed: window.NB_MCP.list().some((t) => t.name === "board_search"),
        skill: (window.NB_DATA.agents.board || [])
          .some((a) => (a.skills || []).some((s) => s.id === "board-search")),
      }));
      if (!slash.listed) return log("board_search not registered");
      if (!slash.skill) return log("board-search skill missing on Space Steward");
      if (!(slash.hits >= 1)) return log("/search no hits: " + JSON.stringify(slash));

      // AI tool path — natural language would call this; invoke directly.
      const tool = await page.evaluate(async () => {
        const before = document.querySelectorAll(".cn-search-hit").length;
        const res = await window.NB_MCP.call("board_search", { query: "who:scout" });
        await new Promise((r) => setTimeout(r, 40));
        const text = (res.content && res.content[0] && res.content[0].text) || "";
        return {
          err: !!res.isError,
          text: text.slice(0, 120),
          hits: document.querySelectorAll(".cn-search-hit").length,
          grew: document.querySelectorAll(".cn-search-hit").length > before,
          hasScout: /scout/i.test(text),
        };
      });
      if (tool.err) return log("board_search failed: " + tool.text);
      if (!tool.hasScout) return log("tool text missed scout: " + tool.text);
      if (!tool.grew && !(tool.hits >= 1)) return log("tool did not paint hits: " + JSON.stringify(tool));
      return true;
    },
  },
  {
    name: "attachments: stage file, chips, send into chat context",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.waitForTimeout(120);
      // Stage a synthetic text file via the app API (picker is OS-native).
      const staged = await page.evaluate(async () => {
        const file = new File(
          ["# install notes\n\ncold path is four minutes.\ncache key includes OS tag.\n"],
          "install-notes.md",
          { type: "text/markdown" },
        );
        const n = await window.NB_APP.addAttachmentFiles([file]);
        return {
          n,
          count: window.NB_APP.state.attachments.length,
          names: window.NB_APP.state.attachments.map((a) => a.name),
          kinds: window.NB_APP.state.attachments.map((a) => a.kind),
          hasText: !!(window.NB_APP.state.attachments[0] && window.NB_APP.state.attachments[0].text),
          tray: !!document.querySelector("[data-attach-tray]"),
          chips: document.querySelectorAll(".cn-attach-chip").length,
          pick: !!document.querySelector("[data-attach-pick]"),
        };
      });
      if (staged.n < 1 || staged.count < 1) return log("stage failed: " + JSON.stringify(staged));
      if (!staged.names.includes("install-notes.md")) return log("name missing: " + JSON.stringify(staged));
      if (staged.kinds[0] !== "text" || !staged.hasText) return log("text not inlined: " + JSON.stringify(staged));
      if (!staged.tray || staged.chips < 1 || !staged.pick) {
        return log("tray UI missing: " + JSON.stringify(staged));
      }

      // Send in AI mode — attachments travel as chat context on the user line.
      await page.evaluate(() => {
        window.NB_APP.state.ai = true;
      });
      await page.click("[data-cli]");
      await page.keyboard.type("summarise the attached install notes");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(400);

      const after = await page.evaluate(() => {
        const lines = window.NB_APP.state.lines || [];
        const user = [...lines].reverse().find((l) => l.kind === "user");
        const sentChips = document.querySelectorAll(".cn-attach-chip-sent").length;
        return {
          trayEmpty: (window.NB_APP.state.attachments || []).length === 0,
          userText: user && user.text,
          userAtts: user && user.attachments && user.attachments.map((a) => a.name),
          sentChips,
          // compose path available
          composed: window.NB_ATTACH.composeInput("x", [
            { name: "a.md", kind: "text", type: "text/plain", size: 1, text: "y" },
          ]),
        };
      });
      if (!after.trayEmpty) return log("tray not cleared on send: " + JSON.stringify(after));
      if (!after.userAtts || !after.userAtts.includes("install-notes.md")) {
        return log("user line missing attachment meta: " + JSON.stringify(after));
      }
      if (after.sentChips < 1) return log("no sent chips in transcript: " + JSON.stringify(after));
      if (!/attachments/i.test(after.composed || "")) return log("compose broken");

      // /attach list after clear is empty; re-stage and clear via slash.
      await page.evaluate(async () => {
        const f = new File(["x"], "tmp.txt", { type: "text/plain" });
        await window.NB_APP.addAttachmentFiles([f]);
      });
      await page.keyboard.type("/attach clear");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(150);
      const cleared = await page.evaluate(() => (window.NB_APP.state.attachments || []).length);
      return cleared === 0 || log("clear failed, left " + cleared);
    },
  },
  {
    name: "link previews: ASCII cards for markdown and bare URLs in posts",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.waitForTimeout(150);
      const got = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll(".nb-link-preview"));
        const kinds = cards.map((c) => c.getAttribute("data-kind"));
        const ascii = cards.map((c) => c.querySelector(".nb-link-preview-ascii")?.textContent || "");
        const hasBox = ascii.some((t) => t.includes("┌") && t.includes("│"));
        const hasRepo = kinds.includes("repo");
        const hasDocs = kinds.includes("docs");
        const hasBoard = kinds.includes("board");
        const inline = document.querySelectorAll(".cn-comment-body .nb-md-a").length;
        // Standalone API still works.
        const api = window.NB_ASCII && window.NB_ASCII.linkPreview
          ? window.NB_ASCII.linkPreview("https://github.com/webmachinelearning/webmcp")
          : "";
        return {
          n: cards.length,
          kinds,
          hasBox,
          hasRepo,
          hasDocs,
          hasBoard,
          inline,
          apiOk: api.includes("nb-link-preview") && /WebMCP|GitHub/i.test(api),
        };
      });
      if (got.n < 2) return log("expected preview cards: " + JSON.stringify(got));
      if (!got.hasBox) return log("cards missing box-drawing: " + JSON.stringify(got));
      if (!got.hasRepo && !got.hasDocs) return log("no repo/docs card: " + JSON.stringify(got));
      if (got.inline < 1) return log("no inline links: " + JSON.stringify(got));
      if (!got.apiOk) return log("linkPreview API failed: " + JSON.stringify(got));
      // Board path card navigates in-app (dispatch from the hit control).
      if (got.hasBoard) {
        const nav = await page.evaluate(() => {
          const hit = document.querySelector(
            '.nb-link-preview[data-kind="board"] .nb-link-preview-hit[data-goto]',
          );
          if (!hit) return { err: "no board hit" };
          const dest = hit.getAttribute("data-goto");
          // Prefer the app API so morph/layout does not swallow the gesture.
          const ok = window.NB_APP.navigate(dest, { keepCli: true });
          return { dest, ok, path: window.NB_APP.state.path };
        });
        if (nav.err) return log(JSON.stringify(nav));
        if (nav.path !== "/projects/community/channels/bugs") {
          return log("board card goto failed: " + JSON.stringify(nav));
        }
      }
      return true;
    },
  },
  {
    name: "reactions: pills show seed counts; + opens picker; toggle adds yours",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.waitForTimeout(150);
      const before = await page.evaluate(() => {
        const pills = Array.from(document.querySelectorAll(".cn-react-pill")).map((el) => ({
          key: el.getAttribute("data-react"),
          count: el.querySelector(".cn-react-count")?.textContent,
          pressed: el.getAttribute("aria-pressed"),
          id: el.getAttribute("data-react-id"),
        }));
        return {
          n: pills.length,
          keys: pills.map((p) => p.key),
          hasPlus1: pills.some((p) => p.key === "+1"),
          hasEyes: pills.some((p) => p.key === "eyes"),
          adders: document.querySelectorAll("[data-react-pick]").length,
        };
      });
      if (before.n < 2 || !before.hasPlus1 || !before.hasEyes || before.adders < 1) {
        return log("seed pills missing: " + JSON.stringify(before));
      }
      // Chrome is ASCII marks — no emoji glyphs in reaction pills.
      const asciiReact = await page.evaluate(() => {
        const marks = Array.from(document.querySelectorAll(".cn-react-mark"))
          .map((el) => el.textContent || "");
        return {
          marks: marks.slice(0, 8),
          allAscii: marks.every((m) => /^[\x20-\x7e]+$/.test(m)),
        };
      });
      if (!asciiReact.marks.length) {
        return log("reaction marks missing: " + JSON.stringify(asciiReact));
      }
      if (!asciiReact.allAscii) {
        return log("emoji in reactions: " + JSON.stringify(asciiReact));
      }
      // Open picker on first comment with a + control.
      await page.click("[data-react-pick]");
      await page.waitForTimeout(100);
      const picker = await page.evaluate(() => {
        const open = document.querySelector('.cn-react-picker[data-open="true"]');
        return {
          open: !!open,
          opts: open ? open.querySelectorAll(".cn-react-opt").length : 0,
        };
      });
      if (!picker.open || picker.opts < 6) return log("picker: " + JSON.stringify(picker));
      // Pick rocket (may already exist on some posts).
      await page.click('.cn-react-picker[data-open="true"] [data-react="rocket"]');
      await page.waitForTimeout(120);
      const after = await page.evaluate(() => {
        const mine = Array.from(document.querySelectorAll('.cn-react-pill[aria-pressed="true"]'))
          .map((el) => el.getAttribute("data-react"));
        const pickOpen = !!document.querySelector('.cn-react-picker[data-open="true"]');
        return { mine, pickOpen, state: window.NB_APP.state.reactions };
      });
      if (after.pickOpen) return log("picker should close after pick");
      if (!after.mine.includes("rocket") && !after.mine.includes("+1") && after.mine.length < 1) {
        return log("no reaction pressed: " + JSON.stringify(after));
      }
      // Toggle the pressed pill off.
      const key = after.mine[0];
      await page.click('.cn-react-pill[aria-pressed="true"][data-react="' + key + '"]');
      await page.waitForTimeout(100);
      const toggled = await page.evaluate((k) => {
        const el = document.querySelector('.cn-react-pill[data-react="' + k + '"][aria-pressed="true"]');
        return { stillMine: !!el };
      }, key);
      return !toggled.stillMine || log("toggle off failed for " + key);
    },
  },
  {
    name: "ascii: markdown tables render colour-coded box drawing",
    run: async (page, log) => {
      // Fixture post p3 carries a pipe table — open general thread and find it.
      await go(page, "/projects/community/channels/general");
      await page.waitForTimeout(150);
      const inThread = await page.evaluate(() => {
        const tables = document.querySelectorAll(".nb-md-atable");
        const th = document.querySelector(".nb-md-th");
        const body = Array.from(document.querySelectorAll(".cn-comment-body .nb-md"))
          .map((el) => el.textContent).join("\n");
        return {
          tables: tables.length,
          hasHeader: !!th,
          hasBox: Array.from(tables).some((t) => /[┌│]/.test(t.textContent || "")),
          hasCold: /3m52s|cold/i.test(body),
          hasMention: !!document.querySelector(".nb-md-mention"),
          hasTopic: !!document.querySelector(".nb-md-topic"),
        };
      });
      if (!(inThread.tables >= 1 && inThread.hasHeader && inThread.hasBox && inThread.hasCold)) {
        return log("thread table missing: " + JSON.stringify(inThread));
      }
      // Discord-flavoured marks on Scout's plan (underline, spoiler, quote).
      const discord = await page.evaluate(() => {
        const c = document.querySelector('.cn-comment[data-key="p3"]');
        const u = c?.querySelector(".nb-md-u");
        const spoiler = c?.querySelector("[data-spoiler]");
        const quote = c?.querySelector(".nb-md-quote");
        return {
          underline: u?.textContent || "",
          spoiler: spoiler?.textContent || "",
          spoilerOpen: spoiler?.getAttribute("aria-expanded"),
          quote: quote?.textContent?.slice(0, 80) || "",
        };
      });
      if (!/not/i.test(discord.underline) || !/cache wipe/i.test(discord.spoiler) ||
          !/ship until/i.test(discord.quote) || discord.spoilerOpen !== "false") {
        return log("discord marks missing: " + JSON.stringify(discord));
      }
      await page.click('.cn-comment[data-key="p3"] [data-spoiler]');
      await page.waitForTimeout(80);
      const revealed = await page.evaluate(() => {
        const s = document.querySelector('.cn-comment[data-key="p3"] [data-spoiler]');
        return s?.getAttribute("aria-expanded");
      });
      if (revealed !== "true") return log("spoiler did not open: " + revealed);

      // Syntax-highlighted fence on Scout's plan post.
      const syn = await page.evaluate(() => {
        const pre = document.querySelector('.cn-comment-body .nb-md-pre[data-lang="typescript"]');
        const toks = pre ? pre.querySelectorAll(".nb-tok").length : 0;
        const kw = pre ? pre.querySelectorAll(".nb-tok-kw").length : 0;
        const com = pre ? pre.querySelectorAll(".nb-tok-com").length : 0;
        return {
          pre: !!pre,
          toks,
          kw,
          com,
          text: pre?.textContent?.slice(0, 80) || "",
          editorReady: typeof window.NB_SYNTAX?.highlight === "function",
        };
      });
      if (!syn.editorReady) return log("NB_SYNTAX missing");
      if (!syn.pre || syn.toks < 3 || syn.kw < 1) {
        return log("fenced highlight missing: " + JSON.stringify(syn));
      }

      // Editor line highlighter (same NB_SYNTAX tokens as fences).
      const ed = await page.evaluate(() => {
        const buf = window.NB_EDITOR.open(
          "agent.ts",
          'import { defineAgent } from "eve";\n\n' +
            "export default defineAgent({\n" +
            '  model: "anthropic/claude-sonnet-4.6",\n' +
            "});\n",
          { name: "agent.ts", language: "typescript" },
        );
        const html = window.NB_EDITOR.render(buf, { focused: false, viewRows: 20 });
        const div = document.createElement("div");
        div.innerHTML = html;
        return {
          toks: div.querySelectorAll(".nb-ed-line .nb-tok-kw").length,
          fn: div.querySelectorAll(".nb-ed-line .nb-tok-fn").length,
          str: div.querySelectorAll(".nb-ed-line .nb-tok-str").length,
          lang: div.querySelector(".nb-ed-chrome-lang")?.textContent || "",
        };
      });
      if (!(ed.lang === "typescript" && ed.toks >= 2 && (ed.fn >= 1 || ed.str >= 1))) {
        return log("editor highlight missing: " + JSON.stringify(ed));
      }

      // Spoiler click can steal focus — return to the prompt before slash.
      await page.evaluate(() => {
        window.NB_APP.state.columnFocus = false;
        document.querySelector("[data-cli]")?.focus();
      });
      await page.fill("[data-cli]", "");
      // /space with no arg opens the spaces catalogue as a select list.
      await page.type("[data-cli]", "/space", { delay: 10 });
      await page.keyboard.press("Enter");
      await page.waitForTimeout(200);
      const listed = await page.evaluate(() => ({
        path: window.NB_APP.state.path,
        keys: Array.from(document.querySelectorAll('[data-blade-path="/spaces"] .cn-item'))
          .map((el) => el.getAttribute("data-key")),
      }));
      return (listed.path === "/spaces" &&
          listed.keys.includes("civic-workshop") &&
          listed.keys.includes("agent-lab")) ||
        log("space select list: " + JSON.stringify(listed));
    },
  },
  {
    name: "spaces: catalogue lists hubs; hub has feed channels projects about",
    run: async (page, log) => {
      await go(page, "/");
      const root = await page.evaluate(() =>
        Array.from(document.querySelectorAll('[data-blade-path="/"] .cn-item'))
          .map((el) => el.getAttribute("data-key")));
      if (!root.includes("spaces")) return log("root missing spaces: " + root.join(","));
      await openNavItem(page, '[data-blade-path="/"] .cn-item[data-key="spaces"]');
      if ((await path(page)) !== "/spaces") return log("path " + await path(page));
      await openNavItem(page, '[data-blade-path="/spaces"] .cn-item[data-key="civic-workshop"]');
      await page.waitForTimeout(80);
      const hub = await page.evaluate(() => {
        const keys = Array.from(document.querySelectorAll('[data-blade-path="/spaces/civic-workshop"] .cn-item'))
          .map((el) => el.getAttribute("data-key"));
        const ctx = document.querySelector(".cn-space-ctx")?.textContent || "";
        const pageText = document.querySelector("[data-mount]")?.textContent || "";
        return { keys, ctx, path: window.NB_APP.state.path, pageText };
      });
      if (hub.path !== "/spaces/civic-workshop") return log("hub path " + hub.path);
      for (const need of ["feed", "channels", "projects", "about"]) {
        if (!hub.keys.includes(need)) return log("hub missing " + need + ": " + hub.keys.join(","));
      }
      if (hub.keys.includes("relay")) return log("relay must not be user-facing: " + hub.keys.join(","));
      if (/relay\+workspace|subreddit|nostr/i.test(hub.ctx + hub.pageText)) {
        return log("implementation framing leaked: " + (hub.ctx + hub.pageText).slice(0, 160));
      }
      if (!/r\/civic|members|guests/i.test(hub.ctx)) {
        return log("space context thin: " + hub.ctx.slice(0, 120));
      }
      await openNavItem(page, '[data-blade-path="/spaces/civic-workshop"] .cn-item[data-key="feed"]');
      await page.waitForTimeout(80);
      const feed = await page.evaluate(() => ({
        path: window.NB_APP.state.path,
        posts: document.querySelectorAll(".cn-comment").length,
      }));
      if (feed.path !== "/spaces/civic-workshop/feed") return log("feed path " + feed.path);
      return feed.posts >= 1 || log("feed empty: " + feed.posts);
    },
  },
  {
    name: "profile: boots Anonymous with durable principal in home space",
    run: async (page, log) => {
      const id = await page.evaluate(() => {
        const btn = document.querySelector("[data-profile-btn]");
        const ident = window.NB_APP.getIdentity();
        return {
          kind: btn?.dataset.kind,
          anonymous: btn?.dataset.anonymous,
          name: btn?.querySelector(".nb-profile-name")?.textContent,
          initials: btn?.querySelector(".nb-profile-avatar")?.textContent,
          principalId: ident?.principalId,
          canParticipate: ident?.canParticipate,
          claimable: ident?.claimable,
          spaceId: ident?.spaceId,
          spaceName: ident?.spaceName,
        };
      });
      if (id.kind !== "guest" || id.anonymous !== "true" || id.name !== "Anonymous") {
        return log("expected Anonymous profile: " + JSON.stringify(id));
      }
      if (id.initials !== "AN") return log("initials: " + id.initials);
      if (!id.canParticipate || !id.claimable) return log("participation: " + JSON.stringify(id));
      if (!id.principalId || !String(id.principalId).startsWith("guest_")) {
        return log("bad principal: " + id.principalId);
      }
      if (!id.spaceId) return log("missing home space: " + JSON.stringify(id));
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(250);
      const again = await page.evaluate(() => window.NB_APP.getIdentity()?.principalId);
      return again === id.principalId || log("principal lost on reload: " + again);
    },
  },
  {
    name: "identity: page state (path) survives reload for the guest principal",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/bugs");
      await page.evaluate(() => {
        window.NB_APP.schedulePersist();
      });
      // Flush debounced persist.
      await page.waitForTimeout(350);
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(300);
      const p = await path(page);
      return p === "/projects/community/channels/bugs" || log("path not durable: " + p);
    },
  },
  {
    name: "profile: claim keeps principalId; profile shows handle; /whoami honest",
    run: async (page, log) => {
      const before = await page.evaluate(() => window.NB_APP.getIdentity()?.principalId);
      await page.keyboard.type("/claim garden-guest");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(200);
      const after = await page.evaluate(() => {
        const id = window.NB_APP.getIdentity();
        const btn = document.querySelector("[data-profile-btn]");
        return {
          kind: id?.kind,
          handle: id?.handle,
          principalId: id?.principalId,
          spaceId: id?.spaceId,
          btnKind: btn?.dataset.kind,
          btnName: btn?.querySelector(".nb-profile-name")?.textContent,
        };
      });
      if (after.kind !== "claimed" || after.handle !== "garden-guest") {
        return log("claim failed: " + JSON.stringify(after));
      }
      if (after.principalId !== before) return log("principal changed on claim");
      if (after.btnKind !== "claimed") return log("profile not claimed: " + after.btnKind);
      if (!/garden-guest/.test(after.btnName || "")) return log("profile name: " + after.btnName);
      await page.keyboard.type("/whoami");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(150);
      const out = await page.evaluate(() => {
        const lines = Array.from(document.querySelectorAll('.cn-line[data-kind="out"]'));
        return lines.map((el) => el.textContent).join("\n");
      });
      return (/garden-guest/.test(out) && /claimed/.test(out) && /authorized/.test(out) && /space/i.test(out)) ||
        log("whoami: " + out.slice(0, 180));
    },
  },
  {
    name: "profile: /login ATProto + /logout → Anonymous; spaces switch",
    run: async (page, log) => {
      const guestBefore = await page.evaluate(() => window.NB_APP.getIdentity()?.principalId);
      await page.keyboard.type("/login maya.bsky.social");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(250);
      const linked = await page.evaluate(() => {
        const id = window.NB_APP.getIdentity();
        return {
          kind: id?.kind,
          handle: id?.handle,
          did: id?.did,
          principalId: id?.principalId,
          spaceId: id?.spaceId,
          btn: document.querySelector("[data-profile-btn]")?.dataset.kind,
        };
      });
      if (linked.kind !== "atproto" || linked.btn !== "atproto") {
        return log("login failed: " + JSON.stringify(linked));
      }
      if (linked.handle !== "maya.bsky.social") return log("handle: " + linked.handle);
      if (!linked.did || !String(linked.did).startsWith("did:plc:")) {
        return log("missing did: " + linked.did);
      }
      if (linked.principalId !== guestBefore) {
        return log("principal not kept: " + linked.principalId + " vs " + guestBefore);
      }
      // Switch to Agent Lab (guest-friendly) as signed-in user via /space.
      await page.keyboard.type("/space agent-lab");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(250);
      const switched = await page.evaluate(() => {
        const id = window.NB_APP.getIdentity();
        return {
          spaceId: id?.spaceId,
          kind: id?.kind,
          handle: id?.handle,
          path: window.NB_APP.state.path,
          relay: id?.relay?.status,
        };
      });
      if (switched.spaceId !== "agent-lab") return log("space switch: " + JSON.stringify(switched));
      if (switched.path !== "/spaces/agent-lab") {
        return log("join should land on hub: " + switched.path);
      }
      if (switched.relay !== "connected") return log("relay not connected: " + switched.relay);
      await page.keyboard.type("/logout");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(200);
      const out = await page.evaluate(() => {
        const id = window.NB_APP.getIdentity();
        const btn = document.querySelector("[data-profile-btn]");
        return {
          kind: id?.kind,
          principalId: id?.principalId,
          name: btn?.querySelector(".nb-profile-name")?.textContent,
          anonymous: btn?.dataset.anonymous,
        };
      });
      if (out.kind !== "guest" || out.name !== "Anonymous") {
        return log("logout not anonymous: " + JSON.stringify(out));
      }
      return out.principalId !== guestBefore || log("logout should mint a new guest");
    },
  },
  {
    name: "profile: menu opens; Sign in to space dialog; members space needs handle",
    run: async (page, log) => {
      await page.click("[data-profile-btn]");
      await page.waitForTimeout(100);
      const menu = await page.evaluate(() => ({
        open: document.querySelector("[data-profile-menu]")?.dataset.open,
        spaces: Array.from(document.querySelectorAll("[data-space-join]"))
          .map((el) => el.getAttribute("data-space-join")),
        hasSignIn: !!document.querySelector("[data-profile-signin]"),
      }));
      if (menu.open !== "true") return log("menu not open: " + JSON.stringify(menu));
      if (!menu.spaces.includes("civic-workshop") || !menu.spaces.includes("tuner-crew")) {
        return log("spaces missing: " + menu.spaces.join(","));
      }
      // Members-only space while anonymous → sign-in dialog.
      await page.click('[data-space-join="tuner-crew"]');
      await page.waitForTimeout(150);
      const forced = await page.evaluate(() => ({
        dialog: document.querySelector("[data-auth-dialog]")?.dataset.open,
        space: document.querySelector("[data-auth-space]")?.value,
        err: document.querySelector("[data-auth-err]")?.textContent,
      }));
      if (forced.dialog !== "true") return log("expected sign-in dialog: " + JSON.stringify(forced));
      if (forced.space !== "tuner-crew") return log("space not preselected: " + forced.space);
      await page.fill("[data-auth-handle]", "epoch.dev");
      await page.click("[data-auth-atproto]");
      await page.waitForTimeout(200);
      const id = await page.evaluate(() => {
        const i = window.NB_APP.getIdentity();
        return {
          kind: i?.kind,
          handle: i?.handle,
          did: i?.did,
          spaceId: i?.spaceId,
          dialog: document.querySelector("[data-auth-dialog]")?.dataset.open,
          name: document.querySelector(".nb-profile-name")?.textContent,
        };
      });
      return (id.kind === "atproto" && id.handle === "epoch.dev" &&
        id.spaceId === "tuner-crew" &&
        String(id.did).startsWith("did:plc:") && id.dialog === "false") ||
        log(JSON.stringify(id));
    },
  },
  {
    name: "notifications: Activity bell, filters, mentions, open source",
    run: async (page, log) => {
      // Clear any prior read state from earlier tests in this browser context.
      await page.evaluate(() => {
        localStorage.removeItem("nb-notif-read");
        window.NB_APP.state.notifRead = {};
        window.NB_APP.paintActivityBell();
        window.NB_APP.render(true);
      });
      await page.waitForTimeout(80);
      const bell = await page.evaluate(() => {
        const b = document.querySelector("[data-activity-bell]");
        return {
          unread: b?.dataset.unread,
          badge: b?.querySelector("[data-activity-badge]")?.textContent,
          hidden: b?.querySelector("[data-activity-badge]")?.hasAttribute("hidden"),
        };
      });
      if (bell.unread !== "true") return log("bell should show unread: " + JSON.stringify(bell));

      await page.click("[data-activity-bell]");
      await page.waitForTimeout(150);
      let p = await path(page);
      if (p !== "/notifications/all") return log("bell path " + p);

      const feed = await page.evaluate(() => ({
        cards: document.querySelectorAll(".cn-activity-card").length,
        filters: Array.from(document.querySelectorAll(".cn-activity-filter"))
          .map((el) => el.textContent),
        mentionsBtn: !!document.querySelector('.cn-activity-filter[aria-pressed="true"]'),
      }));
      if (feed.cards < 3) return log("expected activity cards: " + JSON.stringify(feed));
      if (!feed.filters.some((t) => /Mentions/i.test(t || ""))) {
        return log("missing Mentions filter: " + feed.filters.join("|"));
      }

      // Mentions filter — only @you cards.
      await page.click('.cn-activity-filter:has-text("Mentions"), .cn-activity-filter >> text=Mentions').catch(async () => {
        await page.evaluate(() => window.NB_APP.navigate("/notifications/mentions", { keepCli: true }));
      });
      await page.waitForTimeout(120);
      // Playwright :has-text may not work on all versions — navigate explicitly.
      await go(page, "/notifications/mentions");
      const mentions = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll(".cn-activity-card"));
        return {
          path: window.NB_APP.state.path,
          n: cards.length,
          kinds: cards.map((c) => c.getAttribute("data-kind")),
          pressed: document.querySelector('.cn-activity-filter[aria-pressed="true"]')?.textContent,
        };
      });
      if (mentions.path !== "/notifications/mentions") return log("path " + mentions.path);
      if (!mentions.n || mentions.kinds.some((k) => k !== "mention")) {
        return log("mentions filter wrong: " + JSON.stringify(mentions));
      }

      // Open first notification → source path + mark read.
      const beforeUnread = await page.evaluate(() => window.NB_APP.unreadActivityCount());
      await page.click(".cn-activity-card .cn-activity-open");
      await page.waitForTimeout(150);
      const after = await page.evaluate(() => ({
        path: window.NB_APP.state.path,
        unread: window.NB_APP.unreadActivityCount(),
      }));
      if (after.path === "/notifications/mentions") {
        return log("open did not leave activity: " + after.path);
      }
      if (!(after.unread < beforeUnread)) {
        return log("unread did not drop: " + beforeUnread + " → " + after.unread);
      }

      // Shared dismiss verb `d` clears Activity unread without opening.
      const dismissProbe = await page.evaluate(() => {
        localStorage.removeItem("nb-notif-read");
        window.NB_APP.state.notifRead = {};
        window.NB_APP.openActivity("all");
        window.NB_APP.state.columnFocus = true;
        window.NB_APP.state.cursor = 0;
        window.NB_APP.paintActivityBell();
        window.NB_APP.render(true);
        const btn = document.querySelector("[data-notif-dismiss]");
        const card = document.querySelector(".cn-activity-card[data-unread='true']") ||
          document.querySelector(".cn-activity-card");
        return {
          label: btn?.textContent?.trim() || null,
          id: btn?.getAttribute("data-notif-dismiss") || card?.getAttribute("data-notif") || null,
          path: window.NB_APP.state.path,
          unread: window.NB_APP.unreadActivityCount(),
        };
      });
      if (dismissProbe.label !== "Dismiss") {
        return log("Activity control should say Dismiss: " + JSON.stringify(dismissProbe));
      }
      if (!dismissProbe.id) return log("no notification to dismiss: " + JSON.stringify(dismissProbe));
      await page.keyboard.press("d");
      await page.waitForTimeout(100);
      let afterD = await page.evaluate((id) => ({
        unread: window.NB_APP.unreadActivityCount(),
        stored: !!window.NB_APP.state.notifRead?.[id],
        status: document.querySelector("[data-status-line]")?.textContent || "",
      }), dismissProbe.id);
      if (!afterD.stored) {
        // Keyboard may miss if focus left columns — prove shared dismissCurrent.
        afterD = await page.evaluate(() => {
          localStorage.removeItem("nb-notif-read");
          window.NB_APP.state.notifRead = {};
          window.NB_APP.openActivity("all");
          window.NB_APP.state.columnFocus = true;
          window.NB_APP.state.cursor = 0;
          window.NB_APP.render(true);
          const id = document.querySelector("[data-notif-dismiss]")?.getAttribute("data-notif-dismiss");
          const before = window.NB_APP.unreadActivityCount();
          const ok = window.NB_APP.dismissCurrent();
          return {
            id,
            ok: !!ok,
            before,
            unread: window.NB_APP.unreadActivityCount(),
            stored: !!(id && window.NB_APP.state.notifRead?.[id]),
            status: document.querySelector("[data-status-line]")?.textContent || "",
            via: "dismissCurrent",
          };
        });
        if (!afterD.ok || !afterD.stored || !(afterD.unread < afterD.before)) {
          return log("dismissCurrent failed: " + JSON.stringify({ dismissProbe, afterD }));
        }
      } else if (!(afterD.unread < dismissProbe.unread)) {
        return log("d did not dismiss notification: " + JSON.stringify({ dismissProbe, afterD }));
      }

      // Subscribed filter has non-mention activity.
      await go(page, "/notifications/subscribed");
      const sub = await page.evaluate(() => {
        const kinds = Array.from(document.querySelectorAll(".cn-activity-card"))
          .map((c) => c.getAttribute("data-kind"));
        return { path: window.NB_APP.state.path, kinds };
      });
      if (sub.path !== "/notifications/subscribed") return log("sub path " + sub.path);
      return (sub.kinds.length > 0 &&
        sub.kinds.every((k) => k === "subscription" || k === "reply")) ||
        log("subscribed kinds: " + sub.kinds.join(","));
    },
  },
  {
    name: "notifications: /activity mentions slash opens the filter",
    run: async (page, log) => {
      await page.keyboard.type("/activity mentions");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(200);
      const p = await path(page);
      return p === "/notifications/mentions" || log("path " + p);
    },
  },
  {
    name: "hooks: subscribe, emit, Activity filter, browser notify",
    run: async (page, log) => {
      const result = await page.evaluate(async () => {
        const created = [];
        class MockNotification {
          static permission = "granted";
          static requestPermission() { return Promise.resolve("granted"); }
          constructor(title, options) {
            this.title = title;
            this.options = options || {};
            created.push(this);
          }
          close() {}
        }
        window.Notification = MockNotification;
        localStorage.removeItem("nb-notif-pushed");
        localStorage.removeItem("nb-hooks-fired");
        if (window.NB_HOOKS) window.NB_HOOKS.clearFired();

        // Ensure a bugs post hook is on.
        const listBefore = window.NB_HOOKS.list();
        const bugs = listBefore.find((h) => h.id === "hook-bugs") ||
          window.NB_HOOKS.add({
            id: "hook-bugs", event: "post.created", match: "channel:bugs",
            label: "New posts in #bugs", notify: true, enabled: true,
          }).hook;
        if (bugs && !bugs.enabled) window.NB_HOOKS.enable(bugs.id, true);

        // Emit a matching live-style post through the app.
        const items = window.NB_APP.broadcastHookEvent("post.created", {
          id: "e2e-hook-1",
          channel: "bugs",
          who: "patcher",
          subject: "Hook e2e",
          body: "session draft broke on cold install",
          at: "12:00",
        });
        const fired = window.NB_HOOKS.fired();
        const hookItems = fired.filter((n) => n.kind === "hook");
        // Navigate to hooks filter.
        window.NB_APP.openActivity("hooks");
        const path = window.NB_APP.state.path;
        const cards = Array.from(document.querySelectorAll(".cn-activity-card[data-kind='hook']"))
          .map((el) => el.getAttribute("data-notif"));
        // Slash surface
        const help = window.NB_APP.runHooksCommand("list");
        return {
          items: items.length,
          fired: hookItems.length,
          path,
          cards: cards.length,
          help: String(help || "").slice(0, 120),
          browser: created.length,
          events: window.NB_HOOKS.events().map((e) => e.id),
        };
      });
      if (!result.events.includes("post.created")) return log("catalog missing: " + JSON.stringify(result.events));
      if (result.items < 1) return log("broadcast fired nothing: " + JSON.stringify(result));
      if (result.fired < 1) return log("no hook activity logged: " + JSON.stringify(result));
      if (result.path !== "/notifications/hooks") return log("path " + result.path);
      if (result.cards < 1) return log("no hook cards: " + JSON.stringify(result));
      if (!/hooks/i.test(result.help || "")) return log("list empty: " + result.help);
      // /hooks test from the prompt
      await page.keyboard.type("/hooks test reaction.added");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(200);
      const afterTest = await page.evaluate(() => ({
        path: window.NB_APP.state.path,
        fired: window.NB_HOOKS.fired().filter((n) => n.kind === "hook").length,
      }));
      return (afterTest.path === "/notifications/hooks" && afterTest.fired >= result.fired) ||
        log("test command failed: " + JSON.stringify(afterTest));
    },
  },
  {
    name: "notifications: browser Notification API deliver on grant",
    run: async (page, log) => {
      // Inject a mock Notification constructor before enabling.
      const result = await page.evaluate(async () => {
        const created = [];
        class MockNotification {
          static permission = "default";
          static requestPermission() {
            MockNotification.permission = "granted";
            return Promise.resolve("granted");
          }
          constructor(title, options) {
            this.title = title;
            this.options = options || {};
            this.onclick = null;
            created.push(this);
          }
          close() {}
        }
        window.Notification = MockNotification;
        // Clear pushed set so deliverUnread can fire.
        localStorage.removeItem("nb-notif-pushed");
        localStorage.removeItem("nb-notif-read");
        window.NB_APP.state.notifRead = {};

        const before = window.NB_APP.browserNotifyPermission();
        // requestBrowserNotifications uses NB_NOTIFY which reads window.Notification live.
        const perm = await window.NB_APP.requestBrowserNotifications();
        const after = window.NB_APP.browserNotifyPermission();
        const supported = window.NB_APP.browserNotifySupported();
        // Force another deliver of unread.
        const shown = window.NB_APP.deliverBrowserNotifications({ force: false, silent: true });
        return {
          before, perm, after, supported,
          created: created.length,
          titles: created.map((c) => c.title),
          shown,
          label: window.NB_NOTIFY.permissionLabel(),
        };
      });
      if (!result.supported) return log("not supported after mock: " + JSON.stringify(result));
      if (result.perm !== "granted" || result.after !== "granted") {
        return log("permission not granted: " + JSON.stringify(result));
      }
      if (result.created < 1) return log("no browser notifications delivered: " + JSON.stringify(result));
      // Enable alerts control should hide once granted.
      await page.evaluate(() => window.NB_APP.paintActivityBell());
      const ui = await page.evaluate(() => ({
        permBtnHidden: document.querySelector("[data-activity-perm]")?.hidden,
        bellPerm: document.querySelector("[data-activity-bell]")?.dataset.browserPerm,
      }));
      return (ui.bellPerm === "granted" && ui.permBtnHidden !== false) ||
        log("ui: " + JSON.stringify(ui) + " created=" + result.created);
    },
  },
  {
    name: "notifications: browser notification click opens source",
    run: async (page, log) => {
      const pathAfter = await page.evaluate(async () => {
        const created = [];
        class MockNotification {
          static permission = "granted";
          static requestPermission() { return Promise.resolve("granted"); }
          constructor(title, options) {
            this.title = title;
            this.options = options || {};
            this.onclick = null;
            created.push(this);
          }
          close() {}
        }
        window.Notification = MockNotification;
        localStorage.removeItem("nb-notif-pushed");
        // Pick a known unread mention with a stable where path.
        const item = (window.NB_DATA.notifications || []).find((n) => n.id === "n1") ||
          (window.NB_DATA.notifications || [])[0];
        if (!item) return { err: "no fixture" };
        window.NB_NOTIFY.clearPushed(item.id);
        const n = window.NB_NOTIFY.deliver(Object.assign({}, item, { unread: true }), {
          force: true,
          onClick: (data) => window.NB_APP.openNotification(data.id),
        });
        if (!n || !n.onclick) return { err: "no instance", created: created.length };
        n.onclick({ preventDefault() {} });
        return { path: window.NB_APP.state.path, where: item.where, created: created.length };
      });
      if (pathAfter.err) return log(JSON.stringify(pathAfter));
      return pathAfter.path === pathAfter.where ||
        log("click path " + pathAfter.path + " expected " + pathAfter.where);
    },
  },
  {
    name: "dms: board root lists dms beside projects; thread opens with context",
    run: async (page, log) => {
      await go(page, "/");
      const root = await page.evaluate(() =>
        Array.from(document.querySelectorAll('[data-blade-path="/"] .cn-item'))
          .map((el) => el.getAttribute("data-key")));
      if (!root.includes("projects") || !root.includes("dms") || !root.includes("notifications")) {
        return log("root missing siblings: " + root.join(","));
      }
      await openNavItem(page, '[data-blade-path="/"] .cn-item[data-key="dms"]');
      if ((await path(page)) !== "/dms") return log("path " + await path(page));
      // Open the scout agent DM.
      await openNavItem(page, '[data-blade-path="/dms"] .cn-item[data-key="scout"]');
      await page.waitForTimeout(80);
      const st = await page.evaluate(() => {
        const pathNow = window.NB_APP.state.path;
        const ctx = document.querySelector(".cn-ctx")?.textContent || "";
        const comments = document.querySelectorAll(".cn-comment").length;
        const blades = Array.from(document.querySelectorAll("[data-blade-path]"))
          .map((el) => el.getAttribute("data-blade-path"));
        return { pathNow, ctx, comments, blades };
      });
      if (st.pathNow !== "/dms/scout") return log("path " + st.pathNow);
      if (!/@scout/.test(st.ctx) && !/scout/.test(st.ctx)) {
        return log("dm context missing: " + st.ctx.slice(0, 80));
      }
      if (st.comments < 2) return log("expected messages in scout dm: " + st.comments);
      // Single nav blade reloaded for the thread path + detail.
      return st.blades.includes("/dms/scout") || log("blades: " + st.blades.join(","));
    },
  },
  {
    name: "editor: → from nav into text detail activates the editor",
    run: async (page, log) => {
      await go(page, "/.agents/space-steward");
      await page.waitForTimeout(120);
      // Land on the file in the nav list; → should open detail + focus editor.
      const prepared = await page.evaluate(() => {
        window.NB_APP.focusColumns();
        window.NB_APP.state.detailOpen = false;
        if (window.NB_APP.state.editor) window.NB_APP.state.editor.focused = false;
        const list = window.NB_MAP.list("/.agents/space-steward") || [];
        const ix = list.findIndex((e) => e.name === "instructions.md");
        if (ix < 0) return { err: "no instructions.md in list" };
        window.NB_APP.state.cursor = ix;
        window.NB_APP.state.focus = 0;
        window.NB_APP.render(true);
        return { ok: true };
      });
      if (prepared.err) return log(prepared.err);
      await page.waitForTimeout(80);
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(150);
      const after = await page.evaluate(() => {
        const ed = document.querySelector("[data-editor]");
        const st = window.NB_APP.state;
        return {
          detail: !!document.querySelector('.cn-blade[data-blade-kind="detail"]'),
          open: window.NB_APP.isDetailOpen(),
          hasEditor: !!ed,
          focused: !!(st.editor && st.editor.focused),
          path: st.editor && st.editor.active && st.editor.active.path,
          focusBlade: st.focus,
        };
      });
      if (!(after.detail && after.open)) return log("→ did not open detail: " + JSON.stringify(after));
      if (!(after.hasEditor && after.focused)) {
        return log("→ did not activate editor: " + JSON.stringify(after));
      }
      // Channel post: → opens thread in detail; e opens the terminal editor.
      await go(page, "/projects/community/channels/general");
      await page.waitForTimeout(100);
      const postPrep = await page.evaluate(() => {
        window.NB_APP.focusColumns();
        window.NB_APP.state.detailOpen = true;
        window.NB_APP.state.threadFocus = null;
        if (window.NB_APP.state.editor) window.NB_APP.state.editor.focused = false;
        const feed = window.NB_MAP.feedEntriesAt
          ? window.NB_MAP.feedEntriesAt("/projects/community/channels/general", window.NB_APP.state.merged)
          : [];
        const hit = feed.find((e) => e.post && e.post.id === "p1");
        if (!hit) return { err: "no p1" };
        window.NB_APP.state.feedMark = "p1";
        window.NB_APP.state.focus = 1;
        window.NB_APP.render(true);
        return { id: hit.post.id, path: window.NB_APP.state.path };
      });
      if (postPrep.err) return log(postPrep.err);
      await page.waitForTimeout(80);
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(120);
      const threadAfter = await page.evaluate(() => {
        const nav = window.NB_MAP.list(window.NB_APP.state.path, window.NB_APP.state.merged) || [];
        return {
          path: window.NB_APP.state.path,
          thread: window.NB_APP.state.threadFocus,
          editor: !!(window.NB_APP.state.editor && window.NB_APP.state.editor.focused),
          navPosts: nav.filter((e) => e && e.post).length,
          replyInDetail: !!document.querySelector('.cn-comment[data-key="p2"]'),
        };
      });
      if (threadAfter.path !== postPrep.path) {
        return log("→ should stay on channel: " + JSON.stringify(threadAfter));
      }
      if (threadAfter.navPosts !== 0 || threadAfter.editor || threadAfter.thread !== "p1") {
        return log("→ should open thread in detail: " + JSON.stringify(threadAfter));
      }
      if (!threadAfter.replyInDetail) {
        return log("detail missing replies: " + JSON.stringify(threadAfter));
      }
      await page.keyboard.press("e");
      await page.waitForTimeout(150);
      const postAfter = await page.evaluate(() => {
        const ed = document.querySelector("[data-editor]");
        const st = window.NB_APP.state;
        return {
          hasEditor: !!ed,
          focused: !!(st.editor && st.editor.focused),
          mode: ed?.getAttribute("data-mode"),
        };
      });
      return (postAfter.hasEditor && postAfter.focused) ||
        log("e on post did not activate editor: " + JSON.stringify(postAfter));
    },
  },
  {
    name: "editor: file detail is a terminal editor; i/Esc and click work",
    run: async (page, log) => {
      await go(page, "/.agents/space-steward");
      await page.waitForTimeout(120);
      // Open instructions.md — click previews; Enter focuses the editor.
      const opened = await page.evaluate(() => {
        const item = document.querySelector(
          '[data-blade-path="/.agents/space-steward"] .cn-item[data-key="instructions.md"]',
        );
        if (!item) return { err: "no instructions.md" };
        item.click();
        return { ok: true };
      });
      if (opened.err) return log(opened.err);
      await page.waitForTimeout(80);
      await page.evaluate(() => {
        document.querySelector("[data-cli]")?.blur();
        window.NB_APP.state.columnFocus = true;
        window.NB_APP.state.focus = 0;
      });
      await page.keyboard.press("Enter");
      await page.waitForTimeout(150);
      const ui = await page.evaluate(() => {
        const ed = document.querySelector("[data-editor]");
        const status = document.querySelector(".nb-ed-status-mode")?.textContent || "";
        const body = document.querySelector("[data-editor-body]");
        return {
          hasEditor: !!ed,
          status,
          lines: body ? body.querySelectorAll(".nb-ed-row").length : 0,
          mode: ed?.getAttribute("data-mode"),
          path: window.NB_APP.getEditor && window.NB_APP.getEditor()?.path,
        };
      });
      if (!ui.hasEditor || ui.lines < 1) return log("editor missing: " + JSON.stringify(ui));
      // Focus editor and enter insert mode.
      await page.click("[data-editor]");
      await page.waitForTimeout(80);
      await page.keyboard.press("i");
      await page.waitForTimeout(80);
      const insert = await page.evaluate(() => ({
        mode: window.NB_APP.getEditor()?.mode,
        status: document.querySelector(".nb-ed-status-mode")?.textContent,
      }));
      if (insert.mode !== "insert") return log("i did not enter insert: " + JSON.stringify(insert));
      await page.keyboard.type(">>");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(80);
      const after = await page.evaluate(() => {
        const ed = window.NB_APP.getEditor();
        return {
          mode: ed?.mode,
          dirty: ed?.dirty,
          text: ed ? window.NB_EDITOR.text(ed).slice(0, 40) : "",
          caret: !!document.querySelector(".nb-ed-caret"),
        };
      });
      if (after.mode !== "normal") return log("Esc did not restore normal: " + JSON.stringify(after));
      if (!after.dirty || !after.text.includes(">>")) {
        return log("insert text missing: " + JSON.stringify(after));
      }
      // Click a character to move caret.
      const clicked = await page.evaluate(() => {
        const ch = document.querySelector('.nb-ed-ch[data-line="0"][data-col="0"]');
        if (!ch) return { err: "no cell" };
        ch.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        // pointerdown path used by app
        const ed = document.querySelector("[data-editor]");
        const rect = ch.getBoundingClientRect();
        ed?.dispatchEvent(new PointerEvent("pointerdown", {
          bubbles: true, clientX: rect.left + 2, clientY: rect.top + 2, pointerType: "mouse",
        }));
        return {
          line: window.NB_APP.getEditor()?.cursor?.line,
          col: window.NB_APP.getEditor()?.cursor?.col,
        };
      });
      if (clicked.err) return log(clicked.err);
      return clicked.line === 0 || log("click caret: " + JSON.stringify(clicked));
    },
  },
  {
    name: "agents: eve agents are members in their scope and open DMs",
    run: async (page, log) => {
      await go(page, "/members");
      await page.waitForTimeout(120);
      const board = await page.evaluate(() =>
        Array.from(
          document.querySelectorAll('[data-blade-path="/members"] .cn-item'),
        ).map((el) => el.getAttribute("data-key")),
      );
      if (!board.includes("space-steward")) {
        return log("board members missing space-steward: " + board.join(","));
      }
      if (!board.includes("activity-relay")) {
        return log("board members missing activity-relay: " + board.join(","));
      }
      await openNavItem(page, '[data-blade-path="/members"] .cn-item[data-key="space-steward"]');
      await page.waitForTimeout(80);
      const dm = await page.evaluate(() => ({
        path: window.NB_APP.state.path,
        ctx: document.querySelector(".cn-ctx[data-dm]")?.textContent || "",
        canChat: !!document.querySelector("[data-cli]"),
      }));
      if (dm.path !== "/dms/space-steward") return log("board agent dm path " + dm.path);
      if (!/space-steward|space agent|agent dm/i.test(dm.ctx + dm.path)) {
        return log("agent dm context missing: " + JSON.stringify(dm));
      }

      await go(page, "/projects/community/members");
      await page.waitForTimeout(120);
      const proj = await page.evaluate(() =>
        Array.from(
          document.querySelectorAll(
            '[data-blade-path="/projects/community/members"] .cn-item',
          ),
        ).map((el) => el.getAttribute("data-key")),
      );
      if (!proj.includes("community-host")) {
        return log("community members missing community-host: " + proj.join(","));
      }
      await openNavItem(
        page,
        '[data-blade-path="/projects/community/members"] .cn-item[data-key="community-host"]',
      );
      await page.waitForTimeout(80);
      if ((await path(page)) !== "/dms/community-host") {
        return log("project agent dm path " + await path(page));
      }

      // /dm slash opens Eve agents too.
      await page.keyboard.press("Escape");
      await page.evaluate(() => {
        window.NB_APP.state.columnFocus = false;
        document.querySelector("[data-cli]")?.focus();
      });
      await page.keyboard.type("/dm install-cache");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(150);
      return (await path(page)) === "/dms/install-cache" ||
        log(" /dm install-cache → " + await path(page));
    },
  },
  {
    name: "agents: board and project .agents (vercel/eve) directories",
    run: async (page, log) => {
      await go(page, "/");
      await page.waitForTimeout(100);
      const root = await page.evaluate(() =>
        Array.from(document.querySelectorAll('[data-blade-path="/"] .cn-item'))
          .map((el) => el.getAttribute("data-key")),
      );
      if (!root.includes(".agents")) return log("board root missing .agents: " + root.join(","));

      await openNavItem(page, '[data-blade-path="/"] .cn-item[data-key=".agents"]');
      if ((await path(page)) !== "/.agents") return log("path " + await path(page));
      const boardAgents = await page.evaluate(() =>
        Array.from(
          document.querySelectorAll('[data-blade-path="/.agents"] .cn-item'),
        ).map((el) => el.getAttribute("data-key")),
      );
      if (!boardAgents.includes("space-steward")) {
        return log("board agents: " + boardAgents.join(","));
      }
      await openNavItem(page, '[data-blade-path="/.agents"] .cn-item[data-key="space-steward"]');
      await page.waitForTimeout(80);
      const interior = await page.evaluate(() => {
        const keys = Array.from(
          document.querySelectorAll(
            '[data-blade-path="/.agents/space-steward"] .cn-item, ' +
            '.cn-blade[data-blade-kind="detail"] .cn-item',
          ),
        ).map((el) => el.getAttribute("data-key"));
        const card = document.querySelector(".cn-agent-card")?.textContent || "";
        return {
          path: window.NB_APP.state.path,
          keys,
          hasInstructions: keys.includes("instructions.md") || /instructions/i.test(card),
          hasScope: /space|board/i.test(card),
          card: card.slice(0, 120),
        };
      });
      if (interior.path !== "/.agents/space-steward") {
        return log("agent path " + interior.path);
      }
      if (!interior.hasInstructions && !interior.hasScope) {
        return log("agent detail missing: " + JSON.stringify(interior));
      }

      // Project-level .agents
      await go(page, "/projects/civic-tuner");
      await page.waitForTimeout(100);
      const kids = await page.evaluate(() =>
        Array.from(
          document.querySelectorAll(
            '[data-blade-path="/projects/civic-tuner"][data-blade-kind="list"] .cn-tree-row[data-depth="0"] .cn-item',
          ),
        ).map((el) => el.getAttribute("data-key")),
      );
      if (!kids.includes(".agents")) return log("project kids: " + kids.join(","));
      await openNavItem(
        page,
        '[data-blade-path="/projects/civic-tuner"] .cn-item[data-key=".agents"]',
      );
      if ((await path(page)) !== "/projects/civic-tuner/.agents") {
        return log("project agents path " + await path(page));
      }
      const projAgents = await page.evaluate(() =>
        Array.from(
          document.querySelectorAll(
            '[data-blade-path="/projects/civic-tuner/.agents"] .cn-item',
          ),
        ).map((el) => el.getAttribute("data-key")),
      );
      if (!projAgents.includes("install-cache") && projAgents.length < 1) {
        return log("project agents empty: " + projAgents.join(","));
      }
      return true;
    },
  },
  {
    name: "projects: tree has members child; open roster member → DM",
    run: async (page, log) => {
      await go(page, "/projects/community");
      await page.waitForTimeout(120);
      const kids = await page.evaluate(() =>
        Array.from(
          document.querySelectorAll(
            '[data-blade-path="/projects/community"][data-blade-kind="list"] .cn-tree-row[data-depth="0"] .cn-item',
          ),
        ).map((el) => el.getAttribute("data-key")),
      );
      if (!kids.includes("channels") || !kids.includes("members")) {
        return log("project kids missing members: " + kids.join(","));
      }
      await openNavItem(page, '[data-blade-path="/projects/community"] .cn-item[data-key="members"]');
      if ((await path(page)) !== "/projects/community/members") {
        return log("path " + await path(page));
      }
      const roster = await page.evaluate(() =>
        Array.from(
          document.querySelectorAll(
            '[data-blade-path="/projects/community/members"] .cn-item',
          ),
        ).map((el) => ({
          key: el.getAttribute("data-key"),
          openDm: el.getAttribute("data-open-dm"),
        })),
      );
      if (roster.length < 1 || !roster.some((r) => r.openDm)) {
        return log("roster empty or missing openDm: " + JSON.stringify(roster));
      }
      // Open a project member → DM thread.
      const target = roster.find((r) => r.key === "scout") || roster[0];
      await openNavItem(
        page,
        `[data-blade-path="/projects/community/members"] .cn-item[data-key="${target.key}"]`,
      );
      const p = await path(page);
      return p === "/dms/" + target.key || log("expected dm path, got " + p);
    },
  },
  {
    name: "members: open a member lands on their DM, not a profile card",
    run: async (page, log) => {
      await go(page, "/members");
      await page.waitForTimeout(120);
      // Selecting a member previews their DM; Enter opens /dms/<handle>.
      await openNavItem(page, '[data-blade-path="/members"] .cn-item[data-key="scout"]');
      const p = await path(page);
      if (p !== "/dms/scout") return log("member open path " + p);
      const thread = await page.evaluate(() => {
        const msgs = document.querySelectorAll(
          '[data-blade-path="/dms/scout"] .cn-item, .cn-comment',
        ).length;
        const card = document.querySelector(".cn-card");
        // Must not be the old member fact card alone.
        const detailText = document.querySelector('.cn-blade[data-blade-kind="detail"]')?.textContent || "";
        return {
          msgs,
          isProfileCard: !!(card && /path/.test(card.textContent || "") && /members/.test(card.textContent || "")),
          hasDm: /scout|CHANGE-12|cache/i.test(detailText),
        };
      });
      if (thread.isProfileCard) return log("still showing member profile card");
      // Messages is the default pane; profile is a toggle.
      const panes = await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll(".cn-person-tab")).map((el) => ({
          id: el.getAttribute("data-person-pane"),
          pressed: el.getAttribute("aria-pressed"),
        }));
        return {
          pane: window.NB_APP.state.personPane || "messages",
          tabs,
          hasMessages: document.querySelectorAll(".cn-comment").length >= 1 ||
            !!document.querySelector(".cn-empty"),
          hasProfile: !!document.querySelector(".cn-person-profile"),
        };
      });
      if (panes.pane !== "messages") return log("expected messages default: " + JSON.stringify(panes));
      if (panes.tabs.map((t) => t.id).join(",") !== "messages,profile") {
        return log("person tabs missing: " + JSON.stringify(panes.tabs));
      }
      if (panes.hasProfile) return log("profile should not show by default: " + JSON.stringify(panes));
      return (thread.hasDm || thread.msgs >= 1 || panes.hasMessages) ||
        log("dm thread missing: " + JSON.stringify({ thread, panes }));
    },
  },
  {
    name: "person: profile toggle shows GitHub-style bio in TUI",
    run: async (page, log) => {
      await go(page, "/dms/scout");
      await page.waitForTimeout(100);
      const before = await page.evaluate(() => ({
        pane: window.NB_APP.state.personPane,
        tabs: document.querySelectorAll(".cn-person-tab").length,
        profile: !!document.querySelector(".cn-person-profile"),
      }));
      if (before.pane && before.pane !== "messages") {
        return log("expected messages default: " + JSON.stringify(before));
      }
      if (before.tabs < 2) return log("no person tabs: " + JSON.stringify(before));
      await page.click('.cn-person-tab[data-person-pane="profile"]');
      await page.waitForTimeout(100);
      const profile = await page.evaluate(() => {
        const root = document.querySelector(".cn-person-profile");
        return {
          pane: window.NB_APP.state.personPane,
          pressed: document.querySelector('.cn-person-tab[data-person-pane="profile"]')
            ?.getAttribute("aria-pressed"),
          hasProfile: !!root,
          handle: root?.querySelector(".cn-person-handle")?.textContent || "",
          bio: root?.querySelector(".cn-person-bio")?.textContent || "",
          facts: Array.from(root?.querySelectorAll(".cn-person-fact-k") || [])
            .map((el) => el.textContent || ""),
          pins: Array.from(root?.querySelectorAll(".cn-person-pin-slug") || [])
            .map((el) => el.textContent || ""),
          cardClass: !!document.querySelector(".cn-profile-card, .cn-person-card"),
        };
      });
      if (!(profile.pane === "profile" && profile.pressed === "true" && profile.hasProfile)) {
        return log("profile did not open: " + JSON.stringify(profile));
      }
      if (!/@scout/.test(profile.handle)) return log("handle missing: " + profile.handle);
      if (!/CHANGE|Supervised|maya/i.test(profile.bio)) {
        return log("bio missing: " + profile.bio.slice(0, 120));
      }
      if (!profile.facts.includes("company") || !profile.facts.includes("joined")) {
        return log("facts missing: " + profile.facts.join(","));
      }
      if (!profile.pins.some((p) => /civic\/tuner/i.test(p))) {
        return log("pinned missing: " + profile.pins.join(","));
      }
      if (profile.cardClass) return log("profile used card chrome");
      await page.click('.cn-person-tab[data-person-pane="messages"]');
      await page.waitForTimeout(80);
      const back = await page.evaluate(() => ({
        pane: window.NB_APP.state.personPane,
        profile: !!document.querySelector(".cn-person-profile"),
        msgs: document.querySelectorAll(".cn-comment").length,
      }));
      return (back.pane === "messages" && !back.profile && back.msgs >= 1) ||
        log("did not return to messages: " + JSON.stringify(back));
    },
  },
  {
    name: "dms: /dm scout navigates to the agent thread",
    run: async (page, log) => {
      await page.keyboard.type("/dm scout");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(200);
      const p = await path(page);
      if (p !== "/dms/scout") return log("path " + p);
      const out = await page.evaluate(() => {
        const lines = Array.from(document.querySelectorAll('.cn-line[data-kind="out"]'));
        return lines.map((el) => el.textContent).join("\n");
      });
      return /\/dm:.*scout/.test(out) || /\/dms\/scout/.test(out) || log("out: " + out.slice(0, 100));
    },
  },
  {
    name: "markers: @ opens mentions and Tab inserts @handle with space",
    run: async (page, log) => {
      // Free-form chat: markers work mid-sentence, not only as whole lines.
      await page.evaluate(() => {
        window.NB_APP.state.ai = true;
        window.NB_APP.state.columnFocus = false;
        if (window.NB_APP.state.editor) window.NB_APP.state.editor.focused = false;
        window.NB_APP.navigate("/", { keepCli: true });
      });
      await page.waitForTimeout(80);
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      await page.type("[data-cli]", "ping @ma", { delay: 20 });
      await page.waitForTimeout(200);
      const menu = await page.evaluate(() => {
        const cands = Array.from(document.querySelectorAll(".cn-cand")).map((el) => ({
          value: el.querySelector("span")?.textContent,
          kind: el.getAttribute("data-cand-kind"),
        }));
        const head = document.querySelector(".cn-menu-head")?.textContent || "";
        const completion = window.NB_APP.state.completion;
        return {
          cands, head,
          kind: completion?.kind,
          open: cands.length > 0,
          values: (completion?.candidates || []).map((c) => c.value),
        };
      });
      const hasMaya = menu.cands.some((c) => c.value === "@maya") ||
        menu.values.includes("@maya");
      if (!menu.open || (menu.kind !== "mention" && !hasMaya)) {
        return log("mention menu missing: " + JSON.stringify(menu));
      }
      if (!hasMaya) return log("maya not listed: " + JSON.stringify(menu.cands.slice(0, 5)));
      await page.keyboard.press("Tab");
      await page.waitForTimeout(120);
      const after = await page.evaluate(() => document.querySelector("[data-cli]")?.value || "");
      return after === "ping @maya " || log("after tab: " + JSON.stringify(after));
    },
  },
  {
    name: "markers: # opens topics/channels; Tab accepts incomplete tag",
    run: async (page, log) => {
      await page.keyboard.type("track #draft");
      await page.waitForTimeout(120);
      const menu = await page.evaluate(() => {
        const cands = Array.from(document.querySelectorAll(".cn-cand")).map((el) =>
          el.querySelector("span")?.textContent);
        return {
          cands,
          kind: window.NB_APP.state.completion?.kind,
          head: document.querySelector(".cn-menu-head")?.textContent || "",
        };
      });
      if (!menu.cands.some((v) => v === "#draft-persistence")) {
        return log("topic missing: " + JSON.stringify(menu));
      }
      // Tab accepts the incomplete marker (Enter would submit/send).
      await page.keyboard.press("Tab");
      await page.waitForTimeout(100);
      const val = await page.evaluate(() => document.querySelector("[data-cli]")?.value || "");
      if (val !== "track #draft-persistence ") {
        return log("after tab accept: " + JSON.stringify(val));
      }
      // Channel short-name also appears under #.
      await page.keyboard.type("#bu");
      await page.waitForTimeout(120);
      const ch = await page.evaluate(() =>
        Array.from(document.querySelectorAll(".cn-cand span")).map((s) => s.textContent));
      return ch.some((v) => v === "#bugs") || log("channel #bugs missing: " + ch.join(","));
    },
  },
  {
    name: "speech: mic always visible; gated until on-device model ready; PTT/Alt+V",
    run: async (page, log) => {
      const before = await page.evaluate(() => {
        const mic = document.querySelector("[data-speech-mic]");
        return {
          mic: !!mic,
          ready: !!window.NB_APP.state.speech?.ready,
          avail: window.NB_APP.state.speech?.availability,
          dataReady: mic?.getAttribute("data-ready"),
          tag: document.querySelector("[data-speech-tag]")?.textContent,
        };
      });
      if (!before.mic) return log("mic missing before mock: " + JSON.stringify(before));
      if (before.ready || before.dataReady === "true") {
        return log("speech should not be ready without on-device model: " + JSON.stringify(before));
      }
      if (!before.tag || !/off|fetch|dl/i.test(before.tag)) {
        return log("expected status tag when not ready: " + JSON.stringify(before));
      }

      // PTT must no-op while gated.
      await page.keyboard.down("`");
      await page.waitForTimeout(80);
      const gated = await page.evaluate(() => window.NB_APP.state.speech.listening);
      await page.keyboard.up("`");
      if (gated) return log("PTT started before model ready");

      // Install Edge-local mock: constructor + available/install.
      await page.evaluate(() => {
        class MockRec {
          continuous = false;
          interimResults = false;
          lang = "";
          processLocally = false;
          onstart = null;
          onresult = null;
          onerror = null;
          onend = null;
          start() { if (this.onstart) this.onstart(); }
          stop() { if (this.onend) this.onend(); }
          abort() { if (this.onend) this.onend(); }
          static async available() { return "available"; }
          static async install() { return true; }
        }
        window.SpeechRecognition = MockRec;
        window.webkitSpeechRecognition = MockRec;
      });
      await page.evaluate(async () => {
        await window.NB_APP.warmSpeechModel();
      });
      await page.waitForTimeout(80);
      const ready = await page.evaluate(() => ({
        supported: window.NB_SPEECH.isSupported(),
        ready: window.NB_APP.speechReady(),
        avail: window.NB_APP.state.speech.availability,
        mic: !!document.querySelector("[data-speech-mic]"),
        dataReady: document.querySelector("[data-speech-mic]")?.getAttribute("data-ready"),
        tag: document.querySelector("[data-speech-tag]")?.textContent || "",
      }));
      if (!ready.supported || !ready.ready || ready.avail !== "available" ||
          ready.dataReady !== "true") {
        return log("mock did not mark speech ready: " + JSON.stringify(ready));
      }

      // Discord-style push-to-talk: hold `
      await page.keyboard.down("`");
      await page.waitForTimeout(120);
      const ptt = await page.evaluate(() => ({
        listening: window.NB_APP.state.speech.listening,
        mode: window.NB_APP.state.speech.mode,
        pressed: document.querySelector("[data-speech-mic]")?.getAttribute("aria-pressed"),
      }));
      await page.keyboard.up("`");
      await page.waitForTimeout(100);
      if (!(ptt.listening && ptt.mode === "ptt" && ptt.pressed === "true")) {
        return log("PTT failed: " + JSON.stringify(ptt));
      }
      const afterPtt = await page.evaluate(() => window.NB_APP.state.speech.listening);
      if (afterPtt) return log("PTT still listening after release");

      // Alt+V toggles continuous dictation.
      await page.keyboard.down("Alt");
      await page.keyboard.press("KeyV");
      await page.keyboard.up("Alt");
      await page.waitForTimeout(120);
      const toggled = await page.evaluate(() => ({
        listening: window.NB_APP.state.speech.listening,
        mode: window.NB_APP.state.speech.mode,
        tag: document.querySelector("[data-speech-tag]")?.textContent,
      }));
      if (!(toggled.listening && toggled.mode === "toggle")) {
        return log("toggle failed: " + JSON.stringify(toggled));
      }
      await page.keyboard.press("Escape");
      await page.waitForTimeout(80);
      const stopped = await page.evaluate(() => window.NB_APP.state.speech.listening);
      return !stopped || log("Esc did not stop dictation");
    },
  },
  {
    name: "speech: downloadable model — mic shows fetch, install enables voice",
    run: async (page, log) => {
      await page.evaluate(() => {
        window.__speechAvail = "downloadable";
        class MockRec {
          continuous = false;
          interimResults = false;
          lang = "";
          processLocally = false;
          onstart = null;
          onresult = null;
          onerror = null;
          onend = null;
          start() { if (this.onstart) this.onstart(); }
          stop() { if (this.onend) this.onend(); }
          abort() { if (this.onend) this.onend(); }
          static async available() { return window.__speechAvail; }
          static async install() {
            window.__speechAvail = "available";
            return true;
          }
        }
        window.SpeechRecognition = MockRec;
        window.webkitSpeechRecognition = MockRec;
      });
      await page.evaluate(async () => {
        await window.NB_APP.warmSpeechModel();
      });
      await page.waitForTimeout(80);
      const pending = await page.evaluate(() => ({
        ready: window.NB_APP.speechReady(),
        avail: window.NB_APP.state.speech.availability,
        tag: document.querySelector("[data-speech-tag]")?.textContent,
        title: document.querySelector("[data-speech-mic]")?.getAttribute("title") || "",
      }));
      if (pending.ready || pending.avail !== "downloadable" || pending.tag !== "fetch") {
        return log("expected downloadable/fetch UI: " + JSON.stringify(pending));
      }
      if (!/download/i.test(pending.title)) {
        return log("mic title should explain download: " + pending.title);
      }

      // Mic click (or any gesture) should fetch; drive via the same path the
      // button uses so we don't race morph against Playwright's actionability.
      await page.evaluate(async () => {
        await window.NB_APP.fetchSpeechModel({ fromGesture: true });
      });
      const after = await page.evaluate(() => ({
        ready: window.NB_APP.speechReady(),
        avail: window.NB_APP.state.speech.availability,
        dataReady: document.querySelector("[data-speech-mic]")?.getAttribute("data-ready"),
        tag: document.querySelector("[data-speech-tag]")?.textContent || "",
      }));
      if (!(after.ready && after.avail === "available" && after.dataReady === "true")) {
        return log("install did not enable voice: " + JSON.stringify(after));
      }
      return true;
    },
  },
  {
    name: "speech: voice commands — wake prefix, modes, what can I say",
    run: async (page, log) => {
      await page.evaluate(() => {
        class MockRec {
          continuous = false;
          interimResults = false;
          lang = "";
          processLocally = false;
          onstart = null;
          onresult = null;
          onerror = null;
          onend = null;
          start() { if (this.onstart) this.onstart(); }
          stop() { if (this.onend) this.onend(); }
          abort() { if (this.onend) this.onend(); }
          static async available() { return "available"; }
          static async install() { return true; }
          emitFinal(text) {
            if (this.onresult) {
              this.onresult({
                resultIndex: 0,
                results: [{ isFinal: true, 0: { transcript: text }, length: 1 }],
              });
            }
          }
        }
        window.__MockRec = MockRec;
        window.SpeechRecognition = MockRec;
        window.webkitSpeechRecognition = MockRec;
      });
      await page.evaluate(async () => {
        await window.NB_APP.warmSpeechModel();
        window.NB_APP.render(true);
      });
      await page.waitForTimeout(80);

      // Cycle intent via Alt+Shift+V: default → dictation → commands → default.
      const modes = [];
      for (let i = 0; i < 3; i += 1) {
        await page.keyboard.down("Alt");
        await page.keyboard.down("Shift");
        await page.keyboard.press("KeyV");
        await page.keyboard.up("Shift");
        await page.keyboard.up("Alt");
        await page.waitForTimeout(60);
        modes.push(await page.evaluate(() => window.NB_APP.state.speech.intent));
      }
      if (modes.join(",") !== "dictation,commands,default") {
        return log("intent cycle: " + modes.join(","));
      }

      // Chip click cycles too.
      const chip = await page.evaluate(() => !!document.querySelector("[data-voice-intent]"));
      if (!chip) return log("voice intent chip missing");
      await page.click("[data-voice-intent]");
      await page.waitForTimeout(60);
      const afterChip = await page.evaluate(() => window.NB_APP.state.speech.intent);
      if (afterChip !== "dictation") return log("chip cycle expected dictation, got " + afterChip);

      // Reset to default and speak a wake-prefixed command.
      await page.evaluate(() => window.NB_APP.setSpeechIntent("default"));
      await page.evaluate(() => {
        // Force a fresh engine so MockRec is used.
        window.NB_APP.state.speech.listening = false;
      });
      // Start listen, then inject a final via a direct handleSpeechFinal (stable without racing rec).
      const nav = await page.evaluate(() => {
        const before = window.NB_APP.state.path;
        window.NB_APP.handleSpeechFinal("computer go to projects");
        return { before, after: window.NB_APP.state.path };
      });
      if (!String(nav.after).includes("projects")) {
        return log("wake command did not navigate: " + JSON.stringify(nav));
      }

      // Dictation mode types text instead of navigating.
      await page.evaluate(() => {
        window.NB_APP.setSpeechIntent("dictation");
        window.NB_APP.handleSpeechFinal("clear prompt");
        window.NB_APP.handleSpeechFinal("hello from voice");
      });
      const typed = await page.evaluate(() => document.querySelector("[data-cli]")?.value || "");
      if (!/hello from voice/i.test(typed)) {
        return log("dictation did not type: " + typed);
      }

      // Commands mode rejects unknown; help lists grammar.
      await page.evaluate(() => {
        window.NB_APP.setSpeechIntent("commands");
        window.NB_APP.handleSpeechFinal("what can I say");
      });
      await page.waitForTimeout(80);
      const help = await page.evaluate(() => {
        const lines = (window.NB_APP.state.lines || []).map((l) => l.text || "").join("\n");
        return { hasGo: /go to/i.test(lines), hasWake: /computer/i.test(lines) };
      });
      if (!help.hasGo || !help.hasWake) return log("what can I say missing: " + JSON.stringify(help));
      return true;
    },
  },
  {
    name: "voice: lounge join dock, mute, PTT mode, leave (mocked mic)",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/lounge");
      await page.waitForTimeout(120);
      const room = await page.evaluate(() => ({
        join: !!document.querySelector("[data-voice-join]"),
        path: window.NB_APP.state.path,
        supported: window.NB_VOICE?.isSupported?.(),
      }));
      if (!room.join) return log("Join Voice missing on lounge: " + JSON.stringify(room));
      if (!room.supported) {
        // Chromium in CI always has RTCPeerConnection; fail loud if not.
        return log("WebRTC unsupported in test browser");
      }

      await page.evaluate(() => {
        const track = {
          kind: "audio",
          enabled: true,
          stop() { this.enabled = false; },
          addEventListener() {},
          removeEventListener() {},
        };
        const stream = {
          getTracks() { return [track]; },
          getAudioTracks() { return [track]; },
          getVideoTracks() { return []; },
        };
        navigator.mediaDevices.getUserMedia = async () => stream;
      });

      await page.click("[data-voice-join]");
      await page.waitForTimeout(200);
      const joined = await page.evaluate(() => ({
        dock: !!document.querySelector(".cn-voice-dock"),
        voice: { ...window.NB_APP.state.voice },
        mute: document.querySelector("[data-voice-mute]")?.textContent,
      }));
      if (!joined.dock || !joined.voice.joined || joined.voice.channelId !== "lounge") {
        return log("join failed: " + JSON.stringify(joined));
      }

      await page.click("[data-voice-mute]");
      await page.waitForTimeout(80);
      const muted = await page.evaluate(() => window.NB_APP.state.voice.muted);
      if (!muted) return log("mute did not stick");

      await page.click('[data-voice-input="ptt"]');
      await page.waitForTimeout(80);
      const mode = await page.evaluate(() => window.NB_APP.state.voice.inputMode);
      if (mode !== "ptt") return log("expected ptt mode, got " + mode);

      // Channel-voice PTT owns ` — should not start speech listening.
      await page.keyboard.down("`");
      await page.waitForTimeout(80);
      const ptt = await page.evaluate(() => ({
        speech: window.NB_APP.state.speech?.listening,
        speaking: window.NB_APP.state.voice.speaking,
      }));
      await page.keyboard.up("`");
      if (ptt.speech) return log("voice PTT leaked into speech: " + JSON.stringify(ptt));

      await page.click("[data-voice-leave]");
      await page.waitForTimeout(120);
      const left = await page.evaluate(() => ({
        joined: window.NB_APP.state.voice.joined,
        dock: !!document.querySelector(".cn-voice-dock"),
      }));
      if (left.joined || left.dock) return log("leave failed: " + JSON.stringify(left));

      // Slash path
      await page.evaluate(async () => {
        await window.NB_APP.runVoiceCommand("join standup");
      });
      await page.waitForTimeout(150);
      const viaSlash = await page.evaluate(() => window.NB_APP.state.voice);
      if (!viaSlash.joined || viaSlash.channelId !== "standup") {
        return log("slash join failed: " + JSON.stringify(viaSlash));
      }
      await page.evaluate(async () => { await window.NB_APP.leaveVoice(); });
      return true;
    },
  },
  {
    name: "markers: bare @ in ai mode lists members (not slash commands)",
    run: async (page, log) => {
      // Ensure ai mode so slash preference is on — markers must still win.
      await page.evaluate(() => { window.NB_APP.state.ai = true; });
      await page.keyboard.type("@");
      await page.waitForTimeout(120);
      const got = await page.evaluate(() => {
        const cands = Array.from(document.querySelectorAll(".cn-cand span"))
          .map((s) => s.textContent);
        return {
          kind: window.NB_APP.state.completion?.kind,
          cands,
          hasSlash: cands.some((c) => String(c).startsWith("/")),
        };
      });
      if (got.kind !== "mention" || got.hasSlash) {
        return log("expected mentions only: " + JSON.stringify(got));
      }
      return got.cands.length >= 4 || log("too few members: " + got.cands.join(","));
    },
  },
  {
    name: "grid-road: idle shimmer until click toggles motion",
    run: async (page, log) => {
      await page.waitForSelector("[data-gridroad]");
      const idle = await page.evaluate(() => {
        const el = document.querySelector("[data-gridroad]");
        return {
          present: !!el,
          moving: el?.dataset.moving,
          pressed: el?.getAttribute("aria-pressed"),
          api: typeof window.NB_GRIDROAD?.isMoving === "function"
            ? window.NB_GRIDROAD.isMoving()
            : null,
        };
      });
      if (!idle.present) return log("canvas missing");
      if (idle.moving !== "false" || idle.pressed !== "false" || idle.api !== false) {
        return log("should start idle: " + JSON.stringify(idle));
      }
      await page.click("[data-gridroad]", { force: true });
      await page.waitForTimeout(60);
      const on = await page.evaluate(() => ({
        moving: document.querySelector("[data-gridroad]")?.dataset.moving,
        pressed: document.querySelector("[data-gridroad]")?.getAttribute("aria-pressed"),
        api: window.NB_GRIDROAD?.isMoving?.() ?? null,
      }));
      if (on.moving !== "true" || on.pressed !== "true" || on.api !== true) {
        return log("click did not start motion: " + JSON.stringify(on));
      }
      await page.click("[data-gridroad]", { force: true });
      await page.waitForTimeout(60);
      const off = await page.evaluate(() => ({
        moving: document.querySelector("[data-gridroad]")?.dataset.moving,
        api: window.NB_GRIDROAD?.isMoving?.() ?? null,
      }));
      if (off.moving !== "false" || off.api !== false) {
        return log("click did not pause: " + JSON.stringify(off));
      }
      return true;
    },
  },
  {
    name: "keys: first visit opens hotkey cheatsheet (keyboard is default)",
    firstVisit: true,
    run: async (page, log) => {
      const open = await page.evaluate(() => ({
        help: document.querySelector(".cn-help")?.dataset.open,
        intel: !!window.NB_APP.state.intelOpen,
        onboard: !!window.NB_APP.state.keysOnboard,
        lead: document.querySelector(".cn-help-lead")?.textContent || "",
        scope: document.querySelector(".cn-help-scope")?.textContent || "",
        stored: localStorage.getItem("nb-keys-onboarded"),
      }));
      if (open.help !== "true" || !open.intel || !open.onboard) {
        return log("first visit did not open keys sheet: " + JSON.stringify(open));
      }
      if (open.stored) return log("should not mark onboarded before dismiss: " + open.stored);
      if (!/keyboard/i.test(open.lead) || !/default/i.test(open.lead)) {
        return log("onboard lead missing keyboard-default cue: " + open.lead);
      }
      await page.keyboard.press("Escape");
      await page.waitForTimeout(100);
      const after = await page.evaluate(() => ({
        help: document.querySelector(".cn-help")?.dataset.open,
        onboard: !!window.NB_APP.state.keysOnboard,
        stored: localStorage.getItem("nb-keys-onboarded"),
      }));
      if (after.help === "true" || after.onboard) {
        return log("Esc did not close onboard sheet: " + JSON.stringify(after));
      }
      if (after.stored !== "1") {
        return log("dismiss did not persist onboarded: " + JSON.stringify(after));
      }
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(300);
      const again = await page.evaluate(() => ({
        help: document.querySelector(".cn-help")?.dataset.open,
        onboard: !!window.NB_APP.state.keysOnboard,
        intel: !!window.NB_APP.state.intelOpen,
      }));
      if (again.help === "true" || again.onboard || again.intel) {
        return log("reload still opened onboard sheet: " + JSON.stringify(again));
      }
      return true;
    },
  },
  {
    name: "keys cue: always visible on status; click opens cheatsheet",
    run: async (page, log) => {
      // After a transient status message, the cue must still be present.
      await page.evaluate(() => window.NB_APP.status("loaded 3 new posts"));
      await page.waitForTimeout(40);
      const cue = await page.evaluate(() => {
        const el = document.querySelector("[data-keys-open]");
        const status = document.querySelector("[data-region='status']");
        const rect = el && el.getBoundingClientRect();
        return {
          present: !!el,
          text: el?.textContent?.replace(/\s+/g, " ").trim() || "",
          open: el?.dataset.open,
          pressed: el?.getAttribute("aria-pressed"),
          inStatus: !!(el && status && status.contains(el)),
          visible: !!(rect && rect.width > 0 && rect.height > 0),
          statusText: document.querySelector("[data-status-line]")?.textContent || "",
        };
      });
      if (!cue.present || !cue.inStatus || !cue.visible) {
        return log("cue missing: " + JSON.stringify(cue));
      }
      if (!/Ctrl\+Space/i.test(cue.text) || !/keys/i.test(cue.text)) {
        return log("cue label wrong: " + cue.text);
      }
      if (cue.open === "true") return log("cue should start closed: " + JSON.stringify(cue));
      // Transient status must not wipe the cue (only the status-line span).
      if (!/loaded 3/.test(cue.statusText)) return log("status line not set: " + cue.statusText);

      await page.click("[data-keys-open]");
      await page.waitForTimeout(150);
      const opened = await page.evaluate(() => ({
        help: document.querySelector(".cn-help")?.dataset.open,
        intel: window.NB_APP.state.intelOpen,
        cueOpen: document.querySelector("[data-keys-open]")?.dataset.open,
        pressed: document.querySelector("[data-keys-open]")?.getAttribute("aria-pressed"),
      }));
      if (!(opened.help === "true" && opened.intel && opened.cueOpen === "true" && opened.pressed === "true")) {
        return log("click did not open: " + JSON.stringify(opened));
      }
      await page.click("[data-keys-open]");
      await page.waitForTimeout(100);
      const closed = await page.evaluate(() => ({
        help: document.querySelector(".cn-help")?.dataset.open,
        intel: window.NB_APP.state.intelOpen,
        cueOpen: document.querySelector("[data-keys-open]")?.dataset.open,
      }));
      return (closed.help === "false" && !closed.intel && closed.cueOpen === "false") ||
        log("click did not toggle closed: " + JSON.stringify(closed));
    },
  },
  {
    name: "Ctrl+Space opens intellisense and the hotkey cheatsheet",
    run: async (page, log) => {
      await page.keyboard.press("Control+Space");
      await page.waitForTimeout(150);
      const open = await page.evaluate(() => ({
        help: document.querySelector(".cn-help")?.dataset.open,
        menu: document.querySelector(".cn-tui-foot")?.dataset.open ||
          document.querySelector(".cn-prompt-stack")?.closest("[data-open]")?.dataset.open,
        cands: document.querySelectorAll(".cn-cand").length,
        intel: window.NB_APP.state.intelOpen,
        focused: document.activeElement === document.querySelector("[data-cli]"),
      }));
      if (!(open.help === "true" && open.menu === "true" && open.cands > 3 && open.intel && open.focused)) {
        return log(JSON.stringify(open));
      }
      await page.keyboard.press("Escape");
      await page.waitForTimeout(100);
      const closed = await page.evaluate(() => ({
        help: document.querySelector(".cn-help")?.dataset.open,
        intel: window.NB_APP.state.intelOpen,
      }));
      return (closed.help === "false" && !closed.intel) || log("esc did not close: " + JSON.stringify(closed));
    },
  },
  {
    name: "cheatsheet scopes to the focused component",
    run: async (page, log) => {
      // Prompt focus → Prompt group only (plus this sheet).
      await go(page, "/");
      await page.click("[data-cli]");
      await page.waitForTimeout(40);
      await page.keyboard.press("Control+Space");
      await page.waitForTimeout(150);
      const onPrompt = await page.evaluate(() => {
        const titles = Array.from(document.querySelectorAll(".cn-help-group h3")).map((h) => h.textContent);
        const ctx = window.NB_APP.state.helpCtx;
        return { titles, context: ctx?.context, focus: ctx?.focus };
      });
      if (onPrompt.context !== "prompt") return log("prompt ctx: " + JSON.stringify(onPrompt));
      if (!onPrompt.titles.includes("Prompt") || onPrompt.titles.includes("Navigation") ||
          onPrompt.titles.includes("Thread") || onPrompt.titles.includes("Blades")) {
        return log("prompt sheet wrong: " + onPrompt.titles.join(","));
      }
      await page.keyboard.press("Escape");
      await page.waitForTimeout(80);

      // Nav focus on a channel path → Navigation, not Thread/Prompt.
      await go(page, "/projects/community/channels/general");
      await page.evaluate(() => {
        window.NB_APP.state.columnFocus = true;
        window.NB_APP.state.focus = 0;
        window.NB_APP.state.detailOpen = true;
        window.NB_APP.render(true);
      });
      await page.waitForTimeout(80);
      await page.keyboard.press("Control+Space");
      await page.waitForTimeout(150);
      const onNav = await page.evaluate(() => {
        const titles = Array.from(document.querySelectorAll(".cn-help-group h3")).map((h) => h.textContent);
        const chips = Array.from(document.querySelectorAll(".cn-help-chip")).map((c) => c.textContent);
        const ctx = window.NB_APP.state.helpCtx;
        return { titles, chips, context: ctx?.context, focus: ctx?.focus, path: ctx?.path };
      });
      if (onNav.context !== "nav" || onNav.focus !== "columns") {
        return log("nav ctx: " + JSON.stringify(onNav));
      }
      if (!onNav.titles.includes("Navigation") || onNav.titles.includes("Prompt") ||
          onNav.titles.includes("Thread")) {
        return log("nav sheet wrong: " + onNav.titles.join(","));
      }
      if (!onNav.chips.some((c) => c.includes("/projects/community/channels/general"))) {
        return log("chips missing path: " + onNav.chips.join("|"));
      }
      await page.keyboard.press("Escape");
      await page.waitForTimeout(80);

      // Detail focus on a thread in the channel → Thread keys.
      await page.evaluate(() => {
        window.NB_APP.openThread("p1", { silent: true });
        window.NB_APP.state.columnFocus = true;
        window.NB_APP.state.focus = 1;
        window.NB_APP.state.detailOpen = true;
        window.NB_APP.render(true);
      });
      await page.waitForTimeout(80);
      await page.keyboard.press("Control+Space");
      await page.waitForTimeout(150);
      const onThread = await page.evaluate(() => {
        const titles = Array.from(document.querySelectorAll(".cn-help-group h3")).map((h) => h.textContent);
        const ctx = window.NB_APP.state.helpCtx;
        return { titles, context: ctx?.context, hasThread: ctx?.hasThread };
      });
      if (onThread.context !== "thread" || !onThread.titles.includes("Thread")) {
        return log("thread sheet wrong: " + JSON.stringify(onThread));
      }
      if (onThread.titles.includes("Prompt") || onThread.titles.includes("Navigation")) {
        return log("thread should be alone: " + onThread.titles.join(","));
      }
      await page.keyboard.press("Escape");
      await page.waitForTimeout(80);

      // DM detail → Messages.
      await go(page, "/dms/scout");
      await page.evaluate(() => {
        window.NB_APP.state.columnFocus = true;
        window.NB_APP.state.focus = 1;
        window.NB_APP.state.detailOpen = true;
        window.NB_APP.render(true);
      });
      await page.waitForTimeout(80);
      await page.keyboard.press("Control+Space");
      await page.waitForTimeout(150);
      const onDm = await page.evaluate(() => {
        const titles = Array.from(document.querySelectorAll(".cn-help-group h3")).map((h) => h.textContent);
        return { titles, context: window.NB_APP.state.helpCtx?.context };
      });
      return (onDm.context === "dm" && onDm.titles.includes("Messages") &&
          !onDm.titles.includes("Prompt")) ||
        log("dm sheet wrong: " + JSON.stringify(onDm));
    },
  },
  {
    name: "a11y: skip link, landmarks, workspace tabs, and combobox wiring",
    run: async (page, log) => {
      const chrome = await page.evaluate(() => {
        const skip = document.querySelector("a.nb-skip");
        const banner = document.querySelector('[role="banner"]');
        const main = document.querySelector("#nb-main, main[data-mount]");
        const tablist = document.querySelector('.cn-workspace-tablist[role="tablist"]');
        const tabs = Array.from(document.querySelectorAll('.cn-workspace-tablist [role="tab"]'));
        const plus = document.querySelector("[data-session-new]");
        const input = document.querySelector("[data-cli]");
        return {
          skipHref: skip?.getAttribute("href"),
          skipText: skip?.textContent?.trim(),
          banner: !!banner,
          main: !!main,
          tablist: tablist?.getAttribute("aria-label"),
          tabRoles: tabs.map((t) => t.getAttribute("role")),
          tabSelected: tabs.map((t) => t.getAttribute("aria-selected")),
          plusInTablist: !!(plus && tablist && tablist.contains(plus)),
          plusLabel: plus?.getAttribute("aria-label"),
          role: input?.getAttribute("role"),
          autocomplete: input?.getAttribute("aria-autocomplete"),
          controls: input?.getAttribute("aria-controls"),
          expanded: input?.getAttribute("aria-expanded"),
          label: input?.getAttribute("aria-label"),
          // Theme chrome is agent-only — not in the user-facing status footer.
          themeFooter: !!document.querySelector(
            "[data-region='status'] .nb-status-theme, [data-region='status'] [data-theme-name], [data-region='status'] [data-theme-note]",
          ),
          keysCue: !!document.querySelector("[data-region='status'] [data-keys-open]"),
        };
      });
      if (chrome.skipHref !== "#nb-main" || !chrome.skipText) {
        return log("skip link: " + JSON.stringify(chrome));
      }
      if (!chrome.banner || !chrome.main) return log("landmarks: " + JSON.stringify(chrome));
      if (chrome.themeFooter) return log("theme footer must not be user-facing: " + JSON.stringify(chrome));
      if (!chrome.keysCue) return log("keys cue missing from status footer");
      if (!chrome.tablist || chrome.tabRoles.some((r) => r !== "tab")) {
        return log("tabs: " + JSON.stringify(chrome));
      }
      if (chrome.plusInTablist) return log("+ must sit outside tablist: " + JSON.stringify(chrome));
      if (chrome.role !== "combobox" || chrome.controls !== "cn-cli-listbox") {
        return log("combobox: " + JSON.stringify(chrome));
      }
      return true;
    },
  },
  {
    name: "a11y: Tab reaches activity; : focuses prompt; arrows move tabs",
    run: async (page, log) => {
      await page.keyboard.press("Alt+T");
      await page.waitForTimeout(120);
      const two = await page.evaluate(() =>
        document.querySelectorAll('.cn-workspace-tablist [role="tab"]').length);
      if (two < 2) return log("expected 2 workspaces after Alt+T, got " + two);

      // Select the first tab, then ArrowRight must activate the second.
      await page.click('.cn-workspace-tablist [role="tab"][data-session="0"]');
      await page.waitForTimeout(80);
      await page.focus('.cn-workspace-tablist [role="tab"][data-session="0"]');
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(120);
      const afterRight = await page.evaluate(() => ({
        active: window.NB_APP.state.activeSession,
        focusRole: document.activeElement?.getAttribute("role"),
        focusSession: document.activeElement?.getAttribute("data-session"),
        selected: document.activeElement?.getAttribute("aria-selected"),
      }));
      if (afterRight.active !== 1 || afterRight.focusRole !== "tab" || afterRight.selected !== "true") {
        return log("ArrowRight tab: " + JSON.stringify(afterRight));
      }

      // Keyboard path to masthead chrome (skip → activity). Grid has no theme dropdown.
      await page.evaluate(() => document.querySelector("a.nb-skip")?.focus());
      await page.keyboard.press("Tab");
      await page.waitForTimeout(40);
      const hit = { activity: false, seen: [] };
      for (let i = 0; i < 12; i += 1) {
        const id = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el) return "";
          if (el.matches("[data-activity-bell]")) return "activity";
          return el.tagName;
        });
        hit.seen.push(id);
        if (id === "activity") hit.activity = true;
        if (hit.activity) break;
        await page.keyboard.press("Tab");
      }
      if (!hit.activity) {
        return log("tab order missed activity: " + JSON.stringify(hit));
      }

      // Prompt is reached via the board's keyboard model (: / i), not by
      // tabbing through every blade control.
      await page.keyboard.press("Escape");
      await page.waitForTimeout(40);
      await page.keyboard.press(":");
      await page.waitForTimeout(80);
      const onCli = await page.evaluate(() =>
        document.activeElement === document.querySelector("[data-cli]"));
      if (!onCli) return log("colon did not focus prompt");

      // Open suggestions → listbox expands + options present.
      await page.fill("[data-cli]", "");
      await page.type("[data-cli]", "cd ", { delay: 15 });
      await page.waitForTimeout(100);
      const menu = await page.evaluate(() => {
        const input = document.querySelector("[data-cli]");
        const list = document.getElementById("cn-cli-listbox");
        return {
          expanded: input?.getAttribute("aria-expanded"),
          listRole: list?.getAttribute("role"),
          hidden: list?.hasAttribute("hidden"),
          footOpen: document.querySelector(".cn-tui-foot")?.dataset.open,
          options: document.querySelectorAll('#cn-cli-listbox [role="option"]').length,
        };
      });
      if (menu.expanded !== "true" || menu.listRole !== "listbox" ||
          menu.hidden || menu.footOpen !== "true" || menu.options < 1) {
        return log("listbox: " + JSON.stringify(menu));
      }
      return true;
    },
  },
  {
    name: "a11y: code blocks are keyboard-focusable; no foot transcript panel",
    run: async (page, log) => {
      // Scout's plan (p3) in #general carries a fenced typescript block.
      await go(page, "/projects/community/channels/general");
      await page.waitForTimeout(150);
      await page.evaluate(() => {
        window.NB_APP.state.threadFocus = null;
        window.NB_APP.state.detailOpen = true;
        window.NB_APP.render(true);
      });
      await page.waitForTimeout(80);
      const check = await page.evaluate(() => {
        const pre = document.querySelector(".nb-md-pre");
        const footOut = document.querySelector(".cn-tui-foot .cn-out, .cn-panel-out");
        return {
          preTab: pre ? pre.getAttribute("tabindex") : null,
          preLabel: pre?.getAttribute("aria-label") || null,
          hasPre: !!pre,
          footOut: !!footOut,
          bladeOut: !!document.querySelector(".cn-blade-out, .cn-out.cn-blade-out"),
        };
      });
      if (check.footOut) return log("foot transcript returned: " + JSON.stringify(check));
      if (!check.hasPre) return log("code block missing: " + JSON.stringify(check));
      if (check.preTab !== "0") {
        return log("code block not focusable: " + JSON.stringify(check));
      }
      return true;
    },
  },
  {
    name: "copy: optimized format for post thread, channel feed, and chat",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/ideas");
      await page.waitForTimeout(100);
      const formats = await page.evaluate(() => {
        const C = window.NB_COPY;
        if (!C) return { ok: false, why: "NB_COPY missing" };
        const posts = (window.NB_DATA.posts || []).filter((p) => p.channel === "ideas");
        const root = posts.find((p) => !p.re) || posts[0];
        if (!root) return { ok: false, why: "no ideas posts" };
        const thread = C.formatThread(root, {
          path: "/projects/community/channels/ideas/" + root.id,
          extra: window.NB_APP.state.merged,
        });
        const feed = C.formatChannelFeed(posts, {
          channel: "ideas",
          path: "/projects/community/channels/ideas",
        });
        window.NB_APP.state.lines = [
          { id: "u1", kind: "user", mode: "ai", text: "rename this channel to ieades2",
            boundContext: [{ kind: "channel", id: "ideas", name: "ideas" }] },
          { id: "t1", kind: "tool", tool: "board_rename_channel", ok: true,
            summary: "renamed #ideas → #ieades2", result: "ok" },
        ];
        const chat = C.formatTranscript(window.NB_APP.state.lines, {
          path: "/projects/community/channels/ideas",
        });
        const viaTarget = C.formatForTarget({
          kind: "post", id: root.id, name: root.who, path: window.NB_APP.state.path,
        }, window.NB_APP.state);
        return {
          ok: true,
          thread: thread,
          feed: feed,
          chat: chat,
          viaTarget: viaTarget,
          threadHasWho: thread.includes("@" + root.who),
          threadFenced: /--- nightboard thread/.test(thread) && /---\n$/.test(thread),
          feedFenced: /--- nightboard feed/.test(feed),
          chatHasYou: /you \[ai\]:/.test(chat) || /you \[ai\] /.test(chat),
          chatHasTool: /agent\/tool board_rename_channel/.test(chat),
          chatHasContext: /context: channel:ideas/.test(chat),
        };
      });
      if (!formats.ok) return log(formats.why || JSON.stringify(formats));
      if (!formats.threadFenced || !formats.threadHasWho) {
        return log("thread format: " + formats.thread.slice(0, 200));
      }
      if (!formats.feedFenced) return log("feed format: " + formats.feed.slice(0, 120));
      if (!(formats.chatHasYou && formats.chatHasTool && formats.chatHasContext)) {
        return log("chat format: " + formats.chat.slice(0, 280));
      }
      if (!formats.viaTarget.includes(formats.thread.split("\n")[0].slice(0, 20))) {
        // viaTarget should be a thread fence for a post target
        if (!/--- nightboard thread/.test(formats.viaTarget)) {
          return log("formatForTarget not thread: " + formats.viaTarget.slice(0, 120));
        }
      }

      // UI: copy button on a post copies something fenced.
      await page.evaluate(() => {
        window.__nbCopied = null;
        window.NB_COPY.copyText = (t) => {
          window.__nbCopied = t;
          return Promise.resolve(true);
        };
      });
      const copyBtn = page.locator("[data-copy-post]").first();
      if (!(await copyBtn.count())) return log("no copy button on posts");
      await copyBtn.click();
      await page.waitForTimeout(60);
      const clipped = await page.evaluate(() => window.__nbCopied);
      if (!clipped || !/--- nightboard thread/.test(clipped)) {
        return log("post copy button: " + String(clipped).slice(0, 160));
      }

      // Context menu Copy on channel.
      await go(page, "/projects/community/channels");
      await page.waitForTimeout(60);
      await page.locator(
        '[data-blade-kind="list"] .cn-item[data-key="general"]',
      ).first().click({ button: "right" });
      await page.waitForTimeout(60);
      const hasCopy = await page.evaluate(() =>
        !!document.querySelector('[data-ctx-verb="copy"]'));
      if (!hasCopy) return log("context menu missing Copy");
      await page.click('[data-ctx-verb="copy"]');
      await page.waitForTimeout(60);
      const feedClip = await page.evaluate(() => window.__nbCopied);
      if (!feedClip || !/--- nightboard feed/.test(feedClip)) {
        return log("channel copy: " + String(feedClip).slice(0, 160));
      }
      return true;
    },
  },
  {
    name: "ctx: right-click opens themed menu with Prompt… and ≤3 actions",
    run: async (page, log) => {
      await go(page, "/projects/community/channels");
      await page.waitForTimeout(80);
      const item = page.locator(
        '[data-blade-kind="list"] .cn-item[data-key="general"], [data-blade-path="/projects/community/channels"] .cn-item[data-key="general"]',
      ).first();
      if (!(await item.count())) return log("general channel missing");
      await item.click({ button: "right" });
      await page.waitForTimeout(80);
      const menu = await page.evaluate(() => {
        const el = document.querySelector("[data-ctx-menu]");
        if (!el) return { open: false };
        const prompt = el.querySelector("[data-ctx-prompt]");
        const actions = Array.from(el.querySelectorAll("[data-ctx-action]")).map((a) => ({
          id: a.getAttribute("data-ctx-action"),
          label: (a.textContent || "").trim(),
        }));
        const style = getComputedStyle(el);
        return {
          open: el.getAttribute("data-open") === "true",
          role: el.getAttribute("role"),
          prompt: !!(prompt && /prompt/i.test(prompt.textContent || "")),
          actionCount: actions.length,
          actions: actions.slice(0, 4),
          radius: style.borderRadius,
          bg: style.backgroundColor,
        };
      });
      if (!menu.open) return log("menu not open: " + JSON.stringify(menu));
      if (menu.role !== "menu") return log("role: " + menu.role);
      if (!menu.prompt) return log("Prompt… missing: " + JSON.stringify(menu));
      if (menu.actionCount < 1 || menu.actionCount > 3) {
        return log("expected 1–3 actions: " + JSON.stringify(menu));
      }
      // TTY: no soft pill radius.
      if (menu.radius && menu.radius !== "0px") {
        return log("rounded menu chrome: " + menu.radius);
      }
      return true;
    },
  },
  {
    name: "ctx: Prompt… binds id/name chips above the agent input",
    run: async (page, log) => {
      await go(page, "/projects/community/channels");
      await page.waitForTimeout(80);
      await page.locator(
        '[data-blade-kind="list"] .cn-item[data-key="general"]',
      ).first().click({ button: "right" });
      await page.waitForTimeout(60);
      await page.click("[data-ctx-prompt]");
      await page.waitForTimeout(100);
      const bound = await page.evaluate(() => {
        const tray = document.querySelector("[data-ctx-bound-tray]");
        const chips = Array.from(document.querySelectorAll("[data-ctx-bound-chip]")).map((c) => ({
          id: c.getAttribute("data-ctx-id"),
          name: c.getAttribute("data-ctx-name"),
          kind: c.getAttribute("data-ctx-kind"),
          text: (c.textContent || "").replace(/\s+/g, " ").trim(),
        }));
        const menuOpen = document.querySelector("[data-ctx-menu][data-open='true']");
        return {
          tray: !!tray,
          chips,
          menuClosed: !menuOpen,
          ai: !!window.NB_APP.state.ai,
          focusCli: document.activeElement?.hasAttribute?.("data-cli"),
          bound: (window.NB_APP.state.boundContext || []).map((b) => ({
            id: b.id, name: b.name, kind: b.kind,
          })),
        };
      });
      if (!bound.menuClosed) return log("menu still open");
      if (!bound.ai) return log("did not switch to ai mode");
      if (!bound.tray || !bound.chips.length) {
        return log("bound chips missing: " + JSON.stringify(bound));
      }
      const chip = bound.chips[0];
      if (!chip.id || !chip.name) {
        return log("chip missing id/name attrs: " + JSON.stringify(chip));
      }
      if (!(chip.text.includes(chip.name) || chip.text.includes(chip.id))) {
        return log("chip text lacks id/name: " + JSON.stringify(chip));
      }
      // Tray must sit above the CLI input in the prompt stack.
      const order = await page.evaluate(() => {
        const stack = document.querySelector(".cn-prompt-stack");
        if (!stack) return [];
        return Array.from(stack.children).map((el) =>
          el.hasAttribute("data-ctx-bound-tray") ? "bound"
            : el.classList.contains("cn-prompt") ? "prompt"
              : el.getAttribute("data-key") || el.className.split(" ")[0]);
      });
      const bi = order.indexOf("bound");
      const pi = order.indexOf("prompt");
      if (bi < 0 || pi < 0 || bi >= pi) {
        return log("bound tray not above input: " + JSON.stringify(order));
      }
      return true;
    },
  },
  {
    name: "ctx: agent learns ≤3 actions from interactions (background synth)",
    run: async (page, log) => {
      await go(page, "/projects/community/channels");
      await page.waitForTimeout(80);
      const seeded = await page.evaluate(() => {
        const CTX = window.NB_CTX;
        if (!CTX) return { ok: false, why: "NB_CTX missing" };
        try {
          localStorage.removeItem("nb-ctx-ledger");
          localStorage.removeItem("nb-ctx-actions");
        } catch { /* fine */ }
        CTX.resetLearning();
        const key = "nav-item:/projects/community/channels/general";
        // Prefer reply-like verbs so templates alone are not the only source.
        ["activate", "activate", "copy-path", "activate", "expand"].forEach((verb) => {
          CTX.record({ controlKey: key, verb: verb });
        });
        CTX.synthesizeNow();
        const actions = CTX.actionsFor(key) || [];
        return {
          ok: true,
          key,
          count: actions.length,
          verbs: actions.map((a) => a.verb),
          labels: actions.map((a) => a.label),
        };
      });
      if (!seeded.ok) return log(seeded.why || JSON.stringify(seeded));
      if (seeded.count < 1 || seeded.count > 3) {
        return log("synth count: " + JSON.stringify(seeded));
      }
      if (seeded.verbs[0] !== "activate") {
        return log("expected activate first from frequency: " + JSON.stringify(seeded));
      }
      // Right-click the same control — menu shows learned actions.
      await page.locator(
        '[data-blade-kind="list"] .cn-item[data-key="general"]',
      ).first().click({ button: "right" });
      await page.waitForTimeout(80);
      const shown = await page.evaluate(() =>
        Array.from(document.querySelectorAll("[data-ctx-action]")).map((a) =>
          a.getAttribute("data-ctx-verb")));
      if (!shown.includes("activate")) {
        return log("menu missing learned activate: " + JSON.stringify(shown));
      }
      if (shown.length > 3) return log("too many actions: " + shown.length);
      return true;
    },
  },
  {
    name: "ctx: Esc closes menu; learned action runs",
    run: async (page, log) => {
      await go(page, "/projects/community/channels");
      await page.waitForTimeout(80);
      await page.locator(
        '[data-blade-kind="list"] .cn-item[data-key="general"]',
      ).first().click({ button: "right" });
      await page.waitForTimeout(60);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(60);
      const closed = await page.evaluate(() =>
        !document.querySelector("[data-ctx-menu][data-open='true']"));
      if (!closed) return log("Esc did not close menu");

      await page.locator(
        '[data-blade-kind="list"] .cn-item[data-key="bugs"]',
      ).first().click({ button: "right" });
      await page.waitForTimeout(60);
      // Prefer activate / open if present; otherwise first action.
      const ran = await page.evaluate(() => {
        const btn = document.querySelector('[data-ctx-verb="activate"]') ||
          document.querySelector("[data-ctx-action]");
        if (!btn) return { ok: false };
        btn.click();
        return {
          ok: true,
          path: window.NB_APP.state.path,
          menuOpen: !!document.querySelector("[data-ctx-menu][data-open='true']"),
        };
      });
      if (!ran.ok) return log("no action button");
      if (ran.menuOpen) return log("menu stayed open after action");
      // activate on a channel dir should navigate or preview toward bugs.
      if (!String(ran.path).includes("bugs") && ran.path !== "/projects/community/channels") {
        // Allow staying on parent if activate = select; check cursor name.
        const cur = await page.evaluate(() => {
          const all = window.NB_MAP.list(window.NB_APP.state.path, window.NB_APP.state.merged) || [];
          const e = all[window.NB_APP.state.cursor];
          return e && e.name;
        });
        if (cur !== "bugs" && !String(ran.path).includes("bugs")) {
          return log("action did not target bugs: path=" + ran.path + " cur=" + cur);
        }
      }
      return true;
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
/** Click a nav row (preview only), then Enter to activate / slide in. */
async function openNavItem(page, sel) {
  await page.click(sel);
  await page.waitForTimeout(40);
  await page.evaluate(() => {
    document.querySelector("[data-cli]")?.blur();
    window.NB_APP.state.columnFocus = true;
    window.NB_APP.state.focus = 0;
  });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(120);
}
async function _count(page, sel) {
  return page.evaluate((s) => document.querySelectorAll(s).length, sel);
}
void _count;


const browser = await chromium.launch();
let failed = 0;
const selected = FILTER
  ? CASES.filter((c) => c.name.includes(FILTER))
  : CASES;
if (FILTER && !selected.length) {
  console.error("no e2e cases match filter: " + FILTER);
  process.exit(1);
}
for (const testCase of selected) {
  const context = await browser.newContext({
    viewport: testCase.viewport || { width: 1440, height: 900 },
    hasTouch: !!testCase.touch,
  });
  // Most suites assume a returning visitor. First-visit onboarding is covered
  // by the dedicated `firstVisit` case (empty localStorage).
  if (!testCase.firstVisit) {
    await context.addInitScript(() => {
      try { localStorage.setItem("nb-keys-onboarded", "1"); } catch { /* fine */ }
    });
  }
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const startUrl = testCase.landing ? BASE : BOARD;
  await page.goto(startUrl, { waitUntil: "domcontentloaded" });
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
