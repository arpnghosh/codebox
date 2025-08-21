import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FileNode {
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
  path: string;
}

const mockFileTree: FileNode[] = [
  {
    name: "src",
    type: "folder",
    path: "src",
    children: [
      {
        name: "components",
        type: "folder",
        path: "src/components",
        children: [
          {
            name: "Button.tsx",
            type: "file",
            path: "src/components/Button.tsx",
          },
          { name: "Input.tsx", type: "file", path: "src/components/Input.tsx" },
        ],
      },
      { name: "App.tsx", type: "file", path: "src/App.tsx" },
      { name: "index.tsx", type: "file", path: "src/index.tsx" },
    ],
  },
  {
    name: "public",
    type: "folder",
    path: "public",
    children: [
      { name: "index.html", type: "file", path: "public/index.html" },
      { name: "favicon.ico", type: "file", path: "public/favicon.ico" },
    ],
  },
  { name: "package.json", type: "file", path: "package.json" },
  { name: "tsconfig.json", type: "file", path: "tsconfig.json" },
];

interface FileTreeNodeProps {
  node: FileNode;
  level: number;
  selectedFile: string | null;
  onFileSelect: (path: string) => void;
}

function FileTreeNode({
  node,
  level,
  selectedFile,
  onFileSelect,
}: FileTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2);

  const handleClick = () => {
    if (node.type === "folder") {
      setIsExpanded(!isExpanded);
    } else {
      onFileSelect(node.path);
    }
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 px-2 py-1 text-sm cursor-pointer hover:bg-muted/50 rounded-sm",
          selectedFile === node.path && "bg-accent/20 text-accent-foreground",
          "transition-colors duration-150",
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
      >
        {node.type === "folder" && (
          <div className="w-4 h-4 flex items-center justify-center">
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            )}
          </div>
        )}
        <div className="w-4 h-4 flex items-center justify-center">
          {node.type === "folder" ? (
            isExpanded ? (
              <FolderOpen className="w-4 h-4 text-primary" />
            ) : (
              <Folder className="w-4 h-4 text-muted-foreground" />
            )
          ) : (
            <File className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
        <span className="truncate">{node.name}</span>
      </div>
      {node.type === "folder" && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              level={level + 1}
              selectedFile={selectedFile}
              onFileSelect={onFileSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FileTreeProps {
  selectedFile: string | null;
  onFileSelect: (path: string) => void;
}

export function FileTree({ selectedFile, onFileSelect }: FileTreeProps) {
  return (
    <div className="h-full bg-sidebar border-r border-sidebar-border">
      <div className="p-3 border-b border-sidebar-border">
        <h3 className="text-sm font-medium text-sidebar-foreground">
          Explorer
        </h3>
      </div>
      <div className="p-2">
        {mockFileTree.map((node) => (
          <FileTreeNode
            key={node.path}
            node={node}
            level={0}
            selectedFile={selectedFile}
            onFileSelect={onFileSelect}
          />
        ))}
      </div>
    </div>
  );
}
