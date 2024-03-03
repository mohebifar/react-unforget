import type * as babel from "@babel/core";
import * as t from "@babel/types";
import { RUNTIME_MODULE_CACHE_ENQUEUE_METHOD_NAME } from "~/utils/constants";

export function makeCacheEnqueueCallStatement(
  accessorExpression: babel.types.Expression,
  name: string,
): babel.types.ExpressionStatement {
  return t.expressionStatement(
    t.callExpression(
      t.memberExpression(
        accessorExpression,
        t.identifier(RUNTIME_MODULE_CACHE_ENQUEUE_METHOD_NAME),
      ),
      [t.identifier(name)],
    ),
  );
}
