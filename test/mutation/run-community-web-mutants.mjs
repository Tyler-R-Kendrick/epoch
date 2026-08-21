#!/usr/bin/env node
/**
 * Kill listed Community Web Activity terminal-nav mutants: patch sitemap,
 * expect the activity oracle to fail. Restores files even on crash.
 * Not Stryker; focused VFS contract only.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const mutants = [
  {
    name: "activity-filters-become-dirs",
    file: "packages/Epoch.Community.Web/app/sitemap.js",
    find: 'name: "all", kind: "activity", meta: "activity"',
    replace: 'name: "all", kind: "dir", meta: "activity"',
  },
  {
    name: "notifications-not-terminal",
    file: "packages/Epoch.Community.Web/app/sitemap.js",
    find: 'if (parts[0] === "notifications" && parts.length === 2 &&',
    replace: 'if (false && parts[0] === "notifications" && parts.length === 2 &&',
  },
];

const originals = new Map();

function restore() {
  for (const [file, contents] of originals) {
    writeFileSync(file, contents);
  }
}

function runOracle() {
  return spawnSync(process.execPath, ["test/mutation/community-web-activity-oracle.mjs"], {
    stdio: "pipe",
    encoding: "utf8",
  });
}

try {
  for (const mutant of mutants) {
    if (!originals.has(mutant.file)) {
      originals.set(mutant.file, readFileSync(mutant.file, "utf8"));
    }
  }

  let survived = 0;
  for (const mutant of mutants) {
    restore();
    const before = readFileSync(mutant.file, "utf8");
    const count = before.split(mutant.find).length - 1;
    if (count !== 1) {
      throw new Error(
        `${mutant.name}: expected exactly one '${mutant.find}' in ${mutant.file}, found ${count}`,
      );
    }
    writeFileSync(mutant.file, before.replace(mutant.find, mutant.replace));
    const test = runOracle();
    if (test.status === 0) {
      survived += 1;
      console.error(`SURVIVED ${mutant.name}`);
      console.error(test.stdout);
    } else {
      console.log(`KILLED ${mutant.name} (exit ${test.status})`);
    }
  }

  restore();

  if (survived > 0) {
    console.error(`${survived} mutant(s) survived`);
    process.exitCode = 1;
  } else {
    console.log(`killed ${mutants.length} community-web activity mutants`);
  }
} catch (error) {
  restore();
  console.error(error);
  process.exitCode = 1;
}
