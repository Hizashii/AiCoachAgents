import { Activity, History, Sparkles, Trash2 } from "lucide-react";
import type { MoodLog } from "../storage";
import { clearMoodLogs } from "../storage";
import type { SafetyLevel } from "../types";

type MoodMemoryPanelProps = {
  logs: MoodLog[];
  onCleared: () => void;
};

const SAFETY_TONE: Record<SafetyLevel, string> = {
  normal: "bg-mist/70 text-sageDeep",
  sensitive: "bg-amber-100/80 text-amber-800",
  crisis: "bg-rose-100/80 text-rose-800",
};

function mostCommon(values: string[]): string | null {
  if (values.length === 0) return null;
  const counts = values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function cleanLabel(log: MoodLog): string {
  return (log.label ?? log.mode ?? "Custom message").replace(/^I feel /, "");
}

export function MoodMemoryPanel({ logs, onCleared }: MoodMemoryPanelProps) {
  const total = logs.length;
  const commonMood = mostCommon(logs.map(cleanLabel));
  const lastSafety = logs[0]?.safetyLevel ?? null;
  const recent = logs.slice(0, 3);

  const handleClear = () => {
    clearMoodLogs();
    onCleared();
  };

  return (
    <section className="glass-panel flex h-full w-full flex-col gap-3 px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-serif text-lg text-earth">
          <History className="h-4 w-4 text-sageDeep" />
          Mood Memory
        </h2>
        {total > 0 ? (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1 rounded-full border border-stone/60 bg-white/70 px-2.5 py-1 text-[0.66rem] text-bark transition hover:bg-white"
          >
            <Trash2 className="h-3 w-3" />
            Clear
          </button>
        ) : null}
      </div>

      {total === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone/60 bg-white/40 px-4 py-7 text-center">
          <Sparkles className="mx-auto h-5 w-5 text-sageDeep/50" />
          <p className="mt-2 text-sm text-bark/65">
            Your recent sessions will become visible after a few conversations.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Sessions" value={String(total)} />
            <Stat label="Top mood" value={commonMood ?? "—"} />
            <Stat
              label="Last safety"
              value={lastSafety ?? "normal"}
              tone={lastSafety ? SAFETY_TONE[lastSafety] : SAFETY_TONE.normal}
            />
          </div>

          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[0.68rem] uppercase tracking-wide text-bark/55">
              <Activity className="h-3.5 w-3.5" />
              Last {recent.length} sessions
            </p>
            <ul className="space-y-1.5">
              {recent.map((log) => (
                <li
                  key={log.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-cream/70 px-3 py-1.5 ring-1 ring-stone/40"
                >
                  <span className="min-w-0 truncate text-sm text-earth">{cleanLabel(log)}</span>
                  {log.safetyLevel ? (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[0.58rem] font-medium uppercase ${SAFETY_TONE[log.safetyLevel]}`}
                    >
                      {log.safetyLevel}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl bg-cream/70 px-2.5 py-2 ring-1 ring-stone/40">
      <p className="text-[0.6rem] uppercase tracking-wide text-bark/50">{label}</p>
      <p
        className={`mt-0.5 truncate text-sm font-medium capitalize ${
          tone ? `inline-block rounded-full px-2 py-0.5 ${tone}` : "text-earth"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
