function useValue() {
  const [value, setValue] = useState(Math.random());
  useEffect(() => {
    const interval = setInterval(() => {
      setValue(Math.random());
    }, 1000);

    return () => clearInterval(interval);
  }, []);
  return value;
}

export function SimpleJSX() {
  const value = useValue();

  const valueWith2Decimal = value.toFixed(2);

  if (value > 0.8) {
    return <div>Loading because value is {valueWith2Decimal}...</div>;
  }

  const derivedValue = "state updated to: " + valueWith2Decimal;

  return (
    <div>
      <button>Hello</button>
      <div>{value}</div>
      <div>{derivedValue}</div>
    </div>
  );
}
