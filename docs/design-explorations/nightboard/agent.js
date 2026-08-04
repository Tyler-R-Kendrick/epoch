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
   * The tools the agent may call. These are the console's own verbs, so the
   * agent cannot do anything a person could not do by typing.
   */
  var TOOLS = [
    { name: "navigate", args: "path", describe: "go to a path, e.g. /channels/bugs" },
    { name: "view", args: "mode", describe: "graph, diff or raw" },
    { name: "search", args: "text", describe: "find posts by content" },
    { name: "theme", args: "tokens", describe: "restyle the board; tokens are hex colours" },
    { name: "load", args: null, describe: "load queued posts" },
    { name: "say", args: "text", describe: "answer in words when no action is needed" },
  ];

  function toolSchema() {
    return {
      type: "object",
      additionalProperties: false,
      required: ["tool"],
      properties: {
        tool: { type: "string", enum: TOOLS.map(function (t) { return t.name; }) },
        path: { type: "string" },
        mode: { type: "string", enum: ["graph", "diff", "raw"] },
        text: { type: "string" },
        tokens: {
          type: "object",
          additionalProperties: false,
          properties: ["bg", "surface", "ink", "inkDim", "inkFaint", "rule", "accent",
            "accentInk", "signed", "live", "warn", "danger", "agent"].reduce(function (acc, k) {
            acc[k] = { type: "string", pattern: "^#[0-9a-fA-F]{6}$" };
            return acc;
          }, {}),
        },
      },
    };
  }

  function baseSystemPrompt() {
    return systemPrompt({ cwd: "/channels/general", here: [] });
  }

  function systemPrompt(ctx) {
    return [
      "You operate a terminal board for a software community. The board is a filesystem.",
      "",
      "Reply with ONE JSON object choosing a tool. Never prose outside the JSON.",
      "",
      "Tools:",
      TOOLS.map(function (t) { return "  " + t.name + (t.args ? " <" + t.args + ">" : "") + " — " + t.describe; }).join("\n"),
      "",
      "The user is at: " + ctx.cwd,
      "Paths that exist here: " + ctx.here.join(", "),
      "Top level: /channels /members /projects /epochs",
      "",
      "Rules:",
      "- A request to go somewhere, however loosely worded, is `navigate` with a real path.",
      "- A request to change how it looks is `theme` with hex colours for every role you can infer.",
      "- If you cannot act, use `say` and be brief.",
      "- Never invent a path. Choose the closest one that exists.",
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
    emit({ type: EVENT.RUN_STARTED, runId: runId, input: input });

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

      // Two passes at most: one to interpret, one to repair. Self-healing that
      // loops forever is just a slower way to fail.
      while (attempt < 2) {
        attempt += 1;
        // Context travels with the turn, because the session is shared and its
        // system prompt was fixed when it was warmed.
        var where = "\n\n[you are at " + ctx.cwd + "; here: " + ctx.here.slice(0, 24).join(", ") + "]";
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
        emit({ type: EVENT.TOOL_CALL_START, runId: runId, toolCallId: callId, toolCallName: call.tool });
        emit({ type: EVENT.TOOL_CALL_ARGS, runId: runId, toolCallId: callId, args: call });
        emit({ type: EVENT.TOOL_CALL_END, runId: runId, toolCallId: callId });

        var outcome = ctx.execute(call);
        emit({
          type: EVENT.TOOL_CALL_RESULT, runId: runId, toolCallId: callId,
          ok: outcome.ok, content: outcome.message,
        });

        if (outcome.ok) {
          if (call.tool === "say" && call.text) {
            emit({ type: EVENT.TEXT_MESSAGE_START, runId: runId, role: "assistant" });
            emit({ type: EVENT.TEXT_MESSAGE_CONTENT, runId: runId, delta: call.text });
            emit({ type: EVENT.TEXT_MESSAGE_END, runId: runId });
          }
          result = call;
          break;
        }
        lastError = outcome.message;
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

  window.NB_AGENT = { run: run, warm: warm, EVENT: EVENT, TOOLS: TOOLS };
})();
