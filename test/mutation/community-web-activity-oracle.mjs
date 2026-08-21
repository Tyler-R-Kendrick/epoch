#!/usr/bin/env node
/**
 * Oracle for Community Web Activity terminal-nav mutants.
 * Loads sitemap.js the same way unit fixtures do and asserts filters are
 * terminal activity leaves (content stays out of the navigator parent).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "packages/Epoch.Community.Web/app");

function loadWindow() {
  new Function(readFileSync(join(ROOT, "value-kind.js"), "utf8"))();
  const window = {};
  new Function("window", readFileSync(join(ROOT, "community-core-runtime.js"), "utf8"))(window);
  new Function("window", readFileSync(join(ROOT, "data.js"), "utf8"))(window);
  new Function("window", readFileSync(join(ROOT, "sitemap.js"), "utf8"))(window);
  return window;
}

const win = loadWindow();
const map = win.CW_MAP;
if (!map || !map.list || !map.isTerminalNavPath || !map.navParentPath) {
  throw new Error("CW_MAP incomplete after loading sitemap.js");
}

const filters = map.list("/notifications") || [];
assert.deepEqual(
  filters.map((e) => e.name).sort(),
  ["all", "hooks", "mentions", "subscribed"],
);
assert.ok(
  filters.every((e) => e.kind === "activity"),
  `Activity filters must be kind=activity, got ${filters.map((e) => e.kind).join(",")}`,
);

for (const name of ["all", "mentions", "subscribed", "hooks"]) {
  const path = `/notifications/${name}`;
  assert.equal(map.isTerminalNavPath(path), true, `${path} must be terminal`);
  assert.equal(map.navParentPath(path), "/notifications", `${path} nav parent`);
}

const mentions = map.list("/notifications/mentions") || [];
assert.ok(mentions.length >= 1, "mentions filter lists notification items for detail/FS");
assert.ok(
  mentions.every((e) => e.notification && e.notification.kind === "mention"),
  "mentions listing is notification content, not category dirs",
);

console.log("community-web activity terminal oracle ok");
