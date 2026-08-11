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
 *                      (not a mirror of CLI: no `/ls`, `/cat`, `/grep`, …)
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
    { name: "cd", arg: "path", help: "change directory", run: "cd" },
    { name: "ls", arg: "path", help: "list a directory", run: "ls" },
    { name: "cat", arg: "path", help: "read one entry in full", run: "cat" },
    { name: "sort", arg: "sort", help: "hot | new | top — pin more via [+]", run: "sort" },
    { name: "view", arg: "sort", help: "alias for sort", run: "sort" },
    { name: "find", arg: "text", help: "search names anywhere", run: "find" },
    { name: "search", arg: "query", help: "Lucene search across the board", run: "search" },
    { name: "grep", arg: "text", help: "search post bodies", run: "grep" },
    { name: "tail", arg: null, help: "load queued posts", run: "tail" },
    { name: "watch", arg: null, help: "resume the live stream", run: "watch" },
    { name: "macro", arg: "macro", help: "define and run safe reusable actions", run: "macro" },
    { name: "skill", arg: "macro", help: "alias for macro; actions become agent tools", run: "macro" },
    { name: "hobo", arg: "hobo", help: "deterministic HoBo new | build | test | debug | up | stub", run: "hobo" },
    { name: "stat", arg: null, help: "epoch status", run: "stat" },
    { name: "help", arg: null, help: "this list", run: "help" },
    { name: "clear", arg: null, help: "clear the transcript", run: "clear" },
  ];

  /**
   * Slash commands for agent/chat mode — Discord/Slack-style verbs that run
   * locally and never go to the model.
   *
   * Deliberately NOT a mirror of the CLI: terminal verbs (`cd`, `ls`, `cat`,
   * `grep`, …) stay in COMMANDS and only appear in cli mode. Agent slash is
   * navigation, search, compose, identity, and board furniture.
   */
  /**
   * Static slash catalogue — unchanging verbs, independent of board focus.
   * Context-bound actions (reply, create channel/project, voice, …) live under
   * `/act` only. Hotkey-only verbs (keys cheatsheet) are not listed here.
   */
  var SLASH_COMMANDS = [
    { name: "/go", arg: "path", help: "navigate to a path", run: "cd" },
    { name: "/sort", arg: "sort", help: "hot | new | top — pin more via [+]", run: "sort" },
    { name: "/view", arg: "query", help: "Lucene feed view / projection", run: "view" },
    { name: "/q", arg: "query", help: "alias of /view", run: "view" },
    { name: "/query", arg: "query", help: "alias of /view", run: "view" },
    { name: "/search", arg: "query", help: "Lucene search across feeds/projects/dms", run: "search" },
    { name: "/mode", arg: "mode", help: "ai | cli — prompt interpretation mode", run: "mode" },
    { name: "/act", arg: "act", help: "context action — reply, channel, project, voice, share", run: "act" },
    { name: "/help", arg: null, help: "list slash commands", run: "slash-help" },
    { name: "/share", arg: null, help: "copy a nightboard: link for the current path", run: "share" },
    { name: "/tab", arg: null, help: "new workspace tab", run: "tab" },
    { name: "/workspace", arg: null, help: "new workspace tab", run: "tab" },
    { name: "/dm", arg: "handle", help: "open a direct message", run: "dm" },
    { name: "/msg", arg: "handle", help: "alias of /dm", run: "dm" },
    { name: "/notifications", arg: "filter", help: "all|mentions|subscribed|hooks|enable|test", run: "notifications" },
    { name: "/activity", arg: "filter", help: "alias of /notifications", run: "notifications" },
    { name: "/hooks", arg: "cmd", help: "list|events|add|rm|on|off|test|reset", run: "hooks" },
    { name: "/attach", arg: "cmd", help: "open|list|clear — files for chat context", run: "attach" },
    { name: "/file", arg: "cmd", help: "alias of /attach", run: "attach" },
    { name: "/whoami", arg: null, help: "show profile and space", run: "whoami" },
    { name: "/space", arg: "space", help: "list spaces, or join one by id", run: "space" },
    { name: "/login", arg: "handle", help: "sign in to a space", run: "login" },
    { name: "/signin", arg: "handle", help: "alias of /login", run: "login" },
    { name: "/claim", arg: "handle", help: "claim anonymous identity in a space", run: "claim" },
    { name: "/logout", arg: null, help: "sign out → Anonymous", run: "logout" },
    { name: "/signout", arg: null, help: "alias of /logout", run: "logout" },
  ];

  /**
   * Agent / legacy slash verbs — resolve via slashSpec and runSlash, but are
   * excluded from intellisense and /help. Prefer `/mode`, `/act`, and WebMCP.
   */
  var AGENT_SLASH_COMMANDS = [
    { name: "/ai", arg: null, help: "switch to ai mode (agent)", run: "ai" },
    { name: "/cli", arg: null, help: "switch to cli mode (agent)", run: "cli" },
    { name: "/theme", arg: "theme", help: "switch built-in theme (agent)", run: "theme" },
    { name: "/reply", arg: "text", help: "arm reply (prefer /act reply)", run: "reply" },
    { name: "/channel", arg: "new name", help: "create channel (prefer /act channel)", run: "channel" },
    { name: "/project", arg: "new name", help: "create project (prefer /act project)", run: "project" },
    { name: "/voice", arg: "cmd", help: "channel voice (prefer /act voice)", run: "voice" },
    { name: "/keys", arg: null, help: "hotkey cheatsheet (prefer Ctrl+Space)", run: "keys" },
  ];

  /**
   * Group commands that share a `run` key (aliases) so help and catalogues
   * render them as one row: `/dm, /msg  <handle>  open a direct message`.
   */
  function groupCommands(list) {
    var order = [];
    var map = {};
    (list || []).forEach(function (c) {
      var key = c.run || c.name;
      if (!map[key]) {
        map[key] = { run: key, items: [], primary: null };
        order.push(key);
      }
      map[key].items.push(c);
      if (!map[key].primary && !/^alias\b/i.test(String(c.help || ""))) {
        map[key].primary = c;
      }
    });
    return order.map(function (k) {
      var g = map[k];
      if (!g.primary) g.primary = g.items[0];
      return g;
    });
  }

  function formatGroupedHelp(list) {
    return groupCommands(list).map(function (g) {
      var names = g.items.map(function (c) { return c.name; }).join(", ");
      var p = g.primary;
      return names + (p.arg ? " <" + p.arg + ">" : "") + "  " + p.help;
    }).join("\n");
  }

  /** Catalogue rows for intellisense — one entry per run, aliases in the label. */
  function groupedCatalogue(list) {
    return groupCommands(list).map(function (g) {
      var names = g.items.map(function (c) { return c.name; });
      return {
        value: g.primary.name,
        label: names.join(", "),
        names: names,
        hint: g.primary.help,
        kind: "slash",
        run: g.run,
        arg: g.primary.arg,
      };
    });
  }

  /**
   * Rank grouped catalogue rows against a query. Matches any alias name;
   * prefers inserting the best-matching alias when the query is non-empty.
   */
  function rankGrouped(groups, query) {
    var q = String(query || "");
    var scored = [];
    groups.forEach(function (g) {
      var best = null;
      var bestName = g.value;
      (g.names || [g.value]).forEach(function (n) {
        var s = score(n, q);
        if (s == null) return;
        if (best == null || s > best) {
          best = s;
          bestName = n;
        }
      });
      if (best == null && !q) best = 1;
      if (best == null) return;
      scored.push({
        value: q ? bestName : g.value,
        label: g.label || g.value,
        hint: g.hint,
        kind: g.kind || "slash",
        run: g.run,
        arg: g.arg,
        s: best,
      });
    });
    scored.sort(function (a, b) { return b.s - a.s || a.value.length - b.value.length; });
    return scored;
  }

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
      .map(function (x) {
        return {
          value: x.value,
          label: x.label,
          hint: x.hint,
          kind: x.kind,
          s: score(x.label || x.value, query),
        };
      })
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
        // Directories and terminal channel nodes are navigable destinations.
        if (child.kind !== "dir" && child.kind !== "channel") return;
        var full = path === "/" ? "/" + child.name : path + "/" + child.name;
        out.push({
          value: full,
          hint: child.hint || "",
          kind: child.kind === "channel" ? "channel" : "dir",
        });
        if (child.kind === "channel" && MAP.feedEntriesAt && MAP.messagePath) {
          (MAP.feedEntriesAt(full, extra) || []).forEach(function (entry) {
            if (!entry.post || !entry.post.id) return;
            var messageFull = MAP.messagePath(full, entry.post.id, extra);
            if (!messageFull) return;
            out.push({
              value: messageFull,
              label: entry.post.id,
              hint: String(entry.post.subject || entry.post.body || "message")
                .replace(/\s+/g, " ").trim().slice(0, 96),
              kind: "message",
            });
          });
        }
        // Deep enough to reach /projects/<id>/channels/<room> so `cd bugs`
        // still resolves after channels moved under projects. Channels are
        // leaves — do not walk into their (empty) nav listing.
        if (child.kind === "dir" && depth < 4) walk(full, depth + 1);
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
        value: e.name + (e.kind === "dir" || e.kind === "channel" || e.kind === "message" ? "/" : ""),
        label: e.label || (e.kind === "message" && e.post ? e.post.id : null),
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
        { value: "nightboard", hint: "Grid", kind: "theme" },
      ];
    }
    return rank(themes, fragment);
  }

  function spaceCandidates(fragment) {
    var spaces = [];
    if (window.NB_SESSION && typeof window.NB_SESSION.listSpaces === "function") {
      spaces = window.NB_SESSION.listSpaces();
    } else if (window.NB_DATA && window.NB_DATA.spaces) {
      spaces = window.NB_DATA.spaces;
    }
    var items = (spaces || []).map(function (s) {
      return {
        value: s.id,
        hint: (s.name || s.slug || "") +
          (s.guestsAllowed === false ? " · members" : " · open"),
        kind: "space",
      };
    });
    return rank(items, fragment);
  }

  function modeCandidates(fragment) {
    var items = [
      { value: "ai", hint: "interpret intent · slash still runs", kind: "mode" },
      { value: "cli", hint: "commands only · wrong input errors", kind: "mode" },
    ];
    return rank(items, fragment);
  }

  /**
   * Context-dependent `/act` capabilities for the current board focus.
   * This is the only slash verb whose argument catalogue changes with path /
   * selection. Returns { value, hint, kind } rows for autocomplete + /act help.
   */
  function actCapabilities(ctx) {
    ctx = ctx || {};
    var path = ctx.cwd || (window.NB_APP && window.NB_APP.state && window.NB_APP.state.path) || "/";
    var state = (window.NB_APP && window.NB_APP.state) || {};
    var MAP = window.NB_MAP;
    var parts = MAP && MAP.split ? MAP.split(path) : String(path).split("/").filter(Boolean);
    var list = (MAP && MAP.list ? MAP.list(path, ctx.extra || state.merged) : null) || [];
    var cursor = state.cursor != null ? state.cursor : 0;
    var sel = list[cursor];
    var caps = [];

    caps.push({
      value: "share",
      hint: "copy nightboard: link · " + path,
      kind: "act",
    });

    var post = sel && sel.post ? sel.post : null;
    if (post) {
      caps.push({
        value: "reply",
        hint: "arm reply to @" + (post.who || "post") + (post.id ? " · " + post.id : ""),
        kind: "act",
      });
    } else if (state.threadFocus) {
      caps.push({
        value: "reply",
        hint: "arm reply in this thread · " + state.threadFocus,
        kind: "act",
      });
    }

    if (parts[0] === "projects" && parts[2] === "channels") {
      caps.push({
        value: "channel",
        hint: "create a channel in " + (parts[1] || "project"),
        kind: "act",
      });
    }

    if (parts[0] === "projects" && parts.length <= 1) {
      caps.push({
        value: "project",
        hint: "create a project under /projects",
        kind: "act",
      });
    }

    var onVoicePath = parts[0] === "projects" && parts[2] === "channels" && parts[3];
    var voiceJoined = !!(state.voice && state.voice.joined);
    if (onVoicePath || voiceJoined) {
      caps.push({
        value: "voice",
        hint: "join|leave|mute|deafen|ptt|vad|status",
        kind: "act",
      });
    }

    return caps;
  }

  function actCandidates(fragment, ctx) {
    return rank(actCapabilities(ctx), fragment);
  }

  function slashSpec(name) {
    var n = String(name || "").toLowerCase();
    if (n.charAt(0) !== "/") n = "/" + n;
    // Legacy aliases — catalogue keeps one primary name each.
    if (n === "/spaces") n = "/space";
    if (n === "/hook") n = "/hooks";
    var i;
    for (i = 0; i < SLASH_COMMANDS.length; i++) {
      if (SLASH_COMMANDS[i].name === n) return SLASH_COMMANDS[i];
    }
    // Agent-only verbs (/ai, /cli) — not listed in autocomplete.
    for (i = 0; i < AGENT_SLASH_COMMANDS.length; i++) {
      if (AGENT_SLASH_COMMANDS[i].name === n) return AGENT_SLASH_COMMANDS[i];
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
    var bareCli = COMMANDS.some(function (c) { return c.name === firstTok; });
    if ((preferSlash && !bareCli) || firstTok.charAt(0) === "/" || text === "/") {
      // Completing the slash verb itself.
      if (tokens.length <= 1 && !trailingSpace) {
        var sq = firstTok === "" && preferSlash ? "/" : firstTok;
        // Bare "/" should show the full catalogue, not filter to empty.
        var slashQ = sq === "/" ? "/" : sq;
        var slashGroups = groupedCatalogue(SLASH_COMMANDS);
        var slashRanked = rankGrouped(slashGroups, slashQ === "/" ? "" : slashQ);
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
              (slashRanked[0].arg ? " " : " ")
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
      if (sspec.arg === "mode" || sspec.run === "mode") {
        var smodes = modeCandidates(sfragment);
        return {
          kind: "slash-arg", query: sfragment, candidates: smodes, replaceFrom: sfragStart,
          insert: smodes[0] ? smodes[0].value : sfragment,
          ghost: smodes.length && smodes[0].value.toLowerCase().indexOf(sfragment.toLowerCase()) === 0
            ? smodes[0].value.slice(sfragment.length) : "",
        };
      }
      // /act — context capabilities (reply, channel, project, voice, share).
      if (sspec.run === "act" || slashName === "/act") {
        var actToks = tokens.slice(1);
        var actVerb = (actToks[0] || "").toLowerCase();
        // Completing the capability name.
        if (actToks.length <= 1 && !trailingSpace) {
          var actRanked = actCandidates(actVerb, { cwd: cwd, extra: extra });
          return {
            kind: "slash-arg", query: sfragment, candidates: actRanked, replaceFrom: sfragStart,
            insert: actRanked[0] ? actRanked[0].value : sfragment,
            ghost: actRanked.length && actRanked[0].value.toLowerCase().indexOf(sfragment.toLowerCase()) === 0
              ? actRanked[0].value.slice(sfragment.length) : "",
          };
        }
        // /act voice <cmd> — reuse voice subcommand completion via synthetic line.
        if (actVerb === "voice") {
          var actVoiceLine = "/voice" +
            (actToks.length > 1 || trailingSpace ? " " : "") +
            actToks.slice(1).join(" ") +
            (trailingSpace && actToks.length >= 1 ? " " : "");
          var nested = analyse(actVoiceLine.replace(/\s+$/, trailingSpace ? " " : ""), ctx);
          if (nested && nested.kind) {
            nested.kind = "slash-arg";
            if (typeof nested.replaceFrom === "number") {
              nested.replaceFrom += text.length - actVoiceLine.length;
            }
            return nested;
          }
        }
        // reply / channel / project take free text — no further catalogue.
        return {
          kind: "slash-arg", query: sfragment, candidates: [], ghost: "",
          replaceFrom: sfragStart, insert: sfragment,
        };
      }
      if (sspec.arg === "space" || sspec.run === "space") {
        var sspaces = spaceCandidates(sfragment);
        return {
          kind: "slash-arg", query: sfragment, candidates: sspaces, replaceFrom: sfragStart,
          insert: sspaces[0] ? sspaces[0].value : sfragment,
          ghost: sspaces.length && sspaces[0].value.toLowerCase().indexOf(sfragment.toLowerCase()) === 0
            ? sspaces[0].value.slice(sfragment.length) : "",
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
      if (sspec.run === "voice" || slashName === "/voice") {
        var vcmds = [
          { value: "join", hint: "join lounge|standup (or current voice channel)", kind: "cmd" },
          { value: "leave", hint: "disconnect from channel voice", kind: "cmd" },
          { value: "mute", hint: "toggle mute", kind: "cmd" },
          { value: "deafen", hint: "toggle deafen (also mutes)", kind: "cmd" },
          { value: "ptt", hint: "push-to-talk input (hold `)", kind: "cmd" },
          { value: "vad", hint: "voice-activity detection", kind: "cmd" },
          { value: "status", hint: "rtt, peers, mute state", kind: "cmd" },
        ];
        // Second token after "join" → voice channel ids.
        if (/^join\b/i.test(tokens.slice(1).join(" ")) && tokens.length >= 3 ||
            (tokens[1] && tokens[1].toLowerCase() === "join" && (trailingSpace || tokens.length > 2))) {
          var vchans = ((window.NB_DATA && window.NB_DATA.channels) || [])
            .filter(function (c) { return c.voice || c.kind === "voice"; })
            .map(function (c) {
              return { value: c.label || c.id, hint: "voice · Opus", kind: "channel" };
            });
          var joinFrag = (tokens[1] && tokens[1].toLowerCase() === "join")
            ? (trailingSpace && tokens.length === 2 ? "" : (tokens[2] || ""))
            : sfragment;
          var vranked = rank(vchans, joinFrag);
          var vstart = text.length - joinFrag.length;
          return {
            kind: "slash-arg", query: joinFrag, candidates: vranked, replaceFrom: vstart,
            insert: vranked[0] ? vranked[0].value : joinFrag,
            ghost: vranked.length && vranked[0].value.toLowerCase().indexOf(joinFrag.toLowerCase()) === 0
              ? vranked[0].value.slice(joinFrag.length) : "",
          };
        }
        var vcRanked = rank(vcmds, sfragment);
        return {
          kind: "slash-arg", query: sfragment, candidates: vcRanked, replaceFrom: sfragStart,
          insert: vcRanked[0] ? vcRanked[0].value : sfragment,
          ghost: vcRanked.length && vcRanked[0].value.toLowerCase().indexOf(sfragment.toLowerCase()) === 0
            ? vcRanked[0].value.slice(sfragment.length) : "",
        };
      }
      if (sspec.arg === "text" || sspec.arg === "query") {
        var qranked = [];
        if (sspec.arg === "query" && window.NB_QUERY && window.NB_QUERY.querySuggestions) {
          qranked = window.NB_QUERY.querySuggestions(sfragment);
        } else if (sspec.arg === "query") {
          var qpresets = (window.NB_QUERY && window.NB_QUERY.presets)
            ? window.NB_QUERY.presets().map(function (v) {
              return { value: v.query || v.id, hint: v.label || v.id, kind: "view" };
            })
            : [];
          qranked = sfragment
            ? qpresets.filter(function (c) {
              return c.value.indexOf(sfragment) !== -1 ||
                (c.hint && c.hint.indexOf(sfragment) !== -1);
            })
            : qpresets;
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
      var ranked = rankGrouped(groupedCatalogue(COMMANDS).map(function (g) {
        return Object.assign({}, g, { kind: "cmd" });
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

    if (spec.arg === "macro") {
      var sub = (tokens[1] || "").toLowerCase();
      if (tokens.length <= 2 && !trailingSpace) {
        var verbs = [
          { value: "set", hint: "define: set <name> = <commands>", kind: "cmd" },
          { value: "run", hint: "run a saved action", kind: "cmd" },
          { value: "voice", hint: "bind an exact spoken phrase", kind: "cmd" },
          { value: "list", hint: "show saved actions", kind: "cmd" },
          { value: "delete", hint: "remove a saved action", kind: "cmd" },
        ];
        var mr = rank(verbs, fragment);
        return {
          kind: "macro", query: fragment, candidates: mr, replaceFrom: fragStart,
          insert: mr[0] ? mr[0].value : fragment,
          ghost: mr[0] && mr[0].value.indexOf(fragment) === 0 ? mr[0].value.slice(fragment.length) : "",
        };
      }
      if ((sub === "run" || sub === "delete" || sub === "remove" || sub === "rm" || sub === "voice") &&
          tokens.length <= 3 && window.NB_POWER) {
        var names = window.NB_POWER.list().map(function (item) {
          return { value: item.name, hint: item.commands.join("; "), kind: "macro" };
        });
        var nr = rank(names, fragment);
        return {
          kind: "macro", query: fragment, candidates: nr, replaceFrom: fragStart,
          insert: nr[0] ? nr[0].value : fragment,
          ghost: nr[0] && nr[0].value.indexOf(fragment) === 0 ? nr[0].value.slice(fragment.length) : "",
        };
      }
      return { kind: "text", query: fragment, candidates: [], ghost: "", replaceFrom: fragStart, insert: fragment };
    }

    if (spec.arg === "hobo" && tokens.length <= 2 && window.NB_HOBO) {
      var hc = window.NB_HOBO.suggestions(fragment);
      return {
        kind: "hobo", query: fragment, candidates: hc, replaceFrom: fragStart,
        insert: hc[0] ? hc[0].value : fragment,
        ghost: hc[0] && hc[0].value.indexOf(fragment) === 0
          ? hc[0].value.slice(fragment.length) : "",
      };
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

    if (spec.arg === "query") {
      var qc = (window.NB_QUERY && window.NB_QUERY.querySuggestions)
        ? window.NB_QUERY.querySuggestions(fragment)
        : [];
      return {
        kind: "query", query: fragment, candidates: qc, replaceFrom: fragStart,
        insert: qc[0] ? qc[0].value : fragment,
        ghost: qc[0] && qc[0].value.indexOf(fragment) === 0
          ? qc[0].value.slice(fragment.length) : "",
      };
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
        var base = g.label || g.value.slice(g.value.lastIndexOf("/") + 1);
        var s1 = score(base, pc.leaf);
        var s2 = score(g.value, pc.leaf);
        var best = s1 === null ? s2 : s2 === null ? s1 : Math.max(s1, s2);
        return best === null ? null : {
          value: g.value, label: g.label, hint: g.hint, kind: g.kind, s: best, absolute: true,
        };
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
      var gFull = rp[0] ? rp[0].value : "";
      var gGhost = "";
      var gPreview = "";
      if (gFull && gFull.toLowerCase().indexOf(String(fragment).toLowerCase()) === 0) {
        gGhost = gFull.slice(fragment.length);
      } else if (gFull) {
        // Absolute path whose basename matches — fish cannot suffix-extend
        // `pro` into `/projects`, so surface a replace preview instead.
        var gBase = gFull.slice(gFull.lastIndexOf("/") + 1);
        if (gBase.toLowerCase().indexOf(String(fragment).toLowerCase()) === 0) {
          gPreview = gFull;
        }
      }
      return {
        kind: "path", scope: scope, query: fragment, candidates: rp,
        replaceFrom: fragStart, insert: rp[0] ? rp[0].value : fragment,
        ghost: gGhost,
        preview: gPreview,
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
      preview: "",
    };
  }

  /**
   * Syntax-coloured CLI/slash line + fish-style ghost / replace preview.
   * Returns HTML for the mirror under a transparent caret input.
   */
  function formatCliPreview(text, completion) {
    text = String(text == null ? "" : text);
    completion = completion || {};
    var ghost = String(completion.ghost || "");
    var preview = String(completion.preview || "");
    var esc = (window.NB_SYNTAX && window.NB_SYNTAX.escapeHtml)
      ? window.NB_SYNTAX.escapeHtml
      : function (s) {
        return String(s == null ? "" : s)
          .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      };

    var cmdNames = {};
    COMMANDS.forEach(function (c) { cmdNames[c.name] = true; });
    SLASH_COMMANDS.forEach(function (c) { cmdNames[c.name] = true; });

    var html = "";
    var i = 0;
    var leading = text.match(/^\s*/);
    if (leading && leading[0]) {
      html += esc(leading[0]);
      i = leading[0].length;
    }
    // First token = verb (command or /slash).
    var rest = text.slice(i);
    var m = /^(\S+)([\s\S]*)$/.exec(rest);
    if (!m) {
      if (ghost) html += '<span class="cn-ghost-rest" data-ghost-rest>' + esc(ghost) + "</span>";
      else if (preview) {
        html += '<span class="cn-ghost-rest" data-ghost-rest>' + esc(" → " + preview) + "</span>";
      }
      return html || "&nbsp;";
    }
    var verb = m[1];
    var after = m[2] || "";
    var verbKnown = !!cmdNames[verb] || !!cmdNames[verb.toLowerCase()] ||
      (verb.charAt(0) === "/" && !!slashSpec(verb)) ||
      (!!COMMANDS.filter(function (c) {
        return c.name.indexOf(verb.toLowerCase()) === 0;
      }).length && verb.charAt(0) !== "/");
    var verbClass = verb.charAt(0) === "/"
      ? (slashSpec(verb) ? "kw" : (verb.length > 1 ? "text" : "kw"))
      : (cmdNames[verb] || verbKnown ? "kw" : "kw");
    // Partial verbs still colour as keywords while completing.
    if (verb.charAt(0) !== "/" && !cmdNames[verb]) {
      verbClass = COMMANDS.some(function (c) {
        return c.name.indexOf(verb.toLowerCase()) === 0;
      }) ? "kw" : "text";
    }
    if (verb.charAt(0) === "/" && !slashSpec(verb)) {
      verbClass = SLASH_COMMANDS.some(function (c) {
        return c.name.indexOf(verb.toLowerCase()) === 0;
      }) ? "kw" : "text";
    }
    html += '<span class="nb-tok nb-tok-' + verbClass + '">' + esc(verb) + "</span>";

    // Colour arguments: paths, sorts, bare words.
    var sorts = { hot: 1, new: 1, top: 1, best: 1 };
    var argRe = /(\s+)(\S+)/g;
    var am;
    var last = 0;
    while ((am = argRe.exec(after))) {
      html += esc(am[1]);
      var arg = am[2];
      var cls;
      if (arg.charAt(0) === "-" ) cls = "flag";
      else if (arg.charAt(0) === "/" || arg.indexOf("/") !== -1 || arg === ".." || arg === "../") {
        cls = "path";
      } else if (sorts[arg]) cls = "enum";
      else if (/^(who|state|body|kind|tag|in|path|sig):/i.test(arg)) cls = "field";
      else if (completion.kind === "path" || completion.kind === "slash-arg") cls = "path";
      else cls = "str";
      html += '<span class="nb-tok nb-tok-' + cls + '">' + esc(arg) + "</span>";
      last = am.index + am[0].length;
    }
    if (last < after.length) html += esc(after.slice(last));

    if (ghost) {
      html += '<span class="cn-ghost-rest" data-ghost-rest>' + esc(ghost) + "</span>";
    } else if (preview) {
      html += '<span class="cn-ghost-rest" data-ghost-rest>' + esc(" → " + preview) + "</span>";
    }
    return html || "&nbsp;";
  }

  window.NB_COMPLETE = {
    analyse: analyse,
    COMMANDS: COMMANDS,
    SLASH_COMMANDS: SLASH_COMMANDS,
    AGENT_SLASH_COMMANDS: AGENT_SLASH_COMMANDS,
    MARKER_SPECS: MARKER_SPECS,
    score: score,
    isSlash: isSlash,
    isMarkerKind: isMarkerKind,
    slashSpec: slashSpec,
    activeMarker: activeMarker,
    formatCliPreview: formatCliPreview,
    groupCommands: groupCommands,
    formatGroupedHelp: formatGroupedHelp,
    groupedCatalogue: groupedCatalogue,
    modeCandidates: modeCandidates,
    actCapabilities: actCapabilities,
    actCandidates: actCandidates,
  };
})();
