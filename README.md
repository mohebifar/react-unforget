# React Unforget

React Unforget is a compiler designed to enhance the performance of React applications through intelligent memoization and optimization. By analyzing and transforming React components and hooks, React Unforget aims to reduce unnecessary re-renders and optimize the execution flow, thus bridging the performance gap with more efficient frameworks like Svelte.

For demos and more information, visit the [official website](https://react-unforget.vercel.app/).

### How It Works

The transformation process involves two main steps:

1. **Computing Dependency Graph:** The initial step involves creating a segment from the root block statement and performing a dependency graph traversal to understand the interdependencies between various code segments.

2. **Transforming Segments:** Based on the dependency graph, code segments are transformed to optimize their execution and reduce unnecessary computations.

### Features

- **Intelligent component and hook memoization**: Automatically identifies and memoizes React components and hooks, ensuring that only necessary re-renders occur. This leads to a more performant yet with more readable code.
- **Granular JSX element unwrapping**: Unwraps JSX elements and memoizes each element and expression separately for more effective optimization. Eliminiating the need to use `React.memo`.
- **Memoization beyond early returns**: React Unforget uniquely enables the memoization of values even after early returns in component functions, eliminating the need to restructure your code to comply with the Rules of Hooks. This ensures optimization without altering the logical flow of your components.

## Comparison with React Compiler

React Compiler (Forget) is still under development and its release date remains uncertain. React Unforget offers an alternative approach to optimizing React applications, similar to how Preact serves as an alternative to React. It not only provides a fallback option but also pushes the boundaries of what's possible within the React ecosystem, encouraging innovation and diversity in optimization techniques.

## License

React Unforget is open-source software licensed under the MIT license. Feel free to use, modify, and distribute it as per the license terms.
