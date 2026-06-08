import type { AgentChatResult, AgentTraceEntry, ThoughtTransform } from "./types";

function apiBase(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  // Dev: Vite (5173) talks to Express (8787). Prod: same server, relative URLs.
  if (import.meta.env.DEV) return "http://localhost:8787";
  return "";
}

function apiUrl(path: string): string {
  const base = apiBase();
  return base ? `${base}${path}` : path;
}

export type AgentChatRequest = {
  message: string;
  mode: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  studyContext?: string;
};

async function sendAgentChat(payload: AgentChatRequest): Promise<AgentChatResult> {
  const response = await fetch(apiUrl("/api/agent-chat"), {
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

export async function transformThought(
  message: string,
): Promise<{ transform: ThoughtTransform; mockMode: boolean }> {
  const response = await fetch(apiUrl("/api/transform-thought"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  const body = (await response.json().catch(() => ({}))) as
    | { transform: ThoughtTransform; mockMode: boolean }
    | { error?: string };

  if (!response.ok) {
    throw new Error(body && "error" in body && body.error ? body.error : "Request failed.");
  }

  return body as { transform: ThoughtTransform; mockMode: boolean };
}

type StreamHandlers = {
  onStep?: (step: AgentTraceEntry) => void;
};

function wsUrl(): string {
  const base = apiBase();
  if (base) {
    return `${base.replace(/^http/i, "ws")}/ws/agent-chat`;
  }
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws/agent-chat`;
}

// Streams the agent pipeline over a WebSocket, calling handlers as each agent
// finishes. Falls back to the plain HTTP endpoint if the socket cannot open.
export function sendAgentChatStream(
  payload: AgentChatRequest,
  handlers: StreamHandlers = {},
): Promise<AgentChatResult> {
  return new Promise<AgentChatResult>((resolve, reject) => {
    let socket: WebSocket;
    try {
      socket = new WebSocket(wsUrl());
    } catch {
      sendAgentChat(payload).then(resolve, reject);
      return;
    }

    let settled = false;
    let opened = false;

    const fallbackToHttp = () => {
      if (settled) return;
      settled = true;
      sendAgentChat(payload).then(resolve, reject);
    };

    socket.onopen = () => {
      opened = true;
      socket.send(JSON.stringify(payload));
    };

    socket.onmessage = (event) => {
      let data: {
        type?: string;
        message?: string;
        step?: AgentTraceEntry;
        result?: AgentChatResult;
        error?: string;
      };
      try {
        data = JSON.parse(event.data as string);
      } catch {
        return;
      }

      switch (data.type) {
        case "status":
          break;
        case "agent-step":
          if (data.step) handlers.onStep?.(data.step);
          break;
        case "final":
          if (data.result && !settled) {
            settled = true;
            resolve(data.result);
          }
          socket.close();
          break;
        case "error":
          if (!settled) {
            settled = true;
            reject(new Error(data.error ?? "Agent pipeline failed."));
          }
          socket.close();
          break;
        default:
          break;
      }
    };

    socket.onerror = () => {
      // If the socket never opened, fall back to HTTP so the demo keeps working.
      if (!opened) fallbackToHttp();
    };

    socket.onclose = () => {
      if (!opened) fallbackToHttp();
      else if (!settled) {
        settled = true;
        reject(new Error("The connection closed before a response arrived."));
      }
    };
  });
}
