# Roadmap

Type: `Feature` - `Bug` - `Enhancement` - `Refactor` - `Unknown`

## Compiler

- [x] `Enhancement` For member expression dependency checks, optimize the check by only checking the last member
- [ ] `Enhancement` Memoize any non-primitive value used in jsx
- [ ] `Enhancement` Unwrap JSX elements into memoizable variables
- [ ] `Enhancement` Support memoization of object destructuring
- [ ] `Enhancement` Support memoization of callbacks declared using function declarations
- [ ] `Enhancement` Support side-effect for dependencies
- [ ] `Enhancement` Skip memoization of useState setter functions
- [ ] `Enhancement` When unwrapping array and object patterns, optimize the unwrapping by limiting it to component variables
- [ ] `Feature` Memoize array map items
- [ ] `Unknown` Make sure source maps are properly generated and usable

## `Feature` ESLint Plugin

Make an ESLint enforcing certain rules to maximize efficiency of the React Unforget.

- [ ] `Feature` Ensure component functions are not anonymous/unnamed
