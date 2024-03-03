import { useState } from "react";

const numbers1 = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const numbers2 = numbers1.filter((number) => number % 2 === 0);

export default function UserList() {
  const [numbers, setNumbers] = useState(numbers1);

  const filteredNumbers = [];
  for (let i = 0; i < numbers.length; i++) {
    const currentN = numbers[i];
    if (i % 2 === 0) {
      filteredNumbers.push(currentN);
    }
  }

  const handleUserClick = () => {
    setNumbers((p) => (numbers1 === p ? numbers2 : numbers1));
  };

  return (
    <div>
      <button onClick={handleUserClick}>Toggle even ones</button>
      <ul>
        {filteredNumbers.map((n) => (
          <div key={n}>{n}</div>
        ))}
      </ul>
    </div>
  );
}
