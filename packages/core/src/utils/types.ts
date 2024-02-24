import t from "@babel/types";

export type FunctionType =
  | t.FunctionDeclaration
  | t.ArrowFunctionExpression
  | t.FunctionExpression;
