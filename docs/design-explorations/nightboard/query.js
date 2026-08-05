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

  var PRESET_VIEWS = [
    { id: "hot", label: "hot", query: "sort:hot" },
    { id: "new", label: "new", query: "sort:new" },
    { id: "top", label: "top", query: "sort:top" },
    { id: "best", label: "best", query: "sort:best" },
    { id: "needs-review", label: "needs review", query: "state:needs-review sort:new" },
    { id: "agents", label: "agents", query: "kind:agent OR channel:agent-runs sort:new" },
    { id: "signed", label: "signed", query: "state:signed OR state:promoted sort:top" },
    { id: "reacted", label: "reacted", query: "has:reactions sort:top" },
    { id: "anchored", label: "anchored", query: "has:anchor sort:new" },
  ];

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
    var tokens = tokenize(input);
    var pos = 0;
    function peek() { return tokens[pos]; }
    function take(type) {
      if (peek().type === type) { var t = tokens[pos]; pos += 1; return t; }
      return null;
    }
    function expect(type) {
      var t = take(type);
      if (!t) throw new Error("expected " + type + " near " + (peek().value || "end"));
      return t;
    }

    function parseOr() {
      var left = parseAnd();
      while (peek().type === "OR") {
        take("OR");
        left = { op: "or", left: left, right: parseAnd() };
      }
      return left;
    }

    function parseAnd() {
      var left = parseNot();
      while (true) {
        if (peek().type === "OR" || peek().type === "RPAREN" || peek().type === "EOF") break;
        if (peek().type === "AND") take("AND");
        // Juxtaposition = AND, but stop if next would be invalid.
        if (peek().type === "EOF" || peek().type === "RPAREN") break;
        // If next is OR-level only, break handled above.
        left = { op: "and", left: left, right: parseNot() };
      }
      return left;
    }

    function parseNot() {
      if (peek().type === "NOT") {
        take("NOT");
        return { op: "not", node: parseNot() };
      }
      return parsePrimary();
    }

    function parsePrimary() {
      if (take("LPAREN")) {
        var inner = parseOr();
        expect("RPAREN");
        return inner;
      }
      // field:value  or  field:(group)
      if (peek().type === "WORD") {
        var word = take("WORD").value;
        if (take("COLON")) {
          var field = word.toLowerCase();
          if (take("LPAREN")) {
            var group = parseOr();
            expect("RPAREN");
            return { op: "field_group", field: field, node: group };
          }
          if (peek().type === "PHRASE") {
            return { op: "field", field: field, value: take("PHRASE").value, phrase: true };
          }
          if (peek().type === "WORD") {
            return { op: "field", field: field, value: take("WORD").value, phrase: false };
          }
          // field: with missing value — treat as bare field name presence
          return { op: "field", field: field, value: "*", phrase: false };
        }
        return { op: "term", value: word, phrase: false };
      }
      if (peek().type === "PHRASE") {
        return { op: "term", value: take("PHRASE").value, phrase: true };
      }
      throw new Error("unexpected token: " + (peek().value || peek().type));
    }

    if (peek().type === "EOF") {
      return { ast: null, sort: null, error: null };
    }
    try {
      var ast = parseOr();
      if (peek().type !== "EOF") {
        // leftover
        throw new Error("unexpected trailing input: " + peek().value);
      }
      var extracted = extractSort(ast);
      return { ast: extracted.ast, sort: extracted.sort, error: null };
    } catch (e) {
      return { ast: null, sort: null, error: e.message || String(e) };
    }
  }

  /** Pull sort:… clauses out of the AST (they order, not filter). */
  function extractSort(ast) {
    if (!ast) return { ast: null, sort: null };
    if (ast.op === "field" && ast.field === "sort") {
      var s = String(ast.value || "").toLowerCase();
      return { ast: null, sort: SORTS.indexOf(s) >= 0 ? s : null };
    }
    if (ast.op === "and") {
      var L = extractSort(ast.left);
      var R = extractSort(ast.right);
      var sort = L.sort || R.sort;
      if (!L.ast) return { ast: R.ast, sort: sort };
      if (!R.ast) return { ast: L.ast, sort: sort };
      return { ast: { op: "and", left: L.ast, right: R.ast }, sort: sort };
    }
    if (ast.op === "or") {
      var Lo = extractSort(ast.left);
      var Ro = extractSort(ast.right);
      // sort on either side — prefer left then right
      var sortO = Lo.sort || Ro.sort;
      if (!Lo.ast && !Ro.ast) return { ast: null, sort: sortO };
      if (!Lo.ast) return { ast: Ro.ast, sort: sortO };
      if (!Ro.ast) return { ast: Lo.ast, sort: sortO };
      return { ast: { op: "or", left: Lo.ast, right: Ro.ast }, sort: sortO };
    }
    if (ast.op === "not") {
      var inner = extractSort(ast.node);
      if (!inner.ast) return { ast: null, sort: inner.sort };
      return { ast: { op: "not", node: inner.ast }, sort: inner.sort };
    }
    return { ast: ast, sort: null };
  }

  function lower(s) { return String(s == null ? "" : s).toLowerCase(); }

  function contains(hay, needle, phrase) {
    hay = lower(hay);
    needle = lower(needle);
    if (!needle || needle === "*") return true;
    if (phrase) return hay.indexOf(needle) !== -1;
    // Word-ish: substring match is Lucene-ish enough for this exploration.
    return hay.indexOf(needle) !== -1;
  }

  function memberKind(who, members) {
    members = members || (window.NB_DATA && window.NB_DATA.members) || [];
    for (var i = 0; i < members.length; i++) {
      if (members[i].handle === who) return members[i].kind || "person";
    }
    if (who === "you") return "person";
    return "person";
  }

  function reactionCount(post, key, reactions) {
    var base = (post.reactions && post.reactions[key]) || 0;
    var bag = reactions && reactions[post.id];
    if (bag && bag.counts && bag.counts[key] != null) return bag.counts[key];
    if (bag && bag.mine && bag.mine[key]) return Math.max(base, 1);
    return base;
  }

  function hasAnyReaction(post, reactions) {
    if (post.reactions && Object.keys(post.reactions).length) return true;
    var bag = reactions && reactions[post.id];
    if (!bag) return false;
    if (bag.counts && Object.keys(bag.counts).some(function (k) { return bag.counts[k] > 0; })) return true;
    if (bag.mine && Object.keys(bag.mine).some(function (k) { return bag.mine[k]; })) return true;
    return false;
  }

  function scoreOf(post, votes) {
    var base = 1;
    if (post.state === "promoted" || post.state === "signed") base += 3;
    if (post.state === "needs-review") base += 1;
    if (post.re) base += 0.5;
    var v = (votes && votes[post.id]) || 0;
    return base + v;
  }

  function fieldMatch(post, field, value, phrase, ctx) {
    ctx = ctx || {};
    var v = lower(value);
    switch (field) {
      case "who":
      case "author":
      case "handle":
        return contains(post.who, value, phrase) || lower(post.who) === v;
      case "state":
        return lower(post.state) === v || contains(post.state, value, phrase);
      case "channel":
        return lower(post.channel) === v || contains(post.channel, value, phrase);
      case "dm":
        return lower(post.dm || "") === v;
      case "subject":
        return contains(post.subject || "", value, phrase);
      case "body":
        return contains(post.body || "", value, phrase);
      case "text":
      case "q":
        return contains((post.subject || "") + " " + (post.body || ""), value, phrase);
      case "id":
        return lower(post.id) === v || contains(post.id, value, phrase);
      case "re":
      case "parent":
        return lower(post.re || "") === v;
      case "kind":
        return lower(memberKind(post.who, ctx.members)) === v;
      case "has":
        if (v === "anchor") return !!post.anchor;
        if (v === "subject") return !!post.subject;
        if (v === "sig" || v === "signature") return !!post.sig;
        if (v === "reaction" || v === "reactions") return hasAnyReaction(post, ctx.reactions);
        if (v === "re" || v === "reply" || v === "parent") return !!post.re;
        return false;
      case "react":
      case "reaction":
        return reactionCount(post, value, ctx.reactions) > 0;
      case "score":
        return cmpNumber(scoreOf(post, ctx.votes), value);
      case "sort":
        // Handled by extractSort — never filters.
        return true;
      default:
        // Unknown field: search as text in that named property if present.
        return contains(post[field] || "", value, phrase);
    }
  }

  function cmpNumber(n, expr) {
    var m = /^(>=|<=|>|<|!=|=)?\s*(-?\d+(?:\.\d+)?)$/.exec(String(expr).trim());
    if (!m) return false;
    var op = m[1] || "=";
    var target = Number(m[2]);
    if (op === ">") return n > target;
    if (op === ">=") return n >= target;
    if (op === "<") return n < target;
    if (op === "<=") return n <= target;
    if (op === "!=") return n !== target;
    return n === target;
  }

  /**
   * For field_group like state:(open OR needs-review), evaluate the group
   * with field context pushed so bare terms become field values.
   */
  function evalFieldGroup(post, field, node, ctx) {
    if (!node) return true;
    if (node.op === "or") {
      return evalFieldGroup(post, field, node.left, ctx) || evalFieldGroup(post, field, node.right, ctx);
    }
    if (node.op === "and") {
      return evalFieldGroup(post, field, node.left, ctx) && evalFieldGroup(post, field, node.right, ctx);
    }
    if (node.op === "not") {
      return !evalFieldGroup(post, field, node.node, ctx);
    }
    if (node.op === "term" || node.op === "field") {
      var val = node.value;
      return fieldMatch(post, field, val, !!node.phrase, ctx);
    }
    if (node.op === "field_group") {
      return evalFieldGroup(post, node.field, node.node, ctx);
    }
    return evalNode(post, node, ctx);
  }

  function evalNode(post, node, ctx) {
    if (!node) return true;
    if (node.op === "and") return evalNode(post, node.left, ctx) && evalNode(post, node.right, ctx);
    if (node.op === "or") return evalNode(post, node.left, ctx) || evalNode(post, node.right, ctx);
    if (node.op === "not") return !evalNode(post, node.node, ctx);
    if (node.op === "term") {
      var blob = [post.who, post.channel, post.state, post.subject, post.body, post.anchor, post.id]
        .filter(Boolean).join(" ");
      return contains(blob, node.value, !!node.phrase);
    }
    if (node.op === "field") return fieldMatch(post, node.field, node.value, !!node.phrase, ctx);
    if (node.op === "field_group") return evalFieldGroup(post, node.field, node.node, ctx);
    return true;
  }

  /**
   * Apply a query to a list of posts.
   * Returns { posts, sort, error, query }.
   */
  function apply(posts, query, ctx) {
    ctx = ctx || {};
    var parsed = parse(query);
    if (parsed.error) {
      return { posts: posts.slice(), sort: null, error: parsed.error, query: query };
    }
    var sort = parsed.sort || null;
    var filtered = posts;
    if (parsed.ast) {
      filtered = posts.filter(function (p) { return evalNode(p, parsed.ast, ctx); });
    }
    return { posts: filtered, sort: sort, error: null, query: query, ast: parsed.ast };
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

  function helpText() {
    return [
      "## Feed query (Lucene-style)",
      "",
      "Fields: `who` `state` `channel` `subject` `body` `kind` `has` `react` `score` `sort`",
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
      "Views: pick a chip or write your own projection.",
    ].join("\n");
  }

  window.NB_QUERY = {
    parse: parse,
    apply: apply,
    filterEntries: filterEntries,
    presets: presets,
    helpText: helpText,
    SORTS: SORTS,
    PRESET_VIEWS: PRESET_VIEWS,
    tokenize: tokenize,
  };
})();
