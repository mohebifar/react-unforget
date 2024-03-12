import type { Binding } from "@babel/traverse";

export function preserveReferences(binding: Binding) {
  const oldReferences = binding.referencePaths.slice();
  const oldScope = binding.scope;
  const oldName = binding.identifier.name;
  oldScope.removeBinding(oldName);

  return (newScope = oldScope) => {
    const newBinding = newScope.getBinding(oldName);

    if (newBinding) {
      oldReferences.forEach((reference) => {
        newBinding.reference(reference);
      });
    } else {
      throw new Error("Binding not found");
    }
  };
}
