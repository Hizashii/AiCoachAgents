export type ChatRole = "user" | "assistant";

export type ChatTurn = {
  role: ChatRole;
  content: string;
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
};

// Structured map of how the AI understood the situation, used by Coach Canvas.
export type CoachMap = {
  emotion: string;
  blocker: string;
  goal: string;
  nextStep: string;
  safetyLevel: SafetyLevel;
  summary: string;
};

// Three transformed versions of a messy user thought.
export type ThoughtTransform = {
  calmer: string;
  actionable: string;
  presentation: string;
};

export type AgentChatRequest = {
  message: string;
  mode?: string;
  history?: ChatTurn[];
  studyContext?: string;
};

export type TransformRequest = {
  message: string;
};

export type AgentChatResponse = {
  finalResponse: string;
  agentTrace: AgentTraceEntry[];
  safetyLevel: SafetyLevel;
  mockMode: boolean;
  actionPlan?: ActionStep[];
  coachMap?: CoachMap;
};
