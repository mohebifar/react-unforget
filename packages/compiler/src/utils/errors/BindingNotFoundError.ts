export class BindingNotFoundError extends Error {
  constructor(name: string) {
    super("Could not find binding for " + name);
  }
}
