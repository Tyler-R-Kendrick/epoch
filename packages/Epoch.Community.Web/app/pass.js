/**
 * Community Web fake password-store (`pass`) against durable localStorage VFS.
 * Mirrors the real pass CLI surface: init/ls/find/show/insert/generate/edit/rm/mv/cp/grep/git/help/version
 * plus otp / update / audit / import extensions.
 */
(function () {
  "use strict";

  var STORE_KEY = "cw-password-store";
  var VERSION = "1.7.4-epoch";

  function emptyStore() {
    return { gpgId: null, entries: Object.create(null) };
  }

  function load() {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      if (!raw) return emptyStore();
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return emptyStore();
      return {
        gpgId: parsed.gpgId || null,
        entries: parsed.entries && typeof parsed.entries === "object" ? parsed.entries : Object.create(null),
      };
    } catch {
      return emptyStore();
    }
  }

  function save(store) {
    window.localStorage.setItem(STORE_KEY, JSON.stringify({
      gpgId: store.gpgId,
      entries: store.entries,
    }));
  }

  function normalizeName(name) {
    return String(name || "").replace(/^\/+|\/+$/g, "").replace(/\/+/g, "/");
  }

  function ensureInit(store) {
    if (!store.gpgId) return "pass: store is not initialized — run `pass init <gpg-id>`";
    return null;
  }

  function listTree(store, prefix) {
    var root = normalizeName(prefix);
    var names = Object.keys(store.entries).sort();
    if (!root) {
      var tops = [];
      var seen = Object.create(null);
      names.forEach(function (name) {
        var head = name.split("/")[0];
        if (!seen[head]) {
          seen[head] = true;
          tops.push(Object.keys(store.entries).some(function (n) {
            return n !== head && n.indexOf(head + "/") === 0;
          }) ? head + "/" : head);
        }
      });
      return tops.join("\n") || "Password Store";
    }
    var out = [];
    var slash = root + "/";
    names.forEach(function (name) {
      if (name === root) out.push(name.split("/").pop());
      else if (name.indexOf(slash) === 0) {
        var rest = name.slice(slash.length);
        var next = rest.split("/")[0];
        var label = rest.indexOf("/") >= 0 ? next + "/" : next;
        if (out.indexOf(label) < 0) out.push(label);
      }
    });
    return out.length ? out.join("\n") : "Error: " + root + " is not in the password store.";
  }

  function randomPassword(length, noSymbols) {
    var alpha = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    var symbols = "!@#$%^&*()-_=+[]{}";
    var alphabet = noSymbols ? alpha : alpha + symbols;
    var out = "";
    for (var i = 0; i < length; i += 1) {
      out += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return out;
  }

  function parseFlags(tokens) {
    var flags = Object.create(null);
    var rest = [];
    for (var i = 0; i < tokens.length; i += 1) {
      var tok = tokens[i];
      if (tok === "--") {
        rest = rest.concat(tokens.slice(i + 1));
        break;
      }
      if (tok.charAt(0) === "-" && tok.length > 1) {
        if (tok.indexOf("=") >= 0) {
          var parts = tok.split("=");
          flags[parts[0].replace(/^--?/, "")] = parts.slice(1).join("=");
        } else if (tok === "-c" || tok === "--clip") flags.clip = true;
        else if (tok === "-e" || tok === "--echo") flags.echo = true;
        else if (tok === "-m" || tok === "--multiline") flags.multiline = true;
        else if (tok === "-f" || tok === "--force") flags.force = true;
        else if (tok === "-n" || tok === "--no-symbols") flags.noSymbols = true;
        else if (tok === "-r" || tok === "--recursive") flags.recursive = true;
        else if (tok === "-p" || tok === "--path") {
          flags.path = tokens[i + 1] || "";
          i += 1;
        } else flags[tok.replace(/^--?/, "")] = true;
      } else rest.push(tok);
    }
    return { flags: flags, rest: rest };
  }

  function helpText() {
    return [
      "============================================",
      "= pass: the standard unix password manager =",
      "=                  v" + VERSION + "                  =",
      "============================================",
      "",
      "Usage:",
      "    pass init [--path=subfolder,-p subfolder] gpg-id...",
      "    pass [ls] [subfolder]",
      "    pass find pass-names...",
      "    pass [show] [--clip,-c] pass-name",
      "    pass grep search-string",
      "    pass insert [--echo,-e | --multiline,-m] [--force,-f] pass-name [-- password]",
      "    pass edit pass-name [-- password]",
      "    pass generate [--no-symbols,-n] [--force,-f] pass-name [pass-length]",
      "    pass rm [--recursive,-r] [--force,-f] pass-name",
      "    pass mv [--force,-f] old-path new-path",
      "    pass cp [--force,-f] old-path new-path",
      "    pass git git-command-args...",
      "    pass otp [--clip,-c] pass-name",
      "    pass update pass-name...",
      "    pass audit [pass-names...]",
      "    pass import",
      "    pass help",
      "    pass version",
    ].join("\n");
  }

  function command(line) {
    var tokens = String(line || "").trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) tokens = ["ls"];
    var verb = tokens[0];
    var parsed = parseFlags(tokens.slice(1));
    var flags = parsed.flags;
    var args = parsed.rest;
    var store = load();

    if (verb === "help" || verb === "--help" || verb === "-h") return helpText();
    if (verb === "version" || verb === "--version") return "============================================\n= pass: the standard unix password manager =\n=                  v" + VERSION + "                  =\n============================================";

    if (verb === "init") {
      var gpgId = args.join(" ").trim();
      if (!gpgId) return "Usage: pass init [--path=subfolder,-p subfolder] gpg-id...";
      store.gpgId = gpgId;
      if (flags.path) {
        /* path-scoped reencrypt is a no-op in the fake store beyond recording gpg-id */
      }
      save(store);
      return "Password store initialized for " + gpgId;
    }

    if (verb === "ls" || verb === "list") {
      var notInit = ensureInit(store);
      if (notInit) return notInit;
      return listTree(store, args[0] || "");
    }

    if (verb === "find") {
      var notInitFind = ensureInit(store);
      if (notInitFind) return notInitFind;
      if (!args.length) return "Usage: pass find pass-names...";
      var hits = Object.keys(store.entries).filter(function (name) {
        return args.some(function (needle) {
          return name.toLowerCase().indexOf(String(needle).toLowerCase()) >= 0;
        });
      }).sort();
      return hits.length ? ("Search Terms: " + args.join(",") + "\n" + hits.join("\n")) : ("Search Terms: " + args.join(",") + "\n");
    }

    if (verb === "show") {
      var showName = normalizeName(args[0]);
      var notInitShow = ensureInit(store);
      if (notInitShow) return notInitShow;
      if (!showName) return "Usage: pass show [--clip,-c] pass-name";
      var entry = store.entries[showName];
      if (!entry) return "Error: " + showName + " is not in the password store.";
      if (flags.clip) return "Copied " + showName + " to clipboard.";
      return entry.multiline ? entry.multiline : entry.password;
    }

    if (verb === "grep") {
      var notInitGrep = ensureInit(store);
      if (notInitGrep) return notInitGrep;
      var needle = args.join(" ");
      if (!needle) return "Usage: pass grep search-string";
      var greps = [];
      Object.keys(store.entries).sort().forEach(function (name) {
        var body = store.entries[name].multiline || store.entries[name].password || "";
        if (body.indexOf(needle) >= 0) greps.push(name + ":\n" + body);
      });
      return greps.length ? greps.join("\n") : "";
    }

    if (verb === "insert") {
      var notInitIns = ensureInit(store);
      if (notInitIns) return notInitIns;
      var insertName = normalizeName(args[0]);
      var password = args.slice(1).join(" ");
      if (!insertName) return "Usage: pass insert [--echo,-e | --multiline,-m] [--force,-f] pass-name [-- password]";
      if (store.entries[insertName] && !flags.force) {
        return "An entry already exists for " + insertName + ".";
      }
      if (!password) return "pass insert: password required after name (fake CLI has no tty prompt)";
      store.entries[insertName] = flags.multiline
        ? { password: password.split("\n")[0], multiline: password }
        : { password: password };
      save(store);
      return flags.echo ? password : "";
    }

    if (verb === "edit") {
      var notInitEdit = ensureInit(store);
      if (notInitEdit) return notInitEdit;
      var editName = normalizeName(args[0]);
      var nextPass = args.slice(1).join(" ");
      if (!editName) return "Usage: pass edit pass-name [-- password]";
      if (!nextPass) return "pass edit: password required after name (fake CLI has no tty editor)";
      store.entries[editName] = { password: nextPass };
      save(store);
      return "";
    }

    if (verb === "generate") {
      var notInitGen = ensureInit(store);
      if (notInitGen) return notInitGen;
      var genName = normalizeName(args[0]);
      var length = parseInt(args[1] || "25", 10);
      if (!genName) return "Usage: pass generate [--no-symbols,-n] [--force,-f] pass-name [pass-length]";
      if (store.entries[genName] && !flags.force) {
        return "An entry already exists for " + genName + ".";
      }
      if (!Number.isFinite(length) || length < 1) length = 25;
      var generated = randomPassword(length, !!flags.noSymbols);
      store.entries[genName] = { password: generated };
      save(store);
      return "The generated password for " + genName + " is:\n" + generated;
    }

    if (verb === "rm" || verb === "remove" || verb === "delete") {
      var notInitRm = ensureInit(store);
      if (notInitRm) return notInitRm;
      var rmName = normalizeName(args[0]);
      if (!rmName) return "Usage: pass rm [--recursive,-r] [--force,-f] pass-name";
      var removed = 0;
      Object.keys(store.entries).forEach(function (name) {
        if (name === rmName || (flags.recursive && name.indexOf(rmName + "/") === 0)) {
          delete store.entries[name];
          removed += 1;
        }
      });
      if (!removed) return "Error: " + rmName + " is not in the password store.";
      save(store);
      return "removed " + rmName;
    }

    if (verb === "mv") {
      var notInitMv = ensureInit(store);
      if (notInitMv) return notInitMv;
      var from = normalizeName(args[0]);
      var to = normalizeName(args[1]);
      if (!from || !to) return "Usage: pass mv [--force,-f] old-path new-path";
      if (!store.entries[from]) return "Error: " + from + " is not in the password store.";
      if (store.entries[to] && !flags.force) return "An entry already exists for " + to + ".";
      store.entries[to] = store.entries[from];
      delete store.entries[from];
      save(store);
      return "";
    }

    if (verb === "cp") {
      var notInitCp = ensureInit(store);
      if (notInitCp) return notInitCp;
      var src = normalizeName(args[0]);
      var dest = normalizeName(args[1]);
      if (!src || !dest) return "Usage: pass cp [--force,-f] old-path new-path";
      if (!store.entries[src]) return "Error: " + src + " is not in the password store.";
      if (store.entries[dest] && !flags.force) return "An entry already exists for " + dest + ".";
      store.entries[dest] = JSON.parse(JSON.stringify(store.entries[src]));
      save(store);
      return "";
    }

    if (verb === "git") {
      var notInitGit = ensureInit(store);
      if (notInitGit) return notInitGit;
      return "pass git: password store is not a git repository";
    }

    if (verb === "otp") {
      var notInitOtp = ensureInit(store);
      if (notInitOtp) return notInitOtp;
      var otpName = normalizeName(args[0]);
      if (!otpName) return "Usage: pass otp [--clip,-c] pass-name";
      var otpEntry = store.entries[otpName];
      if (!otpEntry) return "Error: " + otpName + " is not in the password store.";
      var otpLine = String(otpEntry.multiline || otpEntry.password || "").split("\n").find(function (line) {
        return /^otpauth:/i.test(line) || /^otp:/i.test(line);
      });
      if (!otpLine) return "Error: " + otpName + " does not contain an OTP key.";
      if (flags.clip) return "Copied OTP for " + otpName + " to clipboard.";
      return "000000";
    }

    if (verb === "update") {
      var notInitUp = ensureInit(store);
      if (notInitUp) return notInitUp;
      if (!args.length) return "Usage: pass update pass-name...";
      var updated = [];
      args.forEach(function (name) {
        var key = normalizeName(name);
        if (!store.entries[key]) return;
        var next = randomPassword(25, false);
        store.entries[key] = { password: next };
        updated.push(key + " → " + next);
      });
      if (!updated.length) return "Error: nothing to update.";
      save(store);
      return updated.join("\n");
    }

    if (verb === "audit") {
      var notInitAu = ensureInit(store);
      if (notInitAu) return notInitAu;
      var byPass = Object.create(null);
      var weak = [];
      Object.keys(store.entries).forEach(function (name) {
        var password = store.entries[name].password || "";
        byPass[password] = byPass[password] || [];
        byPass[password].push(name);
        if (password.length < 12) weak.push(name);
      });
      var dups = Object.keys(byPass).filter(function (password) { return byPass[password].length > 1; });
      var lines = ["pass audit"];
      if (dups.length) {
        lines.push("Duplicated passwords:");
        dups.forEach(function (password) {
          lines.push("  " + byPass[password].join(", "));
        });
      } else lines.push("No duplicated passwords.");
      if (weak.length) {
        lines.push("Weak passwords (<12 chars):");
        weak.forEach(function (name) { lines.push("  " + name); });
      } else lines.push("No weak passwords under 12 characters.");
      return lines.join("\n");
    }

    if (verb === "import") {
      return "pass import: provide a source manager via host tooling; fake CLI keeps the store local-only.";
    }

    // `pass <name>` is show when the entry exists; otherwise unknown command.
    var bareName = normalizeName(verb);
    if (store.gpgId && store.entries[bareName] && args.length === 0) {
      if (flags.clip) return "Copied " + bareName + " to clipboard.";
      var bare = store.entries[bareName];
      return bare.multiline ? bare.multiline : bare.password;
    }

    return "Error: invalid command '" + verb + "' — try `pass help`";
  }

  function reset() {
    try { window.localStorage.removeItem(STORE_KEY); } catch { /* private */ }
  }

  window.CW_PASS = {
    command: command,
    reset: reset,
    load: load,
    STORE_KEY: STORE_KEY,
  };
})();
