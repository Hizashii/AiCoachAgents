# Ethereal Wellness

A classroom demo of **agentic AI** for students. Instead of one hidden chat reply, the app runs several specialised agents (Listener, Coach, Safety, Planner, and more) and shows each step live in the browser.

> **Not a therapist.** This is a wellness/study support prototype, not medical advice.

## What you need

- [Node.js 18+](https://nodejs.org)
- [Ollama](https://ollama.com/download) (local AI — no cloud API key)

## Run it at home

```bash
cd path/to/AiCoach
npm install
ollama pull llama3.2:3b
ollama serve
```

Copy the env file (PowerShell: `Copy-Item .env.example .env`), then start everything:

```bash
npm run dev:all
```

Open **http://localhost:5173**. Backend runs on port **8787**.

## Quick demo

1. **Command Panel → Demo → Overwhelmed (full demo)**
2. Watch agents appear in **Agent Intelligence → Live**
3. Check **Plan** (action steps) and **Canvas** (mind map)

You can also type a message, use mood presets on the left, or try the **Thought Transformer** at the bottom.

## How it works (short)

- **Frontend:** React + Vite (port 5173)
- **Backend:** Node/Express + WebSocket (port 8787)
- **AI:** Ollama with `llama3.2:3b` (port 11434)

When you send a message, agents run one after another. Each finished step streams to the UI over WebSocket. Safety is checked with **rules, not the LLM** — crisis language shows a safety panel instead of normal coaching.

If Ollama is off, the app still works in **Mock mode** with safe fallback responses.

## If something breaks

| Problem | Fix |
|---------|-----|
| Messages don't send | Run `npm run dev:all` (needs backend + frontend) |
| Mock mode badge | Start Ollama: `ollama serve` |
| Model missing | `ollama pull llama3.2:3b` |

## Tech stack

React, TypeScript, Vite, Tailwind, Express, WebSocket, Ollama, browser Speech APIs.
