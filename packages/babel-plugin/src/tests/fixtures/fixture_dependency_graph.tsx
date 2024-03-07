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

  return (
    <div>
      {state} {y[0]} {a} <button>Click here</button> {y[0]}
    </div>
  );
}
