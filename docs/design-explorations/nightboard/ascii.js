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
   * Cold-start banner. It is theatre, but it is honest theatre: every line is a
   * fact the board can actually state, and it is drawn once rather than looped.
   */
  function banner(board, toolCount, host) {
    return [
      "┌" + "─".repeat(58) + "┐",
      "│ " + pad("EPOCH TERMINAL  ·  " + board.name, 56) + " │",
      "│ " + pad(board.node + "  ·  epoch " + board.epoch + "  " +
        gauge(board.landed, board.total, 10) + "  ships " + board.ships, 56) + " │",
      "│ " + pad(toolCount + " tools registered via " + host, 56) + " │",
      "└" + "─".repeat(58) + "┘",
    ].join("\n");
  }

  function pad(s, n) {
    var str = String(s);
    return str.length >= n ? str.slice(0, n) : str + " ".repeat(n - str.length);
  }

  window.NB_ASCII = {
    sparkline: sparkline,
    gauge: gauge,
    sigil: sigil,
    rule: rule,
    branch: branch,
    banner: banner,
    BLOCKS: BLOCKS,
    SHADES: SHADES,
  };
})();
