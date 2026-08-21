import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
// board.html loads value-kind.js first; app scripts classify via globalThis.CW_VALUE.
import "../app/value-kind.js";

const root = fileURLToPath(new URL("../app/", import.meta.url));

function load(name, window) {
  new Function("window", readFileSync(join(root, name), "utf8"))(window);
}

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

const window = { localStorage: storage() };
load("action-registry.js", window);
load("actions.js", window);
load("pass.js", window);

const actions = window.CW_ACTIONS;
const pass = window.CW_PASS;

assert.equal(actions.resolve("cli", "rg"), "search.body");
assert.equal(actions.resolve("cli", "ripgrep"), "search.body");
assert.equal(actions.resolve("cli", "grep"), "search.body");
assert.equal(actions.resolve("cli", "fd"), "search.find");
assert.equal(actions.resolve("cli", "find"), "search.find");
assert.equal(actions.resolve("cli", "pass"), "secrets.pass");
assert.equal(actions.resolve("cli", "cd"), "nav.enter");
assert.equal(actions.resolve("cli", "z"), "nav.enter");

const body = actions.get("search.body");
assert.deepEqual(body.commandAliases, ["rg", "ripgrep", "grep"]);
const find = actions.get("search.find");
assert.deepEqual(find.commandAliases, ["fd", "find"]);

assert.match(pass.command("help"), /pass init/);
assert.match(pass.command("init demo@epoch.local"), /initialized/);
assert.equal(pass.command("insert github/token -- hunter2"), "");
assert.equal(pass.command("show github/token"), "hunter2");
assert.equal(pass.command("github/token"), "hunter2");
assert.match(pass.command("generate -f github/token 16"), /generated password/);
assert.match(pass.command("find github"), /github\/token/);
assert.match(pass.command("ls"), /github/);
assert.match(pass.command("cp github/token github/token-copy"), /^$/);
assert.equal(pass.command("show github/token-copy").length > 0, true);
assert.match(pass.command("mv -f github/token-copy github/moved"), /^$/);
assert.match(pass.command("rm github/moved"), /removed/);
assert.match(pass.command("audit"), /pass audit/);
assert.match(pass.command("git status"), /not a git repository/);
assert.match(pass.command("version"), /v1\.7\.4-epoch/);

pass.reset();
assert.match(pass.command("ls"), /not initialized/);

console.log("Community Web fake CLI tool aliases and pass tests passed");
