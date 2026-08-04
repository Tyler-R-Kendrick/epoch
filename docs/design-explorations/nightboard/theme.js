/**
 * The garden: theme switching, manual token editing, and on-device generation.
 *
 * Generation uses Chrome's built-in Prompt API (`LanguageModel`), which runs the
 * model on the device — no key, no server, nothing leaves the page. When it is
 * not available the panel says exactly why and the manual editor reaches the
 * same surface, because a feature that silently does nothing is worse than one
 * that is honestly absent.
 *
 * The model is constrained by a JSON schema to emit token values only. It cannot
 * return markup, a script, or a URL even if asked to, so a generated theme
 * cannot break the contract or the page's CSP. Values are then validated again
 * here: trusting a schema you did not enforce is not a safety measure.
 */
(function () {
  "use strict";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var styleEl = document.createElement("style");
  document.head.appendChild(styleEl);
  var current = 0;

  /* Token names a theme may set. Anything else is discarded. */
  var TOKENS = [
    "--nb-bg", "--nb-surface", "--nb-ink", "--nb-ink-dim", "--nb-ink-faint", "--nb-rule",
    "--nb-accent", "--nb-accent-ink", "--nb-signed", "--nb-live", "--nb-warn", "--nb-danger",
    "--nb-agent", "--nb-glow", "--nb-scan", "--nb-cell", "--nb-line", "--nb-radius", "--nb-pad",
  ];
  var COLOR_TOKENS = TOKENS.slice(0, 13);

  var HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
  var LENGTH = /^-?(?:\d+(?:\.\d+)?)(?:rem|em|px|%)?$/;

  /** Relative luminance, for the contrast floor a theme must clear. */
  function lum(hex) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h.split("").map(function (c) { return c + c; }).join("");
    var v = [0, 2, 4].map(function (i) {
      var c = parseInt(h.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }
  function contrast(a, b) {
    var l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  /**
   * Accept only what the contract allows. A generated theme is untrusted input
   * like any other: the schema shapes it, this decides whether it may apply.
   */
  function sanitize(tokens) {
    var out = {};
    var rejected = [];
    Object.keys(tokens || {}).forEach(function (k) {
      var key = k.startsWith("--") ? k : "--" + k;
      if (TOKENS.indexOf(key) === -1) { rejected.push(k + " (not in contract)"); return; }
      var v = String(tokens[k]).trim();
      if (/url\(|@import|expression|javascript:|<|>|;|\{|\}/i.test(v)) {
        rejected.push(k + " (disallowed value)");
        return;
      }
      if (COLOR_TOKENS.indexOf(key) !== -1 && !HEX.test(v)) { rejected.push(k + " (not a hex colour)"); return; }
      if ((key === "--nb-cell" || key === "--nb-line" || key === "--nb-radius" || key === "--nb-pad") && !LENGTH.test(v)) {
        rejected.push(k + " (not a length)");
        return;
      }
      if (v.length > 120) { rejected.push(k + " (too long)"); return; }
      out[key] = v;
    });
    return { tokens: out, rejected: rejected };
  }

  function apply(css, label) {
    styleEl.textContent = css;
    document.body.dataset.theme = label;
    $("[data-theme-name]").textContent = label;
  }

  function applyTokens(tokens, label) {
    var css = ":root{" + Object.keys(tokens).map(function (k) { return k + ":" + tokens[k]; }).join(";") + "}";
    apply(css, label);
  }

  function setTheme(i) {
    current = (i + window.NB_THEMES.length) % window.NB_THEMES.length;
    var t = window.NB_THEMES[current];
    apply(t.css, t.name);
    $("[data-theme-note]").textContent = t.note;
    var sel = $("[data-theme-select]");
    if (sel) sel.value = t.id;
  }

  /* ── Generation ────────────────────────────────────────────────────────── */

  var SCHEMA = {
    type: "object",
    additionalProperties: false,
    required: COLOR_TOKENS.map(function (t) { return t.replace("--nb-", ""); }),
    properties: COLOR_TOKENS.reduce(function (acc, t) {
      acc[t.replace("--nb-", "")] = { type: "string", pattern: "^#[0-9a-fA-F]{6}$" };
      return acc;
    }, {
      glow: { type: "string", maxLength: 60 },
      cell: { type: "string", maxLength: 12 },
      line: { type: "string", maxLength: 6 },
    }),
  };

  function briefFor(description) {
    return [
      "You are theming a terminal bulletin board for a software community.",
      "It is a character-grid interface: monospaced, dense, keyboard-operated.",
      "",
      "Return colours for these roles:",
      "bg (page), surface (panels), ink (default text), ink-dim, ink-faint,",
      "rule (hairlines), accent (the one reserved colour, used only for the path",
      "from conversation to signed work, and for focus), accent-ink (text on",
      "accent), signed (verification marks), live (healthy), warn (stale),",
      "danger (destructive), agent (automated participants).",
      "",
      "Hard requirements:",
      "- ink on bg must reach at least 7:1 contrast; ink-dim on bg at least 4.5:1.",
      "- accent must be clearly distinct from signed, live, warn and danger.",
      "- Keep it coherent: this is one world, not a palette of unrelated hues.",
      "",
      "Theme to create: " + description,
    ].join("\n");
  }

  async function availability() {
    if (typeof LanguageModel === "undefined") return "absent";
    try {
      return await LanguageModel.availability({
        expectedInputs: [{ type: "text", languages: ["en"] }],
        expectedOutputs: [{ type: "text", languages: ["en"] }],
      });
    } catch {
      // A browser that has the global but rejects the query is, for our
      // purposes, a browser without it.
      return "absent";
    }
  }

  async function generate(description, report) {
    var state = await availability();
    if (state === "absent" || state === "unavailable") {
      report(
        "On-device generation is not available in this browser.\n\n" +
        "It needs Chrome's built-in Prompt API (the LanguageModel global), which " +
        "runs the model locally — no key and no server. Everything below still " +
        "works: edit the tokens by hand, or use Export prompt with any external " +
        "tool and paste the result back.",
        "unavailable"
      );
      return null;
    }

    var session;
    try {
      report(
        state === "available"
          ? "Thinking…"
          : "Fetching the on-device model. This happens once and can take a few minutes.",
        "busy"
      );
      session = await LanguageModel.create({
        monitor: function (m) {
          m.addEventListener("downloadprogress", function (e) {
            report("Downloading the on-device model — " + Math.round(e.loaded * 100) + "%", "busy");
          });
        },
        initialPrompts: [{
          role: "system",
          content: "You return only theme colours as JSON. You never return CSS, markup, scripts or URLs.",
        }],
      });
      var raw = await session.prompt(briefFor(description), { responseConstraint: SCHEMA });
      var parsed = JSON.parse(raw);
      var result = sanitize(parsed);
      var tokens = result.tokens;

      // The model is asked for contrast; whether it delivered is measured here.
      var notes = [];
      if (tokens["--nb-ink"] && tokens["--nb-bg"]) {
        var c = contrast(tokens["--nb-ink"], tokens["--nb-bg"]);
        if (c < 4.5) notes.push("ink on bg is only " + c.toFixed(1) + ":1 — below the 4.5:1 floor, so this theme is not accepted");
      }
      if (notes.length) { report(notes.join("\n"), "rejected"); return null; }
      if (result.rejected.length) notes.push("discarded: " + result.rejected.join(", "));

      applyTokens(tokens, description.slice(0, 40));
      $("[data-theme-note]").textContent = "Generated on-device from: " + description;
      $("[data-token-editor]").value = Object.keys(tokens)
        .map(function (k) { return k + ": " + tokens[k] + ";"; }).join("\n");
      report("Applied." + (notes.length ? "\n" + notes.join("\n") : ""), "ok");
      return tokens;
    } catch (err) {
      report("Generation failed: " + (err && err.message ? err.message : String(err)), "rejected");
      return null;
    } finally {
      if (session && session.destroy) session.destroy();
    }
  }

  /* ── Panel ─────────────────────────────────────────────────────────────── */

  function report(msg, kind) {
    var el = $("[data-gen-status]");
    el.textContent = msg;
    el.dataset.state = kind || "";
  }

  function openPanel() {
    $("[data-garden]").hidden = false;
    var input = $("[data-gen-input]");
    if (input) input.focus();
  }

  function wire() {
    var sel = $("[data-theme-select]");
    window.NB_THEMES.forEach(function (t, i) {
      var o = document.createElement("option");
      o.value = t.id; o.textContent = t.name; sel.appendChild(o);
      void i;
    });
    sel.addEventListener("change", function () {
      for (var i = 0; i < window.NB_THEMES.length; i++) {
        if (window.NB_THEMES[i].id === sel.value) setTheme(i);
      }
    });

    $("[data-garden-open]").addEventListener("click", openPanel);
    $("[data-garden-close]").addEventListener("click", function () { $("[data-garden]").hidden = true; });

    $("[data-gen-run]").addEventListener("click", function () {
      var v = $("[data-gen-input]").value.trim();
      if (!v) { report("Describe the theme you want first.", "rejected"); return; }
      generate(v, report);
    });

    $("[data-token-apply]").addEventListener("click", function () {
      var text = $("[data-token-editor]").value;
      var tokens = {};
      text.split(/[\n;]/).forEach(function (line) {
        var m = /^\s*(--[a-z-]+)\s*:\s*(.+?)\s*$/i.exec(line);
        if (m) tokens[m[1]] = m[2];
      });
      var result = sanitize(tokens);
      if (Object.keys(result.tokens).length === 0) {
        report("Nothing applied. Use `--nb-bg: #001100;` per line.", "rejected");
        return;
      }
      applyTokens(result.tokens, "custom");
      $("[data-theme-note]").textContent = "Hand-edited tokens.";
      // A generated theme is refused below the floor because nobody chose it.
      // A hand-edited one is warned about, because someone did — but silently
      // applying an unreadable theme would still be a trap.
      var warn = [];
      var bg = result.tokens["--nb-bg"] || getComputedStyle(document.body).getPropertyValue("--nb-bg").trim();
      var ink = result.tokens["--nb-ink"];
      if (ink && HEX.test(bg)) {
        var ratio = contrast(ink, bg);
        if (ratio < 4.5) warn.push("ink on bg is " + ratio.toFixed(1) + ":1, below the 4.5:1 floor — this is hard to read");
      }
      report("Applied " + Object.keys(result.tokens).length + " tokens." +
        (result.rejected.length ? "\ndiscarded: " + result.rejected.join(", ") : "") +
        (warn.length ? "\nwarning: " + warn.join("; ") : ""),
        warn.length ? "rejected" : "ok");
    });

    $("[data-token-load]").addEventListener("click", function () {
      var t = window.NB_THEMES[current];
      var m = /:root\{([\s\S]*?)\}/.exec(t.css);
      $("[data-token-editor]").value = m
        ? m[1].split(";").map(function (s) { return s.trim(); }).filter(Boolean).join(";\n") + ";"
        : "";
      report("Loaded " + t.name + " into the editor.", "ok");
    });

    $("[data-export-prompt]").addEventListener("click", function () {
      var text = briefFor("<describe your theme here>") +
        "\n\nReturn a block of CSS custom properties only, like:\n" +
        TOKENS.slice(0, 6).map(function (t) { return t + ": #000000;"; }).join("\n");
      navigator.clipboard.writeText(text).then(
        function () { report("Prompt copied. Paste it into any external tool, then paste its tokens below.", "ok"); },
        function () { $("[data-token-editor]").value = text; report("Clipboard unavailable — prompt placed in the editor instead.", "ok"); }
      );
    });

    // The API reports four states, not three. "downloadable" means the model is
    // supported but not yet on the device — reporting that as unavailable told
    // people the feature was missing when it was one download away.
    availability().then(function (s) {
      var note = $("[data-gen-availability]");
      var text = {
        available: "On-device model ready.",
        downloading: "On-device model is downloading — generation will wait for it.",
        downloadable: "Supported here, but the model is not on this device yet. Generating fetches it once, which can take a few minutes.",
      }[s] || "On-device generation is unavailable in this browser. Manual editing and Export prompt still work.";
      note.textContent = text;
      note.dataset.state = s === "available" ? "live" : "snapshot";
    });
  }

  function boot() {
    wire();
    setTheme(0);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.NB_THEME = {
    cycle: function () { setTheme(current + 1); },
    openPanel: openPanel,
  };
})();
