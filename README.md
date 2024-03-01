# React Unforget

React Unforget is a compiler designed to enhance the performance of React applications through intelligent memoization and optimization. By analyzing and transforming React components and hooks, React Unforget aims to reduce unnecessary re-renders and optimize the execution flow, thus bridging the performance gap with more efficient frameworks like Svelte.

For demos and more information, visit the [official website](https://react-unforget.vercel.app/).

### How It Works

The transformation process involves two main steps:

1. **Computing Dependency Graph:** The initial step involves creating a segment from the root block statement and performing a dependency graph traversal to understand the interdependencies between various code segments.

2. **Transforming Segments:** Based on the dependency graph, code segments are transformed to optimize their execution and reduce unnecessary computations.

### Features

- **Intelligent Memoization:** React Unforget unwraps JSX elements and memoizes each element and expression separately, leading to more granular and effective memoization.

- **Dependency Graph Computation:** It builds a comprehensive dependency graph that captures the relationships between different code segments, ensuring that transformations are done with a full understanding of the codebase.

- **Optimized Transformation:** Through a topological sort and depth-first search, segments are transformed in an optimized order, replacing variables and expressions with their memoized counterparts to reduce re-renders.

- **Custom Cache Hook:** Utilizes a custom hook `useCreateCache$unforget` from `@react-unforget/runtime` to manage state and cache effectively, ensuring that components only re-render when necessary.

## Comparison with React Compiler

React Compiler (Forget) is still under development and its release date remains uncertain. React Unforget offers an alternative approach to optimizing React applications, similar to how Preact serves as an alternative to React. It not only provides a fallback option but also pushes the boundaries of what's possible within the React ecosystem, encouraging innovation and diversity in optimization techniques.

## Contributing

We welcome contributions from the community! Whether you're interested in fixing bugs, adding new features, or improving documentation, your help is appreciated. Please refer to our contributing guidelines for more information on how to get involved.

## License

React Unforget is open-source software licensed under the MIT license. Feel free to use, modify, and distribute it as per the license terms.
