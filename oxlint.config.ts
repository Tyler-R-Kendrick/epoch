import { defineConfig } from "oxlint";

/**
 * anti-slop Oxlint plugin (vendored at tools/oxlint/anti-slop/).
 * Generic rules only — Epoch does not depend on Effect.
 *
 * See https://github.com/dmmulroy/anti-slop and the install-anti-slop agent skill.
 */
export default defineConfig({
  // anti-slop only: keep built-in Oxlint categories off so this gate measures
  // the vendored plugin rather than a second ESLint-shaped rule set.
  categories: {
    correctness: "off",
    nursery: "off",
    pedantic: "off",
    perf: "off",
    restriction: "off",
    style: "off",
    suspicious: "off",
  },
  ignorePatterns: [
    // Package / build outputs
    "coverage/**",
    "dist/**",
    "**/dist/**",
    "**/dist-server/**",
    "node_modules/**",
    ".npm-cache/**",
    ".inspiration/**",
    ".optimizexp/**",
    ".impeccable/**",
    ".serena/**",
    ".data/**",
    ".epoch/**",
    ".pact-logs/**",
    ".vercel/**",
    "**/node_modules/**",
    "**/.venv/**",
    // Generated / vendored browser assets (lint TypeScript sources instead)
    "packages/Epoch.Community.Web/app/community-runtime.js",
    "packages/Epoch.Community.Web/app/openui-parser.js",
    "packages/Epoch.Community.Web/app/graphql-engine.js",
    "packages/Epoch.Community.Web/app/openui-library.js",
    "packages/Epoch.Community.Web/app/community-core-runtime.js",
    "packages/Epoch.Community.Web/app/community-search-worker.js",
    "packages/Epoch.Community.Web/app/community-sqlite-worker.js",
    "packages/Epoch.Community.Web/app/asciify.js",
    "packages/Epoch.Community.Web/app/canvasui-fx.js",
    "packages/Epoch.Community.Web/app/canvasui-object.js",
    "components/canvasui/**",
    "docs/design-explorations/nightboard/canvasui-object.js",
    // Agent harness trees (skills, hooks, installed tooling)
    ".agent/**",
    ".agents/**",
    ".claude/**",
    ".codex/**",
    ".continue/**",
    ".cursor/**",
    ".gemini/**",
    ".github/skills/**",
    ".github/agents/**",
    ".github/hooks/**",
    ".grok/**",
    ".opencode/**",
    ".pi/**",
    ".roo/**",
    ".windsurf/**",
    // Vendored plugin source
    "tools/oxlint/anti-slop/**",
  ],
  jsPlugins: [
    { name: "anti-slop", specifier: "./tools/oxlint/anti-slop/index.ts" },
  ],
  rules: {
    "anti-slop/no-chained-type-assertions": "error",
    "anti-slop/no-conditional-empty-object-spread": "error",
    "anti-slop/no-known-value-widening": "error",
    "anti-slop/no-module-mocking": "error",
    "anti-slop/no-object-parameters": "error",
    "anti-slop/no-reflect-apply": "error",
    "anti-slop/no-reflect-get": "error",
    "anti-slop/no-runtime-typeof": ["error", { allowInTypeGuards: true }],
    "anti-slop/no-shape-in-symbol-names": "error",
    "anti-slop/no-unknown-parameters": "error",
    "anti-slop/no-unknown-returns": "error",
    "anti-slop/no-unknown-type-aliases": "error",
    "anti-slop/no-unsafe-dictionary-type": "error",
    "anti-slop/no-widen-then-assert": "error",
    "anti-slop/require-safety-comment-for-type-assertion": "error",
  },
});
