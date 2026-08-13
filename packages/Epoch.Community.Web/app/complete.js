/**
 * Completion, of the kind a power user expects.
 *
 * What "advanced CLI" actually means here, concretely:
 *
 *   fish-style ghost   the most likely completion appears ahead of the cursor
 *                      in dim text; → or End accepts it
 *   fuzzy subsequence  `cd cgen` reaches /channels/general, ranked by how
 *                      tightly the letters cluster and whether they start words
 *   manual selection   arrows choose a candidate; Enter accepts it; Tab keeps
 *                      native focus traversal for accessible combobox parity
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

  var MAP = window.CW_MAP;

  var COMMANDS = window.CW_ACTIONS.commandRows();

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
  var ALL_SLASH_COMMANDS = window.CW_ACTIONS.slashRows();
  var SLASH_COMMANDS = ALL_SLASH_COMMANDS.filter(function (item) { return !item.hidden; });

  /**
   * Agent / legacy slash verbs — resolve via slashSpec and runSlash, but are
   * excluded from intellisense and /help. Prefer `/mode`, `/act`, and WebMCP.
   */
  var AGENT_SLASH_COMMANDS = ALL_SLASH_COMMANDS.filter(function (item) { return item.hidden; });

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

  /** Every navigable destination. Used by z/zi, never by deterministic cd. */
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
          objectId: child.objectId || null,
          projectionId: child.projectionId || null,
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
              objectId: entry.objectId || entry.post.id,
              projectionId: entry.projectionId || null,
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
    if (lastSlash === -1 && MAP.feedEntriesAt) {
      var seen = {};
      items.forEach(function (item) { seen[item.label || item.value.replace(/\/$/, "")] = true; });
      MAP.feedEntriesAt(dir, extra).forEach(function (entry) {
        if (!entry.post || seen[entry.post.id]) return;
        seen[entry.post.id] = true;
        items.push({
          value: entry.post.id,
          label: entry.post.id,
          hint: entry.post.subject || String(entry.post.body || "").slice(0, 96) || entry.hint,
          kind: "message",
        });
      });
    }
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

  function jumpCandidates(fragment, ctx) {
    ctx = ctx || {};
    var cwd = ctx.cwd || "/";
    var current = (MAP.list(cwd, ctx.extra) || []).filter(function (entry) {
      return entry.kind === "dir" || entry.kind === "channel" || entry.kind === "message";
    }).map(function (entry) {
      var path = MAP.resolve(cwd, entry.name);
      return { id: entry.objectId || path, value: path, path: path, label: entry.label || entry.name,
        hint: entry.hint || entry.meta || "current namespace", kind: entry.kind, group: "CURRENT",
        objectId: entry.objectId || (entry.post && entry.post.id) || null };
    });
    var saved = window.CW_SAVED_VIEWS && window.CW_SAVED_VIEWS.list
      ? window.CW_SAVED_VIEWS.list().map(function (view) {
        var path = "/views/" + (view.id || view.projectionId);
        return { id: view.id || view.projectionId, value: path, path: path, label: view.label,
          hint: view.query || "saved query", kind: "saved-view", group: "SAVED VIEWS",
          projectionId: view.projectionId || view.id };
      }) : [];
    var global = globalDirs(ctx.extra).map(function (entry) {
      return { id: entry.objectId || entry.value, value: entry.value, path: entry.value,
        label: entry.label || entry.value.slice(entry.value.lastIndexOf("/") + 1), hint: entry.hint,
        kind: entry.kind, group: "GLOBAL", objectId: entry.objectId || null };
    });
    var visits = (window.CW_APP && window.CW_APP.state && window.CW_APP.state.navigationVisits) || [];
    var recentIds = {};
    visits.forEach(function (visit) { recentIds[visit.id] = true; });
    var recent = global.filter(function (entry) { return recentIds[entry.id]; }).map(function (entry) {
      return Object.assign({}, entry, { group: "RECENT" });
    });
    var seen = {};
    return window.CW_NAV.rankJumpCandidates(fragment, current.concat(recent, saved, global), visits)
      .filter(function (entry) {
        var key = entry.path || ((entry.projectionId || "") + ":" +
          (entry.objectId || entry.id));
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      });
  }

  function themeCandidates(fragment) {
    var themes = (window.CW_THEMES || []).map(function (t) {
      return { value: t.id || t.name, hint: t.name || t.note || "", kind: "theme" };
    });
    if (!themes.length) {
      themes = [
        { value: "grid", hint: "Grid", kind: "theme" },
      ];
    }
    return rank(themes, fragment);
  }

  function spaceCandidates(fragment) {
    var spaces = [];
    if (window.CW_SESSION && typeof window.CW_SESSION.listSpaces === "function") {
      spaces = window.CW_SESSION.listSpaces();
    } else if (window.CW_DATA && window.CW_DATA.spaces) {
      spaces = window.CW_DATA.spaces;
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
    var path = ctx.cwd || (window.CW_APP && window.CW_APP.state && window.CW_APP.state.path) || "/";
    var state = (window.CW_APP && window.CW_APP.state) || {};
    var MAP = window.CW_MAP;
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
    var roll = window.CW_MAP && window.CW_MAP.membersForBoard
      ? window.CW_MAP.membersForBoard()
      : ((window.CW_DATA && window.CW_DATA.members) || []);
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
    var topics = ((window.CW_DATA && window.CW_DATA.topics) || []).map(function (t) {
      var tag = t.tag || t.id || String(t);
      return {
        value: "#" + tag,
        hint: t.label || t.hint || "topic",
        kind: "topic",
        rank: typeof t.heat === "number" ? t.heat : 0,
      };
    });
    // Channels ride `#` as well — short names people already know from chat.
    var channels = ((window.CW_DATA && window.CW_DATA.channels) || []).map(function (c) {
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
        var roll = window.CW_MAP && window.CW_MAP.membersForBoard
          ? window.CW_MAP.membersForBoard()
          : ((window.CW_DATA && window.CW_DATA.members) || []);
        var handles = roll.map(function (m) {
          return {
            value: m.handle,
            hint: (m.kind === "agent" ? "agent · " : "") + (m.role || m.state || ""),
            kind: "handle",
          };
        }).concat(
          // Also surface known DM threads even if member list drifts.
          ((window.CW_DATA && window.CW_DATA.dms) || []).map(function (d) {
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
          var vchans = ((window.CW_DATA && window.CW_DATA.channels) || [])
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
        if (sspec.arg === "query" && window.CW_QUERY && window.CW_QUERY.querySuggestions) {
          qranked = window.CW_QUERY.querySuggestions(sfragment);
        } else if (sspec.arg === "query") {
          var qpresets = (window.CW_QUERY && window.CW_QUERY.presets)
            ? window.CW_QUERY.presets().map(function (v) {
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
      if (sspec.arg === "terms") {
        var sj = jumpCandidates(sfragment, ctx);
        return {
          kind: "jump", query: sfragment, candidates: sj, replaceFrom: sfragStart,
          insert: sj[0] ? sj[0].value : sfragment, ghost: "", preview: "",
        };
      }
      // `/go` remains a deterministic navigation action, but its explicit
      // chooser may offer paths from the whole mounted namespace. Accepting a
      // candidate inserts its exact absolute path; execution never performs a
      // hidden fuzzy fallback (unlike z/zi, which are jump actions).
      if (sspec.run === "cd" || slashName === "/go") {
        var goCandidates = jumpCandidates(sfragment, ctx);
        return {
          kind: "slash-arg", scope: "global-explicit", query: sfragment,
          candidates: goCandidates, replaceFrom: sfragStart,
          insert: goCandidates[0] ? goCandidates[0].value : sfragment,
          ghost: "", preview: "",
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
          tokens.length <= 3 && window.CW_POWER) {
        var names = window.CW_POWER.list().map(function (item) {
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

    if (spec.arg === "hobo" && tokens.length <= 2 && window.CW_HOBO) {
      var hc = window.CW_HOBO.suggestions(fragment);
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
      var qc = (window.CW_QUERY && window.CW_QUERY.querySuggestions)
        ? window.CW_QUERY.querySuggestions(fragment)
        : [];
      return {
        kind: "query", query: fragment, candidates: qc, replaceFrom: fragStart,
        insert: qc[0] ? qc[0].value : fragment,
        ghost: qc[0] && qc[0].value.indexOf(fragment) === 0
          ? qc[0].value.slice(fragment.length) : "",
      };
    }

    if (spec.arg === "terms") {
      var jc = jumpCandidates(fragment, ctx);
      return {
        kind: "jump", query: fragment, candidates: jc, replaceFrom: fragStart,
        insert: jc[0] ? jc[0].value : fragment, ghost: "", preview: "",
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
    var rp = local;
    var prefix2 = commonPrefix(rp.map(function (r) { return r.value; }));
    var best = rp[0] ? rp[0].value : "";
    return {
      kind: "path",
      scope: "local",
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
    var esc = (window.CW_SYNTAX && window.CW_SYNTAX.escapeHtml)
      ? window.CW_SYNTAX.escapeHtml
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
    html += '<span class="cw-tok cw-tok-' + verbClass + '">' + esc(verb) + "</span>";

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
      html += '<span class="cw-tok cw-tok-' + cls + '">' + esc(arg) + "</span>";
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

  window.CW_COMPLETE = {
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
    jumpCandidates: jumpCandidates,
    globalDestinations: globalDirs,
  };
})();
