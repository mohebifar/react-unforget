/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["@react-unforget/eslint-config/library.js"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: true,
    tsConfigRootDir: __dirname,
  },
  ignorePatterns: ["src/fixtures/**/*.js"],
};
