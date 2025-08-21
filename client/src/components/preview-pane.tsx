import type React from "react";

import { useState, useRef, useEffect } from "react";
import {
  RefreshCw,
  ExternalLink,
  Smartphone,
  Monitor,
  Move,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function PreviewPane() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const iframeContainerRef = useRef<HTMLDivElement>(null);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    const container = iframeContainerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging, dragStart]);

  return (
    <div className="h-full bg-card flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-card-foreground">
            Preview
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant={viewMode === "desktop" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("desktop")}
              className="h-7 px-2"
            >
              <Monitor className="w-3 h-3" />
            </Button>
            <Button
              variant={viewMode === "mobile" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("mobile")}
              className="h-7 px-2"
            >
              <Smartphone className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-7 px-2"
          >
            <RefreshCw
              className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2">
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <div className="flex-1 p-4 bg-white relative">
        <div
          ref={iframeContainerRef}
          className={`bg-white border border-gray-200 rounded-lg overflow-hidden shadow-lg ${
            viewMode === "mobile" ? "w-80" : "w-full max-w-4xl"
          } ${isDragging ? "z-50" : "z-10"}`}
          style={{
            position: "absolute",
            left: position.x,
            top: position.y,
            cursor: isDragging ? "grabbing" : "grab",
          }}
        >
          <div
            className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center justify-between cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center gap-2">
              <Move className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-600">localhost:5174</span>
            </div>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
            </div>
          </div>
          <iframe
            src="http://localhost:5174"
            className="w-full h-96 border-none pointer-events-auto"
            title="App Preview"
          />
        </div>
      </div>
    </div>
  );
}
