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
    const volumeName = `volume_${id}`;
    const containerName = `container_${id}`;
    const imageName = "codebox-image";
    console.log(volumeName);
    console.log(containerName);
    console.log(projectId);

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
          "5173/tcp": [{ HostPort: "0" }],
        },
      },
      Cmd: ["/bin/bash", "-c", "tail -f /dev/null"],
    });

    await projectContainer.start();

    res.status(200).json({
      message: "Container for project created successfully",
      projectId,
      containerId: projectContainer.id,
    });
  } catch (error) {
    console.error("Error creating project: ", error);
    res.status(500).json({ message: "Failed to create new project. " });
  }
});

// TODO: app.get("/projects")
// TODO: app.get("/projects?sort=oldest")
// TODO: app.delete("/projects/:projectId")
// TODO: watch file tree changes -> ui rendering

const existsVolume = async (volumeName: string): Promise<boolean> => {
  const volumes = await docker.listVolumes();
  return volumes.Volumes.some((vol) => vol.Name == volumeName);
};

const isActiveContainer = async (containerName: string): Promise<boolean> => {
  const containers = await docker.listContainers();
  return containers.some((conInfo) =>
    conInfo.Names.some((name) => name.includes(containerName)),
  );
};

app.post("/projects/:projectId", async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const id: string[] = projectId.split("_");
  const uuid: string = id[1];
  const volumeName = `volume_${uuid}`;
  const containerName = `container_${uuid}`;
  const imageName = "codebox-image";

  try {
    if (!(await existsVolume(volumeName))) {
      res.status(404).json({ message: "Volume does not exist" });
    }
    if (await isActiveContainer(containerName)) {
      res.status(200).json({ message: "container is active" });
    }
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
          "5173/tcp": [{ HostPort: "0" }],
        },
      },
      Cmd: ["/bin/bash", "-c", "tail -f /dev/null"],
    });

    await projectContainer.start();

    res.status(200).json({
      message: "container started again....",
      projectId,
      containerId: projectContainer.id,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: `Could not complete your request ${error}` });
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
