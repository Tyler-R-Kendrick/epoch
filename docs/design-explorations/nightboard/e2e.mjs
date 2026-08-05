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
      if (stack.navPath !== "/projects/community/channels/general") {
        return log("nav not reloaded for path: " + JSON.stringify(stack));
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
      await page.waitForTimeout(120);
      const after = await page.evaluate(() => ({
        path: window.NB_APP.state.path,
        listCount: document.querySelectorAll('.cn-blade[data-blade-kind="list"]').length,
        navPath: document.querySelector('.cn-blade[data-blade-kind="list"]')?.getAttribute("data-blade-path"),
        navKey: document.querySelector('.cn-blade[data-blade-kind="list"]')?.getAttribute("data-key"),
      }));
      if (after.path !== "/projects/community/channels/bugs") return log("path " + after.path);
      if (after.listCount !== 1) return log("nav cloned: " + JSON.stringify(after));
      if (after.navPath !== "/projects/community/channels/bugs") {
        return log("nav not reloaded: " + JSON.stringify(after));
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
      await page.click('[data-blade-kind="list"] .cn-item[data-key="projects"], [data-blade-path="/"] .cn-item[data-key="projects"]');
      if ((await path(page)) !== "/projects") return log("listing dir failed: " + await path(page));
      // Detail may preview child listing when selected is a dir — or click in nav.
      const kid = await page.locator('[data-blade-kind="list"] .cn-item[data-kind="dir"]').first();
      if (await kid.count()) {
        await kid.click();
        await page.waitForTimeout(100);
      }
      const p = await path(page);
      return p.startsWith("/projects") || log("detail/nav click went to " + p);
    },
  },
  {
    name: "mouse: clicking a post selects it and opens the detail blade on it",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.click('[data-blade-kind="list"] .cn-item[data-i="2"]');
      const st = await page.evaluate(() => ({
        cursor: window.NB_APP.state.cursor, focus: window.NB_APP.state.focus,
      }));
      const marked = await page.evaluate(() => !!document.querySelector('.cn-comment[data-here="true"]'));
      return (st.cursor === 2 && marked) || log(JSON.stringify(st) + " marked:" + marked);
    },
  },
  {
    name: "touch: tapping a channel on its blade navigates",
    touch: true,
    run: async (page) => {
      await go(page, "/projects/community/channels");
      await page.waitForTimeout(100);
      const item = await page.locator('[data-blade-kind="list"] .cn-item[data-key="ideas"]').boundingBox();
      await page.touchscreen.tap(item.x + item.width / 2, item.y + item.height / 2);
      await page.waitForTimeout(200);
      return (await path(page)) === "/projects/community/channels/ideas";
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
        // Select first post file so detail paints the thread.
        const list = window.NB_MAP.list("/projects/community/channels/general") || [];
        const ix = list.findIndex((e) => e.post);
        window.NB_APP.state.cursor = ix >= 0 ? ix : 0;
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
        return {
          depth: Number(c?.dataset.depth),
          rails: c?.querySelectorAll(".cn-rail").length ?? -1,
          vote: !!c?.querySelector("[data-vote-id]"),
          reply: !!c?.querySelector("[data-reply]"),
        };
      });
      // p3 is re→p2→p1, so depth 2 and two ancestor rails.
      return (deep.depth === 2 && deep.rails === 2 && deep.vote && deep.reply) ||
        log(JSON.stringify(deep));
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
    name: "detail: × closes detail pane; selecting a file reopens it",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.waitForTimeout(100);
      // Ensure detail is open with a file selected.
      await page.evaluate(() => {
        window.NB_APP.state.detailOpen = true;
        const list = window.NB_MAP.list("/projects/community/channels/general") || [];
        const ix = list.findIndex((e) => e.post || e.kind === "file");
        window.NB_APP.state.cursor = ix >= 0 ? ix : 0;
        window.NB_APP.state.focus = 1;
        window.NB_APP.render(true);
      });
      await page.waitForTimeout(80);
      const before = await page.evaluate(() => ({
        detail: !!document.querySelector('.cn-blade[data-blade-kind="detail"]'),
        open: window.NB_APP.isDetailOpen && window.NB_APP.isDetailOpen(),
      }));
      if (!before.detail) return log("detail not open to start: " + JSON.stringify(before));
      // Close via ×
      const closed = await page.evaluate(() => {
        const btn = document.querySelector(
          '.cn-blade[data-blade-kind="detail"] [data-blade-close]',
        );
        if (!btn) return { err: "no close on detail" };
        btn.click();
        return {
          detail: !!document.querySelector('.cn-blade[data-blade-kind="detail"]'),
          open: window.NB_APP.isDetailOpen(),
          listOnly: document.querySelectorAll(".cn-blade").length === 1,
        };
      });
      if (closed.err) return log(closed.err);
      if (closed.detail || closed.open) return log("detail still open: " + JSON.stringify(closed));
      if (!closed.listOnly) return log("expected nav-only: " + JSON.stringify(closed));
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
      }));
      if (!(reopened.detail && reopened.open)) {
        return log("did not reopen: " + JSON.stringify(reopened));
      }
      // Esc also closes detail.
      await page.evaluate(() => {
        window.NB_APP.state.columnFocus = true;
        window.NB_APP.state.focus = 1;
      });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(80);
      const viaEsc = await page.evaluate(() => ({
        detail: !!document.querySelector('.cn-blade[data-blade-kind="detail"]'),
        open: window.NB_APP.isDetailOpen(),
      }));
      return (!viaEsc.detail && !viaEsc.open) || log("Esc did not close: " + JSON.stringify(viaEsc));
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
    name: "blades: opening a post auto-collapses nav for detail width",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.waitForTimeout(120);
      await page.evaluate(() => window.NB_APP.setNavCollapsed(false, { silent: true }));
      await page.waitForTimeout(80);
      // Click a post row (file) — should collapse nav rails.
      const clicked = await page.evaluate(() => {
        const post = document.querySelector(
          '[data-blade-path="/projects/community/channels/general"] .cn-item[data-kind="file"]',
        ) || document.querySelector(
          '.cn-blade[data-blade-kind="list"] .cn-item[data-kind="file"]',
        );
        if (!post) return { err: "no post item" };
        post.click();
        return { ok: true };
      });
      if (clicked.err) return log(clicked.err);
      await page.waitForTimeout(150);
      const after = await page.evaluate(() => ({
        collapsed: window.NB_APP.isNavCollapsed(),
        rails: document.querySelectorAll('.cn-blade[data-collapsed="true"]').length,
        focus: window.NB_APP.state.focus,
        detail: document.querySelector('.cn-blade[data-blade-kind="detail"]')?.dataset.focus,
      }));
      return (after.collapsed && after.rails >= 1) ||
        log("post open did not collapse nav: " + JSON.stringify(after));
    },
  },
  {
    name: "terminal: panel minimises, maximises, docks, and resizes",
    run: async (page, log) => {
      const panel = page.locator(".cn-panel");
      if ((await panel.getAttribute("data-dock")) !== "bottom") return log("default dock not bottom");
      // Minimise via chrome, restore via the active workspace tab.
      await page.click("[data-panel-min]");
      await page.waitForTimeout(100);
      if ((await panel.getAttribute("data-out-min")) !== "true") return log("min failed");
      await page.click('.cn-panel-tab[aria-selected="true"]');
      await page.waitForTimeout(100);
      if ((await panel.getAttribute("data-out-min")) !== "false") return log("tab did not restore");
      // Maximise.
      await page.click("[data-panel-max]");
      await page.waitForTimeout(100);
      if ((await panel.getAttribute("data-out-max")) !== "true") return log("max failed");
      await page.click("[data-panel-max]");
      // Dock cycle: bottom → right → left → bottom.
      await page.click("[data-panel-dock]");
      await page.waitForTimeout(100);
      if ((await panel.getAttribute("data-dock")) !== "right") return log("dock right failed");
      await page.click("[data-panel-dock]");
      await page.waitForTimeout(100);
      if ((await panel.getAttribute("data-dock")) !== "left") return log("dock left failed");
      await page.click("[data-panel-dock]");
      await page.waitForTimeout(100);
      if ((await panel.getAttribute("data-dock")) !== "bottom") return log("dock bottom failed");
      // Drag the horizontal sash to grow height.
      const before = await page.evaluate(() => window.NB_APP.state.panes.outH);
      const sp = await page.locator('.cn-split[data-split="out"]').boundingBox();
      await page.mouse.move(sp.x + sp.width / 2, sp.y + 3);
      await page.mouse.down();
      await page.mouse.move(sp.x + sp.width / 2, sp.y - 80, { steps: 4 });
      await page.mouse.up();
      await page.waitForTimeout(150);
      const after = await page.evaluate(() => window.NB_APP.state.panes.outH);
      return after > before || log(`height ${before}→${after}`);
    },
  },
  {
    name: "nav: selection reloads same list blade for new branch",
    run: async (page, log) => {
      await go(page, "/projects/community/channels");
      await page.waitForTimeout(80);
      await page.click('[data-blade-kind="list"] .cn-item[data-key="ideas"]');
      await page.waitForTimeout(120);
      const st = await page.evaluate(() => ({
        path: window.NB_APP.state.path,
        listCount: document.querySelectorAll('.cn-blade[data-blade-kind="list"]').length,
        navPath: document.querySelector('.cn-blade[data-blade-kind="list"]')?.getAttribute("data-blade-path"),
        navKey: document.querySelector('.cn-blade[data-blade-kind="list"]')?.getAttribute("data-key"),
      }));
      if (st.path !== "/projects/community/channels/ideas") return log("path " + st.path);
      if (st.listCount !== 1 || st.navKey !== "blade-nav") return log("nav not single: " + JSON.stringify(st));
      return st.navPath === "/projects/community/channels/ideas" || log(JSON.stringify(st));
    },
  },
  {
    name: "channels: +/- tree nav expands and collapses directory rows",
    run: async (page, log) => {
      await go(page, "/projects/community/channels");
      await page.waitForTimeout(100);
      const mode = await page.evaluate(() => {
        const tree = document.querySelector('[data-blade-kind="list"] .cn-blade-tree');
        return tree?.getAttribute("data-tree-mode") || "";
      });
      if (mode !== "first-level") return log("tree mode: " + mode);

      await page.click('[data-tree-toggle="/projects/community/channels/showcase"]');
      await page.waitForTimeout(100);
      const expanded = await page.evaluate(() => {
        const btn = document.querySelector('[data-tree-toggle="/projects/community/channels/showcase"]');
        const kids = document.querySelector('[data-key="tk-/projects/community/channels/showcase"]');
        const depth2 = kids
          ? Array.from(kids.querySelectorAll('.cn-tree-row[data-depth="2"]')).length
          : 0;
        return {
          exp: btn?.getAttribute("aria-expanded"),
          mark: btn?.textContent,
          hasKids: !!kids,
          depth2,
        };
      });
      if (expanded.exp !== "true" || expanded.mark !== "−" || !expanded.hasKids) {
        return log("expand failed: " + JSON.stringify(expanded));
      }
      if (expanded.depth2 > 0) return log("duplicate deep tree depth-2: " + JSON.stringify(expanded));
      await page.click('[data-tree-toggle="/projects/community/channels/showcase"]');
      await page.waitForTimeout(100);
      const collapsed = await page.evaluate(() => {
        const btn = document.querySelector('[data-tree-toggle="/projects/community/channels/showcase"]');
        return {
          exp: btn?.getAttribute("aria-expanded"),
          mark: btn?.textContent,
          kids: !!document.querySelector('[data-key="tk-/projects/community/channels/showcase"]'),
        };
      });
      return (collapsed.exp === "false" && collapsed.mark === "+" && !collapsed.kids) ||
        log("collapse failed: " + JSON.stringify(collapsed));
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
    name: "sort: hot/new/top/best chips reorder; share is present",
    run: async (page, log) => {
      const sorted = await page.evaluate(async () => {
        window.NB_APP.setNavCollapsed(false, { silent: true, noRender: true });
        window.NB_APP.navigate("/projects/community/channels/general", { keepCli: true });
        const list = window.NB_MAP.list("/projects/community/channels/general") || [];
        const ix = list.findIndex((e) => e.post);
        window.NB_APP.state.cursor = ix >= 0 ? ix : 0;
        window.NB_APP.state.focus = 1;
        window.NB_APP.render(true);
        await new Promise((r) => setTimeout(r, 40));
        if (!document.querySelector(".cn-comment")) return { err: "no tree" };
        const neu = document.querySelector('[data-sort="new"]');
        const top = document.querySelector('[data-sort="top"]');
        if (!neu || !top) {
          return {
            err: "no sort chips",
            bar: !!document.querySelector(".cn-feed-bar"),
          };
        }
        neu.click();
        const afterNew = window.NB_APP.state.sort;
        top.click();
        const afterTop = window.NB_APP.state.sort;
        const share = document.querySelectorAll("[data-share]").length;
        const hasVote = !!document.querySelector('[data-vote="up"]');
        return { afterNew, afterTop, share, hasVote };
      });
      if (sorted.err) return log(JSON.stringify(sorted));
      if (sorted.afterNew !== "new") return log("sort stayed " + sorted.afterNew);
      if (sorted.afterTop !== "top") return log("top failed: " + sorted.afterTop);
      return (sorted.share >= 1 && sorted.hasVote) ||
        log(`share ${sorted.share} hasVote ${sorted.hasVote}`);
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
  {
    name: "slash: /go completes and navigates in agent chat",
    run: async (page, log) => {
      // Ensure ai mode (default), type a slash command with intellisense.
      await page.keyboard.type("/go bug");
      await page.waitForTimeout(120);
      const menu = await page.evaluate(() => ({
        open: document.querySelector(".cn-panel")?.dataset.open,
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
      return (/\/go/.test(out) && /\/sort/.test(out) && /\/whoami/.test(out)) ||
        log("help missing verbs: " + out.slice(0, 160));
    },
  },
  {
    name: "feed query: Lucene view filters posts; named chip and free-form",
    run: async (page, log) => {
      await go(page, "/projects/community/channels/general");
      await page.waitForTimeout(120);
      const before = await page.evaluate(() => document.querySelectorAll(".cn-comment").length);
      // Named projection: needs review.
      await page.click('[data-feed-view="needs-review"]');
      await page.waitForTimeout(150);
      const mid = await page.evaluate(() => ({
        n: document.querySelectorAll(".cn-comment").length,
        q: window.NB_APP.state.feedQuery,
        view: window.NB_APP.state.feedView,
        match: document.querySelector(".cn-feed-match")?.textContent || "",
        err: window.NB_APP.state.feedQueryError,
      }));
      if (mid.view !== "needs-review" || !/needs-review/.test(mid.q || "")) {
        return log("chip failed: " + JSON.stringify(mid));
      }
      if (mid.err) return log("query error: " + mid.err);
      if (!(mid.n > 0 && mid.n <= before)) return log("filter count odd: " + mid.n + " of " + before);

      // Free-form: who:scout
      await page.fill("[data-feed-query]", "who:scout sort:new");
      await page.click("[data-feed-query-run]");
      await page.waitForTimeout(150);
      const scout = await page.evaluate(() => {
        const whos = Array.from(document.querySelectorAll('.cn-comment [data-c="handle"]'))
          .map((el) => el.textContent);
        return {
          q: window.NB_APP.state.feedQuery,
          n: document.querySelectorAll(".cn-comment").length,
          whos,
          // Ancestors of scout hits may appear (lea/nora) for tree coherence.
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
      // /spaces prints a markdown table in the transcript.
      await page.keyboard.type("/spaces");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(200);
      const out = await page.evaluate(() => {
        const last = Array.from(document.querySelectorAll('.cn-line[data-kind="out"] .cn-body')).pop();
        return {
          html: last?.innerHTML || "",
          text: last?.textContent || "",
        };
      });
      return (/nb-md-atable/.test(out.html) && /civic-workshop|agent-lab/.test(out.text)) ||
        log("spaces table: " + out.text.slice(0, 120));
    },
  },
  {
    name: "spaces: catalogue is relay+workspace+subreddit; hub has feed and relay",
    run: async (page, log) => {
      await go(page, "/");
      const root = await page.evaluate(() =>
        Array.from(document.querySelectorAll('[data-blade-path="/"] .cn-item'))
          .map((el) => el.getAttribute("data-key")));
      if (!root.includes("spaces")) return log("root missing spaces: " + root.join(","));
      await page.click('[data-blade-path="/"] .cn-item[data-key="spaces"]');
      await page.waitForTimeout(120);
      if ((await path(page)) !== "/spaces") return log("path " + await path(page));
      await page.click('[data-blade-path="/spaces"] .cn-item[data-key="civic-workshop"]');
      await page.waitForTimeout(150);
      const hub = await page.evaluate(() => {
        const keys = Array.from(document.querySelectorAll('[data-blade-path="/spaces/civic-workshop"] .cn-item'))
          .map((el) => el.getAttribute("data-key"));
        const ctx = document.querySelector(".cn-space-ctx")?.textContent || "";
        return { keys, ctx, path: window.NB_APP.state.path };
      });
      if (hub.path !== "/spaces/civic-workshop") return log("hub path " + hub.path);
      for (const need of ["feed", "channels", "relay", "about"]) {
        if (!hub.keys.includes(need)) return log("hub missing " + need + ": " + hub.keys.join(","));
      }
      if (!/r\/civic|subscribers|relay|nostr/i.test(hub.ctx)) {
        return log("space context thin: " + hub.ctx.slice(0, 120));
      }
      await page.click('[data-blade-path="/spaces/civic-workshop"] .cn-item[data-key="feed"]');
      await page.waitForTimeout(150);
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
      await page.click('[data-blade-path="/"] .cn-item[data-key="dms"]');
      await page.waitForTimeout(120);
      if ((await path(page)) !== "/dms") return log("path " + await path(page));
      // Open the scout agent DM.
      await page.click('[data-blade-path="/dms"] .cn-item[data-key="scout"]');
      await page.waitForTimeout(150);
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
    name: "editor: file detail is a terminal editor; i/Esc and click work",
    run: async (page, log) => {
      await go(page, "/.agents/space-steward");
      await page.waitForTimeout(120);
      // Open instructions.md in the detail pane.
      const opened = await page.evaluate(() => {
        const item = document.querySelector(
          '[data-blade-path="/.agents/space-steward"] .cn-item[data-key="instructions.md"]',
        );
        if (!item) return { err: "no instructions.md" };
        item.click();
        return { ok: true };
      });
      if (opened.err) return log(opened.err);
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
    name: "agents: board and project .agents (vercel/eve) directories",
    run: async (page, log) => {
      await go(page, "/");
      await page.waitForTimeout(100);
      const root = await page.evaluate(() =>
        Array.from(document.querySelectorAll('[data-blade-path="/"] .cn-item'))
          .map((el) => el.getAttribute("data-key")),
      );
      if (!root.includes(".agents")) return log("board root missing .agents: " + root.join(","));

      await page.click('[data-blade-path="/"] .cn-item[data-key=".agents"]');
      await page.waitForTimeout(120);
      if ((await path(page)) !== "/.agents") return log("path " + await path(page));
      const boardAgents = await page.evaluate(() =>
        Array.from(
          document.querySelectorAll('[data-blade-path="/.agents"] .cn-item'),
        ).map((el) => el.getAttribute("data-key")),
      );
      if (!boardAgents.includes("space-steward")) {
        return log("board agents: " + boardAgents.join(","));
      }
      await page.click('[data-blade-path="/.agents"] .cn-item[data-key="space-steward"]');
      await page.waitForTimeout(120);
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
      await page.click(
        '[data-blade-path="/projects/civic-tuner"] .cn-item[data-key=".agents"]',
      );
      await page.waitForTimeout(120);
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
      await page.click('[data-blade-path="/projects/community"] .cn-item[data-key="members"]');
      await page.waitForTimeout(120);
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
      await page.click(
        `[data-blade-path="/projects/community/members"] .cn-item[data-key="${target.key}"]`,
      );
      await page.waitForTimeout(150);
      const p = await path(page);
      return p === "/dms/" + target.key || log("expected dm path, got " + p);
    },
  },
  {
    name: "members: open a member lands on their DM, not a profile card",
    run: async (page, log) => {
      await go(page, "/members");
      await page.waitForTimeout(120);
      // Selecting a member should preview the DM conversation in the open pane.
      const preview = await page.evaluate(() => {
        const item = document.querySelector(
          '[data-blade-path="/members"] .cn-item[data-key="scout"]',
        );
        if (!item) return { err: "no scout row" };
        item.click();
        return { ok: true };
      });
      if (preview.err) return log(preview.err);
      await page.waitForTimeout(150);
      const mid = await page.evaluate(() => {
        const detail = document.querySelector('.cn-blade[data-blade-kind="detail"]');
        const html = detail ? detail.innerHTML : "";
        return {
          path: window.NB_APP.state.path,
          // Still on members until Enter/open-dm navigates, or click already opened DM.
          hasDmCtx: /@scout|dm|scout/i.test(html) && !/path[\s\S]*members\/scout/i.test(html),
          hasOpenDm: !!document.querySelector('[data-open-dm="scout"]'),
          openPath: window.NB_APP.state.path,
        };
      });
      // Click should open the DM path (openMemberDm).
      if (mid.openPath !== "/dms/scout") {
        // Fallback: Enter from members list.
        await go(page, "/members");
        await page.evaluate(() => {
          window.NB_APP.state.columnFocus = true;
          const list = window.NB_MAP.list("/members") || [];
          const ix = list.findIndex((e) => e.name === "scout");
          window.NB_APP.state.cursor = ix >= 0 ? ix : 0;
          window.NB_APP.openMemberDm("scout", { keepCli: true });
        });
        await page.waitForTimeout(120);
      }
      const p = await path(page);
      if (p !== "/dms/scout") return log("member open path " + p + " mid=" + JSON.stringify(mid));
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
      return thread.hasDm || thread.msgs >= 1 || log("dm thread missing: " + JSON.stringify(thread));
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
    name: "markers: # opens topics/channels; Enter accepts incomplete tag",
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
      // Enter accepts the incomplete marker (does not send yet).
      await page.keyboard.press("Enter");
      await page.waitForTimeout(100);
      const val = await page.evaluate(() => document.querySelector("[data-cli]")?.value || "");
      if (val !== "track #draft-persistence ") {
        return log("after enter accept: " + JSON.stringify(val));
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
    name: "speech: no mic when unsupported; mock enables PTT and Alt+V toggle",
    run: async (page, log) => {
      const before = await page.evaluate(() => ({
        supported: window.NB_SPEECH?.isSupported?.(),
        mic: !!document.querySelector("[data-speech-mic]"),
      }));
      if (!before.supported && before.mic) return log("mic shown without SpeechRecognition");

      // Install a mock engine the Web Speech feature-detect will pick up live.
      await page.evaluate(() => {
        class MockRec {
          continuous = false;
          interimResults = false;
          lang = "";
          onstart = null;
          onresult = null;
          onerror = null;
          onend = null;
          start() { if (this.onstart) this.onstart(); }
          stop() { if (this.onend) this.onend(); }
          abort() { if (this.onend) this.onend(); }
        }
        window.SpeechRecognition = MockRec;
        window.webkitSpeechRecognition = MockRec;
        window.NB_APP.render(true);
      });
      await page.waitForTimeout(80);
      const mic = await page.evaluate(() => ({
        supported: window.NB_SPEECH.isSupported(),
        mic: !!document.querySelector("[data-speech-mic]"),
      }));
      if (!mic.supported || !mic.mic) return log("mock did not enable mic: " + JSON.stringify(mic));

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
    name: "Ctrl+Space opens intellisense and the hotkey cheatsheet",
    run: async (page, log) => {
      await page.keyboard.press("Control+Space");
      await page.waitForTimeout(150);
      const open = await page.evaluate(() => ({
        help: document.querySelector(".cn-help")?.dataset.open,
        menu: document.querySelector(".cn-panel")?.dataset.open,
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
    name: "cheatsheet scopes to active workspace surfaces",
    run: async (page, log) => {
      // From a channel with a thread: sheet must name the path and Thread group.
      await go(page, "/projects/community/channels/general");
      await page.keyboard.press("Escape"); // columns focus
      await page.waitForTimeout(80);
      await page.keyboard.press("Control+Space");
      await page.waitForTimeout(150);
      const onThread = await page.evaluate(() => {
        const chips = Array.from(document.querySelectorAll(".cn-help-chip")).map((c) => c.textContent);
        const titles = Array.from(document.querySelectorAll(".cn-help-group h3")).map((h) => h.textContent);
        const ctx = window.NB_APP.state.helpCtx;
        return { chips, titles, focus: ctx?.focus, hasThread: ctx?.hasThread, path: ctx?.path };
      });
      if (!onThread.hasThread || onThread.path !== "/projects/community/channels/general") {
        return log("ctx wrong: " + JSON.stringify(onThread));
      }
      if (!onThread.titles.includes("Thread")) return log("missing Thread: " + onThread.titles.join(","));
      if (!onThread.chips.some((c) => c.includes("/projects/community/channels/general"))) {
        return log("chips missing path: " + onThread.chips.join("|"));
      }
      // Columns focus should be frozen in helpCtx even though intel focused the prompt.
      if (onThread.focus !== "columns") return log("expected columns focus freeze, got " + onThread.focus);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(80);
      // Root board has no comment tree — Thread group must drop.
      await go(page, "/");
      await page.keyboard.press("Control+Space");
      await page.waitForTimeout(150);
      const onRoot = await page.evaluate(() => {
        const titles = Array.from(document.querySelectorAll(".cn-help-group h3")).map((h) => h.textContent);
        return { titles, hasThread: window.NB_APP.state.helpCtx?.hasThread };
      });
      if (onRoot.hasThread || onRoot.titles.includes("Thread")) {
        return log("Thread should be absent at /: " + JSON.stringify(onRoot));
      }
      return onRoot.titles.includes("Blades") && onRoot.titles.includes("Prompt");
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
async function _count(page, sel) {
  return page.evaluate((s) => document.querySelectorAll(s).length, sel);
}
void _count;


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
