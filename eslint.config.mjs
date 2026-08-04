import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "coverage/**",
      "dist/**",
      "**/dist-server/**",
      "**/dist/**",
      "node_modules/**",
      ".inspiration/**",
      "docs/design-explorations/nightboard/openui-parser.js",
      "docs/design-explorations/nightboard/graphql-engine.js",
      "docs/design-explorations/nightboard/openui-library.js",
      // Vendored from CanvasUI and bundled; see its header for how to rebuild.
      "docs/design-explorations/nightboard/asciify.js",
      ".agents/**",
      // Vendored agent-skill trees installed by `npx impeccable install`.
      // Third-party source, reproducible from the devDependency, not ours to lint.
      ".claude/**",
      ".codex/**",
      ".github/skills/**",
      ".github/agents/**",
      ".github/hooks/**",
      ".grok/**"
    ]
  },
  js.configs.recommended,
  {
    // Design-exploration galleries are browser documents loaded by <script>,
    // not modules: they legitimately read window and define no exports.
    files: ["docs/design-explorations/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        window: "readonly", document: "readonly", location: "readonly", history: "readonly",
        addEventListener: "readonly", setInterval: "readonly", setTimeout: "readonly",
        clearInterval: "readonly", clearTimeout: "readonly", AbortController: "readonly",
        DOMException: "readonly", Promise: "readonly",
        navigator: "readonly", getComputedStyle: "readonly", Date: "readonly",
        ResizeObserver: "readonly", devicePixelRatio: "readonly",
        // Chrome's built-in Prompt API. Feature-detected at every call site.
        LanguageModel: "readonly",
      },
    },
  },
  {
    files: [
      "scripts/**/*.mjs",
      "packages/**/scripts/**/*.mjs",
      // Node tooling for the design explorations. faults.mjs is a Node script
      // whose page.evaluate callbacks are browser code, so it needs both.
      "docs/design-explorations/**/build-*.mjs",
      "docs/design-explorations/**/faults.mjs",
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        Buffer: "readonly",
        Request: "readonly",
        console: "readonly",
        process: "readonly",
        URL: "readonly"
      , document: "readonly", window: "readonly", getComputedStyle: "readonly", Event: "readonly", setTimeout: "readonly"}
    }
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        Buffer: "readonly",
        console: "readonly",
        process: "readonly",
        require: "readonly",
        module: "readonly",
        __dirname: "readonly"
      }
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }]
    }
  },
  {
    files: ["samples/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        document: "readonly",
        localStorage: "readonly",
        window: "readonly"
      }
    }
  }
];
