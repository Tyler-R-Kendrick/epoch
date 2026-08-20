/**
 * Prompt → proposal → diff → accept, for your own interface.
 *
 * Generation on its own produces a view that vanishes on reload and cannot be
 * undone. This is the part that makes it a change: whatever the model composed
 * becomes a revision on a proposal view of the `.epoch` project, with the
 * prompt's digest, the model that wrote it, and the parse result recorded
 * beside it. You see the semantic diff — what moved, what appeared, which
 * tokens changed — before anything applies, and accepting it is a click, which
 * is the confirmation an agent asking for the same command cannot supply.
 *
 * The generated document is data throughout. It is parsed against the pinned
 * component library, carried in a placement's props, and rendered by the
 * harness; it never becomes markup the page trusts or code the page runs.
 */
(function () {
  "use strict";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var PROPOSAL_VIEW = "compose";

  function panel() { return $("[data-compose]"); }

  function open(state) {
    var host = panel();
    if (!host) return;
    host.hidden = !state;
    host.setAttribute("data-open", state ? "true" : "false");
    if (state) {
      var input = $("[data-gen-ui-input]");
      if (input) input.focus();
    }
  }

  function workspace() {
    return window.CW_WORKSPACE && window.CW_WORKSPACE.runtime() ? window.CW_WORKSPACE : null;
  }

  function say(message, state) {
    var status = $("[data-gen-ui-status]");
    if (!status) return;
    status.textContent = message;
    status.dataset.state = state || "";
  }

  /** Tokens the person (or the model) currently has in the editor. */
  function editedTokens() {
    var editor = $("[data-token-editor]");
    if (!editor || !editor.value.trim()) return {};
    var tokens = {};
    editor.value.split(/[\n;]+/).forEach(function (line) {
      var at = line.indexOf(":");
      if (at < 0) return;
      var key = line.slice(0, at).trim();
      var value = line.slice(at + 1).trim();
      if (!key || !value) return;
      tokens[key.startsWith("--") ? key : "--" + key] = value;
    });
    return window.CW_THEME && globalThis.CW_VALUE.isFunction(window.CW_THEME.sanitize)
      ? window.CW_THEME.sanitize(tokens).tokens
      : tokens;
  }

  /**
   * Turn what was composed into a manifest.
   *
   * The generated document travels as the props of one allowlisted component.
   * That keeps the manifest declarative — a placement and a theme patch — while
   * the document itself stays subject to the OpenUI library it was parsed
   * against, rather than becoming a second, unchecked vocabulary.
   */
  function manifestFrom(base, source, tokens) {
    var placements = base.placements.filter(function (placement) {
      return placement.component !== "GeneratedPanel";
    }).slice();

    if (source) {
      placements.push({
        slot: "board.context-panel",
        component: "GeneratedPanel",
        props: { source: source },
      });
    }

    var theme = {};
    Object.keys(base.theme || {}).forEach(function (key) { theme[key] = base.theme[key]; });
    Object.keys(tokens || {}).forEach(function (key) { theme[key] = tokens[key]; });

    return { abiVersion: base.abiVersion, scope: base.scope, placements: placements, theme: theme };
  }

  function renderDiff(diff) {
    var host = $("[data-compose-diff]");
    if (!host) return;
    host.textContent = "";
    host.hidden = false;
    var groups = [
      ["Layout", diff.layout],
      ["Widgets", diff.widgets],
      ["Theme", diff.theme],
      ["Actions", diff.actions],
    ];
    if (diff.empty) {
      host.appendChild(text("p", "Nothing changes — this proposal matches what you already have."));
      return;
    }
    groups.forEach(function (group) {
      if (!group[1].length) return;
      host.appendChild(text("h3", group[0]));
      var list = document.createElement("ul");
      group[1].forEach(function (entry) { list.appendChild(text("li", entry)); });
      host.appendChild(list);
    });
  }

  function text(tag, value) {
    var node = document.createElement(tag);
    node.textContent = value;
    return node;
  }

  function receipt(message) {
    var host = $("[data-compose-receipt]");
    if (!host) return;
    host.hidden = false;
    host.textContent = message;
  }

  /** Record what was composed as a proposal, and show what it would do. */
  async function propose() {
    var ws = workspace();
    if (!ws) { say("The Epoch workspace is unavailable, so nothing can be proposed.", "rejected"); return null; }

    var source = ($("[data-gen-ui-source]") || {}).value || "";
    source = source.trim();
    var tokens = editedTokens();
    if (!source && !Object.keys(tokens).length) {
      say("Generate or paste something first, or edit a token.", "rejected");
      return null;
    }

    if (source && window.CW_GENERATE && globalThis.CW_VALUE.isFunction(window.CW_GENERATE.parse)) {
      var parsed = window.CW_GENERATE.parse(source);
      if (!parsed) {
        say("That is not openui-lang the pinned library recognises, so it will not be proposed.", "rejected");
        return null;
      }
    }

    var runtime = ws.runtime();
    var base = runtime.workspace.head(runtime.workspace.activeView()).manifest;
    var manifest = manifestFrom(base, source, tokens);
    var prompt = ($("[data-gen-ui-input]") || {}).value || "";

    try {
      if (!runtime.workspace.listViews().some(function (view) { return view.name === PROPOSAL_VIEW; })) {
        await ws.execute("view.create", { name: PROPOSAL_VIEW, scope: "personal" });
      }
      var proposed = await ws.execute("ui.propose", {
        view: PROPOSAL_VIEW,
        manifest: manifest,
        prompt: prompt,
        model: modelLabel(),
      });

      if (proposed.validation.state === "invalid") {
        say("Recorded, but it cannot be applied: " + proposed.validation.errors.join("; "), "rejected");
        receipt(proposed.commandId + " · recorded and inspectable · not applicable");
        toggleDecision(false);
        return proposed;
      }

      var diff = await ws.execute("ui.semanticDiff", { from: PROPOSAL_VIEW });
      renderDiff(diff.data);
      receipt(proposed.commandId + " · " + proposed.proposalRef + " · nothing applied yet");
      say("Proposed. Read the diff, then accept or discard.", "ok");
      toggleDecision(true);
      return proposed;
    } catch (error) {
      say("Could not propose: " + ((error && error.message) || String(error)), "rejected");
      return null;
    }
  }

  function modelLabel() {
    return globalThis.CW_VALUE.isUndefined(window.LanguageModel) ? "pasted-or-edited" : "on-device";
  }

  function toggleDecision(show) {
    var accept = $("[data-compose-accept]");
    var discard = $("[data-compose-discard]");
    if (accept) accept.hidden = !show;
    if (discard) discard.hidden = !show;
  }

  /** Accepting is a click. That is the whole difference from an agent asking. */
  async function accept() {
    var ws = workspace();
    if (!ws) return null;
    try {
      var merged = await ws.execute("change.merge", { from: PROPOSAL_VIEW }, { confirmed: true });
      receipt(merged.commandId + " · merged into " + merged.baseRef + " · roll back from the workspace region");
      say("Applied. It is a revision now, so you can roll it back.", "ok");
      toggleDecision(false);
      return merged;
    } catch (error) {
      say("Could not apply: " + ((error && error.message) || String(error)), "rejected");
      return null;
    }
  }

  /**
   * Discarding leaves the proposal in the ledger. "I decided against this" is
   * part of the history of an interface, not something to erase.
   */
  function discard() {
    toggleDecision(false);
    var diff = $("[data-compose-diff]");
    if (diff) diff.hidden = true;
    say("Discarded. The proposal stays in your history; nothing was applied.", "");
  }

  function wire() {
    if (!panel()) return;
    var opener = $("[data-compose-open]");
    if (opener) opener.addEventListener("click", function () { open(true); });
    var close = $("[data-compose-close]");
    if (close) close.addEventListener("click", function () { open(false); });
    var proposeButton = $("[data-compose-propose]");
    if (proposeButton) proposeButton.addEventListener("click", function () { void propose(); });
    var acceptButton = $("[data-compose-accept]");
    if (acceptButton) acceptButton.addEventListener("click", function () { void accept(); });
    var discardButton = $("[data-compose-discard]");
    if (discardButton) discardButton.addEventListener("click", discard);

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && panel() && panel().getAttribute("data-open") === "true") {
        open(false);
      }
    });
  }

  window.CW_COMPOSE = {
    open: open,
    propose: propose,
    accept: accept,
    discard: discard,
    manifestFrom: manifestFrom,
    view: PROPOSAL_VIEW,
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  else wire();
})();
