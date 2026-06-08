import { useEffect, useState } from "react";
import {
  Activity,
  History,
  ListChecks,
  Network,
  ShieldCheck,
  ShieldAlert,
  Shield,
  BrainCircuit,
} from "lucide-react";
import { AgentNetwork } from "./AgentNetwork";
import { AgentReplayTimeline } from "./AgentReplayTimeline";
import { ActionPlanPanel } from "./ActionPlanPanel";
import { CoachCanvas } from "./CoachCanvas";
import { SafetyPanel } from "./SafetyPanel";
import type { ActionStep, AgentTraceEntry, CoachMap, SafetyLevel } from "../types";

type IntelTab = "live" | "replay" | "plan" | "canvas" | "safety";

type AgentIntelligencePanelProps = {
  trace: AgentTraceEntry[];
  thinkingTrace: AgentTraceEntry[];
  isThinking: boolean;
  debateMode: boolean;
  safetyLevel: SafetyLevel | null;
  actionPlan: ActionStep[];
  coachMap: CoachMap | null;
};

const TABS: Array<{ id: IntelTab; label: string; icon: typeof Activity }> = [
  { id: "live", label: "Live", icon: Activity },
  { id: "replay", label: "Replay", icon: History },
  { id: "plan", label: "Plan", icon: ListChecks },
  { id: "canvas", label: "Canvas", icon: Network },
  { id: "safety", label: "Safety", icon: ShieldCheck },
];

const SAFETY_DETAIL: Record<SafetyLevel, { icon: typeof Shield; tone: string; reason: string; action: string }> = {
  normal: {
    icon: ShieldCheck,
    tone: "border-sageDeep/30 bg-mist/40 text-sageDeep",
    reason: "No crisis or medical-emergency language detected.",
    action: "Continue supportive coaching conversation.",
  },
  sensitive: {
    icon: Shield,
    tone: "border-amber-400/40 bg-amber-50/70 text-amber-800",
    reason: "Sensitive emotional language detected, but no immediate crisis.",
    action: "Use calm, practical, non-medical support with extra care.",
  },
  crisis: {
    icon: ShieldAlert,
    tone: "border-rose-400/40 bg-rose-50/80 text-rose-800",
    reason: "Possible crisis, self-harm, or emergency language detected.",
    action: "Prioritize immediate real-world safety guidance over coaching.",
  },
};

export function AgentIntelligencePanel({
  trace,
  thinkingTrace,
  isThinking,
  debateMode,
  safetyLevel,
  actionPlan,
  coachMap,
}: AgentIntelligencePanelProps) {
  const [tab, setTab] = useState<IntelTab>("live");

  // Snap to the live view whenever a new run begins so the pipeline is seen.
  useEffect(() => {
    if (isThinking) setTab("live");
  }, [isThinking]);

  const level = safetyLevel ?? "normal";
  const detail = SAFETY_DETAIL[level];
  const SafetyIcon = detail.icon;

  return (
    <section className="glass-panel flex h-full w-full flex-col gap-3 px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-serif text-lg text-earth">
          <BrainCircuit className="h-4 w-4 text-sageDeep" />
          Agent Intelligence
        </h2>
        {isThinking ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sageDeep px-2.5 py-0.5 text-[0.62rem] font-medium uppercase tracking-wide text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            Streaming
          </span>
        ) : null}
      </div>

      <div className="segmented" role="tablist" aria-label="Agent intelligence tabs">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              aria-label={t.label}
              title={t.label}
              data-active={tab === t.id}
              onClick={() => setTab(t.id)}
              className="segmented-item"
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="sr-only">{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className="min-h-[12rem]">
        {tab === "live" ? (
          <AgentNetwork
            trace={trace}
            thinkingTrace={thinkingTrace}
            isThinking={isThinking}
            debateMode={debateMode}
            safetyLevel={safetyLevel}
          />
        ) : null}

        {tab === "replay" ? <AgentReplayTimeline trace={trace} bare /> : null}

        {tab === "plan" ? <ActionPlanPanel plan={actionPlan} bare /> : null}

        {tab === "canvas" ? <CoachCanvas coachMap={coachMap} bare /> : null}

        {tab === "safety" ? (
          <div className="space-y-3">
            <div className={`flex items-start gap-3 rounded-2xl border px-3.5 py-3 ${detail.tone}`}>
              <SafetyIcon className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2} />
              <div>
                <p className="text-sm font-semibold capitalize">Safety: {level}</p>
                <p className="mt-1 text-[0.82rem] leading-relaxed opacity-90">{detail.reason}</p>
                <p className="mt-1 text-[0.82rem] leading-relaxed opacity-90">
                  <span className="font-medium">Action: </span>
                  {detail.action}
                </p>
              </div>
            </div>
            <p className="text-[0.72rem] leading-relaxed text-bark/60">
              Safety classification is deterministic and rule-based — the language model never
              decides whether you are safe. The whole interface visibly calms down as the level rises.
            </p>
            {level === "crisis" ? <SafetyPanel /> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
