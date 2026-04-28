import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { runAgentPipeline } from "./agentPipeline";
import type { AgentChatRequest } from "./types";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT ?? 8787);

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

app.listen(PORT, () => {
  console.log(`Ethereal Wellness backend running on http://localhost:${PORT}`);
});
