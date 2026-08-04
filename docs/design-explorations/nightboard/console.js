/**
 * Console — graph, shell and diff, consolidated.
 *
 * The three that had ideas each solved one third of the same problem: the graph
 * showed lineage, the shell moved fast, the diff read work as work. Kept apart
 * they each felt partial, and all three navigated badly.
 *
 * This fuses them on one model: **the board is a filesystem**, and everything —
 * columns, command line, breadcrumb — addresses the same paths. Clicking a
 * folder and typing `cd` are the same operation, not two features that agree.
 *
 * Navigation is miller columns, the way ranger and nnn work: a column per level,
 * ↑↓ within a level, ←→ between them. It is the layout that makes "where am I"
 * unanswerable-by-accident, because your whole path is on screen.
 *
 *   ←→ / hl   column        Enter  descend or open
 *   ↑↓ / jk   entry         Tab    complete (in the command line)
 *   :         command line  /      filter this column
 *   v         cycle view    Esc    leave the command line
 *
 * Mouse and touch are peers: every entry is clickable, the breadcrumb is
 * clickable, and columns swipe horizontally on a phone.
 */
(function () {
  "use strict";

  var D = window.NB_DATA;
  var MAP = window.NB_MAP;
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  };
  var who = function (h) {
    for (var i = 0; i < D.members.length; i++) if (D.members[i].handle === h) return D.members[i];
    return { handle: h, role: "", kind: "person" };
  };

  /* ── Views ─────────────────────────────────────────────────────────────── */

  /** Lineage as a commit graph. Forks open where talk becomes signed work,
   * and replies nest under what they answer, foldable per thread. */
  function viewGraph(entries, markId, folded) {
    var posts = entries.filter(function (e) { return e.post; }).map(function (e) { return e.post; });
    if (!posts.length) return '<p class="cn-empty">Nothing to plot here.</p>';
    folded = folded || {};

    // Threads: `re` names the parent. A reply whose parent is not in this
    // listing is shown at the root rather than lost.
    var byId = {}, kids = {}, roots = [];
    posts.forEach(function (p) { byId[p.id] = p; });
    posts.forEach(function (p) {
      if (p.re && byId[p.re]) (kids[p.re] = kids[p.re] || []).push(p);
      else roots.push(p);
    });
    var flat = [];
    (function walk(list) {
      list.forEach(function (p) { flat.push(p); walk(kids[p.id] || []); });
    })(roots);
    var forkAt = flat.findIndex(function (p) { return p.state === "promoted"; });

    function subtreeCount(p) {
      return (kids[p.id] || []).reduce(function (n, c) { return n + 1 + subtreeCount(c); }, 0);
    }

    function nodeHtml(p, depth) {
      var open = forkAt !== -1 && flat.indexOf(p) >= forkAt;
      var replies = kids[p.id] || [];
      var below = subtreeCount(p);
      var isFolded = !!folded[p.id];
      var html = '<div class="cn-node" data-key="' + esc(p.id) + '" data-kind="' + esc(who(p.who).kind) + '"' +
        ' data-state-of="' + esc(p.state) + '"' +
        ' data-fork="' + open + '"' + (markId && p.id === markId ? ' data-here="true"' : "") +
        (String(p.id).indexOf("live-") === 0 ? ' data-live="true"' : "") + ">" +
        '<span class="cn-dot" aria-hidden="true"></span>' +
        (open && depth === 0 ? '<span class="cn-branch" aria-hidden="true"></span>' : "") +
        '<div class="cn-node-body"><span data-c="actor"><b data-c="handle">' + esc(p.who) + "</b>" +
        '<span data-c="role">' + esc(who(p.who).role) + "</span></span>" +
        '<span data-c="meta"><time data-c="time">' + esc(p.at) + "</time>" +
        '<span data-c="state">' + esc(p.state) + "</span></span>" +
        (p.subject ? '<b class="cn-subject">' + esc(p.subject) + "</b>" : "") +
        "<p>" + esc(p.body) + "</p>" +
        (p.anchor ? '<span data-c="anchor">↳ ' + esc(p.anchor) + "</span>" : "") +
        '<span data-c="receipt"><span data-c="mark" aria-hidden="true">◆</span>' +
        '<span class="cn-sigil" aria-hidden="true">' + window.NB_ASCII.sigil(p.sig, 4) + "</span>" +
        esc(p.sig) + "</span>" +
        (replies.length
          ? '<button type="button" class="cn-twist" data-fold="' + esc(p.id) + '"' +
            ' aria-expanded="' + !isFolded + '">' +
            (isFolded ? "▸ " : "▾ ") + below + (below === 1 ? " reply" : " replies") +
            "</button>"
          : "") +
        "</div></div>";
      if (replies.length && !isFolded) {
        html += '<div class="cn-replies" data-key="re-' + esc(p.id) + '"' +
          (open ? ' data-fork="true"' : "") + ">" +
          replies.map(function (c) { return nodeHtml(c, depth + 1); }).join("") + "</div>";
      }
      return html;
    }

    var body = roots.map(function (p) { return nodeHtml(p, 0); }).join("");
    var laneVisible = body.indexOf('data-fork="true"') !== -1;
    return '<div class="cn-graph">' + body +
      '<div class="cn-merge"' + (laneVisible ? "" : ' data-no-lane="true"') + '>└─ epoch ' + D.board.epoch + "  " +
      window.NB_ASCII.gauge(D.board.landed, D.board.total, 12) + "  " +
      D.board.landed + "/" + D.board.total + " landed · ships " + esc(D.board.ships) + "</div></div>";
  }

  /** Entries as patches. One representation for talk and code. */
  function viewDiff(entries) {
    var posts = entries.filter(function (e) { return e.post; }).map(function (e) { return e.post; });
    if (!posts.length) return '<p class="cn-empty">Nothing to diff here.</p>';
    var n = 0;
    return posts.map(function (p) {
      var lines = (p.body.match(/.{1,84}(\s|$)/g) || [p.body]).map(function (t) {
        n += 1;
        return '<div class="cn-l cn-add"><span>' + n + "</span><code>+ " + esc(t.trim()) + "</code></div>";
      }).join("");
      return '<div class="cn-hunk" data-key="' + esc(p.id) + '"' +
        (String(p.id).indexOf("live-") === 0 ? ' data-live="true"' : "") + ">" +
        '<div class="cn-hh">' + esc(window.NB_ASCII.rule(
          "@@ " + p.at + " @@ " + p.who + " · " + p.state, 84)) + "</div>" +
        (p.subject ? '<div class="cn-l cn-ctx"><span></span><code>  ' + esc(p.subject) + "</code></div>" : "") +
        lines +
        '<div class="cn-l cn-meta"><span></span><code>' + esc(p.sig) +
        (p.anchor ? "  →  " + esc(p.anchor) : "") + "</code></div></div>";
    }).join("");
  }

  /** Plain transcript, for when structure is in the way. */
  function viewRaw(entries) {
    var posts = entries.filter(function (e) { return e.post; }).map(function (e) { return e.post; });
    if (!posts.length) return '<p class="cn-empty">Nothing here.</p>';
    return '<pre class="cn-raw">' + posts.map(function (p, i) {
      return esc(window.NB_ASCII.branch(i === posts.length - 1, 1) +
        p.at + "  " + p.who.padEnd(9) + " " + (p.subject ? p.subject + " — " : "") + p.body);
    }).join("\n\n") + "</pre>";
  }

  /** A single entry that is not a post: a member, a project, an epoch. */
  function viewEntry(entry, path) {
    if (!entry) return '<p class="cn-empty">Select something on the left.</p>';
    if (entry.post) return null;
    var rows = [["path", path], ["kind", entry.kind], ["", entry.meta || ""], ["", entry.hint || ""]]
      .filter(function (r) { return r[1]; })
      .map(function (r) { return '<div class="cn-fact"><dt>' + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd></div>"; })
      .join("");
    return '<div class="cn-card"><b>' + esc(entry.name) + "</b>" + rows + "</div>";
  }

  /* ── Columns ───────────────────────────────────────────────────────────── */

  /** Activity per channel, bucketed, for the column sparkline. */
  function activityOf(entry, path) {
    if (entry.kind !== "dir") return null;
    var A = window.NB_ASCII;
    var full = MAP.resolve(path, entry.name);
    var live = (window.NB_APP && window.NB_APP.state && window.NB_APP.state.merged) || [];
    var kids = MAP.list(full, live) || [];
    var posts = kids.filter(function (k) { return k.post; }).map(function (k) { return k.post; });
    // Under four posts a resampled line is all one height — a solid bar that
    // reads as a badge and says nothing. A reading that cannot vary is noise.
    if (posts.length < 4) return null;
    var buckets = [0, 0, 0, 0, 0, 0, 0, 0];
    var mins = posts.map(function (p) {
      var t = String(p.at).split(":");
      return Number(t[0]) * 60 + Number(t[1]);
    });
    var lo = Math.min.apply(null, mins), hi = Math.max.apply(null, mins);
    mins.forEach(function (m) {
      var i = hi === lo ? 0 : Math.floor(((m - lo) / (hi - lo)) * (buckets.length - 1));
      buckets[i] += 1;
    });
    var line = A.sparkline(buckets, 8);
    var distinct = {};
    line.split("").forEach(function (ch) { distinct[ch] = 1; });
    return Object.keys(distinct).length > 1 ? line : null;
  }

  /** What a channel is, above what it contains. */
  function contextStrip(label, extra) {
    var chan = null;
    for (var i = 0; i < D.channels.length; i++) if (D.channels[i].label === label) chan = D.channels[i];
    if (!chan) return "";
    var posts = D.posts.concat(extra || []).filter(function (p) { return p.channel === chan.id; });
    var last = posts.length ? posts[posts.length - 1] : null;
    var spark = activityOf({ kind: "dir", name: label }, "/channels");
    return '<div class="cn-ctx" data-key="ctx-' + esc(label) + '">' +
      '<b class="cn-ctx-name">#' + esc(label) + "</b>" +
      '<span class="cn-ctx-kind" data-kind="' + esc(chan.kind) + '">' + esc(chan.kind) + "</span>" +
      '<span class="cn-ctx-fact">' + posts.length + (posts.length === 1 ? " post" : " posts") + "</span>" +
      (chan.unread ? '<span class="cn-badge">' + chan.unread + " new</span>" : "") +
      (spark ? '<span class="cn-spark" aria-hidden="true">' + spark + "</span>" : "") +
      (last ? '<span class="cn-ctx-fact">last ' + esc(last.at) + " by " + esc(last.who) + "</span>" : "") +
      "</div>";
  }

  function columnHtml(path, entries, cursor, focused, index, filter) {
    var shown = entries;
    if (filter) {
      shown = entries.filter(function (e) {
        return window.NB_COMPLETE.score(e.name, filter) !== null;
      });
    }
    var items = shown.map(function (e, i) {
      var isDir = e.kind === "dir";
      var spark = activityOf(e, path);
      return '<button type="button" class="cn-item" data-key="' + esc(e.name) + '"' +
        ' data-path="' + esc(MAP.resolve(path, e.name)) + '" data-col="' + index + '" data-i="' + i + '"' +
        ' data-kind="' + esc(e.kind) + '"' + (e.meta ? ' data-meta="' + esc(e.meta) + '"' : "") +
        (i === cursor ? ' aria-current="true"' : "") + ">" +
        '<span class="cn-sig" aria-hidden="true">' + (isDir ? "▸" : e.kind === "agent" ? "*" : "·") + "</span>" +
        '<span class="cn-name">' + esc(e.name) + "</span>" +
        (e.unread ? '<span class="cn-badge">' + e.unread + "</span>" :
          '<span class="cn-hint">' + (spark ? '<span class="cn-spark" aria-hidden="true">' + spark + "</span> " : "") +
          esc(e.hint || "") + "</span>") +
        "</button>";
    }).join("");
    return '<div class="cn-col" data-column="' + index + '"' + (focused ? ' data-focus="true"' : "") + ">" +
      '<div class="cn-col-head">' + esc(path === "/" ? "/" : path) +
      (filter ? '<span class="cn-filter">/' + esc(filter) + "</span>" : "") + "</div>" +
      '<div class="cn-col-body">' + (items || '<p class="cn-empty">empty</p>') + "</div></div>";
  }

  /* ── The experience ────────────────────────────────────────────────────── */

  var CONSOLE = {
    id: "console",
    name: "Console",
    thesis: "The board as a filesystem. Miller columns and a completing command line address the same paths, and the preview reads work as a graph or a patch.",
    keys: "[←→] column  [↑↓] entry  [Enter] open  [:] command  [/] filter  [v] view  [Tab] complete",

    css: `
    [data-exp="console"]{display:grid;grid-template-rows:auto minmax(0,1fr) auto;height:100%}

    /* Breadcrumb. Clickable, because the path is also the navigation. */
    [data-exp="console"] .cn-path{display:flex;gap:.15rem;align-items:center;flex-wrap:wrap;
      padding:.4rem .8rem;border-block-end:1px solid var(--nb-rule);font-size:.9em}
    [data-exp="console"] .cn-crumb{background:none;border:0;font:inherit;color:var(--nb-ink-dim);
      cursor:pointer;padding:.1rem .2rem;border-radius:var(--nb-radius)}
    [data-exp="console"] .cn-crumb:hover{color:var(--nb-ink);text-decoration:underline}
    [data-exp="console"] .cn-crumb:last-of-type{color:var(--nb-ink);font-weight:700}
    [data-exp="console"] .cn-sep{color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-views{margin-inline-start:auto;display:flex;gap:.25rem}
    [data-exp="console"] .cn-view{background:none;border:1px solid var(--nb-rule);font:inherit;
      color:var(--nb-ink-dim);cursor:pointer;padding:0 .5rem;min-height:1.7rem;border-radius:var(--nb-radius)}
    [data-exp="console"] .cn-view[aria-pressed=true]{background:var(--nb-accent);color:var(--nb-accent-ink);
      border-color:var(--nb-accent)}

    /* Miller columns. Ranger's model: your whole path is on screen — where
       the screen can hold it. Narrower, the columns concede in the same order
       a terminal multiplexer would: the parent goes first, then the preview
       stacks under the listing instead of beside it. */
    [data-exp="console"] .cn-cols{display:grid;
      grid-template-columns:var(--nb-c0,15rem) 6px var(--nb-c1,20rem) 6px minmax(0,1fr);
      min-height:0;overflow:hidden}

    /* Splitters. The divider is the pane's own control: drag resizes,
       double-click or Enter collapses and reopens, arrows nudge. A separate
       chrome of dock buttons would say the same things with more furniture. */
    [data-exp="console"] .cn-split{cursor:col-resize;position:relative;touch-action:none}
    [data-exp="console"] .cn-split::before{content:"";position:absolute;inset-block:0;
      inset-inline-start:2px;width:2px;background:var(--nb-rule)}
    [data-exp="console"] .cn-split:hover::before,
    [data-exp="console"] .cn-split:focus-visible::before{background:var(--nb-accent)}
    [data-exp="console"] .cn-split:focus-visible{outline:none}
    [data-exp="console"] .cn-split[data-closed=true]::before{background:var(--nb-accent);opacity:.55}
    [data-exp="console"] .cn-col{border-inline-end:0}
    @media (max-width: 64rem){
      [data-exp="console"] .cn-cols{grid-template-columns:var(--nb-c1,14rem) 6px minmax(0,1fr)}
      [data-exp="console"] .cn-col[data-column="0"],
      [data-exp="console"] .cn-split[data-split="0"]{display:none}
    }
    @media (max-width: 40rem){
      /* Phone: the listing and the preview become swipe pages — the touch
         gesture a feed already taught everyone — instead of two slivers. */
      [data-exp="console"] .cn-cols{grid-template-columns:repeat(2,100%);
        overflow-x:auto;scroll-snap-type:x mandatory}
      [data-exp="console"] .cn-split{display:none}
      [data-exp="console"] .cn-col{scroll-snap-align:start;opacity:1;border-inline-end:0}
    }
    @media (max-height: 40rem){
      [data-exp="console"] .cn-out{max-height:5.5rem}
    }
    [data-exp="console"] .cn-col{display:grid;grid-template-rows:auto minmax(0,1fr);min-width:0;
      border-inline-end:1px solid var(--nb-rule);opacity:.62}
    [data-exp="console"] .cn-col[data-focus=true]{opacity:1}
    [data-exp="console"] .cn-col-head{padding:.3rem .6rem;border-block-end:1px solid var(--nb-rule);
      color:var(--nb-ink-faint);font-size:.8em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    [data-exp="console"] .cn-filter{color:var(--nb-accent);margin-inline-start:.4rem}
    [data-exp="console"] .cn-col-body{overflow:auto}
    [data-exp="console"] .cn-item{display:grid;grid-template-columns:1.1rem minmax(0,1fr) auto;gap:.45rem;
      align-items:baseline;width:100%;padding:.18rem .6rem;background:none;border:0;font:inherit;
      color:var(--nb-ink);cursor:pointer;text-align:start;min-height:1.9rem}
    [data-exp="console"] .cn-item:hover{background:var(--nb-surface)}
    [data-exp="console"] .cn-col[data-focus=true] .cn-item[aria-current=true]{
      background:var(--nb-accent);color:var(--nb-accent-ink)}
    [data-exp="console"] .cn-col[data-focus=true] .cn-item[aria-current=true] .cn-hint{color:inherit;opacity:.8}
    [data-exp="console"] .cn-item[aria-current=true]{background:var(--nb-surface)}
    [data-exp="console"] .cn-sig{color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-item[data-kind=agent] .cn-sig{color:var(--nb-agent)}
    [data-exp="console"] .cn-item[data-meta=promoted] .cn-name{color:var(--nb-accent)}
    [data-exp="console"] .cn-item[data-meta="needs-review"] .cn-name{color:var(--nb-warn)}
    [data-exp="console"] .cn-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    [data-exp="console"] .cn-hint{color:var(--nb-ink-faint);font-size:.82em;white-space:nowrap}
    /* ASCII carries readings here, so it takes ink weight rather than decoration. */
    [data-exp="console"] .cn-spark{color:var(--nb-live);letter-spacing:-.06em;opacity:.7;font-size:.9em}
    /* On a selected row the live ink fights the selection wash, so it defers. */
    [data-exp="console"] [aria-current="true"] .cn-spark{color:currentColor}
    [data-exp="console"] .cn-sigil{color:var(--nb-signed);letter-spacing:-.05em;margin-inline-end:.35rem}
    [data-exp="console"] .cn-merge{font-variant-numeric:tabular-nums}
    [data-exp="console"] .cn-badge{background:var(--nb-accent);color:var(--nb-accent-ink);padding:0 .35rem;font-size:.8em}

    /* Preview: the graph, the diff, or the raw transcript. */
    [data-exp="console"] .cn-pane{border-inline-end:0;overflow:auto;padding:.5rem 0}
    [data-exp="console"] .cn-empty{color:var(--nb-ink-faint);padding:.6rem .8rem}
    [data-exp="console"] .cn-graph{padding:.3rem 0}
    @media (prefers-reduced-motion: no-preference){
      /* Arrival: a live post rises into the stream. Possible at all only
         because the morph inserts the one new node instead of rebuilding the
         list — a restarted animation is an invisible one. */
      [data-exp="console"] [data-live=true]{animation:cn-arrive .45s cubic-bezier(.2,.8,.2,1) both}
      [data-exp="console"] [data-live=true] .cn-dot{animation:cn-ping 1.2s ease-out 1}
      /* The marked node breathes once so the eye lands on it after a jump. */
      [data-exp="console"] .cn-node[data-here=true] .cn-dot{animation:cn-ping 1.2s ease-out 1}
      [data-exp="console"] .cn-badge{animation:cn-arrive .3s ease-out both}
    }
    @keyframes cn-arrive{from{opacity:0;translate:0 .5rem}to{opacity:1;translate:0 0}}
    @keyframes cn-ping{0%{box-shadow:0 0 0 2px var(--nb-live),0 0 0 0 var(--nb-live)}
      100%{box-shadow:0 0 0 2px var(--nb-live),0 0 0 .8rem transparent}}
    [data-exp="console"] .cn-node{position:relative;display:grid;grid-template-columns:2.6rem minmax(0,1fr);
      padding:.35rem .8rem}
    [data-exp="console"] .cn-node::before{content:"";position:absolute;inset-block:0;
      inset-inline-start:calc(2.2rem - 1px);width:2px;
      background:color-mix(in srgb,var(--nb-ink-dim) 45%,transparent)}
    [data-exp="console"] .cn-node:first-child::before{inset-block-start:50%}
    [data-exp="console"] .cn-node:last-child::before{inset-block-end:50%}
    [data-exp="console"] .cn-dot{position:relative;z-index:1;margin-inline-start:1.05rem;margin-block-start:.3rem;
      width:.7rem;height:.7rem;border-radius:50%;background:var(--nb-bg);box-shadow:0 0 0 2px var(--nb-ink-dim)}
    [data-exp="console"] .cn-node[data-kind=agent] .cn-dot{box-shadow:0 0 0 2px var(--nb-agent)}
    [data-exp="console"] .cn-node[data-state-of=promoted] .cn-dot{background:var(--nb-accent);
      box-shadow:0 0 0 2px var(--nb-accent)}
    /* The fork lane. It opens with an elbow at the promotion — a curve, the
       way a graph tool draws a branch leaving the trunk — runs beside the
       rail while the thread is a signed intent, and closes with a mirrored
       elbow into the merge line. Straight bars read as a table border; the
       curve is what makes it read as lineage. */
    [data-exp="console"] .cn-node[data-fork=true] .cn-branch{position:absolute;inset-block:0;
      inset-inline-start:1.3rem;width:2px;background:var(--nb-accent);opacity:.75}
    [data-exp="console"] .cn-node[data-state-of=promoted] .cn-branch{inset-block-start:.62rem;
      inset-inline-start:1.3rem;width:.9rem;background:none;
      border-inline-start:2px solid var(--nb-accent);border-block-start:2px solid var(--nb-accent);
      border-start-start-radius:.55rem;opacity:.75}
    [data-exp="console"] .cn-node[data-here=true]{background:var(--nb-surface)}
    [data-exp="console"] .cn-node[data-here=true] .cn-dot{box-shadow:0 0 0 2px var(--nb-accent),0 0 8px var(--nb-accent)}
    [data-exp="console"] .cn-node-body{min-width:0}
    [data-exp="console"] .cn-node-body p{margin:.1rem 0 0;max-width:76ch}
    [data-exp="console"] .cn-subject{display:block;margin-block-start:.15rem}
    [data-exp="console"] .cn-twist{background:none;border:0;font:inherit;font-size:.82em;
      color:var(--nb-accent);cursor:pointer;padding:.1rem 0;display:block;margin-block-start:.15rem}
    [data-exp="console"] .cn-twist:hover{text-decoration:underline}
    /* Replies indent under what they answer; the spine is the thread. */
    [data-exp="console"] .cn-replies{margin-inline-start:2.15rem;
      border-inline-start:1px solid var(--nb-rule)}
    /* A thread inside the fork carries the lane's ink on its spine; it does
       not draw lane segments of its own at reply indentation. */
    [data-exp="console"] .cn-replies[data-fork=true]{border-inline-start-color:var(--nb-accent)}
    [data-exp="console"] .cn-replies .cn-node::before{display:none}
    [data-exp="console"] .cn-replies .cn-node{grid-template-columns:2rem minmax(0,1fr);padding-inline-start:.5rem}
    [data-exp="console"] .cn-replies .cn-dot{margin-inline-start:.55rem;width:.55rem;height:.55rem}

    /* What the channel is, before what it contains. One line of facts. */
    [data-exp="console"] .cn-ctx{display:flex;gap:.7rem;align-items:baseline;flex-wrap:wrap;
      padding:.45rem .8rem;border-block-end:1px solid var(--nb-rule);font-size:.9em}
    [data-exp="console"] .cn-ctx-name{color:var(--nb-ink)}
    [data-exp="console"] .cn-ctx-kind{color:var(--nb-ink-faint);border:1px solid var(--nb-rule);
      padding:0 .35rem;border-radius:var(--nb-radius);font-size:.85em}
    [data-exp="console"] .cn-ctx-fact{color:var(--nb-ink-faint)}

    [data-exp="console"] .cn-merge{position:relative;padding:.5rem .8rem .5rem 3.2rem;color:var(--nb-accent);
      border-block-start:1px solid var(--nb-rule);margin-block-start:.4rem}
    [data-exp="console"] .cn-merge[data-no-lane=true]::before{display:none}
    [data-exp="console"] .cn-merge::before{content:"";position:absolute;inset-inline-start:1.3rem;
      inset-block-start:-.45rem;inset-block-end:calc(50% - 1px);width:.9rem;
      border-inline-start:2px solid var(--nb-accent);border-block-end:2px solid var(--nb-accent);
      border-end-start-radius:.55rem;opacity:.75}
    [data-exp="console"] .cn-hunk{border-block-end:1px solid var(--nb-rule)}
    [data-exp="console"] .cn-hh{padding:.25rem .8rem;background:var(--nb-surface);color:var(--nb-ink-dim);font-size:.85em}
    [data-exp="console"] .cn-l{display:grid;grid-template-columns:3.2rem minmax(0,1fr);font-size:.9em}
    [data-exp="console"] .cn-l span{color:var(--nb-ink-faint);text-align:end;padding-inline-end:.6rem;user-select:none}
    [data-exp="console"] .cn-l code{white-space:pre-wrap;padding-inline-start:.4rem}
    [data-exp="console"] .cn-add{background:color-mix(in srgb,var(--nb-live) 12%,transparent)}
    [data-exp="console"] .cn-ctx code{color:var(--nb-ink-dim)}
    [data-exp="console"] .cn-meta{background:color-mix(in srgb,var(--nb-accent) 10%,transparent)}
    [data-exp="console"] .cn-raw{margin:0;padding:.6rem .8rem;white-space:pre-wrap}
    [data-exp="console"] .cn-card{padding:.7rem .8rem}
    [data-exp="console"] .cn-fact{display:flex;gap:.7rem;padding:.15rem 0}
    [data-exp="console"] .cn-fact dt{color:var(--nb-ink-faint);min-width:4rem}
    [data-exp="console"] .cn-fact dd{margin:0}

    /* The command line, with a candidate menu above it. */
    [data-exp="console"] .cn-cli{border-block-start:1px solid var(--nb-rule);position:relative}
    [data-exp="console"] .cn-menu{position:absolute;inset-block-end:100%;inset-inline:0;max-height:14rem;
      overflow:auto;background:var(--nb-bg);border-block-start:1px solid var(--nb-rule);display:none}
    [data-exp="console"] .cn-cli[data-open=true] .cn-menu{display:block}
    [data-exp="console"] .cn-cand{display:grid;grid-template-columns:minmax(0,14rem) minmax(0,1fr);gap:.8rem;
      padding:.18rem .8rem;cursor:pointer}
    [data-exp="console"] .cn-cand[aria-current=true]{background:var(--nb-accent);color:var(--nb-accent-ink)}
    [data-exp="console"] .cn-cand i{font-style:normal;color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-cand[aria-current=true] i{color:inherit;opacity:.8}
    [data-exp="console"] .cn-prompt{display:flex;align-items:center;gap:.4rem;padding:.35rem .8rem}
    [data-exp="console"] .cn-ps1{color:var(--nb-accent);white-space:nowrap}
    [data-exp="console"] .cn-mode{font:inherit;background:none;border:1px solid var(--nb-rule);
      color:var(--nb-ink-dim);cursor:pointer;padding:0 .5rem;min-height:1.7rem;border-radius:var(--nb-radius)}
    [data-exp="console"] .cn-mode[aria-pressed=true]{background:var(--nb-agent);color:var(--nb-bg);
      border-color:var(--nb-agent)}
    [data-exp="console"] .cn-ev{display:grid;grid-template-columns:5.5rem minmax(0,1fr);gap:.6rem;padding:.1rem 0}
    [data-exp="console"] .cn-ev b{color:var(--nb-ink-faint);font-weight:400;font-size:.85em}
    [data-exp="console"] .cn-ev[data-ev=TOOL_CALL_ARGS] b{color:var(--nb-agent)}
    [data-exp="console"] .cn-ev[data-ev=RUN_ERROR] b,[data-exp="console"] .cn-ev[data-ev=RUN_ERROR] span{color:var(--nb-danger)}
    [data-exp="console"] .cn-ev[data-ev=TEXT_MESSAGE_CONTENT] span{color:var(--nb-ink)}
    [data-exp="console"] .cn-input-wrap{position:relative;flex:1;min-width:0}
    [data-exp="console"] .cn-ghost{position:absolute;inset:0;pointer-events:none;color:var(--nb-ink-faint);
      white-space:pre;overflow:hidden}
    [data-exp="console"] .cn-input{width:100%;background:transparent;border:0;color:var(--nb-ink);
      font:inherit;outline:0;position:relative}
    [data-exp="console"] .cn-out{max-height:11rem;overflow:auto;padding:0 .8rem .4rem;white-space:pre-wrap;
      color:var(--nb-ink-dim);font-size:.9em}
    [data-exp="console"] .cn-out:empty{display:none}
    [data-exp="console"] .cn-cli[data-out-min=true] .cn-out{display:none}
    [data-exp="console"] .cn-out-min{background:none;border:1px solid var(--nb-rule);font:inherit;
      color:var(--nb-ink-faint);cursor:pointer;min-width:1.7rem;min-height:1.7rem;
      border-radius:var(--nb-radius);align-self:center}
    [data-exp="console"] .cn-out-min:hover{color:var(--nb-ink);border-color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-out b{color:var(--nb-ink)}

    /* Touch is a peer, not an afterthought: every control clears the 32px floor
       wherever the pointer is coarse, which is also where the keyboard is not
       available to compensate. */
    @media (pointer:coarse),(max-width:900px){
      [data-exp="console"] .cn-item{min-height:2.5rem;padding-block:.4rem}
      [data-exp="console"] .cn-view{min-height:2.25rem;padding-inline:.75rem}
      [data-exp="console"] .cn-crumb{min-height:2.25rem;padding-inline:.45rem}
      [data-exp="console"] .cn-cand{min-height:2.5rem;align-items:center}
      [data-exp="console"] .cn-path{gap:.25rem}
    }`,

    render: function (state) {
      var extra = state.merged;
      var path = state.path || "/";
      var parts = MAP.split(path);
      var parentPath = MAP.join(parts.slice(0, -1));
      var parentEntries = MAP.list(parentPath, extra) || [];
      var here = MAP.list(path, extra) || [];
      var cursor = Math.min(state.cursor || 0, Math.max(0, here.length - 1));
      var selected = here[cursor];
      var parentCursor = parts.length
        ? Math.max(0, parentEntries.findIndex(function (e) { return e.name === parts[parts.length - 1]; }))
        : 0;

      var preview;
      var ctxLabel = null;
      if (selected && selected.kind === "dir") {
        var childPath = MAP.resolve(path, selected.name);
        var child = MAP.list(childPath, extra) || [];
        preview = state.view === "diff" ? viewDiff(child)
          : state.view === "raw" ? viewRaw(child) : viewGraph(child, null, state.folded);
        if (!child.some(function (e) { return e.post; })) {
          preview = columnHtml(childPath, child, -1, false, 2, "");
        }
        // Selecting a channel shows what the channel *is* before what it holds.
        if (path === "/channels") ctxLabel = selected.name;
      } else if (selected && selected.post) {
        // Show the whole lineage with this node marked. A one-node graph is not
        // a graph, and the reason to be in this view is the shape around it.
        preview = state.view === "diff" ? viewDiff([selected])
          : state.view === "raw" ? viewRaw([selected])
          : viewGraph(here, selected.post.id, state.folded);
      } else {
        preview = viewEntry(selected, MAP.resolve(path, selected ? selected.name : ""));
      }
      // Standing inside a channel keeps its context above the conversation.
      if (!ctxLabel && parts[0] === "channels" && parts[1]) ctxLabel = parts[1];
      if (ctxLabel) preview = contextStrip(ctxLabel, extra) + preview;

      var crumbs = ['<button type="button" class="cn-crumb" data-goto="/">board</button>'];
      parts.forEach(function (seg, i) {
        crumbs.push('<span class="cn-sep">/</span>');
        crumbs.push('<button type="button" class="cn-crumb" data-goto="' +
          esc(MAP.join(parts.slice(0, i + 1))) + '">' + esc(seg) + "</button>");
      });

      var views = ["graph", "diff", "raw"].map(function (v) {
        return '<button type="button" class="cn-view" data-view="' + v + '"' +
          (state.view === v ? ' aria-pressed="true"' : "") + ">" + v + "</button>";
      }).join("");

      var cand = state.completion || { candidates: [], ghost: "" };
      var menu = cand.candidates.slice(0, 40).map(function (c, i) {
        return '<div class="cn-cand" data-cand="' + i + '"' +
          (i === (state.candIndex || 0) ? ' aria-current="true"' : "") + ">" +
          "<span>" + esc(c.value) + "</span><i>" + esc(c.hint || "") + "</i></div>";
      }).join("");

      var panes = state.panes || { c0: 15, c1: 20, mc0: false, mc1: false, out: false, zoom: false };
      var w0 = panes.zoom || panes.mc0 ? "0rem" : panes.c0 + "rem";
      var w1 = panes.zoom || panes.mc1 ? "0rem" : panes.c1 + "rem";
      function splitter(i, closed) {
        return '<div class="cn-split" data-split="' + i + '" data-closed="' + closed + '" role="separator"' +
          ' aria-orientation="vertical" tabindex="0"' +
          ' aria-label="Resize columns — drag or arrow keys; Enter collapses"></div>';
      }
      return (
        '<div class="cn-path">' + crumbs.join("") + '<div class="cn-views">' + views + "</div></div>" +
        '<div class="cn-cols" data-zoom="' + !!panes.zoom + '" style="--nb-c0:' + w0 + ";--nb-c1:" + w1 + '">' +
        columnHtml(parentPath, parentEntries, parentCursor, state.focus === 0, 0, "") +
        splitter(0, panes.zoom || panes.mc0) +
        columnHtml(path, here, cursor, state.focus === 1, 1, state.filter) +
        splitter(1, panes.zoom || panes.mc1) +
        '<div class="cn-col cn-pane" data-column="2"' + (state.focus === 2 ? ' data-focus="true"' : "") + ">" +
        preview + "</div>" +
        "</div>" +
        '<div class="cn-cli" data-open="' + (state.cliOpen && cand.candidates.length > 1) + '"' +
        (panes && panes.out ? ' data-out-min="true"' : "") + ">" +
        '<div class="cn-menu">' + menu + "</div>" +
        '<div class="cn-out">' + (state.out || []).slice(-8).join("\n") + "</div>" +
        '<div class="cn-prompt">' +
        '<button type="button" class="cn-mode" data-mode-toggle aria-pressed="' + (state.ai ? "true" : "false") +
        '" title="Alt+A — in AI mode your words are interpreted before they run">' +
        (state.ai ? "ai" : "cli") + "</button>" +
        '<span class="cn-ps1">' + esc(path) + (state.ai ? " ›" : " $") + "</span>" +
        '<span class="cn-input-wrap"><span class="cn-ghost" data-ghost></span>' +
        '<input class="cn-input" data-cli autocomplete="off" spellcheck="false" aria-label="Command"></span>' +
        ((state.out || []).length
          ? '<button type="button" class="cn-out-min" data-out-toggle aria-expanded="' + !(panes && panes.out) + '"' +
            ' title="Show or hide the transcript">' + (panes && panes.out ? "⌃" : "⌄") + "</button>"
          : "") +
        "</div></div>"
      );
    },
  };

  window.NB_EXPERIENCES = [CONSOLE];
  window.NB_CONSOLE_VIEWS = { graph: viewGraph, diff: viewDiff, raw: viewRaw };
})();
