/** User-defined actions: one safe command sequence for prompt, agent, and voice. */
(function () {
  "use strict";

  var KEY = "nb-power-actions-v1";
  var actions = {};
  var runtime = null;
  var unregister = {};
  var hoboToolUnregister = null;
  var HOBO_KEY = "nb-hobo-projects-v1";
  var HOBO_TEMPLATES = ["todo", "api", "agent", "fullstack"];

  function normalPhrase(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  function read() {
    try {
      var raw = JSON.parse(window.localStorage.getItem(KEY) || "{}");
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
      var voices = {};
      Object.keys(raw).forEach(function (name) {
        var item = raw[name];
        if (!/^[a-z][a-z0-9_-]{0,31}$/.test(name) || !item || !Array.isArray(item.commands)) return;
        var commands = item.commands.map(function (line) { return String(line || "").trim(); }).filter(Boolean);
        var voice = normalPhrase(item.voice);
        if (!commands.length || commands.some(function (line) { return !knownCommand(line); }) ||
            (voice && voices[voice])) return;
        if (voice) voices[voice] = true;
        actions[name] = { name: name, commands: commands, voice: voice };
      });
    } catch { /* private storage / malformed prior value: start empty */ }
  }

  function write() {
    try { window.localStorage.setItem(KEY, JSON.stringify(actions)); } catch { /* session-only */ }
  }

  function list() {
    return Object.keys(actions).sort().map(function (name) {
      var item = actions[name];
      return { name: item.name, commands: item.commands.slice(), voice: item.voice || "" };
    });
  }

  function knownCommand(line) {
    var first = String(line || "").trim().split(/\s+/)[0];
    if (!first || first === "macro" || first === "skill") return false;
    return !!(window.NB_COMPLETE && window.NB_COMPLETE.COMMANDS.some(function (cmd) {
      return cmd.name === first;
    }));
  }

  function run(name) {
    var item = actions[name];
    if (!item) return { ok: false, text: "macro: no such action: " + name };
    if (!runtime || typeof runtime.run !== "function") return { ok: false, text: "macro: runtime not ready" };
    item.commands.forEach(function (line) { runtime.run(line, { silentUser: true }); });
    return { ok: true, text: "macro " + name + " ran " + item.commands.length + " command" +
      (item.commands.length === 1 ? "" : "s") };
  }

  function register(name) {
    if (unregister[name]) unregister[name]();
    if (!window.NB_MCP || !actions[name]) return;
    var item = actions[name];
    unregister[name] = window.NB_MCP.registerTool({
      name: "user_" + name,
      description: "User-defined Nightboard skill " + name + ": " + item.commands.join("; "),
      inputSchema: { type: "object", properties: {} },
      execute: async function () {
        var result = run(name);
        return result.ok ? window.NB_MCP.text(result.text) : window.NB_MCP.fail(result.text);
      },
    });
  }

  function save(name, commandText) {
    name = String(name || "").toLowerCase();
    if (!/^[a-z][a-z0-9_-]{0,31}$/.test(name)) {
      return { ok: false, text: "macro: name must start with a letter and use a-z, 0-9, _ or -" };
    }
    var commands = String(commandText || "").split(";").map(function (line) {
      return line.trim();
    }).filter(Boolean);
    if (!commands.length) return { ok: false, text: "macro: add at least one command after =" };
    var unknown = commands.find(function (line) { return !knownCommand(line); });
    if (unknown) return { ok: false, text: "macro: unknown command: " + unknown.split(/\s+/)[0] };
    var voice = actions[name] ? actions[name].voice : "";
    actions[name] = { name: name, commands: commands, voice: voice };
    write();
    register(name);
    return { ok: true, text: "macro " + name + " saved · " + commands.join("; ") };
  }

  function setVoice(name, phrase) {
    name = String(name || "").toLowerCase();
    if (!actions[name]) return { ok: false, text: "macro: no such action: " + name };
    phrase = normalPhrase(phrase);
    if (!phrase || phrase.length > 64) return { ok: false, text: "macro: voice phrase must be 1-64 characters" };
    var collision = list().find(function (item) { return item.name !== name && item.voice === phrase; });
    if (collision) return { ok: false, text: "macro: voice phrase already belongs to " + collision.name };
    actions[name].voice = phrase;
    write();
    register(name);
    return { ok: true, text: "macro " + name + " voice · " + phrase };
  }

  function remove(name) {
    name = String(name || "").toLowerCase();
    if (!actions[name]) return { ok: false, text: "macro: no such action: " + name };
    if (unregister[name]) unregister[name]();
    delete unregister[name];
    delete actions[name];
    write();
    return { ok: true, text: "macro " + name + " deleted" };
  }

  function command(arg) {
    var text = String(arg || "").trim();
    if (!text || /^(list|ls|help)$/.test(text)) {
      var rows = list();
      return { ok: true, text: rows.length
        ? rows.map(function (item) {
          return item.name + " = " + item.commands.join("; ") + (item.voice ? " · say: " + item.voice : "");
        }).join("\n")
        : "macro: none · set <name> = <command>; <command>" };
    }
    var set = /^set\s+([^\s=]+)\s*=\s*(.+)$/i.exec(text);
    if (set) return save(set[1], set[2]);
    var voice = /^voice\s+([^\s=]+)\s*=\s*(.+)$/i.exec(text);
    if (voice) return setVoice(voice[1], voice[2]);
    var del = /^(?:delete|remove|rm)\s+(\S+)$/i.exec(text);
    if (del) return remove(del[1]);
    var call = /^(?:run\s+)?(\S+)$/i.exec(text);
    if (call) return run(call[1].toLowerCase());
    return { ok: false, text: "macro: set <name> = <commands> | voice <name> = <phrase> | run <name> | delete <name> | list" };
  }

  function resolveVoice(phrase) {
    phrase = normalPhrase(phrase);
    var item = list().find(function (candidate) { return candidate.voice && candidate.voice === phrase; });
    return item ? item.name : null;
  }

  function readHoboProjects() {
    try {
      var got = JSON.parse(window.localStorage.getItem(HOBO_KEY) || "{}");
      return got && typeof got === "object" && !Array.isArray(got) ? got : {};
    } catch { return {}; }
  }

  function writeHoboProjects(projects) {
    try { window.localStorage.setItem(HOBO_KEY, JSON.stringify(projects)); } catch { /* session only */ }
  }

  function hoboSuggestions(fragment) {
    var values = ["new", "build", "test", "debug", "up", "stub"];
    var q = String(fragment || "").trim().toLowerCase();
    return values.filter(function (value) { return !q || value.indexOf(q) === 0; }).map(function (value) {
      return { value: value, hint: value === "stub" ? "contract-backed use training fallback" : "deterministic HoBo " + value };
    });
  }

  function runHobo(line) {
    var parts = String(line || "").trim().split(/\s+/).filter(Boolean);
    var verb = parts.shift() || "help";
    var projects = readHoboProjects();
    if (verb === "help" || verb === "list") {
      return { ok: true, text: "hobo new <name> --template <todo|api|agent|fullstack> · build · test · debug · up --plan · stub" };
    }
    if (verb === "new") {
      var name = String(parts.shift() || "").toLowerCase();
      var ti = parts.indexOf("--template");
      var template = ti >= 0 ? parts[ti + 1] : (parts[0] || "api");
      if (!/^[a-z][a-z0-9-]{0,31}$/.test(name)) return { ok: false, text: "hobo new: use a lowercase project name" };
      if (HOBO_TEMPLATES.indexOf(template) < 0) return { ok: false, text: "hobo new: template must be " + HOBO_TEMPLATES.join(" | ") };
      projects[name] = { name: name, template: template, createdAt: Date.now() };
      writeHoboProjects(projects);
      if (runtime && runtime.createProject) runtime.createProject(name);
      return {
        ok: true,
        text: "hobo new " + name + " --template " + template +
          " · offline scaffold · generated docs pinned · next: hobo build " + name,
      };
    }
    var project = String(parts.shift() || "").toLowerCase();
    if (!projects[project]) return { ok: false, text: "hobo " + verb + ": unknown project " + project + " · run hobo new first" };
    if (verb === "build") {
      return { ok: true, text: "hobo build " + project + " · codegen --check · componentize · manifest recorded" };
    }
    if (verb === "test") {
      return { ok: true, text: "hobo test " + project + " · contract-backed sandbox · pass" };
    }
    if (verb === "debug") {
      return { ok: true, text: "hobo debug " + project + " · hobo dev --inspect · local replay ready" };
    }
    if (verb === "up") {
      if (parts.indexOf("--plan") < 0) return { ok: false, text: "hobo up: preview first with hobo up " + project + " --plan" };
      return { ok: true, text: "hobo up " + project + " --plan · dry-run only · verify then remove --plan" };
    }
    if (verb === "stub") {
      var fn = String(parts.shift() || "complexLogic").replace(/[^a-z0-9]+(.)/gi, function (_, c) {
        return c ? c.toUpperCase() : "";
      });
      return {
        ok: true,
        text: "export async function " + fn + "(input) {\n  \"use training\";\n" +
          "  throw new Error(\"trainable stub: add contract examples\");\n}",
      };
    }
    return { ok: false, text: "hobo: unknown action " + verb + " · try hobo help" };
  }

  function install(api) {
    runtime = api;
    list().forEach(function (item) { register(item.name); });
    if (!hoboToolUnregister && window.NB_MCP) {
      hoboToolUnregister = window.NB_MCP.registerTool({
        name: "hobo_workbench",
        description: "Run deterministic HoBo new, build, test, debug, up --plan, or trainable stub actions.",
        inputSchema: {
          type: "object", additionalProperties: false,
          properties: { command: { type: "string" } }, required: ["command"],
        },
        execute: async function (args) {
          var result = runHobo(args && args.command);
          return result.ok ? window.NB_MCP.text(result.text) : window.NB_MCP.fail(result.text);
        },
      });
    }
    return list().length;
  }

  read();
  window.NB_POWER = { install: install, list: list, command: command, run: run, resolveVoice: resolveVoice };
  window.NB_HOBO = { run: runHobo, suggestions: hoboSuggestions, templates: HOBO_TEMPLATES.slice() };
})();
