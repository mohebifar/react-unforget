export function SimpleJSX() {
  const value = useValue();

  if (value === "loading") {
    return <div>Loading...</div>;
  }

  return <span />;
}
