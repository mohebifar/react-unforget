export default function TestComponentWithConditionalJSXElement() {
  const array = null as null | number[];
  return (
    <div>
      {array && array.length > 0 ? (
        <ul>
          {array.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>No items</p>
      )}
    </div>
  );
}
