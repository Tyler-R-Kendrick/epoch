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
      // Reproducible browser bundles are linted at their TypeScript sources and
      // guarded by nightboard:build:check, like graphql-engine.js above.
      "docs/design-explorations/nightboard/community-core-runtime.js",
      "docs/design-explorations/nightboard/community-search-worker.js",
      "docs/design-explorations/nightboard/community-sqlite-worker.js",
      // Vendored from CanvasUI and bundled; see its header for how to rebuild.
      "docs/design-explorations/nightboard/asciify.js",
      "docs/design-explorations/nightboard/canvasui-fx.js",
      "docs/design-explorations/nightboard/canvasui-object.js",
      // Installed Canvas UI vanilla sources (shadcn registry); lint upstream, not here.
      "components/canvasui/**",
      ".agents/**",
      // Vendored agent-skill trees installed by `npx impeccable install`.
      // Third-party source, reproducible from the devDependency, not ours to lint.
      ".claude/**",
      ".codex/**",
      ".github/skills/**",
      ".github/agents/**",
      ".github/hooks/**",
      ".grok/**",
      // Python virtualenvs (e.g. skills/gauntlet-loop/.venv) contain vendored
      // JS assets from installed packages; never repository source.
      "**/.venv/**"
    ]
  },
  js.configs.recommended,
  {
    // Design-exploration galleries are browser documents loaded by <script>,
    // not modules: they legitimately read window and define no exports.
    files: ["docs/design-explorations/**/*.js"],
    ignores: ["docs/design-explorations/nightboard/landing-fx.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        window: "readonly", document: "readonly", location: "readonly", history: "readonly",
        addEventListener: "readonly", setInterval: "readonly", setTimeout: "readonly",
        clearInterval: "readonly", clearTimeout: "readonly", AbortController: "readonly",
        URL: "readonly", File: "readonly", FileReader: "readonly", Blob: "readonly",
        crypto: "readonly", localStorage: "readonly", sessionStorage: "readonly",
        MouseEvent: "readonly", PointerEvent: "readonly", KeyboardEvent: "readonly",
        navigator: "readonly", requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly", performance: "readonly",
        MediaStream: "readonly", BroadcastChannel: "readonly",
        DOMException: "readonly", Promise: "readonly",
        getComputedStyle: "readonly", Date: "readonly",
        ResizeObserver: "readonly", MutationObserver: "readonly",
        devicePixelRatio: "readonly",
        // Chrome's built-in Prompt API. Feature-detected at every call site.
        LanguageModel: "readonly",
      },
    },
  },
  {
    // Landing Canvas UI orchestrator is an ES module (imports object bundle).
    files: ["docs/design-explorations/nightboard/landing-fx.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        window: "readonly", document: "readonly",
        setInterval: "readonly", setTimeout: "readonly",
        clearInterval: "readonly", clearTimeout: "readonly",
        MutationObserver: "readonly", URL: "readonly",
        matchMedia: "readonly",
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
      "docs/design-explorations/**/e2e.mjs",
      "docs/design-explorations/**/serve.mjs",
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        Buffer: "readonly",
        Request: "readonly",
        console: "readonly",
        process: "readonly",
        URL: "readonly",
        File: "readonly",
        FileReader: "readonly",
        Blob: "readonly",
        crypto: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        MouseEvent: "readonly",
        PointerEvent: "readonly",
        KeyboardEvent: "readonly",
        WheelEvent: "readonly",
        document: "readonly",
        window: "readonly",
        getComputedStyle: "readonly",
        Event: "readonly",
        setTimeout: "readonly",
        navigator: "readonly",
      },
    },
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
