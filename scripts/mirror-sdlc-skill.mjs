#!/usr/bin/env node
/**
 * Mirror the tracked SDLC skill (`skills/sdlc`) into supported agent host trees
 * as symlinks. Host trees under `.agents/`, `.claude/skills/`, `.grok/`, and
 * `.cursor/skills/` are gitignored; this script is the reproducible install step.
 *
 * Usage:
 *   node scripts/mirror-sdlc-skill.mjs
 *   node scripts/mirror-sdlc-skill.mjs --check   # exit 1 if any host is not a correct symlink
 */
import { existsSync, lstatSync, mkdirSync, readlinkSync, rmSync, symlinkSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const canonical = join(root, "skills", "sdlc");
const checkOnly = process.argv.includes("--check");

/** @type {readonly string[]} */
const HOST_SKILL_DIRS = [
  ".agents/skills",
  ".claude/skills",
  ".grok/skills",
  ".cursor/skills",
];

if (!existsSync(canonical) || !lstatSync(canonical).isDirectory()) {
  console.error(`mirror-sdlc-skill: canonical skill missing at ${canonical}`);
  process.exit(1);
}

let failed = false;

for (const hostDir of HOST_SKILL_DIRS) {
  const parent = join(root, hostDir);
  const linkPath = join(parent, "sdlc");
  const expectedTarget = relative(parent, canonical);

  if (!existsSync(parent)) {
    if (checkOnly) {
      console.error(`mirror-sdlc-skill: missing host dir ${hostDir}`);
      failed = true;
      continue;
    }
    mkdirSync(parent, { recursive: true });
  }

  if (existsSync(linkPath) || isSymlink(linkPath)) {
    if (isCorrectSymlink(linkPath, expectedTarget, canonical)) {
      console.log(`ok  ${hostDir}/sdlc → ${expectedTarget}`);
      continue;
    }
    if (checkOnly) {
      console.error(`mirror-sdlc-skill: ${hostDir}/sdlc is not a correct symlink to skills/sdlc`);
      failed = true;
      continue;
    }
    rmSync(linkPath, { recursive: true, force: true });
  } else if (checkOnly) {
    console.error(`mirror-sdlc-skill: missing ${hostDir}/sdlc`);
    failed = true;
    continue;
  }

  symlinkSync(expectedTarget, linkPath, "dir");
  console.log(`linked ${hostDir}/sdlc → ${expectedTarget}`);
}

if (failed) process.exit(1);
if (checkOnly) console.log("mirror-sdlc-skill: all hosts ok");

/**
 * @param {string} path
 */
function isSymlink(path) {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * @param {string} linkPath
 * @param {string} expectedRelative
 * @param {string} canonicalAbs
 */
function isCorrectSymlink(linkPath, expectedRelative, canonicalAbs) {
  try {
    const stat = lstatSync(linkPath);
    if (!stat.isSymbolicLink()) return false;
    const target = readlinkSync(linkPath);
    const resolved = resolve(dirname(linkPath), target);
    return resolved === canonicalAbs || target === expectedRelative || target.replace(/\\/g, "/") === expectedRelative.replace(/\\/g, "/");
  } catch {
    return false;
  }
}
