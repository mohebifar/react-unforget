export function MyComponent() {
  const value = "user";
  return <div>Loading {value}...</div>;

  console.log("unreachable");

  return null;
}
