import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: [
      "coverage",
      "line_dance.db",
      "dance_groups.db",
      "**/*.db",
      "test-temp",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.vitest,
      },
    },
    rules: {
      "no-console": "off",
      "no-unused-vars": "warn",
    },
  },
];
