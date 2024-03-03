import { useState } from "react";

export default function Test() {
  const [state, setState] = useState(0);

  let x: number[] = [];
  const z: number[] = [];
  let y = state % 2 === 0 ? x : z;

  y.push(state);

  for (let i = 10, j = 5; j < i; j++) {
    y.push(123);
  }

  return (
    <div>
      <button onClick={() => setState(state + 1)}>Increment</button>
      {y[0]}
      <br />
      x: {JSON.stringify(x)}
      <br />
      y: {JSON.stringify(y)}
    </div>
  );
}
