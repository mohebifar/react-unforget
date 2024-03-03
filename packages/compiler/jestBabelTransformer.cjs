const crypto = require("crypto");

module.exports = {
  getCacheKey() {
    // We don't want to cache the transformation result
    return crypto.randomBytes(10);
  },
  process(sourceText, sourcePath) {
    const transformedCode =
      require("./dist/utils/testing.cjs").transformForJest(
        sourceText,
        sourcePath
      );

    return {
      code: transformedCode,
    };
  },
};
