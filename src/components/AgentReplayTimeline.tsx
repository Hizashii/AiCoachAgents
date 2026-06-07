import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Clapperboard, History } from "lucide-react";
import type { AgentTraceEntry } from "../types";

type AgentReplayTimelineProps = {
  trace: AgentTraceEntry[];
};

// The createTraceEntry output is "Role: ...\nStatus: ...\n\n<body>".
function parseEntry(output: string): { status: string; body: string } {
  const statusMatch = output.match(/Status:\s*(.+)/i);
  const status = statusMatch ? statusMatch[1].trim() : "Completed";
  const body = output.split(/\n\n/).slice(1).join("\n\n").trim() || output.trim();
  return { status, body };
}

function statusClass(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("fallback")) return "bg-amber-100/80 text-amber-800";
  if (s.includes("paused")) return "bg-stone/60 text-bark/70";
  if (s.includes("safety")) return "bg-mist/70 text-sageDeep";
  return "bg-fern/50 text-moss";
}

export function AgentReplayTimeline({ trace }: AgentReplayTimelineProps) {
  const [revealed, setRevealed] = useState(0);
  const [replaying, setReplaying] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  // When a fresh trace arrives, show it fully (no auto-replay).
  useEffect(() => {
    setRevealed(trace.length);
    setReplaying(false);
    setExpanded(null);
  }, [trace]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, []);

  const startReplay = () => {
    if (trace.length === 0) return;
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    setReplaying(true);
    setExpanded(null);
    setRevealed(0);
    let i = 0;
    timerRef.current = window.setInterval(() => {
      i += 1;
      setRevealed(i);
      if (i >= trace.length) {
        if (timerRef.current !== null) window.clearInterval(timerRef.current);
        timerRef.current = null;
        setReplaying(false);
      }
    }, 650);
  };

  const visible = trace.slice(0, replaying ? revealed : trace.length);

  return (
    <section className="glass-panel w-full px-4 py-4">
      <header className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 font-serif text-lg text-earth">
            <History className="h-4 w-4 text-sageDeep" />
            Agent Replay
          </h2>
          <p className="text-[0.78rem] text-bark/65">Watch the agent process step by step</p>
        </div>
        <button
          type="button"
          onClick={startReplay}
          disabled={trace.length === 0 || replaying}
          className="inline-flex items-center gap-1.5 rounded-full border border-stone/60 bg-white/70 px-3 py-1.5 text-xs font-medium text-bark transition hover:bg-white disabled:opacity-40"
        >
          <Clapperboard className="h-3.5 w-3.5" />
          {replaying ? "Replaying…" : "Replay"}
        </button>
      </header>

      {trace.length === 0 ? (
        <p className="rounded-2xl bg-cream/70 px-4 py-5 text-center text-sm text-bark/60">
          Run a conversation to replay the agent process.
        </p>
      ) : (
        <ol className="relative space-y-2 pl-6">
          <span
            className="pointer-events-none absolute left-[0.6rem] top-2 bottom-2 w-px bg-gradient-to-b from-sage/55 via-sage/30 to-transparent"
            aria-hidden
          />
          <AnimatePresence initial={false}>
            {visible.map((entry, index) => {
              const { status, body } = parseEntry(entry.output);
              const isOpen = expanded === index;
              return (
                <motion.li
                  key={`${entry.agent}-${index}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="relative"
                >
                  <span
                    className="absolute -left-[1.18rem] top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-sageDeep text-[0.6rem] font-bold text-white ring-2 ring-white"
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-2 rounded-2xl bg-cream/80 px-3.5 py-2 text-left ring-1 ring-stone/50 transition hover:bg-cream"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-medium text-earth">{entry.agent}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[0.62rem] font-medium ${statusClass(status)}`}
                      >
                        {status}
                      </span>
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-bark/50 transition ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isOpen ? (
                    <p className="mt-1 whitespace-pre-wrap rounded-xl bg-white/60 px-3.5 py-2 text-[0.82rem] leading-relaxed text-bark">
                      {body}
                    </p>
                  ) : null}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ol>
      )}
    </section>
  );
}
