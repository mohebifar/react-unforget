export default function TestComponentWithConditionalJSXElement() {
  const array = null as null | number[];
  const someJsx = <main />;
  const anotherJsx = <main />;

  return <div>{(array?.length || someJsx) ?? anotherJsx}</div>;
}
