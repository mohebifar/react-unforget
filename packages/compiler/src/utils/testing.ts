import * as babel from "@babel/core";
import type * as t from "@babel/types";
import * as generateBase from "@babel/generator";
import traverse from "@babel/traverse";

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

export function generate(path: babel.types.Node) {
  return generateBase.default(path).code;
}
