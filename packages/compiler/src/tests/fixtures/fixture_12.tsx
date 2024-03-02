import { useState } from "react";

function Comp({ a, b }: { a: number; b: number }) {
  const x = [];

  x.push(a);

  const y = x;

  y.push(b);

  return <div>n: {x.join(",")}</div>;
}

export default function App() {
  const [state, setState] = useState(2);

  return (
    <div>
      <Comp a={3} b={state} />
      <button onClick={() => setState((p) => p + 1)}>click</button>
    </div>
  );
}
