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
      ".agents/**"
    ]
  },
  js.configs.recommended,
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        URL: "readonly"
      }
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
