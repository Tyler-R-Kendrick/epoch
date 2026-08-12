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
      description: "Go to an exact absolute or relative board path. Returns an error for partial or ambiguous names.",
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
        var resolved = MAP.resolve(api.state.path, args.path);
        var entries = GRAPH.listPath
          ? GRAPH.listPath(resolved, api.viewerContext ? api.viewerContext() : {})
          : null;
        if (!entries) return MCP.fail("not a directory: " + args.path);
        return MCP.text(entries.map(function (e) {
          var type = e.kind === "message" ? "message" : e.kind === "dir" ? "dir" : e.kind;
          return type + "  " + e.name + "  " + (e.hint || "");
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
          sort: api.state.sort || "hot",
          mode: api.state.ai ? "ai" : "cli",
        }));
      },
    });

    MCP.registerTool({
      name: "prompt_mode",
      description:
        "Set the prompt interpretation mode: ai (natural language intent) or cli (shell commands). " +
        "People use /mode ai|cli; agents call this tool (or /ai /cli).",
      inputSchema: {
        type: "object",
        properties: { mode: { type: "string", enum: ["ai", "cli"] } },
        required: ["mode"],
      },
      execute: async function (args) {
        var mode = String((args && args.mode) || "").toLowerCase();
        if (mode !== "ai" && mode !== "cli") {
          return MCP.fail("mode must be ai or cli");
        }
        if (!api.setPromptMode) return MCP.fail("prompt mode not wired");
        api.setPromptMode(mode, { silent: true });
        return MCP.text("prompt mode is " + mode);
      },
    });

    /* ── The preview ───────────────────────────────────────────────────── */

    MCP.registerTool({
      name: "view_set",
      description: "Set the thread sort: hot, new, top or best (Reddit-style). Alias of sort_set.",
      inputSchema: {
        type: "object",
        properties: { mode: { type: "string", enum: ["hot", "new", "top", "best"] } },
        required: ["mode"],
      },
      execute: async function (args) {
        if (["hot", "new", "top", "best"].indexOf(args.mode) === -1) {
          return MCP.fail("mode must be hot, new, top or best");
        }
        api.setSort(args.mode);
        return MCP.text("sort is " + args.mode);
      },
    });

    MCP.registerTool({
      name: "sort_set",
      description: "Set the thread sort filter: hot, new, top or best.",
      inputSchema: {
        type: "object",
        properties: { mode: { type: "string", enum: ["hot", "new", "top", "best"] } },
        required: ["mode"],
      },
      execute: async function (args) {
        if (["hot", "new", "top", "best"].indexOf(args.mode) === -1) {
          return MCP.fail("mode must be hot, new, top or best");
        }
        api.setSort(args.mode);
        return MCP.text("sort is " + args.mode);
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
        properties: { name: { type: "string", description: "nightboard (Grid)" } },
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

    MCP.registerTool({
      name: "board_search",
      description:
        "Lucene search across all feeds, projects, channels, DMs, and paths. " +
        "Use when the user asks to find posts, mentions, cache talk, needs-review items, " +
        "or anything board-wide — do not require them to type /search. " +
        "Query fields: who, state, channel, project, dm, subject, body, kind, has, react, score, sort. " +
        "Examples: body:cache, state:needs-review, who:scout OR kind:agent, \"cold install\".",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Lucene-style query (same grammar as /view and /search)",
          },
          limit: {
            type: "number",
            description: "max hits to return (default 16)",
          },
        },
        required: ["query"],
      },
      execute: async function (args) {
        var q = String(args.query || "").trim();
        if (!q) return MCP.fail("query required — e.g. body:cache or state:needs-review");
        var out = api.runSearch(q, { limit: args.limit });
        // Paint the same color-coded results the CLI would show.
        if (out.format === "search" && out.html && api.pushLine) {
          api.pushLine({
            kind: "out",
            text: out.text,
            html: out.html,
            format: "search",
          });
          api.render();
        }
        return MCP.text(out.text);
      },
    });

    MCP.registerTool({
      name: "board_post",
      description:
        "Publish a message in the active compose scope: reply to an armed post, " +
        "new post in the current channel, or DM in the current thread. " +
        "Prefer this when the user is composing chat text — not for creating channels.",
      inputSchema: {
        type: "object",
        properties: {
          body: { type: "string", description: "message body" },
          channel: { type: "string", description: "optional channel id override" },
          re: { type: "string", description: "optional parent post id for a reply" },
        },
        required: ["body"],
      },
      execute: async function (args) {
        var body = String(args.body || "").trim();
        if (!body) return MCP.fail("body required");
        var ctx = api.composeContext ? api.composeContext() : { kind: "nav" };
        if (args.re) {
          api.armReplyTo(args.re, "there", args.channel || (ctx && ctx.channel), ctx && ctx.project);
          ctx = api.composeContext();
        } else if (args.channel && ctx.kind !== "reply") {
          ctx = {
            kind: "post",
            channel: args.channel,
            channelLabel: args.channel,
            project: (ctx && ctx.project) || "community",
            path: api.state.path,
          };
        }
        if (ctx.kind !== "reply" && ctx.kind !== "post" && ctx.kind !== "dm") {
          return MCP.fail("not in a channel/dm/reply scope — navigate first or pass channel");
        }
        var post = api.publishCompose(body, ctx);
        if (!post) return MCP.fail("could not publish");
        return MCP.text("posted " + post.id + (post.re ? " re:" + post.re : "") +
          (post.channel ? " #" + post.channel : "") + (post.dm ? " dm:" + post.dm : ""));
      },
    });

    MCP.registerTool({
      name: "board_create_channel",
      description:
        "Create a channel in the current project scope (from the nav path). " +
        "When the user is browsing /projects/<id>/channels and asks to add a room, use this. " +
        "Optional project override; default is the project in the current path.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "channel name / label" },
          project: { type: "string", description: "project id (default: current path)" },
        },
        required: ["name"],
      },
      execute: async function (args) {
        var res = api.createChannel(args.name, { project: args.project });
        if (!res || !res.ok) return MCP.fail((res && res.error) || "create failed");
        return MCP.text("created channel " + res.name + " in " + res.project +
          " → /projects/" + res.project + "/channels/" + res.name);
      },
    });

    MCP.registerTool({
      name: "board_rename_channel",
      description:
        "Rename an existing channel in place (updates its id/label, posts, and path). " +
        "Use this when the user asks to rename, retitle, or change a channel's name — " +
        "especially when bound context names a channel. " +
        "Do NOT board_navigate to the new name; that path does not exist until rename succeeds.",
      inputSchema: {
        type: "object",
        properties: {
          from: {
            type: "string",
            description: "current channel id or label (e.g. ideas). Prefer bound context name/id.",
          },
          to: {
            type: "string",
            description: "new channel name / label (e.g. ieades2)",
          },
          project: {
            type: "string",
            description: "project id (default: current path's project or community)",
          },
        },
        required: ["from", "to"],
      },
      execute: async function (args) {
        if (!api.renameChannel) return MCP.fail("rename not wired");
        var res = api.renameChannel(args.from, args.to, { project: args.project });
        if (!res || !res.ok) return MCP.fail((res && res.error) || "rename failed");
        return MCP.text("renamed #" + res.from + " → #" + res.to +
          " · " + res.path);
      },
    });

    MCP.registerTool({
      name: "board_create_project",
      description:
        "Create a new project under /projects. Use when the user is at /projects (or board root) " +
        "and asks to start a project.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "project id / slug" },
        },
        required: ["name"],
      },
      execute: async function (args) {
        var res = api.createProject(args.name);
        if (!res || !res.ok) return MCP.fail((res && res.error) || "create failed");
        return MCP.text("created project " + res.id + " → /projects/" + res.id);
      },
    });

    MCP.registerTool({
      name: "board_voice_join",
      description:
        "Join a low-latency Discord-style voice channel (WebRTC mesh). " +
        "Channels: lounge, standup. Use when the user wants to talk in a voice room.",
      inputSchema: {
        type: "object",
        properties: {
          channel: {
            type: "string",
            description: "voice channel id or label (lounge, standup). Default: lounge or current path.",
          },
        },
      },
      execute: async function (args) {
        if (!api.joinVoice) return MCP.fail("voice not wired");
        var res = await api.joinVoice(args.channel || null, null);
        if (!res || !res.ok) return MCP.fail((res && res.error) || "join failed");
        var vs = api.state && api.state.voice;
        return MCP.text("joined voice/" + ((vs && vs.channelId) || args.channel || "room") +
          (vs && vs.latencyMs != null ? " · " + vs.latencyMs + " ms rtt" : ""));
      },
    });

    MCP.registerTool({
      name: "board_voice_leave",
      description: "Leave the current channel voice session.",
      inputSchema: { type: "object", properties: {} },
      execute: async function () {
        if (!api.leaveVoice) return MCP.fail("voice not wired");
        await api.leaveVoice();
        return MCP.text("left voice");
      },
    });

    MCP.registerTool({
      name: "board_voice_mute",
      description: "Toggle mute in the current voice channel.",
      inputSchema: { type: "object", properties: {} },
      execute: async function () {
        if (!api.toggleVoiceMute) return MCP.fail("voice not wired");
        if (!api.state || !api.state.voice || !api.state.voice.joined) {
          return MCP.fail("not in voice");
        }
        api.toggleVoiceMute();
        return MCP.text(api.state.voice.muted ? "muted" : "unmuted");
      },
    });

    /* ── The data ──────────────────────────────────────────────────────── */

    MCP.registerTool({
      name: "graph_query",
      description:
        "Run a GraphQL query against the board: channels, posts, members, projects, dms. " +
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
        var result = await GRAPH.query(
          args.query,
          args.variables,
          api.viewerContext ? api.viewerContext() : undefined
        );
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
