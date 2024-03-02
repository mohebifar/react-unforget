import React, { useState } from "react";

export default function CounterWithMutationTracking() {
  const [state, setState] = useState(0);

  let x = [];
  const z = [];
  let y = state % 2 === 0 ? x : z;
  y.push(state);

  return (
    <div>
      <button onClick={() => setState(state + 1)}>Increment</button>
      {y[0]}
      <p data-testid="output-printer">
        x: {JSON.stringify(x)}
        <br />
        y: {JSON.stringify(y)}
      </p>
    </div>
  );
}
