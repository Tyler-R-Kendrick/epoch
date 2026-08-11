/** One built-in action registry shared by keyboard, pointer, prompt, voice, and WebMCP. */
(function () {
  "use strict";

  var descriptors = new Map();
  var aliases = { cli: new Map(), slash: new Map(), key: new Map(), voice: new Map(), mcp: new Map(), pointer: new Map() };
  var latest = null;

  function normal(value) { return String(value == null ? "" : value).trim(); }

  function bind(origin, alias, actionId) {
    var key = normal(alias);
    if (!key) return;
    if (!aliases[origin]) aliases[origin] = new Map();
    if (aliases[origin].has(key) && aliases[origin].get(key) !== actionId) {
      throw new Error("ambiguous " + origin + " action alias: " + key);
    }
    aliases[origin].set(key, actionId);
  }

  function register(descriptor) {
    if (!descriptor || !descriptor.actionId || typeof descriptor.execute !== "function") {
      throw new Error("actionId and execute are required");
    }
    if (descriptors.has(descriptor.actionId)) throw new Error("duplicate action: " + descriptor.actionId);
    var frozen = Object.freeze(Object.assign({}, descriptor));
    descriptors.set(frozen.actionId, frozen);
    (frozen.commandAliases || []).forEach(function (item) { bind("cli", item, frozen.actionId); });
    (frozen.slashAliases || []).forEach(function (item) { bind("slash", item, frozen.actionId); });
    (frozen.voiceAliases || []).forEach(function (item) { bind("voice", normal(item).toLowerCase(), frozen.actionId); });
    (frozen.keyBindings || []).forEach(function (item) { bind("key", item.key || item, frozen.actionId); });
    if (frozen.mcp) bind("mcp", frozen.mcp.toolName, frozen.actionId);
    return frozen;
  }

  function resolve(origin, alias) {
    var map = aliases[origin];
    var key = normal(alias);
    if (origin === "voice") key = key.toLowerCase();
    return map && map.get(key) || null;
  }

  function eventFor(descriptor, context, outcome) {
    context = context || {};
    return Object.freeze({
      actionId: descriptor.actionId,
      origin: normal(context.origin || "unknown"),
      objectId: context.objectId ? normal(context.objectId) : undefined,
      projectionId: context.projectionId ? normal(context.projectionId) : undefined,
      outcome: outcome,
    });
  }

  function invoke(actionId, input, context) {
    var descriptor = descriptors.get(actionId);
    context = context || {};
    if (!descriptor) {
      latest = Object.freeze({ actionId: normal(actionId), origin: normal(context.origin || "unknown"), outcome: "unknown-action" });
      return Promise.reject(new Error("unknown action: " + actionId));
    }
    if (descriptor.contexts && descriptor.contexts.length && context.context &&
        descriptor.contexts.indexOf(context.context) < 0) {
      latest = eventFor(descriptor, context, "unavailable");
      return Promise.reject(new Error("action unavailable in " + context.context));
    }
    if (descriptor.permission) {
      var allowed = typeof context.authorize === "function"
        ? context.authorize(descriptor.permission, descriptor, input)
        : !!(context.permissions && context.permissions.indexOf(descriptor.permission) >= 0);
      if (!allowed) {
        latest = eventFor(descriptor, context, "denied");
        return Promise.reject(new Error("permission denied: " + descriptor.permission));
      }
    }
    try {
      return Promise.resolve(descriptor.execute(input, context)).then(function (result) {
        latest = eventFor(descriptor, context, "success");
        return result;
      }, function (error) {
        latest = eventFor(descriptor, context, "error");
        throw error;
      });
    } catch (error) {
      latest = eventFor(descriptor, context, "error");
      return Promise.reject(error);
    }
  }

  function catalog(origin) {
    var out = [];
    descriptors.forEach(function (descriptor) {
      var values = origin === "cli" ? descriptor.commandAliases
        : origin === "slash" ? descriptor.slashAliases
        : origin === "voice" ? descriptor.voiceAliases
        : origin === "key" ? descriptor.keyBindings
        : origin === "mcp" && descriptor.mcp ? [descriptor.mcp.toolName] : [];
      if (values && values.length) out.push(Object.assign({ actionId: descriptor.actionId }, descriptor));
    });
    return out;
  }

  function rows(origin) {
    var rows = [];
    descriptors.forEach(function (descriptor) {
      var values = origin === "cli" ? descriptor.commandAliases : descriptor.slashAliases;
      (values || []).forEach(function (name, index) {
        rows.push({
          name: name,
          arg: origin === "cli" ? descriptor.commandArg : descriptor.slashArg,
          help: descriptor.description,
          run: descriptor.run || descriptor.actionId,
          actionId: descriptor.actionId,
          primary: index === 0,
          hidden: !!descriptor.hidden,
        });
      });
    });
    return rows;
  }

  function migrateMacro(input) {
    input = input || {};
    var actionIds = [];
    (input.commands || []).forEach(function (command) {
      var alias = normal(command).split(/\s+/)[0];
      var actionId = resolve("cli", alias) || resolve("slash", alias);
      if (!actionId) throw new Error("macro: unknown action: " + alias);
      actionIds.push(actionId);
    });
    return Object.assign({}, input, { schemaVersion: 2, actionIds: actionIds });
  }

  window.NB_ACTIONS = {
    register: register,
    resolve: resolve,
    invoke: invoke,
    get: function (id) { return descriptors.get(id) || null; },
    list: function () { return Array.from(descriptors.values()); },
    lastEvent: function () { return latest; },
    commandCatalog: function () { return catalog("cli"); },
    commandRows: function () { return rows("cli"); },
    slashCatalog: function () { return catalog("slash"); },
    slashRows: function () { return rows("slash"); },
    keyCatalog: function () { return catalog("key"); },
    voiceCatalog: function () { return catalog("voice"); },
    mcpCatalog: function () { return catalog("mcp"); },
    migrateMacro: migrateMacro,
  };
})();
