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
 *   slash commands     `/go bugs` in agent chat — intellisense for chat verbs
 *   smart markers      mid-input triggers: `@` mentions, `#` topics/channels
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
    { name: "sort", arg: "sort", help: "hot | new | top | best" },
    { name: "view", arg: "sort", help: "alias for sort" },
    { name: "find", arg: "text", help: "search names anywhere" },
    { name: "grep", arg: "text", help: "search post bodies" },
    { name: "tail", arg: null, help: "load queued posts" },
    { name: "watch", arg: null, help: "resume the live stream" },
    { name: "stat", arg: null, help: "epoch status" },
    { name: "help", arg: null, help: "this list" },
    { name: "clear", arg: null, help: "clear the transcript" },
  ];

  /**
   * Slash commands for agent/chat mode. Same path/sort completion machinery as
   * the CLI, surfaced as `/name` so the chat box has Discord/Slack-style verbs
   * without sending free text to the model.
   */
  var SLASH_COMMANDS = [
    { name: "/go", arg: "path", help: "navigate to a path", run: "cd" },
    { name: "/cd", arg: "path", help: "navigate (alias of /go)", run: "cd" },
    { name: "/ls", arg: "path", help: "list a directory", run: "ls" },
    { name: "/list", arg: "path", help: "list (alias of /ls)", run: "ls" },
    { name: "/cat", arg: "path", help: "read one entry", run: "cat" },
    { name: "/sort", arg: "sort", help: "hot | new | top | best", run: "sort" },
    { name: "/view", arg: "query", help: "Lucene feed view / projection", run: "view" },
    { name: "/q", arg: "query", help: "alias of /view", run: "view" },
    { name: "/query", arg: "query", help: "alias of /view", run: "view" },
    { name: "/find", arg: "text", help: "search names", run: "find" },
    { name: "/grep", arg: "text", help: "search post bodies", run: "grep" },
    { name: "/load", arg: null, help: "load queued posts", run: "tail" },
    { name: "/tail", arg: null, help: "load queued posts", run: "tail" },
    { name: "/watch", arg: null, help: "resume the live stream", run: "watch" },
    { name: "/pause", arg: null, help: "pause the live stream", run: "pause" },
    { name: "/stat", arg: null, help: "epoch status", run: "stat" },
    { name: "/where", arg: null, help: "current path and selection", run: "where" },
    { name: "/theme", arg: "theme", help: "switch built-in theme", run: "theme" },
    { name: "/ai", arg: null, help: "switch to ai mode", run: "ai" },
    { name: "/cli", arg: null, help: "switch to cli mode", run: "cli" },
    { name: "/clear", arg: null, help: "clear the transcript", run: "clear" },
    { name: "/help", arg: null, help: "list slash commands", run: "slash-help" },
    { name: "/keys", arg: null, help: "open hotkey cheatsheet", run: "keys" },
    { name: "/share", arg: null, help: "copy a nightboard: link", run: "share" },
    { name: "/tab", arg: null, help: "new terminal workspace", run: "tab" },
    { name: "/workspace", arg: null, help: "new terminal workspace", run: "tab" },
    { name: "/reply", arg: "text", help: "start a reply (text after)", run: "reply" },
    { name: "/dm", arg: "handle", help: "open a direct message", run: "dm" },
    { name: "/msg", arg: "handle", help: "alias of /dm", run: "dm" },
    { name: "/notifications", arg: "filter", help: "all|mentions|subscribed|hooks|enable|test", run: "notifications" },
    { name: "/activity", arg: "filter", help: "alias of /notifications", run: "notifications" },
    { name: "/hooks", arg: "cmd", help: "list|events|add|rm|on|off|test|reset", run: "hooks" },
    { name: "/hook", arg: "cmd", help: "alias of /hooks", run: "hooks" },
    { name: "/attach", arg: "cmd", help: "open|list|clear — files for chat context", run: "attach" },
    { name: "/file", arg: "cmd", help: "alias of /attach", run: "attach" },
    { name: "/whoami", arg: null, help: "show profile and space", run: "whoami" },
    { name: "/space", arg: "id", help: "join space (relay+workspace+subreddit)", run: "space" },
    { name: "/spaces", arg: null, help: "list spaces / relays / subreddits", run: "spaces" },
    { name: "/login", arg: "handle", help: "sign in to a space (Bluesky)", run: "login" },
    { name: "/signin", arg: "handle", help: "alias of /login", run: "login" },
    { name: "/claim", arg: "handle", help: "claim anonymous identity in a space", run: "claim" },
    { name: "/logout", arg: null, help: "sign out → Anonymous", run: "logout" },
    { name: "/signout", arg: null, help: "alias of /logout", run: "logout" },
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
    function walk(path, depth) {
      (MAP.list(path, extra) || []).forEach(function (child) {
        if (child.kind !== "dir") return;
        var full = path === "/" ? "/" + child.name : path + "/" + child.name;
        out.push({ value: full, hint: child.hint || "", kind: "dir" });
        // Deep enough to reach /projects/<id>/channels/<room> so `cd bugs`
        // still resolves after channels moved under projects.
        if (depth < 4) walk(full, depth + 1);
      });
    }
    walk("/", 0);
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

  function sortCandidates(fragment) {
    return rank([
      { value: "hot", hint: "score with recency", kind: "sort" },
      { value: "new", hint: "newest first", kind: "sort" },
      { value: "top", hint: "highest score", kind: "sort" },
      { value: "best", hint: "score plus engagement", kind: "sort" },
    ], fragment);
  }

  function themeCandidates(fragment) {
    var themes = (window.NB_THEMES || []).map(function (t) {
      return { value: t.id || t.name, hint: t.name || t.note || "", kind: "theme" };
    });
    if (!themes.length) {
      themes = [
        { value: "nightboard", hint: "default", kind: "theme" },
        { value: "tape", hint: "built-in", kind: "theme" },
      ];
    }
    return rank(themes, fragment);
  }

  function slashSpec(name) {
    var n = String(name || "").toLowerCase();
    if (n.charAt(0) !== "/") n = "/" + n;
    for (var i = 0; i < SLASH_COMMANDS.length; i++) {
      if (SLASH_COMMANDS[i].name === n) return SLASH_COMMANDS[i];
    }
    return null;
  }

  /** True when the line is a slash command (complete or partial). */
  function isSlash(text) {
    var t = String(text || "").trim();
    return t.charAt(0) === "/";
  }

  /**
   * Smart-input markers: mid-line autocomplete triggers, Discord/Slack style.
   *
   *   @  mention a person or agent on the board
   *   #  trending topic, or a channel short-name
   *
   * Extensible: add a MARKER_SPECS entry with char + items() + kind.
   * A marker is active only on the trailing token (no trailing space), after
   * start-of-line or whitespace / open bracket — so `email@x` does not fire.
   */
  var MARKER_KINDS = { mention: 1, topic: 1, channel: 1, marker: 1 };

  function isMarkerKind(kind) {
    return !!(kind && MARKER_KINDS[kind]);
  }

  function mentionItems() {
    var roll = window.NB_MAP && window.NB_MAP.membersForBoard
      ? window.NB_MAP.membersForBoard()
      : ((window.NB_DATA && window.NB_DATA.members) || []);
    return roll.map(function (m) {
      return {
        value: "@" + m.handle,
        hint: (m.role || m.kind || "member") + (m.state ? " · " + m.state : ""),
        kind: "mention",
        rank: m.state === "here" || m.state === "active" || m.state === "working" ? 2
          : m.kind === "agent" ? 1 : 0,
      };
    });
  }

  function topicItems() {
    var topics = ((window.NB_DATA && window.NB_DATA.topics) || []).map(function (t) {
      var tag = t.tag || t.id || String(t);
      return {
        value: "#" + tag,
        hint: t.label || t.hint || "topic",
        kind: "topic",
        rank: typeof t.heat === "number" ? t.heat : 0,
      };
    });
    // Channels ride `#` as well — short names people already know from chat.
    var channels = ((window.NB_DATA && window.NB_DATA.channels) || []).map(function (c) {
      return {
        value: "#" + (c.id || c.label),
        hint: "channel · " + (c.kind || "room"),
        kind: "channel",
        rank: typeof c.count === "number" ? c.count : 0,
      };
    });
    return topics.concat(channels);
  }

  var MARKER_SPECS = [
    { char: "@", kind: "mention", help: "mention a person or agent", items: mentionItems, space: true },
    { char: "#", kind: "topic", help: "trending topic or channel", items: topicItems, space: true },
  ];

  function markerSpec(char) {
    for (var i = 0; i < MARKER_SPECS.length; i++) {
      if (MARKER_SPECS[i].char === char) return MARKER_SPECS[i];
    }
    return null;
  }

  /**
   * If the trailing incomplete token is a smart marker, describe it.
   * Returns null when no marker is active (including after a completed token
   * that already has a trailing space).
   */
  function activeMarker(text) {
    var s = String(text == null ? "" : text);
    if (!s || /\s$/.test(s)) return null;
    // Token starts at BOL or after whitespace / open bracket / quote.
    var re = /(?:^|[\s([{'"“])([@#][\w./+-]*)$/;
    var m = re.exec(s);
    if (!m) return null;
    var token = m[1];
    var char = token.charAt(0);
    var spec = markerSpec(char);
    if (!spec) return null;
    return {
      char: char,
      kind: spec.kind,
      token: token,
      query: token.slice(1),
      replaceFrom: s.length - token.length,
      space: !!spec.space,
      help: spec.help,
      items: spec.items,
    };
  }

  function completeMarker(mark) {
    var items = (mark.items && mark.items()) || [];
    // Rank by fuzzy match on the tag body (without the marker char), with
    // fixture heat / presence as a tiebreaker so empty `@` / `#` still orders.
    var bodyQ = mark.query || "";
    var ranked = items.map(function (it) {
      var body = String(it.value || "").replace(/^[@#]/, "");
      var s = score(body, bodyQ);
      if (s === null && bodyQ !== "") {
        // Also allow matching the full token including the marker.
        s = score(it.value, mark.char + bodyQ);
      }
      if (s === null) return null;
      // Empty query: show everyone/everything, ordered by rank heat.
      if (bodyQ === "") s = 1 + (it.rank || 0) * 0.01;
      else s = s + (it.rank || 0) * 0.01;
      return {
        value: it.value,
        hint: it.hint || "",
        kind: it.kind || mark.kind,
        s: s,
      };
    }).filter(Boolean).sort(function (a, b) { return b.s - a.s; });

    var best = ranked[0] ? ranked[0].value : mark.token;
    var ghost = "";
    if (ranked.length && best.toLowerCase().indexOf(mark.token.toLowerCase()) === 0) {
      ghost = best.slice(mark.token.length) + (mark.space ? " " : "");
    }
    var prefix = commonPrefix(ranked.map(function (r) { return r.value; }));
    return {
      kind: mark.kind,
      marker: mark.char,
      query: mark.token,
      candidates: ranked,
      replaceFrom: mark.replaceFrom,
      insert: prefix.length > mark.token.length ? prefix : best,
      ghost: ghost,
      // Accept inserts a trailing space so the next word starts clean.
      insertSpace: !!mark.space,
      help: mark.help,
    };
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
    var preferSlash = !!(ctx && ctx.slash);

    // ── Smart markers: `@maya`, `#draft-persistence` mid-input ────────────
    // Wins over slash/CLI argument completion so free-form chat can mention
    // people and tag topics without leaving the sentence.
    var mark = activeMarker(text);
    if (mark) return completeMarker(mark);

    // ── Slash commands: `/go bugs`, `/sort hot`, bare `/` ───────────────
    // Agent chat lives on `/` verbs; intellisense opens the catalogue as soon
    // as the line starts with a slash (or the prompt is empty in ai mode).
    var firstTok = tokens[0] || "";
    if (preferSlash || firstTok.charAt(0) === "/" || text === "/") {
      // Completing the slash verb itself.
      if (tokens.length <= 1 && !trailingSpace) {
        var sq = firstTok === "" && preferSlash ? "/" : firstTok;
        // Bare "/" should show the full catalogue, not filter to empty.
        var slashQ = sq === "/" ? "/" : sq;
        var slashRanked = rank(SLASH_COMMANDS.map(function (c) {
          return { value: c.name, hint: c.help, kind: "slash", run: c.run };
        }), slashQ === "/" ? "" : slashQ);
        // When query is empty or just "/", rank() with "" returns all with score 1.
        if (slashQ === "/" || slashQ === "") {
          slashRanked = SLASH_COMMANDS.map(function (c) {
            return { value: c.name, hint: c.help, kind: "slash", run: c.run, s: 1 };
          });
        }
        var sprefix = commonPrefix(slashRanked.map(function (r) { return r.value; }));
        return {
          kind: "slash",
          query: slashQ,
          candidates: slashRanked,
          replaceFrom: 0,
          insert: sprefix.length > slashQ.length ? sprefix
            : (slashRanked[0] ? slashRanked[0].value : slashQ),
          ghost: slashRanked.length && slashRanked[0].value.toLowerCase().indexOf(
            (slashQ === "/" ? "/" : slashQ).toLowerCase()) === 0
            ? slashRanked[0].value.slice(slashQ === "/" ? 1 : slashQ.length) +
              (SLASH_COMMANDS.filter(function (c) { return c.name === slashRanked[0].value; })[0]
                && SLASH_COMMANDS.filter(function (c) { return c.name === slashRanked[0].value; })[0].arg
                ? " " : " ")
            : "",
        };
      }

      var slashName = firstTok.charAt(0) === "/" ? firstTok : "/" + firstTok;
      var sspec = slashSpec(slashName);
      var sfragment = trailingSpace ? "" : tokens[tokens.length - 1];
      var sfragStart = text.length - sfragment.length;
      // After the verb, complete the argument the same way as the CLI twin.
      if (!sspec || sspec.arg === null) {
        return {
          kind: "slash", query: sfragment, candidates: [], ghost: "",
          replaceFrom: sfragStart, insert: sfragment,
        };
      }
      if (sspec.arg === "sort") {
        var ssorts = sortCandidates(sfragment);
        return {
          kind: "slash-arg", query: sfragment, candidates: ssorts, replaceFrom: sfragStart,
          insert: ssorts[0] ? ssorts[0].value : sfragment,
          ghost: ssorts.length && ssorts[0].value.indexOf(sfragment) === 0
            ? ssorts[0].value.slice(sfragment.length) : "",
        };
      }
      if (sspec.arg === "theme") {
        var sthemes = themeCandidates(sfragment);
        return {
          kind: "slash-arg", query: sfragment, candidates: sthemes, replaceFrom: sfragStart,
          insert: sthemes[0] ? sthemes[0].value : sfragment,
          ghost: sthemes.length && sthemes[0].value.toLowerCase().indexOf(sfragment.toLowerCase()) === 0
            ? sthemes[0].value.slice(sfragment.length) : "",
        };
      }
      if (sspec.arg === "handle") {
        var roll = window.NB_MAP && window.NB_MAP.membersForBoard
          ? window.NB_MAP.membersForBoard()
          : ((window.NB_DATA && window.NB_DATA.members) || []);
        var handles = roll.map(function (m) {
          return {
            value: m.handle,
            hint: (m.kind === "agent" ? "agent · " : "") + (m.role || m.state || ""),
            kind: "handle",
          };
        }).concat(
          // Also surface known DM threads even if member list drifts.
          ((window.NB_DATA && window.NB_DATA.dms) || []).map(function (d) {
            return { value: d.peer || d.id, hint: "dm · " + (d.kind || "direct"), kind: "handle" };
          })
        );
        var seenH = {};
        handles = handles.filter(function (h) {
          if (seenH[h.value]) return false;
          seenH[h.value] = true;
          return true;
        });
        var hranked = rank(handles, sfragment);
        return {
          kind: "slash-arg", query: sfragment, candidates: hranked, replaceFrom: sfragStart,
          insert: hranked[0] ? hranked[0].value : sfragment,
          ghost: hranked.length && hranked[0].value.toLowerCase().indexOf(sfragment.toLowerCase()) === 0
            ? hranked[0].value.slice(sfragment.length) : "",
        };
      }
      if (sspec.arg === "filter") {
        var filters = [
          { value: "all", hint: "full activity feed", kind: "filter" },
          { value: "mentions", hint: "only @you mentions", kind: "filter" },
          { value: "subscribed", hint: "watched rooms and people", kind: "filter" },
          { value: "enable", hint: "request browser Notification permission", kind: "filter" },
          { value: "test", hint: "send a sample browser notification", kind: "filter" },
        ];
        var franked = rank(filters, sfragment);
        return {
          kind: "slash-arg", query: sfragment, candidates: franked, replaceFrom: sfragStart,
          insert: franked[0] ? franked[0].value : sfragment,
          ghost: franked.length && franked[0].value.toLowerCase().indexOf(sfragment.toLowerCase()) === 0
            ? franked[0].value.slice(sfragment.length) : "",
        };
      }
      if (sspec.arg === "text" || sspec.arg === "query") {
        // Free-form Lucene query / text — no fixed candidates; ghost empty.
        var qpresets = (window.NB_QUERY && window.NB_QUERY.presets)
          ? window.NB_QUERY.presets().map(function (v) {
            return { value: v.query || v.id, hint: v.label || v.id, kind: "view" };
          })
          : [];
        var qranked = sspec.arg === "query" && window.NB_COMPLETE
          ? (window.NB_COMPLETE.score
            ? qpresets.map(function (c) {
              var s = window.NB_COMPLETE.score(c.value, sfragment);
              return s == null ? null : Object.assign({}, c, { s: s });
            }).filter(Boolean).sort(function (a, b) { return b.s - a.s; })
            : qpresets)
          : [];
        // Prefer simple rank via existing rank if available through complete module.
        if (sspec.arg === "query" && sfragment) {
          // Manual filter
          qranked = qpresets.filter(function (c) {
            return c.value.indexOf(sfragment) !== -1 || (c.hint && c.hint.indexOf(sfragment) !== -1);
          });
        } else if (sspec.arg === "query") {
          qranked = qpresets;
        }
        return {
          kind: "slash-arg", query: sfragment, candidates: qranked, replaceFrom: sfragStart,
          insert: qranked[0] ? qranked[0].value : sfragment,
          ghost: qranked[0] && qranked[0].value.indexOf(sfragment) === 0
            ? qranked[0].value.slice(sfragment.length) : "",
        };
      }
      // Path arg: complete against the board tree (same engine as `cd`).
      var pathFrag = trailingSpace ? "" : sfragment;
      var pathFragStart = text.length - pathFrag.length;
      var slashPath = completePath(cwd, pathFrag, extra, pathFragStart);
      slashPath.kind = "slash-arg";
      return slashPath;
    }

    // Completing the command itself (CLI verbs).
    if (tokens.length <= 1 && !trailingSpace) {
      var q = tokens[0] || "";
      // In agent chat, empty prompt prefers the slash catalogue.
      if (preferSlash && q === "") {
        return analyse("/", ctx);
      }
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

    if (spec.arg === "sort" || spec.arg === "view") {
      var rv = sortCandidates(fragment);
      return {
        kind: "sort", query: fragment, candidates: rv, replaceFrom: fragStart,
        insert: rv[0] ? rv[0].value : fragment,
        ghost: rv.length && rv[0].value.indexOf(fragment) === 0 ? rv[0].value.slice(fragment.length) : "",
      };
    }

    if (spec.arg === "text") {
      return { kind: "text", query: fragment, candidates: [], ghost: "", replaceFrom: fragStart, insert: fragment };
    }

    return completePath(cwd, fragment, extra, fragStart);
  }

  /**
   * Shared path completion for CLI (`cd x`) and slash (`/go x`).
   * `fragStart` is the absolute index in the input line where the path fragment begins.
   */
  function completePath(cwd, fragment, extra, fragStart) {
    var pc = pathCandidates(cwd, fragment, extra);
    var local = rank(pc.items, pc.leaf);
    var scope = "local";

    // Local and global are merged rather than tried in order. Falling back only
    // at zero matches meant one weak local hit could hide an obviously better
    // destination elsewhere in the tree — `cd ch` matching a post name instead
    // of /channels. Proximity is a nudge, not a veto.
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
        replaceFrom: fragStart, insert: rp[0] ? rp[0].value : fragment,
        ghost: rp[0] && rp[0].value.toLowerCase().indexOf(String(fragment).toLowerCase()) === 0
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

  window.NB_COMPLETE = {
    analyse: analyse,
    COMMANDS: COMMANDS,
    SLASH_COMMANDS: SLASH_COMMANDS,
    MARKER_SPECS: MARKER_SPECS,
    score: score,
    isSlash: isSlash,
    isMarkerKind: isMarkerKind,
    slashSpec: slashSpec,
    activeMarker: activeMarker,
  };
})();
