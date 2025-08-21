import express, { type Request, type Response } from "express";
import { createServer } from "http";
import uuid4 from "uuid4";
import Docker from "dockerode";
import { WebSocketServer, WebSocket } from "ws";
import cors from "cors";
import { Duplex } from 'stream';

const terminalConnections = new Map();

const app = express();

app.use(cors());

const server = createServer(app);

const terminalWebSocketServer = new WebSocketServer({
  noServer: true,
  path: "/terminal",
});

const fileTreeWebSocketServer = new WebSocketServer({
  noServer: true,
  path: "/file-tree",
});

server.on("upgrade", (request: Request, socket, head) => {
  const { pathname } = new URL(request.url, `http://${request.headers.host}`);

  if (pathname == "/terminal") {
    terminalWebSocketServer.handleUpgrade(request, socket, head, (ws) => {
      terminalWebSocketServer.emit("connection", ws, request);
    });
  } else if (pathname == "/file-tree") {
    fileTreeWebSocketServer.handleUpgrade(request, socket, head, (ws) => {
      fileTreeWebSocketServer.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

const docker = new Docker();

interface serverConfigInterface {
  PORT: number;
  CLIENT_URL: string;
}

const serverConfig: serverConfigInterface = {
  PORT: Number(process.env.PORT) || 3000,
  CLIENT_URL: process.env.CLIENT_URL || "localhost:3000",
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
      ExposedPorts: { "5173/tcp": {} },
      AttachStdout: true,
      AttachStderr: true,
      OpenStdin: true,
      HostConfig: {
        NetworkMode: "host",
        Binds: [`${volumeName}:/home/codebox/app`],
        AutoRemove: false,
        PortBindings: {
          "5173/tcp": [
            {
              HostIp: "0.0.0.0",
              HostPort: "5173",
            },
          ],
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
          "5173/tcp": [{ HostPort: "5173" }],
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

terminalWebSocketServer.on("connection", (ws) => {
  console.log("New user connected to the terminal WebSocket.");

  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message.toString());
      const { type, containerId, input, cols, rows } = data;

      switch (type) {
        case "init": {
          console.log(`Initializing terminal for container: ${containerId}`);

          if (terminalConnections.has(containerId)) {
            ws.send("Error: Terminal session already active for this container.\n");
            return;
          }

          const container = docker.getContainer(containerId);
          
          const exec = await container.exec({
            Cmd: ["/bin/bash"],
            AttachStdin: true,
            AttachStdout: true,
            AttachStderr: true,
            Tty: true,
          });

          const stream = await exec.start({
            hijack: true,
            stdin: true,
            Tty: true
          }) as Duplex;

          terminalConnections.set(containerId, { ws, stream, exec });

          stream.on('data', (data: Buffer) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(data, { binary: true });
            }
          });
          
          stream.on('end', () => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.close();
            }
          });
          
          stream.on('error', (err) => {
            console.error('Docker stream error:', err);
            if (ws.readyState === WebSocket.OPEN) {
              ws.close(1011, 'Docker stream error');
            }
          });

          ws.send("Connected to container. Type 'exit' to end the session.\r\n");
          break;
        }

        case "stdin": {
          const connection = terminalConnections.get(containerId);

          if (connection) {
            // Write the input directly to the stream
            connection.stream.write(input);
          } else {
            ws.send("Error: No active terminal session found for this container.");
          }
          break;
        }

        case "resize": {
          const connection = terminalConnections.get(containerId);

          if (connection) {
            connection.exec.resize({ 
              h: rows, 
              w: cols 
            }, (err: any) => {
              if (err) {
                console.error("Resize error:", err);
              }
            });
          }
          break;
        }

        default:
          console.warn(`Unknown message type: ${type}`);
          ws.send("Unknown command type.");
      }
    } catch (error: any) {
      console.error("Error handling WebSocket message:", error);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(`Error: ${error.message}`);
      }
    }
  });

  ws.on("close", () => {
    console.log("User disconnected.");
    for (const [containerId, connection] of terminalConnections.entries()) {
      if (connection.ws === ws) {
        console.log(`Terminating session for container: ${containerId}`);
        connection.stream.end();
        terminalConnections.delete(containerId);
        break;
      }
    }
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

server.listen(serverConfig.PORT, () => {
  console.log(`server running on PORT: ${serverConfig.PORT}`);
});
