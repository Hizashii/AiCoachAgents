import type { SafetyLevel } from "./types";

export type MoodLog = {
  id: string;
  createdAt: string;
  label: string | null;
  mode: string | null;
  safetyLevel: SafetyLevel | null;
  userMessage: string;
  assistantReply: string;
};

const KEY = "ethereal-wellness-mood-log";

export function getMoodLogs(): MoodLog[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as MoodLog[]) : [];
  } catch {
    return [];
  }
}

export function saveMoodLog(log: MoodLog): void {
  if (typeof localStorage === "undefined") return;
  const logs = getMoodLogs();
  // Keep the 50 most recent sessions, newest first.
  localStorage.setItem(KEY, JSON.stringify([log, ...logs].slice(0, 50)));
}

export function clearMoodLogs(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(KEY);
}
