/**
 * Ten experiences, not ten skins.
 *
 * The last version was one shell in ten palettes: same rail, same stream, same
 * keys, different colours. That is a theme, and calling it a design is the lie
 * this file exists to stop telling.
 *
 * An experience here owns its own markup and its own navigation. What it
 * inherits is the vocabulary — the semantic hooks in CONTRACT.md and the token
 * contract — so themes still apply across all of them, but *how you move* and
 * *what leads* genuinely differ. If two entries navigate the same way, one of
 * them should not exist.
 *
 * Each exports:
 *   css     scoped to [data-exp="<id>"]
 *   render  (state) -> html for the whole surface
 *   wire    (api) -> optional keyboard/interaction beyond clicking
 *   keys    the help line for the command bar
 */
(function () {
  "use strict";

  var D = window.NB_DATA;
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  };
  var who = function (h) {
    for (var i = 0; i < D.members.length; i++) if (D.members[i].handle === h) return D.members[i];
    return { handle: h, role: "", kind: "person" };
  };
  var postsIn = function (state, channel) {
    return D.posts.concat(state.merged).filter(function (p) {
      return p.channel === (channel || state.channel);
    });
  };

  /** Shared bits of vocabulary. Not a layout — just phrases every dialect uses. */
  function actorLine(p) {
    var m = who(p.who);
    return (
      '<span data-c="actor"><b data-c="handle">' + esc(m.handle) + "</b>" +
      '<span data-c="role">' + esc(m.role) + "</span></span>" +
      '<span data-c="meta"><time data-c="time">' + esc(p.at) + "</time>" +
      '<span data-c="state">' + esc(p.state) + "</span></span>"
    );
  }
  function receipt(p) {
    return '<span data-c="receipt"><span data-c="mark" aria-hidden="true">◆</span>' + esc(p.sig) + "</span>";
  }

  var E = [];
  var add = function (x) { E.push(x); };

  /* ══ 1 · GRAPH ═══════════════════════════════════════════════════════════
     The feed is a commit graph. Every post is a node on a branch; promoting a
     message forks a branch that visibly diverges and merges back at the epoch.
     You navigate the graph, not a list: j/k walk nodes, h/l change branch. The
     product's whole claim — talk becomes signed work — is the graph's shape. */
  add({
    id: "graph",
    name: "Graph",
    thesis: "The stream is a commit graph. Branches fork when talk becomes work and merge at the epoch; you walk nodes and lanes, not a list.",
    keys: "[J/K] node  [H/L] lane  [Enter] open  [R] load",
    css: `
    [data-exp="graph"]{display:grid;grid-template-rows:auto minmax(0,1fr) auto;height:100%}
    [data-exp="graph"] .gx-head{display:flex;gap:1.2rem;align-items:baseline;padding:.6rem 1rem;
      border-block-end:1px solid var(--nb-rule)}
    [data-exp="graph"] .gx-lanes{display:flex;gap:.5rem;margin-inline-start:auto;flex-wrap:wrap}
    [data-exp="graph"] .gx-lane{padding:0 .5rem;border:1px solid var(--nb-rule);cursor:pointer;font-size:.85em}
    [data-exp="graph"] .gx-lane[aria-pressed=true]{background:var(--nb-accent);color:var(--nb-accent-ink);border-color:var(--nb-accent)}
    [data-exp="graph"] .gx-body{overflow:auto;padding:.4rem 0}
    /* The spine is drawn, not typed. Box-drawing characters cannot connect
       across rows of different heights, and a column of unjoined dots reads as
       a bulleted list — the one thing this design must not look like. */
    [data-exp="graph"] .gx-row{position:relative;display:grid;grid-template-columns:5.5rem minmax(0,1fr);
      gap:1rem;padding:.45rem 1rem;cursor:pointer}
    [data-exp="graph"] .gx-row::before{content:"";position:absolute;inset-block:0;
      inset-inline-start:2rem;width:2px;background:var(--nb-rule)}
    [data-exp="graph"] .gx-row:first-child::before{inset-block-start:50%}
    [data-exp="graph"] .gx-row:last-child::before{inset-block-end:50%}
    [data-exp="graph"] .gx-row:hover{background:var(--nb-surface)}
    [data-exp="graph"] .gx-row[data-state=selected]{background:var(--nb-surface)}
    [data-exp="graph"] .gx-dot{position:relative;z-index:1;justify-self:start;margin-inline-start:1.35rem;
      margin-block-start:.35rem;width:.75rem;height:.75rem;border-radius:50%;
      background:var(--nb-bg);box-shadow:0 0 0 2px var(--nb-ink-dim)}
    [data-exp="graph"] .gx-row[data-kind=agent] .gx-dot{box-shadow:0 0 0 2px var(--nb-agent)}
    [data-exp="graph"] .gx-row[data-state-of=promoted] .gx-dot{background:var(--nb-accent);
      box-shadow:0 0 0 2px var(--nb-accent),0 0 10px var(--nb-accent)}
    [data-exp="graph"] .gx-row[data-state-of=signed] .gx-dot{box-shadow:0 0 0 2px var(--nb-signed)}
    /* The fork: a promoted post opens a lane that runs to the merge line. */
    [data-exp="graph"] .gx-row[data-state-of=promoted]::after{content:"";position:absolute;
      inset-block-start:calc(.35rem + .375rem);inset-inline-start:2rem;width:2.6rem;height:2px;
      background:var(--nb-accent)}
    [data-exp="graph"] .gx-row[data-fork-open=true] .gx-branch{position:absolute;inset-block:0;
      inset-inline-start:4.5rem;width:2px;background:var(--nb-accent);opacity:.7}
    [data-exp="graph"] .gx-msg{min-width:0}
    [data-exp="graph"] .gx-msg p{margin:.1rem 0 0;max-width:78ch}
    [data-exp="graph"] .gx-sub{color:var(--nb-ink);font-weight:700}
    [data-exp="graph"] .gx-merge{position:relative;padding:.6rem 1rem .6rem 5.6rem;
      border-block-start:1px solid var(--nb-rule);color:var(--nb-accent)}
    [data-exp="graph"] .gx-merge::before{content:"";position:absolute;inset-block-start:0;
      inset-inline-start:4.5rem;width:2px;height:1.1rem;background:var(--nb-accent);opacity:.7}
    [data-exp="graph"] .gx-merge::after{content:"";position:absolute;inset-block-start:1.1rem;
      inset-inline-start:2rem;width:2.6rem;height:2px;background:var(--nb-accent)}`,
    render: function (state) {
      var posts = postsIn(state);
      // A fork opens at the promoted post and stays open to the merge line, so
      // the shape on screen is the actual claim: this conversation became work.
      var forkAt = posts.findIndex(function (p) { return p.state === "promoted"; });
      var rows = posts.map(function (p, i) {
        var open = forkAt !== -1 && i >= forkAt;
        return (
          '<div class="gx-row" data-post-id="' + esc(p.id) + '" data-kind="' + esc(who(p.who).kind) + '"' +
          ' data-state-of="' + esc(p.state) + '" data-fork-open="' + open + '" tabindex="0" role="button">' +
          (open ? '<span class="gx-branch" aria-hidden="true"></span>' : "") +
          '<span class="gx-dot" aria-hidden="true"></span>' +
          '<div class="gx-msg">' + actorLine(p) +
          (p.subject ? '<div class="gx-sub">' + esc(p.subject) + "</div>" : "") +
          "<p>" + esc(p.body) + "</p>" +
          (p.anchor ? '<span data-c="anchor">↳ ' + esc(p.anchor) + "</span>" : "") +
          receipt(p) + "</div></div>"
        );
      }).join("");
      var lanes = D.channels.slice(0, 6).map(function (c) {
        return '<button class="gx-lane" data-channel="' + esc(c.id) + '"' +
          (c.id === state.channel ? ' aria-pressed="true"' : "") + ">" + esc(c.label) + "</button>";
      }).join("");
      return (
        '<div class="gx-head"><b data-c="board">' + esc(D.board.name) + "</b>" +
        '<span data-c="meta">HEAD → #' + esc(state.channel) + "</span>" +
        '<div class="gx-lanes">' + lanes + "</div></div>" +
        '<div class="gx-body">' + rows + "</div>" +
        '<div class="gx-merge">└──── merges into epoch ' + D.board.epoch +
        " · " + D.board.landed + "/" + D.board.total + " landed · ships " + esc(D.board.ships) + "</div>"
      );
    },
  });

  /* ══ 2 · SCRUB ═══════════════════════════════════════════════════════════
     Time is the navigation. A horizontal epoch axis runs the width of the
     screen; dragging the playhead moves the board to that moment. The stream
     shows what existed then, so history is a place you stand rather than a
     list you scroll. */
  add({
    id: "scrub",
    name: "Scrub",
    thesis: "Time is the axis. Drag the playhead along the epoch and the board shows that moment; history is somewhere you stand, not something you scroll past.",
    keys: "[←/→] scrub  [Home/End] ends  [Space] follow live",
    css: `
    [data-exp="scrub"]{display:grid;grid-template-rows:auto auto minmax(0,1fr);height:100%}
    [data-exp="scrub"] .sc-head{display:flex;gap:1rem;align-items:baseline;padding:.6rem 1rem;
      border-block-end:1px solid var(--nb-rule)}
    [data-exp="scrub"] .sc-axis{position:relative;height:5.5rem;border-block-end:1px solid var(--nb-rule);
      padding:1rem;overflow:hidden}
    [data-exp="scrub"] .sc-rule{position:absolute;inset-inline:1rem;inset-block-start:2.4rem;height:1px;background:var(--nb-rule)}
    [data-exp="scrub"] .sc-tick{position:absolute;inset-block-start:1.6rem;width:1px;height:1.6rem;background:var(--nb-ink-faint)}
    [data-exp="scrub"] .sc-tick b{position:absolute;inset-block-start:-1.35rem;translate:-50% 0;font-size:.7em;
      color:var(--nb-ink-faint);font-weight:400;white-space:nowrap}
    [data-exp="scrub"] .sc-ev{position:absolute;inset-block-start:2.05rem;width:.55rem;height:.55rem;
      translate:-50% 0;background:var(--nb-ink-dim);cursor:pointer}
    [data-exp="scrub"] .sc-ev[data-kind=agent]{background:var(--nb-agent)}
    [data-exp="scrub"] .sc-ev[data-state-of=promoted]{background:var(--nb-accent);width:.8rem;height:.8rem;inset-block-start:1.95rem}
    [data-exp="scrub"] .sc-play{position:absolute;inset-block:1rem 0;width:2px;background:var(--nb-accent);
      box-shadow:0 0 8px var(--nb-accent)}
    [data-exp="scrub"] .sc-play::after{content:"";position:absolute;inset-block-start:0;inset-inline-start:-.35rem;
      border:.4rem solid transparent;border-block-start-color:var(--nb-accent)}
    [data-exp="scrub"] .sc-now{position:absolute;inset-block-end:.4rem;inset-inline-start:1rem;color:var(--nb-ink-faint);font-size:.8em}
    [data-exp="scrub"] .sc-body{overflow:auto;padding:.6rem 0}
    [data-exp="scrub"] .sc-post{padding:.5rem 1rem;border-block-end:1px solid var(--nb-rule);opacity:.28;
      transition:opacity 120ms linear;cursor:pointer}
    [data-exp="scrub"] .sc-post[data-past=true]{opacity:1}
    [data-exp="scrub"] .sc-post p{margin:.15rem 0 0;max-width:76ch}`,
    render: function (state) {
      var posts = postsIn(state);
      var mins = posts.map(function (p) {
        var t = p.at.split(":"); return Number(t[0]) * 60 + Number(t[1]);
      });
      var lo = Math.min.apply(null, mins) - 5;
      var hi = Math.max.apply(null, mins) + 5;
      var at = state.playhead == null ? hi : state.playhead;
      var pos = function (m) { return ((m - lo) / (hi - lo)) * 100; };
      var ticks = [0, 0.25, 0.5, 0.75, 1].map(function (f) {
        var m = Math.round(lo + (hi - lo) * f);
        var label = String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
        return '<span class="sc-tick" style="inset-inline-start:calc(1rem + ' + f * 100 + '% - ' + f * 2 + 'rem)"><b>' + label + "</b></span>";
      }).join("");
      var events = posts.map(function (p, i) {
        return '<span class="sc-ev" data-post-id="' + esc(p.id) + '" data-kind="' + esc(who(p.who).kind) +
          '" data-state-of="' + esc(p.state) + '" title="' + esc(p.at + " " + p.who) +
          '" style="inset-inline-start:calc(1rem + ' + pos(mins[i]) + '% - ' + (pos(mins[i]) / 100) * 2 + 'rem)"></span>';
      }).join("");
      var body = posts.map(function (p, i) {
        return '<div class="sc-post" data-post-id="' + esc(p.id) + '" data-past="' + (mins[i] <= at) + '">' +
          actorLine(p) + (p.subject ? '<div class="gx-sub">' + esc(p.subject) + "</div>" : "") +
          "<p>" + esc(p.body) + "</p>" + receipt(p) + "</div>";
      }).join("");
      return (
        '<div class="sc-head"><b data-c="board">' + esc(D.board.name) + "</b>" +
        '<span data-c="meta">#' + esc(state.channel) + " · epoch " + D.board.epoch + "</span>" +
        '<span data-c="state" data-state="' + (state.playhead == null ? "live" : "snapshot") + '">' +
        (state.playhead == null ? "following live" : "held at " + Math.floor(at / 60) + ":" + String(at % 60).padStart(2, "0")) +
        "</span></div>" +
        '<div class="sc-axis" data-scrub><span class="sc-rule"></span>' + ticks + events +
        '<span class="sc-play" style="inset-inline-start:calc(1rem + ' + pos(at) + '% - ' + (pos(at) / 100) * 2 + 'rem)"></span>' +
        '<span class="sc-now">drag anywhere on the axis</span></div>' +
        '<div class="sc-body">' + body + "</div>"
      );
    },
    wire: function (api) {
      var axis = document.querySelector("[data-scrub]");
      if (!axis) return;
      var drag = function (e) {
        var r = axis.getBoundingClientRect();
        var f = Math.min(1, Math.max(0, (e.clientX - r.left - 16) / (r.width - 32)));
        api.setPlayhead(f);
      };
      axis.addEventListener("pointerdown", function (e) {
        axis.setPointerCapture(e.pointerId);
        drag(e);
        var move = function (ev) { drag(ev); };
        var up = function () {
          axis.removeEventListener("pointermove", move);
          axis.removeEventListener("pointerup", up);
        };
        axis.addEventListener("pointermove", move);
        axis.addEventListener("pointerup", up);
      });
    },
  });

  /* ══ 3 · ESPER ═══════════════════════════════════════════════════════════
     Blade Runner's photo analyser. One artefact fills the screen and you
     descend through it — message, anchor, diff, signature chain — rather than
     moving sideways through a list. Navigation is depth. Every level is a real
     layer of the product's provenance, so "enhance" is not decoration. */
  add({
    id: "esper",
    name: "Esper",
    thesis: "One artefact at a time, full bleed. You descend through it — message, anchor, diff, signature — so navigation is depth rather than list position.",
    keys: "[↑/↓] depth  [←/→] artefact  [Esc] surface",
    css: `
    [data-exp="esper"]{display:grid;grid-template-rows:auto minmax(0,1fr) auto;height:100%;position:relative}
    /* Atmosphere plate generated with the higgsfield CLI (flux_2), downsampled
       from 1.3MB to 4KB. Raster earns its place here and nowhere else in the
       set: depth-of-field haze is the one thing CSS cannot fake convincingly. */
    [data-exp="esper"]::before{content:"";position:absolute;inset:0;pointer-events:none;
      background:url("plate.jpg") center/cover no-repeat;opacity:.42;mix-blend-mode:screen}
    [data-exp="esper"]::after{content:"";position:absolute;inset:0;pointer-events:none;
      background:radial-gradient(120% 80% at 50% 0%,transparent 35%,color-mix(in srgb,var(--nb-bg) 92%,black) 100%)}
    [data-exp="esper"] .es-head{display:flex;gap:1rem;align-items:baseline;padding:.6rem 1rem;
      border-block-end:1px solid var(--nb-rule);position:relative;z-index:1}
    [data-exp="esper"] .es-stage{position:relative;z-index:1;overflow:auto;padding:1.5rem 2rem}
    [data-exp="esper"] .es-frame{border:1px solid var(--nb-rule);padding:1.4rem 1.6rem;max-width:70rem;margin-inline:auto;
      position:relative;background:color-mix(in srgb,var(--nb-surface) 60%,transparent)}
    [data-exp="esper"] .es-frame::before,[data-exp="esper"] .es-frame::after{content:"";position:absolute;
      width:1.1rem;height:1.1rem;border:2px solid var(--nb-accent)}
    [data-exp="esper"] .es-frame::before{inset-block-start:-1px;inset-inline-start:-1px;border-inline-end:0;border-block-end:0}
    [data-exp="esper"] .es-frame::after{inset-block-end:-1px;inset-inline-end:-1px;border-inline-start:0;border-block-start:0}
    [data-exp="esper"] .es-depth{display:flex;gap:0;margin-block-end:1rem}
    [data-exp="esper"] .es-step{flex:1;padding:.3rem .5rem;border:1px solid var(--nb-rule);
      color:var(--nb-ink-faint);cursor:pointer;font-size:.8em;text-align:center}
    [data-exp="esper"] .es-step[aria-current=true]{border-color:var(--nb-accent);
      background:var(--nb-accent);color:var(--nb-accent-ink);font-weight:700}
    [data-exp="esper"] .es-layer{font-size:1.05em;line-height:1.7}
    [data-exp="esper"] .es-layer p{margin:.4rem 0;max-width:74ch}
    [data-exp="esper"] .es-mono{font-size:.95em;color:var(--nb-ink-dim);white-space:pre-wrap}
    [data-exp="esper"] .es-chain{display:grid;gap:.2rem}
    [data-exp="esper"] .es-chain span{color:var(--nb-signed)}
    [data-exp="esper"] .es-foot{display:flex;gap:1rem;padding:.5rem 1rem;border-block-start:1px solid var(--nb-rule);
      position:relative;z-index:1;color:var(--nb-ink-faint)}`,
    render: function (state) {
      var posts = postsIn(state);
      var idx = Math.min(state.esperIndex || 0, posts.length - 1);
      var p = posts[idx];
      if (!p) return '<div class="es-stage">Nothing here.</div>';
      var depth = state.esperDepth || 0;
      var layers = [
        { name: "MESSAGE", html: actorLine(p) + "<p>" + esc(p.body) + "</p>" },
        { name: "ANCHOR", html: '<div class="es-mono">' + esc(p.anchor || "community://" + D.board.name.toLowerCase().replace(/\s+/g, "-") + "/" + p.channel) + "</div>" +
          "<p>What this is pinned to. An anchor is why the claim can be checked later.</p>" },
        { name: "RECEIPT", html: '<div class="es-mono">' + esc(p.sig) + "</div>" +
          '<div class="es-chain"><span>◆ signed by @' + esc(p.who) + "</span>" +
          (who(p.who).kind === "agent" ? "<span>◆ supervised by @" + esc(who(p.who).supervisor || "maya") + " · human review required</span>" : "") +
          "<span>◆ carried into epoch " + D.board.epoch + "</span></div>" },
        { name: "LINEAGE", html: "<p>" + esc(p.subject || p.body.slice(0, 60)) + "</p>" +
          '<div class="es-mono">' + posts.map(function (q, i) {
            return (i <= idx ? "├─ " : "│  ") + q.at + "  " + q.who + "  " + q.state;
          }).join("\n") + "</div>" },
      ];
      var steps = layers.map(function (l, i) {
        return '<button class="es-step" data-depth="' + i + '"' + (i === depth ? ' aria-current="true"' : "") + ">" +
          l.name + "</button>";
      }).join("");
      return (
        '<div class="es-head"><b data-c="board">ESPER</b>' +
        '<span data-c="meta">' + esc(D.board.name) + " · #" + esc(state.channel) + "</span>" +
        '<span data-c="meta" style="margin-inline-start:auto">artefact ' + (idx + 1) + " of " + posts.length + "</span></div>" +
        '<div class="es-stage"><div class="es-frame"><div class="es-depth">' + steps + "</div>" +
        '<div class="es-layer">' + layers[depth].html + "</div></div></div>" +
        '<div class="es-foot"><span>↑↓ enhance · ←→ artefact</span>' +
        '<span style="margin-inline-start:auto">' + esc(p.sig) + "</span></div>"
      );
    },
  });

  /* ══ 4 · RAIN ════════════════════════════════════════════════════════════
     Channels are columns and arrivals fall. The Matrix reference earns its
     place only because it does something real: you can see load across every
     channel at once, and a post lands rather than being appended out of view.
     Navigation is lateral — pick the column, not the item. */
  add({
    id: "rain",
    name: "Rain",
    thesis: "Every channel is a column and arrivals fall through it. You watch the whole board at once and pick a column, rather than reading one list.",
    keys: "[←/→] column  [Enter] enter  [R] load",
    css: `
    [data-exp="rain"]{display:grid;grid-template-rows:auto minmax(0,1fr);height:100%}
    [data-exp="rain"] .rn-head{display:flex;gap:1rem;align-items:baseline;padding:.6rem 1rem;border-block-end:1px solid var(--nb-rule)}
    [data-exp="rain"] .rn-cols{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:1px;
      background:var(--nb-rule);overflow:hidden;min-height:0}
    [data-exp="rain"] .rn-col{background:var(--nb-bg);display:grid;grid-template-rows:auto minmax(0,1fr);
      min-width:0;cursor:pointer;position:relative;overflow:hidden}
    [data-exp="rain"] .rn-col[aria-current=true]{background:var(--nb-surface)}
    [data-exp="rain"] .rn-cap{padding:.4rem .6rem;border-block-end:1px solid var(--nb-rule);
      display:flex;gap:.4rem;align-items:baseline;font-size:.85em}
    [data-exp="rain"] .rn-cap b{color:var(--nb-ink)}
    [data-exp="rain"] .rn-col[data-kind=work] .rn-cap b{color:var(--nb-live)}
    [data-exp="rain"] .rn-stack{overflow:auto;padding:.4rem;display:grid;gap:.35rem;align-content:end}
    [data-exp="rain"] .rn-drop{border-inline-start:2px solid var(--nb-rule);padding:.25rem .45rem;font-size:.85em;
      animation:rn-fall 420ms ease-out}
    [data-exp="rain"] .rn-drop[data-kind=agent]{border-inline-start-color:var(--nb-agent)}
    [data-exp="rain"] .rn-drop[data-state-of=promoted]{border-inline-start-color:var(--nb-accent)}
    [data-exp="rain"] .rn-drop b{display:block;color:var(--nb-ink)}
    [data-exp="rain"] .rn-drop span{color:var(--nb-ink-dim)}
    @keyframes rn-fall{from{opacity:0;transform:translateY(-1.2rem)}to{opacity:1;transform:none}}
    @media (prefers-reduced-motion:reduce){[data-exp="rain"] .rn-drop{animation:none}}`,
    render: function (state) {
      var cols = D.channels.map(function (c) {
        var items = postsIn(state, c.id).slice(-6).map(function (p) {
          return '<div class="rn-drop" data-post-id="' + esc(p.id) + '" data-kind="' + esc(who(p.who).kind) +
            '" data-state-of="' + esc(p.state) + '"><b>' + esc(p.who) + " · " + esc(p.at) + "</b>" +
            "<span>" + esc((p.subject || p.body).slice(0, 64)) + "</span></div>";
        }).join("");
        return '<div class="rn-col" data-channel="' + esc(c.id) + '" data-kind="' + esc(c.kind) + '"' +
          (c.id === state.channel ? ' aria-current="true"' : "") + ">" +
          '<div class="rn-cap"><b>#' + esc(c.label) + '</b><span data-c="count">' + (c.count || 0) + "</span></div>" +
          '<div class="rn-stack">' + items + "</div></div>";
      }).join("");
      return (
        '<div class="rn-head"><b data-c="board">' + esc(D.board.name) + "</b>" +
        '<span data-c="meta">all channels · epoch ' + D.board.epoch + "</span></div>" +
        '<div class="rn-cols">' + cols + "</div>"
      );
    },
  });

  /* ══ 5 · PANES ═══════════════════════════════════════════════════════════
     A terminal multiplexer. Channels are panes you split and focus; the board
     is a workspace you arrange rather than a page you visit. Navigation is
     window management, which is how this audience already works. */
  add({
    id: "panes",
    name: "Panes",
    thesis: "A multiplexer: channels are panes you split and focus. The board is a workspace you arrange, not a page you visit.",
    keys: "[S] split  [W] close  [Tab] focus  [1-9] pane",
    css: `
    [data-exp="panes"]{display:grid;grid-template-rows:auto minmax(0,1fr);height:100%}
    [data-exp="panes"] .pn-head{display:flex;gap:.4rem;align-items:center;padding:.35rem .6rem;
      border-block-end:1px solid var(--nb-rule);font-size:.85em}
    [data-exp="panes"] .pn-tag{padding:0 .5rem;border:1px solid var(--nb-rule)}
    [data-exp="panes"] .pn-grid{display:grid;gap:1px;background:var(--nb-rule);min-height:0}
    [data-exp="panes"] .pn-pane{background:var(--nb-bg);display:grid;grid-template-rows:auto minmax(0,1fr);min-height:0;min-width:0}
    [data-exp="panes"] .pn-bar{display:flex;gap:.5rem;align-items:baseline;padding:.2rem .5rem;
      border-block-end:1px solid var(--nb-rule);font-size:.8em;cursor:pointer}
    [data-exp="panes"] .pn-pane[aria-current=true] .pn-bar{background:var(--nb-accent);color:var(--nb-accent-ink)}
    [data-exp="panes"] .pn-pane[aria-current=true] .pn-bar [data-c=count]{color:inherit}
    [data-exp="panes"] .pn-log{overflow:auto;padding:.35rem .5rem;font-size:.85em}
    [data-exp="panes"] .pn-line{padding:.12rem 0;white-space:pre-wrap;cursor:pointer}
    [data-exp="panes"] .pn-line:hover{background:var(--nb-surface)}
    [data-exp="panes"] .pn-line b{color:var(--nb-ink)}
    [data-exp="panes"] .pn-line[data-kind=agent] b{color:var(--nb-agent)}
    [data-exp="panes"] .pn-line i{font-style:normal;color:var(--nb-ink-faint)}`,
    render: function (state) {
      var open = state.panes && state.panes.length ? state.panes : ["general", "ideas", "agent-runs"];
      var focus = Math.min(state.paneFocus || 0, open.length - 1);
      var cols = open.length <= 1 ? "1fr" : open.length === 2 ? "1fr 1fr" : "1fr 1fr";
      var rows = open.length <= 2 ? "1fr" : "1fr 1fr";
      var panes = open.map(function (id, i) {
        var ch = D.channels.filter(function (c) { return c.id === id; })[0] || { label: id, count: 0 };
        var lines = postsIn(state, id).map(function (p) {
          return '<div class="pn-line" data-post-id="' + esc(p.id) + '" data-kind="' + esc(who(p.who).kind) + '">' +
            "<i>" + esc(p.at) + "</i> <b>" + esc(p.who) + "</b> " + esc((p.subject ? p.subject + " — " : "") + p.body) +
            "</div>";
        }).join("");
        return '<div class="pn-pane" data-pane="' + i + '"' + (i === focus ? ' aria-current="true"' : "") + ">" +
          '<div class="pn-bar" data-channel="' + esc(id) + '"><span>' + i + ":</span><b>#" + esc(ch.label) + "</b>" +
          '<span data-c="count" style="margin-inline-start:auto">' + (ch.count || 0) + "</span></div>" +
          '<div class="pn-log">' + lines + "</div></div>";
      }).join("");
      return (
        '<div class="pn-head"><span class="pn-tag">' + esc(D.board.name) + "</span>" +
        '<span class="pn-tag">epoch ' + D.board.epoch + "</span>" +
        '<span class="pn-tag" style="margin-inline-start:auto">' + open.length + " panes</span></div>" +
        '<div class="pn-grid" style="grid-template-columns:' + cols + ";grid-template-rows:" + rows + '">' +
        panes + "</div>"
      );
    },
  });

  /* ══ 6 · SWEEP ═══════════════════════════════════════════════════════════
     A radar. Angle is channel, radius is recency, so the whole board's state
     is one glance and nothing needs scrolling. Navigation is angular: you
     rotate to a bearing rather than moving through a list. */
  add({
    id: "sweep",
    name: "Sweep",
    thesis: "A radar: bearing is channel, radius is recency. The board's whole state is one glance and you rotate to a bearing instead of scrolling.",
    keys: "[←/→] bearing  [Enter] open  [R] load",
    css: `
    [data-exp="sweep"]{display:grid;grid-template-columns:minmax(0,1fr) 22rem;height:100%}
    [data-exp="sweep"] .sw-scope{position:relative;display:grid;place-items:center;overflow:hidden}
    [data-exp="sweep"] svg{width:min(94%,44rem);height:auto}
    [data-exp="sweep"] .sw-ring{fill:none;stroke:var(--nb-rule)}
    [data-exp="sweep"] .sw-spoke{stroke:var(--nb-rule)}
    [data-exp="sweep"] .sw-label{fill:var(--nb-ink-faint);font-size:3.4px;font-family:var(--nb-font)}
    [data-exp="sweep"] .sw-label.on{fill:var(--nb-accent)}
    [data-exp="sweep"] .sw-blip{fill:var(--nb-ink-dim);cursor:pointer}
    [data-exp="sweep"] .sw-blip[data-kind=agent]{fill:var(--nb-agent)}
    [data-exp="sweep"] .sw-blip[data-state-of=promoted]{fill:var(--nb-accent)}
    [data-exp="sweep"] .sw-beam{stroke:var(--nb-accent);stroke-width:.6}
    [data-exp="sweep"] .sw-side{border-inline-start:1px solid var(--nb-rule);overflow:auto;padding:.6rem}
    [data-exp="sweep"] .sw-side h3{margin:.2rem 0 .6rem;font-size:.9em;color:var(--nb-accent)}
    [data-exp="sweep"] .sw-item{padding:.4rem 0;border-block-end:1px solid var(--nb-rule);cursor:pointer;font-size:.85em}
    [data-exp="sweep"] .sw-item p{margin:.15rem 0 0;color:var(--nb-ink-dim)}`,
    render: function (state) {
      var chans = D.channels;
      var bearing = state.bearing == null ? 0 : state.bearing;
      var active = chans[((bearing % chans.length) + chans.length) % chans.length];
      var cx = 50, cy = 50;
      var rings = [14, 26, 38, 46].map(function (r) {
        return '<circle class="sw-ring" cx="' + cx + '" cy="' + cy + '" r="' + r + '"/>';
      }).join("");
      var spokes = chans.map(function (c, i) {
        var a = (i / chans.length) * Math.PI * 2 - Math.PI / 2;
        var x = cx + Math.cos(a) * 47, y = cy + Math.sin(a) * 47;
        var lx = cx + Math.cos(a) * 49.5, ly = cy + Math.sin(a) * 49.5;
        return '<line class="sw-spoke" x1="' + cx + '" y1="' + cy + '" x2="' + x + '" y2="' + y + '"/>' +
          '<text class="sw-label' + (c.id === active.id ? " on" : "") + '" x="' + lx + '" y="' + ly +
          '" text-anchor="' + (Math.cos(a) < -0.2 ? "end" : Math.cos(a) > 0.2 ? "start" : "middle") + '">' +
          esc(c.label) + "</text>";
      }).join("");
      var blips = chans.map(function (c, i) {
        var a = (i / chans.length) * Math.PI * 2 - Math.PI / 2;
        return postsIn(state, c.id).map(function (p, j, arr) {
          var r = 12 + (1 - j / Math.max(1, arr.length)) * 32;
          var jitter = ((j % 3) - 1) * 0.06;
          var x = cx + Math.cos(a + jitter) * r, y = cy + Math.sin(a + jitter) * r;
          return '<circle class="sw-blip" data-post-id="' + esc(p.id) + '" data-kind="' + esc(who(p.who).kind) +
            '" data-state-of="' + esc(p.state) + '" cx="' + x.toFixed(2) + '" cy="' + y.toFixed(2) + '" r="1.1"><title>' +
            esc(p.who + " " + p.at) + "</title></circle>";
        }).join("");
      }).join("");
      var ai = (((bearing % chans.length) + chans.length) % chans.length) / chans.length * Math.PI * 2 - Math.PI / 2;
      var beam = '<line class="sw-beam" x1="' + cx + '" y1="' + cy + '" x2="' + (cx + Math.cos(ai) * 47) +
        '" y2="' + (cy + Math.sin(ai) * 47) + '"/>';
      var side = postsIn(state, active.id).map(function (p) {
        return '<div class="sw-item" data-post-id="' + esc(p.id) + '">' + actorLine(p) +
          "<p>" + esc((p.subject || p.body).slice(0, 90)) + "</p></div>";
      }).join("") || '<p data-c="body">Nothing on this bearing.</p>';
      return (
        '<div class="sw-scope"><svg viewBox="-16 -10 132 120" role="img" aria-label="Activity by channel and recency">' +
        rings + spokes + blips + beam + "</svg></div>" +
        '<div class="sw-side"><h3>#' + esc(active.label) + "</h3>" + side + "</div>"
      );
    },
  });

  /* ══ 7 · TAPE ════════════════════════════════════════════════════════════
     One continuous horizontal line, like a ticker or a seismograph. Reading is
     lateral and the whole day fits on one strip, which makes rhythm — quiet
     hours, bursts — visible in a way a vertical list hides. */
  add({
    id: "tape",
    name: "Tape",
    thesis: "One horizontal strip. Reading is lateral and the whole day fits at once, so bursts and quiet hours are visible instead of hidden in scroll.",
    keys: "[←/→] step  [Enter] open  [R] load",
    css: `
    [data-exp="tape"]{display:grid;grid-template-rows:auto minmax(0,1fr) auto;height:100%}
    [data-exp="tape"] .tp-head{display:flex;gap:1rem;padding:.6rem 1rem;border-block-end:1px solid var(--nb-rule)}
    [data-exp="tape"] .tp-strip{overflow-x:auto;overflow-y:hidden;display:flex;align-items:stretch;
      border-block-end:1px solid var(--nb-rule)}
    [data-exp="tape"] .tp-cell{flex:0 0 19rem;border-inline-end:1px solid var(--nb-rule);padding:.7rem .8rem;
      display:grid;align-content:start;gap:.25rem;cursor:pointer}
    [data-exp="tape"] .tp-cell:hover{background:var(--nb-surface)}
    [data-exp="tape"] .tp-cell[data-state=selected]{background:var(--nb-surface);box-shadow:inset 0 3px 0 var(--nb-accent)}
    [data-exp="tape"] .tp-cell p{margin:0;font-size:.9em}
    [data-exp="tape"] .tp-spark{display:flex;align-items:flex-end;gap:2px;height:3rem;padding:.4rem 1rem}
    [data-exp="tape"] .tp-bar{flex:1;background:var(--nb-ink-faint);min-height:2px}
    [data-exp="tape"] .tp-bar[data-kind=agent]{background:var(--nb-agent)}
    [data-exp="tape"] .tp-bar[data-state-of=promoted]{background:var(--nb-accent)}`,
    render: function (state) {
      var posts = postsIn(state);
      var cells = posts.map(function (p) {
        return '<div class="tp-cell" data-post-id="' + esc(p.id) + '"' +
          (state.selected === p.id ? ' data-state="selected"' : "") + ">" +
          actorLine(p) + (p.subject ? '<div class="gx-sub">' + esc(p.subject) + "</div>" : "") +
          "<p>" + esc(p.body) + "</p>" + receipt(p) + "</div>";
      }).join("");
      var bars = posts.map(function (p) {
        var h = 20 + (p.body.length % 60);
        return '<span class="tp-bar" data-kind="' + esc(who(p.who).kind) + '" data-state-of="' + esc(p.state) +
          '" style="height:' + h + '%"></span>';
      }).join("");
      return (
        '<div class="tp-head"><b data-c="board">' + esc(D.board.name) + "</b>" +
        '<span data-c="meta">#' + esc(state.channel) + " · reading left to right</span></div>" +
        '<div class="tp-strip">' + cells + "</div>" +
        '<div class="tp-spark">' + bars + "</div>"
      );
    },
  });

  /* ══ 8 · SHELL ═══════════════════════════════════════════════════════════
     The board mounted as a filesystem. You cd and ls; channels are
     directories, posts are files, receipts are extended attributes. There is
     no chrome at all — the command line is the entire interface, which is the
     most terminal thing this set can honestly do. */
  add({
    id: "shell",
    name: "Shell",
    thesis: "The board mounted as a filesystem. cd and ls are the whole interface: channels are directories, posts are files, receipts are attributes.",
    keys: "type: ls · cd <channel> · cat <n> · tail -f · help",
    css: `
    [data-exp="shell"]{display:grid;grid-template-rows:minmax(0,1fr) auto;height:100%}
    [data-exp="shell"] .sh-out{overflow:auto;padding:.7rem 1rem;white-space:pre-wrap;line-height:1.5}
    [data-exp="shell"] .sh-out b{color:var(--nb-ink)}
    [data-exp="shell"] .sh-out i{font-style:normal;color:var(--nb-ink-faint)}
    [data-exp="shell"] .sh-out .ok{color:var(--nb-live)}
    [data-exp="shell"] .sh-out .ag{color:var(--nb-agent)}
    [data-exp="shell"] .sh-out .pr{color:var(--nb-accent)}
    [data-exp="shell"] .sh-echo{color:var(--nb-ink-dim)}
    [data-exp="shell"] .sh-in{display:flex;gap:.5rem;align-items:center;padding:.5rem 1rem;
      border-block-start:1px solid var(--nb-rule)}
    [data-exp="shell"] .sh-in span{color:var(--nb-accent)}
    [data-exp="shell"] .sh-in input{flex:1;background:transparent;border:0;color:var(--nb-ink);font:inherit;outline:0}`,
    render: function (state) {
      var lines = state.shellLog && state.shellLog.length
        ? state.shellLog.join("\n")
        : "epoch board mounted at /" + D.board.name.toLowerCase().replace(/\s+/g, "-") +
          "\ntype <b>help</b> for commands, <b>ls</b> to look around";
      return (
        '<div class="sh-out" data-shell-out>' + lines + "</div>" +
        '<form class="sh-in" data-shell-form><span>' + esc("/" + state.channel) + " $</span>" +
        '<input data-shell-input autocomplete="off" spellcheck="false" aria-label="Command"></form>'
      );
    },
    wire: function (api) {
      var form = document.querySelector("[data-shell-form]");
      if (!form) return;
      var input = form.querySelector("[data-shell-input]");
      input.focus();
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        api.shell(input.value);
        input.value = "";
      });
    },
  });

  /* ══ 9 · DIFF ════════════════════════════════════════════════════════════
     Every post read as a patch. Conversation and code use one representation,
     which is the strongest possible statement of the product's claim: talk is
     already a change proposal, it just has not been signed yet. */
  add({
    id: "diff",
    name: "Diff",
    thesis: "Everything is a patch, conversation included. One representation for talk and code says the product's claim outright: a message is an unsigned change.",
    keys: "[J/K] hunk  [Enter] stage  [R] load",
    css: `
    [data-exp="diff"]{display:grid;grid-template-columns:15rem minmax(0,1fr);height:100%}
    [data-exp="diff"] .df-side{border-inline-end:1px solid var(--nb-rule);overflow:auto;padding:.5rem 0}
    [data-exp="diff"] .df-file{padding:.3rem .7rem;cursor:pointer;font-size:.85em;display:flex;gap:.5rem}
    [data-exp="diff"] .df-file:hover{background:var(--nb-surface)}
    [data-exp="diff"] .df-file[aria-current=true]{background:var(--nb-surface);color:var(--nb-accent)}
    [data-exp="diff"] .df-file i{font-style:normal;margin-inline-start:auto;color:var(--nb-live)}
    [data-exp="diff"] .df-body{overflow:auto}
    [data-exp="diff"] .df-hunk{border-block-end:1px solid var(--nb-rule)}
    [data-exp="diff"] .df-hh{display:flex;gap:.8rem;padding:.3rem .8rem;background:var(--nb-surface);font-size:.82em;
      color:var(--nb-ink-dim);cursor:pointer}
    [data-exp="diff"] .df-hunk[data-state=selected] .df-hh{color:var(--nb-accent)}
    [data-exp="diff"] .df-l{display:grid;grid-template-columns:3.4rem minmax(0,1fr);font-size:.9em}
    [data-exp="diff"] .df-l span{color:var(--nb-ink-faint);text-align:end;padding-inline-end:.7rem;user-select:none}
    [data-exp="diff"] .df-l code{white-space:pre-wrap;padding-inline-start:.5rem}
    [data-exp="diff"] .df-add{background:color-mix(in srgb,var(--nb-live) 14%,transparent)}
    [data-exp="diff"] .df-add code{color:var(--nb-ink)}
    [data-exp="diff"] .df-ctx code{color:var(--nb-ink-dim)}
    [data-exp="diff"] .df-meta{background:color-mix(in srgb,var(--nb-accent) 12%,transparent)}`,
    render: function (state) {
      var posts = postsIn(state);
      var files = D.channels.map(function (c) {
        var n = postsIn(state, c.id).length;
        return '<div class="df-file" data-channel="' + esc(c.id) + '"' +
          (c.id === state.channel ? ' aria-current="true"' : "") + ">" +
          "#" + esc(c.label) + "<i>+" + n + "</i></div>";
      }).join("");
      var line = 1;
      var hunks = posts.map(function (p) {
        var body = p.body.match(/.{1,86}(\s|$)/g) || [p.body];
        var rows = body.map(function (t) {
          line += 1;
          return '<div class="df-l df-add"><span>' + line + "</span><code>+ " + esc(t.trim()) + "</code></div>";
        }).join("");
        var head = '<div class="df-hh" data-post-id="' + esc(p.id) + '">' +
          "<span>@@ " + esc(p.at) + " @@</span><span>" + esc(p.who) + " · " + esc(who(p.who).role) + "</span>" +
          "<span>" + esc(p.state) + "</span></div>";
        var meta = '<div class="df-l df-meta"><span></span><code>' + esc(p.sig) +
          (p.anchor ? "  →  " + esc(p.anchor) : "") + "</code></div>";
        var subj = p.subject
          ? '<div class="df-l df-ctx"><span></span><code>  ' + esc(p.subject) + "</code></div>"
          : "";
        return '<div class="df-hunk" data-post-id="' + esc(p.id) + '"' +
          (state.selected === p.id ? ' data-state="selected"' : "") + ">" + head + subj + rows + meta + "</div>";
      }).join("");
      return '<div class="df-side">' + files + "</div><div class=\"df-body\">" + hunks + "</div>";
    },
  });

  /* ══ 10 · ORBIT ══════════════════════════════════════════════════════════
     People and work as a system of bodies. Members orbit the epoch; an intent
     pulls its contributors into a shared ring. It answers "who is this
     community and what are they around" — a question a list cannot show. */
  add({
    id: "orbit",
    name: "Orbit",
    thesis: "People and work as bodies in a system. Contributors orbit the epoch and an intent draws its people into one ring — a question no list can answer.",
    keys: "[Tab] body  [Enter] open  [R] load",
    css: `
    [data-exp="orbit"]{display:grid;grid-template-columns:minmax(0,1fr) 23rem;height:100%}
    [data-exp="orbit"] .ob-space{position:relative;display:grid;place-items:center;overflow:hidden}
    [data-exp="orbit"] svg{width:min(94%,46rem);height:auto}
    [data-exp="orbit"] .ob-path{fill:none;stroke:var(--nb-rule)}
    [data-exp="orbit"] .ob-core{fill:var(--nb-accent)}
    [data-exp="orbit"] .ob-core-label{fill:var(--nb-accent);font-size:3.2px;font-family:var(--nb-font);text-anchor:middle}
    [data-exp="orbit"] .ob-body{fill:var(--nb-ink-dim);cursor:pointer}
    [data-exp="orbit"] .ob-body[data-kind=agent]{fill:var(--nb-agent)}
    [data-exp="orbit"] .ob-name{fill:var(--nb-ink-faint);font-size:2.8px;font-family:var(--nb-font);text-anchor:middle}
    [data-exp="orbit"] .ob-link{stroke:var(--nb-signed);stroke-width:.25;opacity:.75}
    [data-exp="orbit"] .ob-side{border-inline-start:1px solid var(--nb-rule);overflow:auto;padding:.7rem}
    [data-exp="orbit"] .ob-side h3{margin:.1rem 0 .5rem;font-size:.9em;color:var(--nb-accent)}
    [data-exp="orbit"] .ob-cred{display:flex;justify-content:space-between;padding:.3rem 0;
      border-block-end:1px solid var(--nb-rule);font-size:.85em}
    [data-exp="orbit"] .ob-cred i{font-style:normal;color:var(--nb-ink-faint)}`,
    // Orbit shows the community and the current epoch, which do not change with
    // the selected channel, so it takes no state.
    render: function () {
      var cx = 50, cy = 50;
      var people = D.members;
      var bodies = people.map(function (m, i) {
        var a = (i / people.length) * Math.PI * 2;
        var r = m.kind === "agent" ? 32 : 22;
        var x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.82;
        return { m: m, x: x, y: y };
      });
      var paths = [22, 32].map(function (r) {
        return '<ellipse class="ob-path" cx="' + cx + '" cy="' + cy + '" rx="' + r + '" ry="' + (r * 0.82) + '"/>';
      }).join("");
      var links = bodies.filter(function (b) {
        return ["maya", "lea", "nora", "scout"].indexOf(b.m.handle) !== -1;
      }).map(function (b) {
        return '<line class="ob-link" x1="' + cx + '" y1="' + cy + '" x2="' + b.x.toFixed(2) + '" y2="' + b.y.toFixed(2) + '"/>';
      }).join("");
      var dots = bodies.map(function (b) {
        return '<circle class="ob-body" data-member="' + esc(b.m.handle) + '" data-kind="' + esc(b.m.kind) +
          '" cx="' + b.x.toFixed(2) + '" cy="' + b.y.toFixed(2) + '" r="' + (b.m.kind === "agent" ? 1.5 : 2) + '"><title>' +
          esc(b.m.handle + " · " + b.m.role) + "</title></circle>" +
          '<text class="ob-name" x="' + b.x.toFixed(2) + '" y="' + (b.y + 4).toFixed(2) + '">' + esc(b.m.handle) + "</text>";
      }).join("");
      var cred = [
        { h: "lea", w: "reported it" }, { h: "nora", w: "measured it" },
        { h: "scout", w: "planned it" }, { h: "maya", w: "promoted it" },
      ].map(function (c) {
        return '<div class="ob-cred"><span>@' + esc(c.h) + "</span><i>" + esc(c.w) + "</i></div>";
      }).join("");
      return (
        '<div class="ob-space"><svg viewBox="0 0 100 100" role="img" aria-label="Members orbiting the current epoch">' +
        paths + links +
        '<circle class="ob-core" cx="' + cx + '" cy="' + cy + '" r="3.4"/>' +
        '<text class="ob-core-label" x="' + cx + '" y="' + (cy + 8) + '">EPOCH ' + D.board.epoch + "</text>" +
        dots + "</svg></div>" +
        '<div class="ob-side"><h3>INTENT-518</h3>' +
        '<p data-c="body">Cold installs miss the dependency cache on every image bump.</p>' +
        cred +
        '<div class="ob-cred"><span>reviews</span><i>1 of 2 · humans only</i></div>' +
        '<div class="ob-cred"><span>ships</span><i>' + esc(D.board.ships) + "</i></div></div>"
      );
    },
  });

  window.NB_EXPERIENCES = E;
})();
