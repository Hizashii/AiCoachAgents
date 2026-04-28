import { useState } from "react";
import { Bot, ChevronDown, ShieldAlert } from "lucide-react";
import type { AgentTraceEntry, SafetyLevel } from "../types";

type AgentTracePanelProps = {
  trace: AgentTraceEntry[];
  thinkingTrace: AgentTraceEntry[];
  isThinking: boolean;
  safetyLevel: SafetyLevel | null;
};

export function AgentTracePanel({ trace, thinkingTrace, isThinking, safetyLevel }: AgentTracePanelProps) {
  const [open, setOpen] = useState(false);
  const displayTrace = isThinking ? thinkingTrace : trace;
  const hasTrace = displayTrace.length > 0;

  return (
    <div className="w-full max-w-xl rounded-2xl border border-stone/70 bg-white/70 px-4 py-3 shadow-soft ring-1 ring-white/70 backdrop-blur-md">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-earth">
          <Bot className="h-4 w-4" />
          Agent network
          {safetyLevel ? (
            <span className="rounded-full bg-mist/80 px-2 py-0.5 text-[0.68rem] uppercase tracking-wide text-sageDeep">
              {safetyLevel}
            </span>
          ) : null}
        </span>
        <ChevronDown className={`h-4 w-4 text-bark/60 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="mt-3 space-y-2">
          {!hasTrace ? (
            <p className="text-sm text-bark/60">No agent trace yet. Send a message to see the pipeline.</p>
          ) : (
            displayTrace.map((step) => (
              <div key={step.agent} className="rounded-xl bg-cream/80 px-3 py-2">
                <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-sageDeep">
                  {step.agent}
                </p>
                <p
                  className={`mt-1 whitespace-pre-wrap text-sm leading-relaxed ${
                    isThinking ? "text-bark/80 animate-pulse" : "text-bark"
                  }`}
                >
                  {step.output}
                </p>
              </div>
            ))
          )}
          {safetyLevel === "crisis" ? (
            <p className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              Crisis signal detected. Emergency guidance is prioritized.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
