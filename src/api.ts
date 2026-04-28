import type { AgentChatResult } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

type AgentChatRequest = {
  message: string;
  mode: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
};

export async function sendAgentChat(payload: AgentChatRequest): Promise<AgentChatResult> {
  const response = await fetch(`${API_BASE}/api/agent-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => ({}))) as
    | AgentChatResult
    | { error?: string };

  if (!response.ok) {
    throw new Error(body && "error" in body && body.error ? body.error : "Request failed.");
  }

  return body as AgentChatResult;
}
