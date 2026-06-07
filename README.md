# Ethereal Wellness (Classroom Demo)

Ethereal Wellness is a React + Vite + TypeScript frontend with a local Node/Express backend that demonstrates **AI Agents / Agentic AI** using an Ollama-hosted model.

The existing UI is preserved. This update wires it to a real backend, adds voice input/output, and shows a visible multi-agent trace.

## What's new in this version (exam additions)

These five features were added on top of the original chat prototype. They combine a second course technology (**WebSockets**) with deeper **agentic AI**:

1. **Live agent streaming over WebSockets** — instead of a fake "thinking" animation, each agent (`Listener → Coach → Safety → Planner → Summary → Speaker`) is streamed to the browser the moment the backend finishes it, over `ws://…/ws/agent-chat`. Falls back to plain HTTP automatically if the socket can't open. See `server/src/index.ts`, `src/api.ts` (`sendAgentChatStream`).
2. **Action Plan generator (Planner Agent)** — a new agent turns the advice into 2–4 tiny, time-boxed steps returned as JSON. Shown as a checklist (`src/components/ActionPlanPanel.tsx`).
3. **Mood memory + dashboard** — every exchange is saved to `localStorage` so the app shows patterns over time (`src/storage.ts`, `src/components/MoodDashboard.tsx`).
4. **Assignment context / RAG-lite** — paste an assignment brief; it's injected into every agent's prompt so advice is grounded in the real task (the **Context** button; `studyContext` threaded through the request and `buildUserContextBlock`).
5. **Multi-agent debate mode** — toggle **Debate** to run a `Productivity Agent` and a `Wellness Agent`, then a `Judge Agent` synthesizes the best combined direction, which feeds the Speaker (`server/src/agentPipeline.ts`).

## Safety

This app is a wellness/study/productivity reflection companion.

It is **not** a therapist and does not provide medical advice.

## Tech Overview

- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript runtime (`tsx`)
- Local model: Ollama (`llama3.2:3b` by default)
- Agent pipeline (normal mode):
  - Listener Agent
  - Coach Agent
  - Safety Agent (deterministic — the LLM never decides safety)
  - Planner Agent
  - Summary Agent
  - Speaker Agent
- Debate mode swaps the Coach for: Productivity Agent + Wellness Agent → Judge Agent
- Live streaming: agents are pushed to the browser over a WebSocket as each one finishes

## 1) Install dependencies

```bash
npm install
```

## 2) Install Ollama

Install from [https://ollama.com/download](https://ollama.com/download).

Then pull the model used in this project:

```bash
ollama pull llama3.2:3b
```

Start Ollama (if it is not already running):

```bash
ollama serve
```

## 3) Configure environment variables

Copy `.env.example` to `.env` and adjust if needed.

```env
PORT=8787
OLLAMA_URL=http://localhost:11434/api/chat
OLLAMA_MODEL=llama3.2:3b
```

Optional frontend API base override:

```env
VITE_API_BASE_URL=http://localhost:8787
```

## 4) Run backend and frontend

Run backend only:

```bash
npm run server
```

Run frontend only:

```bash
npm run dev
```

Run both together:

```bash
npm run dev:all
```

## Backend API

### `POST /api/agent-chat`

Request body:

```json
{
  "message": "I feel overwhelmed",
  "mode": "productivity",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

Response body:

```json
{
  "finalResponse": "string",
  "agentTrace": [
    { "agent": "Listener Agent", "output": "string" },
    { "agent": "Coach Agent", "output": "string" },
    { "agent": "Safety Agent", "output": "string" },
    { "agent": "Summary Agent", "output": "string" },
    { "agent": "Speaker Agent", "output": "string" }
  ],
  "safetyLevel": "normal",
  "mockMode": false,
  "actionPlan": [
    { "title": "Open the assignment document", "minutes": 2, "reason": "..." }
  ]
}
```

Optional request fields: `studyContext` (assignment/project context) and `mode: "debate"` (multi-agent debate).

### `ws://…/ws/agent-chat` (WebSocket)

Send the same JSON payload as the POST endpoint. The server streams:

```jsonc
{ "type": "status",     "message": "Starting agent pipeline..." }
{ "type": "agent-step", "step": { "agent": "Listener Agent", "output": "..." } } // one per agent, live
{ "type": "final",      "result": { /* full AgentChatResponse */ } }
{ "type": "error",      "error": "..." }
```

## Demo Flow (for class)

- Click **Demo scenario** in the app.
- It sends: `I feel overwhelmed and I can’t start my assignment.`
- The UI shows:
  - user message in conversation
  - the full agent trace in **Agent network**
  - final response (and optional spoken voice reply)

If Ollama is not running, backend automatically returns `mockMode: true` with a realistic demo-safe response so classroom demos continue.
