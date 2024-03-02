import { useState } from "react";

export default function Counter() {
  const [state, setState] = useState(0);

  return (
    <div>
      <button onClick={() => setState(state + 1)}>Increment</button>
      <div>
        <span data-testid="state-printer">Count: {state}</span>
      </div>
    </div>
  );
}
