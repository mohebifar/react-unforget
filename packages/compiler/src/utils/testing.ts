import * as babel from "@babel/core";
import * as generateBase from "@babel/generator";
import traverse from "@babel/traverse";
import type * as t from "@babel/types";
import * as fs from "fs";
import * as path from "path";

export function transform(
  input: string,
  extraPlugins: babel.PluginItem[] = []
) {
  const { code } = babel.transform(input, {
    configFile: false,
    plugins: ["@babel/plugin-syntax-jsx", ...extraPlugins],
  })!;
  return code;
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

export function parseFixture(fixturePath: string) {
  const fixture = path.resolve(__dirname, "../fixtures", fixturePath + ".js");

  const fileContent = fs.readFileSync(fixture, "utf-8");

  return parse(fileContent);
}

export function generate(path: babel.types.Node) {
  return generateBase.default(path).code;
}
