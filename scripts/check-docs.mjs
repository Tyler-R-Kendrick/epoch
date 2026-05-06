#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ignoredDirectories = new Set([".git", "coverage", "dist", "node_modules"]);
const markdownLinkPattern = /!?\[[^\]]*]\(([^)]+)\)/g;

function listFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...listFiles(absolutePath));
      }
      continue;
    }

    if (entry.isFile()) {
      files.push(absolutePath);
    }
  }

  return files;
}

function isLocalTarget(target) {
  return !target.startsWith("#")
    && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(target)
    && !target.startsWith("mailto:");
}

function targetPath(rawTarget) {
  const withoutAnchor = rawTarget.split("#")[0].trim();
  if (withoutAnchor.length === 0) {
    return "";
  }

  const unwrapped = withoutAnchor.startsWith("<") && withoutAnchor.endsWith(">")
    ? withoutAnchor.slice(1, -1)
    : withoutAnchor;
  return decodeURIComponent(unwrapped);
}

function relative(filePath) {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, "/");
}

function localLinks(filePath) {
  const contents = fs.readFileSync(filePath, "utf8");
  const links = [];
  for (const match of contents.matchAll(markdownLinkPattern)) {
    const rawTarget = match[1];
    if (!isLocalTarget(rawTarget)) {
      continue;
    }

    const localPath = targetPath(rawTarget);
    if (localPath.length > 0) {
      links.push(localPath);
    }
  }

  return links;
}

const allFiles = listFiles(repoRoot);
const markdownFiles = allFiles.filter((filePath) => filePath.endsWith(".md"));
const discoverableFiles = allFiles.filter((filePath) => filePath.endsWith(".md") || filePath.endsWith(".feature"));
const discoverableSet = new Set(discoverableFiles.map((filePath) => filePath.toLowerCase()));

const missingLinks = [];
for (const filePath of markdownFiles) {
  for (const link of localLinks(filePath)) {
    const resolved = path.resolve(path.dirname(filePath), link);
    if (!fs.existsSync(resolved)) {
      missingLinks.push(`${relative(filePath)} -> ${link}`);
    }
  }
}

if (missingLinks.length > 0) {
  console.error("Broken local Markdown links:");
  for (const link of missingLinks) {
    console.error(`- ${link}`);
  }
  process.exit(1);
}

const start = path.join(repoRoot, "README.md");
const seen = new Set([start.toLowerCase()]);
const queue = [start];

while (queue.length > 0) {
  const current = queue.shift();
  for (const link of localLinks(current)) {
    let resolved = path.resolve(path.dirname(current), link);

    if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
      const readme = path.join(resolved, "README.md");
      if (!fs.existsSync(readme)) {
        continue;
      }
      resolved = readme;
    }

    const key = resolved.toLowerCase();
    if (discoverableSet.has(key) && !seen.has(key)) {
      seen.add(key);
      queue.push(resolved);
    }
  }
}

const orphanedDocs = discoverableFiles
  .filter((filePath) => !seen.has(filePath.toLowerCase()))
  .map(relative)
  .sort();

if (orphanedDocs.length > 0) {
  console.error("Docs or feature specs not reachable from README.md:");
  for (const doc of orphanedDocs) {
    console.error(`- ${doc}`);
  }
  process.exit(1);
}

console.log(`Docs check passed: ${markdownFiles.length} Markdown files and ${discoverableFiles.length} docs/spec files checked.`);
