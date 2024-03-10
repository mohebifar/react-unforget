"use client";

import { useEffect, useRef, useState } from "react";

interface DependencyGraphViewerProps {
  mermaidSyntax: string;
}

function createNodeFromHTML(svgString: string) {
  var div = document.createElement("div");
  div.innerHTML = svgString.trim();

  return div.firstElementChild as SVGElement;
}

type MermaidDefault = (typeof import("mermaid"))["default"];
type SvgPanZoomDefault = typeof import("svg-pan-zoom");

const DependencyGraphViewer = ({
  mermaidSyntax,
}: DependencyGraphViewerProps) => {
  const container = useRef<HTMLDivElement>(null);

  const [modules, setModules] = useState<
    [MermaidDefault, SvgPanZoomDefault] | null
  >(null);

  useEffect(() => {
    Promise.all([import("mermaid"), import("svg-pan-zoom")]).then(
      ([mermaidModule, svgPanZoomModule]) => {
        mermaidModule.default.initialize({
          startOnLoad: true,
          theme: "dark",
        });

        setModules([mermaidModule.default, svgPanZoomModule.default]);
      },
    );
  }, []);

  useEffect(() => {
    if (mermaidSyntax && container.current && modules) {
      const [mermaid, svgPanZoom] = modules;
      (async () => {
        const { svg } = await mermaid.render("mermaidGraph", mermaidSyntax);

        while (container.current.hasChildNodes()) {
          container.current.removeChild(container.current.lastChild);
        }

        const svgNode = createNodeFromHTML(svg);
        svgNode.setAttribute("height", "100%");
        container.current.appendChild(svgNode);

        svgPanZoom(svgNode, {
          controlIconsEnabled: true,
        });
      })();
    }
  }, [mermaidSyntax, modules]);

  return (
    <div>
      <p className="mb-6 text-sm">
        Below is a visual representation of the dependency graph that React
        Unforget's compiler sees to ultimately optimize your code.
      </p>
      <div ref={container} className="h-[600px] w-full" />
    </div>
  );
};

export default DependencyGraphViewer;
