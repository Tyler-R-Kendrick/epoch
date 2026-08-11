/**
 * WebMCP — the page's controls, exposed as tools.
 *
 * `document.modelContext.registerTool({ name, description, inputSchema, execute })`
 * is a W3C proposal (webmachinelearning/webmcp) and is not shipping in any
 * browser yet. So this registers against the native object when it exists and
 * against an identical local registry when it does not — same descriptors, same
 * call shape, same results. A browser agent picks up the native ones; the chat
 * in this page uses the registry. Neither knows which it got.
 *
 * The important property is that these are *the same* actions the UI performs.
 * A tool that reimplements what a button does is a second implementation to
 * keep in sync; every tool here calls the console's own verb, so an agent can
 * do exactly what a person can do and nothing else.
 */
(function () {
  "use strict";

  var local = new Map();

  function nativeContext() {
    return (typeof document !== "undefined" && document.modelContext) || null;
  }

  /**
   * Register a tool with the browser if it will take it, and always with the
   * local registry so the page's own agent can call it.
   */
  function registerTool(descriptor) {
    var actionId = descriptor.actionId || (window.NB_ACTIONS && window.NB_ACTIONS.resolve("mcp", descriptor.name));
    if (window.NB_ACTIONS) {
      if (!actionId) {
        actionId = "tool." + descriptor.name;
        window.NB_ACTIONS.register({
          actionId: actionId,
          label: descriptor.name,
          description: descriptor.description,
          contexts: ["board"],
          sideEffect: "local",
          mcp: { toolName: descriptor.name, inputSchema: descriptor.inputSchema },
          execute: descriptor.execute,
        });
      }
      descriptor = Object.assign({}, descriptor, { actionId: actionId, execute: function (args) {
        return window.NB_ACTIONS.invoke(actionId, args || {}, { origin: "mcp", context: "board" });
      } });
    }
    var native = nativeContext();
    if (native && typeof native.registerTool === "function") {
      try { native.registerTool(descriptor); } catch { /* fall back to local only */ }
    }
    local.set(descriptor.name, descriptor);
    return function unregister() { local.delete(descriptor.name); };
  }

  function list() {
    return Array.from(local.values()).map(function (t) {
      return { name: t.name, description: t.description, inputSchema: t.inputSchema };
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
      if (typeof result === "string") return { content: [{ type: "text", text: result }] };
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

  window.NB_MCP = {
    registerTool: registerTool,
    list: list,
    call: call,
    text: text,
    fail: fail,
    isNative: function () { return !!nativeContext(); },
  };

  if (window.NB_ACTIONS) {
    window.NB_ACTIONS.mcpCatalog().forEach(function (action) {
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
