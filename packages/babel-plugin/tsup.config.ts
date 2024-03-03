import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/main.ts", "src/utils/testing.ts"],
  splitting: false,
  sourcemap: true,
  clean: true,
  bundle: true,
  dts: true,
  format: ["cjs", "esm"],
  external: [
    "@babel/parser",
    "@babel/standalone",
    "@babel/traverse",
    "@babel/core",
    "babel-plugin-jest",
    "babel-plugin-jest-hoist",
    "babel-preset-current-node-syntax",
  ],
});
