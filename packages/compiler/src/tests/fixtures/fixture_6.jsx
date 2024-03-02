import React, { useState } from "react";

function InnerComponentWithProps({ count, text }) {
  return (
    <div data-testid="state-printer">
      <span>Count: {count}</span> {text}
    </div>
  );
}

export default function CounterWithInnerComponents() {
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
      <InnerComponentWithProps count={state} text={text} />
    </div>
  );
}
