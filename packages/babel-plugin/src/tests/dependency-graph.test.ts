import { mermaidGraphFromComponent } from "~/utils/misc/mermaid-graph-from-component";
import { findComponents } from "~/utils/path-tools/find-components";
import { parseFixture } from "~/utils/testing";

describe("dependency graph", () => {
  it("fixture_dependency_graph", () => {
    const path = parseFixture("fixture_dependency_graph");
    const components = findComponents(path);

    const mermaidGraphs: string[] = [];

    const componentCodes: string[] = [];

    components.forEach((component) => {
      component.analyze();

      mermaidGraphs.push(mermaidGraphFromComponent(component));
      componentCodes.push(component.path.toString());
    });

    expect(mermaidGraphs).toMatchSnapshot();
    expect(componentCodes).toMatchSnapshot();
  });
});
