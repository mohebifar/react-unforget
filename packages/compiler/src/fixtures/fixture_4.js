function double(n) {
  return n * 2;
}

export function MyComponent({ someProp }) {
  const [count, setCount] = useState(0);

  const doubleCount = double(count);

  return (
    <div>
      Hello! Current count is {count} and its double is {doubleCount}
      <br />
      The prop is {someProp}
      <br />
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={() => setCount(count - 1)}>Decrement</button>
    </div>
  );
}
