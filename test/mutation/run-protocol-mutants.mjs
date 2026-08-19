#!/usr/bin/env node
/**
 * Kill listed Protocol capability mutants: patch source, rebuild, expect
 * package tests to fail. Restores files even on crash. Not Stryker.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const mutants = [
  {
    name: "providers-trusted",
    file: "packages/Epoch.Protocol/src/capabilities.ts",
    find: "providers: { trusted: false, mayMutateCanonicalState: false }",
    replace: "providers: { trusted: true, mayMutateCanonicalState: false }",
  },
  {
    name: "providers-may-mutate-canonical-state",
    file: "packages/Epoch.Protocol/src/capabilities.ts",
    find: "mayMutateCanonicalState: false",
    replace: "mayMutateCanonicalState: true",
  },
  {
    name: "merge-conservative-commutation-off",
    file: "packages/Epoch.Protocol/src/capabilities.ts",
    find: "conservativeCommutation: true",
    replace: "conservativeCommutation: false",
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

function buildProtocol() {
  const result = run("npm", ["run", "build", "-w", "@epoch/protocol"]);
  if (result.status !== 0) {
    throw new Error(`protocol build failed:\n${result.stdout}\n${result.stderr}`);
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
    buildProtocol();
    const test = run("npm", ["test", "-w", "@epoch/protocol"]);
    if (test.status === 0) {
      survived += 1;
      console.error(`SURVIVED ${mutant.name}`);
      console.error(test.stdout);
    } else {
      console.log(`KILLED ${mutant.name} (exit ${test.status})`);
    }
  }

  restore();
  buildProtocol();

  if (survived > 0) {
    console.error(`${survived} mutant(s) survived`);
    process.exitCode = 1;
  } else {
    console.log(`killed ${mutants.length} protocol mutants`);
  }
} catch (error) {
  restore();
  try {
    buildProtocol();
  } catch {
    /* still report original error */
  }
  console.error(error);
  process.exitCode = 1;
}
