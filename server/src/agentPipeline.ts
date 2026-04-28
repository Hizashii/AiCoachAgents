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

function limitSentences(text: string, maxSentences: number): string {
  const sentences = text
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);
  if (sentences.length <= maxSentences) return text.trim();
  return sentences.slice(0, maxSentences).join(" ").trim();
}

function cleanSummaryText(text: string): string {
  const noMarkdown = text.replace(/\*\*/g, "").trim();
  const lines = noMarkdown
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^here is\b/i.test(line))
    .filter((line) => !/^demo summary[:\-]?/i.test(line));
  return lines.join(" ");
}

function prettifySafetyLevel(level: SafetyLevel): "Normal" | "Sensitive" | "Crisis" {
  if (level === "crisis") return "Crisis";
  if (level === "sensitive") return "Sensitive";
  return "Normal";
}

function safetyReason(level: SafetyLevel): string {
  if (level === "crisis") return "Potential crisis or harm-risk language detected.";
  if (level === "sensitive") return "Sensitive emotional language detected.";
  return "No crisis or medical emergency detected.";
}

function safetyAction(level: SafetyLevel): string {
  if (level === "crisis") {
    return "Provide immediate emergency guidance and encourage contacting local emergency services or a trusted person.";
  }
  if (level === "sensitive") return "Use calm, practical, non-medical support with extra care.";
  return "Continue supportive conversation.";
}

function formatSafetyOutput(level: SafetyLevel): string {
  return `Safety level: ${prettifySafetyLevel(level)}\nReason: ${safetyReason(level)}\nAction: ${safetyAction(level)}`;
}

function buildMockResponse(message: string, mode: string, safetyLevel: SafetyLevel): AgentChatResponse {
  const listenerOutput = `Emotion: ${
    safetyLevel === "crisis" ? "high risk/distress" : safetyLevel === "sensitive" ? "sensitive stress" : "everyday overwhelm"
  }.\nIntent: practical support.\nContext: ${mode}.`;

  const coachOutput =
    "Try one 10-minute start: open your assignment, write one rough bullet list, then choose only the first tiny task. Set a timer, then reassess.";

  const safetyOutput = formatSafetyOutput(safetyLevel);

  const summaryOutput =
    "User asked for practical support. The pipeline identified context, generated small next steps, and applied safety guardrails.";

  const speakerDraft =
    safetyLevel === "crisis"
      ? "I’m not a medical professional, but if you might hurt yourself or someone else, contact local emergency services now or reach out to someone you trust immediately."
      : "You are not failing, you are overloaded. Let us make this tiny: spend 10 minutes writing one rough first step, then stop and review. Starting small builds momentum.";
  const speakerOutput = limitWords(speakerDraft, 80);
  const finalResponse = speakerOutput;

  return {
    finalResponse,
    agentTrace: [
      { agent: "Listener Agent", output: listenerOutput },
      { agent: "Coach Agent", output: coachOutput },
      { agent: "Safety Agent", output: safetyOutput },
      { agent: "Summary Agent", output: summaryOutput },
      { agent: "Speaker Agent", output: finalResponse },
    ],
    safetyLevel,
    mockMode: true,
  };
}

function buildDemoScenarioResponse(): AgentChatResponse {
  const finalResponse = limitWords(
    "You are overwhelmed, and that makes starting feel hard. Let us make it tiny: open your assignment, write one rough sentence for the intro, then stop for a breath. Small starts reduce pressure and build momentum. You can do this one step at a time.",
    70,
  );

  return {
    finalResponse,
    agentTrace: [
      {
        agent: "Listener Agent",
        output:
          "Emotion: Overwhelm.\nIntent: Wants help starting work.\nContext: Assignment deadline pressure with task avoidance.",
      },
      {
        agent: "Coach Agent",
        output:
          "Start with one tiny step: open the assignment and write one rough sentence. Set a 5-minute timer, then reassess.",
      },
      {
        agent: "Safety Agent",
        output:
          "Safety level: Normal\nReason: No crisis or medical emergency detected.\nAction: Continue supportive conversation.",
      },
      {
        agent: "Summary Agent",
        output:
          "User feels overwhelmed and is avoiding starting an assignment. Plan is to lower friction with one tiny first action and short timing.",
      },
      {
        agent: "Speaker Agent",
        output: finalResponse,
      },
    ],
    safetyLevel: "normal",
    mockMode: false,
  };
}

export async function runAgentPipeline(input: AgentChatRequest): Promise<AgentChatResponse> {
  const message = input.message?.trim();
  if (!message) throw new Error("Message is required.");

  const history = trimHistory(input.history);
  const mode = input.mode ?? "general";
  if (mode === "demo") return buildDemoScenarioResponse();
  const safetyLevel = detectSafetyLevel(message);

  const trace: AgentTraceEntry[] = [];

  try {
    // Agent 1: Listener extracts intent + emotion for the rest of the pipeline.
    const listenerOutput = withFallback(
      await askOllama({
        systemPrompt:
          "You are Listener Agent. Return exactly 3 short lines: Emotion: ..., Intent: ..., Context: .... No advice.",
        userPrompt: `Mode: ${mode}\nUser message: ${message}`,
        history,
      }),
      "Emotion: mixed/unclear.\nIntent: user wants support.\nContext: short message.",
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
          "You are Safety Agent. Keep output concise and user-friendly for a class demo.",
        userPrompt: `User message: ${message}\nDetected level: ${safetyLevel}\nWrite exactly 3 lines:\nSafety level: <Normal|Sensitive|Crisis>\nReason: <one short sentence>\nAction: <one short sentence>`,
        history,
      }),
      formatSafetyOutput(safetyLevel),
    );
    trace.push({ agent: "Safety Agent", output: safetyOutput });

    // Agent 4: Summary is a demo artifact that shows state progression.
    const summaryOutput = withFallback(
      await askOllama({
        systemPrompt:
          "You are Summary Agent. Write at most 2 short sentences for a classroom demo trace.",
        userPrompt: `Summarize current state in 2-3 lines.\nUser: ${message}\nListener:\n${listenerOutput}\nCoach:\n${coachOutput}\nSafety:\n${safetyOutput}`,
        history,
      }),
      "User asked for support. Pipeline produced practical, non-medical guidance with safety check.",
    );
    trace.push({ agent: "Summary Agent", output: summaryOutput });

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
    const listenerClean = limitSentences(listenerOutput, 3);
    const summaryClean = limitSentences(cleanSummaryText(summaryOutput), 2);
    const finalResponse =
      safetyLevel === "crisis" ? `${SAFETY_COPY}\n\n${speakerOutput}` : speakerOutput;

    trace[0] = { agent: "Listener Agent", output: listenerClean };
    trace[2] = { agent: "Safety Agent", output: formatSafetyOutput(safetyLevel) };
    trace[3] = { agent: "Summary Agent", output: summaryClean };
    trace.push({ agent: "Speaker Agent", output: finalResponse });

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
