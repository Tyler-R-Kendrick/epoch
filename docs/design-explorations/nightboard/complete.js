/**
 * Completion, of the kind a power user expects.
 *
 * What "advanced CLI" actually means here, concretely:
 *
 *   fish-style ghost   the most likely completion appears ahead of the cursor
 *                      in dim text; → or End accepts it
 *   fuzzy subsequence  `cd cgen` reaches /channels/general, ranked by how
 *                      tightly the letters cluster and whether they start words
 *   tab discipline     Tab completes the longest common prefix first, and only
 *                      cycles once there is nothing unambiguous left to add
 *   path awareness     completion knows whether the argument is a path, a
 *                      channel, a member or a view name, per command
 *   history            ↑/↓ walk it; the ghost draws on it when the sitemap has
 *                      nothing better
 *
 * The ranking is the part that decides whether this feels sharp or annoying, so
 * it is scored rather than alphabetical.
 */
(function () {
  "use strict";

  var MAP = window.NB_MAP;

  var COMMANDS = [
    { name: "cd", arg: "path", help: "change directory" },
    { name: "ls", arg: "path", help: "list a directory" },
    { name: "cat", arg: "path", help: "read one entry in full" },
    { name: "view", arg: "view", help: "graph | diff | raw" },
    { name: "find", arg: "text", help: "search names anywhere" },
    { name: "grep", arg: "text", help: "search post bodies" },
    { name: "tail", arg: null, help: "load queued posts" },
    { name: "watch", arg: null, help: "resume the live stream" },
    { name: "stat", arg: null, help: "epoch status" },
    { name: "help", arg: null, help: "this list" },
    { name: "clear", arg: null, help: "clear the transcript" },
  ];

  /**
   * Fuzzy subsequence score. Higher is better; null means no match.
   * Rewards prefix matches, word starts, and tight runs — the three things that
   * make a completion feel like it read your mind rather than your letters.
   */
  function score(candidate, query) {
    if (query === "") return 1;
    var c = candidate.toLowerCase();
    var q = query.toLowerCase();
    if (c === q) return 1000;
    if (c.indexOf(q) === 0) return 800 - candidate.length;
    var ci = 0, run = 0, points = 0;
    for (var qi = 0; qi < q.length; qi++) {
      var found = c.indexOf(q[qi], ci);
      if (found === -1) return null;
      if (found === ci) { run += 1; points += 10 + run * 4; }
      else { run = 0; points += 2; }
      // A letter landing at a word boundary is worth more than one mid-word.
      if (found === 0 || /[-/_ .]/.test(c[found - 1])) points += 12;
      ci = found + 1;
    }
    return points - candidate.length * 0.4;
  }

  function rank(candidates, query) {
    return candidates
      .map(function (x) { return { value: x.value, hint: x.hint, kind: x.kind, s: score(x.value, query) }; })
      .filter(function (x) { return x.s !== null; })
      .sort(function (a, b) { return b.s - a.s; });
  }

  /** Longest common prefix of the ranked values, for the first Tab press. */
  function commonPrefix(values) {
    if (!values.length) return "";
    var p = values[0];
    for (var i = 1; i < values.length; i++) {
      var j = 0;
      while (j < p.length && j < values[i].length && p[j].toLowerCase() === values[i][j].toLowerCase()) j++;
      p = p.slice(0, j);
      if (p === "") break;
    }
    return p;
  }

  /**
   * Every directory in the tree, as absolute paths.
   *
   * Used when a fragment matches nothing in the current directory. A power user
   * typing `cd cgen` from anywhere means /channels/general, and making them
   * walk there first is the difference between a shell and a toy — this is the
   * same move zoxide and fzf made.
   */
  function globalDirs(extra) {
    var out = [];
    (MAP.list("/", extra) || []).forEach(function (top) {
      var topPath = "/" + top.name;
      out.push({ value: topPath, hint: top.hint || "", kind: "dir" });
      (MAP.list(topPath, extra) || []).forEach(function (child) {
        if (child.kind !== "dir") return;
        out.push({ value: topPath + "/" + child.name, hint: child.hint || "", kind: "dir" });
      });
    });
    return out;
  }

  /** Path candidates for the directory the fragment points into. */
  function pathCandidates(cwd, fragment, extra) {
    var lastSlash = fragment.lastIndexOf("/");
    var dirPart = lastSlash === -1 ? "" : fragment.slice(0, lastSlash + 1);
    var leaf = lastSlash === -1 ? fragment : fragment.slice(lastSlash + 1);
    var dir = MAP.resolve(cwd, dirPart === "" ? "." : dirPart);
    var entries = MAP.list(dir, extra);
    if (!entries) return { base: dirPart, leaf: leaf, items: [] };
    var items = entries.map(function (e) {
      return {
        value: e.name + (e.kind === "dir" ? "/" : ""),
        hint: e.hint || e.meta || "",
        kind: e.kind,
      };
    });
    // `..` is a real destination and completing it saves a lot of typing.
    if (MAP.split(dir).length > 0) items.unshift({ value: "../", hint: "up", kind: "dir" });
    return { base: dirPart, leaf: leaf, items: items };
  }

  /**
   * Analyse a partial command line and produce everything the UI needs:
   * the ranked candidates, what a Tab should insert, and the ghost text.
   */
  function analyse(input, ctx) {
    var text = String(input == null ? "" : input);
    var trailingSpace = /\s$/.test(text);
    var tokens = text.split(/\s+/).filter(function (t, i) { return t !== "" || i === 0; });
    var cwd = ctx.cwd;
    var extra = ctx.extra;

    // Completing the command itself.
    if (tokens.length <= 1 && !trailingSpace) {
      var q = tokens[0] || "";
      var ranked = rank(COMMANDS.map(function (c) {
        return { value: c.name, hint: c.help, kind: "cmd" };
      }), q);
      var prefix = commonPrefix(ranked.map(function (r) { return r.value; }));
      return {
        kind: "command",
        query: q,
        candidates: ranked,
        replaceFrom: 0,
        insert: prefix.length > q.length ? prefix : (ranked[0] ? ranked[0].value : q),
        ghost: ranked.length && ranked[0].value.toLowerCase().indexOf(q.toLowerCase()) === 0
          ? ranked[0].value.slice(q.length) + " "
          : "",
      };
    }

    var cmdName = tokens[0];
    var spec = COMMANDS.filter(function (c) { return c.name === cmdName; })[0];
    var fragment = trailingSpace ? "" : tokens[tokens.length - 1];
    var fragStart = text.length - fragment.length;

    if (!spec || spec.arg === null) {
      return { kind: "none", candidates: [], ghost: "", replaceFrom: fragStart, insert: fragment, query: fragment };
    }

    if (spec.arg === "view") {
      var views = [
        { value: "graph", hint: "lineage as a commit graph", kind: "view" },
        { value: "diff", hint: "entries as patches", kind: "view" },
        { value: "raw", hint: "plain transcript", kind: "view" },
      ];
      var rv = rank(views, fragment);
      return {
        kind: "view", query: fragment, candidates: rv, replaceFrom: fragStart,
        insert: rv[0] ? rv[0].value : fragment,
        ghost: rv.length && rv[0].value.indexOf(fragment) === 0 ? rv[0].value.slice(fragment.length) : "",
      };
    }

    if (spec.arg === "text") {
      return { kind: "text", query: fragment, candidates: [], replaceFrom: fragStart, insert: fragment, ghost: "" };
    }

    var pc = pathCandidates(cwd, fragment, extra);
    var local = rank(pc.items, pc.leaf);
    var scope = "local";

    // Local and global are merged rather than tried in order. Falling back only
    // at zero matches meant one weak local hit could hide an obviously better
    // destination elsewhere in the tree — `cd ch` matching a post name instead
    // of /channels. Proximity is worth a nudge, not a veto.
    if (pc.leaf !== "") {
      // Score the basename, not the whole path: "/channels" never *starts*
      // with "ch", so scoring the full string buried the obvious answer under
      // any local name that happened to contain the letters.
      var global = globalDirs(extra).map(function (g) {
        var base = g.value.slice(g.value.lastIndexOf("/") + 1);
        var s1 = score(base, pc.leaf);
        var s2 = score(g.value, pc.leaf);
        var best = s1 === null ? s2 : s2 === null ? s1 : Math.max(s1, s2);
        return best === null ? null : { value: g.value, hint: g.hint, kind: g.kind, s: best, absolute: true };
      }).filter(Boolean).sort(function (a, b) { return b.s - a.s; });
      if (global.length) {
        // Proximity is a tiebreaker, not a veto: enough to prefer what is in
        // front of you when the match quality is comparable, not enough to hide
        // a far better destination elsewhere.
        var boosted = local.map(function (l) { return Object.assign({}, l, { s: l.s + 12 }); });
        var merged = boosted.concat(global).sort(function (a, b) { return b.s - a.s; });
        var seen = {};
        local = merged.filter(function (x) {
          if (seen[x.value]) return false;
          seen[x.value] = true;
          return true;
        });
        if (local.length && local[0].absolute) scope = "global";
      }
    }
    var rp = local;

    if (scope === "global") {
      return {
        kind: "path", scope: scope, query: fragment, candidates: rp,
        replaceFrom: fragStart, insert: rp[0].value,
        ghost: rp[0].value.toLowerCase().indexOf(fragment.toLowerCase()) === 0
          ? rp[0].value.slice(fragment.length) : "",
      };
    }
    var prefix2 = commonPrefix(rp.map(function (r) { return r.value; }));
    var best = rp[0] ? rp[0].value : "";
    return {
      kind: "path",
      scope: scope,
      query: pc.leaf,
      candidates: rp,
      replaceFrom: fragStart + pc.base.length,
      insert: prefix2.length > pc.leaf.length ? prefix2 : best,
      ghost: best && best.toLowerCase().indexOf(pc.leaf.toLowerCase()) === 0
        ? best.slice(pc.leaf.length)
        : "",
    };
  }

  window.NB_COMPLETE = { analyse: analyse, COMMANDS: COMMANDS, score: score };
})();
