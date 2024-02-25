export function MyComponent() {
  const [state, setState] = useState(0);

  const myDerivedVariable = state + 1;

  const unusedVariable = 1;

  return <div>{myDerivedVariable}</div>;
}
