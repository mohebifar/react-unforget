export function MyComponent() {
  const value = [];

  let i = 2;
  const k = "hi";

  value.push(...["Hello", "World", i]);

  const m = i;

  if (m === 2) {
    return null;
  }

  return <div>{value[0]}</div>;
}
