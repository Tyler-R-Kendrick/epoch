/** User-defined actions: one safe command sequence for prompt, agent, and voice. */
(function () {
  "use strict";

  var KEY = "nb-power-actions-v1";
  var actions = {};
  var runtime = null;
  var unregister = {};

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

  function install(api) {
    runtime = api;
    list().forEach(function (item) { register(item.name); });
    return list().length;
  }

  read();
  window.NB_POWER = { install: install, list: list, command: command, run: run, resolveVoice: resolveVoice };
})();
