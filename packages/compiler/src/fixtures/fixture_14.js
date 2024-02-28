export function MyComponent() {
  const a = useValue();

  return (
    <div>
      {a.b} {a.b.c}
    </div>
  );
}
