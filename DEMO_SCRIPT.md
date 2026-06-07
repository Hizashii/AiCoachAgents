# Ethereal Wellness Demo Script

A guided plan for the 20-minute individual oral exam: **5 min presentation + 10 min dialogue + 5 min assessment**.

> Tip: open **Presentation Mode** (top-right button) during the demo. It contains
> these steps, a 5-minute timer, one-click demo scenarios, and a "what's
> happening technically" panel for each step.

---

## 5-minute presentation

### 0:00 – 0:30 Concept
- "Ethereal Wellness is an **agentic AI coaching** prototype for students."
- It turns a messy, overwhelmed thought into small, doable next steps — and it
  makes the AI's reasoning **visible** instead of hiding it in a chat bubble.
- Web technologies on screen: React + Vite + TypeScript, Tailwind, Framer Motion,
  a Node/Express backend, a local LLM via Ollama, browser Speech APIs, and a
  WebSocket for live agent streaming.

### 0:30 – 1:30 User input and AI agents
- Pick a mood on the left ("I feel overwhelmed") **or** type/speak a message.
- Point out that one message triggers a **pipeline of specialised agents**:
  Listener → Coach → Safety → Planner → Mapper → Summary → Speaker.
- Mention voice: the mic button is speech-to-text; the reply is spoken aloud.

### 1:30 – 2:30 Live agent process
- Watch the **Agent Network** panel (right): each agent "wakes up" live as the
  backend finishes it — that's a **WebSocket** streaming each step.
- Press **Replay** on the **Agent Replay** timeline to re-play the run step by
  step, expanding any agent to see its output.
- Optional: toggle **Debate** so a Productivity Agent and Wellness Agent argue and
  a Judge Agent synthesises the answer.

### 2:30 – 3:30 Structured outputs
- The system doesn't just chat — it produces:
  - a spoken reply,
  - an **Action plan** (tiny checkable steps),
  - a **Coach Canvas** mind-map (emotion → blocker → goal → next step),
  - and the **Thought Transformer** (bottom) rewrites a messy thought into
    *Calmer / Actionable / Presentation-ready* versions.
- This is the generative + transformative AI part.

### 3:30 – 4:30 Safety and transparency
- A **deterministic Safety Agent** classifies every message (normal / sensitive /
  crisis). The LLM never decides safety.
- Show the adaptive UI: as safety rises the whole cockpit calms down (less glow,
  slower motion). On a crisis a clear, non-medical **Safety Panel** appears.
- Everything the AI did stays visible in the trace — explainable, not a black box.

### 4:30 – 5:00 Conclusion
- "It's a Web Technology showcase: multiple agents, live streaming, structured
  generative outputs, voice, and an adaptive, explainable interface."
- "It is a coaching/wellness prototype — not a therapist or medical tool."

---

## 10-minute dialogue preparation (likely teacher questions)

**Why is this agentic AI?**
Because the work is split across multiple specialised agents with distinct roles
that hand off to each other (Listener, Coach/Productivity/Wellness/Judge, Safety,
Planner, Mapper, Summary, Speaker). The orchestration and visible hand-offs are
the agentic part — not a single prompt.

**What makes this different from a chatbot?**
A chatbot returns one opaque message. Here the pipeline is observable (live trace
+ replay), the output is structured (action plan, coach canvas, thought
transform), safety is a separate deterministic gate, and the UI adapts to state.

**Which web technologies are used?**
React + Vite + TypeScript, Tailwind CSS, Framer Motion, Node/Express, a WebSocket
(`/ws/agent-chat`) with HTTP fallback, the browser SpeechRecognition +
SpeechSynthesis APIs, and a local LLM through Ollama.

**How does safety work?**
Rule-based regex patterns classify the message before any coaching. Crisis input
skips normal coaching and returns fixed, non-medical guidance; the UI strips
decoration and shows the Safety Panel. The LLM is never trusted to decide safety.

**What did you personally add?**
On top of the base chat demo: WebSocket live streaming, the Planner action plan,
mood memory, assignment-context (RAG-lite), debate mode, the Coach Canvas + Mapper
agent, the Thought Transformer endpoint, the adaptive safety UI, Presentation
Mode, the Agent Replay timeline, and the full "AI cockpit" redesign.

**What would you improve next?**
Real embeddings/vector search for the assignment context, persistent server-side
history, streaming token-by-token model output, automated tests, and an
accessibility audit.

---

## Key technical points to mention
- **WebSocket streaming** with automatic HTTP fallback (`src/api.ts`,
  `server/src/index.ts`).
- **Deterministic agents** (Safety + Mapper) vs **LLM agents** — a deliberate
  design choice.
- **Strict-JSON prompts with safe parsing + fallbacks** so malformed model output
  never breaks the UI (`parseActionPlan`, `parseThoughtTransform`).
- **Adaptive UI** via a `data-safety` attribute driving CSS variables
  (`src/index.css`).

## Fallback plan if Ollama is not running
- The app still works: every agent falls back to safe canned output and the UI
  shows a **Mock mode** badge. Responses are instant.
- The **"Run demo" / Overwhelmed (full demo)** scenario uses a pre-built response,
  so it is always reliable on stage even with no model.
- If the WebSocket can't open, the client automatically falls back to the HTTP
  `/api/agent-chat` endpoint.

## Short explanation of every feature
- **Agent Network** — live trace of each agent as it finishes (WebSocket).
- **Agent Replay** — re-play the pipeline step by step after a response.
- **Action plan** — 2–4 tiny, checkable, time-boxed steps (Planner Agent).
- **Coach Canvas** — visual map of emotion / blocker / goal / next step (Mapper Agent).
- **Thought Transformer** — rewrites a messy thought into 3 useful versions.
- **Debate mode** — Productivity + Wellness agents, resolved by a Judge agent.
- **Assignment context** — pasted brief injected into every agent prompt (RAG-lite).
- **Mood memory** — localStorage history + simple dashboard.
- **Adaptive safety UI** — interface calms down as the AI raises the safety level.
- **Presentation Mode** — guided 5-minute exam walkthrough with timer + scenarios.
- **Voice** — speech-to-text input and spoken replies.
