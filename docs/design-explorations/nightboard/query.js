/**
 * Lucene-style feed queries for Nightboard views / projections.
 *
 * Beyond thumbs-up/down ranking: write a query that selects and orders posts.
 *
 * Examples:
 *   state:needs-review
 *   who:maya AND has:anchor
 *   body:cache OR subject:install
 *   kind:agent -state:signed
 *   react:+1 sort:new
 *   channel:bugs state:(open OR needs-review) sort:top
 *   "cold install"
 *   score:>0
 *
 * Default free-text terms search subject + body + who + channel.
 * Field terms: who|author, state, channel, subject, body, text, id, re,
 *              kind (person|agent), has (anchor|subject|sig|reactions),
 *              react (reaction key), score, sort (hot|new|top|best).
 *
 * Boolean: AND (default / juxtaposition), OR, NOT / leading `-`.
 * Grouping: ( … ). Phrases: "double quoted".
 */
(function () {
  "use strict";

  var SORTS = ["hot", "new", "top", "best"];
  /** Reddit feed defaults — only these chip until the user pins more via +. */
  var DEFAULT_SORTS = ["hot", "new", "top"];

  var DEFAULT_SORT_VIEWS = [
    { id: "hot", label: "hot", query: "sort:hot" },
    { id: "new", label: "new", query: "sort:new" },
    { id: "top", label: "top", query: "sort:top" },
  ];

  var EXTRA_PRESET_VIEWS = [
    { id: "best", label: "best", query: "sort:best" },
    { id: "needs-review", label: "needs review", query: "state:needs-review sort:new" },
    { id: "agents", label: "agents", query: "kind:agent OR channel:agent-runs sort:new" },
    { id: "signed", label: "signed", query: "state:signed OR state:promoted sort:top" },
    { id: "reacted", label: "reacted", query: "has:reactions sort:top" },
    { id: "anchored", label: "anchored", query: "has:anchor sort:new" },
  ];

  var PRESET_VIEWS = DEFAULT_SORT_VIEWS.concat(EXTRA_PRESET_VIEWS);

  function tokenize(input) {
    var s = String(input || "");
    var tokens = [];
    var i = 0;
    function push(type, value) { tokens.push({ type: type, value: value }); }
    while (i < s.length) {
      var ch = s.charAt(i);
      if (/\s/.test(ch)) { i += 1; continue; }
      if (ch === "(") { push("LPAREN", "("); i += 1; continue; }
      if (ch === ")") { push("RPAREN", ")"); i += 1; continue; }
      if (ch === ":") { push("COLON", ":"); i += 1; continue; }
      if (ch === "-") {
        // Unary NOT if at start of term; else part of word (rare).
        var next = s.charAt(i + 1);
        if (next && !/\s/.test(next) && next !== ")" ) {
          push("NOT", "-");
          i += 1;
          continue;
        }
      }
      if (ch === '"') {
        i += 1;
        var phrase = "";
        while (i < s.length && s.charAt(i) !== '"') {
          phrase += s.charAt(i);
          i += 1;
        }
        if (s.charAt(i) === '"') i += 1;
        push("PHRASE", phrase);
        continue;
      }
      // Word / operator / field name
      var start = i;
      while (i < s.length && !/[\s():"]/.test(s.charAt(i))) i += 1;
      var raw = s.slice(start, i);
      if (!raw) { i += 1; continue; }
      var upper = raw.toUpperCase();
      if (upper === "AND") push("AND", "AND");
      else if (upper === "OR") push("OR", "OR");
      else if (upper === "NOT") push("NOT", "NOT");
      else push("WORD", raw);
    }
    push("EOF", "");
    return tokens;
  }

  function parse(input) {
    var normalized = window.NB_CORE.normalizeQuery(String(input || ""));
    var error = normalized.error || null;
    if (error) error = error.charAt(0).toLowerCase() + error.slice(1);
    return Object.assign({}, normalized, { error: error });
  }

  function normalize(input) { return parse(input); }

  function canViewPost(post, ctx) {
    ctx = ctx || {};
    var viewer = ctx.viewer || {};
    return window.NB_CORE.canReadCommunityResource({
      kind: post && post.dm ? "dm" : "message",
      resourceId: post && post.dm ? post.dm : String(post && post.id || "unknown"),
      visibility: post && post.dm ? "private" : "public",
      participantIds: post && Array.isArray(post.participantIds) ? post.participantIds : [],
    }, viewer);
  }

  function authorizedPosts(posts, ctx) {
    return (posts || []).filter(function (post) { return canViewPost(post, ctx); });
  }

  /**
   * Apply a query to a list of posts.
   * Returns { posts, sort, error, query }.
   */
  function apply(posts, query, ctx) {
    ctx = ctx || {};
    var visible = authorizedPosts(posts, ctx);
    var parsed = parse(query);
    if (parsed.error) {
      return { posts: visible, sort: null, error: parsed.error, query: query };
    }
    var sort = legacySort(parsed.sort, parsed.canonical);
    var filtered = visible;
    if (parsed.ast) {
      filtered = visible.filter(function (post) {
        return window.NB_CORE.evaluateSearchExpression(feedEntity(post), parsed.ast).matches;
      });
    }
    return { posts: filtered, sort: sort, error: null, query: query, ast: parsed.ast };
  }

  function feedEntity(post) {
    var publishedAt = isoDateTime(post.publishedAt) || "2026-08-12T00:00:00.000Z";
    var objectId = String(post.id || post.objectId || "unknown");
    var authorId = post.authorId || post.who || "unavailable";
    var message = {
      ref: { objectId: objectId, kind: "message" },
      context: { objectId: String(post.channel || "general"), kind: "channel" },
      authorId: authorId,
      title: post.title || post.subject,
      body: post.body || "",
      publishedAt: publishedAt,
      threadRoot: { objectId: post.re || objectId, kind: "message" },
      relations: [],
      state: post.state || "unavailable",
      aliases: [objectId],
    };
    if (post.re) message.inReplyTo = { objectId: post.re, kind: "message" };
    if (post.reactions) message.reactions = Object.assign({}, post.reactions);
    var entity = window.NB_CORE.communityMessageToEntity(message, {
      provenance: { sourceId: "nightboard-feed", nativeId: objectId, observedAt: publishedAt },
      visibility: post.dm ? "private" : "public",
      participantIds: Array.isArray(post.participantIds) ? post.participantIds : [],
    });
    var has = Array.isArray(entity.fields.has) ? entity.fields.has.slice() : [];
    if (post.anchor) has.push("anchor");
    var kind = memberKind(authorId);
    return Object.assign({}, entity, {
      ref: Object.assign({}, entity.ref, { kind: kind }),
      fields: Object.assign({}, entity.fields, { has: has, kind: kind }),
    });
  }

  function isoDateTime(value) {
    if (typeof value !== "string" || !value) return "";
    var timestamp = Date.parse(value);
    return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value ? value : "";
  }

  function memberKind(who) {
    var members = window.NB_DATA && Array.isArray(window.NB_DATA.members) ? window.NB_DATA.members : [];
    var found = members.find(function (member) { return member.handle === who; });
    return found && found.kind === "agent" ? "agent" : "message";
  }

  function legacySort(order, canonical) {
    var named = String(canonical || "").match(/\bsort:(hot|new|top|best)\b/);
    if (named) return named[1];
    if (!Array.isArray(order) || !order.length) return null;
    var primary = order[0];
    if (primary.field === "score") return "top";
    if (primary.field === "createdAt" || primary.field === "updatedAt") return "new";
    return null;
  }

  /**
   * Filter entry list (with .post) while keeping tree coherence: a post stays
   * if it matches or any descendant matches (so parents of hits remain).
   */
  function filterEntries(entries, query, ctx) {
    var posts = (entries || []).filter(function (e) { return e.post; }).map(function (e) { return e.post; });
    var result = apply(posts, query, ctx);
    if (result.error || !result.ast) {
      return {
        entries: entries,
        sort: result.sort,
        error: result.error,
        matchIds: null,
        count: posts.length,
        matched: posts.length,
      };
    }
    var matchSet = {};
    result.posts.forEach(function (p) { matchSet[p.id] = true; });

    // Build children map to expand ancestors of matches.
    var byId = {};
    posts.forEach(function (p) { byId[p.id] = p; });
    var keep = {};
    Object.keys(matchSet).forEach(function (id) {
      var cur = byId[id];
      while (cur) {
        keep[cur.id] = true;
        cur = cur.re && byId[cur.re] ? byId[cur.re] : null;
      }
    });

    var filtered = (entries || []).filter(function (e) {
      return e.post && keep[e.post.id];
    });
    return {
      entries: filtered,
      sort: result.sort,
      error: null,
      matchIds: matchSet,
      count: posts.length,
      matched: result.posts.length,
    };
  }

  function presets() {
    var extra = (window.NB_DATA && window.NB_DATA.feedViews) || [];
    var seen = {};
    var out = [];
    PRESET_VIEWS.concat(extra).forEach(function (v) {
      if (!v || !v.id || seen[v.id]) return;
      seen[v.id] = true;
      out.push({
        id: v.id,
        label: v.label || v.id,
        query: v.query || "",
      });
    });
    return out;
  }

  /** Reddit-default chips only (hot / new / top). */
  function defaultSortViews() {
    return DEFAULT_SORT_VIEWS.map(function (v) {
      return { id: v.id, label: v.label, query: v.query };
    });
  }

  /**
   * Chips to show on the feed toolbar: defaults + user-pinned extras.
   * `pinnedIds` is an array of view ids from the catalog.
   */
  function visibleViews(pinnedIds) {
    var catalog = presets();
    var byId = {};
    catalog.forEach(function (v) { byId[v.id] = v; });
    var out = defaultSortViews();
    var seen = { hot: true, new: true, top: true };
    (pinnedIds || []).forEach(function (id) {
      if (!id || seen[id] || !byId[id]) return;
      seen[id] = true;
      out.push(byId[id]);
    });
    return out;
  }

  /** Catalog entries not yet on the toolbar (for the + picker). */
  function availableViews(pinnedIds) {
    var shown = {};
    visibleViews(pinnedIds).forEach(function (v) { shown[v.id] = true; });
    return presets().filter(function (v) { return !shown[v.id]; });
  }

  function helpText() {
    return [
      "## Feed query (Lucene-style)",
      "",
      "Fields: `who` `state` `channel` `project` `dm` `subject` `body` `kind` `has` `react` `score` `sort`",
      "",
      "| example | meaning |",
      "| --- | --- |",
      "| `state:needs-review` | open review queue |",
      "| `who:maya OR kind:agent` | maya or any agent |",
      "| `body:cache -state:signed` | mentions cache, not signed |",
      "| `has:anchor react:+1` | linked + thumbs |",
      "| `score:>2 sort:top` | high score, top order |",
      "| `\"cold install\"` | phrase search |",
      "",
      "Boolean: `AND` (default), `OR`, `NOT` / `-`. Groups: `(a OR b)`.",
      "Default chips: `hot` `new` `top`. Pin more with `[+]`.",
      "",
      "Board-wide: `search <query>` or `/search` (CLI) · `board_search` (AI tool).",
    ].join("\n");
  }

  var LUCENE_FIELDS = [
    { name: "who", hint: "author handle" },
    { name: "author", hint: "alias of who" },
    { name: "state", hint: "open | needs-review | promoted | signed" },
    { name: "channel", hint: "channel id / label" },
    { name: "project", hint: "project slug" },
    { name: "dm", hint: "dm peer handle" },
    { name: "subject", hint: "subject line" },
    { name: "body", hint: "post body" },
    { name: "text", hint: "subject + body" },
    { name: "kind", hint: "person | agent" },
    { name: "has", hint: "anchor | subject | sig | reactions" },
    { name: "react", hint: "+1 | eyes | rocket | …" },
    { name: "score", hint: ">n | <n | =n" },
    { name: "sort", hint: "hot | new | top | best" },
    { name: "id", hint: "post id" },
  ];

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** Collect highlight needles from a Lucene query (words, phrases, field values). */
  function highlightNeedles(query) {
    var needles = [];
    var seen = {};
    function push(v) {
      v = String(v || "").trim();
      if (!v || v.length < 2) return;
      var k = v.toLowerCase();
      if (seen[k]) return;
      seen[k] = true;
      needles.push(v);
    }
    try {
      var tokens = tokenize(query);
      tokens.forEach(function (t) {
        if (t.type === "PHRASE") push(t.value);
        else if (t.type === "WORD" && !/^(AND|OR|NOT)$/i.test(t.value)) push(t.value);
      });
    } catch {
      String(query || "").split(/\s+/).forEach(push);
    }
    return needles;
  }

  function markText(text, needles) {
    var src = String(text == null ? "" : text);
    if (!needles || !needles.length || !src) return escapeHtml(src);
    var lower = src.toLowerCase();
    var spans = [];
    needles.forEach(function (n) {
      var needle = String(n).toLowerCase();
      if (!needle) return;
      var from = 0;
      while (from < lower.length) {
        var at = lower.indexOf(needle, from);
        if (at === -1) break;
        spans.push({ start: at, end: at + needle.length });
        from = at + Math.max(1, needle.length);
      }
    });
    if (!spans.length) return escapeHtml(src);
    spans.sort(function (a, b) { return a.start - b.start || b.end - a.end; });
    var merged = [];
    spans.forEach(function (s) {
      var last = merged[merged.length - 1];
      if (last && s.start <= last.end) last.end = Math.max(last.end, s.end);
      else merged.push({ start: s.start, end: s.end });
    });
    var out = "";
    var cursor = 0;
    merged.forEach(function (s) {
      if (s.start > cursor) out += escapeHtml(src.slice(cursor, s.start));
      out += '<mark class="cn-search-mark">' + escapeHtml(src.slice(s.start, s.end)) + "</mark>";
      cursor = s.end;
    });
    if (cursor < src.length) out += escapeHtml(src.slice(cursor));
    return out;
  }

  /**
   * Resolve a board path for a post (channels, DMs, project rooms, space feeds).
   */
  function whereForPost(post) {
    var MAP = window.NB_MAP;
    if (!post) return "/";
    if (post._where) return post._where;
    if (post.dm && MAP && MAP.dmPath) return MAP.dmPath(post.dm);
    if (post.project) {
      return "/projects/" + post.project + "/channels/" + (post.channel || "issues");
    }
    if (post.channel && MAP && MAP.channelPath) return MAP.channelPath(post.channel);
    if (post.space || post.spaceId) {
      var sid = post.space || post.spaceId;
      return MAP && MAP.spacePath ? MAP.spacePath(sid) + "/feed" : "/spaces/" + sid + "/feed";
    }
    return "/";
  }

  /**
   * Every searchable post across community channels, project rooms, DMs, and
   * live merged traffic — de-duplicated by id.
   */
  function collectCorpus(extra, ctx) {
    var D = window.NB_DATA || {};
    var MAP = window.NB_MAP;
    var seen = {};
    var out = [];
    function add(p, where) {
      if (!p || !p.id || seen[p.id] || !canViewPost(p, ctx)) return;
      seen[p.id] = true;
      var copy = Object.assign({}, p);
      if (where) copy._where = where;
      out.push(copy);
    }
    (D.posts || []).concat(extra || []).forEach(function (p) {
      if (p.dm) add(p, MAP && MAP.dmPath ? MAP.dmPath(p.dm) : "/dms/" + p.dm);
      else if (p.project) {
        add(p, "/projects/" + p.project + "/channels/" + (p.channel || "issues"));
      } else if (p.channel) {
        add(p, MAP && MAP.channelPath ? MAP.channelPath(p.channel) : "/projects/community/channels/" + p.channel);
      } else if (p.space || p.spaceId) {
        var sid = p.space || p.spaceId;
        add(p, MAP && MAP.spacePath ? MAP.spacePath(sid) + "/feed" : "/spaces/" + sid + "/feed");
      } else add(p, "/");
    });
    (D.dmMessages || []).forEach(function (p) {
      add(p, MAP && MAP.dmPath ? MAP.dmPath(p.dm) : "/dms/" + p.dm);
    });
    (D.projectPosts || []).forEach(function (p) {
      add(p, "/projects/" + p.project + "/channels/" + (p.channel || "issues"));
    });
    return out;
  }

  /** Directory / room hits for free-text terms (channels, projects, spaces, DMs). */
  function pathHits(terms, extra, ctx) {
    if (!terms || !terms.length || !window.NB_MAP || !window.NB_COMPLETE) return [];
    var MAP = window.NB_MAP;
    var viewer = ctx && ctx.viewer || {};
    var readableDmIds = viewer.actorId ? viewer.readableDmIds || [] : [];
    var score = window.NB_COMPLETE.score;
    var hits = [];
    var seen = {};
    function consider(path, name, kind, hint) {
      if (!path || seen[path]) return;
      var best = null;
      terms.forEach(function (t) {
        var s1 = score(name, t);
        var s2 = score(path, t);
        var s = s1 == null ? s2 : s2 == null ? s1 : Math.max(s1, s2);
        if (s != null && (best == null || s > best)) best = s;
      });
      if (best == null) return;
      seen[path] = true;
      hits.push({ type: "path", path: path, name: name, kind: kind, hint: hint || "", score: best });
    }
    ["/projects", "/members", "/spaces", "/dms"].forEach(function (root) {
      if (root === "/dms" && !viewer.actorId) return;
      (MAP.list(root, extra) || []).forEach(function (e) {
        if (root === "/dms" && readableDmIds.indexOf(e.name) === -1) return;
        consider(root + "/" + e.name, e.name, e.kind || "dir", e.hint || "");
        if (e.kind === "dir") {
          (MAP.list(root + "/" + e.name, extra) || []).forEach(function (f) {
            consider(root + "/" + e.name + "/" + f.name, f.name, f.kind || "dir", f.hint || "");
            if (f.kind === "dir" && (f.name === "channels" || f.name === "feed")) {
              (MAP.list(root + "/" + e.name + "/" + f.name, extra) || []).forEach(function (g) {
                consider(
                  root + "/" + e.name + "/" + f.name + "/" + g.name,
                  g.name, g.kind || "dir", g.hint || ""
                );
              });
            }
          });
        }
      });
    });
    return hits.sort(function (a, b) { return b.score - a.score; });
  }

  function freeTermsFromAst(ast) {
    var terms = [];
    function walk(n) {
      if (!n) return;
      if (n.op === "term") terms.push(n.value);
      else if (n.op === "and" || n.op === "or") { walk(n.left); walk(n.right); }
      else if (n.op === "not") walk(n.node);
    }
    walk(ast);
    return terms;
  }

  /**
   * Board-wide Lucene search across feeds, projects, channels, DMs, and paths.
   * Returns hits with where-paths for color-coded transcript rendering.
   */
  function searchBoard(query, ctx) {
    ctx = ctx || {};
    var q = String(query || "").trim();
    if (!q || q === "help" || q === "?") {
      return { hits: [], error: null, query: q, help: true, matched: 0 };
    }
    var corpus = collectCorpus(ctx.extra, ctx);
    var applied = apply(corpus, q, ctx);
    if (applied.error) {
      return { hits: [], error: applied.error, query: q, matched: 0 };
    }
    var needles = highlightNeedles(q);
    var postHits = (applied.posts || []).map(function (p) {
      return {
        type: "post",
        post: p,
        where: whereForPost(p),
        who: p.who,
        subject: p.subject || "",
        body: p.body || "",
        state: p.state || "",
        channel: p.channel || p.dm || p.project || "",
      };
    });
    var terms = freeTermsFromAst(applied.ast);
    var paths = pathHits(terms.length ? terms : needles, ctx.extra, ctx);
    // Prefer post hits; interleave a few path hits that are not already covered.
    var covered = {};
    postHits.forEach(function (h) { covered[h.where] = true; });
    var pathOnly = paths.filter(function (h) { return !covered[h.path]; }).slice(0, 8);
    var hits = postHits.concat(pathOnly);
    return {
      hits: hits,
      error: null,
      query: q,
      matched: postHits.length,
      pathMatched: pathOnly.length,
      needles: needles,
      sort: applied.sort,
    };
  }

  /**
   * Color-coded HTML + plain text for search hits.
   * `limit` caps displayed rows (default 16).
   */
  function formatSearchResults(result, opts) {
    opts = opts || {};
    var limit = opts.limit != null ? opts.limit : 16;
    if (result && result.help) {
      return {
        text: helpText(),
        html: null,
        format: null,
      };
    }
    if (result && result.error) {
      return {
        text: "search error: " + result.error,
        html: null,
        format: null,
      };
    }
    var hits = (result && result.hits) || [];
    var needles = (result && result.needles) || [];
    var q = (result && result.query) || "";
    if (!hits.length) {
      return {
        text: "search: no matches for " + q,
        html: '<div class="cn-search-empty">no matches for <code>' +
          escapeHtml(q) + "</code></div>",
        format: "search",
      };
    }
    var shown = hits.slice(0, limit);
    var plain = [
      hits.length + " hit" + (hits.length === 1 ? "" : "s") + " for " + q +
        (hits.length > limit ? " (showing " + limit + ")" : ""),
    ];
    var qHtml = (window.NB_SYNTAX
      ? window.NB_SYNTAX.highlight(q, "lucene")
      : escapeHtml(q));
    var html = [
      '<div class="cn-search-head"><span class="cn-search-count">' + hits.length +
      "</span> hit" + (hits.length === 1 ? "" : "s") +
      ' for <code class="cn-search-q">' + qHtml + "</code>" +
      (hits.length > limit ? ' <span class="cn-search-more">showing ' + limit + "</span>" : "") +
      "</div>",
    ];
    shown.forEach(function (h, i) {
      if (h.type === "path") {
        plain.push((i + 1) + ". [path] " + h.path + (h.hint ? " — " + h.hint : ""));
        html.push(
        '<button type="button" class="cn-search-hit" data-kind="path" data-goto="' +
        escapeHtml(h.path) + '">' +
        '<span class="cn-search-idx">' + (i + 1) + "</span>" +
        '<span class="cn-search-meta">' +
        '<span class="cn-search-kind">path</span>' +
        '<span class="cn-search-where">' + markText(h.path, needles) + "</span>" +
        (h.hint ? '<span class="cn-search-hint">' + escapeHtml(h.hint) + "</span>" : "") +
        "</span></button>"
      );
        return;
      }
      var snip = h.subject || h.body || "";
      if (snip.length > 96) snip = snip.slice(0, 93) + "…";
      plain.push(
        (i + 1) + ". " + h.where + " · @" + h.who +
        (h.state ? " · " + h.state : "") + " — " + snip.replace(/\s+/g, " ")
      );
      html.push(
        '<button type="button" class="cn-search-hit" data-kind="post" data-goto="' +
        escapeHtml(h.where) + '"' +
        (h.post && h.post.id ? ' data-post="' + escapeHtml(h.post.id) + '"' : "") + ">" +
        '<span class="cn-search-idx">' + (i + 1) + "</span>" +
        '<span class="cn-search-meta">' +
        '<span class="cn-search-where">' + markText(h.where, needles) + "</span>" +
        '<span class="cn-search-who">@' + markText(h.who, needles) + "</span>" +
        (h.state ? '<span class="cn-search-state" data-state="' + escapeHtml(h.state) + '">' +
          escapeHtml(h.state) + "</span>" : "") +
        "</span>" +
        '<span class="cn-search-snip">' + markText(snip.replace(/\s+/g, " "), needles) + "</span>" +
        "</button>"
      );
    });
    return {
      text: plain.join("\n"),
      html: '<div class="cn-search-results">' + html.join("") + "</div>",
      format: "search",
    };
  }

  /**
   * Autocomplete candidates for a Lucene query fragment (field names + values).
   * Used by the deterministic search workbench and its result-local filter.
   */
  function querySuggestions(fragment) {
    var frag = String(fragment || "");
    var candidates = [];
    var m = /(?:^|[\s(])([a-zA-Z]+):([^:\s]*)$/.exec(frag);
    if (m) {
      var field = m[1].toLowerCase();
      var val = m[2] || "";
      var values = [];
      var D = window.NB_DATA || {};
      if (field === "who" || field === "author" || field === "handle") {
        values = (D.members || []).map(function (x) { return x.handle; });
        values.push("you");
      } else if (field === "state") {
        values = ["open", "needs-review", "promoted", "signed"];
      } else if (field === "channel") {
        values = (D.channels || []).map(function (c) { return c.id || c.label; });
      } else if (field === "project") {
        values = (D.projects || []).map(function (p) {
          return (p.slug || "").replace(/\//g, "-");
        }).concat(["community", "civic-tuner", "civic-community-kit"]);
      } else if (field === "dm") {
        values = (D.dms || []).map(function (d) { return d.peer || d.id; });
      } else if (field === "kind") {
        values = ["person", "agent"];
      } else if (field === "has") {
        values = ["anchor", "subject", "sig", "reactions", "re"];
      } else if (field === "react" || field === "reaction") {
        values = ["+1", "-1", "eyes", "rocket", "heart", "laugh", "hooray", "thinking"];
      } else if (field === "sort") {
        values = SORTS.slice();
      }
      values.forEach(function (v) {
        if (!val || String(v).toLowerCase().indexOf(val.toLowerCase()) === 0 ||
            (window.NB_COMPLETE && window.NB_COMPLETE.score &&
              window.NB_COMPLETE.score(String(v), val) != null)) {
          candidates.push({
            value: field + ":" + v,
            hint: field + " value",
            kind: "field",
          });
        }
      });
    } else {
      // Field-name completion: trailing word that might become `field:`
      var word = /(?:^|[\s(])([a-zA-Z]*)$/.exec(frag);
      var prefix = word ? word[1] : "";
      LUCENE_FIELDS.forEach(function (f) {
        if (!prefix || f.name.indexOf(prefix.toLowerCase()) === 0) {
          candidates.push({
            value: f.name + ":",
            hint: f.hint,
            kind: "field",
          });
        }
      });
      // Named presets
      presets().forEach(function (v) {
        var q = v.query || v.id;
        if (!prefix || q.indexOf(prefix) !== -1 ||
            (v.label && v.label.indexOf(prefix) !== -1) ||
            (v.id && v.id.indexOf(prefix) !== -1)) {
          candidates.push({ value: q, hint: v.label || v.id, kind: "view" });
        }
      });
    }
    // Deduplicate by value
    var seen = {};
    return candidates.filter(function (c) {
      if (seen[c.value]) return false;
      seen[c.value] = true;
      return true;
    }).slice(0, 24);
  }

  window.NB_QUERY = {
    parse: parse,
    normalize: normalize,
    apply: apply,
    filterEntries: filterEntries,
    presets: presets,
    defaultSortViews: defaultSortViews,
    visibleViews: visibleViews,
    availableViews: availableViews,
    helpText: helpText,
    searchBoard: searchBoard,
    legacySort: legacySort,
    formatSearchResults: formatSearchResults,
    collectCorpus: collectCorpus,
    whereForPost: whereForPost,
    querySuggestions: querySuggestions,
    highlightNeedles: highlightNeedles,
    LUCENE_FIELDS: LUCENE_FIELDS,
    SORTS: SORTS,
    DEFAULT_SORTS: DEFAULT_SORTS,
    PRESET_VIEWS: PRESET_VIEWS,
    VERSION: window.NB_CORE.QUERY_LANGUAGE_VERSION,
    tokenize: tokenize,
  };
})();
