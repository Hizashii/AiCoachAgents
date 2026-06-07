import { askOllama } from "./ollama";
import type {
  ActionStep,
  AgentChatRequest,
  AgentChatResponse,
  AgentName,
  AgentTraceEntry,
  CoachMap,
  SafetyLevel,
  ThoughtTransform,
  ChatTurn,
} from "./types";

// Callback used to stream each agent step to the client (over WebSocket)
// as soon as the agent finishes, instead of waiting for the whole pipeline.
export type StepListener = (entry: AgentTraceEntry) => void;

type AgentResult = {
  output: string;
  usedFallback: boolean;
};

const SAFETY_COPY =
  "I’m not a medical professional, but if you might hurt yourself or someone else, contact local emergency services now or reach out to someone you trust immediately.";

const AGENT_ROLES: Record<AgentName, string> = {
  "Listener Agent": "Understands the user's emotion, intent, and context.",
  "Coach Agent": "Creates practical, non-medical next steps.",
  "Productivity Agent": "Creates deadline-focused, concrete next steps.",
  "Wellness Agent": "Creates gentle, sustainable, low-pressure support.",
  "Judge Agent": "Compares both approaches and chooses the best combined direction.",
  "Planner Agent": "Turns the advice into 2-4 tiny, checkable action steps.",
  "Mapper Agent": "Structures the situation into a visual map (emotion, blocker, goal, next step).",
  "Safety Agent": "Checks for crisis risk and keeps the app within safe boundaries.",
  "Summary Agent": "Summarizes the conversation state for the demo trace.",
  "Speaker Agent": "Rewrites the final answer so it sounds natural when spoken aloud.",
};

const CRISIS_PATTERNS: RegExp[] = [
  /\bi\s*(want|wanna|am going|plan|need)\s*to\s*(die|kill myself|end my life)\b/i,
  /\bkill myself\b/i,
  /\bend my life\b/i,
  /\bi want to die\b/i,
  /\bi don't want to live\b/i,
  /\bsuicid(e|al)\b/i,
  /\bself[-\s]?harm\b/i,
  /\b(cut|hurt)\s+myself\b/i,
  /\boverdose\b/i,
  /\b(kill|hurt)\s+(someone|somebody|others|another person)\b/i,
  /\bmedical emergency\b/i,
  /\bdomestic violence\b/i,
  /\bi am being abused\b/i,
];

const SENSITIVE_PATTERNS: RegExp[] = [
  /\bpanic\b/i,
  /\bpanic attack\b/i,
  /\banxious\b/i,
  /\banxiety\b/i,
  /\bdepressed\b/i,
  /\bdepression\b/i,
  /\bhopeless\b/i,
  /\btrauma\b/i,
  /\bunsafe\b/i,
  /\bharm\b/i,
  /\babuse\b/i,
  /\boverwhelmed\b/i,
  /\bstressed\b/i,
  /\blonely\b/i,
  /\bdown\b/i,
  /\bsad\b/i,
  /\bscared\b/i,
];

const MODE_HINTS: Record<string, string> = {
  anxious:
    "Focus on grounding, slowing down, and one small stabilizing action.",
  stressed:
    "Focus on reducing pressure, prioritizing, and choosing one next step.",
  down:
    "Focus on gentle support, reflection, and small low-effort actions.",
  overwhelmed:
    "Focus on shrinking the task and creating a tiny first step.",
  uncertain:
    "Focus on decision support, comparing options, and reducing ambiguity.",
  okay:
    "Focus on reflection, maintenance, and a positive check-in.",
  talk:
    "Focus on open conversation and one warm follow-up question.",
  calm:
    "Focus on breathing, grounding, and calming language.",
  decide:
    "Focus on helping the user choose between options.",
  journaling:
    "Focus on reflective prompts and simple journaling structure.",
  checkin:
    "Focus on mood, energy, priorities, and one small intention.",
  crisis:
    "Safety-first mode. Do not provide normal coaching if crisis risk appears.",
  general:
    "Focus on practical support and a short warm response.",
};

function detectSafetyLevel(message: string): SafetyLevel {
  if (CRISIS_PATTERNS.some((pattern) => pattern.test(message))) {
    return "crisis";
  }

  if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(message))) {
    return "sensitive";
  }

  return "normal";
}

function trimHistory(history: ChatTurn[] | undefined): ChatTurn[] {
  return (history ?? []).slice(-8);
}

function modeHint(mode: string): string {
  const normalized = mode.toLowerCase().replace(/[^a-z]/g, "");

  if (normalized.includes("anxious")) return MODE_HINTS.anxious;
  if (normalized.includes("stress")) return MODE_HINTS.stressed;
  if (normalized.includes("down")) return MODE_HINTS.down;
  if (normalized.includes("overwhelm")) return MODE_HINTS.overwhelmed;
  if (normalized.includes("uncertain")) return MODE_HINTS.uncertain;
  if (normalized.includes("okay")) return MODE_HINTS.okay;
  if (normalized.includes("talk")) return MODE_HINTS.talk;
  if (normalized.includes("calm")) return MODE_HINTS.calm;
  if (normalized.includes("decide")) return MODE_HINTS.decide;
  if (normalized.includes("journal")) return MODE_HINTS.journaling;
  if (normalized.includes("check")) return MODE_HINTS.checkin;
  if (normalized.includes("crisis")) return MODE_HINTS.crisis;

  return MODE_HINTS.general;
}

function historyToText(history: ChatTurn[]): string {
  if (history.length === 0) return "No previous conversation.";

  return history
    .map((turn) => `${turn.role.toUpperCase()}: ${turn.content}`)
    .join("\n");
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripMarkdownNoise(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, (match) =>
      match.replace(/```[a-z]*\n?/gi, "").replace(/```/g, ""),
    )
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ");
}

function stripOuterQuotes(text: string): string {
  const trimmed = text.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function cleanModelOutput(text: string, maxChars = 1200): string {
  const cleaned = stripOuterQuotes(
    normalizeWhitespace(stripMarkdownNoise(text)),
  );

  if (cleaned.length <= maxChars) return cleaned;

  return `${cleaned.slice(0, maxChars).trim()}...`;
}

function withFallback(text: string, fallback: string): string {
  const cleaned = cleanModelOutput(text);

  return cleaned.length > 0 ? cleaned : fallback;
}

function limitWords(text: string, maxWords: number): string {
  const cleaned = normalizeWhitespace(stripOuterQuotes(text));
  const words = cleaned.split(/\s+/).filter(Boolean);

  if (words.length <= maxWords) return cleaned;

  return `${words.slice(0, maxWords).join(" ")}...`;
}

function limitSentences(text: string, maxSentences: number): string {
  const cleaned = normalizeWhitespace(text);
  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length <= maxSentences) return cleaned;

  return sentences.slice(0, maxSentences).join(" ");
}

function prettifySafetyLevel(
  level: SafetyLevel,
): "Normal" | "Sensitive" | "Crisis" {
  if (level === "crisis") return "Crisis";
  if (level === "sensitive") return "Sensitive";
  return "Normal";
}

function safetyReason(level: SafetyLevel): string {
  if (level === "crisis") {
    return "Potential crisis, self-harm, harm-to-others, or emergency language detected.";
  }

  if (level === "sensitive") {
    return "Sensitive emotional language detected, but no immediate crisis language found.";
  }

  return "No crisis or medical emergency detected.";
}

function safetyAction(level: SafetyLevel): string {
  if (level === "crisis") {
    return "Prioritize immediate safety guidance instead of normal coaching.";
  }

  if (level === "sensitive") {
    return "Use calm, practical, non-medical support with extra care.";
  }

  return "Continue supportive conversation.";
}

function formatSafetyOutput(level: SafetyLevel): string {
  return [
    `Safety level: ${prettifySafetyLevel(level)}`,
    `Reason: ${safetyReason(level)}`,
    `Action: ${safetyAction(level)}`,
  ].join("\n");
}

function createTraceEntry(
  agent: AgentName,
  output: string,
  status = "Completed",
): AgentTraceEntry {
  return {
    agent,
    output: [
      `Role: ${AGENT_ROLES[agent]}`,
      `Status: ${status}`,
      "",
      cleanModelOutput(output),
    ].join("\n"),
  };
}

const FALLBACK_ACTION_PLAN: ActionStep[] = [
  {
    title: "Open the document or task you are avoiding",
    minutes: 2,
    reason: "Reduces friction and starts momentum.",
  },
  {
    title: "Work on just one tiny piece for five minutes",
    minutes: 5,
    reason: "Removes the pressure to finish everything at once.",
  },
];

function parseActionPlan(raw: string): ActionStep[] {
  // The model is asked to return JSON, but small local models often wrap it
  // in prose, so we pull out the first JSON array we can find.
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return [];

  try {
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .slice(0, 4)
      .map((item) => ({
        title: String(item?.title ?? "Small next step").slice(0, 120),
        minutes: Math.max(1, Math.min(120, Number(item?.minutes) || 5)),
        reason: String(item?.reason ?? "Helps you begin.").slice(0, 160),
      }))
      .filter((step) => step.title.trim().length > 0);
  } catch {
    return [];
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Pull a "Label: value" line out of the Listener Agent's structured output.
function parseLabeledLine(text: string, label: string): string {
  const match = text.match(new RegExp(`${label}\\s*:\\s*(.+)`, "i"));
  return match ? match[1].trim() : "";
}

function firstSentence(text: string): string {
  const cleaned = normalizeWhitespace(text);
  const match = cleaned.match(/^[^.!?]*[.!?]/);
  return (match ? match[0] : cleaned).trim();
}

// The Mapper Agent is deterministic on purpose (like the Safety Agent): it
// structures the other agents' outputs into a CoachMap instead of asking the
// LLM again. This keeps the canvas reliable and fast, and never breaks.
function buildCoachMap(
  message: string,
  listenerOutput: string,
  advice: string,
  summary: string,
  safetyLevel: SafetyLevel,
): CoachMap {
  const emotion = parseLabeledLine(listenerOutput, "Emotion") || "Mixed or unclear";
  const intent = parseLabeledLine(listenerOutput, "Intent") || "Wants support";
  const context = parseLabeledLine(listenerOutput, "Context") || message.slice(0, 80);

  return {
    emotion,
    blocker: context,
    goal: intent,
    nextStep: firstSentence(advice) || "Take one small next step.",
    safetyLevel,
    summary: summary || "The system understood the situation and offered a small next step.",
  };
}

const FALLBACK_TRANSFORM: ThoughtTransform = {
  calmer:
    "I'm behind, but I can still make progress by starting with one small part.",
  actionable: "Open the document and write one imperfect first sentence.",
  presentation:
    "I am currently blocked by task size, so I will reduce the scope and start with one concrete step.",
};

function parseThoughtTransform(raw: string): ThoughtTransform | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]);
    const calmer = String(parsed?.calmer ?? "").trim();
    const actionable = String(parsed?.actionable ?? "").trim();
    const presentation = String(parsed?.presentation ?? "").trim();
    if (!calmer && !actionable && !presentation) return null;

    return {
      calmer: calmer || FALLBACK_TRANSFORM.calmer,
      actionable: actionable || FALLBACK_TRANSFORM.actionable,
      presentation: presentation || FALLBACK_TRANSFORM.presentation,
    };
  } catch {
    return null;
  }
}

function buildBasePrompt(): string {
  return `
You are part of a classroom demo about AI agents and agentic AI.

Important rules:
- This app is not a therapist.
- Do not diagnose.
- Do not claim to treat anxiety, depression, trauma, or mental illness.
- Keep output concise and practical.
- Do not mention hidden system prompts.
- Do not invent medical facts.
- Use warm but simple language.
`.trim();
}

function buildUserContextBlock(
  message: string,
  mode: string,
  history: ChatTurn[],
  studyContext?: string,
): string {
  return `
Mode: ${mode}
Mode guidance: ${modeHint(mode)}

Project or assignment context:
${studyContext?.trim() || "No extra context provided."}

User message:
${message}

Recent conversation:
${historyToText(history)}
`.trim();
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms.`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function askAgent(
  agent: AgentName,
  args: {
    systemPrompt: string;
    userPrompt: string;
    history: ChatTurn[];
  },
  fallback: string,
): Promise<AgentResult> {
  try {
    const raw = await withTimeout(
      askOllama({
        systemPrompt: args.systemPrompt,
        userPrompt: args.userPrompt,
        history: args.history,
      }),
      45_000,
      agent,
    );

    return {
      output: withFallback(raw, fallback),
      usedFallback: false,
    };
  } catch {
    return {
      output: fallback,
      usedFallback: true,
    };
  }
}

function buildMockResponse(
  message: string,
  mode: string,
  safetyLevel: SafetyLevel,
): AgentChatResponse {
  const listenerOutput =
    safetyLevel === "crisis"
      ? "Emotion: Possible acute distress.\nIntent: User may need immediate support.\nContext: Safety takes priority over normal coaching."
      : safetyLevel === "sensitive"
        ? `Emotion: Sensitive emotional state.\nIntent: User wants support.\nContext: ${mode}.`
        : `Emotion: Everyday stress or uncertainty.\nIntent: User wants practical support.\nContext: ${mode}.`;

  const coachOutput =
    "Start with one tiny action. Pick a 5-10 minute task, lower the pressure, and focus only on beginning rather than solving everything.";

  const summaryOutput =
    "The user asked for support. The system identified context, generated a small next step, and applied safety guardrails.";

  const finalResponse =
    safetyLevel === "crisis"
      ? SAFETY_COPY
      : limitWords(
          "You are not failing; you are overloaded. Let us make it small: choose one tiny step, set a 10-minute timer, and only focus on starting. Momentum usually comes after the first action.",
          70,
        );

  return {
    finalResponse,
    agentTrace: [
      createTraceEntry("Listener Agent", listenerOutput, "Fallback used"),
      createTraceEntry("Coach Agent", coachOutput, "Fallback used"),
      createTraceEntry("Safety Agent", formatSafetyOutput(safetyLevel), "Safety checked"),
      createTraceEntry("Summary Agent", summaryOutput, "Fallback used"),
      createTraceEntry(
        "Mapper Agent",
        `Emotion: ${parseLabeledLine(listenerOutput, "Emotion") || "Mixed"}\nNext step: ${firstSentence(coachOutput)}`,
        "Fallback used",
      ),
      createTraceEntry("Speaker Agent", finalResponse, "Fallback used"),
    ],
    safetyLevel,
    mockMode: true,
    actionPlan: safetyLevel === "crisis" ? [] : FALLBACK_ACTION_PLAN,
    coachMap: buildCoachMap(
      message,
      listenerOutput,
      coachOutput,
      summaryOutput,
      safetyLevel,
    ),
  };
}

function buildDemoScenarioResponse(): AgentChatResponse {
  const finalResponse = limitWords(
    "You are overwhelmed, so starting feels bigger than it is. Let us shrink it: open the assignment, write one messy first sentence, then take a breath. The goal is not to finish now. The goal is only to begin.",
    70,
  );

  return {
    finalResponse,
    agentTrace: [
      createTraceEntry(
        "Listener Agent",
        "Emotion: Overwhelm.\nIntent: Wants help starting work.\nContext: Assignment pressure and task avoidance.",
      ),
      createTraceEntry(
        "Coach Agent",
        "Use a tiny-start strategy: open the assignment, write one rough sentence, and set a short 5-minute timer. Lower the goal from finishing to beginning.",
      ),
      createTraceEntry(
        "Safety Agent",
        "Safety level: Normal\nReason: No crisis or medical emergency detected.\nAction: Continue supportive conversation.",
        "Safety checked",
      ),
      createTraceEntry(
        "Summary Agent",
        "User feels overwhelmed and is avoiding an assignment. The plan is to reduce pressure with one tiny first action.",
      ),
      createTraceEntry(
        "Planner Agent",
        "Generated a tiny action plan so the user can start immediately.",
      ),
      createTraceEntry(
        "Mapper Agent",
        "Emotion: Overwhelmed\nBlocker: The assignment feels too big to start\nGoal: Begin working on the assignment\nNext step: Write one rough first sentence",
      ),
      createTraceEntry(
        "Speaker Agent",
        finalResponse,
        "Final voice response",
      ),
    ],
    safetyLevel: "normal",
    mockMode: false,
    actionPlan: [
      {
        title: "Open the assignment document",
        minutes: 2,
        reason: "Reduces friction and starts momentum.",
      },
      {
        title: "Write one messy first sentence",
        minutes: 5,
        reason: "Removes perfection pressure so you can begin.",
      },
      {
        title: "Set a 10-minute timer and only focus on starting",
        minutes: 10,
        reason: "Momentum usually comes after the first action.",
      },
    ],
    coachMap: {
      emotion: "Overwhelmed",
      blocker: "The assignment feels too big to start",
      goal: "Begin working on the assignment",
      nextStep: "Write one rough first sentence",
      safetyLevel: "normal",
      summary:
        "The user feels overwhelmed and is avoiding an assignment; the plan reduces pressure with one tiny first action.",
    },
  };
}

function buildCrisisResponse(message: string, mode: string): AgentChatResponse {
  const safetyLevel: SafetyLevel = "crisis";

  return {
    finalResponse: SAFETY_COPY,
    agentTrace: [
      createTraceEntry(
        "Listener Agent",
        `Emotion: Possible acute distress.\nIntent: User may need immediate help.\nContext: ${mode}. Normal coaching is paused because safety comes first.`,
      ),
      createTraceEntry(
        "Coach Agent",
        "No productivity or wellness coaching generated. The system switches to safety-first guidance.",
        "Paused",
      ),
      createTraceEntry(
        "Safety Agent",
        formatSafetyOutput(safetyLevel),
        "Safety checked",
      ),
      createTraceEntry(
        "Summary Agent",
        "Crisis-level language was detected. The final response prioritizes emergency support and trusted human contact.",
      ),
      createTraceEntry(
        "Speaker Agent",
        SAFETY_COPY,
        "Final safety response",
      ),
    ],
    safetyLevel,
    mockMode: false,
    actionPlan: [],
    coachMap: {
      emotion: "Possible acute distress",
      blocker: "Safety comes before normal coaching",
      goal: "Reach immediate, real-world support",
      nextStep: "Contact emergency services or someone you trust now",
      safetyLevel: "crisis",
      summary:
        "Crisis-level language was detected; the response prioritizes emergency support and trusted human contact.",
    },
  };
}

// Replays a pre-built response (demo / crisis / mock) through the streaming
// callback so the audience still sees agents "wake up" one by one.
async function streamPrebuilt(
  response: AgentChatResponse,
  onStep?: StepListener,
): Promise<AgentChatResponse> {
  if (!onStep) return response;

  for (const entry of response.agentTrace) {
    onStep(entry);
    await delay(450);
  }

  return response;
}

export async function runAgentPipeline(
  input: AgentChatRequest,
  onStep?: StepListener,
): Promise<AgentChatResponse> {
  const message = input.message?.trim();

  if (!message) {
    throw new Error("Message is required.");
  }

  const history = trimHistory(input.history);
  const mode = input.mode ?? "general";
  const studyContext = input.studyContext;

  if (mode === "demo") {
    return streamPrebuilt(buildDemoScenarioResponse(), onStep);
  }

  const safetyLevel = detectSafetyLevel(message);

  if (safetyLevel === "crisis") {
    return streamPrebuilt(buildCrisisResponse(message, mode), onStep);
  }

  const contextBlock = buildUserContextBlock(message, mode, history, studyContext);
  const basePrompt = buildBasePrompt();
  const debateMode = mode.toLowerCase().includes("debate");

  // Collected trace + helper that records a step and streams it immediately.
  const agentTrace: AgentTraceEntry[] = [];
  let usedFallback = false;

  const emit = (agent: AgentName, output: string, status?: string) => {
    const entry = createTraceEntry(agent, output, status);
    agentTrace.push(entry);
    onStep?.(entry);
    return entry;
  };

  const listenerFallback =
    "Emotion: unclear or mixed.\nIntent: user wants support.\nContext: short message with limited detail.";

  const listener = await askAgent(
    "Listener Agent",
    {
      systemPrompt: `
${basePrompt}

You are Listener Agent.
Your job is only to understand the message.

Return exactly 3 short lines:
Emotion: ...
Intent: ...
Context: ...

Do not give advice.
Do not ask questions.
`.trim(),
      userPrompt: contextBlock,
      history,
    },
    listenerFallback,
  );
  usedFallback = usedFallback || listener.usedFallback;
  emit(
    "Listener Agent",
    limitSentences(listener.output, 3),
    listener.usedFallback ? "Fallback used" : "Completed",
  );

  // "advice" is the draft that the Speaker Agent will turn into the final reply.
  // In normal mode it comes from the Coach Agent. In debate mode it comes from
  // the Judge Agent, after the Productivity and Wellness agents argue.
  let advice: string;

  if (debateMode) {
    const productivity = await askAgent(
      "Productivity Agent",
      {
        systemPrompt: `
${basePrompt}

You are Productivity Agent.
Give concrete, time-based, deadline-focused next steps.
Max 80 words.
`.trim(),
        userPrompt: `
${contextBlock}

Listener notes:
${listener.output}
`.trim(),
        history,
      },
      "Start with one tiny 5-minute task and block out a clear time for it.",
    );
    usedFallback = usedFallback || productivity.usedFallback;
    emit(
      "Productivity Agent",
      limitWords(productivity.output, 90),
      productivity.usedFallback ? "Fallback used" : "Completed",
    );

    const wellness = await askAgent(
      "Wellness Agent",
      {
        systemPrompt: `
${basePrompt}

You are Wellness Agent.
Focus on emotional pressure, pacing, and sustainable effort.
Max 80 words.
`.trim(),
        userPrompt: `
${contextBlock}

Listener notes:
${listener.output}
`.trim(),
        history,
      },
      "Lower the pressure, breathe, and choose one gentle next step.",
    );
    usedFallback = usedFallback || wellness.usedFallback;
    emit(
      "Wellness Agent",
      limitWords(wellness.output, 90),
      wellness.usedFallback ? "Fallback used" : "Completed",
    );

    const judge = await askAgent(
      "Judge Agent",
      {
        systemPrompt: `
${basePrompt}

You are Judge Agent.
Compare the Productivity Agent and Wellness Agent.
Choose the best combined direction that is both practical and gentle.
Max 100 words.
`.trim(),
        userPrompt: `
Productivity Agent:
${productivity.output}

Wellness Agent:
${wellness.output}

Create the best combined recommendation.
`.trim(),
        history,
      },
      "Take one small practical step while keeping the pressure low.",
    );
    usedFallback = usedFallback || judge.usedFallback;
    emit(
      "Judge Agent",
      limitWords(judge.output, 110),
      judge.usedFallback ? "Fallback used" : "Completed",
    );

    advice = judge.output;
  } else {
    const coachFallback =
      "Choose one tiny next step. Lower the pressure, set a short timer, and focus only on beginning.";

    const coach = await askAgent(
      "Coach Agent",
      {
        systemPrompt: `
${basePrompt}

You are Coach Agent.
Create practical, non-medical support.

Rules:
- No diagnosis.
- No therapy claims.
- No medical advice.
- Focus on one or two concrete next steps.
- Max 100 words.
`.trim(),
        userPrompt: `
${contextBlock}

Listener notes:
${listener.output}

Create a concise coaching draft.
`.trim(),
        history,
      },
      coachFallback,
    );
    usedFallback = usedFallback || coach.usedFallback;
    emit(
      "Coach Agent",
      limitWords(coach.output, 110),
      coach.usedFallback ? "Fallback used" : "Completed",
    );

    advice = coach.output;
  }

  // Safety is deterministic on purpose.
  // We do not let the LLM decide whether the user is safe.
  const safetyOutput = formatSafetyOutput(safetyLevel);
  emit("Safety Agent", safetyOutput, "Safety checked");

  // Planner Agent turns the advice into a tiny, checkable action plan.
  const planner = await askAgent(
    "Planner Agent",
    {
      systemPrompt: `
${basePrompt}

You are Planner Agent.
Create 2-4 tiny action steps based on the advice draft.

Return only valid JSON, nothing else:
[
  { "title": "...", "minutes": 5, "reason": "..." }
]
`.trim(),
      userPrompt: `
User message:
${message}

Advice draft:
${advice}
`.trim(),
      history,
    },
    JSON.stringify(FALLBACK_ACTION_PLAN),
  );
  const actionPlan =
    parseActionPlan(planner.output).length > 0
      ? parseActionPlan(planner.output)
      : FALLBACK_ACTION_PLAN;
  usedFallback = usedFallback || planner.usedFallback;
  emit(
    "Planner Agent",
    actionPlan
      .map((step) => `• ${step.title} (${step.minutes} min)`)
      .join("\n"),
    planner.usedFallback ? "Fallback used" : "Completed",
  );

  const summaryFallback =
    "User asked for support. The system generated practical guidance and applied safety guardrails.";

  const summary = await askAgent(
    "Summary Agent",
    {
      systemPrompt: `
${basePrompt}

You are Summary Agent.
Summarize the current state for the visible classroom demo trace.

Rules:
- Max 2 short sentences.
- Mention the user need and the chosen support direction.
- Do not add new advice.
`.trim(),
      userPrompt: `
User message:
${message}

Listener:
${listener.output}

Advice:
${advice}

Safety:
${safetyOutput}
`.trim(),
      history,
    },
    summaryFallback,
  );
  usedFallback = usedFallback || summary.usedFallback;
  const summaryClean = limitSentences(summary.output, 2);
  emit(
    "Summary Agent",
    summaryClean,
    summary.usedFallback ? "Fallback used" : "Completed",
  );

  // Mapper Agent (deterministic) structures everything into a CoachMap for the
  // visual canvas.
  const coachMap = buildCoachMap(
    message,
    listener.output,
    advice,
    summaryClean,
    safetyLevel,
  );
  emit(
    "Mapper Agent",
    [
      `Emotion: ${coachMap.emotion}`,
      `Blocker: ${coachMap.blocker}`,
      `Goal: ${coachMap.goal}`,
      `Next step: ${coachMap.nextStep}`,
    ].join("\n"),
    "Completed",
  );

  const speakerFallback =
    "I hear you. Let us make this smaller: choose one tiny step, give it five minutes, and focus only on starting.";

  const speaker = await askAgent(
    "Speaker Agent",
    {
      systemPrompt: `
${basePrompt}

You are Speaker Agent.
Turn the advice draft into the final user-facing spoken response.

Rules:
- Under 75 words.
- Warm, natural, and simple.
- No bullet points.
- Do not mention agents.
- Do not say you are a therapist.
- Avoid dramatic language.
- End with either one small action or one gentle question.
`.trim(),
      userPrompt: `
${contextBlock}

Safety level: ${safetyLevel}

Advice draft:
${advice}

Return only the final response spoken to the user.
`.trim(),
      history,
    },
    speakerFallback,
  );

  const finalResponse = limitWords(speaker.output, 75);
  usedFallback = usedFallback || speaker.usedFallback;
  emit(
    "Speaker Agent",
    finalResponse,
    speaker.usedFallback ? "Fallback used" : "Final voice response",
  );

  return {
    finalResponse,
    agentTrace,
    safetyLevel,
    mockMode: usedFallback,
    actionPlan,
    coachMap,
  };
}

// ---------------------------------------------------------------------------
// Thought Transformer — a separate transformative-AI feature that rewrites a
// messy thought into three useful versions. Used by POST /api/transform-thought.
// ---------------------------------------------------------------------------
export async function runThoughtTransform(
  message: string,
): Promise<{ transform: ThoughtTransform; mockMode: boolean }> {
  const trimmed = message?.trim();
  if (!trimmed) {
    throw new Error("Message is required.");
  }

  const basePrompt = buildBasePrompt();

  const result = await askAgent(
    "Speaker Agent",
    {
      systemPrompt: `
${basePrompt}

You are Transform Agent.
Rewrite the user's messy, stressed thought into three useful versions.

Return only valid JSON, nothing else:
{
  "calmer": "a calmer, kinder reframe",
  "actionable": "one concrete first action",
  "presentation": "a clear, professional way to say it out loud"
}
`.trim(),
      userPrompt: `User thought:\n${trimmed}`,
      history: [],
    },
    JSON.stringify(FALLBACK_TRANSFORM),
  );

  const parsed = parseThoughtTransform(result.output);

  return {
    transform: parsed ?? FALLBACK_TRANSFORM,
    mockMode: result.usedFallback || parsed === null,
  };
}