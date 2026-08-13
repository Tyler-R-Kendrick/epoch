/**
 * The browser's Epoch workspace, and the interface it renders.
 *
 * Everything below this comment is the difference between a board that talks
 * about version control and a board that is a participant in it. On load the
 * page opens a real local workspace, ensures the `.epoch` project exists — the
 * project that owns the interface this browser renders, the way a `.github`
 * repository owns a profile — and renders the dynamic slots from that project's
 * head revision.
 *
 * The static half is this file and the markup it fills. It is what boots, what
 * verifies, and what shows recovery controls; the dynamic half can only place
 * allowlisted components into named slots and set allowlisted theme tokens. A
 * generated revision cannot reach the recovery path, register a tool, or run
 * code, because the vocabulary it is parsed into cannot express those things.
 *
 * When the head revision stops validating, the harness renders itself instead
 * and says why. A self-modifying interface that cannot refuse its own output is
 * not self-modifying, it is just breakable.
 */
(function () {
  "use strict";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ── The static harness ABI ──────────────────────────────────────────────
   * Slots are semantic regions of this board, never selectors: a generated
   * revision names "the context panel", not a DOM path it guessed.
   */
  var SLOTS = [
    { id: "shell.workspace-status", accepts: ["status"], maxComponents: 3 },
    { id: "board.context-panel", accepts: ["panel", "status"], maxComponents: 4 },
    { id: "board.recovery", accepts: ["recovery"], maxComponents: 1 },
  ];

  var COMPONENTS = [
    { id: "WorkspaceStatus", category: "status", actions: ["workspace.status"] },
    { id: "VerificationSummary", category: "status", actions: ["workspace.verify", "change.show"] },
    { id: "ProjectSummary", category: "panel", actions: ["project.list"] },
    { id: "ChangeLedger", category: "panel", actions: ["history.list", "change.show"] },
    { id: "LiveActivity", category: "panel", actions: [] },
    // The one component whose props carry a generated document. The document is
    // parsed against the pinned OpenUI library before it renders, so "the model
    // wrote this" never means "the page will run this".
    { id: "GeneratedPanel", category: "panel", actions: [] },
    { id: "RecoveryControls", category: "recovery", actions: ["ui.restoreLastKnownGood", "ui.enterSafeMode"] },
  ];

  /* Tokens a revision may set: the theme contract, and nothing else. */
  var THEME_TOKENS = [
    "--cw-bg", "--cw-surface", "--cw-ink", "--cw-ink-dim", "--cw-ink-faint", "--cw-rule",
    "--cw-accent", "--cw-accent-ink", "--cw-signed", "--cw-live", "--cw-warn", "--cw-danger",
    "--cw-agent", "--cw-glow", "--cw-scan", "--cw-cell", "--cw-line", "--cw-radius", "--cw-pad",
  ];

  var SAFE_MODE_MANIFEST = {
    abiVersion: 1,
    scope: "personal",
    placements: [
      { slot: "shell.workspace-status", component: "WorkspaceStatus", action: "workspace.status" },
      { slot: "board.recovery", component: "RecoveryControls", action: "ui.restoreLastKnownGood" },
    ],
    theme: {},
  };

  /* What a fresh workspace renders: status plus its own project, nothing loud. */
  var INITIAL_MANIFEST = {
    abiVersion: 1,
    scope: "personal",
    placements: [
      { slot: "shell.workspace-status", component: "WorkspaceStatus", action: "workspace.status" },
      { slot: "board.context-panel", component: "ProjectSummary", action: "project.list" },
      { slot: "board.recovery", component: "RecoveryControls", action: "ui.restoreLastKnownGood" },
    ],
    theme: {},
  };

  var runtime = null;
  var project = null;
  var themeStyle = null;
  var lastError = "";

  var identity = null;
  var storage = null;

  function sessionPrincipal() {
    try {
      if (window.CW_SESSION && typeof window.CW_SESSION.principal === "function") {
        var principal = window.CW_SESSION.principal();
        if (principal) return String(principal);
      }
    } catch { /* an unreadable session is an anonymous one */ }
    return null;
  }

  /**
   * Durable storage first, with the old localStorage workspace carried over.
   * Moving to better storage must never mean starting over, and a browser that
   * refuses IndexedDB gets an in-memory workspace that says so rather than a
   * silent one that loses the session.
   */
  async function openStorage() {
    if (!window.CW_RUNTIME || typeof window.CW_RUNTIME.openDurableStorage !== "function") return undefined;
    try {
      return await window.CW_RUNTIME.openDurableStorage({
        // Matches the key prefix BrowserEpoch writes ("epoch:<namespace>:") and
        // the identity record, so one namespace covers the whole workspace.
        namespace: "epoch:community-web",
        migrateFrom: localStorageAdapter(),
      });
    } catch (error) {
      lastError = (error && error.message) || String(error);
      return undefined;
    }
  }

  function localStorageAdapter() {
    try {
      if (typeof localStorage === "undefined") return undefined;
      return {
        get length() { return localStorage.length; },
        key: function (index) { return localStorage.key(index); },
        getItem: function (key) { return localStorage.getItem(key); },
        setItem: function (key, value) { localStorage.setItem(key, value); },
        removeItem: function (key) { localStorage.removeItem(key); },
      };
    } catch {
      return undefined;
    }
  }

  /** A device identity, so two browsers writing the same history are distinguishable. */
  async function resolveActor() {
    var claimed = sessionPrincipal();
    if (claimed) return claimed;
    if (!window.CW_RUNTIME || typeof window.CW_RUNTIME.resolveBrowserIdentity !== "function") return "browser";
    try {
      identity = await window.CW_RUNTIME.resolveBrowserIdentity({
        namespace: "epoch:community-web",
        storage: storage || localStorageAdapter() || { getItem: function () { return null; }, setItem: function () {} },
      });
      return identity.actor;
    } catch {
      return "browser";
    }
  }

  function boot(actorId) {
    if (!window.CW_RUNTIME || typeof window.CW_RUNTIME.createCommunityRuntime !== "function") {
      lastError = "runtime bundle missing";
      return null;
    }

    try {
      var harness = window.CW_RUNTIME.createStaticHarnessRelease({
        abiVersion: 1,
        slots: SLOTS,
        components: COMPONENTS,
        themeTokens: THEME_TOKENS,
        safeModeManifest: SAFE_MODE_MANIFEST,
      });
      runtime = window.CW_RUNTIME.createCommunityRuntime({
        namespace: "community-web",
        actor: actorId,
        ...(storage ? { storage: storage } : {}),
        harness: harness,
        // The workspace is this person's own browser. Capability attenuation
        // matters for agents and remotes, not for the owner of the tab.
        policies: { capabilities: ["*"] },
        defaultSource: "web",
        initialManifest: INITIAL_MANIFEST,
      });
      return runtime;
    } catch (error) {
      lastError = (error && error.message) || String(error);
      return null;
    }
  }

  /**
   * Open (or create, once) the project that owns this browser's interface. The
   * opening revision is the workspace's own first revision, so the project has
   * something known-good to fall back to from the moment it exists.
   */
  async function ensureProject() {
    var receipt = await runtime.commands.execute({ kind: "project.ensureDefault" });
    project = receipt.data;
    return project;
  }

  /* ── Rendering ───────────────────────────────────────────────────────────── */

  function slotHost(id) {
    return $('[data-cw-slot="' + id + '"]');
  }

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = String(text);
    return node;
  }

  function line(label, value) {
    var row = element("div", "cw-ws-line");
    row.appendChild(element("span", "cw-ws-key", label));
    row.appendChild(element("span", "cw-ws-value", value));
    return row;
  }

  var RENDERERS = {
    WorkspaceStatus: function () {
      var status = runtime.workspace.status();
      var node = element("div", "cw-ws-card");
      node.setAttribute("data-c", "workspace-status");
      node.appendChild(line("workspace", status.workspaceId));
      node.appendChild(line("view", status.activeView + " · r" + viewRevision(status.activeView)));
      node.appendChild(line("state", status.safeMode ? "safe mode" : status.state));
      node.appendChild(line("events", String(status.events)));
      return node;
    },
    VerificationSummary: function () {
      var status = runtime.workspace.status();
      var node = element("div", "cw-ws-card");
      node.setAttribute("data-c", "verification-summary");
      node.appendChild(line("harness", status.harnessVerified ? "verified " + status.harnessRelease : "FAILED " + status.harnessRelease));
      node.appendChild(line("last good", status.lastKnownGood
        ? status.lastKnownGood.view + " · r" + status.lastKnownGood.revision
        : "none yet"));
      return node;
    },
    ProjectSummary: function () {
      var node = element("div", "cw-ws-card");
      node.setAttribute("data-c", "project-summary");
      node.appendChild(line("project", project ? project.slug : "—"));
      node.appendChild(line("title", project ? project.title : "—"));
      node.appendChild(line("interface", project ? project.uiView : "—"));
      return node;
    },
    ChangeLedger: function () {
      var node = element("div", "cw-ws-card");
      node.setAttribute("data-c", "change-ledger");
      var view = runtime.workspace.activeView();
      var entries = runtime.workspace.history(view).slice(-5).reverse();
      if (!entries.length) return node.appendChild(line("history", "empty")), node;
      entries.forEach(function (entry) {
        node.appendChild(line("r" + entry.revision, entry.summary));
      });
      return node;
    },
    LiveActivity: function () {
      var node = element("div", "cw-ws-card");
      node.setAttribute("data-c", "live-activity");
      var unread = 0;
      try {
        if (window.CW_APP && typeof window.CW_APP.unreadCount === "function") unread = window.CW_APP.unreadCount();
      } catch { unread = 0; }
      node.appendChild(line("activity", unread ? unread + " unread" : "nothing new"));
      return node;
    },
    GeneratedPanel: function (placement) {
      var node = element("div", "cw-ws-card cw-ws-generated");
      node.setAttribute("data-c", "generated-panel");
      var source = (placement.props && placement.props.source) || "";
      var parsed = window.CW_GENERATE && typeof window.CW_GENERATE.parse === "function"
        ? window.CW_GENERATE.parse(source)
        : null;
      if (!parsed) {
        // A revision whose document no longer parses is shown as that, not as
        // a blank space that looks like nothing was ever there.
        node.appendChild(line("generated", "does not parse against the installed component library"));
        return node;
      }
      // Rendered by the library's own renderer, into the same semantic hooks
      // every theme styles — a generated panel is a panel, not a special case.
      node.innerHTML = window.CW_GENERATE.render(parsed.root);
      return node;
    },
    RecoveryControls: function () {
      var node = element("div", "cw-ws-card cw-ws-recovery");
      node.setAttribute("data-c", "recovery-controls");
      var rendered = runtime.workspace.materialize();
      if (rendered.reason) node.appendChild(line("reason", rendered.reason));

      // Clicking is the confirmation. An agent asking for the same command gets
      // a `confirm` receipt and nothing else, which is the difference between a
      // person deciding and a model deciding.
      node.appendChild(button("Restore last working interface", "ui.restoreLastKnownGood"));
      node.appendChild(button(rendered.safeMode ? "Leave safe mode" : "Enter safe mode",
        rendered.safeMode ? "ui.leaveSafeMode" : "ui.enterSafeMode"));
      return node;
    },
  };

  function button(label, kind) {
    var node = element("button", "cw-ws-action", label);
    node.type = "button";
    node.setAttribute("data-cw-command", kind);
    node.addEventListener("click", function () {
      execute(kind, {}, { confirmed: true }).catch(function () { /* notify() already said why */ });
    });
    return node;
  }

  function viewRevision(view) {
    try {
      var ledger = runtime.workspace.history(view);
      return ledger.length ? ledger[ledger.length - 1].revision : 0;
    } catch { return 0; }
  }

  function applyTheme(theme) {
    if (!themeStyle) {
      themeStyle = document.createElement("style");
      themeStyle.setAttribute("data-cw-harness-theme", "");
      document.head.appendChild(themeStyle);
    }
    var declarations = Object.keys(theme || {}).map(function (token) {
      return token + ":" + theme[token] + ";";
    }).join("");
    // Validation already rejected anything that is not an allowlisted token
    // with a value that cannot escape a declaration; this is the second check.
    themeStyle.textContent = declarations ? ":root{" + declarations + "}" : "";
  }

  function render() {
    if (!runtime) return;
    var rendered = runtime.workspace.materialize();
    var manifest = rendered.manifest;

    document.body.setAttribute("data-cw-safe-mode", rendered.safeMode ? "true" : "false");
    var region = $("[data-cw-harness]");
    if (region) region.setAttribute("data-safe-mode", rendered.safeMode ? "true" : "false");
    applyTheme(manifest.theme);

    $$("[data-cw-slot]").forEach(function (host) {
      host.textContent = "";
      host.hidden = true;
    });

    manifest.placements.forEach(function (placement) {
      var host = slotHost(placement.slot);
      var renderer = RENDERERS[placement.component];
      if (!host || !renderer) return;
      var node = renderer(placement);
      if (!node) return;
      node.setAttribute("data-cw-component", placement.component);
      if (placement.action) node.setAttribute("data-cw-action", placement.action);
      host.appendChild(node);
      host.hidden = false;
    });

    var notice = $("[data-cw-harness-notice]");
    if (notice) {
      notice.textContent = rendered.safeMode
        ? "Safe mode: rendering the installed harness. " + (rendered.reason || "")
        : "";
      notice.hidden = !rendered.safeMode;
    }
  }

  /* ── Public surface ──────────────────────────────────────────────────────── */

  async function execute(kind, input, options) {
    if (!runtime) throw new Error("Epoch workspace is unavailable: " + (lastError || "not booted"));
    try {
      var receipt = await runtime.commands.execute({
        kind: kind,
        input: input || {},
        source: (options && options.source) || "web",
        confirmed: !!(options && options.confirmed),
      });
      // A command is not done until it is on disk. Returning a receipt for a
      // write still sitting in a queue would make "it merged" a claim about
      // memory, and a reload a moment later would quietly disagree.
      if (storage) await storage.flush();
      render();
      emit("cw:workspace-changed", { receipt: receipt });
      return receipt;
    } catch (error) {
      // A refused command is an outcome to show, not a crash to swallow: the
      // person pressed something and deserves to be told why nothing happened.
      var message = (error && error.message) || String(error);
      render();
      notify(message);
      emit("cw:workspace-refused", { kind: kind, reason: message });
      throw error;
    }
  }

  function notify(message) {
    var notice = $("[data-cw-harness-notice]");
    if (!notice) return;
    notice.hidden = false;
    notice.textContent = message;
  }

  function emit(name, detail) {
    try {
      document.dispatchEvent(new CustomEvent(name, { detail: detail }));
    } catch { /* an old browser losing an event must not stop the board */ }
  }

  /**
   * Expose the workspace commands as WebMCP tools.
   *
   * These are the same commands the buttons and the CLI use, so an agent can do
   * exactly what a person can do and nothing more. Two properties are load
   * bearing: nothing is registered as confirmed, so a merge or a rollback comes
   * back as a `confirm` receipt an agent cannot satisfy on its own; and results
   * are the compact receipt summary rather than page content, so a tool call
   * returns identifiers to follow rather than text to be steered by.
   */
  function registerTools() {
    if (!runtime || !window.CW_MCP || !window.CW_RUNTIME) return [];
    if (typeof window.CW_RUNTIME.createWebMcpTools !== "function") return [];

    var registered = [];
    window.CW_RUNTIME.createWebMcpTools(runtime).forEach(function (tool) {
      window.CW_MCP.registerTool({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        readOnly: tool.annotations.readOnlyHint,
        untrusted: tool.annotations.untrustedContentHint,
        sideEffect: tool.annotations.readOnlyHint ? "read" : "local",
        execute: async function (args) {
          var summary = await tool.execute(args || {});
          render();
          return window.CW_MCP.text(summary);
        },
      });
      registered.push(tool.name);
    });
    return registered;
  }

  async function start() {
    storage = await openStorage();
    var actorId = await resolveActor();
    if (!boot(actorId)) {
      var notice = $("[data-cw-harness-notice]");
      if (notice) {
        notice.hidden = false;
        notice.textContent = "Epoch workspace unavailable: " + lastError + ". The board still works; history does not.";
      }
      emit("cw:workspace-failed", { reason: lastError });
      return null;
    }

    await ensureProject();
    render();
    var tools = registerTools();
    emit("cw:workspace-ready", {
      workspaceId: runtime.workspaceId,
      project: project,
      harnessRelease: runtime.harness.releaseId,
      tools: tools,
      storage: storage ? storage.kind : "memory",
      identity: identity,
    });
    return runtime;
  }

  window.CW_WORKSPACE = {
    start: start,
    execute: execute,
    render: render,
    runtime: function () { return runtime; },
    project: function () { return project; },
    status: function () { return runtime ? runtime.workspace.status() : { error: lastError || "not booted" }; },
    harness: function () { return runtime ? runtime.harness : null; },
    tools: function () {
      return runtime && window.CW_RUNTIME ? window.CW_RUNTIME.createWebMcpTools(runtime).map(function (tool) {
        return { name: tool.name, annotations: tool.annotations };
      }) : [];
    },
    error: function () { return lastError; },
    identity: function () { return identity; },
    storage: function () {
      return storage
        ? {
          kind: storage.kind,
          schemaVersion: storage.schemaVersion,
          migrated: storage.migrated,
          pendingWrites: storage.pendingWrites(),
          lastError: storage.lastError(),
        }
        : { kind: "memory", schemaVersion: 0, migrated: 0, pendingWrites: 0, lastError: lastError };
    },
    flush: function () { return storage ? storage.flush() : Promise.resolve(); },
    export: function () { return storage ? storage.snapshot() : {}; },
  };

  // Backstop for anything that wrote outside a command: a page being torn down
  // is the last chance to get the queue out.
  window.addEventListener("pagehide", function () {
    if (storage) void storage.flush();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { void start(); });
  } else {
    void start();
  }
})();
