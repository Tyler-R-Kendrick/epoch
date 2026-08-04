/**
 * Every page component's controls, registered as WebMCP tools.
 *
 * One tool per capability the surface actually has, grouped by the component
 * that owns it. Each calls the console's own verb rather than reimplementing
 * it, so there is no second copy to drift: if the button breaks, the tool
 * breaks with it, which is the correct behaviour.
 *
 * These are registered once the app is up, because they close over its API.
 */
(function () {
  "use strict";

  function install(api) {
    var MCP = window.NB_MCP;
    var MAP = window.NB_MAP;
    var GRAPH = window.NB_GRAPH;

    /* ── The tree ──────────────────────────────────────────────────────── */

    MCP.registerTool({
      name: "board_navigate",
      description: "Go to a path in the board, e.g. /channels/bugs or /projects/civic-tuner/changes. Accepts partial names and resolves them the way the command line does.",
      inputSchema: {
        type: "object",
        properties: { path: { type: "string", description: "absolute or relative path" } },
        required: ["path"],
      },
      execute: async function (args) {
        var asked = String(args.path || "");
        if (api.navigate(asked, { keepCli: true })) {
          return MCP.text("now at " + api.state.path);
        }
        // A bare name is a hint and may be resolved fuzzily. An absolute path is
        // an assertion: if it does not exist, say so. Resolving it to something
        // nearby made this tool incapable of failing, which both lied and
        // removed the signal the agent needs to correct itself.
        if (asked.charAt(0) !== "/") {
          var guess = window.NB_COMPLETE.analyse("cd " + asked, {
            cwd: api.state.path, extra: api.state.merged,
          });
          var best = guess && guess.candidates && guess.candidates[0];
          if (best && api.navigate(best.value, { keepCli: true })) {
            return MCP.text("now at " + api.state.path + " (resolved from " + asked + ")");
          }
        }
        return MCP.fail("no such path: " + asked);
      },
    });

    MCP.registerTool({
      name: "board_list",
      description: "List what a path contains, without navigating there.",
      inputSchema: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
      execute: async function (args) {
        var entries = MAP.list(MAP.resolve(api.state.path, args.path), api.state.merged);
        if (!entries) return MCP.fail("not a directory: " + args.path);
        return MCP.text(entries.map(function (e) {
          return (e.kind === "dir" ? "dir  " : "file ") + e.name + "  " + (e.hint || "");
        }).join("\n"));
      },
    });

    MCP.registerTool({
      name: "board_where",
      description: "Where the board is currently pointed, and what is selected.",
      inputSchema: { type: "object", properties: {} },
      execute: async function () {
        var here = MAP.list(api.state.path, api.state.merged) || [];
        var sel = here[api.state.cursor];
        return MCP.text(JSON.stringify({
          path: api.state.path,
          selected: sel ? sel.name : null,
          view: api.state.view,
          mode: api.state.ai ? "ai" : "cli",
        }));
      },
    });

    /* ── The preview ───────────────────────────────────────────────────── */

    MCP.registerTool({
      name: "view_set",
      description: "Set how the preview renders: graph (lineage), diff (patches) or raw (transcript).",
      inputSchema: {
        type: "object",
        properties: { mode: { type: "string", enum: ["graph", "diff", "raw"] } },
        required: ["mode"],
      },
      execute: async function (args) {
        if (["graph", "diff", "raw"].indexOf(args.mode) === -1) {
          return MCP.fail("mode must be graph, diff or raw");
        }
        api.setView(args.mode);
        return MCP.text("view is " + args.mode);
      },
    });

    /* ── The stream ────────────────────────────────────────────────────── */

    MCP.registerTool({
      name: "stream_load",
      description: "Load posts that have queued since you last looked.",
      inputSchema: { type: "object", properties: {} },
      execute: async function () {
        var n = api.state.pending.length;
        api.mergePending();
        return MCP.text(n ? "loaded " + n : "nothing queued");
      },
    });

    MCP.registerTool({
      name: "stream_pause",
      description: "Pause or resume the live stream.",
      inputSchema: {
        type: "object",
        properties: { paused: { type: "boolean" } },
        required: ["paused"],
      },
      execute: async function (args) {
        api.setLive(!args.paused);
        return MCP.text(args.paused ? "stream paused" : "stream resumed");
      },
    });

    /* ── The theme ─────────────────────────────────────────────────────── */

    MCP.registerTool({
      name: "theme_set",
      description: "Restyle the board. Any subset of colours is fine; anything omitted keeps its current value.",
      inputSchema: {
        type: "object",
        properties: ["bg", "surface", "ink", "inkDim", "inkFaint", "rule", "accent",
          "accentInk", "signed", "live", "warn", "danger", "agent"].reduce(function (acc, k) {
          acc[k] = { type: "string", description: "hex colour, e.g. #04122a" };
          return acc;
        }, { name: { type: "string", description: "what to call this theme" } }),
      },
      execute: async function (args) {
        var name = args.name;
        var tokens = Object.assign({}, args);
        delete tokens.name;
        var n = api.applyTokens(tokens, name || "asked for");
        return n ? MCP.text("restyled " + n + " colours") : MCP.fail("no valid hex colours given");
      },
    });

    MCP.registerTool({
      name: "theme_use",
      description: "Switch to a named built-in theme.",
      inputSchema: {
        type: "object",
        properties: { name: { type: "string", description: "nightboard or tape" } },
        required: ["name"],
      },
      execute: async function (args) {
        var i = window.NB_THEMES.findIndex(function (t) {
          return t.id === args.name || t.name.toLowerCase() === String(args.name).toLowerCase();
        });
        if (i === -1) {
          return MCP.fail("themes are: " + window.NB_THEMES.map(function (t) { return t.id; }).join(", "));
        }
        api.setTheme(i);
        return MCP.text("theme is " + window.NB_THEMES[i].name);
      },
    });

    /* ── The optional canvas lens ──────────────────────────────────────── */

    MCP.registerTool({
      name: "fx_asciify",
      description: "Turn the whole board into live ASCII around the cursor. Requires HTML-in-canvas, which most browsers do not have; ask with on=false to turn it off.",
      inputSchema: {
        type: "object",
        properties: { on: { type: "boolean", description: "true to enable, false to disable" } },
        required: ["on"],
      },
      execute: async function (args) {
        var FX = window.NB_FX;
        if (!args.on) { FX.disable(); return MCP.text("asciify off"); }
        var res = FX.enable();
        // Reporting "ok" for an effect that silently did nothing is the whole
        // failure mode here — an unsupported browser has to say so.
        return res.ok ? MCP.text("asciify on") : MCP.fail("cannot: " + res.reason);
      },
    });

    /* ── The data ──────────────────────────────────────────────────────── */

    MCP.registerTool({
      name: "graph_query",
      description:
        "Run a GraphQL query against the board: channels, posts, members, projects, epochs. " +
        "Use graph_schema first if you need to know the shape.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "a GraphQL query document" },
          variables: { type: "object", description: "optional variables" },
        },
        required: ["query"],
      },
      execute: async function (args) {
        var result = await GRAPH.query(args.query, args.variables);
        if (result.errors && result.errors.length) {
          // Real GraphQL errors, with positions — the agent can correct itself.
          return MCP.fail(result.errors.map(function (e) { return e.message; }).join("; "));
        }
        return MCP.text(JSON.stringify(result.data));
      },
    });

    MCP.registerTool({
      name: "graph_schema",
      description: "The GraphQL schema for the board, as SDL. Ask this before writing a query you are unsure of.",
      inputSchema: { type: "object", properties: {} },
      execute: async function () { return MCP.text(GRAPH.SDL.trim()); },
    });

    return MCP.list().length;
  }

  window.NB_TOOLS = { install: install };
})();
