#!/usr/bin/env node
/**
 * Community Web board chrome design lint.
 *
 * `designmd lint DESIGN.md` validates the contract file. This gate checks that
 * string-built board controls apply it — especially the Bracket Rule for
 * interactive chrome that is not a filled primary button.
 *
 * Fail closed when:
 * - a <button> lacks a design class (cn-* / cw-* / primary)
 * - Bracket Rule chrome classes miss native-button reset or [brackets]
 * - receipt locator chrome (.cn-sig-text) misses signed mint treatment
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join("packages", "Epoch.Community.Web", "app");
const TEMPLATE_FILES = [
  "console.js",
  "workbench.js",
  "app.js",
  "compose.js",
  "workspace.js",
  "query.js",
  "ascii.js",
  "index.html",
  "board.html",
];

/** Interactive chrome that must wear TTY brackets (DESIGN.md Bracket Rule). */
const BRACKET_CHROME_CLASSES = [
  "cn-act",
  "cn-sig-text",
  "cn-react-pill",
  "cn-react-add",
  "cn-activity-filter",
  "cn-activity-open",
  "cn-activity-read",
  "cn-activity-enable",
  "cn-sort",
  "cn-share",
];

const errors = [];
const cssSources = [
  readFileSync(join(ROOT, "console.js"), "utf8"),
  readFileSync(join(ROOT, "base.css"), "utf8"),
  readFileSync(join(ROOT, "landing.css"), "utf8"),
].join("\n");

for (const name of TEMPLATE_FILES) {
  const src = readFileSync(join(ROOT, name), "utf8");
  const buttonRes = /<button\b[^>]*>/gi;
  let match;
  while ((match = buttonRes.exec(src)) !== null) {
    const tag = match[0];
    const classMatch = /\bclass\s*=\s*(["'])([^"']*)\1/i.exec(tag);
    if (!classMatch || !classMatch[2].trim()) {
      errors.push(`${name}: button missing design class near ${truncate(tag)}`);
      continue;
    }
    const classes = classMatch[2].trim().split(/\s+/).filter(Boolean);
    const designed = classes.some((cls) =>
      cls === "primary" || cls.startsWith("cn-") || cls.startsWith("cw-"));
    if (!designed) {
      errors.push(`${name}: button class must be cn-*/cw-*/primary (${classes.join(" ")}) near ${truncate(tag)}`);
    }
  }
}

for (const className of BRACKET_CHROME_CLASSES) {
  if (!new RegExp(`\\.${escapeRegExp(className)}\\b`).test(cssSources)) {
    errors.push(`CSS: missing rules for .${className}`);
    continue;
  }
  if (!cssResetsNativeButton(cssSources, className)) {
    errors.push(
      `CSS: .${className} must reset native button chrome (background:none|transparent, border:0|none, font:inherit)`,
    );
  }
  if (!hasBracketPseudos(cssSources, className)) {
    errors.push(`CSS: .${className} must apply Bracket Rule (::before "[" and ::after "]")`);
  }
}

if (!hasSignedColor(cssSources, "cn-sig-text")) {
  errors.push("CSS: .cn-sig-text receipt locators must use --cw-signed (trust-critical mint)");
}

if (errors.length) {
  for (const err of errors) console.error(`design-lint: ${err}`);
  process.exit(1);
}

console.log("Community Web app design chrome lint passed");

/**
 * @param {string} css
 * @param {string} className
 */
function cssResetsNativeButton(css, className) {
  const block = extractClassBlock(css, className);
  if (!block) return false;
  return /background\s*:\s*(none|transparent)\b/.test(block)
    && /border\s*:\s*(0|none)\b/.test(block)
    && /font\s*:\s*inherit\b/.test(block);
}

/**
 * @param {string} css
 * @param {string} className
 */
function hasBracketPseudos(css, className) {
  return hasPseudoContent(css, className, "::before", "[")
    && hasPseudoContent(css, className, "::after", "]");
}

/**
 * @param {string} css
 * @param {string} className
 * @param {string} pseudo
 * @param {string} content
 */
function hasPseudoContent(css, className, pseudo, content) {
  const needle = `.${className}${pseudo}`;
  let from = 0;
  while (from < css.length) {
    const idx = css.indexOf(needle, from);
    if (idx === -1) return false;
    const window = css.slice(idx, idx + 500);
    const brace = window.indexOf("{");
    if (brace !== -1) {
      const body = window.slice(brace, Math.min(window.length, brace + 220));
      if (body.includes(`content:"${content}"`) || body.includes(`content:'${content}'`)) {
        return true;
      }
    }
    from = idx + needle.length;
  }
  return false;
}

/**
 * @param {string} css
 * @param {string} className
 */
function hasSignedColor(css, className) {
  const block = extractClassBlock(css, className);
  return Boolean(block && /color\s*:\s*var\(--cw-signed\)/.test(block));
}

/**
 * @param {string} css
 * @param {string} className
 */
function extractClassBlock(css, className) {
  const re = new RegExp(`\\.${escapeRegExp(className)}(?![\\w-])(?![^{]*::(?:before|after))[^{]*\\{([^}]+)\\}`, "g");
  let match;
  let combined = "";
  while ((match = re.exec(css)) !== null) {
    const selector = match[0].slice(0, match[0].indexOf("{"));
    if (/::(?:before|after)\b/.test(selector)) continue;
    combined += `${match[1]}\n`;
  }
  // Fallback: looser match when selector lists are complex.
  if (!combined) {
    const loose = new RegExp(`\\.${escapeRegExp(className)}\\b[^{]*\\{([^}]+)\\}`, "g");
    while ((match = loose.exec(css)) !== null) {
      const selector = match[0].slice(0, match[0].indexOf("{"));
      if (/::(?:before|after)\b/.test(selector)) continue;
      combined += `${match[1]}\n`;
    }
  }
  return combined || null;
}

/** @param {string} value */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** @param {string} tag */
function truncate(tag) {
  return tag.length > 100 ? `${tag.slice(0, 97)}...` : tag;
}
