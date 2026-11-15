import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: ["dist", "coverage", "playwright-report", "test-results"],
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.vitest,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "error",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  {
    // Feature architecture: views -> viewmodels -> model/api (see .github/skills/frontend-architecture)
    files: ["src/features/*/model/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "react",
                "react-dom",
                "react-router-dom",
                "axios",
                "@tanstack/*",
                "**/api",
                "**/viewmodels/**",
                "**/views/**",
                "**/shared/http/httpClient",
                "**/shared/storage/**",
              ],
              message:
                "model/ holds pure operations: no React, I/O, gateways, view models or views.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/features/*/viewmodels/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/views/**", "**/components/**"],
              message: "View models must not depend on views or components.",
            },
            {
              group: ["axios", "**/shared/http/httpClient"],
              message: "Reach the server through the feature api.ts gateway.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/features/*/views/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["axios", "**/api", "**/shared/http/httpClient", "**/shared/storage/**"],
              message: "Views render props from a view model; they do not call gateways directly.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/shared/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/features/**", "**/components/**"],
              message: "shared/ must not depend on features.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/{components,app}/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/features/*/**"],
              message: "Import a feature only through its index.ts.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
  },
];
