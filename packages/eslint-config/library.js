const { resolve } = require("node:path");

const project = resolve(process.cwd(), "tsconfig.json");

/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["prettier", "eslint-config-turbo"],
  globals: {
    React: true,
    JSX: true,
  },
  env: {
    node: true,
  },
  settings: {
    "import/resolver": {
      typescript: {
        project,
      },
    },
  },
  ignorePatterns: [
    // Ignore dotfiles
    ".*.js",
    "node_modules/",
    "dist/",
    "!src/**/*",
  ],
  overrides: [
    {
      files: ["*.js?(x)", "*.ts?(x)"],
      extends: [
        "plugin:@typescript-eslint/recommended",
        "plugin:import/recommended",
      ],
      rules: {
        "@typescript-eslint/consistent-type-imports": "error",
        "import/order": [
          "error",
          {
            pathGroups: [
              {
                pattern: "~/**",
                group: "external",
              },
            ],
          },
        ],
      },
    },
    {
      files: ["**/tests/**/*"],
      env: {
        jest: true,
      },
      rules: {
        "@typescript-eslint/no-explicit-any": "off",
      },
    },
  ],
};
