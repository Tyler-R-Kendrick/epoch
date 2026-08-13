/**
 * Terminal-honest syntax highlighting for Community Web.
 *
 * No Prism/Shiki dependency — a small lexer that emits themeable `.nb-tok-*`
 * spans. Used wherever code shows up: markdown fences, JSON tool/transcript
 * blobs, and the vim-style file editor.
 *
 * Languages: javascript, typescript, json, graphql, shell, css, html,
 * markdown, diff, lucene/query, yaml, python (light), text.
 */
(function () {
  "use strict";

  var KW_JS = wordSet(
    "abstract as async await break case catch class const continue debugger " +
    "default delete do else enum export extends false finally for from function " +
    "get if implements import in instanceof interface let new null of package " +
    "private protected public return set static super switch this throw true " +
    "try typeof undefined var void while with yield type readonly satisfies " +
    "infer keyof never unknown any string number boolean bigint symbol object " +
    "namespace declare module"
  );

  var KW_PY = wordSet(
    "False None True and as assert async await break class continue def del " +
    "elif else except finally for from global if import in is lambda nonlocal " +
    "not or pass raise return try while with yield"
  );

  var KW_SHELL = wordSet(
    "if then else elif fi for while do done case esac function in select time " +
    "until export local return exit echo cd ls cat grep find mkdir rm cp mv " +
    "chmod chown sudo apt npm npx node python pip git curl wget"
  );

  var KW_CSS = wordSet(
    "important media screen supports keyframes from to var calc min max clamp " +
    "rgb rgba hsl hsla url"
  );

  var KW_GQL = wordSet(
    "query mutation subscription fragment on schema type interface union enum " +
    "input extend implements directive scalar true false null"
  );

  function wordSet(s) {
    var out = Object.create(null);
    String(s).split(/\s+/).forEach(function (w) {
      if (w) out[w] = true;
    });
    return out;
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeLang(lang) {
    var l = String(lang || "").toLowerCase().trim();
    if (!l || l === "text" || l === "plain" || l === "plaintext") return "text";
    if (l === "js" || l === "jsx" || l === "mjs" || l === "cjs") return "javascript";
    if (l === "ts" || l === "tsx") return "typescript";
    if (l === "bash" || l === "sh" || l === "zsh" || l === "shell") return "shell";
    if (l === "gql" || l === "graphql") return "graphql";
    if (l === "yml") return "yaml";
    if (l === "htm") return "html";
    if (l === "md" || l === "markdown") return "markdown";
    if (l === "query" || l === "lucene") return "lucene";
    if (l === "py") return "python";
    return l;
  }

  function langFromPath(name) {
    name = String(name || "").toLowerCase();
    if (/\.tsx?$|\.jsx?$|\.mjs$|\.cjs$/.test(name)) {
      return /\.tsx?$/.test(name) ? "typescript" : "javascript";
    }
    if (/\.json$/.test(name)) return "json";
    if (/\.graphql$|\.gql$/.test(name)) return "graphql";
    if (/\.css$/.test(name)) return "css";
    if (/\.html?$/.test(name)) return "html";
    if (/\.md$|\.markdown$/.test(name)) return "markdown";
    if (/\.ya?ml$/.test(name)) return "yaml";
    if (/\.sh$|\.bash$|\.zsh$/.test(name)) return "shell";
    if (/\.py$/.test(name)) return "python";
    if (/\.diff$|\.patch$/.test(name)) return "diff";
    return "text";
  }

  function looksLikeJson(s) {
    var t = String(s || "").trim();
    if (!t) return false;
    if (t.charAt(0) !== "{" && t.charAt(0) !== "[") return false;
    try {
      JSON.parse(t);
      return true;
    } catch {
      // Truncated / pretty-printed-with-comments still benefit from json mode.
      return /[{}[\]":,]/.test(t) && t.length > 2;
    }
  }

  function guessLang(code, hint) {
    var n = normalizeLang(hint);
    if (n !== "text") return n;
    var s = String(code || "");
    if (looksLikeJson(s)) return "json";
    if (/^\s*(query|mutation|subscription|fragment)\b/m.test(s)) return "graphql";
    if (/^\s*(diff --git|--- |\+\+\+ |@@ )/m.test(s)) return "diff";
    if (/^\s*#!/.test(s) || /^\s*(npm|npx|cd|export|echo)\s/m.test(s)) return "shell";
    if (/^\s*(import|export|const|let|function|class)\b/m.test(s)) return "javascript";
    if (/^\s*[a-zA-Z][\w.-]*\s*:\s*\S+/m.test(s) && /(?:who|state|body|channel|kind):/.test(s)) {
      return "lucene";
    }
    return "text";
  }

  function push(toks, type, text) {
    if (!text) return;
    var last = toks[toks.length - 1];
    if (last && last.type === type) last.text += text;
    else toks.push({ type: type, text: text });
  }

  /**
   * Generic C-family-ish lexer used for JS/TS/JSON/CSS/GraphQL/Python/Shell.
   * `opts.keywords` — identifier map; `opts.hashComment` — # comments;
   * `opts.slashComment` — // and /* *\/; `opts.template` — `strings`;
   * `opts.json` — only json-ish tokens; `opts.lucene` — field:value mode.
   */
  function lexGeneric(src, opts) {
    opts = opts || {};
    var s = String(src == null ? "" : src);
    var toks = [];
    var i = 0;
    var keywords = opts.keywords || Object.create(null);

    function peek(n) { return s.charAt(i + (n || 0)); }
    function starts(str) { return s.slice(i, i + str.length) === str; }

    while (i < s.length) {
      var ch = s.charAt(i);

      // Whitespace
      if (/\s/.test(ch)) {
        var ws = "";
        while (i < s.length && /\s/.test(s.charAt(i))) { ws += s.charAt(i); i += 1; }
        push(toks, "text", ws);
        continue;
      }

      // Comments
      if (opts.slashComment !== false && starts("//")) {
        var line = "";
        while (i < s.length && s.charAt(i) !== "\n") { line += s.charAt(i); i += 1; }
        push(toks, "com", line);
        continue;
      }
      if (opts.slashComment !== false && starts("/*")) {
        var block = "/*";
        i += 2;
        while (i < s.length && !starts("*/")) { block += s.charAt(i); i += 1; }
        if (starts("*/")) { block += "*/"; i += 2; }
        push(toks, "com", block);
        continue;
      }
      if (opts.hashComment && ch === "#") {
        var hc = "";
        while (i < s.length && s.charAt(i) !== "\n") { hc += s.charAt(i); i += 1; }
        push(toks, "com", hc);
        continue;
      }

      // Strings
      if (ch === '"' || ch === "'" || (opts.template && ch === "`")) {
        var q = ch;
        var str = q;
        i += 1;
        while (i < s.length) {
          var c = s.charAt(i);
          str += c;
          i += 1;
          if (c === "\\" && i < s.length) { str += s.charAt(i); i += 1; continue; }
          if (c === q) break;
        }
        push(toks, "str", str);
        continue;
      }

      // Numbers
      if (/\d/.test(ch) || (ch === "." && /\d/.test(peek(1)))) {
        var num = "";
        while (i < s.length && /[\d._xXa-fA-F]/.test(s.charAt(i))) {
          num += s.charAt(i);
          i += 1;
        }
        if (s.charAt(i) === "n") { num += "n"; i += 1; }
        push(toks, "num", num);
        continue;
      }

      // Lucene field:value
      if (opts.lucene && /[a-zA-Z_]/.test(ch)) {
        var field = "";
        while (i < s.length && /[a-zA-Z0-9_]/.test(s.charAt(i))) {
          field += s.charAt(i);
          i += 1;
        }
        if (s.charAt(i) === ":") {
          push(toks, "kw", field);
          push(toks, "pun", ":");
          i += 1;
          continue;
        }
        if (/^(AND|OR|NOT)$/i.test(field)) push(toks, "kw", field);
        else push(toks, "ident", field);
        continue;
      }

      // Identifiers / keywords
      if (/[A-Za-z_$]/.test(ch)) {
        var id = "";
        while (i < s.length && /[A-Za-z0-9_$\u00C0-\uFFFF-]/.test(s.charAt(i))) {
          id += s.charAt(i);
          i += 1;
        }
        // Skip whitespace to peek call
        var j = i;
        while (j < s.length && /\s/.test(s.charAt(j))) j += 1;
        var isCall = s.charAt(j) === "(";
        if (keywords[id]) push(toks, "kw", id);
        else if (/^[A-Z]/.test(id) && opts.types !== false) push(toks, "type", id);
        else if (isCall) push(toks, "fn", id);
        else if (opts.json && (id === "true" || id === "false" || id === "null")) push(toks, "kw", id);
        else push(toks, "ident", id);
        continue;
      }

      // Operators / punctuation (multi-char first)
      var two = s.slice(i, i + 2);
      var three = s.slice(i, i + 3);
      if (/^(===|!==|>>>)/.test(three)) {
        push(toks, "op", three); i += 3; continue;
      }
      if (/^(==|!=|<=|>=|=>|\|\||&&|\+\+|--|\.\.|::)/.test(two)) {
        push(toks, "op", two); i += 2; continue;
      }
      if (/[+\-*/%<>=!&|^~?:]/.test(ch)) {
        push(toks, "op", ch); i += 1; continue;
      }
      if (/[{}[\]();,.]/.test(ch)) {
        push(toks, "pun", ch); i += 1; continue;
      }

      push(toks, "text", ch);
      i += 1;
    }
    return toks;
  }

  function lexDiff(src) {
    var lines = String(src == null ? "" : src).split("\n");
    var toks = [];
    lines.forEach(function (line, idx) {
      if (idx) push(toks, "text", "\n");
      if (/^(\+\+\+|---)/.test(line) || /^diff /.test(line) || /^index /.test(line)) {
        push(toks, "kw", line);
      } else if (/^@@/.test(line)) {
        push(toks, "fn", line);
      } else if (/^\+/.test(line)) {
        push(toks, "add", line);
      } else if (/^-/.test(line)) {
        push(toks, "del", line);
      } else {
        push(toks, "text", line);
      }
    });
    return toks;
  }

  function lexMarkdown(src) {
    var lines = String(src == null ? "" : src).split("\n");
    var toks = [];
    var inFence = false;
    lines.forEach(function (line, idx) {
      if (idx) push(toks, "text", "\n");
      if (/^```/.test(line)) {
        inFence = !inFence;
        push(toks, "kw", line);
        return;
      }
      if (inFence) {
        push(toks, "str", line);
        return;
      }
      if (/^#{1,6}\s/.test(line)) {
        var hm = /^(#{1,6})(\s+)(.*)$/.exec(line);
        push(toks, "kw", hm[1]);
        push(toks, "text", hm[2]);
        push(toks, "type", hm[3]);
        return;
      }
      // Inline-ish: highlight backticks and bold markers coarsely.
      var rest = line;
      while (rest.length) {
        var m = /(`[^`]+`|\*\*[^*]+\*\*|https?:\/\/\S+|@[a-zA-Z0-9._-]+|#[a-zA-Z0-9._/-]+)/.exec(rest);
        if (!m) { push(toks, "text", rest); break; }
        if (m.index > 0) push(toks, "text", rest.slice(0, m.index));
        var hit = m[0];
        if (hit.charAt(0) === "`") push(toks, "str", hit);
        else if (hit.charAt(0) === "*") push(toks, "kw", hit);
        else if (hit.charAt(0) === "@" || hit.charAt(0) === "#") push(toks, "fn", hit);
        else push(toks, "fn", hit);
        rest = rest.slice(m.index + hit.length);
      }
    });
    return toks;
  }

  function lexHtml(src) {
    var s = String(src == null ? "" : src);
    var toks = [];
    var i = 0;
    while (i < s.length) {
      if (s.charAt(i) === "<") {
        var tag = "<";
        i += 1;
        while (i < s.length && s.charAt(i) !== ">") {
          tag += s.charAt(i);
          i += 1;
        }
        if (s.charAt(i) === ">") { tag += ">"; i += 1; }
        // Split tag name vs attrs lightly
        var tm = /^<\/?([a-zA-Z0-9:-]+)/.exec(tag);
        if (tm) {
          var nameEnd = tag.indexOf(tm[1]) + tm[1].length;
          push(toks, "pun", tag.slice(0, tag.indexOf(tm[1])));
          push(toks, "kw", tm[1]);
          var mid = tag.slice(nameEnd, tag.length - 1);
          if (mid) {
            // Attr tokenization walks `mid` below (prop / quoted str).
            var k = 0;
            while (k < mid.length) {
              if (/\s/.test(mid.charAt(k))) {
                var w = "";
                while (k < mid.length && /\s/.test(mid.charAt(k))) { w += mid.charAt(k); k += 1; }
                push(toks, "text", w);
              } else if (/[a-zA-Z_:]/.test(mid.charAt(k))) {
                var an = "";
                while (k < mid.length && /[\w:.-]/.test(mid.charAt(k))) { an += mid.charAt(k); k += 1; }
                push(toks, "prop", an);
              } else if (mid.charAt(k) === "=") {
                push(toks, "op", "="); k += 1;
              } else if (mid.charAt(k) === '"' || mid.charAt(k) === "'") {
                var aq = mid.charAt(k);
                var av = aq; k += 1;
                while (k < mid.length && mid.charAt(k) !== aq) { av += mid.charAt(k); k += 1; }
                if (k < mid.length) { av += aq; k += 1; }
                push(toks, "str", av);
              } else {
                push(toks, "pun", mid.charAt(k)); k += 1;
              }
            }
          }
          push(toks, "pun", ">");
        } else {
          push(toks, "pun", tag);
        }
        continue;
      }
      var text = "";
      while (i < s.length && s.charAt(i) !== "<") { text += s.charAt(i); i += 1; }
      push(toks, "text", text);
    }
    return toks;
  }

  function tokenize(code, lang) {
    var L = normalizeLang(lang);
    if (L === "diff") return lexDiff(code);
    if (L === "markdown") return lexMarkdown(code);
    if (L === "html") return lexHtml(code);
    if (L === "json") {
      return lexGeneric(code, { keywords: wordSet("true false null"), json: true, slashComment: false, template: false });
    }
    if (L === "javascript" || L === "typescript") {
      return lexGeneric(code, { keywords: KW_JS, slashComment: true, template: true });
    }
    if (L === "python") {
      return lexGeneric(code, { keywords: KW_PY, hashComment: true, slashComment: false, template: false });
    }
    if (L === "shell") {
      return lexGeneric(code, { keywords: KW_SHELL, hashComment: true, slashComment: false, template: false });
    }
    if (L === "css") {
      return lexGeneric(code, { keywords: KW_CSS, slashComment: true, template: false, types: false });
    }
    if (L === "graphql") {
      return lexGeneric(code, { keywords: KW_GQL, hashComment: true, slashComment: true, template: false });
    }
    if (L === "lucene") {
      return lexGeneric(code, { lucene: true, slashComment: false, template: false, hashComment: false });
    }
    if (L === "yaml") {
      return lexGeneric(code, { hashComment: true, slashComment: false, template: false, types: false });
    }
    // text — still colour numbers lightly
    return lexGeneric(code, { slashComment: false, template: false, types: false, keywords: Object.create(null) });
  }

  function highlight(code, lang) {
    var L = guessLang(code, lang);
    var toks = tokenize(code, L);
    return toks.map(function (t) {
      if (t.type === "text") return escapeHtml(t.text);
      return '<span class="nb-tok nb-tok-' + t.type + '">' + escapeHtml(t.text) + "</span>";
    }).join("");
  }

  /** Per-character token types for a single line (editor caret mapping). */
  function lineTypes(line, lang) {
    var toks = tokenize(line, lang);
    var types = [];
    toks.forEach(function (t) {
      for (var i = 0; i < t.text.length; i++) types.push(t.type);
    });
    return types;
  }

  function highlightLineChars(line, lang, paintChar) {
    // paintChar(ch, col, tokenType) → html snippet
    var types = lineTypes(line, lang);
    var html = [];
    var display = line.length ? line : " ";
    for (var c = 0; c < display.length; c++) {
      var ch = display.charAt(c);
      var ty = types[c] || "text";
      html.push(paintChar(ch, c, ty));
    }
    return html.join("");
  }

  window.CW_SYNTAX = {
    highlight: highlight,
    tokenize: tokenize,
    guessLang: guessLang,
    normalizeLang: normalizeLang,
    langFromPath: langFromPath,
    looksLikeJson: looksLikeJson,
    lineTypes: lineTypes,
    highlightLineChars: highlightLineChars,
    escapeHtml: escapeHtml,
  };
})();
