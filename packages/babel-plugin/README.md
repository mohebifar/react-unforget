# `@react-unforget/babel-plugin`

To use the babel plugin, you need to install it and add it to your Babel configuration.

```sh
npm install --save-dev @react-unforget/babel-plugin
```

Then, add it to your Babel configuration. For example, in your `.babelrc`:

```json
{
  "plugins": ["@react-unforget/babel-plugin"]
}
```

## Options

The babel plugin accepts a few options:

- `throwOnFailure` (default: `false`): If `true`, the plugin will throw an error if it fails to analyze the component / hook.
- `skipComponents` (default: `[]`): An array of component names to skip. For example, `["MyComponent"]`.
- `skipComponentsWithMutation` (default: `false`): If `true`, the plugin will skip components that have variables that are mutated e.g. `array.push()` or variable re-assignment. This is configurable because despite thorough testing, we are still not 100% sure that this is safe to do in all cases.
