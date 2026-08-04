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
  };

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

  function render(keepCli) {
    var mount = $("[data-mount]");
    mount.dataset.exp = exp().id;
    mount.innerHTML = exp().render(state);
    wireSurface();
    if (state.cliOpen) {
      var input = $("[data-cli]");
      if (input) {
        input.value = cliValue;
        if (!keepCli) input.focus();
        paintGhost();
      }
    }
    var cur = mount.querySelector('.cn-col[data-focus="true"] .cn-item[aria-current="true"]');
    if (cur) cur.scrollIntoView({ block: "nearest" });
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
    if (n === 0) return;
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
        state.prev = state.path;
        state.path = dir;
        state.filter = "";
        var list = entries();
        var i = list.findIndex(function (e) { return e.name === parts[parts.length - 1]; });
        state.cursor = i === -1 ? 0 : i;
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

  function openCli(seed) {
    state.cliOpen = true;
    cliValue = seed || "";
    recompute();
    render();
  }

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
    if (el) { el.focus(); el.setSelectionRange(cliValue.length, cliValue.length); }
  }

  function acceptGhost() {
    var c = state.completion;
    if (!c || !c.ghost) return false;
    cliValue = cliValue + c.ghost;
    recompute();
    render(true);
    var el = $("[data-cli]");
    if (el) { el.focus(); el.setSelectionRange(cliValue.length, cliValue.length); }
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
      if (!navigate(dest || "/", { keepCli: true })) out.push("cd: no such path: " + arg);
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

  /* ── Input ─────────────────────────────────────────────────────────────── */

  function wireSurface() {
    var mount = $("[data-mount]");

    mount.querySelectorAll("[data-goto]").forEach(function (b) {
      b.addEventListener("click", function () { navigate(b.dataset.goto); });
    });
    mount.querySelectorAll("[data-view]").forEach(function (b) {
      b.addEventListener("click", function () { state.view = b.dataset.view; render(); });
    });
    mount.querySelectorAll(".cn-item").forEach(function (b) {
      b.addEventListener("click", function () {
        var col = Number(b.dataset.col);
        if (col === 0) { ascend(); return; }
        var list = visible();
        var picked = list[Number(b.dataset.i)];
        if (!picked) return;
        var all = entries();
        state.cursor = all.findIndex(function (e) { return e.name === picked.name; });
        state.focus = 1;
        if (picked.kind === "dir") navigate(picked.name);
        else { render(); descend(); }
      });
    });
    mount.querySelectorAll("[data-cand]").forEach(function (el) {
      el.addEventListener("click", function () {
        state.candIndex = Number(el.dataset.cand);
        var c = state.completion;
        cliValue = cliValue.slice(0, c.replaceFrom) + c.candidates[state.candIndex].value;
        recompute();
        render();
      });
    });

    var cli = mount.querySelector("[data-cli]");
    if (cli) {
      cli.addEventListener("input", function () {
        cliValue = cli.value;
        recompute();
        // Repaint the menu without stealing focus or resetting the caret.
        var menu = mount.querySelector(".cn-menu");
        var wrap = mount.querySelector(".cn-cli");
        if (wrap) wrap.dataset.open = String(!!(state.completion && state.completion.candidates.length > 1));
        if (menu) {
          menu.innerHTML = (state.completion ? state.completion.candidates : []).slice(0, 40)
            .map(function (c, i) {
              return '<div class="cn-cand" data-cand="' + i + '"' + (i === 0 ? ' aria-current="true"' : "") +
                '><span>' + c.value + "</span><i>" + (c.hint || "") + "</i></div>";
            }).join("");
        }
        paintGhost();
      });
      cli.addEventListener("keydown", function (ev) {
        if (ev.key === "Tab") { ev.preventDefault(); return complete(ev.shiftKey); }
        if (ev.key === "Enter") { ev.preventDefault(); return run(cli.value); }
        if (ev.key === "Escape") { ev.preventDefault(); return closeCli(); }
        if (ev.key === "ArrowRight" || ev.key === "End") {
          if (cli.selectionStart === cli.value.length && acceptGhost()) ev.preventDefault();
          return;
        }
        if (ev.key === "ArrowUp" || ev.key === "ArrowDown") {
          ev.preventDefault();
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
  }

  function wireGlobal() {
    document.addEventListener("click", function (ev) {
      if (ev.target.closest("[data-merge]")) return mergePending();
      if (ev.target.closest("[data-live-toggle]")) {
        state.live = !state.live;
        status(state.live ? "stream resumed" : "stream paused");
      }
    });

    document.addEventListener("keydown", function (ev) {
      if (state.cliOpen) return;
      if (ev.target.matches("input, textarea, select")) return;
      var k = ev.key;

      if (k === ":" || k === ">") { ev.preventDefault(); return openCli(""); }
      if (k === "/") { ev.preventDefault(); state.filter = ""; state.focus = 1; render(); return status("filter: type to narrow, Esc to clear"); }
      if (k === "Escape") { if (state.filter) { state.filter = ""; render(); } return; }
      if (k === "v") { ev.preventDefault(); var order = ["graph", "diff", "raw"]; state.view = order[(order.indexOf(state.view) + 1) % 3]; render(); return status("view: " + state.view); }
      if (k.toLowerCase() === "r") { ev.preventDefault(); return mergePending(); }
      if (k.toLowerCase() === "t") { ev.preventDefault(); return window.NB_THEME && window.NB_THEME.cycle(); }
      if (k.toLowerCase() === "g" && !ev.metaKey) { ev.preventDefault(); return window.NB_THEME && window.NB_THEME.openPanel(); }

      if (k === "ArrowDown" || k === "j") { ev.preventDefault(); return moveCursor(1); }
      if (k === "ArrowUp" || k === "k") { ev.preventDefault(); return moveCursor(-1); }
      if (k === "ArrowRight" || k === "l" || k === "Enter") { ev.preventDefault(); return descend(); }
      if (k === "ArrowLeft" || k === "h") { ev.preventDefault(); return ascend(); }
      if (k === "Home") { ev.preventDefault(); state.cursor = 0; return render(); }
      if (k === "End") { ev.preventDefault(); state.cursor = entries().length - 1; return render(); }

      // Any printable key starts an incremental filter, the way a file manager
      // does — no mode to enter, no key to remember.
      if (k.length === 1 && /[a-z0-9-]/i.test(k)) {
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

  function boot() {
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
    render();
    renderNotice();
    status();
    setInterval(tick, 9000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.NB_APP = { render: render, status: status, navigate: navigate, state: state };
})();
