import React, { useState } from "react";

export default function CounterWithEarlyReturn() {
  const [state, setState] = useState(0);

  if (state % 2 === 0) {
    return (
      <div>
        We're inside the early return
        <button onClick={() => setState(state + 1)}>Increment</button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => setState(state + 1)}>Increment</button>
      <div>
        <span>Count: {state}</span>
      </div>
    </div>
  );
}
