export type AppPresence = "idle" | "listening" | "speaking";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

export type AgentTraceEntry = {
  agent: "Listener Agent" | "Coach Agent" | "Safety Agent" | "Summary Agent" | "Speaker Agent";
  output: string;
};

export type SafetyLevel = "normal" | "sensitive" | "crisis";

export type AgentChatResult = {
  finalResponse: string;
  agentTrace: AgentTraceEntry[];
  safetyLevel: SafetyLevel;
  mockMode: boolean;
};
