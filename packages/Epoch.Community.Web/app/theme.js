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
  var abortController = null;

  /* Token names a theme may set. Anything else is discarded. */
  var TOKENS = [
    "--cw-bg", "--cw-surface", "--cw-ink", "--cw-ink-dim", "--cw-ink-faint", "--cw-rule",
    "--cw-accent", "--cw-accent-ink", "--cw-signed", "--cw-live", "--cw-warn", "--cw-danger",
    "--cw-agent", "--cw-glow", "--cw-scan", "--cw-cell", "--cw-line", "--cw-radius", "--cw-pad",
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
      if ((key === "--cw-cell" || key === "--cw-line" || key === "--cw-radius" || key === "--cw-pad") && !LENGTH.test(v)) {
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
    var nameEl = $("[data-theme-name]");
    if (nameEl) nameEl.textContent = label;
  }

  function applyTokens(tokens, label) {
    var css = ":root{" + Object.keys(tokens).map(function (k) { return k + ":" + tokens[k]; }).join(";") + "}";
    apply(css, label);
  }

  function setTheme(i) {
    current = (i + window.CW_THEMES.length) % window.CW_THEMES.length;
    var t = window.CW_THEMES[current];
    apply(t.css, t.name);
    var noteEl = $("[data-theme-note]");
    if (noteEl) noteEl.textContent = t.note;
  }

  /* ── Generation ────────────────────────────────────────────────────────── */

  var TOKEN_OF = {
    bg: "--cw-bg", surface: "--cw-surface", ink: "--cw-ink", inkDim: "--cw-ink-dim",
    inkFaint: "--cw-ink-faint", rule: "--cw-rule", accent: "--cw-accent",
    accentInk: "--cw-accent-ink", signed: "--cw-signed", live: "--cw-live",
    warn: "--cw-warn", danger: "--cw-danger", agent: "--cw-agent",
    glow: "--cw-glow", scan: "--cw-scan",
  };

  /** Current computed value, so a partial theme layers on what is already there. */
  function currentToken(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function fromThemeNode(props) {
    var tokens = {};
    Object.keys(TOKEN_OF).forEach(function (key) {
      var v = props[key];
      if (typeof v === "string" && v.trim() !== "") tokens[TOKEN_OF[key]] = v.trim();
    });
    return sanitize(tokens).tokens;
  }

  /**
   * Generation, streamed through OpenUI Lang.
   *
   * The first version used one non-streaming call against a 13-field required
   * schema. A small on-device model frequently cannot satisfy that, so it
   * returned nothing usable and the panel sat there looking idle — which is
   * what "I told it to make everything blue and nothing happened" was.
   *
   * Now every field is optional, partial results apply as they arrive, and the
   * theme layers over the current one instead of replacing it wholesale.
   */
  async function generate(description, report) {
    var R = window.CWResilient;
    if (!R) { report("The resilience layer did not load.", "rejected"); return null; }
    if (typeof window.OpenUILang === "undefined" || typeof window.CW_OPENUI === "undefined") {
      report("The OpenUI parser did not load. Run build-openui.mjs.", "rejected");
      return null;
    }

    var state = await R.availability();
    if (state === "absent" || state === "unavailable") {
      report(
        "On-device generation is not available in this browser.\n\n" +
        "It needs Chrome's built-in Prompt API (the LanguageModel global). " +
        "Everything else still works: edit tokens by hand below, or use " +
        "Copy system prompt with any external model and paste its openui-lang " +
        "into the source box.",
        "unavailable"
      );
      return null;
    }

    if (abortController) abortController.abort();
    abortController = new AbortController();
    var signal = abortController.signal;
    var cancelHost = $("[data-gen-cancel]");
    if (cancelHost) cancelHost.hidden = false;

    var session = null;
    var applied = null;
    try {
      var result = await R.withRetry(async function () {
        report(state === "available" ? "Opening a session…" : "Preparing the on-device model…", "busy");
        session = await R.openSession({
          report: report,
          signal: signal,
          initialPrompts: [{ role: "system", content: window.CW_OPENUI.systemPrompt }],
        });

        var parser = window.OpenUILang.createStreamingParser(window.CW_OPENUI.schema, "Theme");
        var seen = 0;
        report("Composing the theme…", "busy");

        var raw = await R.streamPrompt(session, "Create a theme: " + description, {
          report: report,
          signal: signal,
          onChunk: function (acc, delta) {
            var tree;
            // The streaming parser wants the next chunk, not the transcript.
            try { tree = parser.push(delta); } catch { return; }
            if (!tree || !tree.root || tree.root.typeName !== "Theme") return;
            var tokens = fromThemeNode(tree.root.props || {});
            var count = Object.keys(tokens).length;
            if (count > seen) {
              // Apply as it streams: this is the part that makes it feel live,
              // and it means a truncated answer still produces a usable theme.
              seen = count;
              applyTokens(tokens, tree.root.props.name || description.slice(0, 32));
              report("Streaming — " + count + " of 15 colours applied…", "busy");
            }
          },
        });
        if (seen === 0) {
          var e = new Error("the model returned no usable Theme");
          e.raw = raw;
          throw e;
        }
        return { raw: raw, parser: parser };
      }, { tries: 3, report: report, signal: signal });

      var finalTree = result.parser.push("");
      applied = fromThemeNode((finalTree && finalTree.root && finalTree.root.props) || {});
      var rawHost = $("[data-gen-ui-source]");
      if (rawHost) rawHost.value = result.raw;
      var editorHost = $("[data-token-editor]");
      if (editorHost) {
        editorHost.value = Object.keys(applied)
          .map(function (k) { return k + ": " + applied[k] + ";"; }).join("\n");
      }

      // Contrast is checked against what is actually on screen, because a
      // partial theme inherits the rest from the theme underneath it.
      var bg = applied["--cw-bg"] || currentToken("--cw-bg");
      var ink = applied["--cw-ink"] || currentToken("--cw-ink");
      var notes = [];
      if (HEX.test(bg) && HEX.test(ink)) {
        var ratio = contrast(ink, bg);
        if (ratio < 4.5) {
          notes.push("ink on bg is " + ratio.toFixed(1) + ":1, below the 4.5:1 floor");
        }
      }
      var noteEl = $("[data-theme-note]");
      if (noteEl) noteEl.textContent = "Generated on device from: " + description;
      report(
        "Applied " + Object.keys(applied).length + " colours." +
        (notes.length ? "\nwarning: " + notes.join("; ") : "") +
        "\nUse Export to DESIGN.md to carry this into the design system.",
        notes.length ? "rejected" : "ok"
      );
      return applied;
    } catch (err) {
      if (err && err.name === "AbortError") { report("Cancelled.", ""); return null; }
      report(
        "Generation failed: " + ((err && err.message) || String(err)) +
        (err && err.raw ? "\n\nThe model said:\n" + String(err.raw).slice(0, 300) : "") +
        "\n\nThe manual editor below reaches the same surface.",
        "rejected"
      );
      return null;
    } finally {
      var cancel = $("[data-gen-cancel]");
      if (cancel) cancel.hidden = true;
      if (session && session.destroy) { try { session.destroy(); } catch { /* already gone */ } }
    }
  }

  /** Emit the live tokens as DESIGN.md frontmatter, so a theme can leave the page. */
  function designMd() {
    var names = Object.keys(TOKEN_OF).map(function (k) { return TOKEN_OF[k]; });
    var lines = names.map(function (n) {
      var v = currentToken(n);
      return "  " + n.replace("--cw-", "") + ': "' + v + '"';
    });
    return [
      "---",
      "name: " + (document.body.dataset.theme || "Community Web theme"),
      "colors:",
    ].concat(lines).concat(["---", ""]).join("\n");
  }

  /* ── Panel ─────────────────────────────────────────────────────────────── */

  function report(msg, kind) {
    var el = $("[data-gen-status]");
    if (!el) return;
    el.textContent = msg;
    el.dataset.state = kind || "";
  }

  function openPanel() {
    var host = $("[data-garden]");
    if (!host) return;
    host.hidden = false;
    host.setAttribute("data-open", "true");
    var input = $("[data-gen-input]");
    if (input) input.focus();
  }

  function wire() {
    var sel = $("[data-theme-select]");
    if (sel) {
      window.CW_THEMES.forEach(function (t, i) {
        var o = document.createElement("option");
        o.value = t.id; o.textContent = t.name; sel.appendChild(o);
        void i;
      });
      sel.addEventListener("change", function () {
        for (var i = 0; i < window.CW_THEMES.length; i++) {
          if (window.CW_THEMES[i].id === sel.value) setTheme(i);
        }
      });
    }

    // The garden lives inside the compose panel. A page without it still gets
    // the theme API; only the chrome is optional.
    if (!$("[data-garden]")) return;
    var opener = $("[data-garden-open]");
    if (opener) opener.addEventListener("click", openPanel);
    var closer = $("[data-garden-close]");
    if (closer) {
      closer.addEventListener("click", function () {
        $("[data-garden]").hidden = true;
        $("[data-garden]").setAttribute("data-open", "false");
      });
    }

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
        report("Nothing applied. Use `--cw-bg: #001100;` per line.", "rejected");
        return;
      }
      applyTokens(result.tokens, "custom");
      var noteEl = $("[data-theme-note]");
      if (noteEl) noteEl.textContent = "Hand-edited tokens.";
      // A generated theme is refused below the floor because nobody chose it.
      // A hand-edited one is warned about, because someone did — but silently
      // applying an unreadable theme would still be a trap.
      var warn = [];
      var bg = result.tokens["--cw-bg"] || getComputedStyle(document.body).getPropertyValue("--cw-bg").trim();
      var ink = result.tokens["--cw-ink"];
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
      var t = window.CW_THEMES[current];
      var m = /:root\{([\s\S]*?)\}/.exec(t.css);
      $("[data-token-editor]").value = m
        ? m[1].split(";").map(function (s) { return s.trim(); }).filter(Boolean).join(";\n") + ";"
        : "";
      report("Loaded " + t.name + " into the editor.", "ok");
    });

    $("[data-gen-cancel]").addEventListener("click", function () {
      if (abortController) abortController.abort();
    });

    $("[data-export-design]").addEventListener("click", function () {
      var text = designMd();
      navigator.clipboard.writeText(text).then(
        function () { report("DESIGN.md frontmatter copied — paste it into DESIGN.md and run tokens:generate.", "ok"); },
        function () { $("[data-token-editor]").value = text; report("Clipboard unavailable — frontmatter placed in the editor.", "ok"); }
      );
    });

    $("[data-export-prompt]").addEventListener("click", function () {
      // Hand out the same generated OpenUI Lang prompt the page uses, so an
      // external model is given identical instructions rather than a paraphrase.
      var text = (window.CW_OPENUI ? window.CW_OPENUI.systemPrompt + "\n\n" : "") +
        "Create a theme: <describe it here>\n" +
        "Reply with a single line: root = Theme(\"Name\", \"#bg\", \"#surface\", \"#ink\", …)";
      navigator.clipboard.writeText(text).then(
        function () { report("Prompt copied. Paste it into any external tool, then paste its tokens below.", "ok"); },
        function () {
          var editor = $("[data-token-editor]");
          if (editor) editor.value = text;
          report("Clipboard unavailable — prompt placed in the editor instead.", "ok");
        }
      );
    });

    // The API reports four states, not three. "downloadable" means the model is
    // supported but not yet on the device — reporting that as unavailable told
    // people the feature was missing when it was one download away.
    window.CWResilient.availability().then(function (s) {
      var note = $("[data-gen-availability]");
      var text = {
        available: "On-device model ready.",
        downloading: "On-device model is downloading — generation will wait for it.",
        downloadable: "Supported here, but the model is not on this device yet. Generating fetches it once, which can take a few minutes.",
      }[s] || "On-device generation is unavailable in this browser. Manual editing and Export prompt still work.";
      if (!note) return;
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

  window.CW_THEME = {
    cycle: function () { setTheme(current + 1); },
    openPanel: openPanel,
    // Exposed so the proposal path screens tokens with the same rules the
    // panel does. One sanitiser, or the strict one is the one that gets bypassed.
    sanitize: sanitize,
    generate: generate,
    designMd: designMd,
    tokens: TOKENS.slice(),
  };
})();
