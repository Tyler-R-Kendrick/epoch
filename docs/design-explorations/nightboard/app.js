/**
 * The driver.
 *
 * One navigation model, three input methods that are peers rather than a
 * primary and two fallbacks:
 *
 *   keyboard   ←→ column, ↑↓ entry, Enter descend, : command, / filter, v view
 *   pointer    every entry, breadcrumb and view chip is a real button
 *   touch      columns scroll-snap horizontally; entries are ≥32px targets
 *
 * The command line is not a separate mode that replaces the columns — it moves
 * the same cursor. Typing `cd ideas` and clicking `ideas` end in exactly the
 * same place, because both call navigate().
 */
(function () {
  "use strict";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var D = window.NB_DATA;
  var MAP = window.NB_MAP;

  var state = {
    path: "/channels/general",
    cursor: 0,
    focus: 1,
    view: "graph",
    filter: "",
    merged: [],
    pending: [],
    nextId: 1,
    live: true,
    cliOpen: false,
    completion: null,
    candIndex: 0,
    history: [],
    histIndex: -1,
    out: [],
    prev: "/",
    ai: true,
    events: [],
    busy: false,
  };

  var themeStyle = document.createElement("style");
  document.head.appendChild(themeStyle);
  var themeIndex = 0;

  var TOKEN_OF = {
    bg: "--nb-bg", surface: "--nb-surface", ink: "--nb-ink", inkDim: "--nb-ink-dim",
    inkFaint: "--nb-ink-faint", rule: "--nb-rule", accent: "--nb-accent",
    accentInk: "--nb-accent-ink", signed: "--nb-signed", live: "--nb-live",
    warn: "--nb-warn", danger: "--nb-danger", agent: "--nb-agent",
  };

  function setTheme(i) {
    themeIndex = (i + window.NB_THEMES.length) % window.NB_THEMES.length;
    var t = window.NB_THEMES[themeIndex];
    themeStyle.textContent = t.css;
    document.body.dataset.theme = t.name;
    var n = $("[data-theme-name]"); if (n) n.textContent = t.name;
    var note = $("[data-theme-note]"); if (note) note.textContent = t.note;
    var sel = $("[data-theme-select]"); if (sel) sel.value = t.id;
  }

  /**
   * Apply generated tokens over the current theme.
   *
   * Partial is fine and expected: anything the agent omits keeps its current
   * value, so "make the accent blue" changes one thing rather than demanding a
   * complete palette. Values are validated here because a schema the page did
   * not enforce is not a safety measure.
   */
  function applyTokens(tokens, label) {
    var hex = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
    var css = [];
    var taken = 0;
    Object.keys(tokens || {}).forEach(function (k) {
      var name = TOKEN_OF[k] || (k.indexOf("--") === 0 ? k : null);
      if (!name) return;
      var v = String(tokens[k]).trim();
      if (!hex.test(v)) return;
      css.push(name + ":" + v);
      taken += 1;
    });
    if (!taken) return 0;
    themeStyle.textContent = window.NB_THEMES[themeIndex].css + ":root{" + css.join(";") + "}";
    document.body.dataset.theme = label || "custom";
    var n = $("[data-theme-name]"); if (n) n.textContent = label || "custom";
    return taken;
  }

  var experiences = window.NB_EXPERIENCES;
  var current = 0;
  var expStyle = document.createElement("style");
  document.head.appendChild(expStyle);
  var cliValue = "";

  function exp() { return experiences[current]; }
  function entries() { return MAP.list(state.path, state.merged) || []; }

  function visible() {
    var all = entries();
    if (!state.filter) return all;
    return all.filter(function (e) {
      return window.NB_COMPLETE.score(e.name, state.filter) !== null;
    });
  }

  /* ── Render ────────────────────────────────────────────────────────────── */

  var lastScrolled = null;

  function render(keepCli) {
    var mount = $("[data-mount]");
    mount.dataset.exp = exp().id;
    // Morph, don't replace. A node that did not change survives the render —
    // and with it everything the browser hangs off a node: focus and caret,
    // scroll position, hover state, and any animation mid-flight. The old
    // innerHTML swap destroyed all of that on every live tick, which is what
    // made the surface flicker and motion impossible.
    window.NB_MORPH.morph(mount, exp().render(state));
    var input = $("[data-cli]");
    if (input) {
      // The input's value is state the user owns; render only touches it when
      // the program changed cliValue underneath (Enter clearing it, Tab
      // completing it). While typing the two are already equal.
      if (input.value !== cliValue) {
        input.value = cliValue;
        if (document.activeElement === input) {
          try { input.setSelectionRange(cliValue.length, cliValue.length); } catch { /* fine */ }
        }
      }
      paintGhost();
      if (!state.columnFocus && !keepCli && document.activeElement !== input) input.focus({ preventScroll: true });
    }
    // Scroll only when the selection actually moved, and only the column's own
    // pane. scrollIntoView walks every scrollable ancestor — during load, when
    // layout is still settling, that includes the page itself, which it then
    // leaves permanently mis-scrolled with the header off-screen.
    var cur = mount.querySelector('.cn-col[data-focus="true"] .cn-item[aria-current="true"]');
    if (cur && cur !== lastScrolled) {
      var pane = cur.closest(".cn-col-body");
      if (pane) {
        var top = cur.getBoundingClientRect().top - pane.getBoundingClientRect().top + pane.scrollTop;
        if (top < pane.scrollTop) pane.scrollTop = top;
        else if (top + cur.offsetHeight > pane.scrollTop + pane.clientHeight) {
          pane.scrollTop = top + cur.offsetHeight - pane.clientHeight;
        }
      }
    }
    lastScrolled = cur;
  }

  /** Move the menu highlight without re-rendering the input under the caret. */
  function highlightCandidate() {
    var menu = document.querySelector(".cn-menu");
    if (!menu) return;
    Array.prototype.forEach.call(menu.children, function (el, i) {
      if (i === state.candIndex) {
        el.setAttribute("aria-current", "true");
        el.scrollIntoView({ block: "nearest" });
      } else {
        el.removeAttribute("aria-current");
      }
    });
  }

  function paintGhost() {
    var input = $("[data-cli]");
    var ghost = $("[data-ghost]");
    if (!input || !ghost) return;
    var c = state.completion;
    ghost.textContent = c && c.ghost ? input.value + c.ghost : "";
  }

  function status(msg) {
    $("[data-status-line]").textContent = msg || exp().keys;
  }

  function renderNotice() {
    var region = $('[data-region="notice"]');
    var n = state.pending.length;
    region.hidden = n === 0;
    if (n === 0) { region.innerHTML = ""; return; }
    // Update in place once shown: rebuilding the button on every arriving post
    // would restart its entrance animation, and a notice that flashes on each
    // tick reads as an alarm rather than a count.
    var count = region.querySelector('[data-c="count"]');
    if (count) { count.textContent = n; return; }
    region.innerHTML = '<button type="button" data-c="notice" data-state="pending" data-merge>' +
      '<span data-c="count">' + n + "</span> new " + (n === 1 ? "post" : "posts") +
      " — press R to load</button>";
  }

  /* ── Navigation ────────────────────────────────────────────────────────── */

  function navigate(path, opts) {
    var target = MAP.resolve(state.path, path);
    if (!MAP.isDir(target, state.merged)) {
      // A file path selects its entry in the parent directory rather than
      // failing, because "cd" to a thing you can see should go there.
      var parts = MAP.split(target);
      var dir = MAP.join(parts.slice(0, -1));
      if (MAP.isDir(dir, state.merged)) {
        // Only a leaf that actually exists counts as arriving. Reporting
        // success for a name that is not there made every caller believe a
        // typo had worked, which is why `cd bugs` silently did nothing.
        var probe = MAP.list(dir, state.merged) || [];
        var leaf = parts[parts.length - 1];
        var found = probe.findIndex(function (e) { return e.name === leaf; });
        if (found === -1) return false;
        state.prev = state.path;
        state.path = dir;
        state.filter = "";
        state.cursor = found;
        state.focus = 1;
        render(opts && opts.keepCli);
        return true;
      }
      return false;
    }
    state.prev = state.path;
    state.path = target;
    state.cursor = 0;
    state.filter = "";
    state.focus = 1;
    render(opts && opts.keepCli);
    return true;
  }

  function moveCursor(delta) {
    var list = visible();
    if (!list.length) return;
    var all = entries();
    var currentName = all[state.cursor] ? all[state.cursor].name : null;
    var vi = list.findIndex(function (e) { return e.name === currentName; });
    if (vi === -1) vi = 0;
    var next = Math.max(0, Math.min(list.length - 1, vi + delta));
    state.cursor = all.findIndex(function (e) { return e.name === list[next].name; });
    render();
  }

  function descend() {
    var list = entries();
    var e = list[state.cursor];
    if (!e) return;
    if (e.kind === "dir") navigate(e.name);
    else {
      state.focus = 2;
      render();
      status(e.hint ? e.name + " · " + e.hint : e.name);
    }
  }

  function ascend() {
    if (MAP.split(state.path).length === 0) return;
    var leaving = MAP.split(state.path).slice(-1)[0];
    navigate("..");
    var list = entries();
    var i = list.findIndex(function (x) { return x.name === leaving; });
    if (i !== -1) { state.cursor = i; render(); }
  }

  /* ── Live stream ───────────────────────────────────────────────────────── */

  function clock() {
    var d = new Date();
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  function tick() {
    if (!state.live) return;
    var seed = D.incoming[(state.nextId - 1) % D.incoming.length];
    var post = Object.assign({}, seed, {
      id: "live-" + state.nextId, at: clock(), sig: seed.sig + "-" + state.nextId,
    });
    state.nextId += 1;
    var hereChannel = MAP.split(state.path);
    var watching = hereChannel[0] === "channels" && hereChannel[1];
    var chan = D.channels.filter(function (c) { return c.id === post.channel; })[0];
    if (chan && watching === chan.label) {
      state.pending.push(post);
      renderNotice();
    } else {
      if (chan) chan.unread = (chan.unread || 0) + 1;
      state.merged.push(post);
      render(true);
    }
  }

  function mergePending() {
    if (!state.pending.length) return;
    var n = state.pending.length;
    state.merged = state.merged.concat(state.pending);
    state.pending = [];
    renderNotice();
    render(true);
    status("loaded " + n + " new " + (n === 1 ? "post" : "posts"));
  }

  /* ── Command line ──────────────────────────────────────────────────────── */

  function closeCli() {
    state.cliOpen = false;
    state.completion = null;
    cliValue = "";
    render();
    status();
  }

  function recompute() {
    state.completion = window.NB_COMPLETE.analyse(cliValue, {
      cwd: state.path, extra: state.merged,
    });
    state.candIndex = 0;
  }

  /** Tab: complete the unambiguous part first, then cycle. */
  function complete(shift) {
    var c = state.completion;
    if (!c || !c.candidates.length) return;
    var input = $("[data-cli]");
    var head = cliValue.slice(0, c.replaceFrom);
    if (c.insert && c.insert.length > c.query.length && !shift) {
      cliValue = head + c.insert;
    } else {
      var n = c.candidates.length;
      state.candIndex = ((state.candIndex + (shift ? -1 : 1)) % n + n) % n;
      cliValue = head + c.candidates[state.candIndex].value;
    }
    input.value = cliValue;
    recompute();
    render(true);
    var el = $("[data-cli]");
    if (el) { el.focus({ preventScroll: true }); el.setSelectionRange(cliValue.length, cliValue.length); }
  }

  function acceptGhost() {
    var c = state.completion;
    if (!c || !c.ghost) return false;
    cliValue = cliValue + c.ghost;
    recompute();
    render(true);
    var el = $("[data-cli]");
    if (el) { el.focus({ preventScroll: true }); el.setSelectionRange(cliValue.length, cliValue.length); }
    return true;
  }

  function run(line) {
    var text = String(line || "").trim();
    if (text === "") { closeCli(); return; }
    state.history.push(text);
    state.histIndex = -1;
    var parts = text.split(/\s+/);
    var cmd = parts[0];
    var arg = parts.slice(1).join(" ");
    var out = state.out;

    if (cmd === "cd") {
      var dest = arg === "-" ? state.prev : arg;
      if (!navigate(dest || "/", { keepCli: true })) {
        // Completion already resolves `bugs` to /channels/bugs from anywhere;
        // execution refusing the same input made the two disagree, which reads
        // as the completion lying. One resolver, one answer.
        var guess = window.NB_COMPLETE.analyse("cd " + dest, { cwd: state.path, extra: state.merged });
        var best = guess && guess.candidates && guess.candidates[0];
        if (best && navigate(best.value, { keepCli: true })) {
          out.push("cd: " + dest + " → " + state.path);
        } else {
          out.push("cd: no such path: " + dest);
        }
      }
    } else if (cmd === "ls") {
      var l = MAP.list(MAP.resolve(state.path, arg || "."), state.merged);
      out.push(l ? l.map(function (e) { return (e.kind === "dir" ? "▸ " : "  ") + e.name; }).join("  ") : "ls: not a directory");
    } else if (cmd === "cat") {
      var p = MAP.postAt(MAP.resolve(state.path, arg), state.merged);
      out.push(p ? "<b>" + p.who + "</b> " + p.at + " · " + p.state + "\n" + p.body + "\nsig: " + p.sig
        : "cat: not a readable entry");
    } else if (cmd === "view") {
      if (["graph", "diff", "raw"].indexOf(arg) !== -1) { state.view = arg; out.push("view: " + arg); }
      else out.push("view: graph | diff | raw");
    } else if (cmd === "find") {
      var hits = [];
      ["/channels", "/members", "/projects"].forEach(function (root) {
        (MAP.list(root, state.merged) || []).forEach(function (e) {
          if (window.NB_COMPLETE.score(e.name, arg) !== null) hits.push(root + "/" + e.name);
          if (e.kind === "dir") {
            (MAP.list(root + "/" + e.name, state.merged) || []).forEach(function (f) {
              if (window.NB_COMPLETE.score(f.name, arg) !== null) hits.push(root + "/" + e.name + "/" + f.name);
            });
          }
        });
      });
      out.push(hits.length ? hits.slice(0, 12).join("\n") : "find: nothing matched");
    } else if (cmd === "grep") {
      var g = D.posts.concat(state.merged).filter(function (q) {
        return (q.body + " " + (q.subject || "")).toLowerCase().indexOf(arg.toLowerCase()) !== -1;
      });
      out.push(g.length ? g.slice(0, 8).map(function (q) {
        return q.channel + "/" + q.who + ": " + (q.subject || q.body).slice(0, 60);
      }).join("\n") : "grep: no matches");
    } else if (cmd === "tail") {
      var n = state.pending.length; mergePending();
      out.push(n ? "loaded " + n : "nothing queued");
    } else if (cmd === "watch") {
      state.live = true; out.push("stream resumed");
    } else if (cmd === "stat") {
      out.push("epoch <b>" + D.board.epoch + "</b> · " + D.board.landed + "/" + D.board.total +
        " landed · ships " + D.board.ships);
    } else if (cmd === "help") {
      out.push(window.NB_COMPLETE.COMMANDS.map(function (c) {
        return "<b>" + c.name + "</b>" + (c.arg ? " <" + c.arg + ">" : "") + "  " + c.help;
      }).join("\n"));
    } else if (cmd === "clear") {
      state.out = [];
    } else {
      out.push(cmd + ": not found — try help");
    }
    if (state.out.length > 40) state.out = state.out.slice(-40);
    cliValue = "";
    recompute();
    render();
  }

  /** Render AG-UI events into the transcript above the prompt. */
  function onEvent(ev) {
    var E = window.NB_AGENT.EVENT;
    var line = null;
    if (ev.type === E.RUN_STARTED) line = ["›", ev.input];
    else if (ev.type === "PROGRESS") line = ["…", ev.message];
    else if (ev.type === E.TOOL_CALL_ARGS) {
      var a = ev.args || {};
      line = [a.tool, a.path || a.mode || a.text || (a.tokens ? Object.keys(a.tokens).length + " colours" : "")];
    } else if (ev.type === E.TOOL_CALL_RESULT) line = [ev.ok ? "ok" : "failed", ev.content];
    else if (ev.type === E.TEXT_MESSAGE_CONTENT) line = ["", ev.delta];
    else if (ev.type === E.RUN_ERROR) line = ["error", ev.message];
    if (!line) return;
    state.events.push({ type: ev.type, a: line[0], b: line[1] });
    if (state.events.length > 24) state.events = state.events.slice(-24);
    state.out = state.events.map(function (e) {
      return '<span class="cn-ev" data-ev="' + e.type + '"><b>' + e.a + "</b><span>" + e.b + "</span></span>";
    });
    render(true);
    var pane = $(".cn-out");
    if (pane) pane.scrollTop = pane.scrollHeight;
  }

  async function ask(text) {
    if (state.busy) return;
    state.busy = true;
    var here = (MAP.list(state.path, state.merged) || []).map(function (e) { return e.name; });
    try {
      await window.NB_AGENT.run(text, {
        cwd: state.path, here: here, signal: undefined,
      }, onEvent);
    } finally {
      state.busy = false;
      focusCli();
    }
  }

  /** Does this line already name a command the console can run itself? */
  function isCommand(text) {
    var first = String(text || "").trim().split(/\s+/)[0];
    if (!first) return false;
    return window.NB_COMPLETE.COMMANDS.some(function (c) { return c.name === first; });
  }

  function focusCli() {
    var el = $("[data-cli]");
    if (el) { el.focus({ preventScroll: true }); el.setSelectionRange(el.value.length, el.value.length); }
  }

  /* ── Input ─────────────────────────────────────────────────────────────── */

  /**
   * One delegated listener per event type, attached once at boot.
   *
   * With morphing, nodes persist across renders — re-attaching listeners per
   * render (the old model) would stack a new handler on the same button every
   * frame. Delegation also means a node inserted by the morph is live the
   * moment it exists, with nothing to wire.
   */
  function wireMount() {
    var mount = $("[data-mount]");

    mount.addEventListener("click", function (ev) {
      var go = ev.target.closest("[data-goto]");
      if (go) return navigate(go.dataset.goto);
      var view = ev.target.closest("[data-view]");
      if (view) { state.view = view.dataset.view; return render(); }
      var candEl = ev.target.closest("[data-cand]");
      if (candEl) {
        state.candIndex = Number(candEl.dataset.cand);
        var c = state.completion;
        cliValue = cliValue.slice(0, c.replaceFrom) + c.candidates[state.candIndex].value;
        recompute();
        return render();
      }
      var item = ev.target.closest(".cn-item");
      if (item) {
        var col = Number(item.dataset.col);
        if (col === 0) return ascend();
        var list = visible();
        var picked = list[Number(item.dataset.i)];
        if (!picked) return;
        var all = entries();
        state.cursor = all.findIndex(function (e) { return e.name === picked.name; });
        state.focus = 1;
        if (picked.kind === "dir") navigate(picked.name);
        else { render(); descend(); }
      }
    });

    mount.addEventListener("input", function (ev) {
      var cli = ev.target;
      if (!cli.hasAttribute || !cli.hasAttribute("data-cli")) return;
      cliValue = cli.value;
      recompute();
      // Repaint the menu without stealing focus or resetting the caret.
      var menu = mount.querySelector(".cn-menu");
      var wrap = mount.querySelector(".cn-cli");
      if (wrap) wrap.dataset.open = String(!!(state.completion && state.completion.candidates.length > 1));
      state.candIndex = 0;
      if (menu) {
        menu.innerHTML = (state.completion ? state.completion.candidates : []).slice(0, 40)
          .map(function (c, i) {
            return '<div class="cn-cand" data-cand="' + i + '"' + (i === 0 ? ' aria-current="true"' : "") +
              '><span>' + c.value + "</span><i>" + (c.hint || "") + "</i></div>";
          }).join("");
      }
      paintGhost();
    });

    mount.addEventListener("keydown", function (ev) {
      var cli = ev.target;
      if (!cli.hasAttribute || !cli.hasAttribute("data-cli")) return;
      if (ev.key === "Tab") { ev.preventDefault(); return complete(ev.shiftKey); }
      if (ev.key === "Enter") {
        ev.preventDefault();
        var cc = state.completion;
        // A highlighted candidate is a choice already made; Enter accepts it
        // rather than running a half-typed line.
        if (cc && cc.candidates.length > 1 && state.candIndex > 0) {
          cliValue = cliValue.slice(0, cc.replaceFrom) + cc.candidates[state.candIndex].value;
          cli.value = cliValue;
          recompute();
          render(true);
          focusCli();
          return;
        }
        var text = cli.value;
        cliValue = "";
        cli.value = "";
        recompute();
        // AI mode is a superset of CLI, not a replacement. Anything that is
        // already a valid command runs directly: sending `cd ..` to a model
        // is slower, less reliable, and fails outright while the model is
        // still downloading. Interpretation is for input that needs it.
        if (state.ai && !isCommand(text)) { render(true); return ask(text); }
        return run(text);
      }
      if (ev.key === "Escape") {
        ev.preventDefault();
        // Esc hands steering to the columns; it does not close anything,
        // because the prompt is the default place to be.
        state.columnFocus = true;
        cli.blur();
        return status("columns — ←→↑↓ to move, i or : to return to the prompt");
      }
      if (ev.altKey && ev.key.toLowerCase() === "a") {
        ev.preventDefault();
        state.ai = !state.ai;
        render(true);
        return status(state.ai
          ? "ai — your words are interpreted, bad commands repaired"
          : "cli — your words are commands");
      }
      if (ev.key === "ArrowRight" || ev.key === "End") {
        if (cli.selectionStart === cli.value.length && acceptGhost()) ev.preventDefault();
        return;
      }
      if (ev.key === "ArrowUp" || ev.key === "ArrowDown") {
        ev.preventDefault();
        var c = state.completion;
        // With a menu open, the arrows belong to the menu; history is what
        // they mean only when there is nothing to choose between.
        if (c && c.candidates.length > 1) {
          var n = c.candidates.length;
          state.candIndex = ((state.candIndex + (ev.key === "ArrowDown" ? 1 : -1)) % n + n) % n;
          highlightCandidate();
          return;
        }
        if (!state.history.length) return;
        var dir = ev.key === "ArrowUp" ? 1 : -1;
        state.histIndex = Math.max(-1, Math.min(state.history.length - 1, state.histIndex + dir));
        cliValue = state.histIndex === -1 ? "" : state.history[state.history.length - 1 - state.histIndex];
        cli.value = cliValue;
        recompute();
        paintGhost();
      }
    });
  }

  function wireGlobal() {
    document.addEventListener("click", function (ev) {
      if (ev.target.closest("[data-merge]")) return mergePending();
      if (ev.target.closest("[data-mode-toggle]")) {
        state.ai = !state.ai;
        state.columnFocus = false;
        render();
        focusCli();
        return status(state.ai
          ? "ai — your words are interpreted, bad commands repaired"
          : "cli — your words are commands");
      }
      if (ev.target.closest("[data-live-toggle]")) {
        state.live = !state.live;
        status(state.live ? "stream resumed" : "stream paused");
      }
    });

    document.addEventListener("keydown", function (ev) {
      if (ev.target.matches("input, textarea, select")) return;
      var k = ev.key;

      if (ev.altKey && k.toLowerCase() === "a") {
        ev.preventDefault();
        state.ai = !state.ai;
        state.columnFocus = false;
        render();
        return status(state.ai ? "ai — words are interpreted" : "cli — words are commands");
      }
      // Anything that is not steering hands focus back to the prompt, so the
      // input is where you are by default and returning is one key.
      if (k === ":" || k === "i" || k === ">") {
        ev.preventDefault();
        state.columnFocus = false;
        render();
        return focusCli();
      }
      if (k === "/") { ev.preventDefault(); state.filter = ""; state.focus = 1; render(); return status("filter: type to narrow, Esc to clear"); }
      if (k === "Escape") {
        if (state.filter) { state.filter = ""; render(true); return; }
        state.columnFocus = false; render(); return focusCli();
      }
      if (k === "v") { ev.preventDefault(); var order = ["graph", "diff", "raw"]; state.view = order[(order.indexOf(state.view) + 1) % 3]; render(); return status("view: " + state.view); }
      if (k.toLowerCase() === "r") { ev.preventDefault(); return mergePending(); }
      if (k.toLowerCase() === "t" && state.columnFocus) { ev.preventDefault(); return setTheme(themeIndex + 1); }

      if (k === "ArrowDown" || k === "j") { ev.preventDefault(); state.columnFocus = true; return moveCursor(1); }
      if (k === "ArrowUp" || k === "k") { ev.preventDefault(); state.columnFocus = true; return moveCursor(-1); }
      if (k === "ArrowRight" || k === "l" || k === "Enter") { ev.preventDefault(); return descend(); }
      if (k === "ArrowLeft" || k === "h") { ev.preventDefault(); return ascend(); }
      if (k === "Home") { ev.preventDefault(); state.cursor = 0; return render(); }
      if (k === "End") { ev.preventDefault(); state.cursor = entries().length - 1; return render(); }

      // Any printable key starts an incremental filter, the way a file manager
      // does — no mode to enter, no key to remember.
      if (k.length === 1 && /[a-z0-9-]/i.test(k) && state.columnFocus) {
        state.filter += k;
        state.cursor = 0;
        render();
        status("filter: " + state.filter);
      }
      if (k === "Backspace" && state.filter) {
        ev.preventDefault();
        state.filter = state.filter.slice(0, -1);
        render();
        status(state.filter ? "filter: " + state.filter : "");
      }
    });
  }

  /**
   * Acquire the model as early as the browser permits.
   *
   * Chrome refuses `LanguageModel.create()` without a user gesture while the
   * model still needs downloading — "Requires a user gesture when availability
   * is downloading or downloadable" — so warming unconditionally at load fails
   * on a first visit and succeeds on every visit after, which is a confusing
   * thing to ship. Once it is cached, availability reports "available" and it
   * warms with no interaction at all.
   *
   * Either way it happens once and the session is reused for every turn.
   */
  async function warmModel() {
    if (!window.NB_AGENT || !window.NB_AGENT.warm) return;
    var avail = await window.NBResilient.availability();

    if (avail === "absent" || avail === "unavailable") {
      state.ai = false;
      render(true);
      return status("no on-device model here — cli mode, Alt+A to switch");
    }

    if (avail === "available") {
      status("loading the on-device model…");
      await window.NB_AGENT.warm(function (m) { if (!state.busy) status(m); });
      var st = window.NBResilient.modelState();
      if (st.state !== "ready") { state.ai = false; render(true); }
      return status(st.state === "ready"
        ? "model ready — ai mode. Alt+A for cli."
        : "model unavailable (" + (st.error || "unknown") + ") — cli mode, Alt+A to switch");
    }

    // Needs downloading, so it needs a gesture. Say so plainly and take the
    // first one that arrives rather than nagging.
    status("ai needs to fetch the on-device model once — press any key or click to start");
    var armed = false;
    var start = async function () {
      if (armed) return;
      armed = true;
      window.removeEventListener("keydown", start, true);
      window.removeEventListener("pointerdown", start, true);
      status("fetching the on-device model, once…");
      await window.NB_AGENT.warm(function (m) { if (!state.busy) status(m); });
      var st2 = window.NBResilient.modelState();
      if (st2.state !== "ready") { state.ai = false; render(true); }
      status(st2.state === "ready"
        ? "model ready — ai mode. Alt+A for cli."
        : "model unavailable (" + (st2.error || "unknown") + ") — cli mode, Alt+A to switch");
    };
    window.addEventListener("keydown", start, true);
    window.addEventListener("pointerdown", start, true);
  }

  function boot() {
    setTheme(0);
    warmModel();
    var tsel = $("[data-theme-select]");
    if (tsel) {
      window.NB_THEMES.forEach(function (t) {
        var o = document.createElement("option");
        o.value = t.id; o.textContent = t.name;
        tsel.appendChild(o);
      });
      tsel.value = window.NB_THEMES[0].id;
      tsel.addEventListener("change", function () {
        window.NB_THEMES.forEach(function (t, i) { if (t.id === tsel.value) setTheme(i); });
      });
    }
    expStyle.textContent = exp().css;
    $("[data-exp-thesis]").textContent = exp().thesis;
    var sel = $("[data-exp-select]");
    if (sel) {
      experiences.forEach(function (e) {
        var o = document.createElement("option");
        o.value = e.id; o.textContent = e.name;
        sel.appendChild(o);
      });
      sel.value = exp().id;
    }
    wireGlobal();
    wireMount();
    render();
    renderNotice();
    status();
    setInterval(tick, 9000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  // The API the WebMCP tools close over. Every entry is the verb the UI itself
  // calls, so a tool cannot drift from the button it mirrors.
  window.NB_APP = {
    render: render, status: status, navigate: navigate, state: state,
    setView: function (v) { state.view = v; render(true); },
    setTheme: setTheme,
    applyTokens: applyTokens,
    mergePending: mergePending,
    setLive: function (on) { state.live = on; },
    run: run,
  };

  // Tools are registered once the app exists, because they call into it.
  if (window.NB_TOOLS) {
    var registered = window.NB_TOOLS.install(window.NB_APP);
    var native = window.NB_MCP.isNative();
    // Recorded rather than announced: the count matters when a tool goes
    // missing, and the native/shim distinction matters when debugging why a
    // browser agent cannot see them.
    window.NB_APP.toolCount = registered;
    window.NB_APP.toolHost = native ? "document.modelContext" : "in-page registry";
    // The cold-start banner states only facts the board can actually assert —
    // its name, its epoch and how many tools are really registered — which is
    // why it can be drawn at all. It is written after tools install because
    // the count is one of those facts.
    state.out.unshift(window.NB_ASCII.banner(
      { name: window.NB_DATA.board.name, node: state.path, epoch: window.NB_DATA.board.epoch,
        landed: window.NB_DATA.board.landed, total: window.NB_DATA.board.total,
        ships: window.NB_DATA.board.ships },
      registered, window.NB_APP.toolHost,
      Math.floor(Math.min(document.documentElement.clientWidth, 640) / 10) - 4,
    ));
    render();
  }
})();
