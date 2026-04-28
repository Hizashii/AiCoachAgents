import { askOllama } from "./ollama";
import type {
  AgentChatRequest,
  AgentChatResponse,
  AgentTraceEntry,
  SafetyLevel,
  ChatTurn,
} from "./types";

type AgentName =
  | "Listener Agent"
  | "Coach Agent"
  | "Safety Agent"
  | "Summary Agent"
  | "Speaker Agent";

type AgentResult = {
  output: string;
  usedFallback: boolean;
};

const SAFETY_COPY =
  "I’m not a medical professional, but if you might hurt yourself or someone else, contact local emergency services now or reach out to someone you trust immediately.";

const AGENT_ROLES: Record<AgentName, string> = {
  "Listener Agent": "Understands the user's emotion, intent, and context.",
  "Coach Agent": "Creates practical, non-medical next steps.",
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
): string {
  return `
Mode: ${mode}
Mode guidance: ${modeHint(mode)}

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
      createTraceEntry("Speaker Agent", finalResponse, "Fallback used"),
    ],
    safetyLevel,
    mockMode: true,
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
        "Speaker Agent",
        finalResponse,
        "Final voice response",
      ),
    ],
    safetyLevel: "normal",
    mockMode: false,
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
  };
}

export async function runAgentPipeline(
  input: AgentChatRequest,
): Promise<AgentChatResponse> {
  const message = input.message?.trim();

  if (!message) {
    throw new Error("Message is required.");
  }

  const history = trimHistory(input.history);
  const mode = input.mode ?? "general";

  if (mode === "demo") {
    return buildDemoScenarioResponse();
  }

  const safetyLevel = detectSafetyLevel(message);

  if (safetyLevel === "crisis") {
    return buildCrisisResponse(message, mode);
  }

  const contextBlock = buildUserContextBlock(message, mode, history);
  const basePrompt = buildBasePrompt();

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

  // Safety is deterministic on purpose.
  // We do not let the LLM decide whether the user is safe.
  const safetyOutput = formatSafetyOutput(safetyLevel);

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

Coach:
${coach.output}

Safety:
${safetyOutput}
`.trim(),
      history,
    },
    summaryFallback,
  );

  const speakerFallback =
    "I hear you. Let us make this smaller: choose one tiny step, give it five minutes, and focus only on starting.";

  const speaker = await askAgent(
    "Speaker Agent",
    {
      systemPrompt: `
${basePrompt}

You are Speaker Agent.
Turn the coaching draft into the final user-facing spoken response.

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

Coaching draft:
${coach.output}

Return only the final response spoken to the user.
`.trim(),
      history,
    },
    speakerFallback,
  );

  const finalResponse = limitWords(speaker.output, 75);
  const summaryClean = limitSentences(summary.output, 2);

  const agentTrace: AgentTraceEntry[] = [
    createTraceEntry(
      "Listener Agent",
      limitSentences(listener.output, 3),
      listener.usedFallback ? "Fallback used" : "Completed",
    ),
    createTraceEntry(
      "Coach Agent",
      limitWords(coach.output, 110),
      coach.usedFallback ? "Fallback used" : "Completed",
    ),
    createTraceEntry(
      "Safety Agent",
      safetyOutput,
      "Safety checked",
    ),
    createTraceEntry(
      "Summary Agent",
      summaryClean,
      summary.usedFallback ? "Fallback used" : "Completed",
    ),
    createTraceEntry(
      "Speaker Agent",
      finalResponse,
      speaker.usedFallback ? "Fallback used" : "Final voice response",
    ),
  ];

  return {
    finalResponse,
    agentTrace,
    safetyLevel,
    mockMode:
      listener.usedFallback ||
      coach.usedFallback ||
      summary.usedFallback ||
      speaker.usedFallback,
  };
}