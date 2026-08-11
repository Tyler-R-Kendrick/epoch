#!/usr/bin/env node
// Static accessibility lint for Nightboard's string-built HTML.
//
// jsx-a11y cannot see template HTML. This gate catches regressions that axe
// would also catch later: interactive controls without accessible names, and
// tablists that nest non-tab chrome.

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join("docs", "design-explorations", "nightboard");
const files = [
  "console.js",
  "index.html",
  "board.html",
  "ascii.js",
  "app.js",
  "base.css",
];

const errors = [];

for (const name of files) {
  const src = readFileSync(join(ROOT, name), "utf8");
  // Buttons rendered from templates must carry an accessible name.
  const buttonRes = /<button\b[^>]*>/gi;
  let match;
  while ((match = buttonRes.exec(src)) !== null) {
    const tag = match[0];
    if (/aria-hidden\s*=\s*["']true["']/i.test(tag)) continue;
    if (/aria-label\s*=/i.test(tag)) continue;
    if (/aria-labelledby\s*=/i.test(tag)) continue;
    if (/\btitle\s*=/i.test(tag)) continue;
    // Text content often follows on the same template fragment — allow when
    // the opener is immediately followed by visible label text in the source.
    const after = src.slice(match.index + tag.length, match.index + tag.length + 120);
    if (/^[^<]{1,80}</.test(after) || /^\s*\+?\s*(esc\(|["'`])/.test(after)) continue;
    // Dynamic label concatenation: '"…"' + expr + …
    if (/^\s*\+\s*/.test(after)) continue;
    errors.push(`${name}: button without accessible name near ${truncate(tag)}`);
  }
}

const consoleSrc = readFileSync(join(ROOT, "console.js"), "utf8");
if (!/role="tablist"/.test(consoleSrc) || !/role="tab"/.test(consoleSrc)) {
  errors.push("console.js: workspace tabs must expose role=tablist and role=tab");
}
if (!/role="combobox"/.test(consoleSrc) || !/aria-controls="cn-cli-listbox"/.test(consoleSrc)) {
  errors.push("console.js: CLI input must be a combobox controlling cn-cli-listbox");
}
if (!/role="listbox"/.test(consoleSrc) || !/role="option"/.test(consoleSrc)) {
  errors.push("console.js: suggestion menu must be listbox/option");
}
if (!/opts\.threadOf \? "tree" : "feed"/.test(consoleSrc) ||
    !/aria-busy/.test(consoleSrc) || !/aria-posinset/.test(consoleSrc) || !/aria-setsize/.test(consoleSrc)) {
  errors.push("console.js: message projections must expose feed/tree position and busy semantics");
}
if (!/cn-thread-tree/.test(consoleSrc) || !/role="group"/.test(consoleSrc) ||
    !/aria-level/.test(consoleSrc) || !/aria-selected/.test(consoleSrc) ||
    !/cn-thread-reading/.test(consoleSrc)) {
  errors.push("console.js: thread detail must expose a tree outline and synchronized reading pane");
}
if (/cn-cand[^\n]+aria-current/.test(consoleSrc)) {
  errors.push("console.js: combobox options must use selection, not aria-current");
}

const indexHtml = readFileSync(join(ROOT, "index.html"), "utf8");
if (!/class="nb-skip"/.test(indexHtml)) {
  errors.push("index.html: missing skip link (.nb-skip)");
}
if (!/\blang="en"/.test(indexHtml)) {
  errors.push("index.html: missing lang attribute");
}

const boardHtml = readFileSync(join(ROOT, "board.html"), "utf8");
if (!/role="banner"/.test(boardHtml)) {
  errors.push("board.html: top bar must be role=banner");
}

if (errors.length) {
  for (const err of errors) console.error(`a11y-lint: ${err}`);
  process.exitCode = 1;
} else {
  console.log("nightboard a11y lint passed");
}

function truncate(s) {
  return s.length > 96 ? `${s.slice(0, 93)}...` : s;
}
