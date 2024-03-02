import * as standalone from "@babel/standalone";
import * as babel from "@babel/core";
import * as generateBase from "@babel/generator";
import traverse from "@babel/traverse";
import type * as t from "@babel/types";
import * as fs from "fs";
import * as path from "path";
import { visitProgram } from "~/visit-program";
// @ts-expect-error The module has no types
import babelJsxPlugin from "@babel/plugin-syntax-jsx";

export function transformWithStandalone(input: string) {
  const { code } = standalone.transform(input, {
    configFile: false,
    plugins: [
      babelJsxPlugin,
      {
        visitor: {
          Program: (path: babel.NodePath<t.Program>) => {
            visitProgram(path);
            path.skip();
          },
        },
      },
    ],
  })!;
  return code;
}

export function transformWithCore(input: string) {
  const { code } = babel.transform(input, {
    configFile: false,
    plugins: [
      babelJsxPlugin,
      {
        visitor: {
          Program: (path: babel.NodePath<t.Program>) => {
            visitProgram(path);
          },
        },
      },
    ],
  })!;
  return code;
}

export function transformWithParseAndCast(input: string) {
  const root = parse(input);

  visitProgram(root);

  return String(root);
}

export function parse(input: string, extraPlugins: babel.PluginItem[] = []) {
  const ast = babel.parse(input, {
    configFile: false,
    plugins: ["@babel/plugin-syntax-jsx", ...extraPlugins],
  })!;

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
  const fixture = path.resolve(__dirname, "../tests/fixtures", fixturePath + ".jsx");

  const fileContent = fs.readFileSync(fixture, "utf-8");

  return fileContent;
}

export function parseFixture(fixturePath: string) {
  return parse(loadFixture(fixturePath));
}

export function generate(path: babel.types.Node) {
  return generateBase.default(path).code;
}
