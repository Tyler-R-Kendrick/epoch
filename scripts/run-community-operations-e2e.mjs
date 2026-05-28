#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidenceDirectory = path.join(repoRoot, "docs", "evidence", "community-operations");
const jsonEvidencePath = path.join(evidenceDirectory, "community_operations.feature.json");
const videoEvidencePath = path.join(evidenceDirectory, "community_operations.webm");
const jsonEvidenceCliPath = path.relative(repoRoot, jsonEvidencePath).replaceAll(path.sep, "/");

function commandFor(name) {
  return process.platform === "win32" ? `${name}.cmd` : name;
}

function assertInsideRepo(targetPath) {
  const resolved = path.resolve(targetPath);
  if (resolved !== repoRoot && !resolved.startsWith(`${repoRoot}${path.sep}`)) {
    throw new Error(`Refusing to write outside the repository: ${resolved}`);
  }
}

function cleanEvidenceDirectory() {
  assertInsideRepo(evidenceDirectory);
  fs.mkdirSync(evidenceDirectory, { recursive: true });

  for (const entry of fs.readdirSync(evidenceDirectory, { withFileTypes: true })) {
    if (!entry.isFile() || (!entry.name.endsWith(".json") && !entry.name.endsWith(".webm"))) {
      continue;
    }

    const target = path.join(evidenceDirectory, entry.name);
    assertInsideRepo(target);
    fs.rmSync(target, { force: true });
  }
}

function run(command, args, extraEnv = {}) {
  const spawnCommand = process.platform === "win32" ? process.env.ComSpec ?? "cmd.exe" : command;
  const spawnArgs = process.platform === "win32" ? ["/d", "/s", "/c", command, ...args] : args;
  const result = spawnSync(spawnCommand, spawnArgs, {
    cwd: repoRoot,
    env: { ...process.env, ...extraEnv },
    shell: false,
    stdio: "inherit",
  });

  if (result.error !== undefined) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} exited with ${result.status ?? "unknown status"}`);
  }
}

function assertEvidence() {
  const jsonStats = fs.statSync(jsonEvidencePath);
  const videoStats = fs.statSync(videoEvidencePath);
  if (jsonStats.size <= 0) {
    throw new Error("Community Operations Cucumber JSON evidence is empty.");
  }
  if (videoStats.size <= 1_000) {
    throw new Error("Community Operations Playwright WebM evidence is too small.");
  }

  const featureJson = JSON.parse(fs.readFileSync(jsonEvidencePath, "utf8"));
  const serialized = JSON.stringify(featureJson);
  for (const expected of [
    "Community maintainer operates project capabilities",
    "epoch-community",
    "node20",
    "ui-agent",
    "patch-region-widget",
    "visually validated operations dashboard",
  ]) {
    if (!serialized.includes(expected)) {
      throw new Error(`Community Operations JSON evidence is missing ${expected}.`);
    }
  }
}

cleanEvidenceDirectory();

run(commandFor("npm"), ["run", "build", "--", "--pretty", "false"]);
run(commandFor("npx"), [
  "cucumber-js",
  "features/community_operations.feature",
  "--require",
  "dist/test/features/**/*.js",
  "--format",
  `json:${jsonEvidenceCliPath}`,
  "--format",
  "progress",
], {
  EPOCH_COMMUNITY_OPERATIONS_E2E_ARTIFACT_DIR: evidenceDirectory,
  EPOCH_COMMUNITY_OPERATIONS_E2E_VIDEO_NAME: path.basename(videoEvidencePath),
});

assertEvidence();

console.log(`Community Operations Cucumber JSON evidence: ${path.relative(repoRoot, jsonEvidencePath)}`);
console.log(`Community Operations Playwright WebM evidence: ${path.relative(repoRoot, videoEvidencePath)}`);
