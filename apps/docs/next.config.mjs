import nextra from "nextra";

const withNextra = nextra({
  theme: "nextra-theme-docs",
  themeConfig: "./theme.config.jsx",
});

export default withNextra({
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
});
