import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { WebSocketServer } from "ws";
import { runAgentPipeline, runThoughtTransform } from "./agentPipeline";
import type { AgentChatRequest, TransformRequest } from "./types";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT ?? 8787);
const isProd = process.env.NODE_ENV === "production";
const distPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../dist");

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "ethereal-wellness-server" });
});

app.post("/api/agent-chat", async (req, res) => {
  const payload = req.body as AgentChatRequest;
  if (!payload?.message || typeof payload.message !== "string") {
    res.status(400).json({ error: "Message is required." });
    return;
  }
  try {
    const result = await runAgentPipeline(payload);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    res.status(500).json({ error: message });
  }
});

app.post("/api/transform-thought", async (req, res) => {
  const payload = req.body as TransformRequest;
  if (!payload?.message || typeof payload.message !== "string") {
    res.status(400).json({ error: "Message is required." });
    return;
  }
  try {
    const result = await runThoughtTransform(payload.message);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    res.status(500).json({ error: message });
  }
});

if (isProd) {
  app.use(express.static(distPath));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// Wrap the Express app in a raw HTTP server so we can attach a WebSocket
// server on the same port. The WebSocket endpoint streams each agent step
// to the client live, instead of waiting for the whole pipeline to finish.
const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws/agent-chat" });

wss.on("connection", (socket) => {
  socket.on("message", async (raw) => {
    let payload: AgentChatRequest;
    try {
      payload = JSON.parse(raw.toString()) as AgentChatRequest;
    } catch {
      socket.send(JSON.stringify({ type: "error", error: "Invalid request." }));
      return;
    }

    if (!payload?.message || typeof payload.message !== "string") {
      socket.send(JSON.stringify({ type: "error", error: "Message is required." }));
      return;
    }

    try {
      socket.send(
        JSON.stringify({ type: "status", message: "Starting agent pipeline..." }),
      );

      const result = await runAgentPipeline(payload, (step) => {
        if (socket.readyState === socket.OPEN) {
          socket.send(JSON.stringify({ type: "agent-step", step }));
        }
      });

      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify({ type: "final", result }));
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not run agent pipeline.";
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify({ type: "error", error: message }));
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Ethereal Wellness running on http://localhost:${PORT}`);
  if (isProd) console.log("Serving production build from dist/");
  console.log(`Agent stream available on ws://localhost:${PORT}/ws/agent-chat`);
});
