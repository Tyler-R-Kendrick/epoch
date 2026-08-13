/**
 * The AI half of the input box, as an AG-UI agent.
 *
 * AG-UI (the Agent-User Interaction Protocol, from CopilotKit) gives this a
 * vocabulary that already exists instead of one invented here: RUN_STARTED,
 * TOOL_CALL_START/ARGS/END/RESULT, TEXT_MESSAGE_*, RUN_ERROR. The console is a
 * plain AG-UI consumer — it does not know or care that the agent happens to be
 * a model running on the device rather than a server.
 *
 * What the toggle actually buys you:
 *
 *   CLI   the text is a command. Wrong input is an error.
 *   AI    the text is intent. It is interpreted into tool calls first, a bad
 *         command is repaired rather than rejected, and a failure is fed back
 *         once so the agent can correct itself.
 *
 * Theming is a tool like any other, which is why the garden stopped being a
 * separate panel: "make everything blue" and "cd bugs" travel the same path.
 */
(function () {
  "use strict";

  var EVENT = {
    RUN_STARTED: "RUN_STARTED",
    RUN_FINISHED: "RUN_FINISHED",
    RUN_ERROR: "RUN_ERROR",
    TEXT_MESSAGE_START: "TEXT_MESSAGE_START",
    TEXT_MESSAGE_CONTENT: "TEXT_MESSAGE_CONTENT",
    TEXT_MESSAGE_END: "TEXT_MESSAGE_END",
    TOOL_CALL_START: "TOOL_CALL_START",
    TOOL_CALL_ARGS: "TOOL_CALL_ARGS",
    TOOL_CALL_END: "TOOL_CALL_END",
    TOOL_CALL_RESULT: "TOOL_CALL_RESULT",
    THINKING_START: "THINKING_START",
    THINKING_END: "THINKING_END",
  };

  /**
   * The agent's tools are whatever the page registered with WebMCP, plus one
   * for answering in words.
   *
   * Nothing is hand-listed here. A component that registers a tool becomes
   * usable by the chat immediately, and a component that stops registering one
   * disappears from the agent's vocabulary in the same motion — which is the
   * whole reason to route through a registry instead of a constant.
   */
  function registered() {
    var tools = (window.CW_MCP ? window.CW_MCP.list() : []).slice();
    tools.push({
      name: "say",
      description: "Answer in words when no action is needed.",
      inputSchema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
    });
    return tools;
  }

  /**
   * One constrained shape covering every tool: a name plus a free-form args
   * object. Per-tool schemas would be stricter, but a small on-device model
   * handles one simple shape far better than a large union, and the tool
   * validates its own arguments anyway.
   */
  function toolSchema() {
    return {
      type: "object",
      additionalProperties: false,
      required: ["tool"],
      properties: {
        tool: { type: "string", enum: registered().map(function (t) { return t.name; }) },
        args: { type: "object" },
      },
    };
  }

  function baseSystemPrompt() { return systemPrompt(); }

  function systemPrompt() {
    return [
      "You operate a terminal board for a software community. The board is a filesystem",
      "and its data is queryable with GraphQL.",
      "",
      'Reply with ONE JSON object: {"tool": "<name>", "args": { ... }}. Never prose outside it.',
      "",
      "Tools:",
      registered().map(function (t) {
        var props = Object.keys((t.inputSchema && t.inputSchema.properties) || {});
        return "  " + t.name + (props.length ? " {" + props.join(", ") + "}" : " {}") +
          " — " + (t.description || "");
      }).join("\n"),
      "",
      "Rules:",
      "- Going somewhere is board_navigate with a real path that already exists.",
      "- Searching posts, channels, projects, or DMs is board_search with a Lucene query — use it without waiting for /search.",
      "- Publishing chat in a channel, reply, or DM is board_post — the prompt is scoped to the active blade.",
      "- Creating a channel in the current project (nav at …/channels) is board_create_channel.",
      "- Renaming a channel is board_rename_channel { from, to }. Never board_navigate to the new name first — that path does not exist until rename succeeds. Prefer `from` from bound context (channel id/name).",
      "- Creating a project (nav at /projects) is board_create_project.",
      "- A question about what exists is graph_query. Call graph_schema first if unsure.",
      "- Changing how it looks is theme_set with hex colours for every role you can infer.",
      "- If you cannot act, use say and be brief.",
      "- Never invent a path. Choose the closest one that exists. Renames create the new path — use board_rename_channel.",
      "- Honour compose scope from the turn context: reply/post/dm publish; nav create stays in that project.",
      "- Honour bound context chips (channel/post/path id+name) — they name the control the user right-clicked.",
      "- Switching prompt interpretation (ai vs cli) is prompt_mode { mode }. Prefer that over typing /mode.",
    ].join("\n");
  }

  /**
   * Run one turn, emitting AG-UI events.
   *
   * `emit` receives every event; the console decides what to render. Failures
   * are events too — a run that dies silently is the failure mode this whole
   * layer exists to remove.
   */
  async function run(input, ctx, emit) {
    var R = window.NBResilient;
    var runId = "run-" + Date.now();
    var workspaceId = (ctx && (ctx.workspaceId || ctx.cwd)) || "default";
    var route = window.CW_ROUTE
      ? window.CW_ROUTE.pick(workspaceId, window.CW_ROUTE.DEFAULT_POLICY)
      : null;
    emit({
      type: EVENT.RUN_STARTED,
      runId: runId,
      input: input,
      displayInput: (ctx && ctx.displayInput != null) ? ctx.displayInput : input,
      route: route,
    });

    var state = await R.availability();
    if (state === "absent" || state === "unavailable") {
      emit({
        type: EVENT.RUN_ERROR, runId: runId,
        message: "No on-device model in this browser. CLI mode still works, and every tool the agent has is a command you can type.",
      });
      return null;
    }

    var session;
    try {
      emit({ type: EVENT.THINKING_START, runId: runId });
      // The shared session, warmed at boot. Turns after the first pay nothing.
      session = await R.withRetry(function () {
        return R.session({
          report: function (m, k) { emit({ type: "PROGRESS", runId: runId, message: m, kind: k }); },
        });
      }, { tries: 2, report: function (m) { emit({ type: "PROGRESS", runId: runId, message: m }); }, signal: ctx.signal });

      var attempt = 0;
      var lastError = null;
      var result = null;
      var attachNote = "";
      if (ctx && ctx.attachments && ctx.attachments.length) {
        attachNote = "\n[user attached " + ctx.attachments.length +
          " file(s) for context: " +
          ctx.attachments.map(function (a) { return a.name || "file"; }).join(", ") + "]";
      }

      // Two passes at most: one to interpret, one to repair. Self-healing that
      // loops forever is just a slower way to fail.
      while (attempt < 2) {
        attempt += 1;
        // Context travels with the turn, because the session is shared and its
        // system prompt was fixed when it was warmed.
        var where = "\n\n[you are at " + ctx.cwd + "; here: " + ctx.here.slice(0, 24).join(", ") + "]";
        if (ctx.compose) {
          where += "\n[compose: " + JSON.stringify(ctx.compose) + "]";
        }
        if (ctx.boundContext && ctx.boundContext.length) {
          where += "\n[bound context — right-clicked control(s): " +
            JSON.stringify(ctx.boundContext) + "]";
        }
        where += attachNote;
        var ask = attempt === 1
          ? input + where
          : input + where + "\nThat failed: " + lastError + "\nChoose a different tool or a path that exists.";

        var raw;
        try {
          raw = await R.streamPrompt(session, ask, {
            report: function (m, k) { emit({ type: "PROGRESS", runId: runId, message: m, kind: k }); },
            signal: ctx.signal,
            responseConstraint: toolSchema(),
            onChunk: function () { /* the tool call is only useful complete */ },
          });
        } catch (streamErr) {
          if (streamErr && streamErr.name === "AbortError") throw streamErr;
          // A fault mid-stream is as transient as one while opening the session
          // — retry was wrapped around create() only, so a busy model during
          // generation failed the whole run instead of being tried again.
          if (R.isTransient(streamErr) && attempt < 2) {
            lastError = (streamErr && streamErr.message) || String(streamErr);
            emit({ type: "PROGRESS", runId: runId, message: "retrying: " + lastError, kind: "busy" });
            continue;
          }
          throw streamErr;
        }

        emit({ type: EVENT.THINKING_END, runId: runId });

        var call;
        try {
          call = JSON.parse(raw);
        } catch {
          lastError = "the model did not return JSON";
          if (attempt === 2) {
            emit({ type: EVENT.RUN_ERROR, runId: runId, message: lastError, raw: String(raw).slice(0, 200) });
            return null;
          }
          continue;
        }

        var callId = runId + "-" + attempt;
        var callArgs = call.args || {};
        emit({ type: EVENT.TOOL_CALL_START, runId: runId, toolCallId: callId, toolCallName: call.tool });
        emit({ type: EVENT.TOOL_CALL_ARGS, runId: runId, toolCallId: callId, args: { tool: call.tool, args: callArgs } });
        emit({ type: EVENT.TOOL_CALL_END, runId: runId, toolCallId: callId });

        var outcome;
        if (call.tool === "say") {
          outcome = { isError: false, content: [{ type: "text", text: callArgs.text || "" }] };
        } else {
          // Straight through the WebMCP registry, so the agent invokes exactly
          // what a browser agent would invoke.
          outcome = await window.CW_MCP.call(call.tool, callArgs);
        }
        var said = (outcome.content && outcome.content[0] && outcome.content[0].text) || "";
        emit({
          type: EVENT.TOOL_CALL_RESULT, runId: runId, toolCallId: callId,
          ok: !outcome.isError, content: said,
        });

        if (!outcome.isError) {
          if (call.tool === "say" || call.tool === "graph_query" || call.tool === "graph_schema") {
            emit({ type: EVENT.TEXT_MESSAGE_START, runId: runId, role: "assistant" });
            emit({ type: EVENT.TEXT_MESSAGE_CONTENT, runId: runId, delta: said });
            emit({ type: EVENT.TEXT_MESSAGE_END, runId: runId });
          }
          result = call;
          break;
        }
        lastError = said;
        if (attempt === 2) {
          emit({ type: EVENT.RUN_ERROR, runId: runId, message: lastError });
          return null;
        }
        emit({ type: "PROGRESS", runId: runId, message: "repairing: " + lastError, kind: "busy" });
      }

      emit({ type: EVENT.RUN_FINISHED, runId: runId });
      return result;
    } catch (err) {
      if (err && err.name === "AbortError") {
        emit({ type: EVENT.RUN_ERROR, runId: runId, message: "cancelled" });
      } else {
        // A session can be evicted under memory pressure. Drop the shared one so
        // the next turn rebuilds rather than reusing a corpse forever.
        if (R.isTransient(err)) R.invalidate();
        emit({ type: EVENT.RUN_ERROR, runId: runId, message: (err && err.message) || String(err) });
      }
      return null;
    }
  }

  /** Start acquiring the model now, so the first message is not the one that waits. */
  function warm(report) {
    return window.NBResilient.warm({ initialPrompt: baseSystemPrompt(), report: report })
      .catch(function () { /* reported through modelState; CLI mode is unaffected */ });
  }

  window.CW_AGENT = { run: run, warm: warm, EVENT: EVENT, tools: registered };
})();
