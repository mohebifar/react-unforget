import { encode } from "html-entities";
import type { Component } from "~/models/Component";
import type { ComponentSegment } from "~/models/segment/ComponentSegment";

export function mermaidGraphFromComponent(component: Component) {
  const rootSegment = component.getRootSegment();

  if (!rootSegment) {
    return "";
  }

  return printMermaidGraph(rootSegment);
}

function printMermaidGraph(root: ComponentSegment): string {
  const visited = new Map<ComponentSegment, string>();
  const graphLines: string[] = [
    "graph TD;",
    "classDef blockSegment fill:#5352ed,stroke:#333,stroke-width:2px;",
    "classDef rootChild stroke:#ff0000,stroke-width:2px;",
  ];
  let nodeIdCounter = 0;
  let subgraphCounter = 0;

  function getOrCreateNodeId(segment: ComponentSegment): string {
    if (!visited.has(segment)) {
      visited.set(segment, `node${++nodeIdCounter}`);
      const label = encode(segment.printCode().replace(/"/g, '\\"'));
      graphLines.push(
        `${visited.get(segment)}["<pre align="left">${label}</pre>"]`
      );
    }
    return visited.get(segment)!;
  }

  function traverse(node: ComponentSegment) {
    const nodeId = getOrCreateNodeId(node);
    const isRootChild = node.getParent() === root;

    if (node.getChildren().size > 0) {
      const subgraphId = `SG${++subgraphCounter}`;
      graphLines.push(`subgraph ${subgraphId}`);
      for (const child of node.getChildren()) {
        traverse(child);
      }
      graphLines.push("end");
      graphLines.push(`${nodeId} -.-> ${subgraphId}`);
      graphLines.push(`class ${nodeId} blockSegment`);
    }

    if (isRootChild) {
      graphLines.push(`class ${nodeId} rootChild`);
    }

    for (const dep of node.getDependencies()) {
      const depId = getOrCreateNodeId(dep.segment);
      graphLines.push(`${depId} --> ${nodeId}`);
    }
  }

  traverse(root);

  return graphLines.join("\n");
}
