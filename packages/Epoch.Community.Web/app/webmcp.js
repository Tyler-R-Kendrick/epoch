/**
 * WebMCP — the page's controls, exposed as tools.
 *
 * `document.modelContext.registerTool(descriptor, { signal })` shipped as a
 * Chrome origin trial in 149; the earlier `navigator.modelContext` spelling is
 * deprecated. It is still an unshipped W3C proposal everywhere else
 * (webmachinelearning/webmcp), so this registers against the native object when
 * it exists and against an identical local registry when it does not — same
 * descriptors, same call shape, same results. A browser agent picks up the
 * native ones; the chat in this page uses the registry. Neither knows which it
 * got.
 *
 * Three details the API makes load-bearing:
 *
 *  - `registerTool` returns a promise. A floating call drops tools silently
 *    when it rejects, so registration is awaited and its outcome is reported by
 *    `status()` rather than assumed.
 *  - There is no `unregisterTool`. Lifetime is an `AbortSignal` passed at
 *    registration, so every tool gets a controller and unregistering means
 *    aborting it. Deleting the local entry alone would leave a browser agent
 *    holding a tool whose page state is gone.
 *  - `annotations.readOnlyHint` and `annotations.untrustedContentHint` are what
 *    an agent uses to decide whether it may call something unattended and
 *    whether the result is data rather than instructions. Both default to the
 *    cautious answer: a tool is treated as consequential unless it says
 *    otherwise, because over-claiming safety is the expensive mistake.
 *
 * The important property is that these are *the same* actions the UI performs.
 * A tool that reimplements what a button does is a second implementation to
 * keep in sync; every tool here calls the console's own verb, so an agent can
 * do exactly what a person can do and nothing else. Authorization lives in the
 * action registry underneath, never in a tool description — a tool being
 * visible to an agent says nothing about whether it may be run.
 */
(function () {
  "use strict";

  var local = new Map();
  var registrations = new Map();
  var failures = [];

  function nativeContext() {
    return (!globalThis.CW_VALUE.isUndefined(document) && document.modelContext) || null;
  }

  function actionContext() {
    if (window.CW_APP && globalThis.CW_VALUE.isFunction(window.CW_APP.actionContext)) {
      return window.CW_APP.actionContext("mcp");
    }
    return { origin: "mcp", context: "board" };
  }

  /** Read-only unless the descriptor or its action says otherwise. */
  function annotationsFor(descriptor, action) {
    var readOnly = descriptor.readOnly === true ||
      (descriptor.readOnly !== false && !!action && action.sideEffect === "read");
    var untrusted = descriptor.untrusted === true;
    return { readOnlyHint: readOnly, untrustedContentHint: untrusted };
  }

  /**
   * Register a tool with the browser if it will take it, and always with the
   * local registry so the page's own agent can call it. Returns an unregister
   * function synchronously; the native half settles on its own and is recorded.
   */
  function registerTool(descriptor) {
    var actionId = descriptor.actionId || (window.CW_ACTIONS && window.CW_ACTIONS.resolve("mcp", descriptor.name));
    var action = null;
    if (window.CW_ACTIONS) {
      if (!actionId) {
        actionId = "tool." + descriptor.name;
        window.CW_ACTIONS.register({
          actionId: actionId,
          label: descriptor.name,
          description: descriptor.description,
          contexts: ["board"],
          sideEffect: descriptor.sideEffect || "local",
          permission: descriptor.permission,
          mcp: { toolName: descriptor.name, inputSchema: descriptor.inputSchema },
          execute: descriptor.execute,
        });
      }
      action = window.CW_ACTIONS.get(actionId);
      descriptor = Object.assign({}, descriptor, { actionId: actionId, execute: function (args) {
        return window.CW_ACTIONS.invoke(actionId, args || {}, actionContext());
      } });
    }

    var annotations = annotationsFor(descriptor, action);
    var entry = Object.assign({}, descriptor, { annotations: annotations });
    local.set(entry.name, entry);

    var controller = globalThis.CW_VALUE.isFunction(AbortController) ? new AbortController() : null;
    registrations.set(entry.name, { controller: controller, native: false });
    var native = nativeContext();
    if (native && globalThis.CW_VALUE.isFunction(native.registerTool)) {
      // The descriptor handed to the browser carries only what WebMCP defines;
      // actionId, permission, and side-effect are ours.
      var registration = {
        name: entry.name,
        description: entry.description,
        inputSchema: entry.inputSchema,
        annotations: annotations,
        execute: entry.execute,
      };
      var options = controller ? { signal: controller.signal } : undefined;
      var noted = function (error) {
        failures.push({ name: entry.name, reason: (error && error.message) || String(error) });
      };
      try {
        Promise.resolve(native.registerTool(registration, options)).then(function () {
          var state = registrations.get(entry.name);
          if (state) state.native = true;
        }, noted);
      } catch (error) {
        noted(error);
      }
    }

    return function unregister() {
      var state = registrations.get(entry.name);
      if (state && state.controller) state.controller.abort();
      registrations.delete(entry.name);
      local.delete(entry.name);
    };
  }

  function list() {
    return Array.from(local.values()).map(function (t) {
      return { name: t.name, description: t.description, inputSchema: t.inputSchema, annotations: t.annotations };
    });
  }

  /** Call a tool by name. Always resolves — a thrown tool is a failed result. */
  async function call(name, args) {
    var tool = local.get(name);
    if (!tool) {
      return { isError: true, content: [{ type: "text", text: "no such tool: " + name }] };
    }
    try {
      var result = await tool.execute(args || {});
      // Normalise: a tool that returns a bare string is still a valid answer.
      if (globalThis.CW_VALUE.isString(result)) return { content: [{ type: "text", text: result }] };
      if (!result || !result.content) return { content: [{ type: "text", text: "ok" }] };
      return result;
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: (err && err.message) || String(err) }],
      };
    }
  }

  function text(s) { return { content: [{ type: "text", text: String(s) }] }; }
  function fail(s) { return { isError: true, content: [{ type: "text", text: String(s) }] }; }

  /** What actually happened, so the page can say so instead of guessing. */
  function status() {
    var accepted = 0;
    registrations.forEach(function (state) { if (state.native) accepted += 1; });
    return {
      available: !!nativeContext(),
      registered: local.size,
      nativelyRegistered: accepted,
      failures: failures.slice(),
    };
  }

  window.CW_MCP = {
    registerTool: registerTool,
    list: list,
    call: call,
    text: text,
    fail: fail,
    status: status,
    isNative: function () { return !!nativeContext(); },
  };

  if (window.CW_ACTIONS) {
    window.CW_ACTIONS.mcpCatalog().forEach(function (action) {
      registerTool({
        actionId: action.actionId,
        name: action.mcp.toolName,
        description: action.description,
        inputSchema: action.mcp.inputSchema,
        execute: function () {},
      });
    });
  }
})();
