import { useState } from "react";

export default function CounterWithEarlyReturnWithoutDirectlyUsingTheVariableInJSX() {
  const [state, setState] = useState(0);

  if (state % 2 === 1) {
    return <div>We're inside the early return</div>;
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
