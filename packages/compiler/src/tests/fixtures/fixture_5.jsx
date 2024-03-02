import React, { useState } from "react";

export default function CounterWithMutationTracking() {
  const [state, setState] = useState(0);

  let text = "The number is: ";

  if (state % 2 === 0) {
    text += "even";
  } else {
    text += "odd";
  }

  return (
    <div>
      <button onClick={() => setState(state + 1)}>Increment</button>
      <div data-testid="state-printer">
        <span>Count: {state}</span> {text}
      </div>
    </div>
  );
}
