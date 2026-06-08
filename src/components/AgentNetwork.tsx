import { motion } from "framer-motion";
import {
  Ear,
  Compass,
  Gauge,
  HeartPulse,
  Scale,
  ShieldCheck,
  ListChecks,
  FileText,
  Network,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import type { AgentName, AgentTraceEntry, SafetyLevel } from "../types";

type AgentStatus = "waiting" | "running" | "done" | "fallback";

type AgentNetworkProps = {
  trace: AgentTraceEntry[];
  thinkingTrace: AgentTraceEntry[];
  isThinking: boolean;
  debateMode: boolean;
  safetyLevel: SafetyLevel | null;
};

const META: Record<AgentName, { short: string; icon: LucideIcon }> = {
  "Listener Agent": { short: "Listener", icon: Ear },
  "Coach Agent": { short: "Coach", icon: Compass },
  "Productivity Agent": { short: "Productivity", icon: Gauge },
  "Wellness Agent": { short: "Wellness", icon: HeartPulse },
  "Judge Agent": { short: "Judge", icon: Scale },
  "Safety Agent": { short: "Safety", icon: ShieldCheck },
  "Planner Agent": { short: "Planner", icon: ListChecks },
  "Summary Agent": { short: "Summary", icon: FileText },
  "Mapper Agent": { short: "Mapper", icon: Network },
  "Speaker Agent": { short: "Speaker", icon: Volume2 },
};

const NORMAL_FLOW: AgentName[] = [
  "Listener Agent",
  "Coach Agent",
  "Safety Agent",
  "Planner Agent",
  "Summary Agent",
  "Mapper Agent",
  "Speaker Agent",
];

const DEBATE_FLOW: AgentName[] = [
  "Listener Agent",
  "Productivity Agent",
  "Wellness Agent",
  "Judge Agent",
  "Safety Agent",
  "Planner Agent",
  "Summary Agent",
  "Mapper Agent",
  "Speaker Agent",
];

const STATUS_STYLE: Record<AgentStatus, { ring: string; dot: string; chip: string; label: string }> = {
  waiting: {
    ring: "border-stone/50 bg-white/50",
    dot: "bg-bark/25",
    chip: "bg-stone/40 text-bark/55",
    label: "Waiting",
  },
  running: {
    ring: "border-sageDeep/50 bg-mist/40 shadow-soft",
    dot: "bg-sageDeep agent-dot-running",
    chip: "bg-sageDeep text-white",
    label: "Running",
  },
  done: {
    ring: "border-sage/50 bg-fern/25",
    dot: "bg-sageDeep",
    chip: "bg-fern/60 text-moss",
    label: "Done",
  },
  fallback: {
    ring: "border-amber-400/50 bg-amber-50/60",
    dot: "bg-amber-500",
    chip: "bg-amber-100/80 text-amber-800",
    label: "Fallback",
  },
};

function hasFallback(output: string): boolean {
  return /Status:\s*.*fallback/i.test(output);
}

export function AgentNetwork({
  trace,
  thinkingTrace,
  isThinking,
  debateMode,
  safetyLevel,
}: AgentNetworkProps) {
  const source = isThinking ? thinkingTrace : trace;
  const flow = debateMode ? DEBATE_FLOW : NORMAL_FLOW;

  // Map known outputs by agent for status/fallback detection.
  const byAgent = new Map(source.map((entry) => [entry.agent, entry]));
  const hasAny = source.length > 0;

  // The first not-yet-seen agent is "running" while the pipeline is active.
  const firstPendingIndex = flow.findIndex((agent) => !byAgent.has(agent));

  const statusFor = (agent: AgentName, index: number): AgentStatus => {
    const entry = byAgent.get(agent);
    if (entry) return hasFallback(entry.output) ? "fallback" : "done";
    if (isThinking && index === firstPendingIndex) return "running";
    return "waiting";
  };

  if (!hasAny && !isThinking) {
    return (
      <div className="rounded-2xl border border-dashed border-stone/60 bg-white/40 px-4 py-8 text-center">
        <Network className="mx-auto h-6 w-6 text-sageDeep/50" />
        <p className="mt-2 text-sm text-bark/65">
          Send a message to watch the agent pipeline activate.
        </p>
        <p className="mt-1 text-[0.72rem] text-bark/45">
          {debateMode ? "Debate mode: 9 agents" : "Standard mode: 7 agents"} stream live over WebSocket.
        </p>
      </div>
    );
  }

  return (
    <div className="relative space-y-1.5 pl-7">
      <span
        className="pointer-events-none absolute bottom-4 left-[0.85rem] top-3 w-px bg-gradient-to-b from-sageDeep/45 via-sage/30 to-transparent"
        aria-hidden
      />
      {flow.map((agent, index) => {
        const status = statusFor(agent, index);
        const style = STATUS_STYLE[status];
        const meta = META[agent];
        const Icon = meta.icon;
        return (
          <motion.div
            key={agent}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: index * 0.03 }}
            className="relative"
          >
            <span
              className={`absolute -left-[1.4rem] top-3 h-3 w-3 rounded-full ring-2 ring-white ${style.dot}`}
              aria-hidden
            />
            <div
              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 transition ${style.ring}`}
            >
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-sageDeep" strokeWidth={1.7} />
                <span className="text-sm font-medium text-earth">{meta.short}</span>
                {agent === "Safety Agent" && safetyLevel ? (
                  <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[0.58rem] font-medium uppercase tracking-wide text-sageDeep">
                    {safetyLevel}
                  </span>
                ) : null}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide ${style.chip}`}
              >
                {style.label}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
