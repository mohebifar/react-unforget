import React from "react";

export default function App() {
  const a = [];
  a.push(1);

  const b = a;
  b.push(2);

  return <div>{a[1]}</div>;
}
