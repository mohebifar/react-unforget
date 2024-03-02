import {
  SandpackCodeEditor,
  SandpackPreview,
  SandpackPreviewRef,
  useSandpack,
} from "@codesandbox/sandpack-react";
import { memo, useCallback, useEffect, useRef } from "react";
import { twMerge } from "tailwind-merge";

type CodeEditorAndPreviewProps = {
  readOnly?: boolean;
  // eslint-disable-next-line no-unused-vars
  onChange?: (_code: string) => void;
  code?: string;
  previewClassName?: string;
};

export const CodeEditorAndPreview = memo(
  ({
    readOnly = false,
    code,
    onChange,
    previewClassName,
  }: CodeEditorAndPreviewProps) => {
    const {
      sandpack: { status, files, updateCurrentFile },
      listen,
    } = useSandpack();

    const filesRef = useRef(files);
    const previousStatus = useRef("");
    filesRef.current = files;
    const updateCurrentFileRef = useRef(updateCurrentFile);

    const sandboxPreview = useRef<SandpackPreviewRef>(null);

    const updateCodeInSandpack = useCallback(
      (newCode: string) => {
        updateCurrentFileRef.current(newCode);
      },
      [updateCurrentFileRef]
    );

    useEffect(() => {
      if (status !== "running") return;

      const unsubscribe = listen((message) => {
        if (message.type === "done") {
          const newCode = filesRef.current["/App.js"]!.code;
          onChange?.(newCode);
        }
      });

      return unsubscribe;
    }, [status, onChange]);

    useEffect(() => {
      const unsubscribe = sandboxPreview.current
        ?.getClient()
        ?.listen?.((message) => {
          if (
            message.type === "done" &&
            previousStatus.current !== "done" &&
            code
          ) {
            updateCodeInSandpack(code);
          }

          if (previousStatus.current !== "done") {
            previousStatus.current = message.type;
          }
        });

      return () => unsubscribe?.();
    }, [status, onChange, updateCodeInSandpack]);

    useEffect(() => {
      if (code) {
        updateCurrentFileRef.current(code);

        setTimeout(() => {
          sandboxPreview.current?.getClient()?.dispatch?.({
            type: "refresh",
          });
        }, 400);
      }
    }, [code, updateCurrentFileRef]);

    return (
      <div className="w-full">
        <SandpackCodeEditor
          showTabs={false}
          readOnly={readOnly}
          className="h-96"
          wrapContent
          showLineNumbers
        />
        <div className="h-3 bg-gray-100" />
        <SandpackPreview
          ref={sandboxPreview}
          className={twMerge(["bg-base-200 h-46", previewClassName])}
        />
      </div>
    );
  }
);
