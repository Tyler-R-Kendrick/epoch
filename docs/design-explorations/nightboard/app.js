/**
 * The driver.
 *
 * It owns state and the live stream; it owns no layout. Each experience renders
 * the whole surface from that state and brings its own navigation, so switching
 * experience changes how you move through the board rather than what colour it
 * is. That distinction is the entire point of this rewrite.
 */
(function () {
  "use strict";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var D = window.NB_DATA;

  var state = {
    channel: "general",
    selected: null,
    merged: [],
    pending: [],
    nextId: 1,
    live: true,
    // Per-experience navigation state. Each experience reads only its own.
    playhead: null,
    esperIndex: 0,
    esperDepth: 0,
    bearing: 0,
    panes: ["general", "ideas", "agent-runs"],
    paneFocus: 0,
    shellLog: [],
  };

  var experiences = window.NB_EXPERIENCES;
  var current = 0;
  var expStyle = document.createElement("style");
  document.head.appendChild(expStyle);

  function exp() { return experiences[current]; }

  function posts() {
    return D.posts.concat(state.merged).filter(function (p) { return p.channel === state.channel; });
  }

  /* ── Render ────────────────────────────────────────────────────────────── */

  function render() {
    var e = exp();
    var mount = $("[data-mount]");
    mount.dataset.exp = e.id;
    mount.innerHTML = e.render(state);
    if (typeof e.wire === "function") e.wire(api);
    if (state.selected) {
      var el = mount.querySelector('[data-post-id="' + state.selected + '"]');
      if (el) el.dataset.state = "selected";
    }
  }

  function setExperience(i) {
    current = (i + experiences.length) % experiences.length;
    var e = exp();
    expStyle.textContent = e.css;
    $("[data-exp-thesis]").textContent = e.thesis;
    var sel = $("[data-exp-select]");
    if (sel) sel.value = e.id;
    try { history.replaceState(null, "", "#" + e.id); } catch { /* file:// */ }
    render();
    status(e.keys);
  }

  function status(msg) {
    $("[data-status-line]").textContent = msg || exp().keys;
  }

  function renderNotice() {
    var region = $('[data-region="notice"]');
    var n = state.pending.length;
    region.hidden = n === 0;
    if (n === 0) return;
    region.innerHTML =
      '<button type="button" data-c="notice" data-state="pending" data-merge>' +
      '<span data-c="count">' + n + "</span> new " + (n === 1 ? "post" : "posts") +
      " — press R to load</button>";
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
      id: "live-" + state.nextId,
      at: clock(),
      sig: seed.sig + "-" + state.nextId,
    });
    state.nextId += 1;
    if (post.channel === state.channel) {
      // Queue rather than inject: nothing moves under the reader until asked.
      state.pending.push(post);
      renderNotice();
    } else {
      for (var i = 0; i < D.channels.length; i++) {
        if (D.channels[i].id === post.channel) {
          D.channels[i].unread = (D.channels[i].unread || 0) + 1;
        }
      }
      state.merged.push(post);
      render();
    }
  }

  function mergePending() {
    if (!state.pending.length) return;
    var n = state.pending.length;
    state.merged = state.merged.concat(state.pending);
    state.pending = [];
    renderNotice();
    render();
    status("loaded " + n + " new " + (n === 1 ? "post" : "posts"));
  }

  /* ── The API experiences are given ─────────────────────────────────────── */

  var api = {
    setPlayhead: function (fraction) {
      var ps = posts();
      if (!ps.length) return;
      var mins = ps.map(function (p) {
        var t = p.at.split(":"); return Number(t[0]) * 60 + Number(t[1]);
      });
      var lo = Math.min.apply(null, mins) - 5;
      var hi = Math.max.apply(null, mins) + 5;
      state.playhead = Math.round(lo + (hi - lo) * fraction);
      if (fraction >= 0.999) state.playhead = null;
      render();
    },
    openChannel: function (id) {
      state.channel = id;
      state.selected = null;
      state.esperIndex = 0;
      for (var i = 0; i < D.channels.length; i++) {
        if (D.channels[i].id === id) D.channels[i].unread = 0;
      }
      render();
      status("opened #" + id);
    },
    select: function (id) {
      state.selected = id;
      render();
      var p = posts().filter(function (q) { return q.id === id; })[0];
      status(p ? p.who + " · " + p.at + " · " + p.sig : exp().keys);
    },
    shell: shellCommand,
    status: status,
    state: state,
  };

  /* ── The shell experience's command language ───────────────────────────── */

  function shellCommand(raw) {
    var line = String(raw || "").trim();
    var out = state.shellLog;
    out.push('<span class="sh-echo">/' + state.channel + " $ " + line + "</span>");
    var parts = line.split(/\s+/);
    var cmd = parts[0];
    var arg = parts.slice(1).join(" ");

    if (cmd === "help" || cmd === "") {
      out.push("<b>ls</b>            list this channel\n<b>cd</b> &lt;channel&gt;  change channel\n" +
        "<b>cat</b> &lt;n&gt;       read one post in full\n<b>tail -f</b>       load queued posts\n" +
        "<b>who</b>           who is on\n<b>stat</b>          epoch status\n<b>clear</b>         clear the screen");
    } else if (cmd === "ls") {
      out.push(posts().map(function (p, i) {
        var k = window.NB_DATA.members.filter(function (m) { return m.handle === p.who; })[0];
        var cls = k && k.kind === "agent" ? "ag" : p.state === "promoted" ? "pr" : "";
        return String(i + 1).padStart(3, " ") + "  <i>" + p.at + "</i>  <span class=\"" + cls + "\">" +
          p.who.padEnd(9) + "</span> " + (p.subject || p.body).slice(0, 58);
      }).join("\n") || "<i>empty</i>");
    } else if (cmd === "cd") {
      var found = D.channels.filter(function (c) { return c.id === arg || c.label === arg; })[0];
      if (found) { api.openChannel(found.id); out.push('<span class="ok">→ /' + found.id + "</span>"); }
      else out.push("<i>no such channel: " + arg + "</i>");
    } else if (cmd === "cat") {
      var p = posts()[Number(arg) - 1];
      out.push(p
        ? "<b>" + p.who + "</b> <i>" + p.at + " · " + p.state + "</i>\n" +
          (p.subject ? "<b>" + p.subject + "</b>\n" : "") + p.body +
          (p.anchor ? "\n<i>anchor:</i> " + p.anchor : "") + "\n<i>sig:</i> " + p.sig
        : "<i>no such post</i>");
    } else if (cmd === "tail") {
      var n = state.pending.length;
      mergePending();
      out.push(n ? '<span class="ok">loaded ' + n + "</span>" : "<i>nothing queued</i>");
    } else if (cmd === "who") {
      out.push(D.members.map(function (m) {
        return (m.kind === "agent" ? '<span class="ag">*</span> ' : "@ ") + m.handle.padEnd(10) +
          "<i>" + m.role + (m.detail ? " · " + m.detail : "") + "</i>";
      }).join("\n"));
    } else if (cmd === "stat") {
      out.push("epoch <b>" + D.board.epoch + "</b>  " + D.board.landed + "/" + D.board.total +
        " landed  ships <b>" + D.board.ships + "</b>");
    } else if (cmd === "clear") {
      state.shellLog = [];
      render();
      return;
    } else {
      out.push("<i>" + cmd + ": not found — try <b>help</b></i>");
    }
    if (out.length > 200) state.shellLog = out.slice(-200);
    render();
    var pane = $("[data-shell-out]");
    if (pane) pane.scrollTop = pane.scrollHeight;
  }

  /* ── Wiring ────────────────────────────────────────────────────────────── */

  function wire() {
    var sel = $("[data-exp-select]");
    experiences.forEach(function (e) {
      var o = document.createElement("option");
      o.value = e.id; o.textContent = e.name;
      sel.appendChild(o);
    });
    sel.addEventListener("change", function () {
      experiences.forEach(function (e, i) { if (e.id === sel.value) setExperience(i); });
    });

    document.addEventListener("click", function (ev) {
      var t = ev.target;
      if (t.closest("[data-merge]")) return mergePending();
      var ch = t.closest("[data-channel]");
      if (ch) return api.openChannel(ch.dataset.channel);
      var pane = t.closest("[data-pane]");
      if (pane) { state.paneFocus = Number(pane.dataset.pane); render(); return; }
      var depth = t.closest("[data-depth]");
      if (depth) { state.esperDepth = Number(depth.dataset.depth); render(); return; }
      var post = t.closest("[data-post-id]");
      if (post) return api.select(post.dataset.postId);
      if (t.closest("[data-live-toggle]")) {
        state.live = !state.live;
        status(state.live ? "stream resumed" : "stream paused");
      }
    });

    document.addEventListener("keydown", function (ev) {
      if (ev.target.matches("input, textarea, select")) return;
      var k = ev.key.toLowerCase();
      var id = exp().id;
      var ps = posts();
      var idx = ps.findIndex(function (p) { return p.id === state.selected; });

      if (k === "r") { ev.preventDefault(); return mergePending(); }
      if (k === "t") { ev.preventDefault(); return window.NB_THEME && window.NB_THEME.cycle(); }
      if (k === "g") { ev.preventDefault(); return window.NB_THEME && window.NB_THEME.openPanel(); }
      if (ev.key === "]") { ev.preventDefault(); return setExperience(current + 1); }
      if (ev.key === "[") { ev.preventDefault(); return setExperience(current - 1); }

      // Navigation is the experience's own, which is what makes these designs
      // rather than skins.
      if (id === "scrub") {
        if (ev.key === "ArrowLeft" || ev.key === "ArrowRight") {
          ev.preventDefault();
          var cur = state.playhead == null ? 1 : 0.5;
          void cur;
          var ps2 = posts();
          var mins = ps2.map(function (p) { var t = p.at.split(":"); return Number(t[0]) * 60 + Number(t[1]); });
          var lo = Math.min.apply(null, mins) - 5, hi = Math.max.apply(null, mins) + 5;
          var now = state.playhead == null ? hi : state.playhead;
          state.playhead = Math.max(lo, Math.min(hi, now + (ev.key === "ArrowRight" ? 4 : -4)));
          if (state.playhead >= hi) state.playhead = null;
          return render();
        }
        if (ev.key === " ") { ev.preventDefault(); state.playhead = null; return render(); }
      } else if (id === "esper") {
        if (ev.key === "ArrowDown") { ev.preventDefault(); state.esperDepth = Math.min(3, state.esperDepth + 1); return render(); }
        if (ev.key === "ArrowUp") { ev.preventDefault(); state.esperDepth = Math.max(0, state.esperDepth - 1); return render(); }
        if (ev.key === "ArrowRight") { ev.preventDefault(); state.esperIndex = Math.min(ps.length - 1, state.esperIndex + 1); state.esperDepth = 0; return render(); }
        if (ev.key === "ArrowLeft") { ev.preventDefault(); state.esperIndex = Math.max(0, state.esperIndex - 1); state.esperDepth = 0; return render(); }
        if (k === "escape") { state.esperDepth = 0; return render(); }
      } else if (id === "sweep") {
        if (ev.key === "ArrowRight") { ev.preventDefault(); state.bearing += 1; return render(); }
        if (ev.key === "ArrowLeft") { ev.preventDefault(); state.bearing -= 1; return render(); }
        if (ev.key === "Enter") { ev.preventDefault(); return api.openChannel(D.channels[((state.bearing % D.channels.length) + D.channels.length) % D.channels.length].id); }
      } else if (id === "rain") {
        if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") {
          ev.preventDefault();
          var ci = D.channels.findIndex(function (c) { return c.id === state.channel; });
          var next = D.channels[(ci + (ev.key === "ArrowRight" ? 1 : -1) + D.channels.length) % D.channels.length];
          return api.openChannel(next.id);
        }
      } else if (id === "panes") {
        if (k === "s") { ev.preventDefault(); if (state.panes.length < 4) { state.panes.push(D.channels[state.panes.length % D.channels.length].id); render(); } return; }
        if (k === "w") { ev.preventDefault(); if (state.panes.length > 1) { state.panes.pop(); state.paneFocus = Math.min(state.paneFocus, state.panes.length - 1); render(); } return; }
        if (ev.key === "Tab") { ev.preventDefault(); state.paneFocus = (state.paneFocus + 1) % state.panes.length; return render(); }
        if (/^[1-9]$/.test(ev.key)) { var n = Number(ev.key) - 1; if (state.panes[n]) { state.paneFocus = n; render(); } return; }
      } else {
        // graph, tape, diff, orbit: list-shaped, so j/k and arrows walk items.
        if (k === "j" || ev.key === "ArrowDown") { ev.preventDefault(); if (ps[idx + 1]) return api.select(ps[idx + 1].id); if (idx === -1 && ps[0]) return api.select(ps[0].id); }
        if (k === "k" || ev.key === "ArrowUp") { ev.preventDefault(); if (ps[idx - 1]) return api.select(ps[idx - 1].id); }
        if (ev.key === "ArrowRight" && id === "tape") { ev.preventDefault(); if (ps[idx + 1]) return api.select(ps[idx + 1].id); }
        if (ev.key === "ArrowLeft" && id === "tape") { ev.preventDefault(); if (ps[idx - 1]) return api.select(ps[idx - 1].id); }
      }
    });
  }

  function boot() {
    wire();
    var want = experiences.findIndex(function (e) { return "#" + e.id === location.hash; });
    setExperience(want > -1 ? want : 0);
    renderNotice();
    setInterval(tick, 9000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.NB_APP = { render: render, status: status, setExperience: setExperience };
})();
