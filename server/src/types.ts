export type ChatRole = "user" | "assistant";

export type ChatTurn = {
  role: ChatRole;
  content: string;
};

export type AgentTraceEntry = {
  agent: "Listener Agent" | "Coach Agent" | "Safety Agent" | "Summary Agent" | "Speaker Agent";
  output: string;
};

export type SafetyLevel = "normal" | "sensitive" | "crisis";

export type AgentChatRequest = {
  message: string;
  mode?: string;
  history?: ChatTurn[];
};

export type AgentChatResponse = {
  finalResponse: string;
  agentTrace: AgentTraceEntry[];
  safetyLevel: SafetyLevel;
  mockMode: boolean;
};
