import { transform } from "@babel/standalone";
import { SandpackProvider } from "@codesandbox/sandpack-react";
import reactUnforgetBabelPlugin from "@react-unforget/babel-plugin";

// @ts-ignore
import jsxBabelPlugin from "@babel/plugin-syntax-jsx";
import { useTheme } from "nextra-theme-docs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BeforeAfterCodeLayout } from "./BeforeAfterCodeLayout";
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
      }
    />
  );
}

export default LiveCodeSandpack;
