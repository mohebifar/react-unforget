import { useState } from "react";

export default function TestComponentWithFunctionDeclaration() {
  const [state, setState] = useState(0);

  function handleClick() {
    setState(state + 1);
  }

  return (
    <div>
      <h1>TestComponent</h1>
      <button onClick={handleClick}>Click me</button>
    </div>
  );
}
