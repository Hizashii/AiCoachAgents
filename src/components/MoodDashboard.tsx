import { ChevronDown, History, Trash2 } from "lucide-react";
import { useState } from "react";
import type { MoodLog } from "../storage";
import { clearMoodLogs } from "../storage";

type MoodDashboardProps = {
  logs: MoodLog[];
  onCleared: () => void;
};

function mostCommon(values: string[]): string | null {
  if (values.length === 0) return null;
  const counts = values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export function MoodDashboard({ logs, onCleared }: MoodDashboardProps) {
  const [open, setOpen] = useState(false);

  const total = logs.length;
  const commonMode = mostCommon(
    logs.map((log) => log.label ?? log.mode ?? "Custom message"),
  );
  const sensitiveCount = logs.filter(
    (log) => log.safetyLevel === "sensitive" || log.safetyLevel === "crisis",
  ).length;

  // Count sessions in the last 7 days for the "this week" line.
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = logs.filter(
    (log) => new Date(log.createdAt).getTime() >= weekAgo,
  ).length;

  const handleClear = () => {
    clearMoodLogs();
    onCleared();
  };

  return (
    <div className="glass-panel w-full px-4 py-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="flex items-center gap-2 font-serif text-lg text-earth">
          <History className="h-4 w-4 text-sageDeep" />
          Mood memory
          <span className="rounded-full bg-mist/80 px-2 py-0.5 text-[0.68rem] uppercase tracking-wide text-sageDeep">
            {total} saved
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 text-bark/60 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="mt-3 space-y-1.5 text-sm text-bark/75">
          {total === 0 ? (
            <p className="text-bark/60">
              No sessions saved yet. Your check-ins will appear here over time.
            </p>
          ) : (
            <>
              <p>Sessions this week: {thisWeek}</p>
              <p>Most common mode: {commonMode ?? "Not enough data yet"}</p>
              <p>Sensitive / crisis moments flagged: {sensitiveCount}</p>
              <button
                type="button"
                onClick={handleClear}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-stone/70 bg-white/70 px-3 py-1 text-xs text-bark transition hover:bg-white"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear memory
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
