"use client";
import React from "react";
import {
  TextRevealCard,
  TextRevealCardDescription,
  TextRevealCardTitle,
} from "./ui/text-reveal-card";
import { encode } from "html-entities";

const oldCode = `const UglyComponent = memo(() => {
  const data = useData();
  const filteredData = useMemo(() => {
    const items = [];
    for (let i = 0; i < 1000000000; i++) {
      items.push(data[i]);
    }
  }, [data]);
  
  const someComplexJsx = useMemo(() => (
    <>
      <DependentComponent1 data={filteredData} />
      {/* ... */}
    </>
  ), [dependency1, dependency2, filteredData]);

  return <div>{someComplexJsx}</div>;
});
`;

/*
const NiceComponent = () => {
  const data = useData();
  const filteredData = [];

  for (let i = 0; i < 1000000000; i++) {
    filteredData.push(data[i]);
  }

  return (
    <div>
      <DependentComponent1 data={filteredData} />
      {/* ... *}
    </div>
  );
}
*/
const newCode = `<span class="text-blue-400">const</span> NiceComponent = () => {
  <span class="text-blue-400">const</span> data = <span class="text-pink-400">useData</span>();
  <span class="text-blue-400">const</span> filteredData = [];

  <span class="text-green-400">for</span> (<span class="text-blue-400">let</span> i = <span class="text-yellow-400">0</span>; i &lt; <span class="text-yellow-400">1000000000</span>; i++) {
    filteredData.<span class="text-purple-400">push</span>(data[i]);
  }

  
  <span class="text-green-400">return</span> (
    <span class="text-red-400">&lt;div&gt;</span>
      <span class="text-red-400">&lt;DependentComponent1</span> <span class="text-orange-400">data=</span><span class="text-yellow-400">{filteredData}</span> <span class="text-red-400">/&gt;</span>
      <span class="text-gray-400">{/* ... */}</span>
    <span class="text-red-400">&lt;/div&gt;</span>
  );
}\n\n
`;

export const OldAndNewCodeReveal = () => {
  return (
    <div className="flex items-center justify-center my-10 rounded-2xl w-full">
      <TextRevealCard text={encode(oldCode)} revealText={newCode}>
        <TextRevealCardTitle>
          You don't need all that clutter!
        </TextRevealCardTitle>
        <TextRevealCardDescription>
          👋 Wave goodbye to clutter! Shed the excess and use React Unforget
          instead.
        </TextRevealCardDescription>
      </TextRevealCard>
    </div>
  );
};
