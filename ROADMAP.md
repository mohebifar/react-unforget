# Roadmap

Type: `Feature` - `Bug` - `Enhancement` - `Refactor` - `Unknown`

## Compiler

- [x] `Enhancement` For member expression dependency checks, optimize the check by only checking the last member
- [x] `Enhancement` Memoize any non-primitive value used in JSX
- [x] `Enhancement` Support memoization of object destructuring
- [x] `Enhancement` Unwrap JSX elements into memoizable variables
- [x] `Enhancement` Support components with multiple returns
- [x] `Enhancement` Support side-effect for dependencies
- [x] `Feature` Support transforming hooks
- [ ] `Enhancement` Support memoization of callbacks declared using function declarations after

### Low Priority

- [ ] `Enhancement` Skip memoization of useState setter functions
- [ ] `Enhancement` When unwrapping array and object patterns, optimize the unwrapping by limiting it to component variables
- [ ] `Enhancement` Support React.createElement calls
- [x] ~`Enhancement` Hot module reloading improvement utilizing a checksum to invalidate cache~ Not needed
- [ ] `Feature` Memoize array map items

## `Feature` ESLint Plugin

Make an ESLint enforcing certain rules to maximize efficiency of the React Unforget.

- [ ] `Feature` Ensure component functions are not anonymous/unnamed
- [ ] `Feature` Disallow assignment expressions in JSX expressions

## Unknowns

The following are unknowns that need to be researched and tested.

- [ ] Assignment expressions in JSX `<div>{(a = 1)} {a}</div>` - is the order of execution guaranteed?
- [ ] Source maps - is it possible to generate source maps for the transformed code?
- [x] ~Hot reloading - how does hot reloading work with the transformed code?~ It works!
