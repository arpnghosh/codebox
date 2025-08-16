import express, { type Request, type Response } from "express";
import { createServer } from "http";
import uuid4 from "uuid4";
import Docker from "dockerode";
import { WebSocketServer, WebSocket } from "ws";
import cors from "cors";

const app = express();

app.use(cors());

const server = createServer(app);

const terminalWebSocketServer = new WebSocketServer({ server });

const docker = new Docker();

// TODO: app.get("/projects")

// TODO: app.get("/projects/:projectId")

// TODO: app.delete("/projects/:projectId")

// TODO: watch file tree changes -> ui rendering

interface serverConfigInterface {
  PORT: number;
  CLIENT_URL: string;
  TEMPLATE_COMMAND: string;
}

const serverConfig: serverConfigInterface = {
  PORT: Number(process.env.PORT) || 3000,
  CLIENT_URL: process.env.CLIENT_URL || "localhost:3000",
  TEMPLATE_COMMAND: process.env.TEMPLATE_COMMAND || "npm create vite@latest",
};

app.post("/create-new-project", async (req: Request, res: Response) => {
  try {
    const id = uuid4();
    const projectId = `project_${id}`;
    const volumeName = `volume_${projectId}`;
    const containerName = `container_${projectId}`;
    const imageName = "codebox-image";

    await docker.createVolume({ Name: volumeName });

    const projectContainer = await docker.createContainer({
      User: "codebox",
      Image: imageName,
      name: containerName,
      Tty: true,
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      OpenStdin: true,
      HostConfig: {
        Binds: [`${volumeName}:/home/codebox/app`],
        AutoRemove: false,
        PortBindings: {
          "5173/tcp": [{ HostPort: "5173" }],
        },
      },
      Cmd: ["/bin/bash", "-c", "tail -f /dev/null"],
    });

    await projectContainer.start();

    res.status(200).json({
      message: "Project created successfully",
      projectId,
      containerId: projectContainer.id,
    });
  } catch (error) {
    console.error("Error creating project: ", error);
    res.status(500).json({ message: "Failed to create new project. " });
  }
});

// ws code for the docker shell interaction with xterm
terminalWebSocketServer.on("connection", (ws: WebSocket) => {
  console.log("User initiated connection");

  ws.on("message", async (message: Buffer) => {
    try {
      const { containerId, command } = JSON.parse(message.toString());
      console.log(`Received command for container ${containerId}:`, command);

      const container = docker.getContainer(containerId);

      const exec = await container.exec({
        Cmd: ["/bin/sh", "-c", command],
        Tty: true,
        AttachStdout: true,
        AttachStderr: true,
      });

      const stream = await exec.start({ stdin: true });

      stream.on("data", (chunk: Buffer) => {
        ws.send(chunk.toString());
      });
    } catch (error) {
      console.error("Error executing command:", error);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(`Error: ${error}`);
      }
    }
  });

  ws.on("close", () => {
    // TODO: destroy container
    console.log("User disconnected.");
  });
});

server.listen(serverConfig.PORT, () =>
  console.log(`server running on PORT: ${serverConfig.PORT}`),
);
