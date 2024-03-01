import { transform } from "@babel/standalone";
import { SandpackProvider } from "@codesandbox/sandpack-react";
// @ts-ignore
import reactUnforgetBabelPlugin from "@react-unforget/babel-plugin";
import { MoveRight } from "lucide-react";
// @ts-ignore
import jsxBabelPlugin from "@babel/plugin-syntax-jsx";
import { useTheme } from "nextra-theme-docs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CodeEditorAndPreview } from "./CodeEditorAndPreview";

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
}

function transformCode(content: string) {
  const result = transform(content, {
    plugins: [jsxBabelPlugin, reactUnforgetBabelPlugin],
  });

  return result?.code ?? "";
}

function LiveCodeSandpack({ children, previewClassName }: LiveCodeProps) {
  const [beforeCode, setBeforeCode] = useState(children);
  const [afterCode, setAfterCode] = useState(defaultLoadingCode);
  const { theme } = useTheme();

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
    [beforeCode]
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
    [afterCode]
  );

  return (
    <div className="grid xl:grid-rows-1 xl:grid-cols-beforeAfterCodingBlocks grid-cols-1 grid-row-2 gap-4 w-full mt-6">
      <div>
        <div className="w-full">
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
        </div>
      </div>

      <div className="items-center hidden xl:flex">
        <MoveRight className="dark:text-gray-100 text-gray-500" size={30} />
      </div>

      <div>
        <div className="w-full">
          <SandpackProvider
            customSetup={{
              dependencies: {
                "@react-unforget/runtime": "latest",
              },
            }}
            files={afterFiles}
            template="react"
            content={children}
            theme={theme === "system" || !theme ? "auto" : (theme as any)}
          >
            <CodeEditorAndPreview
              readOnly
              code={afterCode}
              previewClassName={previewClassName}
            />
          </SandpackProvider>
        </div>
      </div>
    </div>
  );
}

export default LiveCodeSandpack;
