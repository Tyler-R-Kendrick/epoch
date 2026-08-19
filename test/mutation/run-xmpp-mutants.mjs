#!/usr/bin/env node
/**
 * Kill listed XMPP mutants: patch source, rebuild, expect package tests to fail.
 * Restores files even on crash. Not Stryker; focused admission/fanout guards only.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const mutants = [
  {
    name: "jid-authors-principal",
    file: "packages/Epoch.Xmpp/src/transport.ts",
    find: "export function principalFromJid(_jid: string): never {\n  throw new Error(\"JIDs are admission only; they never author Epoch principals\");\n}",
    replace: "export function principalFromJid(_jid: string): string {\n  return _jid;\n}",
  },
  {
    name: "assert-public-never-throws",
    file: "packages/Epoch.Xmpp/src/transport.ts",
    find: "if (visibility !== \"public\") {",
    replace: "if (false) {",
  },
  {
    name: "read-events-federate",
    file: "packages/Epoch.Xmpp/src/channel-fanout.ts",
    find: "const FANOUT_TYPES = new Set([\"channel.create\", \"channel.message\"]);",
    replace: "const FANOUT_TYPES = new Set([\"channel.create\", \"channel.message\", \"channel.read\"]);",
  },
  {
    name: "conference-jid-is-raw-channel-id",
    file: "packages/Epoch.Xmpp/src/fanout-encode.ts",
    find: "return `${opaqueChannelLocalpart(channelId)}@conference.${destServer}`;",
    replace: "return `${channelId}@${destServer}`;",
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

function buildXmpp() {
  const protocol = run("npm", ["run", "build", "-w", "@epoch/protocol"]);
  if (protocol.status !== 0) {
    throw new Error(`protocol build failed:\n${protocol.stdout}\n${protocol.stderr}`);
  }
  const result = run("npm", ["run", "build", "-w", "@epoch/xmpp"]);
  if (result.status !== 0) {
    throw new Error(`xmpp build failed:\n${result.stdout}\n${result.stderr}`);
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
    buildXmpp();
    const test = run("npm", ["test", "-w", "@epoch/xmpp"]);
    if (test.status === 0) {
      survived += 1;
      console.error(`SURVIVED ${mutant.name}`);
      console.error(test.stdout);
    } else {
      console.log(`KILLED ${mutant.name} (exit ${test.status})`);
    }
  }

  restore();
  buildXmpp();

  if (survived > 0) {
    console.error(`${survived} mutant(s) survived`);
    process.exitCode = 1;
  } else {
    console.log(`killed ${mutants.length} xmpp mutants`);
  }
} catch (error) {
  restore();
  try {
    buildXmpp();
  } catch {
    /* still report original error */
  }
  console.error(error);
  process.exitCode = 1;
}
