/**
 * Nightboard — a live board for a signed community.
 *
 * Renders only the semantic hooks in CONTRACT.md, so a theme never has to reach
 * past CSS. Nothing here knows what any theme looks like.
 *
 * The stream is live in the x.com sense: new posts arrive but never move the
 * ground under you. They queue, a notice says how many are waiting, and you
 * merge them when you choose. A feed that reflows while you are reading it is
 * the thing that pattern exists to prevent.
 */
(function () {
  "use strict";

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  };

  var D = window.NB_DATA;
  var state = {
    channel: "general",
    selected: null,
    pending: [],
    merged: [],
    nextId: 1,
    live: true,
  };

  /* ── Rendering ─────────────────────────────────────────────────────────── */

  function member(handle) {
    for (var i = 0; i < D.members.length; i++) {
      if (D.members[i].handle === handle) return D.members[i];
    }
    return { handle: handle, role: "", kind: "person" };
  }

  function postHtml(p, index) {
    var who = member(p.who);
    var subject = p.subject
      ? '<b data-c="subject">' + esc(p.subject) + "</b>"
      : "";
    var anchor = p.anchor
      ? '<span data-c="anchor">&gt; ' + esc(p.anchor) + "</span>"
      : "";
    var actions = (p.actions || [])
      .map(function (a) {
        return '<button type="button" data-c="action" data-action="' + esc(a.id) + '">' + esc(a.label) + "</button>";
      })
      .join("");
    return (
      '<article data-c="post" data-kind="' + esc(who.kind) + '" data-state="' + esc(p.state) + '"' +
      ' data-post-id="' + esc(p.id) + '" tabindex="0" role="button"' +
      ' aria-label="Post ' + index + " by " + esc(who.handle) + '">' +
      '<span data-c="control"><span data-c="key">' + String(index).padStart(2, "0") + "</span></span>" +
      '<div class="nb-post-body">' +
      '<span data-c="actor"><b data-c="handle">' + esc(who.handle) + "</b>" +
      '<span data-c="role">' + esc(who.role) + "</span></span> " +
      '<span data-c="meta"><time data-c="time">' + esc(p.at) + "</time>" +
      '<span data-c="state">' + esc(p.state) + "</span></span>" +
      subject +
      '<p data-c="body">' + esc(p.body) + "</p>" +
      anchor +
      '<span data-c="receipt"><span data-c="mark" aria-hidden="true">◆</span>' + esc(p.sig) + "</span>" +
      '<div data-c="actions">' + actions + "</div>" +
      "</div></article>"
    );
  }

  function renderStream() {
    var posts = D.posts.concat(state.merged).filter(function (p) {
      return p.channel === state.channel;
    });
    var stream = $('[data-region="stream"]');
    stream.innerHTML = posts.length
      ? posts.map(function (p, i) { return postHtml(p, i + 1); }).join("")
      : '<p data-c="body" class="nb-empty">Nothing in this channel yet.</p>';
    if (state.selected) selectPost(state.selected, { scroll: false });
  }

  function renderRail() {
    $("[data-channel-list]").innerHTML = D.channels
      .map(function (c) {
        var unread = c.id === state.channel ? 0 : c.unread || 0;
        return (
          '<button type="button" data-c="channel" data-kind="' + esc(c.kind) + '"' +
          ' data-channel="' + esc(c.id) + '"' +
          (c.id === state.channel ? ' data-state="selected" aria-current="true"' : "") +
          ">" +
          '<span data-c="sigil" aria-hidden="true">#</span>' +
          '<span data-c="label">' + esc(c.label) + "</span>" +
          (unread
            ? '<span data-c="unread" data-state="unread">' + unread + "</span>"
            : '<span data-c="count">' + (c.count || "") + "</span>") +
          "</button>"
        );
      })
      .join("");

    $("[data-member-list]").innerHTML = D.members
      .map(function (m) {
        return (
          '<button type="button" data-c="member" data-kind="' + esc(m.kind) + '"' +
          ' title="' + esc(m.detail || m.role) + '">' +
          '<span data-c="sigil" aria-hidden="true">' + (m.kind === "agent" ? "*" : "@") + "</span>" +
          '<span data-c="handle">' + esc(m.handle) + "</span>" +
          '<span data-c="state">' + esc(m.state || "") + "</span>" +
          "</button>"
        );
      })
      .join("");

    $("[data-project-list]").innerHTML = D.projects
      .map(function (p) {
        return (
          '<button type="button" data-c="project">' +
          '<span data-c="sigil" aria-hidden="true">/</span>' +
          '<span data-c="label">' + esc(p.slug) + "</span>" +
          '<span data-c="count">' + p.open + "</span></button>"
        );
      })
      .join("");
  }

  function renderNotice() {
    var region = $('[data-region="notice"]');
    var n = state.pending.length;
    region.hidden = n === 0;
    if (n === 0) return;
    region.innerHTML =
      '<button type="button" data-c="notice" data-state="pending" data-merge>' +
      '<span data-c="count">' + n + "</span> " +
      '<span data-c="label">new ' + (n === 1 ? "post" : "posts") + " — press R to load</span></button>";
  }

  function renderDetail() {
    var region = $('[data-region="detail"]');
    if (!state.selected) { region.hidden = true; return; }
    var all = D.posts.concat(state.merged);
    var p = null;
    for (var i = 0; i < all.length; i++) if (all[i].id === state.selected) p = all[i];
    if (!p) { region.hidden = true; return; }
    region.hidden = false;
    var who = member(p.who);
    region.innerHTML =
      '<div data-c="detail-head"><b>' + esc(p.subject || p.body.slice(0, 56) + "…") + "</b></div>" +
      '<dl data-c="facts">' +
      "<div><dt>by</dt><dd>" + esc(who.handle) + " · " + esc(who.role) + "</dd></div>" +
      "<div><dt>signature</dt><dd>" + esc(p.sig) + "</dd></div>" +
      (p.anchor ? "<div><dt>anchor</dt><dd>" + esc(p.anchor) + "</dd></div>" : "") +
      "<div><dt>state</dt><dd>" + esc(p.state) + "</dd></div>" +
      "</dl>" +
      '<div data-c="actions">' +
      '<button type="button" data-c="action" data-action="promote">Promote to intent</button>' +
      '<button type="button" data-c="action" data-action="anchor">Anchor to file</button>' +
      '<button type="button" data-c="action" data-action="agent">Ask an agent</button>' +
      '<button type="button" data-c="action" data-action="close" data-close-detail>Close</button>' +
      "</div>";
  }

  function renderStatus(message) {
    $("[data-status-line]").textContent =
      message || "[R] load new  [J/K] move  [1-9] open  [/] search  [T] theme  [?] keys";
    $("[data-conn]").textContent = state.live ? "live" : "snapshot";
    $("[data-conn]").dataset.state = state.live ? "live" : "snapshot";
  }

  /* ── Interaction ───────────────────────────────────────────────────────── */

  function selectPost(id, opts) {
    state.selected = id;
    var nodes = document.querySelectorAll("[data-post-id]");
    for (var i = 0; i < nodes.length; i++) {
      var on = nodes[i].dataset.postId === id;
      if (on) nodes[i].dataset.state = "selected";
      else nodes[i].dataset.state = nodes[i].dataset.baseState || nodes[i].dataset.state;
    }
    renderDetail();
    if (opts && opts.scroll === false) return;
    var el = document.querySelector('[data-post-id="' + id + '"]');
    if (el) el.scrollIntoView({ block: "nearest" });
  }

  function openChannel(id) {
    state.channel = id;
    state.selected = null;
    for (var i = 0; i < D.channels.length; i++) {
      if (D.channels[i].id === id) D.channels[i].unread = 0;
    }
    renderRail();
    renderStream();
    renderDetail();
    renderStatus("opened #" + id);
    $('[data-region="stream"]').scrollTop = $('[data-region="stream"]').scrollHeight;
  }

  function mergePending() {
    if (state.pending.length === 0) return;
    var stream = $('[data-region="stream"]');
    var atBottom = stream.scrollHeight - stream.scrollTop - stream.clientHeight < 40;
    var n = state.pending.length;
    state.merged = state.merged.concat(state.pending);
    state.pending = [];
    renderNotice();
    renderStream();
    // Only follow the tail if you were already reading it. Yanking someone from
    // where they were is the failure this whole pattern is designed around.
    if (atBottom) stream.scrollTop = stream.scrollHeight;
    renderStatus("loaded " + n + " new " + (n === 1 ? "post" : "posts"));
  }

  /** New activity, queued rather than injected. */
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
      state.pending.push(post);
      renderNotice();
    } else {
      for (var i = 0; i < D.channels.length; i++) {
        if (D.channels[i].id === post.channel) {
          D.channels[i].unread = (D.channels[i].unread || 0) + 1;
        }
      }
      state.merged.push(post);
      renderRail();
    }
  }

  function clock() {
    var d = new Date();
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  /* ── Wiring ────────────────────────────────────────────────────────────── */

  function wire() {
    document.addEventListener("click", function (e) {
      var t = e.target;
      var merge = t.closest("[data-merge]");
      if (merge) return mergePending();
      var closeDetail = t.closest("[data-close-detail]");
      if (closeDetail) { state.selected = null; renderDetail(); return; }
      var action = t.closest("[data-c='action']");
      if (action) {
        e.stopPropagation();
        // Not every action carries a name — the composer's Send is one — so fall
        // back to its label rather than reporting "undefined".
        var name = action.dataset.action || (action.textContent || "action").trim().toLowerCase();
        renderStatus(name + " — signed as @maya, recorded on the thread");
        return;
      }
      var channel = t.closest("[data-channel]");
      if (channel) return openChannel(channel.dataset.channel);
      var post = t.closest("[data-post-id]");
      if (post) return selectPost(post.dataset.postId);
      var railToggle = t.closest("[data-rail-toggle]");
      if (railToggle) {
        document.body.dataset.rail = document.body.dataset.rail === "open" ? "closed" : "open";
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.target.matches("textarea, input")) return;
      var posts = Array.prototype.slice.call(document.querySelectorAll("[data-post-id]"));
      var idx = posts.findIndex(function (p) { return p.dataset.postId === state.selected; });
      var k = e.key.toLowerCase();
      if (k === "r") { e.preventDefault(); mergePending(); }
      else if (k === "j" || e.key === "ArrowDown") { e.preventDefault(); if (posts[idx + 1]) selectPost(posts[idx + 1].dataset.postId); else if (posts[0] && idx === -1) selectPost(posts[0].dataset.postId); }
      else if (k === "k" || e.key === "ArrowUp") { e.preventDefault(); if (posts[idx - 1]) selectPost(posts[idx - 1].dataset.postId); }
      else if (k === "escape") { state.selected = null; renderDetail(); }
      else if (/^[1-9]$/.test(e.key)) { var p = posts[Number(e.key) - 1]; if (p) selectPost(p.dataset.postId); }
      else if (k === "t") { e.preventDefault(); window.NB_THEME.cycle(); }
      else if (k === "?") { renderStatus("[R] load  [J/K] move  [1-9] open  [Esc] close  [T] theme  [G] generate a theme"); }
      else if (k === "g") { e.preventDefault(); window.NB_THEME.openPanel(); }
    });

    $("[data-live-toggle]").addEventListener("click", function () {
      state.live = !state.live;
      renderStatus(state.live ? "stream resumed" : "stream paused");
    });
  }

  function boot() {
    renderRail();
    renderStream();
    renderNotice();
    renderStatus();
    wire();
    $('[data-region="stream"]').scrollTop = $('[data-region="stream"]').scrollHeight;
    setInterval(tick, 9000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.NB_APP = { renderStatus: renderStatus };
})();
