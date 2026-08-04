/**
 * Generative UI, streamed.
 *
 * OpenUI Lang (thesysdev/openui) is a streaming-first DSL: the model emits it
 * token by token and the parser yields a usable tree at every chunk, with
 * `partial` marking the element still being written. That is what makes this
 * feel generative rather than like waiting for a blob of JSON.
 *
 * The component library is the Nightboard contract, so a model can only compose
 * elements every theme already knows how to style. It cannot invent a widget
 * that no theme can render, which is the thing that would quietly break the
 * garden.
 *
 * Rendering goes through the same semantic hooks as the rest of the board — a
 * generated Post is a `[data-c="post"]`, not a special case — so generated views
 * are themed for free and are indistinguishable from authored ones.
 */
(function () {
  "use strict";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  };

  function ready() {
    return typeof window.OpenUILang !== "undefined" && typeof window.NB_OPENUI !== "undefined";
  }

  /* ── Rendering the AST into the contract's own markup ──────────────────── */

  function renderNode(node) {
    if (!node || node.type !== "element") return "";
    var p = node.props || {};
    var partial = node.partial ? ' data-state="pending"' : "";
    switch (node.typeName) {
      case "Panel":
        return (
          '<section data-c="panel"' + partial + ">" +
          '<div class="nb-group-label">' + esc(p.title || "…") + "</div>" +
          (Array.isArray(p.children) ? p.children.map(renderNode).join("") : "") +
          "</section>"
        );
      case "Post":
        return (
          '<article data-c="post" data-kind="' + esc(p.kind || "person") + '"' +
          ' data-state="' + esc(node.partial ? "pending" : p.state || "open") + '">' +
          '<span data-c="control"><span data-c="key">··</span></span>' +
          '<div class="nb-post-body">' +
          '<span data-c="actor"><b data-c="handle">' + esc(p.who || "…") + "</b>" +
          '<span data-c="role">' + esc(p.role || "") + "</span></span> " +
          '<span data-c="meta"><time data-c="time">' + esc(p.at || "") + "</time>" +
          '<span data-c="state">' + esc(p.state || "") + "</span></span>" +
          (p.subject ? '<b data-c="subject">' + esc(p.subject) + "</b>" : "") +
          '<p data-c="body">' + esc(p.body || "") + "</p>" +
          (p.anchor ? '<span data-c="anchor">&gt; ' + esc(p.anchor) + "</span>" : "") +
          // The contract requires an agent to name its supervisor. If a model
          // omits it, the omission is shown rather than hidden — a missing
          // accountability line is exactly the thing not to paper over.
          (p.kind === "agent"
            ? '<span data-c="receipt"><span data-c="mark" aria-hidden="true">◆</span>' +
              (p.supervisor
                ? "supervised by @" + esc(p.supervisor) + " · human review required"
                : "supervisor not stated") +
              "</span>"
            : "") +
          "</div></article>"
        );
      case "Notice":
        return (
          '<div data-c="notice" data-state="pending" role="status">' +
          '<span data-c="count">' + esc(p.count) + "</span> " +
          '<span data-c="label">' + esc(p.label || "") + "</span></div>"
        );
      case "Channel":
        return (
          '<div data-c="channel" data-kind="' + esc(p.kind || "social") + '">' +
          '<span data-c="sigil" aria-hidden="true">#</span>' +
          '<span data-c="label">' + esc(p.label || "") + "</span>" +
          '<span data-c="count">' + esc(p.count == null ? "" : p.count) + "</span></div>"
        );
      case "Fact":
        return (
          '<div data-c="fact"><dt>' + esc(p.label || "") + "</dt>" +
          "<dd>" + esc(p.value || "") + "</dd></div>"
        );
      default:
        return "";
    }
  }

  function paint(result) {
    var out = $("[data-gen-ui-out]");
    out.innerHTML = result && result.root ? renderNode(result.root) : "";
  }

  /* ── Streaming ─────────────────────────────────────────────────────────── */

  function status(msg, kind) {
    var el = $("[data-gen-ui-status]");
    el.textContent = msg;
    el.dataset.state = kind || "";
  }

  async function run(description) {
    if (!ready()) {
      status("The OpenUI parser did not load. Run build-openui.mjs to regenerate it.", "rejected");
      return;
    }
    if (typeof LanguageModel === "undefined") {
      status(
        "On-device generation is unavailable in this browser.\n\n" +
        "The OpenUI Lang system prompt is still available below — paste it into " +
        "any model, and paste its openui-lang output into the box to render it here.",
        "unavailable"
      );
      return;
    }

    var session;
    var parser = window.OpenUILang.createStreamingParser(window.NB_OPENUI.schema, "Panel");
    try {
      status("Composing…", "busy");
      session = await LanguageModel.create({
        initialPrompts: [{ role: "system", content: window.NB_OPENUI.systemPrompt }],
        monitor: function (m) {
          m.addEventListener("downloadprogress", function (e) {
            status("Fetching the on-device model — " + Math.round(e.loaded * 100) + "%", "busy");
          });
        },
      });

      var stream = session.promptStreaming(description);
      var raw = "";
      for await (var chunk of stream) {
        raw += chunk;
        // A tree at every chunk: this is why the DSL is streaming-first.
        paint(parser.push(chunk));
      }
      $("[data-gen-ui-source]").value = raw;
      status("Composed. The source is below; it renders through the same hooks every theme styles.", "ok");
    } catch (err) {
      status("Generation failed: " + (err && err.message ? err.message : String(err)), "rejected");
    } finally {
      if (session && session.destroy) session.destroy();
    }
  }

  /** Render pasted openui-lang, so the panel is useful without an on-device model. */
  function renderSource() {
    if (!ready()) { status("The OpenUI parser did not load.", "rejected"); return; }
    var src = $("[data-gen-ui-source]").value.trim();
    if (!src) { status("Paste openui-lang source first.", "rejected"); return; }
    try {
      var parser = window.OpenUILang.createStreamingParser(window.NB_OPENUI.schema, "Panel");
      var result = parser.push(src);
      if (!result || !result.root) { status("That did not parse as openui-lang.", "rejected"); return; }
      paint(result);
      status("Rendered.", "ok");
    } catch (err) {
      status("Parse failed: " + (err && err.message ? err.message : String(err)), "rejected");
    }
  }

  function wire() {
    $("[data-gen-ui-run]").addEventListener("click", function () {
      var v = $("[data-gen-ui-input]").value.trim();
      if (!v) { status("Describe the view you want.", "rejected"); return; }
      run(v);
    });
    $("[data-gen-ui-render]").addEventListener("click", renderSource);
    $("[data-gen-ui-prompt]").addEventListener("click", function () {
      if (!ready()) { status("The OpenUI parser did not load.", "rejected"); return; }
      var text = window.NB_OPENUI.systemPrompt;
      navigator.clipboard.writeText(text).then(
        function () { status("System prompt copied. Paste openui-lang back into the source box.", "ok"); },
        function () { $("[data-gen-ui-source]").value = text; status("Clipboard unavailable — prompt placed in the source box.", "ok"); }
      );
    });

    var note = $("[data-gen-ui-availability]");
    if (!ready()) {
      note.textContent = "OpenUI parser not loaded — run build-openui.mjs.";
      note.dataset.state = "snapshot";
    } else {
      note.textContent =
        "OpenUI Lang ready · " + Object.keys(window.NB_OPENUI.schema.properties || {}).length +
        " components, streamed and parsed in the page.";
      note.dataset.state = "live";
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  else wire();
})();
