import { transform } from "@babel/standalone";
import { SandpackProvider } from "@codesandbox/sandpack-react";
import reactUnforgetBabelPlugin, {
  mermaidGraphFromComponent,
} from "@react-unforget/babel-plugin";

// @ts-ignore
import jsxBabelPlugin from "@babel/plugin-syntax-jsx";
import forgettiBabel from "forgetti";
import { useTheme } from "nextra-theme-docs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BeforeAfterCodeLayout } from "./BeforeAfterCodeLayout";
import { CodeEditorAndPreview } from "./CodeEditorAndPreview";
import { DynamicDependencyGraphViewer } from "./DynamicDependencyGraphViewer";

const indexFileContent = `
import { createRoot } from "react-dom/client";

import App from "./App";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

root.render(<App />);
`;

const defaultLoadingCode = `
export default function App() {
  return <div>Compiling...</div>;
}
`;

export interface LiveCodeProps {
  children: string;
  previewClassName?: string;
  plugin?: "unforget" | "forgetti";
}

function LiveCodeSandpack({
  children,
  previewClassName,
  plugin = "unforget",
}: LiveCodeProps) {
  const [beforeCode, setBeforeCode] = useState(children);
  const [afterCode, setAfterCode] = useState(defaultLoadingCode);
  const [mermaidSyntax, setMermaidSyntax] = useState<any>(null);
  const [viewDependencyGraph, setViewDependencyGraph] = useState(false);
  const handleToggleDependencyGraph = useCallback(() => {
    setViewDependencyGraph((prev) => !prev);
  }, []);
  const { theme } = useTheme();

  const transformCode = useCallback((content: string) => {
    const babelPluginToUse =
      plugin === "unforget" ? reactUnforgetBabelPlugin : forgettiBabel;
    const result = transform(content, {
      plugins: [
        jsxBabelPlugin,
        [
          babelPluginToUse,
          {
            preset: "react",
            _debug_onComponentAnalysisFinished: (component: any) => {
              setMermaidSyntax(mermaidGraphFromComponent(component));
            },
          },
        ],
      ],
    });

    return result?.code ?? "";
  }, []);

  const customSetup = useMemo(
    () => ({
      dependencies: {
        [plugin === "unforget" ? "@react-unforget/runtime" : "forgetti"]:
          "latest",
      },
    }),
    [],
  );

  const handleCodeChange = useCallback((newCode: string) => {
    setBeforeCode(newCode);
  }, []);

  useEffect(() => {
    try {
      const newCode = transformCode(beforeCode);

      setAfterCode(newCode ?? "");
    } catch (err) {
      console.error("error while transforming code", err);
    }
  }, [beforeCode]);

  const beforeFiles = useMemo(
    () => ({
      "/index.js": {
        code: indexFileContent,
      },
      "/App.js": {
        code: beforeCode,
      },
    }),
    [beforeCode],
  );

  const afterFiles = useMemo(
    () => ({
      "/index.js": {
        code: indexFileContent,
      },
      "/App.js": {
        code: afterCode,
      },
    }),
    [afterCode],
  );

  return (
    <div>
      <BeforeAfterCodeLayout
        before={
          <SandpackProvider
            template="react"
            files={beforeFiles}
            theme={theme === "system" || !theme ? "auto" : (theme as any)}
          >
            <CodeEditorAndPreview
              onChange={handleCodeChange}
              previewClassName={previewClassName}
            />
          </SandpackProvider>
        }
        after={
          <div className="relative">
            <SandpackProvider
              customSetup={customSetup}
              files={afterFiles}
              template="react"
              content={children}
              theme={theme === "system" || !theme ? "auto" : (theme as any)}
            >
              {plugin === "forgetti" ? (
                <div className="absolute left-0 right-0 top-0 z-10 bg-yellow-800 bg-opacity-90 px-4 py-2 font-bold">
                  The following editor is a preview of Forgetti not Unforget
                </div>
              ) : null}
              <CodeEditorAndPreview
                readOnly
                code={afterCode}
                previewClassName={previewClassName}
              />
            </SandpackProvider>
          </div>
        }
        afterTitle={
          plugin === "forgetti" ? (
            <span>
              <span className="text-yellow-500">Forgetti</span> Result
            </span>
          ) : undefined
        }
      />
      {plugin === "unforget" && (
        <details
          open={viewDependencyGraph}
          className="collapse mt-10 overflow-hidden rounded-lg border border-white/[0.08] bg-[#1d1c20]"
          onToggle={handleToggleDependencyGraph}
        >
          <summary className="collapse-title font-medium">
            Click here to {viewDependencyGraph ? "hide" : "view"} the dependency
            graph
          </summary>
          <div className="collapse-content">
            {viewDependencyGraph && (
              <DynamicDependencyGraphViewer mermaidSyntax={mermaidSyntax} />
            )}
          </div>
        </details>
      )}
    </div>
  );
}

export default LiveCodeSandpack;
