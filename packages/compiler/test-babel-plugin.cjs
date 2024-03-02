/* eslint-disable @typescript-eslint/no-var-requires */
const { visitProgram } = require("./dist/main.cjs");

module.exports = function asyncBabelPlugin() {
  return {
    visitor: {
      Program(path) {
        visitProgram(path);
      },
    },
  };
};
