# Ethereal Wellness (Classroom Demo)

Ethereal Wellness is a React + Vite + TypeScript frontend with a local Node/Express backend that demonstrates **AI Agents / Agentic AI** using an Ollama-hosted model.

The existing UI is preserved. This update wires it to a real backend, adds voice input/output, and shows a visible multi-agent trace.

## Safety

This app is a wellness/study/productivity reflection companion.

It is **not** a therapist and does not provide medical advice.

## Tech Overview

- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript runtime (`tsx`)
- Local model: Ollama (`llama3.2:3b` by default)
- Agent pipeline:
  - Listener Agent
  - Coach Agent
  - Safety Agent
  - Summary Agent
  - Speaker Agent

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
  "mockMode": false
}
```

## Demo Flow (for class)

- Click **Demo scenario** in the app.
- It sends: `I feel overwhelmed and I can’t start my assignment.`
- The UI shows:
  - user message in conversation
  - the full agent trace in **Agent network**
  - final response (and optional spoken voice reply)

If Ollama is not running, backend automatically returns `mockMode: true` with a realistic demo-safe response so classroom demos continue.
