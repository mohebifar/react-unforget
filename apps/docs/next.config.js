const withNextra = require("nextra")({
  theme: "nextra-theme-docs",
  themeConfig: "./theme.config.jsx",
});

/** @type {import('next').NextConfig} */
module.exports = {
  transpilePackages: [],
  ...withNextra(),
};
