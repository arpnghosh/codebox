import { useState } from "react";
import { PanelLeft } from "lucide-react";
import { Button } from "./components/ui/button";
import { FileTree } from "./components/file-tree";
import { CodeEditor } from "./components/code-editor";
import { Terminal } from "./components/terminal";
import { PreviewPane } from "./components/preview-pane";

export default function CodeSandboxUI() {
  const [selectedFile, setSelectedFile] = useState<string | null>(
    "src/App.tsx",
  );
  const [isFileTreeVisible, setIsFileTreeVisible] = useState(true);

  return (
    <div className="h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="h-12 bg-card border-b border-border flex items-center px-4 gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsFileTreeVisible(!isFileTreeVisible)}
          className="h-8 px-2"
        >
          <PanelLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary rounded-sm flex items-center justify-center">
            <span className="text-primary-foreground text-xs font-bold">
              CS
            </span>
          </div>
          <span className="font-semibold text-foreground">codebox</span>
        </div>
        <div className="flex-1" />
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Tree */}
        {isFileTreeVisible && (
          <div className="w-64 flex-shrink-0">
            <FileTree
              selectedFile={selectedFile}
              onFileSelect={setSelectedFile}
            />
          </div>
        )}

        <div className="flex-1 flex relative">
          {/* Code Editor - now draggable */}
          <div className="flex-1 flex flex-col relative">
            <CodeEditor selectedFile={selectedFile} />
            {/* Terminal */}
            <div className="h-48 flex-shrink-0">
              <Terminal />
            </div>
          </div>

          {/* Preview Pane - already draggable */}
          <div className="w-96 flex-shrink-0 border-l border-border">
            <PreviewPane />
          </div>
        </div>
      </div>
    </div>
  );
}
