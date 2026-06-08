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

## Free hosting options

| Option | Real AI? | Cost | Catch |
|--------|----------|------|-------|
| **Run on your laptop** | Yes | Free | Only works while your PC is on |
| **Cloudflare Tunnel** (share your laptop) | Yes | Free | Public URL to your local app — best for exam day |
| **Render** (see `render.yaml`) | No — mock mode | Free | Agents + UI work; canned LLM responses |
| **Oracle Cloud free VM** | Yes | Free | 30 min setup; runs Ollama + app 24/7 |

**You cannot** host the full app (with Ollama) on GitHub Pages, Vercel, or Netlify — they don't run a persistent Node + 2 GB LLM process.

### Easiest free public link (real AI) — Cloudflare Tunnel

On your machine, with Ollama running:

```bash
npm run build
$env:NODE_ENV="production"   # Mac/Linux: export NODE_ENV=production
npm start
```

In another terminal, install [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) and run:

```bash
cloudflared tunnel --url http://localhost:8787
```

It prints a `https://….trycloudflare.com` URL anyone can open. Free, real Ollama, no credit card. URL changes each time you restart the tunnel.

### Free cloud deploy (mock mode) — Render

1. Push the repo to GitHub
2. Go to [render.com](https://render.com) → **New** → **Blueprint** → connect the repo
3. Deploy (uses `render.yaml`)

The app runs fully — WebSocket streaming, agents, safety, action plans — but shows **Mock mode** because free servers don't have enough RAM for Ollama. Fine for showing the UI and agent pipeline to teachers.

### Free 24/7 with real AI — Oracle Cloud (advanced)

Oracle's **Always Free** ARM VM (4 GB RAM) can run `docker compose up` with Ollama. Sign up at [cloud.oracle.com](https://www.oracle.com/cloud/free/), create an Ubuntu VM, install Docker, then use the `docker-compose.yml` in this repo.

## Tech stack

React, TypeScript, Vite, Tailwind, Express, WebSocket, Ollama, browser Speech APIs.
