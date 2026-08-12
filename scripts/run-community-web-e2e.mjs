#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const evidenceDir = join("docs", "evidence", "community-web");
const videoScratch = join(evidenceDir, ".video");
const jsonPath = join(evidenceDir, "community_web.feature.json");
const webmPath = join(evidenceDir, "community_web.webm");

rmSync(videoScratch, { recursive: true, force: true });
mkdirSync(videoScratch, { recursive: true });
mkdirSync(evidenceDir, { recursive: true });

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
run(npm, ["run", "build", "--", "--pretty", "false"]);
run(npx, [
  "cucumber-js",
  "features/community_web_experience.feature",
  "--require",
  "dist/test/features/**/*.js",
  "--format",
  `json:${jsonPath}`,
], {
  EPOCH_COMMUNITY_WEB_VIDEO_DIR: videoScratch,
});

const videos = readdirSync(videoScratch)
  .filter((name) => name.endsWith(".webm"))
  .map((name) => join(videoScratch, name))
  .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs);
if (videos[0] === undefined) {
  throw new Error("Community Web e2e did not produce a Playwright WebM recording.");
}
rmSync(webmPath, { force: true });
renameSync(videos[0], webmPath);
rmSync(videoScratch, { recursive: true, force: true });

assertNonEmpty(jsonPath);
assertNonEmpty(webmPath);
const json = JSON.parse(readText(jsonPath));
const names = JSON.stringify(json);
for (const expected of [
  "Contributor opens a community and sees community-owned channels first",
  "Maintainer promotes a community idea into a Change",
  "Contributor adds a unified signed comment to the current channel",
]) {
  if (!names.includes(expected)) {
    throw new Error(`Community Web JSON evidence is missing scenario: ${expected}`);
  }
}

function run(command, args, env = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) {
    if (result.error !== undefined) {
      throw result.error;
    }
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
  }
}

function assertNonEmpty(path) {
  if (!existsSync(path) || statSync(path).size === 0) {
    throw new Error(`Expected non-empty evidence artifact: ${path}`);
  }
}

function readText(path) {
  return readFileSync(path, "utf8");
}
