export type AppPresence = "idle" | "listening" | "speaking";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

export type AgentName =
  | "Listener Agent"
  | "Coach Agent"
  | "Productivity Agent"
  | "Wellness Agent"
  | "Judge Agent"
  | "Planner Agent"
  | "Mapper Agent"
  | "Safety Agent"
  | "Summary Agent"
  | "Speaker Agent";

export type AgentTraceEntry = {
  agent: AgentName;
  output: string;
};

export type SafetyLevel = "normal" | "sensitive" | "crisis";

export type ActionStep = {
  title: string;
  minutes: number;
  reason: string;
  completed?: boolean;
};

export type CoachMap = {
  emotion: string;
  blocker: string;
  goal: string;
  nextStep: string;
  safetyLevel: SafetyLevel;
  summary: string;
};

export type ThoughtTransform = {
  calmer: string;
  actionable: string;
  presentation: string;
};

export type AgentChatResult = {
  finalResponse: string;
  agentTrace: AgentTraceEntry[];
  safetyLevel: SafetyLevel;
  mockMode: boolean;
  actionPlan?: ActionStep[];
  coachMap?: CoachMap;
};
