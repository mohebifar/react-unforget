import React, { useState } from "react";

export default function CounterWithEarlyReturnWithoutDirectlyUsingTheVariableInJSX() {
  const [state, setState] = useState(0);

  if (state % 2 === 1) {
    return <div>We're inside the early return</div>;
  }

  const newValue = state + 1;

  return (
    <div>
      <button onClick={() => setState(state + 1)}>Increment</button>
      <div>
        <span>Count: {newValue}</span>
      </div>
    </div>
  );
}
