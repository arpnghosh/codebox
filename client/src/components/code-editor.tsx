import { useState, useEffect, useRef } from "react";
import * as monaco from "monaco-editor";
import { loader } from "@monaco-editor/react";

// Configure Monaco loader
loader.config({ monaco });

interface CodeEditorProps {
  selectedFile: string | null;
}

export function CodeEditor({ selectedFile }: CodeEditorProps) {
  const [editor, setEditor] =
    useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoEl = useRef(null);

  // Determine language based on file extension
  const getLanguage = (filename: string | null): string => {
    if (!filename) return "plaintext";

    const extension = filename.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "ts":
        return "typescript";
      case "tsx":
        return "typescript";
      case "js":
        return "javascript";
      case "jsx":
        return "javascript";
      case "json":
        return "json";
      case "css":
        return "css";
      case "html":
        return "html";
      case "md":
        return "markdown";
      default:
        return "plaintext";
    }
  };

  // Configure Monaco Editor
  useEffect(() => {
    if (monacoEl.current) {
      const newEditor = monaco.editor.create(monacoEl.current, {
        value: selectedFile
          ? `// ${selectedFile}`
          : "// Select a file to start editing",
        language: getLanguage(selectedFile),
        theme: "vs-light",
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        lineHeight: 1.5,
        fontFamily: "Menlo, Monaco, 'Courier New', monospace",
        tabSize: 2,
        insertSpaces: true,
        wordWrap: "on",
        lineNumbers: "on",
        folding: true,
        scrollBeyondLastLine: false,
        renderLineHighlight: "all",
        matchBrackets: "always",
        autoIndent: "full",
        suggestOnTriggerCharacters: true,
        wordBasedSuggestions: true,
        parameterHints: { enabled: true },
        quickSuggestions: true,
      });

      setEditor(newEditor);

      return () => {
        newEditor.dispose();
      };
    }
  }, []); // Empty dependency array - only run once

  // Update editor language when selectedFile changes
  useEffect(() => {
    if (editor) {
      // Update language mode
      const model = editor.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, getLanguage(selectedFile));
      }
    }
  }, [selectedFile, editor]);

  return (
    <div className="h-full bg-background flex flex-col">
      <div className="flex items-center px-4 py-2 bg-card border-b border-border">
        <span className="text-sm text-muted-foreground">
          {selectedFile || "No file selected"}
          {selectedFile && ` (${getLanguage(selectedFile)})`}
        </span>
      </div>
      <div className="flex-1 relative">
        <div
          ref={monacoEl}
          className="w-full h-full"
          style={{ height: "100%", width: "100%" }}
        />
      </div>
    </div>
  );
}
