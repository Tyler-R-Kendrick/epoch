#!/usr/bin/env node
/**
 * Kill listed NATS mutants: patch source, rebuild, expect package tests to fail.
 * Restores files even on crash. Not Stryker; focused fabric guards only.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const mutants = [
  {
    name: "session-always-grants-svc",
    file: "packages/Epoch.Nats/src/acl.ts",
    find: "if (options.allowServiceDiscovery === true)",
    replace: "if (true)",
  },
  {
    name: "token-svc-discover-ignores-posture",
    file: "packages/Epoch.Nats/src/acl.ts",
    find: 'if (scope === "svc:discover" && options.allowServiceDiscovery !== true) continue;',
    replace: "",
  },
  {
    name: "directory-open-never-denies",
    file: "packages/Epoch.Nats/src/service-discovery.ts",
    find: "if (options.allowServiceDiscovery !== true)",
    replace: "if (false)",
  },
];

const originals = new Map();

function restore() {
  for (const [file, contents] of originals) {
    writeFileSync(file, contents);
  }
}

function run(command, args) {
  return spawnSync(command, args, { stdio: "pipe", encoding: "utf8" });
}

function buildNats() {
  const result = run("npm", ["run", "build", "-w", "@epoch/nats"]);
  if (result.status !== 0) {
    throw new Error(`nats build failed:\n${result.stdout}\n${result.stderr}`);
  }
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
      throw new Error(`${mutant.name}: expected exactly one '${mutant.find}' in ${mutant.file}, found ${count}`);
    }
    writeFileSync(mutant.file, before.replace(mutant.find, mutant.replace));
    buildNats();
    const test = run("npm", ["test", "-w", "@epoch/nats"]);
    if (test.status === 0) {
      survived += 1;
      console.error(`SURVIVED ${mutant.name}`);
      console.error(test.stdout);
    } else {
      console.log(`KILLED ${mutant.name} (exit ${test.status})`);
    }
  }

  restore();
  buildNats();

  if (survived > 0) {
    console.error(`${survived} mutant(s) survived`);
    process.exitCode = 1;
  } else {
    console.log(`killed ${mutants.length} nats mutants`);
  }
} catch (error) {
  restore();
  try {
    buildNats();
  } catch {
    /* still report original error */
  }
  console.error(error);
  process.exitCode = 1;
}
