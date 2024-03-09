import * as fs from "fs";
import * as path from "path";
import * as babel from "@babel/core";
import * as generateBase from "@babel/generator";
import traverse from "@babel/traverse";
import type * as t from "@babel/types";
import { visitProgram } from "~/visit-program";
import { mermaidGraphFromComponent } from "~/utils/misc/mermaid-graph-from-component";
import babelPlugin from "../index";

const babelTransformOptions = {
  plugins: [
    ["@babel/plugin-transform-typescript", { isTSX: true }],
    babelPlugin,
  ],
} satisfies babel.TransformOptions;

export function transformWithCore(input: string) {
  const { code } = babel.transform(input, babelTransformOptions)!;
  return code;
}

export function transformForJest(input: string, filename: string) {
  const { code } = babel.transformSync(input, {
    ...babelTransformOptions,
    sourceMaps: "both",
    compact: false,
    presets: [["@babel/preset-react", { runtime: "automatic" }], "jest"],
    filename,
    plugins: [
      ...babelTransformOptions.plugins,
      "@babel/plugin-transform-modules-commonjs",
    ],
  })!;
  return code;
}

export function transformWithParseAndCast(input: string) {
  const root = parse(input);

  visitProgram(root);

  return String(root);
}

export function parse(input: string) {
  const ast = babel.parse(input, babelTransformOptions)!;

  let result: babel.NodePath<t.Program> | null = null;
  traverse(ast, {
    enter(path) {
      result = path as babel.NodePath<t.Program>;
      path.skip();
    },
  });

  return result!;
}

export function loadFixture(fixturePath: string) {
  const fixture = path.resolve(
    __dirname,
    "../tests/fixtures",
    fixturePath + ".tsx"
  );

  const fileContent = fs.readFileSync(fixture, "utf-8");

  return fileContent;
}

export function parseFixture(fixturePath: string) {
  return parse(loadFixture(fixturePath));
}

export function generate(path: babel.types.Node) {
  return generateBase.default(path).code;
}

export { mermaidGraphFromComponent };
