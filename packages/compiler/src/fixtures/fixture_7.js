export function SimpleJSX() {
  const value = useValue();

  return (
    <div>
      <button>Hello</button>
      <span>{value}</span>
    </div>
  );
}
