import { useState, useRef, useEffect } from "react";
import { TerminalIcon } from "lucide-react";
import { Terminal as XTerm } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

export function Terminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermInstance = useRef<XTerm | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const [containerId, setContainerId] = useState<string | null>(null);
  const inputBuffer = useRef<string[]>([]);

  useEffect(() => {
    // This is a mock container ID for demonstration.
    // In a real application, you would get this from a project creation API call.
    setContainerId("container_5222ccb5-b267-41a8-9bd5-aa8894fee495");
  }, []);

  useEffect(() => {
    if (!terminalRef.current || !containerId) {
      return;
    }

    // Initialize xterm.js
    const term = new XTerm({
      cursorBlink: true,
      convertEol: true,
      fontFamily: `"Fira Mono", "Hack", "Courier New", monospace`,
      fontSize: 14,
      theme: {
        background: "#ffffff",
        foreground: "#000000",
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    // Connect to the WebSocket server
    ws.current = new WebSocket(`ws://localhost:3000/terminal`);
    ws.current.binaryType = "arraybuffer";

    ws.current.onopen = () => {
      // Send the container ID to the backend upon connection
      ws.current?.send(
        JSON.stringify({
          type: "init",
          containerId,
        }),
      );
      term.write("Terminal connected\r\n");
    };

    ws.current.onmessage = async (event) => {
      // Handle both text and binary data (string, ArrayBuffer, or Blob)
      let data: string;
      if (typeof event.data === "string") {
        data = event.data;
      } else if (event.data instanceof ArrayBuffer) {
        data = new TextDecoder().decode(event.data);
      } else if (event.data instanceof Blob) {
        const ab = await event.data.arrayBuffer();
        data = new TextDecoder().decode(ab);
      } else {
        // Unknown type; ignore
        return;
      }
      term.write(data);
    };

    ws.current.onclose = () => {
      term.writeln("\r\nDisconnected from the backend.");
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
      term.writeln("\r\nError connecting to the terminal.");
    };

    // Handle user input
    term.onData((data) => {
      const code = data.charCodeAt(0);

      // Handle special keys
      if (code === 13) {
        // Enter key - send the current input buffer
        const input = inputBuffer.current.join("") + "\n";
        ws.current?.send(
          JSON.stringify({
            type: "stdin",
            containerId,
            input,
          }),
        );
        inputBuffer.current = [];
        term.write("\r\n");
      } else if (code === 127 || code === 8) {
        // Backspace or Delete key
        if (inputBuffer.current.length > 0) {
          inputBuffer.current.pop();
          term.write("\b \b"); // Move cursor back, space, move cursor back again
        }
      } else if (code === 3) {
        // Ctrl+C - send interrupt signal
        ws.current?.send(
          JSON.stringify({
            type: "stdin",
            containerId,
            input: "\x03",
          }),
        );
        inputBuffer.current = [];
        term.write("^C\r\n");
      } else if (code >= 32 && code <= 126) {
        // Regular printable characters
        inputBuffer.current.push(data);
        term.write(data); // Local echo
      }
      // Ignore other control characters
    });

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit();
      // Send new terminal dimensions to the backend
      if (ws.current?.readyState === WebSocket.OPEN) {
        const dimensions = fitAddon.proposeDimensions();
        if (dimensions) {
          ws.current.send(
            JSON.stringify({
              type: "resize",
              containerId,
              cols: dimensions.cols,
              rows: dimensions.rows,
            }),
          );
        }
      }
    };

    window.addEventListener("resize", handleResize);

    // Send initial terminal dimensions
    setTimeout(() => {
      handleResize();
    }, 100);

    xtermInstance.current = term;

    // Cleanup function
    return () => {
      window.removeEventListener("resize", handleResize);
      term.dispose();
      ws.current?.close();
    };
  }, [containerId]);

  return (
    <div className="h-full bg-background border-t border-border flex flex-col">
      <div className="flex items-center gap-2 px-4 py-2 bg-card border-b border-border">
        <TerminalIcon className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">Terminal</span>
      </div>
      <div className="flex-1 p-2 overflow-hidden" ref={terminalRef}></div>
    </div>
  );
}
