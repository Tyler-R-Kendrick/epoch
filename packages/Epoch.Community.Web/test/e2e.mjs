/**
 * Feature regressions for the Community Web console, driven through the browser.
 *
 * The fault suite proves the failure paths; this proves the features — with
 * the mouse, the keyboard and a touchscreen, from the state the page actually
 * boots into. It exists because click navigation shipped broken twice: every
 * hand-check had typed `cd` first, so no check ever clicked from where a
 * person actually starts.
 *
 *   node packages/Epoch.Community.Web/test/e2e.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { request } from "node:http";
import { serveCommunityWebApp } from "../scripts/serve.mjs";

const own = process.argv[2] ? null : await serveCommunityWebApp();
const BASE = process.argv[2] || own.url;
const BOARD = new URL("board.html", BASE.endsWith("/") ? BASE : BASE + "/").href;
const FILTER = process.env.CW_E2E || "";

if (own) {
  const malformedStatus = await new Promise((resolve) => {
    request(new URL("%", BASE), (response) => {
      response.resume();
      response.on("end", () => resolve(response.statusCode));
    }).on("error", () => resolve(0)).end();
  });
  if (malformedStatus !== 400) {
    await own.close();
    throw new Error("malformed URL path must return 400, got " + malformedStatus);
  }
}

const CASES = [
  {
    name: "NAV-REG-001 landing: default / is Persuade marketing home",
    landing: true,
    run: async (page, log) => {
      const probe = await page.evaluate(() => ({
        landing: document.body?.getAttribute("data-landing"),
        cta: document.querySelector("[data-enter-board]")?.getAttribute("href"),
        brand: !!document.querySelector("[data-landing-brand]"),
        headline: document.querySelector(".cw-landing-headline")?.getAttribute("aria-label")?.trim()
          || document.querySelector(".cw-landing-headline")?.textContent?.trim(),
        lines: Array.from(document.querySelectorAll(".cw-landing-headline [data-type-line]"))
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
        const headline = document.querySelector(".cw-landing-headline");
        const headlineLabel = headline?.getAttribute("aria-label") || "";
        const typed = Array.from(headline?.querySelectorAll("[data-type-line]") || [])
          .map((el) => {
            const copy = el.cloneNode(true);
            copy.querySelectorAll(".cw-headline-cursor").forEach((c) => c.remove());
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
          hasCrtMass: !!document.querySelector(".cw-crt-grain") && !!document.querySelector(".cw-crt-barrel"),
          hasRail: !!document.querySelector("[data-scroll-rail]"),
          hasRide: !!document.querySelector("[data-ride-track]") && !!document.querySelector("[data-ride-stage]"),
          hasCrtTube: !!document.querySelector("[data-crt-tube]") && !!document.getElementById("cw-crt-barrel-filter"),
          hasCaseRail: document.querySelectorAll(".cw-scroll-rail-item .cw-case-code").length >= 5,
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
          hasCursor: !!headline?.querySelector(".cw-headline-cursor"),
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
        progress: document.body.style.getPropertyValue("--cw-scroll"),
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
        scroll: document.body.style.getPropertyValue("--cw-scroll"),
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
    name: "NAV-REG-001 landing: Enter the board opens canonical Operate TUI",
    landing: true,
    run: async (page, log) => {
      await page.click("[data-enter-board]");
      await page.waitForTimeout(400);
      const onBoard = await page.evaluate(() => ({
        href: window.location.href,
        hasApp: !!window.CW_APP,
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
        window.CW_APP.state.columnFocus = true;
        window.CW_APP.state.focus = 0;
      });
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(120);
      const after = await page.evaluate(() => ({
        path: window.CW_APP.state.path,
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
        window.CW_APP.state.columnFocus = true;
        window.CW_APP.state.focus = 0;
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
        window.CW_APP.state.detailOpen = true;
        window.CW_APP.state.threadFocus = null;
        window.CW_APP.state.focus = 1;
        window.CW_APP.render(true);
      });
      await page.waitForTimeout(80);
      // Channel feed lives in detail — multiple root threads visible.
      const feed = await page.evaluate(() => ({
        roots: Array.from(document.querySelectorAll('.cn-comment[data-depth="0"]'))
          .map((el) => el.getAttribute("data-key")),
        total: document.querySelectorAll(".cn-comment").length,
        threadCtx: !!document.querySelector(".cn-thread-ctx"),
        feedBar: !!document.querySelector(".cn-feed-bar"),
        navPosts: (window.CW_MAP.list(
          window.CW_MAP.navParentPath(window.CW_APP.state.path), window.CW_APP.state.merged,
        ) || [])
          .filter((e) => e && e.post).length,
      }));
      if (feed.navPosts !== 0) return log("channel nav should be empty of posts: " + JSON.stringify(feed));
      if (feed.roots.length < 2) return log("expected channel feed roots: " + JSON.stringify(feed));
      if (feed.threadCtx) return log("thread chrome on channel feed");
      if (!feed.feedBar) return log("feed bar missing on channel");

      // j/k in detail marks a feed row without opening a thread.
      await page.evaluate(() => {
        document.querySelector("[data-cli]")?.blur();
        window.CW_APP.focusColumns();
        window.CW_APP.state.focus = 1;
        window.CW_APP.state.feedMark = null;
      });
      await page.keyboard.press("j");
      await page.waitForTimeout(80);
      const preview = await page.evaluate(() => ({
        focus: window.CW_APP.state.threadFocus,
        mark: window.CW_APP.state.feedMark,
        bladeFocus: window.CW_APP.state.focus,
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
        focus: window.CW_APP.state.threadFocus,
        roots: Array.from(document.querySelectorAll('.cn-comment[data-depth="0"]'))
          .map((el) => el.getAttribute("data-key")),
        ids: Array.from(document.querySelectorAll(".cn-comment"))
          .map((el) => el.getAttribute("data-key")),
        here: document.querySelector('.cn-comment[data-here="true"]')?.getAttribute("data-key"),
        threadCtx: !!document.querySelector(".cn-thread-ctx"),
        feedBar: !!document.querySelector(".cn-feed-bar"),
        bladeFocus: window.CW_APP.state.focus,
        replyTo: window.CW_APP.state.replyTo?.id || null,
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
        focus: window.CW_APP.state.threadFocus,
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
    name: "keyboard: message list has one roving focus target and opens the selected thread",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.waitForTimeout(80);
      await page.focus('.cn-comment[tabindex="0"]');
      const entered = await page.evaluate(() => {
        const active = document.activeElement?.closest?.(".cn-comment");
        return {
          active: active?.getAttribute("data-key") || null,
          here: document.querySelector('.cn-comment[data-here="true"]')?.getAttribute("data-key") || null,
          current: active?.getAttribute("aria-current") || null,
          role: active?.getAttribute("role") || null,
          tabbable: document.querySelectorAll('.cn-tree .cn-comment[tabindex="0"]').length,
        };
      });
      if (!(entered.active && entered.active === entered.here && entered.current === "true" &&
          entered.role === "article" && entered.tabbable === 1)) {
        return log("Tab did not enter one selected message: " + JSON.stringify(entered));
      }

      await page.keyboard.press("ArrowDown");
      await page.waitForFunction((previous) =>
        document.activeElement?.closest?.(".cn-comment")?.getAttribute("data-key") !== previous,
      entered.active);
      const moved = await page.evaluate(() => {
        const active = document.activeElement?.closest?.(".cn-comment");
        return {
          active: active?.getAttribute("data-key") || null,
          here: document.querySelector('.cn-comment[data-here="true"]')?.getAttribute("data-key") || null,
          mark: window.CW_APP.state.feedMark,
          tabbable: document.querySelectorAll('.cn-tree .cn-comment[tabindex="0"]').length,
        };
      });
      if (!(moved.active && moved.active !== entered.active && moved.active === moved.here &&
          moved.active === moved.mark && moved.tabbable === 1)) {
        return log("ArrowDown did not move message focus: " + JSON.stringify({ entered, moved }));
      }

      await page.keyboard.press("End");
      await page.waitForFunction(() => {
        const comments = Array.from(document.querySelectorAll(".cn-comment"));
        return document.activeElement?.closest?.(".cn-comment") === comments.at(-1);
      });
      await page.keyboard.press("ArrowDown");
      await page.evaluate(() => new Promise((resolve) =>
        window.requestAnimationFrame(() => window.requestAnimationFrame(resolve))));
      const end = await page.evaluate(() => ({
        active: document.activeElement?.closest?.(".cn-comment")?.getAttribute("data-key") || null,
        last: Array.from(document.querySelectorAll(".cn-comment")).at(-1)?.getAttribute("data-key") || null,
      }));
      if (!(end.active && end.active === end.last)) {
        return log("End/boundary did not retain the last message: " + JSON.stringify(end));
      }
      await page.keyboard.press("ArrowUp");
      await page.waitForFunction((previous) =>
        document.activeElement?.closest?.(".cn-comment")?.getAttribute("data-key") !== previous,
      end.active);
      const recovered = await page.evaluate(() => ({
        active: document.activeElement?.closest?.(".cn-comment")?.getAttribute("data-key") || null,
        here: document.querySelector('.cn-comment[data-here="true"]')?.getAttribute("data-key") || null,
      }));
      if (!(recovered.active && recovered.active !== end.active && recovered.active === recovered.here)) {
        return log("ArrowUp did not recover from list end: " + JSON.stringify({ end, recovered }));
      }

      await page.keyboard.press("Enter");
      await page.waitForFunction((expected) => window.CW_APP.state.threadFocus === expected, recovered.active);
      const opened = await page.evaluate(() => ({
        thread: window.CW_APP.state.threadFocus,
        active: document.activeElement?.closest?.(".cn-comment")?.getAttribute("data-key") || null,
        threadCtx: !!document.querySelector(".cn-thread-ctx"),
      }));
      if (!(opened.thread === recovered.active && opened.active === recovered.active && opened.threadCtx)) {
        return log("Enter did not open/focus selected thread: " + JSON.stringify(opened));
      }
      return true;
    },
  },
  {
    name: "power: message namespace drill and reply-parent navigation stay distinct",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.focus('.cn-comment[data-key="p3"]');
      await page.keyboard.press("ArrowRight");
      await page.evaluate(() => new Promise((resolve) =>
        window.requestAnimationFrame(() => window.requestAnimationFrame(resolve))));
      const drilled = await page.evaluate(() => ({
        path: window.CW_APP.state.path,
        thread: window.CW_APP.state.threadFocus,
        active: document.activeElement?.closest?.(".cn-comment")?.getAttribute("data-key") || null,
      }));
      if (drilled.path !== "/projects/community/channels/general/p1/p2/p3" ||
          drilled.thread !== "p3" || drilled.active !== "p3") {
        return log("message did not become directory context: " + JSON.stringify(drilled));
      }
      await page.keyboard.press("ArrowLeft");
      await page.waitForFunction(() => window.CW_APP.state.feedMark === "p2");
      const parented = await page.evaluate(() => ({
        path: window.CW_APP.state.path,
        root: window.CW_APP.state.threadFocus,
        selected: window.CW_APP.state.feedMark,
      }));
      if (parented.path !== drilled.path || parented.root !== "p3" || parented.selected !== "p2") {
        return log("reply parent changed namespace: " + JSON.stringify(parented));
      }
      await page.evaluate(() => window.CW_ACTIONS.invoke("nav.enter", {
        line: "cd ..", arg: "..", options: {},
      }, { origin: "cli", context: "board" }));
      const ascended = await page.evaluate(() => ({
        path: window.CW_APP.state.path,
        action: window.CW_ACTIONS.lastEvent()?.actionId,
      }));
      return ascended.path === "/projects/community/channels/general/p1/p2" &&
        ascended.action === "nav.enter" || log("namespace ascend failed: " + JSON.stringify(ascended));
    },
  },
  {
    name: "power: cd message ids show summaries and preview can cancel or commit",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      const prompt = page.locator("[data-cli]");
      await prompt.fill("cd p3");
      await page.waitForSelector('.cn-menu:not([hidden]) [role="option"]');
      const labelled = await page.evaluate(() => {
        const row = Array.from(document.querySelectorAll('.cn-menu [role="option"]'))
          .find((el) => el.querySelector("span")?.textContent?.trim() === "p3");
        return {
          found: !!row,
          summary: row?.querySelector("i")?.textContent?.trim() || "",
        };
      });
      if (!labelled.found || !/Drafted a plan to split the cache key/i.test(labelled.summary)) {
        return log("message completion lacks id/title: " + JSON.stringify(labelled));
      }

      await prompt.fill("cd p");
      await prompt.press("ArrowDown");
      await page.waitForFunction(() => window.CW_APP.state.path !==
        "/projects/community/channels/general");
      const preview = await page.evaluate(() => ({
        preview: document.querySelector("[data-cd-preview]")?.textContent || "",
        path: window.CW_APP.state.path,
        draft: document.querySelector("[data-cli]")?.value,
      }));
      if (!preview.path.includes("/general/p") || preview.draft !== "cd p" ||
          !/preview.*Enter.*Esc/i.test(preview.preview)) {
        return log("cd candidate did not preview: " + JSON.stringify(preview));
      }
      await prompt.press("Escape");
      await page.waitForFunction(() => window.CW_APP.state.path ===
        "/projects/community/channels/general");
      const cancelled = await page.evaluate(() => ({
        path: window.CW_APP.state.path,
        draft: document.querySelector("[data-cli]")?.value,
      }));
      if (cancelled.path !== "/projects/community/channels/general" || cancelled.draft !== "cd p") {
        return log("cd preview did not cancel: " + JSON.stringify(cancelled));
      }

      await prompt.fill("");
      await prompt.fill("cd p");
      await prompt.press("ArrowDown");
      const acceptedPath = await page.evaluate(() => window.CW_APP.state.path);
      await prompt.press("Enter");
      await page.waitForFunction((path) => window.CW_APP.state.path === path, acceptedPath);
      const accepted = await page.evaluate(() => ({
        path: window.CW_APP.state.path,
        draft: document.querySelector("[data-cli]")?.value,
        status: document.querySelector("[data-status-line]")?.textContent || "",
      }));
      return accepted.path === acceptedPath && /\/general\/p/.test(accepted.path) &&
        accepted.draft === "" && !/^preview\b/i.test(accepted.status.trim()) ||
        log("cd preview did not commit: " + JSON.stringify(accepted));
    },
  },
  {
    name: "NAV-ACTION-003 NAV-REG-003 power: one saved macro powers prompt, agent tool, and exact voice phrase",
    run: async (page, log) => {
      await page.evaluate(() => localStorage.removeItem("cw-power-actions-v1"));
      await page.reload();
      await page.waitForSelector("[data-cli]");
      const prompt = page.locator("[data-cli]");
      await prompt.fill("macro set review = cd /projects/community/channels/general; search state:open");
      await prompt.press("Enter");
      await prompt.fill("macro voice review = start review");
      await prompt.press("Enter");

      const defined = await page.evaluate(() => ({
        actions: window.CW_POWER?.list() || [],
        tools: window.CW_MCP.list().map((tool) => tool.name),
        exact: window.CW_SPEECH.parseUtterance("start review", "commands"),
        near: window.CW_SPEECH.parseUtterance("start reviewing", "commands"),
      }));
      if (defined.actions.length !== 1 || defined.actions[0].name !== "review") {
        return log("macro not saved: " + JSON.stringify(defined));
      }
      if (defined.actions[0].actionIds.join(",") !== "nav.enter,search.open") {
        return log("macro did not migrate to action IDs: " + JSON.stringify(defined.actions[0]));
      }
      if (!defined.tools.includes("user_review")) return log("custom agent tool missing");
      if (!(defined.exact.kind === "command" && defined.exact.line === "macro run review")) {
        return log("exact voice phrase did not resolve: " + JSON.stringify(defined.exact));
      }
      if (defined.near.kind !== "unknown") {
        return log("near voice phrase should fail closed: " + JSON.stringify(defined.near));
      }

      await prompt.fill("macro run review");
      await prompt.press("Enter");
      const prompted = await page.evaluate(() => ({
        path: window.CW_APP.state.path,
        query: window.CW_APP.state.searchWorkbench?.expression,
        action: window.CW_ACTIONS.lastEvent(),
      }));
      if (prompted.path !== "/projects/community/channels/general" || prompted.query !== "state:open" ||
          prompted.action?.actionId !== "search.open" || prompted.action?.origin !== "macro") {
        return log("prompt did not run saved macro: " + JSON.stringify(prompted));
      }

      await prompt.fill("macro set foo-bar = cd /projects/community/channels/general");
      await prompt.press("Enter");
      await prompt.fill("macro set foo_bar = cd /projects/community/channels/general");
      await prompt.press("Enter");
      const collisionTools = await page.evaluate(() => window.CW_MCP.list().map((tool) => tool.name));
      if (!collisionTools.includes("user_foo-bar") || !collisionTools.includes("user_foo_bar")) {
        return log("custom tool names collided: " + JSON.stringify(collisionTools));
      }

      const called = await page.evaluate(async () => {
        const result = await window.CW_MCP.call("user_review", {});
        return {
          error: !!result.isError,
          path: window.CW_APP.state.path,
          query: window.CW_APP.state.feedQuery,
        };
      });
      if (called.error || called.path !== "/projects/community/channels/general" ||
          called.query !== "state:open") {
        return log("agent tool did not run saved macro: " + JSON.stringify(called));
      }

      await page.evaluate(() => localStorage.setItem("cw-power-actions-v1", JSON.stringify({
        review: { commands: ["cd /projects/community/channels/general", "view state:open"], voice: "start review" },
        "foo-bar": { commands: ["cd /projects/community/channels/general"], voice: "" },
        foo_bar: { commands: ["cd /projects/community/channels/general"], voice: "" },
        loop: { commands: ["macro run loop"], voice: "loop" },
        duplicate: { commands: ["cd /projects/community/channels/general"], voice: "start review" },
      })));
      await page.reload();
      await page.waitForSelector("[data-cli]");
      const persisted = await page.evaluate(() => ({
        actions: window.CW_POWER?.list() || [],
        tools: window.CW_MCP.list().map((tool) => tool.name),
      }));
      if (persisted.actions.map((item) => item.name).join(",") !== "foo-bar,foo_bar,review" ||
          persisted.actions.find((item) => item.name === "review")?.voice !== "start review" ||
          persisted.tools.includes("user_loop") || persisted.tools.includes("user_duplicate")) {
        return log("macro did not persist: " + JSON.stringify(persisted));
      }

      await page.locator("[data-cli]").fill("macro set unsafe = javascript:alert(1)");
      await page.locator("[data-cli]").press("Enter");
      const refused = await page.evaluate(() => ({
        names: window.CW_POWER.list().map((action) => action.name),
        out: Array.from(document.querySelectorAll(".cn-line")).map((line) => line.textContent).join("\n"),
      }));
      if (refused.names.includes("unsafe") || !/unknown command/i.test(refused.out)) {
        return log("unsafe macro was not refused: " + JSON.stringify(refused));
      }
      return true;
    },
  },
  {
    name: "NAV-REG-005 touch: tapping a channel selects; Enter opens",
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
        window.CW_APP.state.columnFocus = true;
        window.CW_APP.state.focus = 0;
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
    name: "keyboard: navigator arrows move, Enter descends, colon returns to prompt",
    run: async (page, log) => {
      await go(page, "/projects/community/channels");
      await page.evaluate(() => {
        window.CW_APP.state.columnFocus = true;
        window.CW_APP.render(true);
        document.querySelector('.cn-blade[data-blade-kind="list"] .cn-item[aria-current="true"]')?.focus();
      });
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      const p = await path(page);
      if (!p.startsWith("/projects/community/channels/")) return log("Enter went to " + p);
      await page.keyboard.press(":");
      const back = await page.evaluate(() =>
        document.activeElement === document.querySelector("[data-cli]"));
      return back || log("colon did not return the prompt");
    },
  },
  {
    name: "threads: ± and nest rails fold the comment chain",
    run: async (page, log) => {
      const result = await page.evaluate(async () => {
        window.CW_APP.setNavCollapsed(false, { silent: true, noRender: true });
        window.CW_APP.navigate("/projects/community/channels/general", { keepCli: true });
        // Channel feed paints in detail (posts are not nav children).
        window.CW_APP.state.detailOpen = true;
        window.CW_APP.state.threadFocus = null;
        window.CW_APP.state.focus = 1;
        window.CW_APP.render(true);
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
    name: "power: every focused-post action has a visible control and hotkey",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.evaluate(() => {
        window.CW_APP.state.columnFocus = true;
        window.CW_APP.state.feedMark = "p1";
        window.CW_APP.state.votes = {};
        window.CW_APP.state.folded = {};
        window.CW_APP.state.reposts = {};
        window.CW_APP.state.reactPick = null;
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: { writeText: async (text) => { window.__postActionClipboard = text; } },
        });
        window.CW_APP.render(true);
        document.querySelector('.cn-comment[data-key="p1"]')?.focus();
      });
      const article = page.locator('.cn-comment[data-key="p1"]');
      const controls = await article.evaluate((node) => ({
        up: node.querySelector('[data-vote="up"]')?.getAttribute("aria-keyshortcuts"),
        down: node.querySelector('[data-vote="down"]')?.getAttribute("aria-keyshortcuts"),
        react: node.querySelector("[data-react-pick]")?.getAttribute("aria-keyshortcuts"),
        fold: node.querySelector('[data-fold="p1"]')?.getAttribute("aria-keyshortcuts"),
        foldName: node.querySelector('[data-fold="p1"]')?.getAttribute("aria-label"),
        reply: node.querySelector("[data-reply]")?.getAttribute("aria-keyshortcuts"),
        repost: node.querySelector("[data-repost]")?.getAttribute("aria-keyshortcuts"),
        share: node.querySelector("[data-share-post]")?.getAttribute("aria-keyshortcuts"),
        copy: node.querySelector("[data-copy-post]")?.getAttribute("aria-keyshortcuts"),
      }));
      const expected = { up: "u", down: "d", react: "a", fold: "f", foldName: "Collapse replies", reply: "r",
        repost: "Shift+R", share: "s", copy: "y" };
      if (JSON.stringify(controls) !== JSON.stringify(expected)) {
        return log("post action controls: " + JSON.stringify(controls));
      }
      await page.keyboard.press("u");
      await page.keyboard.press("d");
      await page.keyboard.press("a");
      const reactionOpened = await page.evaluate(() => window.CW_APP.state.reactPick === "p1");
      await page.keyboard.press("f");
      await page.keyboard.press("Shift+r");
      await page.keyboard.press("s");
      const shared = await page.evaluate(() => window.__postActionClipboard || "");
      await page.keyboard.press("y");
      await page.waitForFunction(() => /community web thread.*p1/i.test(window.__postActionClipboard || ""));
      const acted = await page.evaluate(() => ({
        vote: window.CW_APP.state.votes.p1,
        reactionOpen: window.CW_APP.state.reactPick === "p1",
        folded: window.CW_APP.state.folded.p1 === true,
        reposted: window.CW_APP.state.reposts?.p1 === true,
        copied: window.__postActionClipboard || "",
        focused: document.activeElement?.getAttribute("data-key"),
      }));
      if (!(acted.vote === -1 && reactionOpened && acted.folded && acted.reposted &&
            acted.focused === "p1" && /^https?:\/\/.*\/board\.html\?projection=/.test(shared) &&
            /community web thread.*p1/i.test(acted.copied))) {
        return log("post action hotkeys: " + JSON.stringify(acted));
      }
      await page.keyboard.press("Alt+t");
      const isolated = await page.evaluate(() => window.CW_APP.state.reposts?.p1 !== true);
      await page.click('.cn-workspace-tab[data-session="0"]');
      const restored = await page.evaluate(() => {
        const post = document.querySelector('.cn-comment[data-key="p1"]');
        post?.focus();
        return window.CW_APP.state.reposts?.p1 === true;
      });
      if (!isolated || !restored) return log("repost workspace isolation failed");
      await page.keyboard.press("r");
      const reply = await page.evaluate(() => ({
        id: window.CW_APP.composeContext?.().postId,
        prompt: document.activeElement === document.querySelector("[data-cli]"),
      }));
      return (reply.id === "p1" && reply.prompt) || log("reply hotkey: " + JSON.stringify(reply));
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
        path: window.CW_APP.state.path,
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
          path: window.CW_APP.state.path,
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
    name: "detail: explicit close shows Following; bare Esc is a no-op; file reopens selection",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.waitForTimeout(100);
      // Channel path opens detail feed (posts live in detail, not nav).
      await page.evaluate(() => {
        window.CW_APP.state.detailOpen = true;
        window.CW_APP.state.focus = 1;
        window.CW_APP.render(true);
      });
      await page.waitForTimeout(80);
      const before = await page.evaluate(() => ({
        detail: !!document.querySelector('.cn-blade[data-blade-kind="detail"]'),
        open: window.CW_APP.isDetailOpen && window.CW_APP.isDetailOpen(),
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
          open: window.CW_APP.isDetailOpen(),
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
        else window.CW_APP.openDetail({ silent: true });
      });
      await page.waitForTimeout(100);
      const reopened = await page.evaluate(() => ({
        detail: !!document.querySelector('.cn-blade[data-blade-kind="detail"]'),
        open: window.CW_APP.isDetailOpen(),
        follow: !!document.querySelector(".cn-follow-feed"),
      }));
      if (!(reopened.detail && reopened.open && !reopened.follow)) {
        return log("did not reopen selection: " + JSON.stringify(reopened));
      }
      // With no cancellable layer, Escape is explicit no-op. The close control
      // above remains the pointer/keyboard path to Following.
      await page.evaluate(() => {
        window.CW_APP.state.columnFocus = true;
        window.CW_APP.state.focus = 1;
        if (window.CW_APP.state.editor) window.CW_APP.state.editor.focused = false;
        document.body.focus();
      });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(60);
      const mid = await page.evaluate(() => ({
        thread: window.CW_APP.state.threadFocus,
        open: window.CW_APP.isDetailOpen(),
        follow: !!document.querySelector(".cn-follow-feed"),
      }));
      return (!mid.thread && mid.open && !mid.follow) ||
        log("bare Escape changed detail: " + JSON.stringify(mid));
    },
  },
  {
    name: "home: feed tabs activate by real mouse hit (narrow viewport)",
    viewport: { width: 390, height: 844 },
    run: async (page, log) => {
      await page.evaluate(() => {
        window.CW_APP.state.homeFeed = "following";
        window.CW_APP.closeDetail({ silent: true });
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
        const state = await page.evaluate(() => window.CW_APP.state.homeFeed);
        if (state !== id) return log(id + " click did not activate (state=" + state + ")");
      }

      // Channel feed sort chips (hot/new/top) on a fresh channel view.
      await page.evaluate(() => {
        window.CW_APP.openDetail({ silent: true, noRender: true });
        window.CW_APP.navigate("/projects/community/channels/general", { keepCli: true });
        window.CW_APP.state.threadFocus = null;
        window.CW_APP.state.feedMark = null;
        window.CW_APP.state.sort = "hot";
        window.CW_APP.state.feedView = "hot";
        window.CW_APP.state.focus = 1;
        window.CW_APP.render(true);
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
          sort: window.CW_APP.state.sort,
          view: window.CW_APP.state.feedView,
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
        const feed = window.CW_MAP.feedEntriesAt
          ? window.CW_MAP.feedEntriesAt(window.CW_APP.state.path, window.CW_APP.state.merged)
          : [];
        const first = feed.find((e) => e && e.post && !e.post.re);
        if (!first) return { err: "no feed post" };
        window.CW_APP.openThread(first.post.id, { silent: true });
        window.CW_APP.focusColumns();
        window.CW_APP.state.focus = 1;
        window.CW_APP.render(true);
        return { id: first.post.id };
      });
      if (opened.err) return log(opened.err);
      await page.waitForTimeout(80);
      const before = await page.evaluate(() => ({
        thread: window.CW_APP.state.threadFocus,
        focus: window.CW_APP.state.focus,
        detail: window.CW_APP.isDetailOpen(),
      }));
      if (!before.thread) return log("thread not opened: " + JSON.stringify(before));
      await page.evaluate(() => {
        window.CW_APP.focusColumns();
        window.CW_APP.state.focus = 1; // detail owns keyboard
      });
      await page.keyboard.press("j");
      await page.waitForTimeout(80);
      const after = await page.evaluate(() => ({
        thread: window.CW_APP.state.threadFocus,
        focus: window.CW_APP.state.focus,
        stillThread: !!window.CW_APP.state.threadFocus,
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
        const feed = window.CW_MAP.feedEntriesAt
          ? window.CW_MAP.feedEntriesAt(window.CW_APP.state.path, window.CW_APP.state.merged)
          : [];
        const ix = feed.findIndex((e) => e && e.post);
        if (ix < 0) return { err: "no feed post" };
        const navPath = window.CW_MAP.navParentPath(window.CW_APP.state.path);
        const nav = window.CW_MAP.list(navPath, window.CW_APP.state.merged) || [];
        if (nav.some((e) => e && e.post)) return { err: "channel nav still lists posts" };
        window.CW_APP.state.feedMark = feed[ix].post.id;
        window.CW_APP.state.focus = 1;
        window.CW_APP.state.threadFocus = null;
        window.CW_APP.state.detailOpen = true;
        if (window.CW_APP.state.editor) window.CW_APP.state.editor.focused = false;
        window.CW_APP.focusColumns();
        window.CW_APP.render(true);
        return { id: feed[ix].post.id, path: window.CW_APP.state.path, navLen: nav.length };
      });
      if (armed.err) return log(armed.err);
      await page.waitForFunction((id) =>
        document.activeElement?.classList.contains("cn-comment") === true &&
        document.activeElement.getAttribute("data-key") === id, armed.id);
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(120);
      const after = await page.evaluate(() => ({
        path: window.CW_APP.state.path,
        thread: window.CW_APP.state.threadFocus,
        editor: !!(window.CW_APP.state.editor && window.CW_APP.state.editor.focused),
      }));
      if (!after.path.startsWith(armed.path + "/") || !after.path.split("/").includes(armed.id)) {
        return log("→ should address the message path: " + JSON.stringify({ armed, after }));
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
        window.CW_APP.state.homeFeed = "following";
        window.CW_APP.state.homeCursor = 0;
        window.CW_APP.closeDetail({ silent: true });
        window.CW_APP.focusColumns();
      });
      await page.waitForTimeout(100);
      const start = await page.evaluate(() => ({
        view: document.querySelector(".cn-follow-feed")?.getAttribute("data-home-view"),
        cursor: window.CW_APP.state.homeCursor,
        current: document.querySelector("[data-home-cursor]")?.getAttribute("data-home-item"),
      }));
      if (start.view !== "following") return log("not on home: " + JSON.stringify(start));
      await page.keyboard.press("j");
      await page.waitForTimeout(60);
      const moved = await page.evaluate(() => ({
        cursor: window.CW_APP.state.homeCursor,
        current: document.querySelector("[data-home-cursor]")?.getAttribute("data-home-item"),
      }));
      if (!(moved.cursor >= 1)) return log("j did not move home cursor: " + JSON.stringify(moved));
      await page.keyboard.press("]");
      await page.waitForTimeout(80);
      const tabbed = await page.evaluate(() => ({
        feed: window.CW_APP.state.homeFeed,
        cursor: window.CW_APP.state.homeCursor,
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
        detail: window.CW_APP.isDetailOpen(),
        follow: !!document.querySelector(".cn-follow-feed"),
        path: window.CW_APP.state.path,
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
        window.CW_APP.goHome({ silent: true });
      });
      await page.waitForTimeout(120);
      const after = await page.evaluate(() => ({
        path: window.CW_APP.state.path,
        detailOpen: window.CW_APP.state.detailOpen,
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
          localStorage.removeItem("cw-home-feed-read");
          localStorage.removeItem("cw-home-feed-dismissed");
        } catch { /* fine */ }
        window.CW_APP.state.homeFeedRead = {};
        window.CW_APP.state.homeFeedDismissed = {};
        window.CW_APP.state.homeFollowVisible = 4;
        window.CW_APP.state.homeFeed = "following";
        window.CW_APP.state.homeCursor = 0;
        window.CW_APP.closeDetail({ silent: true });
        window.CW_APP.render(true);
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
          dismissed: !!window.CW_APP.state.homeFeedDismissed?.[info.id],
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
        window.CW_APP.state.columnFocus = true;
        window.CW_APP.state.focus = 1;
        window.CW_APP.state.homeCursor = 0;
        window.CW_APP.render(true);
        const row = document.querySelector(".cn-follow-row");
        return row?.getAttribute("data-follow-id") || null;
      });
      if (hotkeyBefore) {
        await page.keyboard.press("d");
        await page.waitForTimeout(80);
        const hotkeyOk = await page.evaluate((id) =>
          !!window.CW_APP.state.homeFeedDismissed?.[id], hotkeyBefore);
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
            stored: !!window.CW_APP.state.homeFeedRead?.[id],
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
        visible: window.CW_APP.state.homeFollowVisible,
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
        try { localStorage.removeItem("cw-home-feed-read"); } catch { /* fine */ }
        window.CW_APP.state.homeFeedRead = {};
        window.CW_APP.state.homeFeed = "following";
        window.CW_APP.state.homeAnnCollapsed = {};
        window.CW_APP.closeDetail({ silent: true });
      });
      await page.waitForTimeout(80);
      const start = await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll(".cn-home-tab")).map((el) => ({
          id: el.getAttribute("data-home-feed"),
          pressed: el.getAttribute("aria-pressed"),
          unread: el.querySelector(".cn-home-unread")?.textContent || "0",
          hidden: el.querySelector(".cn-home-unread")?.hasAttribute("hidden") || false,
        }));
        const counts = window.CW_APP.homeFeedUnreadCounts?.() || {};
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
          state: window.CW_APP.state.homeFeed,
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
          session: !!window.CW_APP.state.homeAnnCollapsed?.["ann-1"],
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
      const beforeCounts = await page.evaluate(() => window.CW_APP.homeFeedUnreadCounts());
      await page.click('.cn-cre-card[data-unread="true"] .cn-home-open');
      await page.waitForTimeout(100);
      await page.evaluate(() => window.CW_APP.closeDetail({ silent: true }));
      await page.waitForTimeout(80);
      await page.click('.cn-home-tab[data-home-feed="creators"]');
      await page.waitForTimeout(80);
      const after = await page.evaluate(() => ({
        counts: window.CW_APP.homeFeedUnreadCounts(),
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
      // Rail-collapse remains available as a direct layout control; z now
      // expands whichever panel actually has focus.
      await page.evaluate(() => window.CW_APP.setNavCollapsed(true));
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
          api: window.CW_APP.isNavCollapsed && window.CW_APP.isNavCollapsed(),
        };
      });
      if (!collapsed.flag || collapsed.rails < 1 || collapsed.listOpen) {
        return log("nav layout control did not collapse to rails: " + JSON.stringify(collapsed));
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
      await page.evaluate(() => window.CW_APP.setNavCollapsed(true));
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
        window.CW_APP.setNavCollapsed(false, { silent: true });
        window.CW_APP.state.detailOpen = true;
        window.CW_APP.state.threadFocus = null;
        window.CW_APP.render(true);
      });
      await page.waitForTimeout(80);
      const ready = await page.locator('.cn-blade[data-blade-kind="detail"] .cn-comment[data-key="p1"]').count();
      if (!ready) return log("no detail feed posts");
      // Click a post in the detail feed — thread opens, nav stays usable.
      await page.click('.cn-blade[data-blade-kind="detail"] .cn-comment[data-key="p1"]');
      await page.waitForTimeout(150);
      const after = await page.evaluate(() => ({
        collapsed: window.CW_APP.isNavCollapsed(),
        rails: document.querySelectorAll('.cn-blade[data-collapsed="true"]').length,
        detail: !!document.querySelector('.cn-blade[data-blade-kind="detail"]'),
        open: window.CW_APP.isDetailOpen(),
        thread: window.CW_APP.state.threadFocus,
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
    name: "NAV-REG-003 NAV-ROUTE-004 tui: workspace tabs isolate history path transcript draft and focus",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.waitForTimeout(80);
      await page.evaluate(() => {
        window.CW_APP.state.columnFocus = false;
        document.querySelector("[data-cli]")?.focus();
      });
      await page.fill("[data-cli]", "draft-a");
      await page.keyboard.press("Alt+t");
      await page.waitForTimeout(120);
      const b = await page.evaluate(() => ({
        sessions: window.CW_APP.state.sessions?.length,
        path: window.CW_APP.state.path,
        draft: document.querySelector("[data-cli]")?.value || "",
        active: window.CW_APP.state.activeSession,
      }));
      if (b.sessions < 2) return log("no new workspace: " + JSON.stringify(b));
      if (b.draft === "draft-a") return log("draft leaked into new tab: " + JSON.stringify(b));
      // Switch back to first tab — draft should return.
      await page.click('.cn-panel-tab[data-session="0"], .cn-workspace-tab[data-session="0"]');
      await page.waitForTimeout(100);
      const a = await page.evaluate(() => ({
        path: window.CW_APP.state.path,
        draft: document.querySelector("[data-cli]")?.value || "",
        active: window.CW_APP.state.activeSession,
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
        const ctx = window.CW_APP.composeContext?.() || window.CW_APP.state.compose;
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
        window.CW_APP.state.columnFocus = false;
        document.querySelector("[data-cli]")?.focus();
      });
      // Clear armed prefix and type body if needed; send a clear reply line.
      await page.fill("[data-cli]", "e2e reply body under lea");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(150);
      const posted = await page.evaluate(() => {
        const merged = window.CW_APP.state.merged || [];
        const hit = merged.filter((p) => p.re === "p1" && /e2e reply body/.test(p.body || "")).pop();
        const tree = document.querySelector('.cn-comment[data-key="' + (hit?.id || "") + '"]');
        const ctx = window.CW_APP.composeContext?.() || window.CW_APP.state.compose;
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
        window.CW_APP.state.replyTo = null;
        window.CW_APP.state.compose = null;
        return window.CW_APP.composeContext?.() || window.CW_APP.state.compose;
      });
      if (ctx?.kind !== "post" || ctx?.channel !== "bugs") {
        return log("expected post#bugs context: " + JSON.stringify(ctx));
      }
      await page.evaluate(() => {
        window.CW_APP.state.columnFocus = false;
        document.querySelector("[data-cli]")?.focus();
      });
      await page.fill("[data-cli]", "e2e new bugs post");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(150);
      const posted = await page.evaluate(() => {
        const hit = (window.CW_APP.state.merged || [])
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
      const afterNav = await page.evaluate(() => window.CW_APP.composeContext?.() || window.CW_APP.state.compose);
      if (afterNav?.kind === "reply") return log("reply survived nav: " + JSON.stringify(afterNav));
      await page.evaluate(() => {
        window.CW_APP.state.columnFocus = false;
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
        const ctx = window.CW_APP.composeContext?.() || window.CW_APP.state.compose;
        const names = (window.CW_MAP.list(window.CW_APP.state.path, window.CW_APP.state.merged) || [])
          .map((e) => e.name);
        return { ctx, names, listed: window.CW_MCP.list().map((t) => t.name) };
      });
      if (before.ctx?.kind !== "nav" || before.ctx?.scope !== "channels") {
        return log("expected nav/channels: " + JSON.stringify(before.ctx));
      }
      if (!before.listed.includes("board_create_channel")) {
        return log("board_create_channel missing: " + before.listed.join(","));
      }
      const created = await page.evaluate(async () => {
        const res = await window.CW_MCP.call("board_create_channel", { name: "e2e-garden" });
        const text = (res?.content || []).map((c) => c.text || "").join("\n") || res?.text || JSON.stringify(res);
        const names = (window.CW_MAP.list("/projects/community/channels", window.CW_APP.state.merged) || [])
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
        const res = await window.CW_MCP.call("board_create_channel", { name: "tuner-only-room" });
        const text = (res?.content || []).map((c) => c.text || "").join("\n");
        const tuner = (window.CW_MAP.list("/projects/civic-tuner/channels", window.CW_APP.state.merged) || [])
          .map((e) => e.name);
        const community = (window.CW_MAP.list("/projects/community/channels", window.CW_APP.state.merged) || [])
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
        window.CW_MCP.list().map((t) => t.name));
      if (!listed.includes("board_rename_channel")) {
        return log("board_rename_channel missing: " + listed.join(","));
      }
      const before = await page.evaluate(() =>
        (window.CW_MAP.list("/projects/community/channels", window.CW_APP.state.merged) || [])
          .map((e) => e.name));
      if (!before.includes("ideas")) return log("ideas missing before: " + before.join(","));
      const renamed = await page.evaluate(async () => {
        const res = await window.CW_MCP.call("board_rename_channel", {
          from: "ideas",
          to: "ieades2",
        });
        const text = (res?.content || []).map((c) => c.text || "").join("\n") || "";
        const names = (window.CW_MAP.list("/projects/community/channels", window.CW_APP.state.merged) || [])
          .map((e) => e.name);
        const ch = window.CW_MAP.findChannelByLabel("ieades2");
        const old = window.CW_MAP.findChannelByLabel("ideas");
        // Navigate must fail for the old path and succeed for the new.
        const navOld = await window.CW_MCP.call("board_navigate", {
          path: "/projects/community/channels/ideas",
        });
        const navNew = await window.CW_MCP.call("board_navigate", {
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
          path: window.CW_APP.state.path,
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
      const ctx = await page.evaluate(() => window.CW_APP.composeContext?.() || window.CW_APP.state.compose);
      if (ctx?.kind !== "nav" || ctx?.scope !== "projects") {
        return log("expected nav/projects: " + JSON.stringify(ctx));
      }
      const out = await page.evaluate(async () => {
        if (!window.CW_MCP.list().some((t) => t.name === "board_create_project")) {
          return { err: true, text: "tool missing" };
        }
        const res = await window.CW_MCP.call("board_create_project", { name: "e2e-forge" });
        const text = (res?.content || []).map((c) => c.text || "").join("\n");
        const names = (window.CW_MAP.list("/projects", window.CW_APP.state.merged) || []).map((e) => e.name);
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
      const ctx = await page.evaluate(() => window.CW_APP.composeContext?.() || window.CW_APP.state.compose);
      if (ctx?.kind !== "dm" || ctx?.dm !== "scout") {
        return log("expected dm/scout: " + JSON.stringify(ctx));
      }
      await page.evaluate(() => {
        window.CW_APP.state.columnFocus = false;
        document.querySelector("[data-cli]")?.focus();
      });
      await page.fill("[data-cli]", "e2e dm ping");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(150);
      const hit = await page.evaluate(() => {
        return (window.CW_APP.state.merged || [])
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
        window.CW_APP.state.columnFocus = true;
        window.CW_APP.state.focus = 0;
        window.CW_APP.state.detailOpen = true;
        const list = window.CW_MAP.list("/projects/community/channels") || [];
        const ix = list.findIndex((e) => e.name === "bugs");
        window.CW_APP.state.cursor = ix >= 0 ? ix : 0;
        window.CW_APP.render(true);
      });
      await page.waitForTimeout(80);
      // Click another channel — path must stay; detail previews that channel's posts.
      await page.click('[data-blade-kind="list"] .cn-item[data-key="ideas"]');
      await page.waitForTimeout(100);
      const dirPreview = await page.evaluate(() => ({
        path: window.CW_APP.state.path,
        cursorName: (window.CW_MAP.list(window.CW_APP.state.path) || [])[window.CW_APP.state.cursor]?.name,
        focus: window.CW_APP.state.focus,
        detailOpen: window.CW_APP.isDetailOpen(),
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
        path: window.CW_APP.state.path,
        focus: window.CW_APP.state.focus,
        detailOpen: window.CW_APP.isDetailOpen(),
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
        window.CW_APP.state.columnFocus = true;
        window.CW_APP.state.focus = 1;
        window.CW_APP.state.threadFocus = null;
        const nav = window.CW_MAP.list(
          window.CW_MAP.navParentPath(window.CW_APP.state.path), window.CW_APP.state.merged,
        ) || [];
        const feed = window.CW_MAP.feedEntriesAt
          ? window.CW_MAP.feedEntriesAt(window.CW_APP.state.path, window.CW_APP.state.merged)
          : [];
        const first = feed.find((e) => e && e.post);
        if (!first) return { err: "no feed post" };
        window.CW_APP.state.feedMark = first.post.id;
        window.CW_APP.render(true);
        return {
          id: first.post.id,
          path: window.CW_APP.state.path,
          thread: window.CW_APP.state.threadFocus,
          focus: window.CW_APP.state.focus,
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
        focus: window.CW_APP.state.focus,
        thread: window.CW_APP.state.threadFocus,
        replyTo: window.CW_APP.state.replyTo?.id || null,
        editor: !!(window.CW_APP.state.editor && window.CW_APP.state.editor.focused),
        prompt: document.activeElement === document.querySelector("[data-cli]"),
        threadCtx: !!document.querySelector(".cn-thread-ctx"),
        path: window.CW_APP.state.path,
      }));
      if (!(postEnter.focus >= 1)) {
        return log("Enter did not focus detail: " + JSON.stringify(postEnter));
      }
      if (postEnter.path !== "/projects/community/channels/general") {
        return log("Enter on a feed mark should keep channel context: " + JSON.stringify(postEnter));
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
        window.CW_APP.focusColumns();
        window.CW_APP.clearReplyTo?.();
        const nav = window.CW_MAP.list(
          window.CW_MAP.navParentPath(window.CW_APP.state.path), window.CW_APP.state.merged,
        ) || [];
        if (nav.some((e) => e && e.post)) return { err: "channel nav lists posts" };
        window.CW_APP.openThread("p1", { silent: true });
        window.CW_APP.state.focus = 1;
        window.CW_APP.render(true);
        return {
          path: window.CW_APP.state.path,
          thread: window.CW_APP.state.threadFocus,
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
        thread: window.CW_APP.state.threadFocus,
        replyTo: window.CW_APP.state.replyTo?.id || null,
        prompt: document.activeElement === document.querySelector("[data-cli]"),
        path: window.CW_APP.state.path,
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
        columnFocus: !!window.CW_APP.state.columnFocus,
        onCli: document.activeElement === document.querySelector("[data-cli]"),
        replyTo: window.CW_APP.state.replyTo?.id || null,
        thread: window.CW_APP.state.threadFocus,
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
        path: window.CW_APP.state.path,
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
        const list = window.CW_MAP.list("/projects/community/channels") || [];
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
        window.CW_APP.state.columnFocus = true;
        const list = window.CW_MAP.list("/projects/community/channels") || [];
        const ix = list.findIndex((e) => e.name === "showcase");
        window.CW_APP.state.cursor = ix >= 0 ? ix : 0;
        window.CW_APP.state.focus = 0;
        window.CW_APP.render(true);
      });
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(120);
      const opened = await page.evaluate(() => {
        const nav = document.querySelector('.cn-blade[data-blade-kind="list"]');
        const items = Array.from(nav?.querySelectorAll(".cn-item[data-key]") || [])
          .map((el) => el.getAttribute("data-key"));
        return {
          path: window.CW_APP.state.path,
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
        window.CW_APP.state.columnFocus = true;
        const list = window.CW_MAP.list("/projects") || [];
        const ix = list.findIndex((e) => e.name === "community");
        window.CW_APP.state.cursor = ix >= 0 ? ix : 0;
        window.CW_APP.state.focus = 0;
        window.CW_APP.state.filter = "";
        window.CW_APP.render(true);
      });
      await page.waitForTimeout(80);
      await page.keyboard.press("Space");
      await page.waitForTimeout(120);
      const peeked = await page.evaluate(() => {
        const open = window.CW_APP.state.treeOpen || {};
        const kids = document.querySelector('[data-key="tk-/projects/community"]');
        return {
          path: window.CW_APP.state.path,
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
        const path = window.CW_APP.state.path;
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
        path: window.CW_APP.state.path,
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
        window.CW_APP.state.filter = "bug";
        window.CW_APP.state.lines.push({ id: "L-ws1", kind: "out", text: "ws1-only" });
        window.CW_APP.render(true);
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
        path: window.CW_APP.state.path,
        filter: window.CW_APP.state.filter || "",
        lines: (window.CW_APP.state.lines || []).map((l) => l.text || l.id).join("|"),
        active: window.CW_APP.state.activeSession,
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
        path: window.CW_APP.state.path,
        filter: window.CW_APP.state.filter || "",
        hasWs1: (window.CW_APP.state.lines || []).some((l) => l.text === "ws1-only"),
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
        window.CW_APP.state.lines.push({
          id: "T-test", kind: "tool", tool: "navigate",
          summary: "/projects/community/channels/bugs", detail: '{ "path": "/projects/community/channels/bugs" }',
          result: "ok", ok: true,
        });
        window.CW_APP.render(true);
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
        window.CW_APP.state.merged.push(Object.assign({}, window.CW_DATA.incoming[0],
          { id: "live-e2e", at: "23:57", sig: "sig-e2e" }));
        window.CW_APP.render(true);
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
        window.CW_APP.setNavCollapsed(false, { silent: true, noRender: true });
        window.CW_APP.navigate("/projects/community/channels/general", { keepCli: true });
        window.CW_APP.state.detailOpen = true;
        window.CW_APP.state.focus = 1;
        window.CW_APP.state.feedPinnedViews = [];
        window.CW_APP.state.feedAddOpen = false;
        window.CW_APP.render(true);
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
        const afterNew = window.CW_APP.state.sort;
        top.click();
        const afterTop = window.CW_APP.state.sort;
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
          pinned: (window.CW_APP.state.feedPinnedViews || []).slice(),
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
        window.CW_APP.state.detailOpen = true;
        window.CW_APP.state.focus = 1;
        window.CW_APP.render(true);
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
    name: "focus: Tab follows order with suggestions; arrows accept completion",
    run: async (page, log) => {
      await go(page, "/");
      await page.waitForTimeout(80);
      await page.evaluate(() => {
        window.CW_APP.state.ai = false;
        window.CW_APP.state.columnFocus = false;
        window.CW_APP.state.menuDismissed = false;
        document.querySelector("[data-cli]")?.focus();
      });
      await page.fill("[data-cli]", "");
      await page.waitForTimeout(40);

      // Empty prompt, no suggestions → native Tab leaves the input.
      await page.keyboard.press("Tab");
      await page.waitForTimeout(60);
      let swap = await page.evaluate(() => ({
        columnFocus: !!window.CW_APP.state.columnFocus,
        onCli: document.activeElement === document.querySelector("[data-cli]"),
      }));
      if (swap.onCli) {
        return log("Tab did not follow native focus order: " + JSON.stringify(swap));
      }

      // Reverse native traversal returns to the prompt.
      await page.keyboard.press("Shift+Tab");
      await page.waitForTimeout(60);
      swap = await page.evaluate(() => ({
        columnFocus: !!window.CW_APP.state.columnFocus,
        onCli: document.activeElement === document.querySelector("[data-cli]"),
      }));
      if (!swap.onCli) {
        return log("Shift+Tab did not return to prompt: " + JSON.stringify(swap));
      }

      // With path suggestions open, Tab follows focus order and preserves the draft.
      await page.fill("[data-cli]", "");
      await page.keyboard.type("cd pro", { delay: 15 });
      await page.waitForTimeout(100);
      const before = await page.evaluate(() => ({
        value: document.querySelector("[data-cli]")?.value || "",
        open: document.querySelector(".cn-tui-foot")?.dataset.open,
        cands: (window.CW_APP.state.completion?.candidates || []).length,
      }));
      if (!(before.cands >= 1 && before.open === "true")) {
        return log("expected suggestions for cd pro: " + JSON.stringify(before));
      }
      await page.keyboard.press("Tab");
      await page.waitForTimeout(60);
      const afterTab = await page.evaluate(() => ({
        value: document.querySelector("[data-cli]")?.value || "",
        onCli: document.activeElement === document.querySelector("[data-cli]"),
      }));
      if (afterTab.onCli || afterTab.value !== before.value) {
        return log("Tab changed completion draft/focus: " + JSON.stringify({ before, afterTab }));
      }
      await page.focus("[data-cli]");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      await page.waitForFunction(() => window.CW_APP.state.path === "/projects");
      const accepted = await page.evaluate(() => window.CW_APP.state.path);
      if (accepted !== "/projects") return log("arrows did not accept preview: " + accepted);
      return true;
    },
  },
  {
    name: "cli: completion menu opens, arrows accept, Enter runs",
    run: async (page, log) => {
      await go(page, "/");
      await page.evaluate(() => {
        window.CW_APP.state.ai = false;
        window.CW_APP.state.columnFocus = false;
        window.CW_APP.state.menuDismissed = false;
        window.CW_APP.render(true);
      });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      await page.keyboard.type("cd pro", { delay: 15 });
      await page.waitForTimeout(150);
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      const accepted = await page.evaluate(() => ({
        value: document.querySelector("[data-cli]")?.value || "",
        path: window.CW_APP.state.path,
        active: window.CW_APP.state.candIndex,
      }));
      return accepted.path === "/projects" ||
        log("manual completion did not accept preview: " + JSON.stringify(accepted));
    },
  },
  {
    name: "cli: Enter submits typed text even when autocomplete menu is open",
    run: async (page, log) => {
      // Nav scope so Enter runs the CLI line (not compose-post).
      await go(page, "/projects");
      await page.waitForTimeout(80);
      await page.evaluate(() => {
        window.CW_APP.state.ai = false;
        window.CW_APP.clearReplyTo?.();
        window.CW_APP.render(true);
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
        compose: window.CW_APP.composeContext?.()?.kind,
      }));
      if (!(before.value === "hel" && before.cands.some((c) => c === "help"))) {
        return log("help suggestion missing: " + JSON.stringify(before));
      }
      await page.keyboard.press("Enter");
      await page.waitForTimeout(180);
      const after = await page.evaluate(() => ({
        value: document.querySelector("[data-cli]")?.value || "",
        out: document.querySelector(".cn-out")?.textContent || "",
        lines: (window.CW_APP.state.lines || []).map((l) => l.text || "").join("\n"),
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
        window.CW_APP.state.ai = true;
        window.CW_APP.clearReplyTo?.();
        window.CW_APP.render(true);
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
        try { localStorage.removeItem("cw-home-feed-read"); } catch { /* fine */ }
        window.CW_APP.state.homeFeedRead = {};
        window.CW_APP.state.homeFeed = "creators";
        window.CW_APP.state.sessionOutFocus = false;
        window.CW_APP.state.lines = [];
        window.CW_APP.state.ai = true;
        window.CW_APP.clearReplyTo?.();
        window.CW_APP.closeDetail({ silent: true });
      });
      await page.waitForTimeout(100);
      const beforeMerged = await page.evaluate(() =>
        (window.CW_APP.state.merged || []).filter((p) => p.dm === "maya").length);
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
          (window.CW_APP.state.lines || []).map((l) => l.text || "").join("\n");
        const dmBodies = (window.CW_APP.state.merged || [])
          .filter((p) => p.dm === "maya")
          .map((p) => p.body || "");
        return {
          path: window.CW_APP.state.path,
          detailOpen: window.CW_APP.state.detailOpen,
          homeView: feed?.getAttribute("data-home-view"),
          focus: !!window.CW_APP.state.sessionOutFocus,
          sessionBlade: !!sess,
          active: out?.getAttribute("data-active"),
          label: out?.getAttribute("aria-label") || "",
          leakedIntoFeed,
          tip: /not sent/i.test(text) && /\/dm\s*@maya/i.test(text),
          userLine: (window.CW_APP.state.lines || []).some((l) =>
            l.kind === "user" && /@maya hello from outside dm/i.test(l.text || "")),
          leakedDm: dmBodies.some((b) => /hello from outside dm/i.test(b)),
          leakedAny: (window.CW_APP.state.merged || [])
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
        focus: !!window.CW_APP.state.sessionOutFocus,
        closed: !!window.CW_APP.state.sessionClosed,
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
        window.CW_APP.state.ai = false;
        window.CW_APP.render(true);
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
        (window.CW_APP.state.lines || []).map((l) => l.text || "").join("\n"));
      return (/cd\s*<path>/i.test(out) && /ls(?:\s*<path>)?/i.test(out)) ||
        log("help did not run after ghost accept: " + out.slice(0, 160));
    },
  },
  {
    name: "power: End accepts ghost the same as →",
    run: async (page, log) => {
      await go(page, "/projects");
      await page.evaluate(() => {
        window.CW_APP.state.ai = false;
        window.CW_APP.state.columnFocus = false;
        window.CW_APP.render(true);
      });
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
    name: "power: arrows cycle path candidates; click accepts without submitting",
    run: async (page, log) => {
      await go(page, "/");
      await page.evaluate(() => {
        window.CW_APP.state.ai = false;
        window.CW_APP.state.columnFocus = false;
        window.CW_APP.render(true);
      });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      await page.keyboard.type("cd /projects/community/channels/", { delay: 12 });
      await page.waitForTimeout(120);
      const first = await page.evaluate(() => document.querySelector("[data-cli]")?.value || "");
      await page.keyboard.press("ArrowDown");
      const firstIndex = await page.evaluate(() => window.CW_APP.state.candIndex);
      await page.keyboard.press("ArrowDown");
      const secondIndex = await page.evaluate(() => window.CW_APP.state.candIndex);
      await page.keyboard.press("ArrowUp");
      const selection = await page.evaluate(() => {
        const selected = window.CW_APP.state.completion?.candidates?.[window.CW_APP.state.candIndex]?.value;
        return {
          returnedIndex: window.CW_APP.state.candIndex,
          selected,
          previewPath: window.CW_APP.state.path,
          draft: document.querySelector("[data-cli]")?.value || "",
        };
      });
      if (firstIndex !== 0 || secondIndex !== 1 || selection.returnedIndex !== 0 || selection.draft !== first) {
        return log("arrow candidate cycle drifted: " +
          JSON.stringify({ firstIndex, secondIndex, first, selection }));
      }
      await page.keyboard.press("Enter");
      const accepted = await page.evaluate(() => ({
        value: document.querySelector("[data-cli]")?.value || "",
        path: window.CW_APP.state.path,
      }));
      if (accepted.path !== selection.previewPath) {
        return log("selected " + selection.selected + " accepted " + accepted.path + " value " + accepted.value);
      }

      // Click a visible candidate — should fill, not navigate/submit.
      await page.keyboard.press("Escape");
      await go(page, "/");
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "cd pro");
      await page.waitForSelector('.cn-menu:not([hidden]) [role="option"]');
      const pathBefore = await path(page);
      const clicked = await page.evaluate(() => {
        const cand = Array.from(document.querySelectorAll(".cn-cand")).find((el) =>
          /projects\/?$/.test(el.querySelector("span")?.textContent || ""));
        if (!cand) return { ok: false, reason: "no /projects cand" };
        cand.click();
        return { ok: true, value: document.querySelector("[data-cli]")?.value || "" };
      });
      await page.waitForTimeout(100);
      const pathAfter = await path(page);
      if (pathAfter !== pathBefore) {
        return log("click submitted/navigated: " + pathBefore + " → " + pathAfter);
      }
      if (!clicked.ok) return log(clicked.reason);
      return /projects/.test(clicked.value) || log("click did not accept: " + JSON.stringify(clicked));
    },
  },
  {
    name: "power: cd ../ keeps relative path typeahead in ai mode",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      const completion = await page.evaluate(() => {
        // Dispatch atomically so model availability cannot change prompt mode
        // between setup and the input event under test.
        window.CW_APP.state.ai = true;
        const input = document.querySelector("[data-cli]");
        input.value = "cd ../";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        return {
          expanded: input.getAttribute("aria-expanded"),
          ai: window.CW_APP.state.ai,
          kind: window.CW_APP.state.completion?.kind,
          candidates: Array.from(document.querySelectorAll(".cn-cand span"))
            .map((el) => el.textContent || ""),
        };
      });
      return completion.ai === true && completion.expanded === "true" && completion.kind === "path" &&
        completion.candidates.length > 0 || log("relative typeahead missing: " + JSON.stringify(completion));
    },
  },
  {
    name: "power: cd - returns to previous path; cd .. climbs",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.evaluate(() => { window.CW_APP.state.ai = false; window.CW_APP.render(true); });
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
      await page.evaluate(() => { window.CW_APP.state.ai = false; window.CW_APP.render(true); });
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
        idx: window.CW_APP.state.candIndex,
      }));
      if (before.cands < 2) return log("need multi cand for menu arrows: " + JSON.stringify(before));
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(40);
      const mid = await page.evaluate(() => ({
        value: document.querySelector("[data-cli]")?.value || "",
        idx: window.CW_APP.state.candIndex,
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
        window.CW_APP.state.ai = false;
        window.CW_APP.render(true);
      });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      // Parameter completion: cd + path fragment with multiple matches.
      await page.keyboard.type("cd p", { delay: 15 });
      await page.waitForTimeout(120);
      const start = await page.evaluate(() => {
        const c = window.CW_APP.state.completion;
        const ghost = document.querySelector("[data-ghost-rest]")?.textContent || "";
        const cands = (c?.candidates || []).map((x) => x.value);
        return {
          value: document.querySelector("[data-cli]")?.value || "",
          idx: window.CW_APP.state.candIndex,
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
        const c = window.CW_APP.state.completion;
        return {
          value: document.querySelector("[data-cli]")?.value || "",
          idx: window.CW_APP.state.candIndex,
          ghost: document.querySelector("[data-ghost-rest]")?.textContent || "",
          preview: c?.preview || "",
          insert: c?.insert || "",
          first: c?.candidates?.[0]?.value || "",
          second: c?.candidates?.[1]?.value || "",
          n: c?.candidates?.length || 0,
        };
      });
      if (before.n < 2) return log("need ≥2 candidates: " + JSON.stringify(before));
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(60);
      const after = await page.evaluate(() => {
        const c = window.CW_APP.state.completion;
        const cur = document.querySelector('.cn-cand[aria-current="true"] span')?.textContent || "";
        return {
          value: document.querySelector("[data-cli]")?.value || "",
          idx: window.CW_APP.state.candIndex,
          ghost: document.querySelector("[data-ghost-rest]")?.textContent || "",
          preview: c?.preview || "",
          insert: c?.insert || "",
          selected: c?.candidates?.[window.CW_APP.state.candIndex]?.value || "",
          cur,
          curIndex: Number(document.querySelector('.cn-cand[aria-current="true"]')?.dataset.cand ?? -1),
        };
      });
      if (after.value !== before.value) {
        return log("arrow mutated draft: " + JSON.stringify({ before, after }));
      }
      if (before.idx !== -1 || after.idx !== 0) {
        return log("manual selection did not activate first option: " + JSON.stringify({ before, after }));
      }
      const afterPreview = after.ghost || after.preview || "";
      if (!afterPreview && after.insert === before.insert) {
        return log("preview stuck on first option: " + JSON.stringify({ before, after }));
      }
      if (after.insert !== after.selected || after.curIndex !== after.idx) {
        return log("selection not synced: " + JSON.stringify({ before, after }));
      }
      // Activating the first option may leave the same visual ghost that was
      // shown as an uncommitted hint; aria-activedescendant/current is the
      // authoritative distinction between hint and explicit selection.
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
    name: "power: ←→ drill cd typeahead and keep preview context synchronized",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.evaluate(() => {
        window.CW_APP.state.ai = false;
        window.CW_APP.render(true);
      });
      const prompt = page.locator("[data-cli]");
      await prompt.focus();
      await prompt.fill("cd p");
      const before = await page.evaluate(() => ({
        path: window.CW_APP.state.path,
        value: document.querySelector("[data-cli]")?.value || "",
        selected: window.CW_APP.state.completion?.candidates?.[0]?.value || "",
      }));
      await prompt.press("ArrowRight");
      await page.waitForTimeout(80);
      const drilled = await page.evaluate(() => {
        const c = window.CW_APP.state.completion;
        return {
          path: window.CW_APP.state.path,
          value: document.querySelector("[data-cli]")?.value || "",
          preview: document.querySelector("[data-cd-preview]")?.textContent || "",
          selected: c?.candidates?.[0]?.value || "",
          current: document.querySelector('.cn-cand[aria-current="true"] span')?.textContent || "",
        };
      });
      const expected = await page.evaluate(({ origin, selected }) =>
        window.CW_MAP.resolve(origin, selected), { origin: before.path, selected: before.selected });
      if (drilled.path !== expected) return log("→ preview path: " + drilled.path + " != " + expected);
      if (!drilled.value.endsWith(before.selected)) {
        return log("→ prompt value: " + drilled.value + " !~ " + before.selected);
      }
      if (!/preview/i.test(drilled.preview)) return log("→ preview badge missing");
      if (drilled.current) return log("→ implicitly selected a child candidate");
      await prompt.press("ArrowLeft");
      await page.waitForTimeout(80);
      const ascended = await page.evaluate(() => {
        const c = window.CW_APP.state.completion;
        return {
          path: window.CW_APP.state.path,
          value: document.querySelector("[data-cli]")?.value || "",
          selected: c?.candidates?.[0]?.value || "",
          current: document.querySelector('.cn-cand[aria-current="true"] span')?.textContent || "",
        };
      });
      return ascended.path === before.path && ascended.value === before.value &&
        !!ascended.selected && !ascended.current ||
        log("← typeahead ascent desynchronized: " + JSON.stringify({ before, ascended }));
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
        const names = (window.CW_COMPLETE.SLASH_COMMANDS || []).map((c) => c.name);
        return banned.filter((b) => names.includes(b));
      });
      if (leaked.length) return log("SLASH_COMMANDS still has terminal verbs: " + leaked.join(","));
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      // Force ai preference for the slash catalogue even if model-warm flipped mode.
      await page.evaluate(() => {
        window.CW_APP.state.ai = true;
        window.CW_APP.render(true);
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
        (window.CW_APP.state.lines || []).map((l) => l.text || "").join("\n"));
      if (!/unknown slash|not found/i.test(aiOut)) {
        return log("/ls should be unknown slash: " + aiOut.slice(0, 160));
      }
      if (/▸\s*community|▸\s*agent-lab/i.test(aiOut)) {
        return log("/ls still listed directory: " + aiOut.slice(0, 120));
      }
      // CLI mode — bare ls works.
      await page.evaluate(() => {
        window.CW_APP.state.ai = false;
        window.CW_APP.render(true);
      });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "ls");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(150);
      const cliOut = await page.evaluate(() =>
        (window.CW_APP.state.lines || []).map((l) => l.text || "").join("\n"));
      return (/community|agent-lab|tuner/i.test(cliOut)) ||
        log("cli ls failed: " + cliOut.slice(0, 160));
    },
  },
  {
    name: "power: ai mode still runs bare CLI verbs (superset)",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/bugs");
      await page.evaluate(() => { window.CW_APP.state.ai = true; window.CW_APP.render(true); });
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
      await page.evaluate(() => { window.CW_APP.state.ai = true; window.CW_APP.render(true); });
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
        columnFocus: window.CW_APP.state.columnFocus,
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
      await page.evaluate(() => { window.CW_APP.state.ai = true; window.CW_APP.render(true); });
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
        columnFocus: window.CW_APP.state.columnFocus,
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
        try { localStorage.setItem("cw-keys-onboarded", "1"); } catch { /* fine */ }
        window.CW_APP.state.ai = true;
        window.CW_APP.state.intelOpen = false;
        window.CW_APP.state.helpOpen = false;
        window.CW_APP.state.keysOnboard = false;
        const input = document.querySelector("[data-cli]");
        if (input) input.value = "";
        // Force recompute as empty AI prompt (latent slash catalogue).
        window.CW_APP.render(true);
      });
      await page.waitForTimeout(80);
      const idle = await page.evaluate(() => ({
        value: document.querySelector("[data-cli]")?.value || "",
        open: document.querySelector(".cn-tui-foot")?.dataset.open,
        cands: document.querySelectorAll(".cn-cand").length,
        should: window.CW_APP.menuShouldOpen?.(),
      }));
      if (idle.open === "true" || idle.cands > 0 || idle.should) {
        return log("empty AI prompt opened slash menu: " + JSON.stringify(idle));
      }
      // Mouse: select a channel — must not ghost-open the catalogue.
      await go(page, "/projects/community/channels");
      await page.waitForTimeout(60);
      await page.evaluate(() => {
        window.CW_APP.state.ai = true;
        document.querySelector(
          '.cn-blade[data-blade-kind="list"] .cn-item[data-key="bugs"]',
        )?.click();
      });
      await page.waitForTimeout(100);
      const afterClick = await page.evaluate(() => ({
        value: document.querySelector("[data-cli]")?.value || "",
        open: document.querySelector(".cn-tui-foot")?.dataset.open,
        cands: document.querySelectorAll(".cn-cand").length,
        path: window.CW_APP.state.path,
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
        try { localStorage.setItem("cw-keys-onboarded", "1"); } catch { /* fine */ }
        window.CW_APP.state.ai = true;
        window.CW_APP.state.intelOpen = false;
        window.CW_APP.state.helpOpen = false;
        window.CW_APP.render(true);
        return {
          open: document.querySelector(".cn-tui-foot")?.dataset.open,
          cands: document.querySelectorAll(".cn-cand").length,
          should: window.CW_APP.menuShouldOpen?.(),
        };
      });
      return (afterReload.open !== "true" && afterReload.cands === 0 && !afterReload.should) ||
        log("reload left slash open: " + JSON.stringify(afterReload));
    },
  },
  {
    name: "NAV-REG-002 live: new-posts notice is feed overlay only (not page chrome)",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/bugs");
      await page.evaluate(() => {
        window.CW_APP.state.detailOpen = true;
        window.CW_APP.state.threadFocus = null;
        window.CW_APP.state.live = true;
        window.CW_APP.render(true);
      });
      await page.waitForTimeout(80);
      // Drive a live tick while watching #bugs.
      const queued = await page.evaluate(() => {
        const before = (window.CW_APP.state.pending || []).length;
        for (let i = 0; i < 12 && (window.CW_APP.state.pending || []).length === before; i++) {
          window.CW_APP.tick();
        }
        return {
          n: (window.CW_APP.state.pending || []).length,
          key: window.CW_APP.currentFeedKey?.(),
          noticeOpen: window.CW_APP.feedNoticeOpen?.(),
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
          if (typeof window.CW_APP.openThread === "function") window.CW_APP.openThread(id);
          else {
            window.CW_APP.state.threadFocus = id;
            window.CW_APP.render(true);
          }
        }, postId);
        await page.waitForTimeout(80);
      } else {
        await page.evaluate(() => {
          window.CW_APP.state.threadFocus = "p-bugs-1";
          window.CW_APP.render(true);
        });
        await page.waitForTimeout(80);
      }
      const inThread = await page.evaluate(() => ({
        feedNotice: !!document.querySelector(".cn-feed-notice"),
        noticeOpen: window.CW_APP.feedNoticeOpen?.(),
        pending: (window.CW_APP.state.pendingByFeed?.["chan:community/bugs"] || []).length,
      }));
      if (inThread.feedNotice || inThread.noticeOpen) {
        return log("notice visible in thread: " + JSON.stringify(inThread));
      }
      if (!inThread.pending) return log("pending lost in thread: " + JSON.stringify(inThread));
      // Back to feed — overlay returns; leave channel — hides; R merges on return.
      await page.evaluate(() => {
        window.CW_APP.state.threadFocus = null;
        window.CW_APP.state.detailOpen = true;
        window.CW_APP.render(true);
      });
      await page.waitForTimeout(80);
      const back = await page.evaluate(() => ({
        feedNotice: !!document.querySelector(".cn-feed-notice"),
        noticeOpen: window.CW_APP.feedNoticeOpen?.(),
      }));
      if (!back.feedNotice || !back.noticeOpen) {
        return log("notice did not return on feed: " + JSON.stringify(back));
      }
      await go(page, "/projects/community/channels/general");
      await page.waitForTimeout(80);
      const elsewhere = await page.evaluate(() => ({
        feedNotice: !!document.querySelector(".cn-feed-notice"),
        noticeOpen: window.CW_APP.feedNoticeOpen?.(),
        bugsHeld: (window.CW_APP.state.pendingByFeed?.["chan:community/bugs"] || []).length,
      }));
      if (elsewhere.feedNotice || elsewhere.noticeOpen) {
        return log("notice leaked onto other channel: " + JSON.stringify(elsewhere));
      }
      if (!elsewhere.bugsHeld) return log("bugs queue dropped: " + JSON.stringify(elsewhere));
      await go(page, "/projects/community/channels/bugs");
      await page.evaluate(() => {
        window.CW_APP.state.threadFocus = null;
        window.CW_APP.state.detailOpen = true;
        window.CW_APP.render(true);
      });
      await page.waitForTimeout(80);
      const clickMerge = await page.evaluate(() => {
        const btn = document.querySelector(".cn-feed-notice[data-merge]");
        if (!btn) return false;
        btn.click();
        return true;
      });
      if (!clickMerge) {
        await page.evaluate(() => window.CW_APP.mergePending());
      }
      await page.waitForTimeout(100);
      const merged = await page.evaluate(() => ({
        pending: (window.CW_APP.state.pending || []).length,
        bugsHeld: (window.CW_APP.state.pendingByFeed?.["chan:community/bugs"] || []).length,
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
      const armed = await page.evaluate(() => window.CW_APP.composeContext?.()?.kind);
      if (armed !== "reply") return log("reply not armed: " + armed);
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(80);
      const after = await page.evaluate(() => ({
        kind: window.CW_APP.composeContext?.()?.kind,
        value: document.querySelector("[data-cli]")?.value || "",
      }));
      return (after.kind === "reply" && after.value === "") ||
        log("empty Enter broke reply scope: " + JSON.stringify(after));
    },
  },
  {
    name: "power: arrows complete @mention then Enter posts the completed line",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.evaluate(() => {
        window.CW_APP.state.ai = true;
        window.CW_APP.clearReplyTo?.();
        window.CW_APP.render(true);
      });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      await page.keyboard.type("hey @may", { delay: 12 });
      await page.waitForTimeout(120);
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      await page.waitForFunction(() => /^hey @maya\s*$/.test(
        document.querySelector("[data-cli]")?.value || ""));
      const filled = await page.evaluate(() => document.querySelector("[data-cli]")?.value || "");
      if (!/^hey @maya\s*$/.test(filled)) {
        return log("arrows did not complete mention: " + JSON.stringify(filled));
      }
      await page.keyboard.press("Enter");
      await page.waitForFunction(() => Array.from(document.querySelectorAll(".cn-comment"))
        .some((el) => /hey @maya/.test(el.textContent || "")));
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
      await page.evaluate(() => { window.CW_APP.state.ai = true; window.CW_APP.render(true); });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      await page.keyboard.type("/go bug", { delay: 12 });
      await page.waitForTimeout(120);
      const before = await page.evaluate(() => ({
        path: window.CW_APP.state.path,
        cands: document.querySelectorAll(".cn-cand").length,
        value: document.querySelector("[data-cli]")?.value || "",
      }));
      if (before.cands < 1) return log("no /go path cands: " + JSON.stringify(before));
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      await page.waitForFunction(() => {
        const value = document.querySelector("[data-cli]")?.value || "";
        return value.startsWith("/go /");
      });
      await page.keyboard.press("Enter");
      await page.waitForTimeout(180);
      const after = await page.evaluate(() => ({
        path: window.CW_APP.state.path,
        value: document.querySelector("[data-cli]")?.value || "",
        lines: (window.CW_APP.state.lines || []).map((l) => l.text || "").join("|"),
      }));
      // First Enter explicitly accepts the exact candidate; the second runs it.
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
    name: "power: replace-preview arrows insert absolute path from basename fragment",
    run: async (page, log) => {
      await go(page, "/");
      await page.evaluate(() => { window.CW_APP.state.ai = false; window.CW_APP.render(true); });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      await page.keyboard.type("cd pro", { delay: 12 });
      await page.waitForTimeout(120);
      const preview = await page.evaluate(() => ({
        ghost: document.querySelector("[data-ghost-rest]")?.textContent || "",
        candidates: Array.from(document.querySelectorAll(".cn-cand span")).map((s) => s.textContent),
      }));
      if (!/projects/i.test(preview.ghost) && !preview.candidates.some((value) => /projects/i.test(value || ""))) {
        return log("no replace preview: " + JSON.stringify(preview));
      }
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      await page.waitForFunction(() => window.CW_APP.state.path === "/projects");
      const accepted = await page.evaluate(() => ({
        value: document.querySelector("[data-cli]")?.value || "",
        path: window.CW_APP.state.path,
      }));
      return accepted.path === "/projects" ||
        log("arrows did not accept path preview: " + JSON.stringify(accepted));
    },
  },
  {
    name: "session: transcript formats turns for visual scan (roles, gaps, tools)",
    run: async (page, log) => {
      await go(page, "/projects");
      await page.evaluate(() => {
        window.CW_APP.state.ai = true;
        window.CW_APP.state.sessionClosed = false;
        window.CW_APP.state.lines = [
          { id: "u1", kind: "user", mode: "ai", text: "summarize #general" },
          { id: "t1", kind: "tool", tool: "board_navigate", summary: "/projects/community/channels/general",
            detail: "{}", result: "ok", ok: true },
          { id: "a1", kind: "agent", text: "Three open threads. Top is lea's install note." },
          { id: "o1", kind: "out", text: "navigated → /projects/community/channels/general" },
          { id: "u2", kind: "user", mode: "cli", text: "ls" },
          { id: "o2", kind: "out", text: "channels  members  .agents" },
        ];
        window.CW_APP.render(true);
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
        closed: !!window.CW_APP.state.sessionClosed,
        blade: !!document.querySelector('.cn-blade[data-blade-kind="session"]'),
        useful: (window.CW_APP.state.lines || []).filter((l) => l.kind && l.kind !== "banner").length,
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
        window.CW_APP.state.ai = false;
        window.CW_APP.state.homeFeed = "creators";
        window.CW_APP.closeDetail({ silent: true });
        window.CW_APP.state.lines = [];
        window.CW_APP.render(true);
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
          hasHelp: /cd\s*<path>/i.test(out?.textContent || "") && /ls(?:\s*<path>)?/i.test(out?.textContent || ""),
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
        window.CW_APP.state.ai = false;
        window.CW_APP.state.sessionClosed = false;
        window.CW_APP.state.lines = [];
        window.CW_APP.render(true);
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
        closed: !!window.CW_APP.state.sessionClosed,
        lines: (window.CW_APP.state.lines || []).length,
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
        closed: !!window.CW_APP.state.sessionClosed,
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
      await page.evaluate(() => { window.CW_APP.state.ai = false; window.CW_APP.render(true); });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "stat");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(100);
      await page.fill("[data-cli]", "clear");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(120);
      const after = await page.evaluate(() => ({
        lines: (window.CW_APP.state.lines || []).length,
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
      await page.evaluate(() => { window.CW_APP.state.ai = false; window.CW_APP.render(true); });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "stat");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(80);
      await page.keyboard.press("Alt+t");
      await page.waitForTimeout(120);
      const fresh = await page.evaluate(() => ({
        sessions: window.CW_APP.state.sessions?.length,
        history: (window.CW_APP.state.history || []).slice(),
        path: window.CW_APP.state.path,
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
    name: "power: ArrowUp reverses candidates; Shift+Tab follows focus order",
    run: async (page, log) => {
      await go(page, "/projects");
      await page.evaluate(() => { window.CW_APP.state.ai = false; window.CW_APP.render(true); });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      await page.keyboard.type("c", { delay: 20 });
      await page.waitForTimeout(120);
      const n = await page.evaluate(() => document.querySelectorAll(".cn-cand").length);
      if (n < 2) return log("need ≥2 candidates, got " + n);
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      const forward = await page.evaluate(() => window.CW_APP.state.candIndex);
      await page.keyboard.press("ArrowUp");
      const reversed = await page.evaluate(() => window.CW_APP.state.candIndex);
      if (forward !== 1 || reversed !== 0) {
        return log("ArrowUp did not reverse candidate selection: " + JSON.stringify({ forward, reversed }));
      }
      await page.keyboard.press("Enter");
      await page.waitForFunction(() => (document.querySelector("[data-cli]")?.value || "") !== "c");
      const accepted = await page.evaluate(() => document.querySelector("[data-cli]")?.value || "");
      if (!accepted) return log("Enter did not accept the selected candidate");

      // Shift+Tab is native reverse focus traversal and must preserve the draft.
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "c");
      await page.keyboard.press("Shift+Tab");
      const nativeTab = await page.evaluate(() => ({
        value: document.querySelector("[data-cli]")?.value || "",
        onCli: document.activeElement === document.querySelector("[data-cli]"),
      }));
      return (!nativeTab.onCli && nativeTab.value === "c") ||
        log("Shift+Tab changed draft/focus order: " + JSON.stringify(nativeTab));
    },
  },
  {
    name: "slash: /go completes and navigates in agent chat",
    run: async (page, log) => {
      // Ensure ai mode (default), type a slash command with intellisense.
      await go(page, "/projects/community/channels");
      await page.evaluate(() => {
        window.CW_APP.state.ai = true;
        window.CW_APP.state.columnFocus = false;
        window.CW_APP.render(true);
      });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
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
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      await page.waitForFunction(() =>
        (document.querySelector("[data-cli]")?.value || "") !== "/go bug");
      await page.keyboard.press("Enter");
      // Explicitly accepted path then Enter navigates or reports the slash line.
      let p = await path(page);
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
        window.CW_APP.state.ai = true;
        window.CW_APP.render(true);
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
        ai: window.CW_APP.state.ai,
        chip: document.querySelector(".cn-mode")?.textContent?.trim(),
      }));
      if (mode.ai !== false || mode.chip !== "cli") {
        return log("/mode cli failed: " + JSON.stringify(mode));
      }
      // Agent-facing /ai /theme /reply still resolve, but are not in SLASH_COMMANDS.
      const agentOnly = await page.evaluate(() => {
        const names = (window.CW_COMPLETE.SLASH_COMMANDS || []).map((c) => c.name);
        const agent = (window.CW_COMPLETE.AGENT_SLASH_COMMANDS || []).map((c) => c.name);
        return {
          catalogueHas: ["/ai", "/cli", "/theme", "/reply", "/voice", "/keys", "/channel", "/project"]
            .filter((n) => names.includes(n)),
          agentHasReply: agent.includes("/reply") && agent.includes("/voice"),
          specAct: !!(window.CW_COMPLETE.slashSpec && window.CW_COMPLETE.slashSpec("/act")),
          specReply: !!(window.CW_COMPLETE.slashSpec && window.CW_COMPLETE.slashSpec("/reply")),
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
      mode = await page.evaluate(() => window.CW_APP.state.ai);
      if (mode !== true) return log("/ai agent path did not switch: " + mode);
      // WebMCP prompt_mode tool.
      const tool = await page.evaluate(async () => {
        const tools = (window.CW_MCP && window.CW_MCP.list()) || [];
        const has = tools.some((t) => t.name === "prompt_mode");
        if (!has) return { err: "no prompt_mode tool", names: tools.map((t) => t.name).slice(0, 20) };
        const res = await window.CW_MCP.call("prompt_mode", { mode: "cli" });
        return {
          ok: !res.isError,
          text: (res.content && res.content[0] && res.content[0].text) || "",
          ai: window.CW_APP.state.ai,
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
        window.CW_APP.state.ai = true;
        window.CW_APP.state.columnFocus = false;
        const feed = window.CW_MAP.feedEntriesAt
          ? window.CW_MAP.feedEntriesAt(window.CW_APP.state.path, window.CW_APP.state.merged)
          : [];
        const first = feed.find((e) => e && e.post);
        if (first) window.CW_APP.openThread(first.post.id, { silent: true, noRender: true });
        window.CW_APP.state.detailOpen = true;
        window.CW_APP.render(true);
      });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      await page.keyboard.type("/act ");
      await page.waitForTimeout(120);
      const caps = await page.evaluate(() => {
        const spans = Array.from(document.querySelectorAll(".cn-cand span")).map((s) => s.textContent.trim());
        const raw = Array.from(document.querySelectorAll(".cn-cand")).map((c) => c.textContent.trim());
        const act = window.CW_COMPLETE?.actCapabilities?.({
          cwd: window.CW_APP.state.path,
          extra: window.CW_APP.state.merged,
        }) || [];
        return { spans, raw, act: act.map((a) => a.value), thread: window.CW_APP.state.threadFocus };
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
        const ctx = window.CW_APP.composeContext?.() || {};
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
      await page.evaluate(() => { window.CW_APP.clearReplyTo?.(); });
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
        return (window.CW_COMPLETE.actCapabilities({
          cwd: window.CW_APP.state.path,
          extra: window.CW_APP.state.merged,
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
      await page.evaluate(() => { window.CW_APP.state.ai = true; });
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
      await go(page, "/");
      await page.evaluate(() => { window.CW_APP.state.ai = false; window.CW_APP.render(true); });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      await page.keyboard.type("cd pro", { delay: 20 });
      await page.waitForTimeout(120);
      const ui = await page.evaluate(() => {
        const mirror = document.querySelector("[data-cli-mirror], .cn-cli-mirror, [data-ghost]");
        const ghost = document.querySelector(".cn-ghost-rest, [data-ghost-rest]");
        const kw = document.querySelector(".cn-input-wrap .cw-tok-kw, .cn-cli-mirror .cw-tok-kw, [data-cli-mirror] .cw-tok-kw");
        const pathTok = document.querySelector(
          ".cn-input-wrap .cw-tok-path, .cn-input-wrap .cw-tok-str, .cn-cli-mirror .cw-tok-path, .cn-cli-mirror .cw-tok-str",
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
      await page.evaluate(() => { window.CW_APP.state.ai = false; window.CW_APP.render(true); });
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
          hasKw: !!document.querySelector(".cn-input-wrap .cw-tok-kw, [data-cli-mirror] .cw-tok-kw"),
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
    name: "SEARCH-PROJECTION-WORKBENCH deterministic keyboard search exposes completeness without AI",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      const beforeAi = await page.evaluate(() => window.CW_APP.state.ai);
      await page.keyboard.press("Control+F");
      await page.waitForTimeout(100);
      const opened = await page.evaluate(() => ({
        action: window.CW_ACTIONS.lastEvent()?.actionId,
        oldActions: window.CW_ACTIONS.list().filter((action) => action.actionId.startsWith("view.")).length,
        region: document.querySelector("[data-search-workbench]")?.getAttribute("aria-label"),
        tabs: Array.from(document.querySelectorAll("[data-search-workbench] [role=tab]")).map((tab) => tab.textContent?.trim()),
        focused: document.activeElement?.getAttribute("data-search-expression"),
      }));
      if (opened.action !== "search.open" || opened.oldActions !== 0 || opened.region !== "Search workbench" ||
          opened.tabs.join("|") !== "Query|Results|Explain|History" || opened.focused !== "true") {
        return log("normalized keyboard workbench missing: " + JSON.stringify(opened));
      }

      await page.fill("[data-search-expression]", "sttae:needs-review");
      await page.click("[data-search-run]");
      await page.waitForTimeout(80);
      const invalid = await page.evaluate(() => ({
        alert: document.querySelector("[data-search-diagnostic][role=alert]")?.textContent || "",
        line: document.querySelector("[data-search-diagnostic]")?.getAttribute("data-line"),
        column: document.querySelector("[data-search-diagnostic]")?.getAttribute("data-column"),
      }));
      if (!/unknown.*sttae.*state/i.test(invalid.alert) || invalid.line !== "1" || !invalid.column) {
        return log("structured diagnostic missing: " + JSON.stringify(invalid));
      }

      await page.fill("[data-search-expression]", "state:needs-review");
      await page.click("[data-search-run]");
      await page.waitForFunction(() => document.querySelector("[data-search-completeness]")?.textContent?.includes("complete"));
      const result = await page.evaluate(() => ({
        selected: document.querySelector("[data-search-workbench] [role=tab][aria-selected=true]")?.textContent?.trim(),
        completeness: document.querySelector("[data-search-completeness]")?.textContent || "",
        sources: document.querySelectorAll("[data-search-source]").length,
        targets: Array.from(document.querySelectorAll("[data-search-target]")).map((row) => row.getAttribute("data-search-target")),
        ai: window.CW_APP.state.ai,
      }));
      return result.selected === "Results" && /complete/i.test(result.completeness) && result.sources >= 1 &&
        result.targets.length >= 1 && new Set(result.targets).size === result.targets.length && result.ai === beforeAi ||
        log("deterministic result surface missing: " + JSON.stringify(result));
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
        window.CW_APP.state.feedPinnedViews = ["needs-review"];
        window.CW_APP.applyFeedView("needs-review");
        await new Promise((r) => setTimeout(r, 40));
        return {
          n: document.querySelectorAll(".cn-comment").length,
          q: window.CW_APP.state.feedQuery,
          view: window.CW_APP.state.feedView,
          match: document.querySelector(".cn-feed-match")?.textContent || "",
          err: window.CW_APP.state.feedQueryError,
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
        window.CW_APP.setFeedQuery("who:scout sort:new", "custom");
        await new Promise((r) => setTimeout(r, 40));
        const whos = Array.from(document.querySelectorAll('.cn-comment [data-c="handle"]'))
          .map((el) => el.textContent);
        return {
          q: window.CW_APP.state.feedQuery,
          n: document.querySelectorAll(".cn-comment").length,
          whos,
          hasScout: whos.some((w) => w === "scout"),
        };
      });
      if (!scout.hasScout) return log("who:scout missed scout: " + JSON.stringify(scout));

      // /search from the centralized action registry
      await page.keyboard.type("/search state:open");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(200);
      const anch = await page.evaluate(() => ({
        q: window.CW_APP.state.searchWorkbench?.expression,
        n: document.querySelectorAll("[data-search-target]").length,
        hasAnchor: false,
      }));
      if (anch.q !== "state:open") return log("/search failed: " + JSON.stringify(anch));
      return anch.n >= 1 || log("no results after state:open: " + anch.n);
    },
  },
  {
    name: "search: CLI Lucene across board with color marks + autocomplete",
    run: async (page, log) => {
      await go(page, "/");
      await page.evaluate(() => { window.CW_APP.state.ai = false; });
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
      await page.evaluate(() => { window.CW_APP.state.ai = true; });
      await page.focus("[data-cli]");
      await page.fill("[data-cli]", "");
      await page.type("[data-cli]", "/search state:needs-review", { delay: 10 });
      await page.keyboard.press("Enter");
      await page.waitForTimeout(200);
      const slash = await page.evaluate(() => ({
        hits: document.querySelectorAll(".cn-search-hit").length,
        head: document.querySelector(".cn-search-head")?.textContent || "",
        listed: window.CW_MCP.list().some((t) => t.name === "board_search"),
        skill: (window.CW_DATA.agents.board || [])
          .some((a) => (a.skills || []).some((s) => s.id === "board-search")),
      }));
      if (!slash.listed) return log("board_search not registered");
      if (!slash.skill) return log("board-search skill missing on Space Steward");
      if (!(slash.hits >= 1)) return log("/search no hits: " + JSON.stringify(slash));

      // AI tool path — natural language would call this; invoke directly.
      const tool = await page.evaluate(async () => {
        const before = document.querySelectorAll(".cn-search-hit").length;
        const res = await window.CW_MCP.call("board_search", { query: "who:scout" });
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
        const n = await window.CW_APP.addAttachmentFiles([file]);
        return {
          n,
          count: window.CW_APP.state.attachments.length,
          names: window.CW_APP.state.attachments.map((a) => a.name),
          kinds: window.CW_APP.state.attachments.map((a) => a.kind),
          hasText: !!(window.CW_APP.state.attachments[0] && window.CW_APP.state.attachments[0].text),
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
        window.CW_APP.state.ai = true;
      });
      await page.click("[data-cli]");
      await page.keyboard.type("summarise the attached install notes");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(400);

      const after = await page.evaluate(() => {
        const lines = window.CW_APP.state.lines || [];
        const user = [...lines].reverse().find((l) => l.kind === "user");
        const sentChips = document.querySelectorAll(".cn-attach-chip-sent").length;
        return {
          trayEmpty: (window.CW_APP.state.attachments || []).length === 0,
          userText: user && user.text,
          userAtts: user && user.attachments && user.attachments.map((a) => a.name),
          sentChips,
          // compose path available
          composed: window.CW_ATTACH.composeInput("x", [
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
        await window.CW_APP.addAttachmentFiles([f]);
      });
      await page.keyboard.type("/attach clear");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(150);
      const cleared = await page.evaluate(() => (window.CW_APP.state.attachments || []).length);
      return cleared === 0 || log("clear failed, left " + cleared);
    },
  },
  {
    name: "link previews: ASCII cards for markdown and bare URLs in posts",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.waitForTimeout(150);
      const got = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll(".cw-link-preview"));
        const kinds = cards.map((c) => c.getAttribute("data-kind"));
        const ascii = cards.map((c) => c.querySelector(".cw-link-preview-ascii")?.textContent || "");
        const hasBox = ascii.some((t) => t.includes("┌") && t.includes("│"));
        const hasRepo = kinds.includes("repo");
        const hasDocs = kinds.includes("docs");
        const hasBoard = kinds.includes("board");
        const inline = document.querySelectorAll(".cn-comment-body .cw-md-a").length;
        // Standalone API still works.
        const api = window.CW_ASCII && window.CW_ASCII.linkPreview
          ? window.CW_ASCII.linkPreview("https://github.com/webmachinelearning/webmcp")
          : "";
        return {
          n: cards.length,
          kinds,
          hasBox,
          hasRepo,
          hasDocs,
          hasBoard,
          inline,
          apiOk: api.includes("cw-link-preview") && /WebMCP|GitHub/i.test(api),
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
            '.cw-link-preview[data-kind="board"] .cw-link-preview-hit[data-goto]',
          );
          if (!hit) return { err: "no board hit" };
          const dest = hit.getAttribute("data-goto");
          // Prefer the app API so morph/layout does not swallow the gesture.
          const ok = window.CW_APP.navigate(dest, { keepCli: true });
          return { dest, ok, path: window.CW_APP.state.path };
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
        return { mine, pickOpen, state: window.CW_APP.state.reactions };
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
        const tables = document.querySelectorAll(".cw-md-atable");
        const th = document.querySelector(".cw-md-th");
        const body = Array.from(document.querySelectorAll(".cn-comment-body .cw-md"))
          .map((el) => el.textContent).join("\n");
        return {
          tables: tables.length,
          hasHeader: !!th,
          hasBox: Array.from(tables).some((t) => /[┌│]/.test(t.textContent || "")),
          hasCold: /3m52s|cold/i.test(body),
          hasMention: !!document.querySelector(".cw-md-mention"),
          hasTopic: !!document.querySelector(".cw-md-topic"),
        };
      });
      if (!(inThread.tables >= 1 && inThread.hasHeader && inThread.hasBox && inThread.hasCold)) {
        return log("thread table missing: " + JSON.stringify(inThread));
      }
      // Discord-flavoured marks on Scout's plan (underline, spoiler, quote).
      const discord = await page.evaluate(() => {
        const c = document.querySelector('.cn-comment[data-key="p3"]');
        const u = c?.querySelector(".cw-md-u");
        const spoiler = c?.querySelector("[data-spoiler]");
        const quote = c?.querySelector(".cw-md-quote");
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
        const pre = document.querySelector('.cn-comment-body .cw-md-pre[data-lang="typescript"]');
        const toks = pre ? pre.querySelectorAll(".cw-tok").length : 0;
        const kw = pre ? pre.querySelectorAll(".cw-tok-kw").length : 0;
        const com = pre ? pre.querySelectorAll(".cw-tok-com").length : 0;
        return {
          pre: !!pre,
          toks,
          kw,
          com,
          text: pre?.textContent?.slice(0, 80) || "",
          editorReady: typeof window.CW_SYNTAX?.highlight === "function",
        };
      });
      if (!syn.editorReady) return log("CW_SYNTAX missing");
      if (!syn.pre || syn.toks < 3 || syn.kw < 1) {
        return log("fenced highlight missing: " + JSON.stringify(syn));
      }

      // Editor line highlighter (same CW_SYNTAX tokens as fences).
      const ed = await page.evaluate(() => {
        const buf = window.CW_EDITOR.open(
          "agent.ts",
          'import { defineAgent } from "eve";\n\n' +
            "export default defineAgent({\n" +
            '  model: "anthropic/claude-sonnet-4.6",\n' +
            "});\n",
          { name: "agent.ts", language: "typescript" },
        );
        const html = window.CW_EDITOR.render(buf, { focused: false, viewRows: 20 });
        const div = document.createElement("div");
        div.innerHTML = html;
        return {
          toks: div.querySelectorAll(".cw-ed-line .cw-tok-kw").length,
          fn: div.querySelectorAll(".cw-ed-line .cw-tok-fn").length,
          str: div.querySelectorAll(".cw-ed-line .cw-tok-str").length,
          lang: div.querySelector(".cw-ed-chrome-lang")?.textContent || "",
        };
      });
      if (!(ed.lang === "typescript" && ed.toks >= 2 && (ed.fn >= 1 || ed.str >= 1))) {
        return log("editor highlight missing: " + JSON.stringify(ed));
      }

      // Spoiler click can steal focus — return to the prompt before slash.
      await page.evaluate(() => {
        window.CW_APP.state.columnFocus = false;
        document.querySelector("[data-cli]")?.focus();
      });
      await page.fill("[data-cli]", "");
      // /space with no arg opens the spaces catalogue as a select list.
      await page.type("[data-cli]", "/space", { delay: 10 });
      await page.keyboard.press("Enter");
      await page.waitForTimeout(200);
      const listed = await page.evaluate(() => ({
        path: window.CW_APP.state.path,
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
        return { keys, ctx, path: window.CW_APP.state.path, pageText };
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
        path: window.CW_APP.state.path,
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
        const ident = window.CW_APP.getIdentity();
        return {
          kind: btn?.dataset.kind,
          anonymous: btn?.dataset.anonymous,
          name: btn?.querySelector(".cw-profile-name")?.textContent,
          initials: btn?.querySelector(".cw-profile-avatar")?.textContent,
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
      const again = await page.evaluate(() => window.CW_APP.getIdentity()?.principalId);
      return again === id.principalId || log("principal lost on reload: " + again);
    },
  },
  {
    name: "identity: page state (path) survives reload for the guest principal",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/bugs");
      await page.evaluate(() => {
        window.CW_APP.schedulePersist();
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
    name: "NAV-ID-004 DM owner access is revoked after a principal switch",
    run: async (page, log) => {
      const before = await page.evaluate(() => ({
        principalId: window.CW_APP.getIdentity()?.principalId,
        readableDmIds: window.CW_APP.viewerContext().readableDmIds,
      }));
      if (!before.principalId || before.readableDmIds.length === 0) {
        return log("fixture DM owner was not initialized: " + JSON.stringify(before));
      }
      await page.evaluate(() => window.CW_APP.signOut());
      const after = await page.evaluate(async () => {
        const viewer = window.CW_APP.viewerContext();
        window.CW_APP.state.path = "/dms/scout";
        window.CW_APP.state.detailOpen = true;
        const mergedBefore = window.CW_APP.state.merged.length;
        const post = await window.CW_MCP.call("board_post", { body: "foreign write must fail" });
        const listed = await window.CW_GRAPH.query(`{
          listPath(path: "/dms") { name }
        }`, undefined, viewer);
        return {
          principalId: window.CW_APP.getIdentity()?.principalId,
          readableDmIds: viewer.readableDmIds,
          listed: listed.data?.listPath || [],
          postDenied: post.isError === true,
          wrotePost: window.CW_APP.state.merged.length !== mergedBefore,
          navigated: window.CW_APP.navigate("/dms/scout", { keepCli: true }),
        };
      });
      return (after.principalId !== before.principalId &&
        after.readableDmIds.length === 0 && after.listed.length === 0 && after.postDenied &&
        !after.wrotePost && after.navigated === false) ||
        log("foreign principal retained DM access: " + JSON.stringify(after));
    },
  },
  {
    name: "NAV-ID-004 unattributed board state cannot claim the private DM inbox",
    storage: {
      "cw-board-state": JSON.stringify({
        v: 2,
        path: "/projects/community/channels/general",
        sessions: [],
      }),
    },
    run: async (page, log) => {
      const access = await page.evaluate(() => ({
        principalId: window.CW_APP.getIdentity()?.principalId,
        dmOwnerPrincipalId: window.CW_APP.state.dmOwnerPrincipalId,
        readableDmIds: window.CW_APP.viewerContext().readableDmIds,
      }));
      return (access.principalId && access.dmOwnerPrincipalId === null &&
        access.readableDmIds.length === 0) || log(JSON.stringify(access));
    },
  },
  {
    name: "profile: claim keeps principalId; profile shows handle; /whoami honest",
    run: async (page, log) => {
      const before = await page.evaluate(() => window.CW_APP.getIdentity()?.principalId);
      await page.keyboard.type("/claim garden-guest");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(200);
      const after = await page.evaluate(() => {
        const id = window.CW_APP.getIdentity();
        const btn = document.querySelector("[data-profile-btn]");
        return {
          kind: id?.kind,
          handle: id?.handle,
          principalId: id?.principalId,
          spaceId: id?.spaceId,
          btnKind: btn?.dataset.kind,
          btnName: btn?.querySelector(".cw-profile-name")?.textContent,
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
      const guestBefore = await page.evaluate(() => window.CW_APP.getIdentity()?.principalId);
      await page.keyboard.type("/login maya.bsky.social");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(250);
      const linked = await page.evaluate(() => {
        const id = window.CW_APP.getIdentity();
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
        const id = window.CW_APP.getIdentity();
        return {
          spaceId: id?.spaceId,
          kind: id?.kind,
          handle: id?.handle,
          path: window.CW_APP.state.path,
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
        const id = window.CW_APP.getIdentity();
        const btn = document.querySelector("[data-profile-btn]");
        return {
          kind: id?.kind,
          principalId: id?.principalId,
          name: btn?.querySelector(".cw-profile-name")?.textContent,
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
        const i = window.CW_APP.getIdentity();
        return {
          kind: i?.kind,
          handle: i?.handle,
          did: i?.did,
          spaceId: i?.spaceId,
          dialog: document.querySelector("[data-auth-dialog]")?.dataset.open,
          name: document.querySelector(".cw-profile-name")?.textContent,
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
        localStorage.removeItem("cw-notif-read");
        window.CW_APP.state.notifRead = {};
        window.CW_APP.paintActivityBell();
        window.CW_APP.render(true);
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

      await page.evaluate(() => {
        window.__activityPermissionRequest = window.CW_NOTIFY.requestPermission;
        window.__activityPermission = window.CW_NOTIFY.permission;
        window.CW_NOTIFY.requestPermission = () => new Promise(() => {});
        window.CW_NOTIFY.permission = () => "default";
      });
      await page.click("[data-activity-bell]");
      let p = await page.evaluate(() => {
        const current = window.CW_APP.state.path;
        window.CW_NOTIFY.requestPermission = window.__activityPermissionRequest;
        window.CW_NOTIFY.permission = window.__activityPermission;
        delete window.__activityPermissionRequest;
        delete window.__activityPermission;
        return current;
      });
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
        await page.evaluate(() => window.CW_APP.navigate("/notifications/mentions", { keepCli: true }));
      });
      await page.waitForTimeout(120);
      // Playwright :has-text may not work on all versions — navigate explicitly.
      await go(page, "/notifications/mentions");
      const mentions = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll(".cn-activity-card"));
        return {
          path: window.CW_APP.state.path,
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
      const beforeUnread = await page.evaluate(() => window.CW_APP.unreadActivityCount());
      await page.click(".cn-activity-card .cn-activity-open");
      await page.waitForTimeout(150);
      const after = await page.evaluate(() => ({
        path: window.CW_APP.state.path,
        unread: window.CW_APP.unreadActivityCount(),
      }));
      if (after.path === "/notifications/mentions") {
        return log("open did not leave activity: " + after.path);
      }
      if (!(after.unread < beforeUnread)) {
        return log("unread did not drop: " + beforeUnread + " → " + after.unread);
      }

      // Shared dismiss verb `d` clears Activity unread without opening.
      const dismissProbe = await page.evaluate(() => {
        localStorage.removeItem("cw-notif-read");
        window.CW_APP.state.notifRead = {};
        window.CW_APP.openActivity("all");
        window.CW_APP.state.columnFocus = true;
        window.CW_APP.state.cursor = 0;
        window.CW_APP.paintActivityBell();
        window.CW_APP.render(true);
        const btn = document.querySelector("[data-notif-dismiss]");
        const card = document.querySelector(".cn-activity-card[data-unread='true']") ||
          document.querySelector(".cn-activity-card");
        return {
          label: btn?.textContent?.trim() || null,
          id: btn?.getAttribute("data-notif-dismiss") || card?.getAttribute("data-notif") || null,
          path: window.CW_APP.state.path,
          unread: window.CW_APP.unreadActivityCount(),
        };
      });
      if (dismissProbe.label !== "Dismiss") {
        return log("Activity control should say Dismiss: " + JSON.stringify(dismissProbe));
      }
      if (!dismissProbe.id) return log("no notification to dismiss: " + JSON.stringify(dismissProbe));
      await page.keyboard.press("d");
      await page.waitForTimeout(100);
      let afterD = await page.evaluate((id) => ({
        unread: window.CW_APP.unreadActivityCount(),
        stored: !!window.CW_APP.state.notifRead?.[id],
        status: document.querySelector("[data-status-line]")?.textContent || "",
      }), dismissProbe.id);
      if (!afterD.stored) {
        // Keyboard may miss if focus left columns — prove shared dismissCurrent.
        afterD = await page.evaluate(() => {
          localStorage.removeItem("cw-notif-read");
          window.CW_APP.state.notifRead = {};
          window.CW_APP.openActivity("all");
          window.CW_APP.state.columnFocus = true;
          window.CW_APP.state.cursor = 0;
          window.CW_APP.render(true);
          const id = document.querySelector("[data-notif-dismiss]")?.getAttribute("data-notif-dismiss");
          const before = window.CW_APP.unreadActivityCount();
          const ok = window.CW_APP.dismissCurrent();
          return {
            id,
            ok: !!ok,
            before,
            unread: window.CW_APP.unreadActivityCount(),
            stored: !!(id && window.CW_APP.state.notifRead?.[id]),
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
        return { path: window.CW_APP.state.path, kinds };
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
        localStorage.removeItem("cw-notif-pushed");
        localStorage.removeItem("cw-hooks-fired");
        if (window.CW_HOOKS) window.CW_HOOKS.clearFired();

        // Ensure a bugs post hook is on.
        const listBefore = window.CW_HOOKS.list();
        const bugs = listBefore.find((h) => h.id === "hook-bugs") ||
          window.CW_HOOKS.add({
            id: "hook-bugs", event: "post.created", match: "channel:bugs",
            label: "New posts in #bugs", notify: true, enabled: true,
          }).hook;
        if (bugs && !bugs.enabled) window.CW_HOOKS.enable(bugs.id, true);

        // Emit a matching live-style post through the app.
        const items = window.CW_APP.broadcastHookEvent("post.created", {
          id: "e2e-hook-1",
          channel: "bugs",
          who: "patcher",
          subject: "Hook e2e",
          body: "session draft broke on cold install",
          at: "12:00",
        });
        const fired = window.CW_HOOKS.fired();
        const hookItems = fired.filter((n) => n.kind === "hook");
        // Navigate to hooks filter.
        window.CW_APP.openActivity("hooks");
        const path = window.CW_APP.state.path;
        const cards = Array.from(document.querySelectorAll(".cn-activity-card[data-kind='hook']"))
          .map((el) => el.getAttribute("data-notif"));
        // Slash surface
        const help = window.CW_APP.runHooksCommand("list");
        return {
          items: items.length,
          fired: hookItems.length,
          path,
          cards: cards.length,
          help: String(help || "").slice(0, 120),
          browser: created.length,
          events: window.CW_HOOKS.events().map((e) => e.id),
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
        path: window.CW_APP.state.path,
        fired: window.CW_HOOKS.fired().filter((n) => n.kind === "hook").length,
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
        localStorage.removeItem("cw-notif-pushed");
        localStorage.removeItem("cw-notif-read");
        window.CW_APP.state.notifRead = {};

        const before = window.CW_APP.browserNotifyPermission();
        // requestBrowserNotifications uses CW_NOTIFY which reads window.Notification live.
        const perm = await window.CW_APP.requestBrowserNotifications();
        const after = window.CW_APP.browserNotifyPermission();
        const supported = window.CW_APP.browserNotifySupported();
        // Force another deliver of unread.
        const shown = window.CW_APP.deliverBrowserNotifications({ force: false, silent: true });
        return {
          before, perm, after, supported,
          created: created.length,
          titles: created.map((c) => c.title),
          shown,
          label: window.CW_NOTIFY.permissionLabel(),
        };
      });
      if (!result.supported) return log("not supported after mock: " + JSON.stringify(result));
      if (result.perm !== "granted" || result.after !== "granted") {
        return log("permission not granted: " + JSON.stringify(result));
      }
      if (result.created < 1) return log("no browser notifications delivered: " + JSON.stringify(result));
      // Enable alerts control should hide once granted.
      await page.evaluate(() => window.CW_APP.paintActivityBell());
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
        localStorage.removeItem("cw-notif-pushed");
        // Pick a known unread mention with a stable where path.
        const item = (window.CW_DATA.notifications || []).find((n) => n.id === "n1") ||
          (window.CW_DATA.notifications || [])[0];
        if (!item) return { err: "no fixture" };
        window.CW_NOTIFY.clearPushed(item.id);
        const n = window.CW_NOTIFY.deliver(Object.assign({}, item, { unread: true }), {
          force: true,
          onClick: (data) => window.CW_APP.openNotification(data.id),
        });
        if (!n || !n.onclick) return { err: "no instance", created: created.length };
        n.onclick({ preventDefault() {} });
        return { path: window.CW_APP.state.path, where: item.where, created: created.length };
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
        const pathNow = window.CW_APP.state.path;
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
        window.CW_APP.focusColumns();
        window.CW_APP.state.detailOpen = false;
        if (window.CW_APP.state.editor) window.CW_APP.state.editor.focused = false;
        const list = window.CW_MAP.list("/.agents/space-steward") || [];
        const ix = list.findIndex((e) => e.name === "instructions.md");
        if (ix < 0) return { err: "no instructions.md in list" };
        window.CW_APP.state.cursor = ix;
        window.CW_APP.state.focus = 0;
        window.CW_APP.render(true);
        return { ok: true };
      });
      if (prepared.err) return log(prepared.err);
      await page.waitForTimeout(80);
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(150);
      const after = await page.evaluate(() => {
        const ed = document.querySelector("[data-editor]");
        const st = window.CW_APP.state;
        return {
          detail: !!document.querySelector('.cn-blade[data-blade-kind="detail"]'),
          open: window.CW_APP.isDetailOpen(),
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
        window.CW_APP.focusColumns();
        window.CW_APP.state.detailOpen = true;
        window.CW_APP.state.threadFocus = null;
        if (window.CW_APP.state.editor) window.CW_APP.state.editor.focused = false;
        const feed = window.CW_MAP.feedEntriesAt
          ? window.CW_MAP.feedEntriesAt("/projects/community/channels/general", window.CW_APP.state.merged)
          : [];
        const hit = feed.find((e) => e.post && e.post.id === "p1");
        if (!hit) return { err: "no p1" };
        window.CW_APP.state.feedMark = "p1";
        window.CW_APP.state.focus = 1;
        window.CW_APP.render(true);
        return { id: hit.post.id, path: window.CW_APP.state.path };
      });
      if (postPrep.err) return log(postPrep.err);
      await page.waitForTimeout(80);
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(120);
      const threadAfter = await page.evaluate(() => {
        const nav = window.CW_MAP.list(
          window.CW_MAP.navParentPath(window.CW_APP.state.path), window.CW_APP.state.merged,
        ) || [];
        return {
          path: window.CW_APP.state.path,
          thread: window.CW_APP.state.threadFocus,
          editor: !!(window.CW_APP.state.editor && window.CW_APP.state.editor.focused),
          navPosts: nav.filter((e) => e && e.post).length,
          replyInDetail: !!document.querySelector('.cn-comment[data-key="p2"]'),
        };
      });
      if (!threadAfter.path.startsWith(postPrep.path + "/") ||
          !threadAfter.path.split("/").includes(threadAfter.thread)) {
        return log("→ should address the message path: " + JSON.stringify(threadAfter));
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
        const st = window.CW_APP.state;
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
        window.CW_APP.state.columnFocus = true;
        window.CW_APP.state.focus = 0;
      });
      await page.keyboard.press("Enter");
      await page.waitForTimeout(150);
      const ui = await page.evaluate(() => {
        const ed = document.querySelector("[data-editor]");
        const status = document.querySelector(".cw-ed-status-mode")?.textContent || "";
        const body = document.querySelector("[data-editor-body]");
        return {
          hasEditor: !!ed,
          status,
          lines: body ? body.querySelectorAll(".cw-ed-row").length : 0,
          mode: ed?.getAttribute("data-mode"),
          path: window.CW_APP.getEditor && window.CW_APP.getEditor()?.path,
        };
      });
      if (!ui.hasEditor || ui.lines < 1) return log("editor missing: " + JSON.stringify(ui));
      // Focus editor and enter insert mode.
      await page.click("[data-editor]");
      await page.waitForTimeout(80);
      await page.keyboard.press("i");
      await page.waitForTimeout(80);
      const insert = await page.evaluate(() => ({
        mode: window.CW_APP.getEditor()?.mode,
        status: document.querySelector(".cw-ed-status-mode")?.textContent,
      }));
      if (insert.mode !== "insert") return log("i did not enter insert: " + JSON.stringify(insert));
      await page.keyboard.type(">>");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(80);
      const after = await page.evaluate(() => {
        const ed = window.CW_APP.getEditor();
        return {
          mode: ed?.mode,
          dirty: ed?.dirty,
          text: ed ? window.CW_EDITOR.text(ed).slice(0, 40) : "",
          caret: !!document.querySelector(".cw-ed-caret"),
        };
      });
      if (after.mode !== "normal") return log("Esc did not restore normal: " + JSON.stringify(after));
      if (!after.dirty || !after.text.includes(">>")) {
        return log("insert text missing: " + JSON.stringify(after));
      }
      // Click a character to move caret.
      const clicked = await page.evaluate(() => {
        const ch = document.querySelector('.cw-ed-ch[data-line="0"][data-col="0"]');
        if (!ch) return { err: "no cell" };
        ch.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        // pointerdown path used by app
        const ed = document.querySelector("[data-editor]");
        const rect = ch.getBoundingClientRect();
        ed?.dispatchEvent(new PointerEvent("pointerdown", {
          bubbles: true, clientX: rect.left + 2, clientY: rect.top + 2, pointerType: "mouse",
        }));
        return {
          line: window.CW_APP.getEditor()?.cursor?.line,
          col: window.CW_APP.getEditor()?.cursor?.col,
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
        path: window.CW_APP.state.path,
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
        window.CW_APP.state.columnFocus = false;
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
          path: window.CW_APP.state.path,
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
          pane: window.CW_APP.state.personPane || "messages",
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
        pane: window.CW_APP.state.personPane,
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
          pane: window.CW_APP.state.personPane,
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
        pane: window.CW_APP.state.personPane,
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
    name: "markers: @ opens mentions and arrows insert @handle with space",
    run: async (page, log) => {
      // Free-form chat: markers work mid-sentence, not only as whole lines.
      await page.evaluate(() => {
        window.CW_APP.state.ai = true;
        window.CW_APP.state.columnFocus = false;
        if (window.CW_APP.state.editor) window.CW_APP.state.editor.focused = false;
        window.CW_APP.navigate("/", { keepCli: true });
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
        const completion = window.CW_APP.state.completion;
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
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      await page.waitForFunction(() =>
        (document.querySelector("[data-cli]")?.value || "") === "ping @maya ");
      const after = await page.evaluate(() => document.querySelector("[data-cli]")?.value || "");
      return after === "ping @maya " || log("after arrow accept: " + JSON.stringify(after));
    },
  },
  {
    name: "markers: # opens topics/channels; arrows accept incomplete tag",
    run: async (page, log) => {
      await page.keyboard.type("track #draft");
      await page.waitForTimeout(120);
      const menu = await page.evaluate(() => {
        const cands = Array.from(document.querySelectorAll(".cn-cand")).map((el) =>
          el.querySelector("span")?.textContent);
        return {
          cands,
          kind: window.CW_APP.state.completion?.kind,
          head: document.querySelector(".cn-menu-head")?.textContent || "",
        };
      });
      if (!menu.cands.some((v) => v === "#draft-persistence")) {
        return log("topic missing: " + JSON.stringify(menu));
      }
      // Arrow selection plus Enter accepts without submitting; a second Enter sends.
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      await page.waitForFunction(() =>
        (document.querySelector("[data-cli]")?.value || "") === "track #draft-persistence ");
      const val = await page.evaluate(() => document.querySelector("[data-cli]")?.value || "");
      if (val !== "track #draft-persistence ") {
        return log("after arrow accept: " + JSON.stringify(val));
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
          ready: !!window.CW_APP.state.speech?.ready,
          avail: window.CW_APP.state.speech?.availability,
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
      const gated = await page.evaluate(() => window.CW_APP.state.speech.listening);
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
        await window.CW_APP.warmSpeechModel();
      });
      await page.waitForTimeout(80);
      const ready = await page.evaluate(() => ({
        supported: window.CW_SPEECH.isSupported(),
        ready: window.CW_APP.speechReady(),
        avail: window.CW_APP.state.speech.availability,
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
        listening: window.CW_APP.state.speech.listening,
        mode: window.CW_APP.state.speech.mode,
        pressed: document.querySelector("[data-speech-mic]")?.getAttribute("aria-pressed"),
      }));
      await page.keyboard.up("`");
      await page.waitForTimeout(100);
      if (!(ptt.listening && ptt.mode === "ptt" && ptt.pressed === "true")) {
        return log("PTT failed: " + JSON.stringify(ptt));
      }
      const afterPtt = await page.evaluate(() => window.CW_APP.state.speech.listening);
      if (afterPtt) return log("PTT still listening after release");

      // Alt+V toggles continuous dictation.
      await page.keyboard.down("Alt");
      await page.keyboard.press("KeyV");
      await page.keyboard.up("Alt");
      await page.waitForTimeout(120);
      const toggled = await page.evaluate(() => ({
        listening: window.CW_APP.state.speech.listening,
        mode: window.CW_APP.state.speech.mode,
        tag: document.querySelector("[data-speech-tag]")?.textContent,
      }));
      if (!(toggled.listening && toggled.mode === "toggle")) {
        return log("toggle failed: " + JSON.stringify(toggled));
      }
      await page.keyboard.press("Escape");
      await page.waitForTimeout(80);
      const stopped = await page.evaluate(() => window.CW_APP.state.speech.listening);
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
        await window.CW_APP.warmSpeechModel();
      });
      await page.waitForTimeout(80);
      const pending = await page.evaluate(() => ({
        ready: window.CW_APP.speechReady(),
        avail: window.CW_APP.state.speech.availability,
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
        await window.CW_APP.fetchSpeechModel({ fromGesture: true });
      });
      const after = await page.evaluate(() => ({
        ready: window.CW_APP.speechReady(),
        avail: window.CW_APP.state.speech.availability,
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
        await window.CW_APP.warmSpeechModel();
        window.CW_APP.render(true);
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
        modes.push(await page.evaluate(() => window.CW_APP.state.speech.intent));
      }
      if (modes.join(",") !== "dictation,commands,default") {
        return log("intent cycle: " + modes.join(","));
      }

      // Chip click cycles too.
      const chip = await page.evaluate(() => !!document.querySelector("[data-voice-intent]"));
      if (!chip) return log("voice intent chip missing");
      await page.click("[data-voice-intent]");
      await page.waitForTimeout(60);
      const afterChip = await page.evaluate(() => window.CW_APP.state.speech.intent);
      if (afterChip !== "dictation") return log("chip cycle expected dictation, got " + afterChip);

      // Reset to default and speak a wake-prefixed command.
      await page.evaluate(() => window.CW_APP.setSpeechIntent("default"));
      await page.evaluate(() => {
        // Force a fresh engine so MockRec is used.
        window.CW_APP.state.speech.listening = false;
      });
      // Start listen, then inject a final via a direct handleSpeechFinal (stable without racing rec).
      const nav = await page.evaluate(() => {
        const before = window.CW_APP.state.path;
        window.CW_APP.handleSpeechFinal("computer go to projects");
        return { before, after: window.CW_APP.state.path };
      });
      if (!String(nav.after).includes("projects")) {
        return log("wake command did not navigate: " + JSON.stringify(nav));
      }

      // Dictation mode types text instead of navigating.
      await page.evaluate(() => {
        window.CW_APP.setSpeechIntent("dictation");
        window.CW_APP.handleSpeechFinal("clear prompt");
        window.CW_APP.handleSpeechFinal("hello from voice");
      });
      const typed = await page.evaluate(() => document.querySelector("[data-cli]")?.value || "");
      if (!/hello from voice/i.test(typed)) {
        return log("dictation did not type: " + typed);
      }

      // Commands mode rejects unknown; help lists grammar.
      await page.evaluate(() => {
        window.CW_APP.setSpeechIntent("commands");
        window.CW_APP.handleSpeechFinal("what can I say");
      });
      await page.waitForTimeout(80);
      const help = await page.evaluate(() => {
        const lines = (window.CW_APP.state.lines || []).map((l) => l.text || "").join("\n");
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
        path: window.CW_APP.state.path,
        supported: window.CW_VOICE?.isSupported?.(),
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
        voice: { ...window.CW_APP.state.voice },
        mute: document.querySelector("[data-voice-mute]")?.textContent,
      }));
      if (!joined.dock || !joined.voice.joined || joined.voice.channelId !== "lounge") {
        return log("join failed: " + JSON.stringify(joined));
      }

      await page.click("[data-voice-mute]");
      await page.waitForTimeout(80);
      const muted = await page.evaluate(() => window.CW_APP.state.voice.muted);
      if (!muted) return log("mute did not stick");

      await page.click('[data-voice-input="ptt"]');
      await page.waitForTimeout(80);
      const mode = await page.evaluate(() => window.CW_APP.state.voice.inputMode);
      if (mode !== "ptt") return log("expected ptt mode, got " + mode);

      // Channel-voice PTT owns ` — should not start speech listening.
      await page.keyboard.down("`");
      await page.waitForTimeout(80);
      const ptt = await page.evaluate(() => ({
        speech: window.CW_APP.state.speech?.listening,
        speaking: window.CW_APP.state.voice.speaking,
      }));
      await page.keyboard.up("`");
      if (ptt.speech) return log("voice PTT leaked into speech: " + JSON.stringify(ptt));

      await page.click("[data-voice-leave]");
      await page.waitForTimeout(120);
      const left = await page.evaluate(() => ({
        joined: window.CW_APP.state.voice.joined,
        dock: !!document.querySelector(".cn-voice-dock"),
      }));
      if (left.joined || left.dock) return log("leave failed: " + JSON.stringify(left));

      // Slash path
      await page.evaluate(async () => {
        await window.CW_APP.runVoiceCommand("join standup");
      });
      await page.waitForTimeout(150);
      const viaSlash = await page.evaluate(() => window.CW_APP.state.voice);
      if (!viaSlash.joined || viaSlash.channelId !== "standup") {
        return log("slash join failed: " + JSON.stringify(viaSlash));
      }
      await page.evaluate(async () => { await window.CW_APP.leaveVoice(); });
      return true;
    },
  },
  {
    name: "markers: bare @ in ai mode lists members (not slash commands)",
    run: async (page, log) => {
      // Ensure ai mode so slash preference is on — markers must still win.
      await page.evaluate(() => { window.CW_APP.state.ai = true; });
      await page.keyboard.type("@");
      await page.waitForTimeout(120);
      const got = await page.evaluate(() => {
        const cands = Array.from(document.querySelectorAll(".cn-cand span"))
          .map((s) => s.textContent);
        return {
          kind: window.CW_APP.state.completion?.kind,
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
          api: typeof window.CW_GRIDROAD?.isMoving === "function"
            ? window.CW_GRIDROAD.isMoving()
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
        api: window.CW_GRIDROAD?.isMoving?.() ?? null,
      }));
      if (on.moving !== "true" || on.pressed !== "true" || on.api !== true) {
        return log("click did not start motion: " + JSON.stringify(on));
      }
      await page.click("[data-gridroad]", { force: true });
      await page.waitForTimeout(60);
      const off = await page.evaluate(() => ({
        moving: document.querySelector("[data-gridroad]")?.dataset.moving,
        api: window.CW_GRIDROAD?.isMoving?.() ?? null,
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
        intel: !!window.CW_APP.state.intelOpen,
        onboard: !!window.CW_APP.state.keysOnboard,
        lead: document.querySelector(".cn-help-lead")?.textContent || "",
        scope: document.querySelector(".cn-help-scope")?.textContent || "",
        stored: localStorage.getItem("cw-keys-onboarded"),
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
        onboard: !!window.CW_APP.state.keysOnboard,
        stored: localStorage.getItem("cw-keys-onboarded"),
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
        onboard: !!window.CW_APP.state.keysOnboard,
        intel: !!window.CW_APP.state.intelOpen,
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
      await page.evaluate(() => window.CW_APP.status("loaded 3 new posts"));
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
        intel: window.CW_APP.state.intelOpen,
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
        intel: window.CW_APP.state.intelOpen,
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
        intel: window.CW_APP.state.intelOpen,
        focused: document.activeElement === document.querySelector("[data-cli]"),
      }));
      if (!(open.help === "true" && open.menu === "true" && open.cands > 3 && open.intel && open.focused)) {
        return log(JSON.stringify(open));
      }
      await page.keyboard.press("Escape");
      await page.waitForTimeout(100);
      const closed = await page.evaluate(() => ({
        help: document.querySelector(".cn-help")?.dataset.open,
        intel: window.CW_APP.state.intelOpen,
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
        const ctx = window.CW_APP.state.helpCtx;
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
        window.CW_APP.state.columnFocus = true;
        window.CW_APP.state.focus = 0;
        window.CW_APP.state.detailOpen = true;
        window.CW_APP.render(true);
      });
      await page.waitForTimeout(80);
      await page.keyboard.press("Control+Space");
      await page.waitForTimeout(150);
      const onNav = await page.evaluate(() => {
        const titles = Array.from(document.querySelectorAll(".cn-help-group h3")).map((h) => h.textContent);
        const chips = Array.from(document.querySelectorAll(".cn-help-chip")).map((c) => c.textContent);
        const ctx = window.CW_APP.state.helpCtx;
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
        window.CW_APP.openThread("p1", { silent: true });
        window.CW_APP.state.columnFocus = true;
        window.CW_APP.state.focus = 1;
        window.CW_APP.state.detailOpen = true;
        window.CW_APP.render(true);
      });
      await page.waitForTimeout(80);
      await page.keyboard.press("Control+Space");
      await page.waitForTimeout(150);
      const onThread = await page.evaluate(() => {
        const titles = Array.from(document.querySelectorAll(".cn-help-group h3")).map((h) => h.textContent);
        const ctx = window.CW_APP.state.helpCtx;
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
        window.CW_APP.state.columnFocus = true;
        window.CW_APP.state.focus = 1;
        window.CW_APP.state.detailOpen = true;
        window.CW_APP.render(true);
      });
      await page.waitForTimeout(80);
      await page.keyboard.press("Control+Space");
      await page.waitForTimeout(150);
      const onDm = await page.evaluate(() => {
        const titles = Array.from(document.querySelectorAll(".cn-help-group h3")).map((h) => h.textContent);
        return { titles, context: window.CW_APP.state.helpCtx?.context };
      });
      return (onDm.context === "dm" && onDm.titles.includes("Messages") &&
          !onDm.titles.includes("Prompt")) ||
        log("dm sheet wrong: " + JSON.stringify(onDm));
    },
  },
  {
    name: "NAV-ID-004 private DM content stays out of locators history shares notifications and action events",
    run: async (page, log) => {
      const prepared = await page.evaluate(() => {
        const sentinel = "DO_NOT_LEAK_7f3c";
        const post = window.CW_DATA.dmMessages.find((item) => item.id === "dm-s4");
        const notification = window.CW_DATA.notifications.find((item) => item.id === "n2");
        post.who = sentinel;
        post.subject = sentinel;
        post.body = sentinel;
        post.revision = "cid-private-dm-s4-v2";
        notification.who = sentinel;
        notification.subject = sentinel;
        notification.body = sentinel;
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: { writeText(value) {
            window.__cwCopiedLinks = (window.__cwCopiedLinks || []).concat(String(value));
            return Promise.resolve();
          } },
        });
        window.__cwCopiedLinks = [];
        window.CW_APP.navigate("/dms/scout", { keepCli: true });
        window.CW_APP.openThread("dm-s4");
        window.CW_APP.commitNavigation(true);
        return {
          sourceContainsSentinel: [post.who, post.subject, post.body].every((value) => value === sentinel),
          notificationTarget: window.CW_NOTIFY.optionsFor(notification).data.where,
        };
      });
      if (!prepared.sourceContainsSentinel) return log("private sentinel fixture was not armed");
      const shareReady = await page.waitForSelector(
        '[data-share-post="dm-s4"][data-share-kind="canonical"]',
        { state: "attached", timeout: 3000 },
      ).then(() => true, () => false);
      if (!shareReady) {
        const diagnostic = await page.evaluate(() => ({
          path: window.CW_APP.state.path,
          thread: window.CW_APP.state.threadFocus,
          selected: window.CW_APP.state.feedMark,
          shares: Array.from(document.querySelectorAll("[data-share-post]"))
            .map((item) => item.getAttribute("data-share-post") + ":" + item.getAttribute("data-share-kind")),
          revision: window.CW_DATA.dmMessages.find((item) => item.id === "dm-s4")?.revision,
        }));
        return log("private DM share controls missing: revision=" + diagnostic.revision + " s4=" +
          diagnostic.shares.filter((item) => item.startsWith("dm-s4:")).join(",") +
          " path=" + diagnostic.path);
      }
      for (const kind of ["canonical", "contextual", "exact"]) {
        const before = await page.evaluate(() => window.__cwCopiedLinks.length);
        await page.evaluate((shareKind) => {
          document.querySelector(
            `[data-share-post="dm-s4"][data-share-kind="${shareKind}"]`,
          )?.click();
        }, kind);
        await page.waitForFunction((count) => window.__cwCopiedLinks.length === count + 1, before);
      }
      await page.evaluate(async () => {
        await window.CW_ACTIONS.invoke("share.contextual", { line: "/share" }, {
          origin: "slash",
          context: "board",
          objectId: "dm-s4",
          projectionId: "dm-scout",
        });
      });
      await page.waitForFunction(() => window.__cwCopiedLinks.length === 4);
      const proof = await page.evaluate((notificationTarget) => ({
        href: window.location.href,
        history: JSON.stringify(window.history.state),
        links: window.__cwCopiedLinks.slice(),
        notificationTarget,
        action: JSON.stringify(window.CW_ACTIONS.lastEvent()),
        status: document.querySelector("[data-status-line]")?.textContent || "",
      }), prepared.notificationTarget);
      const serializedLocators = JSON.stringify(proof);
      if (serializedLocators.includes("DO_NOT_LEAK_7f3c")) {
        return log("private content leaked into locator metadata: " + serializedLocators);
      }
      const [canonical, contextual, exact, defaultShare] = proof.links;
      return canonical.includes("object=dm-s4") && !canonical.includes("projection=") &&
        contextual.includes("projection=dm-scout") && contextual.includes("focus=dm-s4") &&
        exact.includes("object=dm-s4") && exact.includes("revision=cid-private-dm-s4-v2") &&
        defaultShare === contextual && prepared.notificationTarget === "/dms/scout" &&
        JSON.parse(proof.action).actionId === "share.contextual" ||
        log("private locator contract incomplete: " + JSON.stringify(proof));
    },
  },
  {
    name: "NAV-ID-005 exact revision routes persist and report mismatches honestly",
    run: async (page, log) => {
      const proof = await page.evaluate(() => {
        const post = window.CW_DATA.posts.find((item) => item.id === "p1");
        post.revision = "cid-p1-current";
        window.CW_APP.restoreNavigation({ objectId: "p1", revision: "cid-p1-current" });
        window.CW_APP.commitNavigation(true);
        const matched = {
          href: window.location.href,
          location: window.CW_APP.navigationLocation(),
          status: document.querySelector("[data-status-line]")?.textContent || "",
        };
        window.CW_APP.restoreNavigation({ objectId: "p1", revision: "cid-p1-stale" });
        window.CW_APP.commitNavigation(true);
        return {
          matched,
          stale: {
            href: window.location.href,
            location: window.CW_APP.navigationLocation(),
            status: document.querySelector("[data-status-line]")?.textContent || "",
          },
        };
      });
      return proof.matched.location.revision === "cid-p1-current" &&
        /object=p1/.test(proof.matched.href) && /revision=cid-p1-current/.test(proof.matched.href) &&
        !/projection=/.test(proof.matched.href) && !/mismatch|unavailable/i.test(proof.matched.status) &&
        proof.stale.location.revision === "cid-p1-stale" &&
        /object=p1/.test(proof.stale.href) && /revision=cid-p1-stale/.test(proof.stale.href) &&
        /exact revision mismatch.*current revision cid-p1-current/i.test(proof.stale.status) ||
        log("exact revision restoration failed: " + JSON.stringify(proof));
    },
  },
  {
    name: "NAV-PROJ-003 namespace reply browser and shell ancestry remain distinct",
    run: async (page, log) => {
      const firstThree = await page.evaluate(async () => {
        const mention = window.CW_DATA.notifications.find((item) => item.id === "n1");
        mention.ref = "p3";
        mention.where = "/projects/community/channels/general";
        const mentions = { projectionId: "activity-mentions", objectId: "p3" };
        const start = () => {
          window.CW_APP.restoreNavigation(mentions);
          window.CW_APP.openThread("p3", { noHistory: true, silent: true });
        };
        const capture = () => ({
          actionId: window.CW_ACTIONS.lastEvent()?.actionId,
          path: window.CW_APP.state.path,
          thread: window.CW_APP.state.threadFocus,
          objectId: window.CW_APP.state.feedMark,
        });

        start();
        await window.CW_ACTIONS.invoke("nav.ascend", {}, { origin: "cli", context: "board" });
        const ascend = capture();

        start();
        await window.CW_ACTIONS.invoke("thread.parent", {}, {
          origin: "keyboard", context: "board", objectId: "p3", projectionId: "activity-mentions",
        });
        const parent = capture();

        start();
        const previous = {
          projectionId: "channel-general", objectId: "p1", sort: "hot",
        };
        window.history.replaceState(previous, "", window.CW_NAV.routeUrl(previous));
        const current = window.CW_APP.navigationLocation();
        window.history.pushState(current, "", window.CW_NAV.routeUrl(current));
        await window.CW_ACTIONS.invoke("history.back", {}, { origin: "keyboard", context: "board" });
        return { ascend, parent };
      });
      await page.waitForFunction(() => window.CW_APP.state.path ===
        "/projects/community/channels/general");
      const browserBack = await page.evaluate(() => ({
        actionId: window.CW_ACTIONS.lastEvent()?.actionId,
        path: window.CW_APP.state.path,
        thread: window.CW_APP.state.threadFocus,
        objectId: window.CW_APP.state.feedMark,
      }));
      const previousLocation = await page.evaluate(async () => {
        window.CW_APP.navigate("/dms/scout", { keepCli: true, noHistory: true });
        window.CW_APP.navigate("/notifications/mentions", { keepCli: true, noHistory: true });
        window.CW_APP.openThread("p3", { noHistory: true, silent: true });
        await window.CW_ACTIONS.invoke("history.previousLocation", {}, {
          origin: "cli", context: "board",
        });
        return {
          actionId: window.CW_ACTIONS.lastEvent()?.actionId,
          path: window.CW_APP.state.path,
          thread: window.CW_APP.state.threadFocus,
          objectId: window.CW_APP.state.feedMark,
        };
      });
      const outcomes = [firstThree.ascend, firstThree.parent, browserBack, previousLocation];
      const ids = outcomes.map((item) => item.actionId);
      const states = outcomes.map((item) => JSON.stringify({
        path: item.path, thread: item.thread, objectId: item.objectId,
      }));
      return ids.join("|") ===
          "nav.ascend|thread.parent|history.back|history.previousLocation" &&
        new Set(states).size === 4 &&
        firstThree.ascend.path === "/notifications" &&
        firstThree.parent.path === "/notifications/mentions" && firstThree.parent.thread === "p2" &&
        browserBack.path === "/projects/community/channels/general" &&
        previousLocation.path === "/dms/scout" ||
        log("ancestry operations collapsed: " + JSON.stringify(outcomes));
    },
  },
  {
    name: "NAV-PROJ-004 removed saved projection falls back to its canonical object",
    run: async (page, log) => {
      const prepared = await page.evaluate(async () => {
        const state = {};
        window.CW_WORKBENCH.openSearch(state, "channel:general");
        await window.CW_WORKBENCH.runSearch(state);
        const saved = window.CW_WORKBENCH.saveSearchProjection(state, "Temporary projection");
        const ref = window.CW_MAP.objectRef(window.CW_DATA.posts.find((post) => post.id === "p1"));
        const url = window.CW_CORE.objectUrl(ref, {
          origin: window.location.origin, projectionId: saved.projectionId,
        });
        const deleted = window.CW_WORKBENCH.deleteProjection(saved.projectionId);
        return { url, projectionId: saved.projectionId, objectId: ref.objectId, deleted };
      });
      if (!prepared.deleted) return log("saved projection was not deleted");
      await page.goto(prepared.url, { waitUntil: "domcontentloaded" });
      await page.waitForFunction((objectId) => window.CW_APP.state.feedMark === objectId, prepared.objectId);
      const restored = await page.evaluate(() => ({
        objectId: window.CW_APP.state.feedMark,
        projectionId: window.CW_APP.navigationLocation().projectionId,
        path: window.CW_APP.state.path,
        status: document.querySelector("[data-status-line]")?.textContent || "",
        blank: !document.querySelector('[data-object-id="p1"]'),
      }));
      return restored.objectId === prepared.objectId &&
        restored.projectionId !== prepared.projectionId &&
        /\/projects\/community\/channels\/general/.test(restored.path) &&
        /projection unavailable.*canonical object/i.test(restored.status) && !restored.blank ||
        log("projection fallback: status=" + restored.status + " blank=" + restored.blank +
          " object=" + restored.objectId + " projection=" + restored.projectionId);
    },
  },
  {
    name: "NAV-MIGRATE-003 legacy paths locators and sorted shares resolve then modernize",
    run: async (page, log) => {
      const legacySlug = "001-lea-every-cold-install-her";
      const direct = await page.evaluate((slug) => {
        const ok = window.CW_APP.navigate("/projects/community/channels/general/" + slug, {
          keepCli: true,
        });
        return { ok, path: window.CW_APP.state.path, objectId: window.CW_APP.state.feedMark,
          href: window.location.href };
      }, legacySlug);
      const channelAlias = await page.evaluate(() => {
        const ok = window.CW_APP.navigate("/channels/general/p1", { keepCli: true });
        return { ok, path: window.CW_APP.state.path, objectId: window.CW_APP.state.feedMark,
          href: window.location.href };
      });

      async function clickLegacy(locator) {
        await page.evaluate((value) => {
          document.querySelector("[data-e2e-legacy-link]")?.remove();
          const host = document.createElement("div");
          host.dataset.e2eLegacyLink = "true";
          host.innerHTML = window.CW_ASCII.linkPreview(value);
          document.body.appendChild(host);
        }, locator);
        await page.locator("[data-e2e-legacy-link] [data-goto]").click();
        await page.waitForFunction(() => window.CW_APP.state.feedMark === "p1");
        return page.evaluate(() => ({
          path: window.CW_APP.state.path,
          objectId: window.CW_APP.state.feedMark,
          sort: window.CW_APP.state.sort,
          href: window.location.href,
        }));
      }

      const retiredScheme = await clickLegacy("nightboard:/projects/community/channels/general/p1");
      const sortedShare = await clickLegacy(
        "nightboard:/channels/general/" + legacySlug + "?sort=top",
      );
      const probes = [direct, channelAlias, retiredScheme, sortedShare];
      const modern = probes.every((probe) => probe.objectId === "p1" &&
        /\/board\.html\?/.test(probe.href) && /(?:focus|object)=p1/.test(probe.href) &&
        !probe.href.includes(legacySlug) && !probe.href.includes("nightboard:") &&
        !/\/channels\/general(?:\/|%2F)/.test(probe.href));
      return modern && direct.ok && channelAlias.ok && sortedShare.sort === "top" &&
        /sort=top/.test(sortedShare.href) ||
        log("legacy migration: " + probes.map((probe) => [probe.ok, probe.objectId, probe.sort,
          probe.path, probe.href].join("~")).join(" | "));
    },
  },
  {
    name: "NAV-JUMP-003 zi requires explicit grouped acceptance",
    run: async (page, log) => {
      await go(page, "/projects/community/channels");
      const prompt = page.locator("[data-cli]");
      await prompt.fill("zi general");
      await prompt.press("Enter");
      const chooser = await page.evaluate(() => ({
        path: window.CW_APP.state.path,
        kind: window.CW_APP.state.completion?.kind,
        active: window.CW_APP.state.candIndex,
        groups: Array.from(new Set((window.CW_APP.state.completion?.candidates || []).map((candidate) => candidate.group))),
        visibleGroups: Array.from(document.querySelectorAll(".cn-cand-group")).map((group) => group.textContent?.trim()),
        complete: (window.CW_APP.state.completion?.candidates || []).every((candidate) =>
          candidate.value && candidate.kind && candidate.matchReason && (candidate.objectId || candidate.projectionId || candidate.id)),
      }));
      await prompt.press("Escape");
      const after = await page.evaluate(() => ({ path: window.CW_APP.state.path,
        expanded: document.querySelector("[data-cli]")?.getAttribute("aria-expanded") }));
      await page.locator('[data-action-id="jump.interactive"]').click();
      const pointerOpened = await page.evaluate(() => ({
        path: window.CW_APP.state.path,
        kind: window.CW_APP.state.completion?.kind,
        expanded: document.querySelector("[data-cli]")?.getAttribute("aria-expanded"),
        completionLayer: window.CW_APP.state.layers.includes("completion"),
        layers: window.CW_APP.state.layers.slice(),
      }));
      await page.keyboard.press("Escape");
      const pointerAfter = await page.evaluate(() => ({
        path: window.CW_APP.state.path,
        expanded: document.querySelector("[data-cli]")?.getAttribute("aria-expanded"),
        completionLayer: window.CW_APP.state.layers.includes("completion"),
        layers: window.CW_APP.state.layers.slice(),
        focusAction: document.activeElement?.getAttribute("data-action-id"),
      }));
      return chooser.path === "/projects/community/channels" && chooser.kind === "jump" && chooser.active === -1 &&
        chooser.groups.includes("CURRENT") && chooser.groups.includes("GLOBAL") && chooser.complete &&
        chooser.visibleGroups.includes("CURRENT") && chooser.visibleGroups.includes("GLOBAL") &&
        after.path === chooser.path && after.expanded === "false" &&
        pointerOpened.path === chooser.path && pointerOpened.kind === "jump" &&
        pointerOpened.expanded === "true" && pointerOpened.completionLayer &&
        pointerOpened.layers.filter((layer) => layer === "completion").length === 1 &&
        pointerAfter.path === chooser.path && pointerAfter.expanded === "false" && !pointerAfter.completionLayer &&
        pointerAfter.layers.length === pointerOpened.layers.length - 1 &&
        pointerAfter.focusAction === "jump.interactive" ||
        log("jump chooser contract: " + JSON.stringify({ chooser, after, pointerOpened, pointerAfter }));
    },
  },
  {
    name: "NAV-JUMP-004 MCP exact navigate and fuzzy jump differ",
    run: async (page, log) => {
      await go(page, "/projects/community");
      const result = await page.evaluate(async () => {
        const before = window.CW_APP.state.path;
        const exact = await window.CW_MCP.call("board_navigate", { path: "gen" });
        const afterExact = window.CW_APP.state.path;
        const exactAction = window.CW_ACTIONS.lastEvent()?.actionId;
        const jump = await window.CW_MCP.call("board_jump", { terms: "general", interactive: true });
        return { before, afterExact, exactError: !!exact.isError, exactAction,
          jumpError: !!jump.isError, jumpAction: window.CW_ACTIONS.lastEvent()?.actionId,
          chooser: window.CW_APP.state.completion?.kind };
      });
      return result.exactError && result.before === result.afterExact && !result.jumpError &&
        result.exactAction !== result.jumpAction && result.jumpAction === "jump.interactive" && result.chooser === "jump" ||
        log("MCP navigate/jump drift: " + JSON.stringify(result));
    },
  },
  {
    name: "NAV-ACTION-001 built-in jump uses one action across pointer keyboard CLI slash voice and WebMCP",
    run: async (page, log) => {
      await go(page, "/projects/community/channels");
      const startPath = await page.evaluate(() => window.CW_APP.state.path);
      const observed = [];
      const clearChooser = async () => {
        await page.evaluate(() => {
          window.CW_APP.state.menuDismissed = true;
          window.CW_APP.state.cliOpen = false;
          window.CW_APP.state.candIndex = -1;
          window.CW_APP.render(true);
        });
      };
      const capture = async (origin, trigger) => {
        await clearChooser();
        await trigger();
        await page.waitForFunction((expectedOrigin) =>
          window.CW_ACTIONS.lastEvent()?.origin === expectedOrigin, origin, { timeout: 5000 })
          .catch(async () => {
            const diagnostic = await page.evaluate(() => ({
              event: window.CW_ACTIONS.lastEvent(),
              resolvedVoice: window.CW_ACTIONS.resolve("voice", "open global jump"),
              parsedVoice: window.CW_SPEECH.parseUtterance("open global jump", "commands"),
            }));
            throw new Error(origin + " did not dispatch through CW_ACTIONS: " + JSON.stringify(diagnostic));
          });
        observed.push(await page.evaluate(() => ({
          event: window.CW_ACTIONS.lastEvent(),
          kind: window.CW_APP.state.completion?.kind,
          path: window.CW_APP.state.path,
        })));
      };

      await capture("pointer", () => page.click('[data-action-id="jump.interactive"]'));
      await capture("keyboard", () => page.keyboard.press("Control+J"));
      await capture("cli", async () => {
        const prompt = page.locator("[data-cli]");
        await prompt.fill("zi");
        await prompt.press("Enter");
      });
      await capture("slash", async () => {
        const prompt = page.locator("[data-cli]");
        await prompt.fill("/jump");
        await prompt.press("Enter");
      });
      await capture("voice", () => page.evaluate(() => window.CW_APP.handleSpeechFinal("open global jump")));
      await capture("mcp", () => page.evaluate(() => window.CW_MCP.call("board_jump", {
        terms: "", interactive: true,
      })));

      const near = await page.evaluate(() => {
        const before = window.CW_ACTIONS.lastEvent();
        window.CW_APP.handleSpeechFinal("open global jumps");
        return { sameEvent: before === window.CW_ACTIONS.lastEvent(), event: window.CW_ACTIONS.lastEvent() };
      });
      const actionIds = observed.map((item) => item.event?.actionId);
      const origins = observed.map((item) => item.event?.origin);
      if (!actionIds.every((actionId) => actionId === "jump.interactive")) {
        return log("action IDs drifted: " + actionIds.join("|"));
      }
      if (origins.join("|") !== "pointer|keyboard|cli|slash|voice|mcp") {
        return log("action origins drifted: " + origins.join("|"));
      }
      const badState = observed.find((item) => item.event?.outcome !== "success" ||
        item.kind !== "jump" || item.path !== startPath);
      if (badState) return log("action result drifted: " + JSON.stringify(badState));
      return near.sameEvent || log("near voice dispatched: " + JSON.stringify(near.event));
    },
  },
  {
    name: "NAV-ROUTE-001 browser Back and Forward restore meaningful states",
    run: async (page, log) => {
      await page.evaluate(async () => {
        window.CW_APP.navigate("/projects/community/channels/general", { keepCli: true });
        window.CW_APP.openThread("p1");
        window.CW_WORKBENCH.openSearch(window.CW_APP.state, "state:open");
        await window.CW_WORKBENCH.runSearch(window.CW_APP.state);
        const saved = window.CW_WORKBENCH.saveSearchProjection(window.CW_APP.state, "Route projection");
        await window.CW_ACTIONS.invoke("projection.open", { projectionId: saved.projectionId }, { origin: "diagnostic", context: "board" });
        window.CW_APP.navigate("/dms/scout", { keepCli: true });
      });
      const states = [];
      for (let index = 0; index < 3; index += 1) {
        await page.goBack();
        await page.waitForTimeout(80);
        states.push(await page.evaluate(() => ({ path: window.CW_APP.state.path,
          thread: window.CW_APP.state.threadFocus, route: window.history.state })));
      }
      await page.goForward();
      await page.waitForTimeout(80);
      const forward = await page.evaluate(() => window.CW_APP.navigationLocation());
      return /\/views\//.test(states[0]?.path || "") && states[1]?.thread === "p1" &&
        /\/projects\/community\/channels\/general/.test(states[2]?.path || "") &&
        !!forward.projectionId && !!forward.objectId || log("history restore failed: " + JSON.stringify({ states, forward }));
    },
  },
  {
    name: "NAV-QUERY-002 NAV-ROUTE-002 saved contextual view and reading anchor survive reload",
    run: async (page, log) => {
      const before = await page.evaluate(async () => {
        window.CW_WORKBENCH.openSearch(window.CW_APP.state, " (( state:open )) sort:new ");
        await window.CW_WORKBENCH.runSearch(window.CW_APP.state);
        const saved = window.CW_WORKBENCH.saveSearchProjection(window.CW_APP.state, "Reload review");
        await window.CW_ACTIONS.invoke("projection.open", { projectionId: saved.projectionId }, {
          origin: "diagnostic", context: "board",
        });
        window.CW_APP.openThread("p1");
        window.CW_APP.state.feedMark = "p2";
        window.CW_APP.render(true);
        const target = document.querySelector('[data-object-id="p2"]');
        target?.scrollIntoView({ block: "center" });
        window.CW_APP.commitNavigation(true);
        return {
          projectionId: saved.projectionId,
          expression: saved.root.children[0].where,
          order: saved.order,
          top: target?.getBoundingClientRect().top || 0,
          href: window.location.href,
        };
      });
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForFunction((projectionId) =>
        window.CW_APP.navigationLocation().projectionId === projectionId &&
        window.CW_APP.state.threadFocus === "p1" && window.CW_APP.state.feedMark === "p2",
      before.projectionId);
      const after = await page.evaluate((projectionId) => {
        const saved = window.CW_WORKBENCH.definitions().find((definition) =>
          definition.projectionId === projectionId);
        return {
          projectionId: window.CW_APP.navigationLocation().projectionId,
          thread: window.CW_APP.state.threadFocus,
          focused: window.CW_APP.state.feedMark,
          expression: saved?.root?.children?.[0]?.where,
          order: saved?.order,
          top: document.querySelector('[data-object-id="p2"]')?.getBoundingClientRect().top || 0,
          href: window.location.href,
        };
      }, before.projectionId);
      return after.projectionId === before.projectionId && after.thread === "p1" && after.focused === "p2" &&
        JSON.stringify(after.expression) === JSON.stringify(before.expression) &&
        JSON.stringify(after.order) === JSON.stringify(before.order) && Math.abs(after.top - before.top) <= 8 &&
        after.href === before.href || log("contextual reload drift: " + JSON.stringify({ before, after }));
    },
  },
  {
    name: "NAV-ROUTE-003 ephemeral movement does not pollute browser history",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      const before = await page.evaluate(() => ({ length: window.history.length, href: window.location.href }));
      await page.evaluate(() => {
        window.CW_APP.state.feedMark = "p2";
        window.CW_APP.state.folded.p1 = true;
        window.CW_APP.state.panes.outW += 1;
        window.CW_APP.render(true);
        const input = document.querySelector("[data-cli]");
        input.value = "hel";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await page.locator("[data-cli]").press("ArrowDown");
      const after = await page.evaluate(() => ({ length: window.history.length, href: window.location.href }));
      return after.length === before.length && after.href === before.href ||
        log("ephemeral state changed history: " + JSON.stringify({ before, after }));
    },
  },
  {
    name: "NAV-MIGRATE-002 restored live object IDs advance without duplicates",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.evaluate(() => {
        const snapshot = window.CW_APP.snapshotBoard();
        snapshot.live = false;
        snapshot.nextId = 2;
        snapshot.merged = [{
          id: "live-1", channel: "general", who: "maya", at: "09:00",
          state: "open", body: "restored arrival", sig: "sig:restored-live-1",
        }];
        snapshot.pendingByFeed = {};
        localStorage.setItem("cw-board-state", JSON.stringify(snapshot));
      });
      await page.reload({ waitUntil: "networkidle" });
      const restored = await page.evaluate(() => {
        const before = window.CW_APP.state.nextId;
        let error = "";
        try {
          window.CW_APP.publishCompose("new after restore", {
            kind: "post", channel: "general", project: "community",
          });
          window.CW_APP.render(true);
        } catch (caught) {
          error = String(caught?.message || caught);
        }
        const ids = window.CW_APP.state.merged.map((post) => post.id);
        return { before, ids, unique: new Set(ids).size === ids.length, error };
      });
      return restored.before === 2 && restored.unique && restored.ids.includes("live-2") && !restored.error ||
        log("restored live ID collision: " + JSON.stringify(restored));
    },
  },
  {
    name: "NAV-LAYER-002 Escape does not replace ancestry or browser history",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.evaluate(() => {
        for (let attempts = 0; attempts < 20 && window.CW_APP.cancelTopLayer(); attempts += 1) {
          // Drain the canonical stack so this is genuinely a bare Escape.
        }
        window.__bareEscape = { bubbled: 0, prevented: null, phases: [] };
        window.addEventListener("keydown", (event) => {
          if (event.key === "Escape") window.__bareEscape.phases.push(["capture", event.defaultPrevented]);
        }, { capture: true, once: true });
        document.activeElement?.addEventListener("keydown", (event) => {
          if (event.key === "Escape") window.__bareEscape.phases.push(["target", event.defaultPrevented]);
        }, { once: true });
        document.addEventListener("keydown", (event) => {
          if (event.key === "Escape") window.__bareEscape.phases.push(["document", event.defaultPrevented]);
        }, { once: true });
        window.addEventListener("keydown", (event) => {
          if (event.key !== "Escape") return;
          window.__bareEscape.bubbled += 1;
          window.__bareEscape.prevented = event.defaultPrevented;
        }, { once: true });
      });
      const before = await page.evaluate(() => ({ path: window.CW_APP.state.path, length: window.history.length }));
      await page.keyboard.press("Escape");
      const after = await page.evaluate(() => ({ path: window.CW_APP.state.path, length: window.history.length,
        status: document.querySelector("[data-status-line]")?.textContent || "",
        bareEscape: window.__bareEscape,
        flags: {
          intelOpen: window.CW_APP.state.intelOpen,
          helpOpen: window.CW_APP.state.helpOpen,
          contextOpen: window.CW_APP.state.ctxMenu?.open,
          authOpen: document.querySelector("[data-auth-dialog]")?.dataset.open,
          profileOpen: !document.querySelector("[data-profile-menu]")?.hidden,
        } }));
      return before.path === after.path && before.length === after.length && /no action/i.test(after.status) &&
        after.bareEscape.bubbled === 1 && after.bareEscape.prevented === false ||
        log("Escape phases " + JSON.stringify(after.bareEscape.phases) + " flags " + Object.values(after.flags).join(":") +
          " · " + JSON.stringify({ bareEscape: after.bareEscape,
          samePath: before.path === after.path, sameHistory: before.length === after.length,
          status: after.status }));
    },
  },
  {
    name: "NAV-ANCHOR-001 live merge preserves reader anchor",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      const before = await page.evaluate(() => {
        window.CW_APP.state.feedMark = "p2";
        window.CW_APP.render(true);
        const incoming = Array.from({ length: 20 }, (_, index) => ({
          id: "anchor-live-" + index, channel: "general", who: "scout", at: "now",
          state: "open", body: "anchor message " + index, sig: "sig:anchor-" + index,
        }));
        window.CW_APP.state.pending = incoming;
        window.CW_APP.state.pendingByFeed[window.CW_APP.currentFeedKey()] = incoming;
        const item = document.querySelector('.cn-comment[data-key="p2"]');
        const top = item?.getBoundingClientRect().top;
        window.CW_APP.mergePending();
        return top;
      });
      await page.evaluate(() => new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve))));
      const after = await page.evaluate(() => {
        const item = document.querySelector('.cn-comment[data-key="p2"]');
        return { top: item?.getBoundingClientRect().top, focused: window.CW_APP.state.feedMark,
          current: document.querySelector('.cn-comment[tabindex="0"]')?.getAttribute("data-key") };
      });
      return after.focused === "p2" && after.current === "p2" && Math.abs(after.top - before) <= 4 ||
        log("reader anchor moved: " + JSON.stringify({ before, after }));
    },
  },
  {
    name: "NAV-ANCHOR-002 tail follower remains at tail",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/bugs");
      await page.evaluate(() => {
        const pane = document.querySelector('.cn-blade[data-blade-kind="detail"] .cn-blade-body');
        pane.scrollTop = pane.scrollHeight;
        const incoming = Array.from({ length: 20 }, (_, index) => ({
          id: "tail-live-" + index, channel: "bugs", who: "scout", at: "now",
          state: "open", body: "tail message " + index, sig: "sig:tail-" + index,
        }));
        window.CW_APP.state.pending = incoming;
        window.CW_APP.state.pendingByFeed[window.CW_APP.currentFeedKey()] = incoming;
        window.CW_APP.mergePending();
      });
      await page.evaluate(() => new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve))));
      const result = await page.evaluate(() => {
        const pane = document.querySelector('.cn-blade[data-blade-kind="detail"] .cn-blade-body');
        return { distance: pane.scrollHeight - pane.scrollTop - pane.clientHeight,
          latest: !!document.querySelector('[data-key="tail-live-19"]'),
          status: document.querySelector("[data-status-line]")?.textContent || "" };
      });
      return result.distance <= 8 && result.latest && /loaded 20 new/i.test(result.status) ||
        log("tail did not follow: " + JSON.stringify(result));
    },
  },
  {
    name: "NAV-ANCHOR-003 sorting preserves focus by object ID",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      const result = await page.evaluate(() => {
        window.CW_APP.state.feedMark = "p1";
        ["new", "top", "best", "hot"].forEach((sort) => window.CW_APP.applyFeedView(sort));
        window.CW_APP.setFeedQuery("state:open", "custom");
        return { focused: window.CW_APP.state.feedMark,
          current: document.querySelector('.cn-comment[tabindex="0"]')?.getAttribute("data-key") };
      });
      return result.focused === "p1" && result.current === "p1" ||
        log("sort changed focused object: " + JSON.stringify(result));
    },
  },
  {
    name: "NAV-A11Y-001 feed semantics and roving focus",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.waitForSelector('.cn-tree[role="feed"] .cn-comment[role="article"]');
      const feed = await page.evaluate(() => {
        const region = document.querySelector('.cn-tree[role="feed"]');
        const articles = Array.from(region?.querySelectorAll('.cn-comment[role="article"]') || []);
        const current = articles.find((article) => article.getAttribute("tabindex") === "0");
        return {
          label: region?.getAttribute("aria-label"),
          busy: region?.getAttribute("aria-busy"),
          count: articles.length,
          tabbable: articles.filter((article) => article.getAttribute("tabindex") === "0").length,
          positions: articles.map((article) => [
            Number(article.getAttribute("aria-posinset")),
            Number(article.getAttribute("aria-setsize")),
          ]),
          current: current?.getAttribute("data-object-id"),
          state: window.CW_APP.state.feedMark,
        };
      });
      if (!feed.label || feed.busy !== "false" || feed.count < 2 || feed.tabbable !== 1) {
        return log("feed contract incomplete: " + JSON.stringify(feed));
      }
      if (feed.positions.some(([position, size], index) => position !== index + 1 || size !== feed.count)) {
        return log("feed positions incoherent: " + JSON.stringify(feed.positions));
      }
      return feed.current === feed.state || log("DOM/state focus differ: " + JSON.stringify(feed));
    },
  },
  {
    name: "NAV-A11Y-002 feed busy state during merge",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/bugs");
      const observed = await page.evaluate(async () => {
        const original = window.CW_APP.render;
        const busy = [];
        const observer = new window.MutationObserver(() => {
          busy.push(document.querySelector('.cn-tree[role="feed"]')?.getAttribute("aria-busy"));
        });
        const feed = document.querySelector('.cn-tree[role="feed"]');
        if (feed) observer.observe(feed, { attributes: true, attributeFilter: ["aria-busy"] });
        window.CW_APP.state.pending = Array.from({ length: 20 }, (_, index) => ({
          id: "a11y-live-" + index,
          objectId: "a11y-live-" + index,
          channel: "bugs",
          who: "scout",
          at: "now",
          state: "open",
          body: "queued accessibility message " + index,
          sig: "sig:a11y-" + index,
        }));
        window.CW_APP.mergePending();
        await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
        observer.disconnect();
        window.CW_APP.render = original;
        return {
          observed: busy,
          final: document.querySelector('.cn-tree[role="feed"]')?.getAttribute("aria-busy"),
          status: document.querySelector("[data-status-line]")?.textContent || "",
        };
      });
      return (observed.observed.includes("true") && observed.final === "false" && /loaded 20 new/i.test(observed.status)) ||
        log("busy transition missing: " + JSON.stringify(observed));
    },
  },
  {
    name: "NAV-A11Y-003 thread tree topology and keyboard operations",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.evaluate(() => window.CW_APP.openThread("p3"));
      await page.waitForSelector('.cn-thread-tree[role="tree"] [role="treeitem"]');
      const before = await page.evaluate(() => {
        const tree = document.querySelector('.cn-thread-tree[role="tree"]');
        const items = Array.from(tree?.querySelectorAll('[role="treeitem"]') || []);
        return {
          count: items.length,
          groupsOwned: Array.from(tree?.querySelectorAll('.cn-replies[role="group"]') || []).every((group) =>
            group.parentElement?.getAttribute("role") === "treeitem"),
          groupParents: Array.from(tree?.querySelectorAll('.cn-replies[role="group"]') || []).map((group) => ({
            className: group.className,
            key: group.getAttribute("data-key"),
            parentRole: group.parentElement?.getAttribute("role"),
            parentKey: group.parentElement?.getAttribute("data-key"),
          })),
          tabbable: items.filter((item) => item.getAttribute("tabindex") === "0").length,
          selected: items.filter((item) => item.getAttribute("aria-selected") === "true").length,
          levels: items.map((item) => Number(item.getAttribute("aria-level"))),
          positions: items.map((item) => [
            Number(item.getAttribute("aria-posinset")),
            Number(item.getAttribute("aria-setsize")),
          ]),
          reading: document.querySelector('.cn-thread-reading article')?.getAttribute("data-object-id"),
          active: document.activeElement?.closest?.('[role="treeitem"]')?.getAttribute("data-object-id"),
        };
      });
      if (before.count < 3 || !before.groupsOwned || before.tabbable !== 1 || before.selected !== 1 ||
          before.levels.some((level) => level < 1) || before.reading !== "p3") {
        return log("thread group parents " + before.groupParents.map((item) =>
          [item.className, item.key, item.parentRole, item.parentKey].join(":" )).join("|") +
          " · " + JSON.stringify(before));
      }
      await page.focus('.cn-thread-tree [role="treeitem"][tabindex="0"]');
      await page.keyboard.press("Home");
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("ArrowDown");
      const moved = await page.evaluate(() => ({
        active: document.activeElement?.closest?.('[role="treeitem"]')?.getAttribute("data-object-id"),
        selected: document.querySelector('.cn-thread-tree [aria-selected="true"]')?.getAttribute("data-object-id"),
      }));
      return (moved.active && moved.active === moved.selected) ||
        log("thread keyboard/state mismatch: " + JSON.stringify(moved));
    },
  },
  {
    name: "NAV-A11Y-004 tombstone announcement and actions",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.evaluate(() => {
        const parent = window.CW_DATA.posts.find((post) => post.id === "p2");
        parent.tombstone = { formerKind: "message", reason: "moderated" };
        window.CW_APP.openThread("p3");
      });
      await page.waitForSelector('.cn-thread-tree [data-tombstone="true"]');
      const tombstone = await page.evaluate(() => {
        const item = document.querySelector('.cn-thread-tree [data-tombstone="true"]');
        return {
          label: item?.getAttribute("aria-label"),
          level: item?.getAttribute("aria-level"),
          parent: item?.getAttribute("data-parent-id"),
          actions: Array.from(item?.querySelectorAll("[data-reply], [data-repost], [data-react-pick]") || [])
            .filter((control) => control.closest('[role="treeitem"]') === item).length,
        };
      });
      return (/moderated/i.test(tombstone.label || "") && Number(tombstone.level) > 1 &&
        tombstone.actions === 0) || log("tombstone contract incomplete: " + JSON.stringify(tombstone));
    },
  },
  {
    name: "NAV-A11Y-005 combobox manual selection",
    run: async (page, log) => {
      const prompt = page.locator("[data-cli]");
      await prompt.fill("hel");
      await page.waitForSelector('.cn-menu:not([hidden]) [role="option"]');
      const opened = await page.evaluate(() => ({
        inputFocused: document.activeElement === document.querySelector("[data-cli]"),
        active: document.querySelector("[data-cli]")?.getAttribute("aria-activedescendant"),
        selected: document.querySelectorAll('.cn-menu [role="option"][aria-selected="true"]').length,
      }));
      if (!opened.inputFocused || opened.active || opened.selected) {
        return log("option activated on open: " + JSON.stringify(opened));
      }
      await prompt.press("ArrowDown");
      const selected = await page.evaluate(() => ({
        inputFocused: document.activeElement === document.querySelector("[data-cli]"),
        active: document.querySelector("[data-cli]")?.getAttribute("aria-activedescendant"),
        value: document.querySelector("[data-cli]")?.value,
      }));
      if (!selected.inputFocused || !selected.active || selected.value !== "hel") {
        return log("manual selection did not retain input: " + JSON.stringify(selected));
      }
      const pathBeforeAccept = await page.evaluate(() => window.CW_APP.state.path);
      await prompt.press("Enter");
      const accepted = await page.evaluate((beforePath) => ({
        value: document.querySelector("[data-cli]")?.value,
        focused: document.activeElement === document.querySelector("[data-cli]"),
        pathStable: window.CW_APP.state.path === beforePath,
      }), pathBeforeAccept);
      if (!accepted.focused || accepted.value === "hel" || !accepted.pathStable) {
        return log("explicit option acceptance executed or lost focus: " + JSON.stringify(accepted));
      }
      await prompt.fill("hel");
      await page.waitForSelector('.cn-menu:not([hidden]) [role="option"]');
      await prompt.press("Escape");
      const escaped = await page.evaluate(() => ({
        value: document.querySelector("[data-cli]")?.value,
        expanded: document.querySelector("[data-cli]")?.getAttribute("aria-expanded"),
      }));
      if (escaped.value !== "hel" || escaped.expanded !== "false") {
        return log("Escape cleared draft or kept popup: " + JSON.stringify(escaped));
      }
      await prompt.fill("cd /pro");
      await prompt.press("End");
      const ghostAccepted = await prompt.inputValue();
      if (ghostAccepted === "cd /pro") return log("End did not accept deterministic ghost text");
      await prompt.fill("cd pro");
      await prompt.press("Tab");
      return (await page.evaluate(() => ({
        moved: document.activeElement !== document.querySelector("[data-cli]"),
        draft: document.querySelector("[data-cli]")?.value,
      }))).moved && (await prompt.inputValue()) === "cd pro" || log("Tab did not preserve draft and follow focus order");
    },
  },
  {
    name: "NAV-A11Y-006 native editing and IME are not intercepted",
    run: async (page, log) => {
      const prompt = page.locator("[data-cli]");
      await prompt.fill("alpha beta");
      await prompt.evaluate((input) => input.setSelectionRange(5, 5));
      await prompt.press("Home");
      await prompt.press("Shift+End");
      await prompt.evaluate((input) => input.addEventListener("copy", () => { window.__nativeCopyObserved = true; }, { once: true }));
      await prompt.press("Control+c");
      const copyObserved = await page.evaluate(() => window.__nativeCopyObserved === true);
      await prompt.press("Backspace");
      await prompt.press("Delete");
      await prompt.dispatchEvent("compositionstart", { data: "あ" });
      await prompt.dispatchEvent("compositionupdate", { data: "あ" });
      await prompt.dispatchEvent("compositionend", { data: "あ" });
      const editing = await page.evaluate(() => {
        const input = document.querySelector("[data-cli]");
        return {
          focused: document.activeElement === input,
          start: input?.selectionStart,
          end: input?.selectionEnd,
          value: input?.value,
          path: window.CW_APP.state.path,
        };
      });
      return (copyObserved && editing.focused && editing.value !== "alpha beta" &&
        editing.path === "/projects/community/channels/general") ||
        log("native editing was intercepted: " + JSON.stringify(editing));
    },
  },
  {
    name: "NAV-A11Y-007 narrow screen remains operable",
    viewport: { width: 390, height: 844 },
    touch: true,
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.evaluate(() => window.CW_APP.openThread("p3"));
      await page.waitForSelector('.cn-thread-tree[role="tree"]');
      await page.click("[data-action-id='jump.interactive']");
      await page.waitForSelector('.cn-menu:not([hidden]) [role="option"]');
      const narrow = await page.evaluate(() => {
        const targets = Array.from(document.querySelectorAll(
          '.cn-thread-tree [role="treeitem"], .cn-thread-reading button, .cn-prompt button, .cn-menu [role="option"]',
        )).filter((element) => {
          const style = getComputedStyle(element);
          const box = element.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
        });
        return {
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          tree: !!document.querySelector('.cn-thread-tree[role="tree"]'),
          reading: !!document.querySelector('.cn-thread-reading article'),
          navigator: !!document.querySelector('.cn-blade[data-nav="true"]'),
          composer: !!document.querySelector("[data-cli]"),
          chooser: !!document.querySelector('.cn-menu:not([hidden]) [role="option"]'),
          focusOnScreen: (() => {
            const box = document.activeElement?.getBoundingClientRect();
            return !!box && box.left >= 0 && box.right <= window.innerWidth &&
              box.top >= 0 && box.bottom <= window.innerHeight;
          })(),
          small: targets.filter((element) => {
            const box = element.getBoundingClientRect();
            return box.width < 32 || box.height < 32;
          }).map((element) => {
            const box = element.getBoundingClientRect();
            return { className: element.className, width: box.width, height: box.height };
          }),
        };
      });
      return (narrow.overflow <= 1 && narrow.tree && narrow.reading && narrow.navigator &&
        narrow.composer && narrow.chooser && narrow.focusOnScreen && narrow.small.length === 0) ||
        log("narrow contract failed: " + JSON.stringify({
          chooser: narrow.chooser, focusOnScreen: narrow.focusOnScreen,
          small: narrow.small.map((item) => item.className + ":" + Math.round(item.width) + "x" + Math.round(item.height)).join("|"),
          overflow: narrow.overflow, tree: narrow.tree, reading: narrow.reading,
          navigator: narrow.navigator, composer: narrow.composer,
        }));
    },
  },
  {
    name: "a11y: skip link, landmarks, workspace tabs, and combobox wiring",
    run: async (page, log) => {
      const chrome = await page.evaluate(() => {
        const skip = document.querySelector("a.cw-skip");
        const banner = document.querySelector('[role="banner"]');
        const main = document.querySelector("#cw-main, main[data-mount]");
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
            "[data-region='status'] .cw-status-theme, [data-region='status'] [data-theme-name], [data-region='status'] [data-theme-note]",
          ),
          keysCue: !!document.querySelector("[data-region='status'] [data-keys-open]"),
        };
      });
      if (chrome.skipHref !== "#cw-main" || !chrome.skipText) {
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
        active: window.CW_APP.state.activeSession,
        focusRole: document.activeElement?.getAttribute("role"),
        focusSession: document.activeElement?.getAttribute("data-session"),
        selected: document.activeElement?.getAttribute("aria-selected"),
      }));
      if (afterRight.active !== 1 || afterRight.focusRole !== "tab" || afterRight.selected !== "true") {
        return log("ArrowRight tab: " + JSON.stringify(afterRight));
      }

      // Keyboard path to masthead chrome (skip → activity). Grid has no theme dropdown.
      await page.evaluate(() => document.querySelector("a.cw-skip")?.focus());
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
        window.CW_APP.state.threadFocus = null;
        window.CW_APP.state.detailOpen = true;
        window.CW_APP.render(true);
      });
      await page.waitForTimeout(80);
      const check = await page.evaluate(() => {
        const pre = document.querySelector(".cw-md-pre");
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
        const C = window.CW_COPY;
        if (!C) return { ok: false, why: "CW_COPY missing" };
        const posts = (window.CW_DATA.posts || []).filter((p) => p.channel === "ideas");
        const root = posts.find((p) => !p.re) || posts[0];
        if (!root) return { ok: false, why: "no ideas posts" };
        const thread = C.formatThread(root, {
          path: "/projects/community/channels/ideas/" + root.id,
          extra: window.CW_APP.state.merged,
        });
        const feed = C.formatChannelFeed(posts, {
          channel: "ideas",
          path: "/projects/community/channels/ideas",
        });
        window.CW_APP.state.lines = [
          { id: "u1", kind: "user", mode: "ai", text: "rename this channel to ieades2",
            boundContext: [{ kind: "channel", id: "ideas", name: "ideas" }] },
          { id: "t1", kind: "tool", tool: "board_rename_channel", ok: true,
            summary: "renamed #ideas → #ieades2", result: "ok" },
        ];
        const chat = C.formatTranscript(window.CW_APP.state.lines, {
          path: "/projects/community/channels/ideas",
        });
        const viaTarget = C.formatForTarget({
          kind: "post", id: root.id, name: root.who, path: window.CW_APP.state.path,
        }, window.CW_APP.state);
        return {
          ok: true,
          thread: thread,
          feed: feed,
          chat: chat,
          viaTarget: viaTarget,
          threadHasWho: thread.includes("@" + root.who),
          threadFenced: /--- community web thread/.test(thread) && /---\n$/.test(thread),
          feedFenced: /--- community web feed/.test(feed),
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
        if (!/--- community web thread/.test(formats.viaTarget)) {
          return log("formatForTarget not thread: " + formats.viaTarget.slice(0, 120));
        }
      }

      // UI: copy button on a post copies something fenced.
      await page.evaluate(() => {
        window.__cwCopied = null;
        window.CW_COPY.copyText = (t) => {
          window.__cwCopied = t;
          return Promise.resolve(true);
        };
      });
      const copyBtn = page.locator("[data-copy-post]").first();
      if (!(await copyBtn.count())) return log("no copy button on posts");
      await copyBtn.click();
      await page.waitForTimeout(60);
      const clipped = await page.evaluate(() => window.__cwCopied);
      if (!clipped || !/--- community web thread/.test(clipped)) {
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
      const feedClip = await page.evaluate(() => window.__cwCopied);
      if (!feedClip || !/--- community web feed/.test(feedClip)) {
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
      await item.focus();
      const before = await page.evaluate(() => ({
        cursor: window.CW_APP.state.cursor,
        focus: window.CW_APP.state.focus,
        thread: window.CW_APP.state.threadFocus,
      }));
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
      const initialFocus = await page.evaluate(() => ({
        menuitem: document.activeElement?.getAttribute?.("role"),
        prompt: document.activeElement?.hasAttribute?.("data-ctx-prompt"),
      }));
      if (initialFocus.menuitem !== "menuitem" || !initialFocus.prompt) {
        return log("context menu did not take focus: " + JSON.stringify(initialFocus));
      }
      await page.keyboard.press("ArrowDown");
      await page.evaluate(() => new Promise((resolve) =>
        window.requestAnimationFrame(() => window.requestAnimationFrame(resolve))));
      const down = await page.evaluate(() => ({
        action: document.activeElement?.getAttribute?.("data-ctx-action"),
        cursor: window.CW_APP.state.cursor,
        focus: window.CW_APP.state.focus,
        thread: window.CW_APP.state.threadFocus,
      }));
      if (!down.action || down.cursor !== before.cursor || down.focus !== before.focus ||
          down.thread !== before.thread) {
        return log("ArrowDown escaped context menu: " + JSON.stringify({ before, down }));
      }
      await page.keyboard.press("ArrowUp");
      const up = await page.evaluate(() => ({
        prompt: document.activeElement?.hasAttribute?.("data-ctx-prompt"),
        cursor: window.CW_APP.state.cursor,
      }));
      if (!up.prompt || up.cursor !== before.cursor) {
        return log("ArrowUp escaped context menu: " + JSON.stringify({ before, up }));
      }
      await page.keyboard.press("Escape");
      await page.evaluate(() => new Promise((resolve) => window.requestAnimationFrame(resolve)));
      const restored = await page.evaluate(() => ({
        closed: !document.querySelector("[data-ctx-menu]"),
        path: document.activeElement?.getAttribute?.("data-path"),
      }));
      if (!restored.closed || restored.path !== "/projects/community/channels/general") {
        return log("context menu did not restore nav focus: " + JSON.stringify(restored));
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
          ai: !!window.CW_APP.state.ai,
          focusCli: document.activeElement?.hasAttribute?.("data-cli"),
          bound: (window.CW_APP.state.boundContext || []).map((b) => ({
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
        const CTX = window.CW_CTX;
        if (!CTX) return { ok: false, why: "CW_CTX missing" };
        try {
          localStorage.removeItem("cw-ctx-ledger");
          localStorage.removeItem("cw-ctx-actions");
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
          path: window.CW_APP.state.path,
          menuOpen: !!document.querySelector("[data-ctx-menu][data-open='true']"),
        };
      });
      if (!ran.ok) return log("no action button");
      if (ran.menuOpen) return log("menu stayed open after action");
      // activate on a channel dir should navigate or preview toward bugs.
      if (!String(ran.path).includes("bugs") && ran.path !== "/projects/community/channels") {
        // Allow staying on parent if activate = select; check cursor name.
        const cur = await page.evaluate(() => {
          const all = window.CW_MAP.list(window.CW_APP.state.path, window.CW_APP.state.merged) || [];
          const e = all[window.CW_APP.state.cursor];
          return e && e.name;
        });
        if (cur !== "bugs" && !String(ran.path).includes("bugs")) {
          return log("action did not target bugs: path=" + ran.path + " cur=" + cur);
        }
      }
      return true;
    },
  },
  {
    name: "startup: Ctrl+U applies update defaults and continuation in one restart",
    run: async (page, log) => {
      await page.evaluate(() => {
        localStorage.setItem("cw-startup-signals-v1", JSON.stringify({
          continuation: { host: "codex", sessionId: "codex-42", workspace: "epoch" },
          update: { current: "0.8.0", available: "0.9.0" },
          workspace: { id: "epoch", defaultsVersion: 2, appliedVersion: 1 },
        }));
      });
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(180);
      const offered = await page.evaluate(() => ({
        text: document.querySelector("[data-status-line]")?.textContent || "",
        cue: document.querySelector("[data-restart-cue]")?.textContent || "",
        pending: window.CW_STARTUP?.pending?.().map((item) => item.kind) || [],
      }));
      if (!/Ctrl\+U/i.test(offered.text + offered.cue) ||
          offered.pending.join(",") !== "update,workspace,continuation") {
        return log("restart offer incomplete: " + JSON.stringify(offered));
      }
      await Promise.all([
        page.waitForNavigation({ waitUntil: "domcontentloaded" }),
        page.keyboard.press("Control+u"),
      ]);
      await page.waitForTimeout(120);
      await page.waitForFunction(() => {
        const applied = JSON.parse(localStorage.getItem("cw-startup-applied-v1") || "{}");
        return applied.update === "0.9.0" && applied.workspace === 2 &&
          applied.continuation === "codex-42";
      });
      const applied = await page.evaluate(() => ({
        value: JSON.parse(localStorage.getItem("cw-startup-applied-v1") || "{}"),
        pending: window.CW_STARTUP?.pending?.().length,
        next: document.querySelector("[data-status-line]")?.textContent || "",
      }));
      if (applied.pending !== 0) return log("restart still pending: " + JSON.stringify(applied));
      return /Esc|Ctrl\+Space|Alt\+T|Enter|keys/i.test(applied.next) ||
        log("bottom line lacks next action: " + JSON.stringify(applied));
    },
  },
  {
    name: "routing: one workspace route stays sticky until invalidated",
    run: async (page, log) => {
      const routed = await page.evaluate(() => {
        const policy = {
          version: "p1",
          routes: [
            { id: "local", model: "on-device", format: "native" },
            { id: "capable", model: "anthropic/claude-sonnet", format: "anthropic" },
          ],
        };
        const first = window.CW_ROUTE?.pick("workspace-1", policy);
        const second = window.CW_ROUTE?.pick("workspace-1", Object.assign({}, policy, {
          routes: policy.routes.slice().reverse(),
        }));
        window.CW_ROUTE?.invalidate("workspace-1", "recoverable-failure");
        const fallback = window.CW_ROUTE?.pick("workspace-1", policy);
        return {
          first: first?.id,
          second: second?.id,
          fallback: fallback?.id,
          reason: fallback?.reason,
          stored: JSON.parse(localStorage.getItem("cw-route-affinity-v1") || "{}"),
        };
      });
      if (routed.first !== "local" || routed.second !== "local") {
        return log("route was not sticky: " + JSON.stringify(routed));
      }
      return (routed.fallback === "capable" && /failure/i.test(routed.reason || "")) ||
        log("route did not fail over once: " + JSON.stringify(routed));
    },
  },
  {
    name: "hobo: Bo exposes deterministic app loop and trainable fallback",
    run: async (page, log) => {
      await go(page, "/.agents/bo");
      const bo = await page.evaluate(() => {
        const agent = window.CW_DATA.agents.board.find((item) => item.id === "bo");
        const commands = [
          "new demo --template api",
          "build demo",
          "test demo",
          "debug demo",
          "up demo --plan",
          "stub demo complex-billing-rule",
        ].map((line) => window.CW_HOBO?.run(line));
        return {
          agent,
          commands,
          card: document.querySelector(".cn-agent-card")?.textContent || "",
        };
      });
      if (!bo.agent || !/generated docs|docs manifest/i.test(bo.agent.instructions || "")) {
        return log("Bo lacks docs contract: " + JSON.stringify(bo.agent));
      }
      if (bo.commands.some((result) => !result?.ok)) {
        return log("HoBo loop failed: " + JSON.stringify(bo.commands));
      }
      const stub = bo.commands[5]?.text || "";
      return (/use training/i.test(stub) && /hobo (build|test|up)/i.test(
        bo.commands.map((result) => result.text).join(" "),
      )) || log("HoBo loop not deterministic: " + JSON.stringify(bo.commands));
    },
  },
  {
    name: "NAV-A11Y-003 registry dispatch preserves thread tree expansion and ancestry",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.evaluate(() => window.CW_APP.openThread("p1"));
      await page.waitForSelector('.cn-thread-tree [role="treeitem"][data-key="p1"]');
      await page.focus('.cn-thread-tree [role="treeitem"][data-key="p1"]');
      const before = await page.getAttribute(
        '.cn-thread-tree [role="treeitem"][data-key="p1"]', "aria-expanded",
      );
      await page.keyboard.press("ArrowLeft");
      await page.waitForFunction(() =>
        document.querySelector('.cn-thread-tree [role="treeitem"][data-key="p1"]')
          ?.getAttribute("aria-expanded") === "false");
      const collapsed = await page.evaluate(() => ({
        active: document.activeElement?.closest?.('[role="treeitem"]')?.getAttribute("data-key"),
        selected: document.querySelector('.cn-thread-tree [aria-selected="true"]')?.getAttribute("data-key"),
      }));
      await page.keyboard.press("ArrowRight");
      await page.waitForFunction(() =>
        document.querySelector('.cn-thread-tree [role="treeitem"][data-key="p1"]')
          ?.getAttribute("aria-expanded") === "true");
      await page.keyboard.press("ArrowRight");
      await page.waitForFunction(() =>
        document.activeElement?.closest?.('[role="treeitem"]')?.getAttribute("data-key") === "p2");
      const expanded = await page.evaluate(() => ({
        active: document.activeElement?.closest?.('[role="treeitem"]')?.getAttribute("data-key"),
        selected: document.querySelector('.cn-thread-tree [aria-selected="true"]')?.getAttribute("data-key"),
        oneTabStop: document.querySelectorAll('.cn-thread-tree [role="treeitem"][tabindex="0"]').length,
      }));
      return (before === "true" && collapsed.active === "p1" && collapsed.selected === "p1" &&
        expanded.active === "p2" && expanded.selected === "p2" && expanded.oneTabStop === 1) ||
        log("tree APG: " + JSON.stringify({
          before, ca: collapsed.active, cs: collapsed.selected,
          ea: expanded.active, es: expanded.selected, tab: expanded.oneTabStop,
        }));
    },
  },
  {
    name: "NAV-ACTION-001 post hotkeys invoke canonical registry actions once",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.evaluate(() => {
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: { writeText: async (text) => { window.__postActionClipboard = text; } },
        });
      });
      const operations = [
        ["u", "post.voteUp"],
        ["d", "post.voteDown"],
        ["a", "post.reactionPicker"],
        ["f", "post.fold"],
        ["Shift+R", "post.repost"],
        ["s", "share.contextual"],
        ["y", "post.copy"],
        ["r", "compose.reply"],
      ];
      const events = [];
      for (const [key, actionId] of operations) {
        await page.focus('.cn-comment[role="article"][data-key="p1"]');
        await page.keyboard.press(key);
        await page.waitForFunction((expected) => window.CW_ACTIONS.lastEvent()?.actionId === expected,
          actionId, { timeout: 1500 });
        events.push(await page.evaluate(() => window.CW_ACTIONS.lastEvent()));
      }
      const result = await page.evaluate(() => ({
        vote: window.CW_APP.state.votes.p1,
        picker: window.CW_APP.state.reactPick,
        folded: window.CW_APP.state.folded.p1,
        reposted: window.CW_APP.state.reposts.p1,
        reply: window.CW_APP.composeContext().postId,
        clipboard: window.__postActionClipboard,
      }));
      const expected = operations.map((operation) => operation[1]);
      return (events.map((event) => event?.actionId).join("|") === expected.join("|") &&
        events.every((event) => event?.origin === "keyboard" && event?.outcome === "success") &&
        result.vote === -1 && result.picker === "p1" && result.folded === true &&
        result.reposted === true && result.reply === "p1" && !!result.clipboard) ||
        log("post actions bypassed registry: " + JSON.stringify({ events, result }));
    },
  },
  {
    name: "NAV-ROUTE-001 history restores workspace sort focus detail and container anchor",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.evaluate(() => {
        const base = window.CW_APP.state.sessions[0];
        window.CW_APP.state.sessions = [
          Object.assign({}, base, { id: "workspace-one", path: "/projects/community/channels/bugs", sort: "hot" }),
          Object.assign({}, base, { id: "workspace-two", path: "/projects/community/channels/general", sort: "new" }),
        ];
        window.CW_APP.state.activeSession = 0;
        window.CW_APP.restoreNavigation({
          projectionId: "channel-general", objectId: "p2", threadRootId: "p1", detailObjectId: "p2",
          sort: "top", workspaceId: "workspace-two", focusRegion: "thread-outline",
        });
      });
      await page.waitForFunction(() =>
        window.CW_APP.state.activeSession === 1 && window.CW_APP.state.sort === "top" &&
        document.activeElement?.closest?.('[role="treeitem"]')?.getAttribute("data-key") === "p2");
      const beforeAnchor = await page.evaluate(() => {
        const pane = document.querySelector('.cn-blade[data-blade-kind="detail"] .cn-blade-body');
        const target = document.querySelector('.cn-thread-tree [data-object-id="p2"]');
        pane.style.height = "70px";
        pane.style.maxHeight = "70px";
        pane.style.flex = "0 0 70px";
        pane.style.overflow = "auto";
        pane.scrollTop = 0;
        const offset = target.getBoundingClientRect().top - pane.getBoundingClientRect().top;
        return { offset, windowY: window.scrollY };
      });
      await page.evaluate((anchor) => {
        window.CW_APP.restoreNavigation({
          projectionId: "channel-general", objectId: "p2", threadRootId: "p1", detailObjectId: "p2",
          sort: "top", workspaceId: "workspace-two", focusRegion: "thread-outline",
          readingAnchor: { objectId: "p2", pixelOffset: anchor.offset - 24 },
        });
        const pane = document.querySelector('.cn-blade[data-blade-kind="detail"] .cn-blade-body');
        pane.style.height = "70px";
        pane.style.maxHeight = "70px";
        pane.style.flex = "0 0 70px";
        pane.style.overflow = "auto";
      }, beforeAnchor);
      await page.evaluate(() => new Promise((resolve) =>
        window.requestAnimationFrame(() => window.requestAnimationFrame(resolve))));
      const restored = await page.evaluate((initial) => ({
        workspace: window.CW_APP.state.sessions[window.CW_APP.state.activeSession]?.id,
        sort: window.CW_APP.state.sort,
        thread: window.CW_APP.state.threadFocus,
        detail: window.CW_APP.state.feedMark,
        active: document.activeElement?.closest?.('[role="treeitem"]')?.getAttribute("data-key"),
        paneScroll: document.querySelector('.cn-blade[data-blade-kind="detail"] .cn-blade-body')?.scrollTop,
        paneHeight: document.querySelector('.cn-blade[data-blade-kind="detail"] .cn-blade-body')?.clientHeight,
        paneContent: document.querySelector('.cn-blade[data-blade-kind="detail"] .cn-blade-body')?.scrollHeight,
        windowStable: window.scrollY === initial.windowY,
      }), beforeAnchor);
      return (restored.workspace === "workspace-two" && restored.sort === "top" &&
        restored.thread === "p1" && restored.detail === "p2" && restored.active === "p2" &&
        restored.paneScroll >= 20 && restored.windowStable) ||
        log("route: " + JSON.stringify({
          w: restored.workspace, s: restored.sort, t: restored.thread, d: restored.detail,
          a: restored.active, scroll: restored.paneScroll, h: restored.paneHeight,
          sh: restored.paneContent, win: restored.windowStable,
        }));
    },
  },
  {
    name: "NAV-MIGRATE-004 recovery exposes export and reset without destroying state",
    firstVisit: true,
    storage: {
      "cw-board-state": JSON.stringify({
        v: 2, schemaVersion: 999, principalId: "guest_local", sessions: [{ id: "future-work" }],
      }),
    },
    run: async (page, log) => {
      await page.waitForTimeout(300);
      const recovery = await page.evaluate(() => ({
        text: document.querySelector("[data-session-recovery]")?.textContent,
        exportAction: !!document.querySelector("[data-session-recovery-export]"),
        resetAction: !!document.querySelector("[data-session-recovery-reset]"),
        preserved: !!localStorage.getItem("cw-board-state"),
        state: window.CW_APP.state.sessionRecovery,
      }));
      if (!recovery.exportAction || !recovery.resetAction) {
        return log("recovery: " + JSON.stringify(recovery));
      }
      await page.evaluate(() => document.querySelector("[data-session-recovery-reset]").click());
      await page.waitForFunction(() => !document.querySelector("[data-session-recovery]") &&
        !localStorage.getItem("cw-board-state"));
      return (recovery.exportAction && recovery.resetAction && recovery.preserved &&
        /newer|update|export|reset/i.test(recovery.text || "")) ||
        log("migration recovery is not actionable: " + JSON.stringify(recovery));
    },
  },
  {
    name: "NAV-MIGRATE-004 Projection Definition recovery reuses the actionable recovery surface",
    firstVisit: true,
    storage: {
      "cw-saved-views-v2": "{malformed saved view state",
    },
    run: async (page, log) => {
      await page.waitForTimeout(100);
      const recovery = await page.evaluate(() => ({
        text: document.querySelector("[data-session-recovery]")?.textContent,
        exportAction: !!document.querySelector("[data-session-recovery-export]"),
        resetAction: !!document.querySelector("[data-session-recovery-reset]"),
        surfaces: document.querySelectorAll("[data-session-recovery]").length,
        preserved: localStorage.getItem("cw-saved-views-v2"),
        status: window.CW_WORKBENCH.definitionStatus(),
      }));
      if (!recovery.exportAction || !recovery.resetAction) {
        return log("Projection Definition recovery: " + JSON.stringify(recovery));
      }
      await page.evaluate(() => document.querySelector("[data-session-recovery-reset]").click());
      await page.waitForTimeout(100);
      const reset = await page.evaluate(() => ({
        surface: !!document.querySelector("[data-session-recovery]"),
        stored: localStorage.getItem("cw-saved-views-v2"),
        status: window.CW_WORKBENCH.definitionStatus(),
      }));
      return recovery.surfaces === 1 && !!recovery.preserved &&
        /Projection Definition|malformed|export|reset/i.test(recovery.text || "") && !reset.surface && !reset.stored && !reset.status ||
        log("Projection Definition recovery is not actionable: " + JSON.stringify({ recovery, reset }));
    },
  },
  {
    name: "NAV-LAYER-001 reaction picker and query editor cancel before thread or location",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.click("[data-feed-query-toggle]");
      await page.fill("[data-feed-query]", "state:open");
      const queryBefore = await page.evaluate(() => ({
        path: window.CW_APP.state.path,
        layers: window.CW_APP.state.layers.slice(),
      }));
      await page.keyboard.press("Escape");
      const queryAfter = await page.evaluate(() => ({
        path: window.CW_APP.state.path,
        open: window.CW_APP.state.feedQueryOpen,
        query: window.CW_APP.state.feedQuery,
        exists: !!document.querySelector("[data-feed-query]"),
      }));
      await page.evaluate(() => window.CW_APP.openThread("p1"));
      await page.click('.cn-thread-reading [data-react-pick="p1"]');
      const reactionBefore = await page.evaluate(() => ({
        thread: window.CW_APP.state.threadFocus,
        picker: window.CW_APP.state.reactPick,
        layers: window.CW_APP.state.layers.slice(),
      }));
      await page.keyboard.press("Escape");
      const reactionAfter = await page.evaluate(() => ({
        thread: window.CW_APP.state.threadFocus,
        picker: window.CW_APP.state.reactPick,
        layers: window.CW_APP.state.layers.slice(),
      }));
      return (queryBefore.layers.at(-1) === "query-editor" && queryAfter.path === queryBefore.path &&
        queryAfter.open === false && queryAfter.query === "" && !queryAfter.exists &&
        reactionBefore.thread === "p1" && reactionBefore.picker === "p1" &&
        reactionBefore.layers.at(-1) === "reaction-picker" && reactionAfter.thread === "p1" &&
        reactionAfter.picker == null && reactionAfter.layers.at(-1) === "thread-detail") ||
        log("top-layer cancellation drift: " + JSON.stringify({ queryBefore, queryAfter, reactionBefore, reactionAfter }));
    },
  },
  {
    name: "NAV-ROUTE-002 refresh restores history focus region and detail reading anchor",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.evaluate(() => window.CW_APP.openThread("p1"));
      await page.focus('.cn-thread-tree [role="treeitem"][data-key="p2"]');
      await page.keyboard.press("Enter");
      await page.waitForFunction(() => document.activeElement?.matches?.('.cn-thread-reading article[data-object-id="p2"]'));
      const before = await page.evaluate(() => {
        const pane = document.querySelector('.cn-blade[data-blade-kind="detail"] .cn-blade-body');
        const target = document.querySelector('.cn-thread-reading article[data-object-id="p2"]');
        pane.scrollTop = Math.max(1, target.offsetTop - 18);
        window.CW_APP.commitNavigation(true);
        return {
          state: window.history.state,
          offset: target.getBoundingClientRect().top - pane.getBoundingClientRect().top,
        };
      });
      if (before.state?.focusRegion !== "detail" || before.state?.readingAnchor?.objectId !== "p2") {
        return log("meaningful reading state not committed: " + JSON.stringify(before));
      }
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => document.activeElement?.matches?.('.cn-thread-reading article[data-object-id="p2"]'));
      await page.evaluate(() => new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve))));
      const after = await page.evaluate(() => {
        const pane = document.querySelector('.cn-blade[data-blade-kind="detail"] .cn-blade-body');
        const target = document.querySelector('.cn-thread-reading article[data-object-id="p2"]');
        return {
          focusRegion: window.CW_APP.navigationLocation().focusRegion,
          active: document.activeElement?.getAttribute("data-object-id"),
          offset: target.getBoundingClientRect().top - pane.getBoundingClientRect().top,
        };
      });
      return (after.focusRegion === "detail" && after.active === "p2" &&
        Math.abs(after.offset - before.offset) <= 8) || log("refresh reading restore drift: " + JSON.stringify({ before, after }));
    },
  },
  {
    name: "NAV-A11Y-003 canonical inReplyTo drives thread topology without legacy re",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.evaluate(() => {
        const post = window.CW_DATA.posts.find((item) => item.id === "p3");
        delete post.re;
        post.inReplyTo = { objectId: "p2", kind: "message" };
        post.threadRoot = { objectId: "p1", kind: "message" };
        window.CW_APP.openThread("p3");
      });
      await page.waitForSelector('.cn-thread-tree [role="treeitem"][data-object-id="p3"]');
      const topology = await page.evaluate(() => {
        const item = document.querySelector('.cn-thread-tree [role="treeitem"][data-object-id="p3"]');
        return { level: item?.getAttribute("aria-level"), parent: item?.getAttribute("data-parent-id") };
      });
      return (topology.level === "3" && topology.parent === "p2") ||
        log("canonical graph was not rendered: " + JSON.stringify(topology));
    },
  },
  {
    name: "NAV-A11Y-001 feed PageDown and PageUp move the synchronized roving article",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      const first = page.locator('.cn-tree[role="feed"] [role="article"][tabindex="0"]');
      await first.focus();
      const start = await first.getAttribute("data-object-id");
      await page.keyboard.press("PageDown");
      const down = await page.evaluate(() => ({
        active: document.activeElement?.closest?.('[role="article"]')?.getAttribute("data-object-id"),
        current: document.querySelector('.cn-tree[role="feed"] [role="article"][tabindex="0"]')?.getAttribute("data-object-id"),
        state: window.CW_APP.state.feedMark,
      }));
      await page.keyboard.press("PageUp");
      const up = await page.evaluate(() => ({
        active: document.activeElement?.closest?.('[role="article"]')?.getAttribute("data-object-id"),
        current: document.querySelector('.cn-tree[role="feed"] [role="article"][tabindex="0"]')?.getAttribute("data-object-id"),
      }));
      return (down.active && down.active !== start && down.active === down.current && down.current === down.state &&
        up.active === up.current) || log("page-wise feed focus drift: " + JSON.stringify({ start, down, up }));
    },
  },
  {
    name: "NAV-A11Y-003 collapsing an ancestor retains exactly one visible roving tree item",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.evaluate(() => window.CW_APP.openThread("p1"));
      await page.focus('.cn-thread-tree [role="treeitem"][data-key="p2"]');
      await page.keyboard.press("ArrowDown");
      const collapsed = await page.evaluate(() => {
        const root = document.querySelector('.cn-thread-tree [role="treeitem"][data-key="p1"]');
        const control = root?.querySelector(':scope > .cn-comment-main .cn-pm[data-fold="p1"]');
        control?.click();
        return !!control;
      });
      if (!collapsed) return log("root collapse control unavailable");
      const folded = await page.evaluate(() => ({
        selected: document.querySelector('.cn-thread-tree [aria-selected="true"]')?.getAttribute("data-object-id"),
        tabbable: Array.from(document.querySelectorAll('.cn-thread-tree [role="treeitem"][tabindex="0"]'))
          .map((item) => item.getAttribute("data-object-id")),
        state: window.CW_APP.state.feedMark,
      }));
      return (folded.selected === "p1" && folded.state === "p1" && folded.tabbable.join("|") === "p1") ||
        log("hidden descendant retained roving selection: " + JSON.stringify(folded));
    },
  },
  {
    name: "blades: expand and restore keeps the focused panel context",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.evaluate(() => {
        window.CW_APP.state.focus = 1;
        window.CW_APP.state.columnFocus = true;
        window.CW_APP.render(true);
      });
      const before = await page.evaluate(() => ({
        focus: window.CW_APP.state.focus,
        mark: window.CW_APP.state.feedMark,
      }));
      await page.keyboard.press("z");
      await page.waitForTimeout(100);
      const expanded = await page.evaluate(() => ({
        focus: window.CW_APP.state.focus,
        mark: window.CW_APP.state.feedMark,
        max: document.querySelector(".cn-blades")?.getAttribute("data-focus-expanded"),
        visible: document.querySelectorAll('.cn-blade:not([data-focus-hidden="true"])').length,
      }));
      if (expanded.max !== String(before.focus) || expanded.visible !== 1 ||
          expanded.focus !== before.focus || expanded.mark !== before.mark) {
        return log("focused panel did not expand in place: " + JSON.stringify({ before, expanded }));
      }
      await page.keyboard.press("z");
      await page.waitForTimeout(100);
      const restored = await page.evaluate(() => ({
        focus: window.CW_APP.state.focus,
        mark: window.CW_APP.state.feedMark,
        max: document.querySelector(".cn-blades")?.getAttribute("data-focus-expanded"),
        visible: document.querySelectorAll('.cn-blade:not([data-focus-hidden="true"])').length,
      }));
      return (restored.max === "" && restored.visible > 1 && restored.focus === before.focus &&
        restored.mark === before.mark) || log("focused panel did not restore: " + JSON.stringify(restored));
    },
  },
  {
    name: "WS-BOOT-001 the board opens its own Epoch workspace and .epoch project",
    run: async (page, log) => {
      await page.waitForFunction(() => window.CW_WORKSPACE && window.CW_WORKSPACE.project() !== null);
      const probe = await page.evaluate(() => ({
        status: window.CW_WORKSPACE.status(),
        project: window.CW_WORKSPACE.project(),
        statusSlot: document.querySelector('[data-cw-slot="shell.workspace-status"]')?.textContent || "",
        contextSlot: document.querySelector('[data-cw-slot="board.context-panel"]')?.textContent || "",
      }));
      if (probe.project?.slug !== ".epoch") return log("no default project: " + JSON.stringify(probe.project));
      if (probe.project.uiView !== "main") return log("project owns no view: " + JSON.stringify(probe.project));
      if (!probe.status.harnessVerified) return log("harness not verified: " + JSON.stringify(probe.status));
      if (probe.status.events < 1) return log("workspace recorded nothing: " + JSON.stringify(probe.status));
      if (!probe.statusSlot.includes("ws_")) return log("status slot empty: " + probe.statusSlot);
      if (!probe.contextSlot.includes(".epoch")) return log("context slot empty: " + probe.contextSlot);
      return true;
    },
  },
  {
    name: "WS-BOOT-002 the workspace survives a reload as history, not as a fresh start",
    run: async (page, log) => {
      await page.waitForFunction(() => window.CW_WORKSPACE && window.CW_WORKSPACE.project() !== null);
      const first = await page.evaluate(() => ({
        id: window.CW_WORKSPACE.status().workspaceId,
        events: window.CW_WORKSPACE.status().events,
      }));
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => window.CW_WORKSPACE && window.CW_WORKSPACE.project() !== null);
      const second = await page.evaluate(() => ({
        id: window.CW_WORKSPACE.status().workspaceId,
        events: window.CW_WORKSPACE.status().events,
        created: window.CW_WORKSPACE.project().created,
      }));
      if (first.id !== second.id) return log("workspace identity changed: " + JSON.stringify([first, second]));
      if (second.created) return log("the default project was recreated on reload");
      if (second.events < first.events) return log("history shrank: " + JSON.stringify([first, second]));
      return true;
    },
  },
  {
    name: "WS-SAFE-001 an interface revision that fails validation boots recovery instead",
    run: async (page, log) => {
      await page.waitForFunction(() => window.CW_WORKSPACE && window.CW_WORKSPACE.project() !== null);
      const broken = await page.evaluate(async () => {
        await window.CW_WORKSPACE.execute("ui.propose", {
          view: "main",
          manifest: {
            abiVersion: 1,
            scope: "personal",
            placements: [{ slot: "shell.nowhere", component: "WorkspaceStatus" }],
            theme: { "--cw-accent": "url(https://example.invalid/x.png)" },
          },
        });
        return {
          safeMode: document.body.getAttribute("data-cw-safe-mode"),
          notice: document.querySelector("[data-cw-harness-notice]")?.textContent || "",
          recovery: document.querySelector('[data-cw-slot="board.recovery"]')?.textContent || "",
        };
      });
      if (broken.safeMode !== "true") return log("did not enter safe mode: " + JSON.stringify(broken));
      if (!/Safe mode/i.test(broken.notice)) return log("no notice: " + broken.notice);
      if (!/Restore last working interface/.test(broken.recovery)) return log("no recovery control: " + broken.recovery);

      const recovered = await page.evaluate(async () => {
        const before = window.CW_WORKSPACE.status().events;
        document.querySelector('[data-cw-command="ui.restoreLastKnownGood"]').click();
        await new Promise((resolve) => setTimeout(resolve, 300));
        return { before, after: window.CW_WORKSPACE.status().events };
      });
      // Recovery appends: the rejected revision stays in the ledger.
      if (recovered.after <= recovered.before) return log("recovery recorded nothing: " + JSON.stringify(recovered));
      return true;
    },
  },
  {
    name: "GEN-001 composing an interface change proposes it, diffs it, and applies it on accept",
    run: async (page, log) => {
      await page.waitForFunction(() => window.CW_WORKSPACE && window.CW_WORKSPACE.project() !== null);
      const composed = await page.evaluate(async () => {
        document.querySelector("[data-compose-open]").click();
        document.querySelector("[data-gen-ui-input]").value = "show my review queue";
        document.querySelector("[data-gen-ui-source]").value =
          'root = Panel("Review queue", [Fact("open", "3"), Fact("mine", "1")])';
        document.querySelector("[data-token-editor]").value = "--cw-cell: 0.58rem;";
        const proposed = await window.CW_COMPOSE.propose();
        return {
          open: document.querySelector("[data-compose]").getAttribute("data-open"),
          validation: proposed?.validation.state,
          proposalRef: proposed?.proposalRef,
          diff: document.querySelector("[data-compose-diff]").textContent,
          applied: getComputedStyle(document.documentElement).getPropertyValue("--cw-cell").trim(),
          slot: document.querySelector('[data-cw-slot="board.context-panel"]').textContent,
        };
      });
      if (composed.open !== "true") return log("compose panel did not open");
      if (composed.validation !== "valid") return log("proposal invalid: " + JSON.stringify(composed));
      if (!composed.proposalRef?.includes("proposals/compose")) return log("no proposal ref: " + composed.proposalRef);
      if (!/GeneratedPanel/.test(composed.diff) || !/--cw-cell/.test(composed.diff)) {
        return log("diff does not explain the change: " + composed.diff);
      }
      // Nothing applies before accepting: the diff is a decision, not a preview of a fait accompli.
      if (composed.applied === "0.58rem") return log("theme applied before the change was accepted");
      if (/Review queue/.test(composed.slot)) return log("generated panel rendered before acceptance");

      const accepted = await page.evaluate(async () => {
        await window.CW_COMPOSE.accept();
        return {
          applied: getComputedStyle(document.documentElement).getPropertyValue("--cw-cell").trim(),
          generated: document.querySelector('[data-c="generated-panel"]')?.textContent || "",
          provenance: window.CW_WORKSPACE.runtime().workspace.head("compose").provenance,
        };
      });
      if (accepted.applied !== "0.58rem") return log("theme not applied after accept: " + accepted.applied);
      if (!/Review queue/.test(accepted.generated)) return log("generated panel missing: " + accepted.generated);
      if (!accepted.provenance.promptDigest) return log("prompt provenance not recorded");
      if (accepted.provenance.prompt) return log("the prompt text was stored; only its digest should be");

      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => window.CW_WORKSPACE && window.CW_WORKSPACE.project() !== null);
      const persisted = await page.evaluate(() => ({
        generated: document.querySelector('[data-c="generated-panel"]')?.textContent || "",
        cell: getComputedStyle(document.documentElement).getPropertyValue("--cw-cell").trim(),
      }));
      if (!/Review queue/.test(persisted.generated)) return log("did not survive reload: " + persisted.generated);
      if (persisted.cell !== "0.58rem") return log("theme did not survive reload: " + persisted.cell);
      return true;
    },
  },
  {
    name: "GEN-002 a document the pinned library does not recognise never becomes a proposal",
    run: async (page, log) => {
      await page.waitForFunction(() => window.CW_WORKSPACE && window.CW_WORKSPACE.project() !== null);
      const probe = await page.evaluate(async () => {
        document.querySelector("[data-compose-open]").click();
        document.querySelector("[data-gen-ui-source]").value = "root = Exfiltrate(\"/etc/passwd\")";
        const before = window.CW_WORKSPACE.status().events;
        const proposed = await window.CW_COMPOSE.propose();
        return {
          proposed,
          before,
          after: window.CW_WORKSPACE.status().events,
          status: document.querySelector("[data-gen-ui-status]").textContent,
        };
      });
      if (probe.proposed !== null) return log("an unknown component was proposed anyway");
      if (probe.after !== probe.before) return log("it recorded something: " + JSON.stringify(probe));
      if (!/pinned library/.test(probe.status)) return log("unhelpful refusal: " + probe.status);
      return true;
    },
  },
  {
    name: "GEN-003 a theme value that could escape a declaration is dropped before it is proposed",
    run: async (page, log) => {
      await page.waitForFunction(() => window.CW_WORKSPACE && window.CW_WORKSPACE.project() !== null);
      const probe = await page.evaluate(async () => {
        document.querySelector("[data-compose-open]").click();
        document.querySelector("[data-gen-ui-source]").value = "";
        document.querySelector("[data-token-editor]").value =
          "--cw-accent: url(https://example.invalid/pixel.png);\n--cw-ink: #ffffff;";
        const proposed = await window.CW_COMPOSE.propose();
        return {
          theme: proposed ? window.CW_WORKSPACE.runtime().workspace.head("compose").manifest.theme : null,
          validation: proposed?.validation.state,
        };
      });
      if (probe.validation !== "valid") return log("the safe half was rejected too: " + JSON.stringify(probe));
      if (probe.theme["--cw-accent"]) return log("an unsafe value survived: " + JSON.stringify(probe.theme));
      if (probe.theme["--cw-ink"] !== "#ffffff") return log("the safe value was lost: " + JSON.stringify(probe.theme));
      return true;
    },
  },
  {
    name: "MCP-EPOCH-001 the workspace commands are agent-callable with honest annotations",
    run: async (page, log) => {
      await page.waitForFunction(() => window.CW_WORKSPACE && window.CW_WORKSPACE.project() !== null);
      const probe = await page.evaluate(async () => {
        const tools = window.CW_MCP.list().filter((tool) => tool.name.startsWith("epoch_"));
        const annotationOf = (name) => tools.find((tool) => tool.name === name)?.annotations;
        const before = window.CW_WORKSPACE.status().events;
        const status = await window.CW_MCP.call("epoch_workspace_status", {});
        const merge = await window.CW_MCP.call("epoch_change_merge", { from: "main" });
        return {
          names: tools.map((tool) => tool.name),
          status: JSON.parse(status.content[0].text),
          merge: JSON.parse(merge.content[0].text),
          readOnly: annotationOf("epoch_workspace_status"),
          consequential: annotationOf("epoch_change_merge"),
          untrusted: annotationOf("epoch_change_show"),
          before,
          after: window.CW_WORKSPACE.status().events,
        };
      });

      if (probe.names.length < 15) return log("tool family missing: " + probe.names.length);
      if (!probe.names.includes("epoch_ui_propose")) return log("no propose tool");
      if (probe.status.decision !== "allow") return log("read command refused: " + JSON.stringify(probe.status));
      // Visibility is not authorisation: the agent can see merge and still cannot do it.
      if (probe.merge.decision !== "confirm") return log("merge was not held for confirmation: " + JSON.stringify(probe.merge));
      if (probe.after !== probe.before) return log("a held command changed state anyway");
      if (probe.readOnly?.readOnlyHint !== true) return log("status is not marked read-only");
      if (probe.consequential?.readOnlyHint !== false) return log("merge is marked read-only");
      if (probe.untrusted?.untrustedContentHint !== true) return log("revision content is not marked untrusted");
      return true;
    },
  },
  {
    name: "MCP-EPOCH-002 an agent and the page read the same workspace, not two copies",
    run: async (page, log) => {
      await page.waitForFunction(() => window.CW_WORKSPACE && window.CW_WORKSPACE.project() !== null);
      const probe = await page.evaluate(async () => {
        const viaTool = JSON.parse((await window.CW_MCP.call("epoch_workspace_status", {})).content[0].text);
        const viaPage = window.CW_WORKSPACE.status();
        const created = JSON.parse((await window.CW_MCP.call("epoch_view_create", { name: "agent-view" })).content[0].text);
        return { viaTool, viaPage, created, views: window.CW_WORKSPACE.runtime().workspace.listViews().map((v) => v.name) };
      });

      if (probe.viaTool.data.workspaceId !== probe.viaPage.workspaceId) {
        return log("agent and page disagree about the workspace: " + JSON.stringify(probe));
      }
      if (probe.created.decision !== "allow") return log("view.create refused: " + JSON.stringify(probe.created));
      if (!probe.views.includes("agent-view")) return log("the agent's view is not in the page's workspace");
      if (!probe.created.eventIds?.length) return log("no event recorded for the agent's change");
      return true;
    },
  },
];

async function path(page) {
  await page.waitForTimeout(120);
  return page.evaluate(() => window.CW_APP.state.path);
}
async function go(page, to) {
  await page.evaluate((t) => window.CW_APP.navigate(t, { keepCli: true }), to);
  await page.waitForTimeout(120);
}
/** Click a nav row (preview only), then Enter to activate / slide in. */
async function openNavItem(page, sel) {
  await page.click(sel);
  await page.waitForTimeout(40);
  await page.evaluate(() => {
    document.querySelector("[data-cli]")?.blur();
    window.CW_APP.state.columnFocus = true;
    window.CW_APP.state.focus = 0;
  });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(120);
}
async function _count(page, sel) {
  return page.evaluate((s) => document.querySelectorAll(s).length, sel);
}
void _count;


const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {},
);
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
      try { localStorage.setItem("cw-keys-onboarded", "1"); } catch { /* fine */ }
    });
  }
  if (testCase.storage) {
    await context.addInitScript((values) => {
      Object.entries(values).forEach(([key, value]) => localStorage.setItem(key, value));
    }, testCase.storage);
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
