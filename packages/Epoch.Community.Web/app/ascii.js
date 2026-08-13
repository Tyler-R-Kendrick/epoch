/**
 * ASCII as information, not decoration.
 *
 * A terminal board earns its retro-futurism by *drawing with characters* rather
 * than by wearing a CRT filter. Every function here encodes something real —
 * activity, progress, depth, signature — in glyphs, so the ornament is the data.
 * If a reading is removed, the glyphs go with it.
 *
 * All of it is plain text in the DOM: it themes with the tokens, copies as
 * text, reads aloud to a screen reader when labelled, and costs nothing.
 */
(function () {
  "use strict";

  /** Block ramp, empty to full. The standard sparkline vocabulary. */
  var BLOCKS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
  /** Shade ramp, for density rather than height. */
  var SHADES = [" ", "░", "▒", "▓", "█"];

  /**
   * A sparkline over a series. Used for channel activity, so a column tells you
   * where the conversation actually is before you read a single name.
   */
  function sparkline(values, width) {
    var n = width || values.length;
    if (!values.length) return "";
    // Resample to the requested width so every channel's line is comparable.
    var out = [];
    for (var i = 0; i < n; i++) {
      var lo = Math.floor((i / n) * values.length);
      var hi = Math.max(lo + 1, Math.floor(((i + 1) / n) * values.length));
      var slice = values.slice(lo, hi);
      var v = slice.reduce(function (a, b) { return a + b; }, 0) / (slice.length || 1);
      out.push(v);
    }
    var max = Math.max.apply(null, out.concat([1]));
    return out.map(function (v) {
      return BLOCKS[Math.min(BLOCKS.length - 1, Math.round((v / max) * (BLOCKS.length - 1)))];
    }).join("");
  }

  /** A progress gauge: [████▌·····] with the fraction it actually represents. */
  function gauge(done, total, width) {
    var w = width || 12;
    var filled = total > 0 ? Math.round((done / total) * w) : 0;
    return "[" + "█".repeat(Math.max(0, filled)) + "·".repeat(Math.max(0, w - filled)) + "]";
  }

  /**
   * A signature rendered as a glyph run.
   *
   * A hash is unreadable and a checkmark says nothing. Folding the signature
   * into a short braille run gives it a *shape* — two receipts that differ look
   * different at a glance, which is the property a receipt should have.
   *
   * Braille rather than shade blocks: 256 patterns per cell means four cells
   * carry the whole fold, and a dotted cell reads as a code the way a shaded
   * one reads as a rendering fault. It is a terminal idiom, not an ornament.
   */
  function sigil(text, width) {
    var w = width || 4;
    var h = 0;
    for (var i = 0; i < String(text).length; i++) {
      h = ((h << 5) - h + String(text).charCodeAt(i)) | 0;
    }
    var out = "";
    for (var j = 0; j < w; j++) {
      h = (h * 1103515245 + 12345) | 0;
      // 0x2800 is the braille block; the low byte selects which of the eight
      // dots are raised. Mask to 0xFF so every cell is a legal pattern.
      out += String.fromCharCode(0x2800 + (Math.abs(h >> 13) & 0xff));
    }
    return out;
  }

  /** A box-drawn rule with an inline caption: ── caption ─────── */
  function rule(caption, width) {
    var w = width || 48;
    var label = caption ? " " + caption + " " : "";
    var left = 2;
    var right = Math.max(0, w - left - label.length);
    return "─".repeat(left) + label + "─".repeat(right);
  }

  /** A depth marker for nested structure: ├─ / └─ / │ */
  function branch(isLast, depth) {
    return "│  ".repeat(Math.max(0, depth - 1)) + (isLast ? "└─ " : "├─ ");
  }

  /**
   * Epoch brand — real FIGlet-style ANSI Shadow wordmark.
   * Continuous letterforms with CSS power-on + sheen — not a bordered plaque,
   * and not a thrashing shade-ramp.
   */
  var EPOCH_MARK = [
    "███████╗██████╗  ██████╗  ██████╗██╗  ██╗",
    "██╔════╝██╔══██╗██╔═══██╗██╔════╝██║  ██║",
    "█████╗  ██████╔╝██║   ██║██║     ███████║",
    "██╔══╝  ██╔═══╝ ██║   ██║██║     ██╔══██║",
    "███████╗██║     ╚██████╔╝╚██████╗██║  ██║",
    "╚══════╝╚═╝      ╚═════╝  ╚═════╝╚═╝  ╚═╝",
  ];

  var EPOCH_TAG = "";

  function brandPlain() {
    return EPOCH_MARK.join("\n");
  }

  /**
   * Brand HTML: continuous FIGlet lines (never per-glyph spans — those break
   * solid █ letterforms). Animation is CSS on the wordmark (clip + sheen).
   * No border plaque, no secondary tag — the title is Epoch alone.
   */
  function brandHtml(opts) {
    opts = opts || {};
    var phase = opts.phase || "idle";
    var mark = EPOCH_MARK.map(function (line) {
      return escapeHtml(line);
    }).join("\n");
    var tag = opts.tag
      ? '\n<span class="cw-brand-tag" aria-hidden="true">' + escapeHtml(String(opts.tag)) + "</span>"
      : "";
    return '<span class="cw-brand-mark" data-phase="' + escapeHtml(phase) + '">' +
      '<span class="cw-brand-fig">' + mark + "</span>" +
      tag +
      "</span>";
  }

  /** @deprecated alias — single static frame; motion is CSS. */
  function brandFrames() {
    return [brandPlain()];
  }

  function brandBlock() {
    return brandPlain();
  }

  /**
   * Cold-start banner. It is theatre, but it is honest theatre: every line is a
   * fact the board can actually state, and it is drawn once rather than looped.
   */
  function banner(board, toolCount, host, width) {
    // The box fits the screen it boots on; a fixed sixty columns forces a
    // horizontal scrollbar onto every phone, which is theatre at the cost of
    // the actual transcript.
    var w = Math.max(30, Math.min(58, width || 58));
    var inner = w - 2;
    return [
      "┌" + "─".repeat(w) + "┐",
      "│ " + pad("EPOCH TERMINAL  ·  " + board.name, inner) + " │",
      "│ " + pad(board.node + "  ·  epoch " + board.epoch + "  " +
        gauge(board.landed, board.total, 10) + "  ships " + board.ships, inner) + " │",
      "│ " + pad(toolCount + " tools registered via " + host, inner) + " │",
      "└" + "─".repeat(w) + "┘",
    ].join("\n");
  }

  function pad(s, n) {
    var str = String(s);
    return str.length >= n ? str.slice(0, n) : str + " ".repeat(n - str.length);
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /**
   * Render a data table as box-drawn ASCII with optional semantic classes so
   * themes can colour headers, cells, and rules without leaving the terminal
   * grammar.
   *
   *   asciiTable([["who","role"],["maya","maintainer"],["scout","agent"]])
   *
   * When `asHtml` is true, returns colourable markup; otherwise plain text.
   */
  function asciiTable(rows, opts) {
    opts = opts || {};
    if (!rows || !rows.length) return "";
    var asHtml = !!opts.asHtml;
    var cols = 0;
    rows.forEach(function (r) { cols = Math.max(cols, r.length); });
    var widths = [];
    for (var c = 0; c < cols; c++) {
      var w = 0;
      rows.forEach(function (r) {
        w = Math.max(w, String(r[c] == null ? "" : r[c]).length);
      });
      widths.push(Math.max(1, w));
    }
    function cell(val, i, head) {
      var t = pad(String(val == null ? "" : val), widths[i]);
      if (!asHtml) return t;
      return '<span class="cw-md-td' + (head ? " cw-md-th" : "") + '">' + escapeHtml(t) + "</span>";
    }
    function rowLine(r, head) {
      var cells = [];
      for (var i = 0; i < cols; i++) cells.push(cell(r[i], i, head));
      var joined = cells.join(asHtml ? '<span class="cw-md-tsep"> │ </span>' : " │ ");
      if (!asHtml) return "│ " + joined + " │";
      return '<span class="cw-md-trow' + (head ? " cw-md-thead" : "") + '">' +
        '<span class="cw-md-tedge">│ </span>' + joined +
        '<span class="cw-md-tedge"> │</span></span>';
    }
    function ruleLine(kind) {
      // kind: top | mid | bot
      var parts = widths.map(function (w) { return "─".repeat(w + 2); });
      var corners = kind === "top" ? ["┌", "┬", "┐"]
        : kind === "bot" ? ["└", "┴", "┘"]
        : ["├", "┼", "┤"];
      var line = corners[0] + parts.join(corners[1]) + corners[2];
      if (!asHtml) return line;
      return '<span class="cw-md-trule">' + escapeHtml(line) + "</span>";
    }
    var out = [ruleLine("top"), rowLine(rows[0], true)];
    if (rows.length > 1) out.push(ruleLine("mid"));
    for (var r = 1; r < rows.length; r++) out.push(rowLine(rows[r], false));
    out.push(ruleLine("bot"));
    if (!asHtml) return out.join("\n");
    return '<pre class="cw-md-atable" data-c="ascii-table">' + out.join("\n") + "</pre>";
  }

  /**
   * Safe link schemes for inline anchors and previews.
   *
   * `community:` is the board's own locator scheme. `nightboard:` is the same
   * scheme under its retired name and stays accepted forever: links people
   * already shared must keep resolving. Nothing emits it any more.
   */
  function isSafeHref(href) {
    return /^(https?:\/\/|community:|nightboard:|\/|#)/i.test(String(href || "").trim());
  }

  function anchorHtml(href, label) {
    var h = String(href).trim();
    var lab = label == null ? h : label;
    if (!isSafeHref(h)) {
      return '<span class="cw-md-linkish">' + escapeHtml(lab) + "</span>";
    }
    var external = /^https?:\/\//i.test(h);
    return '<a class="cw-md-a" href="' + escapeHtml(h) + '"' +
      (external ? ' target="_blank" rel="noopener noreferrer"' : "") +
      ">" + escapeHtml(lab) + "</a>";
  }

  /** Inline markdown: Discord-flavoured — **bold** *em* __underline__ ~~strike~~ ||spoiler|| `code` [label](url) + bare URLs */
  function inlineMarkdown(text) {
    var s = escapeHtml(text);
    // Code first so markup inside code is inert (already escaped).
    s = s.replace(/`([^`]+)`/g, '<code class="cw-md-code">$1</code>');
    // Spoilers before bold/underline so | does not fight other marks.
    s = s.replace(/\|\|([^|]+)\|\|/g, function (_, inner) {
      var open;
      try {
        open = !!(window.CW_APP && window.CW_APP.state && window.CW_APP.state.spoilers &&
          window.CW_APP.state.spoilers[inner]);
      } catch {
        open = false;
      }
      return '<button type="button" class="cw-md-spoiler" data-spoiler="' + inner + '"' +
        ' aria-expanded="' + (open ? "true" : "false") + '"' +
        (open ? ' data-open="true"' : "") +
        ' title="' + (open ? "Hide spoiler" : "Reveal spoiler") + '">' + inner + "</button>";
    });
    s = s.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong class="cw-md-strong"><em class="cw-md-em">$1</em></strong>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong class="cw-md-strong">$1</strong>');
    s = s.replace(/__([^_]+)__/g, '<u class="cw-md-u">$1</u>');
    s = s.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em class="cw-md-em">$2</em>');
    s = s.replace(/(^|[^_])_([^_]+)_(?!_)/g, '$1<em class="cw-md-em">$2</em>');
    s = s.replace(/~~([^~]+)~~/g, '<del class="cw-md-del">$1</del>');
    // Markdown links — labels/hrefs are already HTML-escaped in `s`.
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, label, href) {
      var h = String(href).trim()
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"');
      var lab = String(label)
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"');
      return anchorHtml(h, lab);
    });
    // Bare URLs (skip if already inside an href="…").
    s = s.replace(/(^|[\s(>])((?:https?:\/\/|community:|nightboard:)[^\s<>"']+)/gi, function (m, pre, url) {
      // Trim trailing punctuation that usually is not part of the URL.
      var clean = url.replace(/[),.;:!?]+$/, "");
      var trail = url.slice(clean.length);
      return pre + anchorHtml(clean, clean) + trail;
    });
    // Mentions / topics keep the board vocabulary colourable.
    s = s.replace(/(^|[\s(])@([a-zA-Z0-9._-]{1,32})\b/g,
      '$1<span class="cw-md-mention">@$2</span>');
    s = s.replace(/(^|[\s(])#([a-zA-Z0-9._/-]{1,48})\b/g,
      '$1<span class="cw-md-topic">#$2</span>');
    return s;
  }

  /* ── Link preview cards (generated summary, ASCII / terminal) ─────────── */

  /**
   * Known URL summaries for the exploration (no network). Keys are normalized
   * hrefs without trailing slash.
   */
  var LINK_CATALOG = {
    "https://github.com/ag-ui-protocol": {
      title: "AG-UI Protocol",
      description: "Agent–User Interaction Protocol for in-browser agents and tools.",
      site: "GitHub",
      kind: "repo",
    },
    "https://github.com/webmachinelearning/webmcp": {
      title: "WebMCP",
      description: "Web Model Context Protocol — tools the page itself can register.",
      site: "GitHub",
      kind: "repo",
    },
    "https://github.com/thesysdev/openui": {
      title: "OpenUI Lang",
      description: "Streaming UI language for generative interfaces.",
      site: "GitHub",
      kind: "repo",
    },
    "https://canvasui.dev": {
      title: "CanvasUI",
      description: "Canvas-native UI primitives, including asciify.",
      site: "canvasui.dev",
      kind: "site",
    },
    "https://bsky.social": {
      title: "Bluesky",
      description: "AT Protocol personal data server.",
      site: "bsky.social",
      kind: "site",
    },
    "https://docs.epoch.local/install-cache": {
      title: "Install cache notes",
      description: "Cold vs warm path measurements and cache-key split plan.",
      site: "Epoch docs",
      kind: "docs",
    },
  };

  function normalizeHref(href) {
    var h = String(href || "").trim();
    if (!h) return "";
    // Strip common trailing punctuation left by prose.
    h = h.replace(/[),.;:!?]+$/, "");
    if (h.length > 1 && h.charAt(h.length - 1) === "/") h = h.slice(0, -1);
    return h;
  }

  /**
   * Collect unique safe links from raw body text (markdown + bare URLs).
   * @returns {{ href: string, label: string }[]}
   */
  function extractLinks(text) {
    var s = String(text || "");
    var out = [];
    var seen = {};
    function push(href, label) {
      var h = normalizeHref(href);
      if (!h || !isSafeHref(h)) return;
      // Skip pure fragment / relative path unless a board locator or absolute http.
      if (h.charAt(0) === "#" || (h.charAt(0) === "/" && h.indexOf("//") !== 0)) {
        // Keep board-internal paths as previews (board vocabulary).
        if (h.charAt(0) === "#") return;
      }
      var key = h.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      out.push({ href: h, label: label || h });
    }
    var mdRe = /\[([^\]]+)\]\(([^)]+)\)/g;
    var m;
    while ((m = mdRe.exec(s))) push(m[2], m[1]);
    var bareRe = /(^|[\s(])((?:https?:\/\/|community:|nightboard:)[^\s<>"'`]+)/gi;
    while ((m = bareRe.exec(s))) push(m[2], m[2]);
    // Board-absolute paths that look like destinations: /projects/...
    var pathRe = /(^|[\s(])(\/(?:projects|spaces|dms|notifications|channels)[^\s<>"'`]*)/g;
    while ((m = pathRe.exec(s))) push(m[2], m[2]);
    return out;
  }

  function titleFromPath(path) {
    var segs = String(path || "").split("/").filter(Boolean);
    if (!segs.length) return "Home";
    var last = segs[segs.length - 1]
      .replace(/[-_]+/g, " ")
      .replace(/\.[a-z0-9]+$/i, "");
    return last.replace(/\b\w/g, function (c) { return c.toUpperCase(); }) || path;
  }

  function kindFromHost(host, href) {
    host = String(host || "").toLowerCase();
    if (/^(?:community|nightboard):/i.test(href) || href.charAt(0) === "/") return "board";
    if (host.indexOf("github.com") !== -1) return "repo";
    if (host.indexOf("bsky.") !== -1 || host.indexOf("atproto") !== -1) return "identity";
    if (host.indexOf("docs.") === 0 || /\/docs(\/|$)/.test(href)) return "docs";
    if (host.indexOf("relay.") !== -1 || /^wss?:\/\//i.test(href)) return "relay";
    return "link";
  }

  function siteFromHost(host, kind) {
    host = String(host || "");
    if (!host) return kind === "board" ? "Community Web" : "link";
    if (host.indexOf("github.com") !== -1) return "GitHub";
    if (host.indexOf("bsky.") !== -1) return "Bluesky";
    return host.replace(/^www\./, "");
  }

  /**
   * Generate a link summary card model (no network).
   * Deterministic from URL + optional label/overrides.
   */
  function summarizeLink(href, opts) {
    opts = opts || {};
    var raw = normalizeHref(href || opts.href || "");
    var label = opts.label || opts.title || "";
    var catalog = LINK_CATALOG[raw] || LINK_CATALOG[raw.toLowerCase()] || null;

    var host;
    var path;
    var protocol;
    var displayUrl;

    if (/^(?:community|nightboard):/i.test(raw)) {
      protocol = "community";
      host = "community";
      path = raw.replace(/^(?:community|nightboard):/i, "") || "/";
      displayUrl = raw;
    } else if (raw.charAt(0) === "/") {
      protocol = "path";
      host = "community";
      path = raw;
      displayUrl = raw;
    } else {
      try {
        // URL needs a base for relative; absolute http works.
        var u = new (typeof URL !== "undefined" ? URL : window.URL)(raw, "https://community.local");
        protocol = u.protocol.replace(":", "");
        host = u.host || "";
        path = (u.pathname || "/") + (u.search || "");
        displayUrl = host + (path === "/" ? "" : path);
        if (displayUrl.length > 56) displayUrl = displayUrl.slice(0, 53) + "…";
      } catch {
        host = raw.slice(0, 48);
        path = "";
        displayUrl = raw.slice(0, 56);
      }
    }

    var kind = (catalog && catalog.kind) || opts.kind || kindFromHost(host, raw);
    var site = (catalog && catalog.site) || opts.site || siteFromHost(host, kind);
    var title = opts.title || (catalog && catalog.title) || label || titleFromPath(path) || site;
    if (title === raw || title === displayUrl) title = titleFromPath(path) || site;

    var description = opts.description || (catalog && catalog.description) || "";
    if (!description) {
      if (kind === "board") {
        description = "Open this place on the board · " + (path || "/");
      } else if (kind === "repo") {
        description = "Repository · " + displayUrl;
      } else if (kind === "docs") {
        description = "Documentation · " + displayUrl;
      } else if (kind === "identity") {
        description = "Identity / AT Protocol · " + displayUrl;
      } else {
        description = "Link preview · " + displayUrl;
      }
    }

    // Glyph mark by kind — terminal vocabulary, not emoji chrome.
    var mark = kind === "repo" ? "◈"
      : kind === "docs" ? "▤"
      : kind === "board" ? "▣"
      : kind === "identity" ? "◉"
      : kind === "relay" ? "◎"
      : "▸";

    return {
      href: raw,
      label: label || title,
      host: host,
      path: path,
      protocol: protocol,
      displayUrl: displayUrl,
      site: site,
      kind: kind,
      title: String(title).slice(0, 72),
      description: String(description).slice(0, 160),
      mark: mark,
    };
  }

  /**
   * Plain-text ASCII frame for a link summary (copyable terminal art).
   */
  function linkPreviewAscii(summary, width) {
    summary = summary || {};
    var w = Math.max(28, Math.min(56, width || 44));
    var inner = w - 2;
    var kindTag = String(summary.kind || "link").toUpperCase();
    var headLabel = " " + (summary.mark || "▸") + " " + kindTag + " · " +
      String(summary.site || "link") + " ";
    if (headLabel.length > inner - 2) {
      headLabel = headLabel.slice(0, Math.max(0, inner - 3)) + "… ";
    }
    var left = 1;
    var right = Math.max(0, inner - left - headLabel.length);
    var top = "┌" + "─".repeat(left) + headLabel + "─".repeat(right) + "┐";
    var bot = "└" + "─".repeat(inner) + "┘";
    function line(text) {
      return "│ " + pad(String(text == null ? "" : text), inner - 2) + " │";
    }
    var lines = [
      top,
      line(summary.title || "Link"),
      line(summary.description || ""),
      line(summary.displayUrl || summary.href || ""),
      bot,
    ];
    return lines.join("\n");
  }

  /**
   * Reusable link preview component: generated summary card, ASCII/terminal
   * rendered, colourable via `.cw-link-preview-*` theme classes.
   *
   *   CW_ASCII.linkPreview("https://github.com/ag-ui-protocol")
   *   CW_ASCII.linkPreview(url, { label, title, description, width, asHtml: false })
   *
   * @returns {string} HTML article (default) or plain ASCII when asHtml:false
   */
  function linkPreview(href, opts) {
    opts = opts || {};
    var summary = typeof href === "object" && href && !Array.isArray(href)
      ? summarizeLink(href.href || href.url, href)
      : summarizeLink(href, opts);
    if (!summary.href) return "";

    var width = opts.width || 44;
    var ascii = linkPreviewAscii(summary, width);
    if (opts.asHtml === false) return ascii;

    var external = /^https?:\/\//i.test(summary.href);
    var boardPath = summary.kind === "board" || /^nightboard:/i.test(summary.href) ||
      summary.href.charAt(0) === "/";
    var goto = "";
    if (boardPath) {
      goto = summary.href.replace(/^nightboard:/i, "") || "/";
      if (goto.charAt(0) !== "/") goto = "/" + goto;
    }

    var lines = ascii.split("\n");
    var colored = lines.map(function (ln, i) {
      if (i === 0 || i === lines.length - 1) {
        return '<span class="cw-link-preview-rule">' + escapeHtml(ln) + "</span>";
      }
      if (i === 1) {
        return '<span class="cw-link-preview-title">' + escapeHtml(ln) + "</span>";
      }
      if (i === 2) {
        return '<span class="cw-link-preview-desc">' + escapeHtml(ln) + "</span>";
      }
      return '<span class="cw-link-preview-url">' + escapeHtml(ln) + "</span>";
    }).join("\n");

    var pre = '<pre class="cw-link-preview-ascii" aria-label="Link preview: ' +
      escapeHtml(summary.title) + '">' + colored + "</pre>";
    var titleAttr = ' title="' + escapeHtml(summary.title + " — " + summary.displayUrl) + '"';
    // Board paths use a button + data-goto (SPA). External URLs use a real anchor.
    var hit = goto
      ? '<button type="button" class="cw-link-preview-hit" data-goto="' +
        escapeHtml(goto) + '"' + titleAttr + ">" + pre + "</button>"
      : '<a class="cw-link-preview-hit" href="' + escapeHtml(summary.href) + '"' +
        (external ? ' target="_blank" rel="noopener noreferrer"' : "") +
        titleAttr + ">" + pre + "</a>";

    return '<article class="cw-link-preview" data-c="link-preview"' +
      ' data-kind="' + escapeHtml(summary.kind) + '"' +
      ' data-host="' + escapeHtml(summary.host || "") + '"' +
      ' data-href="' + escapeHtml(summary.href) + '">' +
      hit + "</article>";
  }

  /** Render preview cards for every unique link in text (deduped). */
  function linkPreviewsFor(text, opts) {
    opts = opts || {};
    var links = extractLinks(text);
    if (!links.length) return "";
    return links.map(function (L) {
      return linkPreview(L.href, Object.assign({}, opts, { label: L.label }));
    }).join("");
  }

  /** Wrap body HTML with trailing link preview cards when links are present. */
  function withLinkPreviews(bodyHtml, rawText, opts) {
    var cards = linkPreviewsFor(rawText, opts);
    if (!cards) return bodyHtml;
    return '<div class="cw-md-with-previews">' + bodyHtml +
      '<div class="cw-link-previews" data-c="link-previews" role="group" aria-label="Link previews">' +
      cards + "</div></div>";
  }

  function isTableSeparator(line) {
    return /^\s*\|?[\s:|-]+\|[\s|:|-]*\|?\s*$/.test(line) && /-\s*-/.test(line.replace(/\|/g, " "));
  }

  function parseTableRow(line) {
    var t = String(line).trim();
    if (t.charAt(0) === "|") t = t.slice(1);
    if (t.charAt(t.length - 1) === "|") t = t.slice(0, -1);
    return t.split("|").map(function (c) { return c.trim(); });
  }

  /**
   * Markdown → colourable HTML for the terminal board.
   *
   * Subset: fenced code, pipe tables (rendered as box-drawn ASCII tables),
   * headings, lists, blockquotes, hr, paragraphs, and inline marks.
   * No raw HTML. Themes style via `.cw-md-*` classes on theme tokens.
   */
  function markdown(src) {
    var text = String(src == null ? "" : src).replace(/\r\n/g, "\n");
    if (!text) return "";
    var lines = text.split("\n");
    var html = [];
    var i = 0;
    while (i < lines.length) {
      var line = lines[i];

      // Fenced code
      var fence = /^```([\w-]*)\s*$/.exec(line);
      if (fence) {
        var lang = fence[1] || "";
        var code = [];
        i += 1;
        while (i < lines.length && !/^```\s*$/.test(lines[i])) {
          code.push(lines[i]);
          i += 1;
        }
        i += 1; // closing fence
        var codeText = code.join("\n");
        var langNorm = window.CW_SYNTAX
          ? window.CW_SYNTAX.guessLang(codeText, lang)
          : (lang || "text");
        var highlighted = window.CW_SYNTAX
          ? window.CW_SYNTAX.highlight(codeText, langNorm)
          : escapeHtml(codeText);
        html.push(
          '<pre class="cw-md-pre" tabindex="0" data-lang="' + escapeHtml(langNorm) + '"' +
          ' aria-label="' + (langNorm && langNorm !== "text"
            ? escapeHtml(langNorm) + " code block"
            : "Code block") + '"' +
          (langNorm && langNorm !== "text" ? ' data-highlighted="true"' : "") + ">" +
          '<code class="cw-md-codeblock">' + highlighted + "</code></pre>"
        );
        continue;
      }

      // Pipe table: header + separator + body rows
      if (line.indexOf("|") !== -1 && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
        var rows = [parseTableRow(line)];
        i += 2; // skip separator
        while (i < lines.length && lines[i].indexOf("|") !== -1 && String(lines[i]).trim() !== "") {
          rows.push(parseTableRow(lines[i]));
          i += 1;
        }
        html.push(asciiTable(rows, { asHtml: true }));
        continue;
      }

      // Horizontal rule
      if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
        html.push('<div class="cw-md-hr">' + escapeHtml(rule("", 40)) + "</div>");
        i += 1;
        continue;
      }

      // Heading
      var hm = /^(#{1,4})\s+(.+)$/.exec(line);
      if (hm) {
        var level = hm[1].length;
        html.push('<div class="cw-md-h cw-md-h' + level + '">' + inlineMarkdown(hm[2]) + "</div>");
        i += 1;
        continue;
      }

      // Blockquote (Discord: > line; >>> quotes rest of message)
      if (/^\s*>>>/.test(line) || /^\s*>\s?/.test(line)) {
        var q = [];
        var multi = /^\s*>>>/.test(line);
        if (multi) {
          q.push(line.replace(/^\s*>>>\s?/, ""));
          i += 1;
          while (i < lines.length) {
            q.push(lines[i]);
            i += 1;
          }
        } else {
          while (i < lines.length && /^\s*>\s?/.test(lines[i]) && !/^\s*>>>/.test(lines[i])) {
            q.push(lines[i].replace(/^\s*>\s?/, ""));
            i += 1;
          }
        }
        html.push('<blockquote class="cw-md-quote">' +
          q.map(function (ql) { return inlineMarkdown(ql); }).join("<br>") +
          "</blockquote>");
        continue;
      }

      // Unordered list
      if (/^\s*[-*+]\s+/.test(line)) {
        var items = [];
        while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
          items.push("<li>" + inlineMarkdown(lines[i].replace(/^\s*[-*+]\s+/, "")) + "</li>");
          i += 1;
        }
        html.push('<ul class="cw-md-ul">' + items.join("") + "</ul>");
        continue;
      }

      // Ordered list
      if (/^\s*\d+\.\s+/.test(line)) {
        var oitems = [];
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
          oitems.push("<li>" + inlineMarkdown(lines[i].replace(/^\s*\d+\.\s+/, "")) + "</li>");
          i += 1;
        }
        html.push('<ol class="cw-md-ol">' + oitems.join("") + "</ol>");
        continue;
      }

      // Blank
      if (/^\s*$/.test(line)) {
        i += 1;
        continue;
      }

      // Paragraph (consume consecutive non-special lines)
      var para = [];
      while (i < lines.length) {
        var L = lines[i];
        if (/^\s*$/.test(L)) break;
        if (/^```/.test(L)) break;
        if (/^(#{1,4})\s+/.test(L)) break;
        if (/^\s*>\s?/.test(L)) break;
        if (/^\s*[-*+]\s+/.test(L)) break;
        if (/^\s*\d+\.\s+/.test(L)) break;
        if (L.indexOf("|") !== -1 && i + 1 < lines.length && isTableSeparator(lines[i + 1])) break;
        if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(L)) break;
        para.push(L);
        i += 1;
      }
      html.push('<p class="cw-md-p">' + inlineMarkdown(para.join(" ")) + "</p>");
    }
    return '<div class="cw-md">' + html.join("") + "</div>";
  }

  /** True when text likely wants markdown rendering (tables, fences, marks, links). */
  function looksLikeMarkdown(text) {
    var s = String(text || "");
    if (!s) return false;
    if (/```/.test(s)) return true;
    if (/\|.+\|/.test(s) && /\n\s*\|?[\s:-]+\|/.test(s)) return true;
    if (/^#{1,4}\s+/m.test(s)) return true;
    if (/\*\*[^*]+\*\*/.test(s)) return true;
    if (/^\s*[-*+]\s+\S/m.test(s) && s.indexOf("\n") !== -1) return true;
    if (/\[[^\]]+\]\((https?:\/\/|nightboard:|\/)/i.test(s)) return true;
    if (/(?:https?:\/\/|nightboard:)\S+/i.test(s)) return true;
    return false;
  }

  /**
   * Colour-code plain terminal lines: box edges, gauges, sigils, paths.
   * Used when content is not markdown but still benefits from ink hierarchy.
   */
  function colorizeAscii(text) {
    var s = escapeHtml(text);
    // Box-drawing and rules
    s = s.replace(/([┌┐└┘├┤┬┴┼─│╭╮╯╰═║╔╗╚╝╠╣╦╩╬]+)/g,
      '<span class="cw-md-box">$1</span>');
    // Block gauges / sparklines
    s = s.replace(/([▁▂▃▄▅▆▇█░▒▓]+)/g, '<span class="cw-md-block">$1</span>');
    // Braille sigils
    s = s.replace(/([\u2800-\u28FF]+)/g, '<span class="cw-md-sigil">$1</span>');
    return '<span class="cw-md-ascii">' + s + "</span>";
  }

  /**
   * Render body text: markdown when it looks like it, else colourised plain.
   * Any http(s) / community: / board-path links get reusable ASCII preview cards.
   */
  function formatBody(text) {
    var raw = String(text == null ? "" : text);
    var body;
    if (looksLikeMarkdown(raw)) body = markdown(raw);
    else if (window.CW_SYNTAX && window.CW_SYNTAX.looksLikeJson(raw)) {
      body = '<pre class="cw-md-pre" tabindex="0" data-lang="json" data-highlighted="true"' +
        ' aria-label="json code block">' +
        '<code class="cw-md-codeblock">' + window.CW_SYNTAX.highlight(raw, "json") +
        "</code></pre>";
    } else if (raw.indexOf("\n") !== -1) {
      body = '<pre class="cw-md-plain">' + colorizeAscii(raw) + "</pre>";
    } else {
      body = colorizeAscii(raw);
    }
    return withLinkPreviews(body, raw);
  }

  window.CW_ASCII = {
    sparkline: sparkline,
    gauge: gauge,
    sigil: sigil,
    rule: rule,
    branch: branch,
    banner: banner,
    brandFrames: brandFrames,
    brandBlock: brandBlock,
    brandPlain: brandPlain,
    brandHtml: brandHtml,
    EPOCH_MARK: EPOCH_MARK,
    EPOCH_TAG: EPOCH_TAG,
    pad: pad,
    escapeHtml: escapeHtml,
    asciiTable: asciiTable,
    markdown: markdown,
    inlineMarkdown: inlineMarkdown,
    looksLikeMarkdown: looksLikeMarkdown,
    colorizeAscii: colorizeAscii,
    formatBody: formatBody,
    // Reusable link preview component (generated summary, ASCII/terminal).
    isSafeHref: isSafeHref,
    extractLinks: extractLinks,
    summarizeLink: summarizeLink,
    linkPreviewAscii: linkPreviewAscii,
    linkPreview: linkPreview,
    linkPreviewsFor: linkPreviewsFor,
    withLinkPreviews: withLinkPreviews,
    LINK_CATALOG: LINK_CATALOG,
    BLOCKS: BLOCKS,
    SHADES: SHADES,
  };
})();
