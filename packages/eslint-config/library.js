const { resolve } = require("node:path");

const project = resolve(process.cwd(), "tsconfig.json");

/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [
    "plugin:@typescript-eslint/recommended",
    "prettier",
    "eslint-config-turbo",
  ],
  plugins: ["only-warn"],
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
