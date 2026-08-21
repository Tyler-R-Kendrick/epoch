/**
 * Terminal file editor for Community Web detail panes.
 *
 * Looks and feels like a small vim/neovim: NORMAL / INSERT / VISUAL modes,
 * status line, line gutter, and a block caret — but pointer and touch are
 * first-class (click to place caret, drag to select, tap/long-press, scroll
 * wheel / swipe).
 *
 * Buffer state lives on the caller (app state). This module is pure-ish:
 * open/render/key/pointer/touch handlers return patches; no DOM writes except
 * optional focus helpers.
 */
(function () {
  "use strict";

  var MODES = { normal: "NORMAL", insert: "INSERT", visual: "VISUAL" };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  function splitLines(text) {
    var s = String(text == null ? "" : text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    if (s === "") return [""];
    var lines = s.split("\n");
    // Keep trailing empty line if text ends with newline.
    return lines.length ? lines : [""];
  }

  function joinLines(lines) {
    return (lines || [""]).join("\n");
  }

  function makeBuffer(path, text, meta) {
    meta = meta || {};
    var lines = splitLines(text);
    return {
      path: path || "untitled",
      name: meta.name || (path && path.split("/").pop()) || "untitled",
      lines: lines,
      cursor: { line: 0, col: 0 },
      // visual anchor when mode === visual
      anchor: null,
      mode: "normal",
      dirty: false,
      scroll: 0,
      // preferred column for vertical motion
      prefCol: 0,
      message: "",
      readonly: !!meta.readonly,
      language: meta.language || guessLang(path || meta.name || ""),
      openedAt: Date.now(),
    };
  }

  function guessLang(name) {
    if (window.CW_SYNTAX && window.CW_SYNTAX.langFromPath) {
      return window.CW_SYNTAX.langFromPath(name);
    }
    name = String(name || "").toLowerCase();
    if (/\.md$|\.markdown$/.test(name)) return "markdown";
    if (/\.ts$|\.tsx$|\.js$|\.jsx$/.test(name)) return "typescript";
    if (/\.json$/.test(name)) return "json";
    if (/\.css$/.test(name)) return "css";
    if (/\.html?$/.test(name)) return "html";
    if (/\.py$/.test(name)) return "python";
    if (/\.rs$/.test(name)) return "rust";
    if (/\.go$/.test(name)) return "go";
    if (/\.ya?ml$/.test(name)) return "yaml";
    if (/\.toml$/.test(name)) return "toml";
    if (/\.sh$|\.bash$/.test(name)) return "shell";
    return "text";
  }

  function lineLen(buf, line) {
    var L = buf.lines[line];
    return L == null ? 0 : L.length;
  }

  function clampCursor(buf) {
    if (!buf.lines.length) buf.lines = [""];
    buf.cursor.line = clamp(buf.cursor.line, 0, buf.lines.length - 1);
    buf.cursor.col = clamp(buf.cursor.col, 0, lineLen(buf, buf.cursor.line));
    return buf;
  }

  function setCursor(buf, line, col, keepPref) {
    buf.cursor.line = line;
    buf.cursor.col = col;
    clampCursor(buf);
    if (!keepPref) buf.prefCol = buf.cursor.col;
    ensureVisible(buf);
    return buf;
  }

  function ensureVisible(buf, viewRows) {
    viewRows = viewRows || 24;
    var ln = buf.cursor.line;
    if (ln < buf.scroll) buf.scroll = ln;
    if (ln >= buf.scroll + viewRows) buf.scroll = ln - viewRows + 1;
    buf.scroll = clamp(buf.scroll, 0, Math.max(0, buf.lines.length - 1));
  }

  function moveVert(buf, delta) {
    var line = clamp(buf.cursor.line + delta, 0, buf.lines.length - 1);
    var col = Math.min(buf.prefCol, lineLen(buf, line));
    return setCursor(buf, line, col, true);
  }

  function moveHorz(buf, delta) {
    var line = buf.cursor.line;
    var col = buf.cursor.col + delta;
    if (col < 0) {
      if (line > 0) return setCursor(buf, line - 1, lineLen(buf, line - 1));
      return setCursor(buf, line, 0);
    }
    if (col > lineLen(buf, line)) {
      if (line < buf.lines.length - 1) return setCursor(buf, line + 1, 0);
      return setCursor(buf, line, lineLen(buf, line));
    }
    return setCursor(buf, line, col);
  }

  function insertText(buf, text) {
    if (buf.readonly) {
      buf.message = "readonly";
      return buf;
    }
    text = String(text || "");
    if (!text) return buf;
    var line = buf.cursor.line;
    var col = buf.cursor.col;
    var cur = buf.lines[line] || "";
    var parts = splitLines(text);
    if (parts.length === 1) {
      buf.lines[line] = cur.slice(0, col) + parts[0] + cur.slice(col);
      setCursor(buf, line, col + parts[0].length);
    } else {
      var head = cur.slice(0, col) + parts[0];
      var tail = parts[parts.length - 1] + cur.slice(col);
      var mid = parts.slice(1, -1);
      var next = [head].concat(mid).concat([tail]);
      buf.lines.splice.apply(buf.lines, [line, 1].concat(next));
      setCursor(buf, line + parts.length - 1, parts[parts.length - 1].length);
    }
    buf.dirty = true;
    buf.message = "";
    return buf;
  }

  function deleteRange(buf, from, to) {
    if (buf.readonly) {
      buf.message = "readonly";
      return buf;
    }
    // Normalize order.
    var a = from;
    var b = to;
    if (a.line > b.line || (a.line === b.line && a.col > b.col)) {
      a = to;
      b = from;
    }
    if (a.line === b.line) {
      var L = buf.lines[a.line] || "";
      buf.lines[a.line] = L.slice(0, a.col) + L.slice(b.col);
    } else {
      var first = (buf.lines[a.line] || "").slice(0, a.col);
      var last = (buf.lines[b.line] || "").slice(b.col);
      buf.lines.splice(a.line, b.line - a.line + 1, first + last);
    }
    if (!buf.lines.length) buf.lines = [""];
    buf.dirty = true;
    setCursor(buf, a.line, a.col);
    return buf;
  }

  function deleteChar(buf, backward) {
    if (buf.readonly) {
      buf.message = "readonly";
      return buf;
    }
    var line = buf.cursor.line;
    var col = buf.cursor.col;
    if (backward) {
      if (col > 0) {
        var L = buf.lines[line];
        buf.lines[line] = L.slice(0, col - 1) + L.slice(col);
        setCursor(buf, line, col - 1);
        buf.dirty = true;
      } else if (line > 0) {
        var prevLen = lineLen(buf, line - 1);
        buf.lines[line - 1] = buf.lines[line - 1] + buf.lines[line];
        buf.lines.splice(line, 1);
        setCursor(buf, line - 1, prevLen);
        buf.dirty = true;
      }
    } else {
      var cur = buf.lines[line] || "";
      if (col < cur.length) {
        buf.lines[line] = cur.slice(0, col) + cur.slice(col + 1);
        buf.dirty = true;
      } else if (line < buf.lines.length - 1) {
        buf.lines[line] = cur + (buf.lines[line + 1] || "");
        buf.lines.splice(line + 1, 1);
        buf.dirty = true;
      }
    }
    clampCursor(buf);
    return buf;
  }

  function deleteLine(buf) {
    if (buf.readonly) {
      buf.message = "readonly";
      return buf;
    }
    if (buf.lines.length <= 1) {
      buf.lines = [""];
      setCursor(buf, 0, 0);
    } else {
      buf.lines.splice(buf.cursor.line, 1);
      setCursor(buf, Math.min(buf.cursor.line, buf.lines.length - 1), 0);
    }
    buf.dirty = true;
    buf.message = "deleted line";
    return buf;
  }

  function openLine(buf, below) {
    if (buf.readonly) {
      buf.message = "readonly";
      return buf;
    }
    var at = below ? buf.cursor.line + 1 : buf.cursor.line;
    buf.lines.splice(at, 0, "");
    setCursor(buf, at, 0);
    buf.mode = "insert";
    buf.dirty = true;
    return buf;
  }

  function wordBound(buf, forward) {
    var line = buf.cursor.line;
    var col = buf.cursor.col;
    var L = buf.lines[line] || "";
    if (forward) {
      while (col < L.length && /\s/.test(L.charAt(col))) col += 1;
      while (col < L.length && !/\s/.test(L.charAt(col))) col += 1;
      if (col >= L.length && line < buf.lines.length - 1) {
        return setCursor(buf, line + 1, 0);
      }
      return setCursor(buf, line, col);
    }
    if (col === 0 && line > 0) {
      return setCursor(buf, line - 1, lineLen(buf, line - 1));
    }
    col = Math.max(0, col - 1);
    while (col > 0 && /\s/.test(L.charAt(col))) col -= 1;
    while (col > 0 && !/\s/.test(L.charAt(col - 1))) col -= 1;
    return setCursor(buf, line, col);
  }

  function selectionRange(buf) {
    if (buf.mode !== "visual" || !buf.anchor) return null;
    var a = buf.anchor;
    var b = buf.cursor;
    if (a.line > b.line || (a.line === b.line && a.col > b.col)) {
      return { from: b, to: a };
    }
    return { from: a, to: b };
  }

  function inSelection(buf, line, col) {
    var r = selectionRange(buf);
    if (!r) return false;
    if (line < r.from.line || line > r.to.line) return false;
    if (line === r.from.line && line === r.to.line) {
      return col >= r.from.col && col < r.to.col;
    }
    if (line === r.from.line) return col >= r.from.col;
    if (line === r.to.line) return col < r.to.col;
    return true;
  }

  /**
   * Keyboard handler. Returns true if consumed.
   */
  function handleKey(buf, ev) {
    if (!buf || !ev) return false;
    var key = ev.key;
    var ctrl = ev.ctrlKey || ev.metaKey;
    var mode = buf.mode;

    // Universal
    if (key === "Escape") {
      if (mode === "insert" || mode === "visual") {
        buf.mode = "normal";
        buf.anchor = null;
        buf.message = "";
        if (mode === "insert") {
          // Leave insert on the char under cursor (vim-like).
          if (buf.cursor.col > 0) buf.cursor.col -= 1;
          clampCursor(buf);
        }
        return true;
      }
      return false;
    }

    if (mode === "insert") {
      if (key === "Enter") {
        insertText(buf, "\n");
        return true;
      }
      if (key === "Backspace") {
        deleteChar(buf, true);
        return true;
      }
      if (key === "Delete") {
        deleteChar(buf, false);
        return true;
      }
      if (key === "ArrowLeft") { moveHorz(buf, -1); return true; }
      if (key === "ArrowRight") { moveHorz(buf, 1); return true; }
      if (key === "ArrowUp") { moveVert(buf, -1); return true; }
      if (key === "ArrowDown") { moveVert(buf, 1); return true; }
      if (key === "Tab") {
        insertText(buf, "  ");
        return true;
      }
      if (key === "Home") { setCursor(buf, buf.cursor.line, 0); return true; }
      if (key === "End") {
        setCursor(buf, buf.cursor.line, lineLen(buf, buf.cursor.line));
        return true;
      }
      if (key.length === 1 && !ctrl) {
        insertText(buf, key);
        return true;
      }
      return false;
    }

    // NORMAL + VISUAL
    if (key === "i" && mode === "normal") {
      if (buf.readonly) { buf.message = "readonly"; return true; }
      buf.mode = "insert";
      buf.message = "-- INSERT --";
      return true;
    }
    if (key === "a" && mode === "normal") {
      if (buf.readonly) { buf.message = "readonly"; return true; }
      buf.mode = "insert";
      setCursor(buf, buf.cursor.line, buf.cursor.col + 1);
      buf.message = "-- INSERT --";
      return true;
    }
    if (key === "A" && mode === "normal") {
      if (buf.readonly) { buf.message = "readonly"; return true; }
      buf.mode = "insert";
      setCursor(buf, buf.cursor.line, lineLen(buf, buf.cursor.line));
      buf.message = "-- INSERT --";
      return true;
    }
    if (key === "o" && mode === "normal") {
      openLine(buf, true);
      buf.message = "-- INSERT --";
      return true;
    }
    if (key === "O" && mode === "normal") {
      openLine(buf, false);
      buf.message = "-- INSERT --";
      return true;
    }
    if (key === "v" && mode === "normal") {
      buf.mode = "visual";
      buf.anchor = { line: buf.cursor.line, col: buf.cursor.col };
      buf.message = "-- VISUAL --";
      return true;
    }
    if (key === "h" || key === "ArrowLeft") { moveHorz(buf, -1); return true; }
    if (key === "l" || key === "ArrowRight") { moveHorz(buf, 1); return true; }
    if (key === "j" || key === "ArrowDown") { moveVert(buf, 1); return true; }
    if (key === "k" || key === "ArrowUp") { moveVert(buf, -1); return true; }
    if (key === "0" || key === "Home") { setCursor(buf, buf.cursor.line, 0); return true; }
    if (key === "$" || key === "End") {
      setCursor(buf, buf.cursor.line, lineLen(buf, buf.cursor.line));
      return true;
    }
    if (key === "w") { wordBound(buf, true); return true; }
    if (key === "b") { wordBound(buf, false); return true; }
    if (key === "g") {
      // simplified: g → top (gg not multi-key for exploration)
      setCursor(buf, 0, 0);
      buf.message = "top";
      return true;
    }
    if (key === "G") {
      var last = buf.lines.length - 1;
      setCursor(buf, last, lineLen(buf, last));
      buf.message = "bottom";
      return true;
    }
    if (key === "x" && mode === "normal") {
      deleteChar(buf, false);
      return true;
    }
    if (key === "d" && mode === "normal") {
      // simplified dd → one key 'd' deletes line in exploration (or D)
      deleteLine(buf);
      return true;
    }
    if ((key === "d" || key === "x" || key === "Backspace" || key === "Delete") && mode === "visual") {
      var r = selectionRange(buf);
      if (r) deleteRange(buf, r.from, r.to);
      buf.mode = "normal";
      buf.anchor = null;
      buf.message = "deleted";
      return true;
    }
    if (key === "u" && mode === "normal") {
      buf.message = "undo not wired (exploration)";
      return true;
    }
    if (ctrl && (key === "d" || key === "D")) {
      moveVert(buf, 12);
      return true;
    }
    if (ctrl && (key === "u" || key === "U")) {
      moveVert(buf, -12);
      return true;
    }
    if (key === "PageDown") { moveVert(buf, 16); return true; }
    if (key === "PageUp") { moveVert(buf, -16); return true; }
    // Enter in normal: like j
    if (key === "Enter" && mode === "normal") { moveVert(buf, 1); return true; }
    return false;
  }

  /**
   * Place cursor from a click/tap at (line, col) within buffer coordinates.
   */
  function clickAt(buf, line, col, opts) {
    opts = opts || {};
    line = clamp(line, 0, Math.max(0, buf.lines.length - 1));
    col = clamp(col, 0, lineLen(buf, line));
    if (opts.extend || buf.mode === "visual") {
      if (!buf.anchor) buf.anchor = { line: buf.cursor.line, col: buf.cursor.col };
      buf.mode = "visual";
      setCursor(buf, line, col);
      buf.message = "-- VISUAL --";
    } else {
      buf.mode = opts.insert ? "insert" : buf.mode === "insert" ? "insert" : "normal";
      buf.anchor = null;
      setCursor(buf, line, col);
      if (buf.mode === "insert") buf.message = "-- INSERT --";
      else buf.message = "";
    }
    return buf;
  }

  function scrollBy(buf, deltaLines) {
    buf.scroll = clamp((buf.scroll || 0) + deltaLines, 0, Math.max(0, buf.lines.length - 1));
    return buf;
  }

  /**
   * Render terminal editor HTML.
   * @param {object} buf
   * @param {object} opts { viewRows, focused }
   */
  function render(buf, opts) {
    opts = opts || {};
    if (!buf) {
      return '<div class="cw-ed" data-c="editor"><p class="cn-empty">No file open.</p></div>';
    }
    clampCursor(buf);
    var viewRows = opts.viewRows || 28;
    var focused = opts.focused !== false;
    var start = clamp(buf.scroll || 0, 0, Math.max(0, buf.lines.length - 1));
    var end = Math.min(buf.lines.length, start + viewRows);
    var gutterW = String(Math.max(buf.lines.length, 1)).length;
    var modeName = MODES[buf.mode] || buf.mode;
    var pos = (buf.cursor.line + 1) + ":" + (buf.cursor.col + 1);
    var pct = buf.lines.length <= 1
      ? "All"
      : (Math.round((buf.cursor.line / Math.max(1, buf.lines.length - 1)) * 100) + "%");

    var rows = [];
    for (var i = start; i < end; i++) {
      var raw = buf.lines[i] == null ? "" : buf.lines[i];
      var cells = [];
      var display = raw.length ? raw : " ";
      var syn = window.CW_SYNTAX;
      var lang = buf.language || "text";
      var types = (syn && lang && lang !== "text")
        ? syn.lineTypes(raw, lang)
        : null;
      for (var c = 0; c < display.length; c++) {
        var ch = display.charAt(c);
        if (ch === " ") ch = " ";
        var isCaret = focused && buf.mode !== "visual" &&
          i === buf.cursor.line && c === buf.cursor.col;
        var sel = inSelection(buf, i, c);
        // If empty line caret
        if (!raw.length && c === 0 && isCaret) {
          cells.push('<span class="cw-ed-ch cw-ed-caret" data-line="' + i +
            '" data-col="0"> </span>');
          break;
        }
        var cls = "cw-ed-ch";
        if (isCaret) cls += " cw-ed-caret";
        if (sel) cls += " cw-ed-sel";
        var ty = types && types[c] && types[c] !== "text" ? types[c] : "";
        if (ty) cls += " cw-tok cw-tok-" + ty;
        cells.push('<span class="' + cls + '" data-line="' + i + '" data-col="' + c + '">' +
          (ch === " " ? " " : esc(ch)) + "</span>");
      }
      // Caret past end of line
      if (focused && buf.mode !== "visual" && i === buf.cursor.line &&
          buf.cursor.col >= raw.length && raw.length > 0) {
        cells.push('<span class="cw-ed-ch cw-ed-caret" data-line="' + i +
          '" data-col="' + raw.length + '"> </span>');
      }
      // Empty line without caret already handled; empty unfocused
      if (!raw.length && !(focused && i === buf.cursor.line)) {
        cells.push('<span class="cw-ed-ch" data-line="' + i + '" data-col="0"> </span>');
      }
      var g = String(i + 1).padStart(gutterW, " ");
      var rowCls = "cw-ed-row";
      if (i === buf.cursor.line) rowCls += " cw-ed-row-cur";
      rows.push(
        '<div class="' + rowCls + '" data-line="' + i + '">' +
        '<span class="cw-ed-gutter" aria-hidden="true">' + esc(g) + "</span>" +
        '<span class="cw-ed-line" data-line="' + i + '">' + cells.join("") + "</span>" +
        "</div>"
      );
    }

    var statusLeft = modeName + (buf.dirty ? " [+]" : "") +
      (buf.readonly ? " RO" : "");
    var statusMid = buf.name || buf.path;
    var statusRight = pos + "  " + pct;
    var msg = buf.message || (buf.mode === "insert" ? "-- INSERT --" :
      buf.mode === "visual" ? "-- VISUAL --" : "");

    return '<div class="cw-ed" data-c="editor" data-editor="true"' +
      ' data-path="' + esc(buf.path) + '"' +
      ' data-mode="' + esc(buf.mode) + '"' +
      ' data-focused="' + (focused ? "true" : "false") + '"' +
      ' tabindex="0" role="textbox" aria-multiline="true"' +
      ' aria-label="Terminal editor ' + esc(buf.name) + '">' +
      '<div class="cw-ed-chrome">' +
      '<span class="cw-ed-chrome-name">' + esc(buf.name) + "</span>" +
      '<span class="cw-ed-chrome-lang">' + esc(buf.language) + "</span>" +
      '<span class="cw-ed-chrome-hint">i insert · Esc normal · v visual · click/tap caret</span>' +
      "</div>" +
      '<div class="cw-ed-body" data-editor-body>' +
      rows.join("") +
      "</div>" +
      '<div class="cw-ed-status" data-mode="' + esc(buf.mode) + '">' +
      '<span class="cw-ed-status-mode">' + esc(statusLeft) + "</span>" +
      '<span class="cw-ed-status-file">' + esc(statusMid) + "</span>" +
      '<span class="cw-ed-status-pos">' + esc(statusRight) + "</span>" +
      "</div>" +
      (msg
        ? '<div class="cw-ed-msg" data-mode="' + esc(buf.mode) + '">' + esc(msg) + "</div>"
        : "") +
      "</div>";
  }

  /**
   * Resolve display text for a board file entry (agent files, etc.).
   */
  function contentFromEntry(entry, path) {
    entry = entry || {};
    var agent = entry.agent || {};
    if (entry.agentFile === "instructions") {
      return {
        text: agent.instructions || "",
        name: "instructions.md",
        language: "markdown",
        path: path || "instructions.md",
      };
    }
    if (entry.agentFile === "agent.ts") {
      var ts = "import { defineAgent } from \"eve\";\n\n" +
        "export default defineAgent({\n" +
        "  model: " + JSON.stringify(agent.model || "anthropic/claude-sonnet-4.6") + ",\n" +
        "});\n";
      return { text: ts, name: "agent.ts", language: "typescript", path: path || "agent.ts" };
    }
    if (entry.agentSkill) {
      var sk = entry.agentSkill;
      var md = "# " + (sk.title || sk.id || "skill") + "\n\n" + (sk.body || "") + "\n";
      return {
        text: md,
        name: entry.name || ((sk.id || "skill") + ".md"),
        language: "markdown",
        path: path || entry.name,
      };
    }
    if (entry.agentTool) {
      var tl = entry.agentTool;
      var toolTs = "import { defineTool } from \"eve\";\n\n" +
        "export default defineTool({\n" +
        "  description: " + JSON.stringify(tl.body || tl.title || tl.id || "tool") + ",\n" +
        "  execute: async () => {\n" +
        "    // exploration stub\n" +
        "  },\n" +
        "});\n";
      return {
        text: toolTs,
        name: entry.name || ((tl.id || "tool") + ".ts"),
        language: "typescript",
        path: path || entry.name,
      };
    }
    if (entry.post) {
      var body = (entry.post.subject ? entry.post.subject + "\n\n" : "") +
        (entry.post.body || "");
      return {
        text: body,
        name: entry.name || entry.post.id || "post",
        language: "markdown",
        path: path || entry.name,
      };
    }
    if (entry.keymap || entry.meta === "keymap" ||
        /(^|\/)keymap\.toml$/i.test(path || entry.name || "")) {
      var keymapText = (window.CW_KEYMAP && window.CW_KEYMAP.source)
        ? window.CW_KEYMAP.source()
        : "# keymap.toml unavailable\n";
      return {
        text: keymapText,
        name: "keymap.toml",
        language: "toml",
        path: path || "/keymap.toml",
      };
    }
    // Generic entry
    var bits = [];
    if (entry.hint) bits.push(entry.hint);
    if (entry.meta) bits.push("meta: " + entry.meta);
    if (entry.kind) bits.push("kind: " + entry.kind);
    bits.push("path: " + (path || entry.name || ""));
    return {
      text: bits.join("\n") + "\n",
      name: entry.name || "file",
      language: guessLang(entry.name || path || ""),
      path: path || entry.name || "file",
    };
  }

  function text(buf) {
    return joinLines(buf && buf.lines);
  }

  window.CW_EDITOR = {
    MODES: MODES,
    makeBuffer: makeBuffer,
    open: makeBuffer,
    text: text,
    render: render,
    handleKey: handleKey,
    clickAt: clickAt,
    scrollBy: scrollBy,
    contentFromEntry: contentFromEntry,
    guessLang: guessLang,
    clampCursor: clampCursor,
    insertText: insertText,
    deleteLine: deleteLine,
  };
})();
