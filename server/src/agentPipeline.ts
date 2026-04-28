import { askOllama } from "./ollama";
import type {
  AgentChatRequest,
  AgentChatResponse,
  AgentTraceEntry,
  SafetyLevel,
  ChatTurn,
} from "./types";

const CRISIS_KEYWORDS = [
  "suicide",
  "kill myself",
  "self-harm",
  "hurt myself",
  "hurt someone",
  "kill someone",
  "overdose",
  "abuse",
  "medical emergency",
  "i want to die",
];

const SENSITIVE_KEYWORDS = [
  "panic",
  "anxious",
  "depressed",
  "hopeless",
  "trauma",
  "harm",
  "unsafe",
];

const SAFETY_COPY =
  "I’m not a medical professional, but if you might hurt yourself or someone else, contact local emergency services now or reach out to someone you trust immediately.";

function detectSafetyLevel(message: string): SafetyLevel {
  const lower = message.toLowerCase();
  if (CRISIS_KEYWORDS.some((word) => lower.includes(word))) return "crisis";
  if (SENSITIVE_KEYWORDS.some((word) => lower.includes(word))) return "sensitive";
  return "normal";
}

function trimHistory(history: ChatTurn[] | undefined): ChatTurn[] {
  return (history ?? []).slice(-8);
}

function withFallback(text: string, fallback: string): string {
  const cleaned = text.trim();
  return cleaned.length > 0 ? cleaned : fallback;
}

function limitWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text.trim();
  return `${words.slice(0, maxWords).join(" ")}...`;
}

function buildMockResponse(message: string, mode: string, safetyLevel: SafetyLevel): AgentChatResponse {
  const listenerOutput = `Intent: user needs practical support.\nEmotion: ${
    safetyLevel === "crisis" ? "high risk/distress" : safetyLevel === "sensitive" ? "sensitive stress" : "everyday overwhelm"
  }.\nContext: mode=${mode}; message="${message}".`;

  const coachOutput =
    "Try one 10-minute start: open your assignment, write one rough bullet list, then choose only the first tiny task. Set a timer, then reassess.";

  const safetyOutput =
    safetyLevel === "crisis"
      ? "level=crisis; rationale=user indicates possible harm risk; required_action=show immediate emergency guidance."
      : safetyLevel === "sensitive"
        ? "level=sensitive; rationale=emotional strain language detected; required_action=keep calm, practical, non-medical support."
        : "level=normal; rationale=no immediate crisis indicators; required_action=practical coaching response.";

  const summaryOutput =
    "User asked for support with stress/productivity. Pipeline identified context, generated practical next steps, and applied safety guardrails.";

  const speakerBase =
    safetyLevel === "crisis"
      ? "I’m not a medical professional, but if you might hurt yourself or someone else, contact local emergency services now or reach out to someone you trust immediately."
      : "You are not failing, you are overloaded. Let us make this tiny: spend 10 minutes writing one rough first step, then stop and review. Starting small builds momentum.";

  const speakerOutput = limitWords(speakerBase, 80);

  return {
    finalResponse: speakerOutput,
    agentTrace: [
      { agent: "Listener Agent", output: listenerOutput },
      { agent: "Coach Agent", output: coachOutput },
      { agent: "Safety Agent", output: safetyOutput },
      { agent: "Summary Agent", output: summaryOutput },
      { agent: "Speaker Agent", output: speakerOutput },
    ],
    safetyLevel,
    mockMode: true,
  };
}

export async function runAgentPipeline(input: AgentChatRequest): Promise<AgentChatResponse> {
  const message = input.message?.trim();
  if (!message) throw new Error("Message is required.");

  const history = trimHistory(input.history);
  const mode = input.mode ?? "general";
  const safetyLevel = detectSafetyLevel(message);

  const trace: AgentTraceEntry[] = [];

  try {
    // Agent 1: Listener extracts intent + emotion for the rest of the pipeline.
    const listenerOutput = withFallback(
      await askOllama({
        systemPrompt:
          "You are Listener Agent. Extract user intent, emotion, and context in 2-4 bullet points. No advice.",
        userPrompt: `Mode: ${mode}\nUser message: ${message}`,
        history,
      }),
      "Intent: user wants support.\nEmotion: mixed/unclear.\nContext: short message.",
    );
    trace.push({ agent: "Listener Agent", output: listenerOutput });

    // Agent 2: Coach proposes practical, non-medical support.
    const coachOutput = withFallback(
      await askOllama({
        systemPrompt:
          "You are Coach Agent for a wellness/study/productivity companion. Give practical next steps only. No diagnosis. No medical claims.",
        userPrompt: `User message: ${message}\nListener notes:\n${listenerOutput}\nMode: ${mode}\nGive a concise coaching draft (max 130 words).`,
        history,
      }),
      "Let's pick one tiny step first, then build from there.",
    );
    trace.push({ agent: "Coach Agent", output: coachOutput });

    // Agent 3: Safety ensures crisis language is handled explicitly.
    const safetyOutput = withFallback(
      await askOllama({
        systemPrompt:
          "You are Safety Agent. Classify risk as normal, sensitive, or crisis. Mention concerns briefly.",
        userPrompt: `User message: ${message}\nDetected level: ${safetyLevel}\nRespond as: level=<...>; rationale=<...>; required_action=<...>.`,
        history,
      }),
      `level=${safetyLevel}; rationale=keyword-based; required_action=${
        safetyLevel === "crisis" ? "show emergency guidance" : "normal supportive response"
      }.`,
    );
    trace.push({ agent: "Safety Agent", output: safetyOutput });

    // Agent 4: Summary is a demo artifact that shows state progression.
    const summaryOutput = withFallback(
      await askOllama({
        systemPrompt:
          "You are Summary Agent. Create a concise conversation state summary for demo trace only.",
        userPrompt: `Summarize current state in 2-3 lines.\nUser: ${message}\nListener:\n${listenerOutput}\nCoach:\n${coachOutput}\nSafety:\n${safetyOutput}`,
        history,
      }),
      "User asked for support. Pipeline produced practical, non-medical guidance with safety check.",
    );
    trace.push({ agent: "Summary Agent", output: summaryOutput });

    const crisisPrefix = safetyLevel === "crisis" ? `${SAFETY_COPY}\n\n` : "";

    // Agent 5: Speaker writes final warm response (short for TTS).
    const speakerDraft = withFallback(
      await askOllama({
        systemPrompt:
          "You are Speaker Agent. Create a warm final response for the user under 80 words unless user asks for more. Non-medical wellness tone.",
        userPrompt: `User message: ${message}\nCoaching draft:\n${coachOutput}\nSafety level: ${safetyLevel}\nSafety copy to include if crisis:\n${SAFETY_COPY}\nReturn final user-facing response only.`,
        history,
      }),
      coachOutput,
    );
    const speakerOutput = limitWords(speakerDraft, 80);

    const finalResponse =
      safetyLevel === "crisis" ? `${crisisPrefix}${speakerOutput}` : speakerOutput;

    trace.push({ agent: "Speaker Agent", output: speakerOutput });

    return {
      finalResponse,
      agentTrace: trace,
      safetyLevel,
      mockMode: false,
    };
  } catch {
    return buildMockResponse(message, mode, safetyLevel);
  }
}
