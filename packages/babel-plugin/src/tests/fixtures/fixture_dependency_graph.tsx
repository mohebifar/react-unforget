import { useState } from "react";

export default function Test({ a, b }: { a: number; b: number }) {
  const [state, setState] = useState(0);

  let x: number[] = [];
  const z: number[] = [];
  let y = state % 2 === 0 ? x : z;

  y.push(state);

  for (let i = 10, [j, k] = [5, 6]; j < i; j++) {
    y.push(i + j * b);
  }

  for (let i = 10; i < 10; i++) {
    y.push(i);
  }

  const m = y;

  for (let i = state; i < 10; i++) {
    m.push(i);
  }

  console.log("Hello world");

  return (
    <div>
      {state} {a}{" "}
      <button onClick={() => setState((p) => p + 1)}>Click here</button>
      <ul>
        <li>{JSON.stringify(y)}</li>
        <li>{JSON.stringify(x)}</li>
        <li>{JSON.stringify(z)}</li>
      </ul>
    </div>
  );
}
