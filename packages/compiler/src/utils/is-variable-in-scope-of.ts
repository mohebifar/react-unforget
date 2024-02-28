import { Binding, Scope } from "@babel/traverse";

export function isVariableInScopeOf(binding: Binding, scope: Scope) {
  const name = binding.identifier.name;

  return scope.getBinding(name) === binding;
}
