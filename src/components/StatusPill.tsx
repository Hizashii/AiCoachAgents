import { ShieldCheck, ShieldAlert, Shield } from "lucide-react";
import type { SafetyLevel } from "../types";

type StatusPillProps = {
  safetyLevel: SafetyLevel | null;
  mockMode?: boolean;
};

const CONFIG: Record<
  SafetyLevel,
  { label: string; icon: typeof Shield; classes: string }
> = {
  normal: {
    label: "Safety: Normal",
    icon: ShieldCheck,
    classes: "border-sageDeep/40 bg-mist/60 text-sageDeep",
  },
  sensitive: {
    label: "Safety: Sensitive",
    icon: Shield,
    classes: "border-amber-500/40 bg-amber-50/80 text-amber-800",
  },
  crisis: {
    label: "Safety: Crisis",
    icon: ShieldAlert,
    classes: "border-rose-500/40 bg-rose-50/80 text-rose-800",
  },
};

export function StatusPill({ safetyLevel, mockMode }: StatusPillProps) {
  const level = safetyLevel ?? "normal";
  const { label, icon: Icon, classes } = CONFIG[level];

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.7rem] font-medium ${classes}`}
        aria-label={label}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        {label}
      </span>
      {mockMode ? (
        <span
          className="rounded-full border border-amber-400/40 bg-amber-50/70 px-2.5 py-1 text-[0.66rem] font-medium text-amber-700"
          title="Ollama unavailable — using safe demo fallbacks"
        >
          Mock mode
        </span>
      ) : null}
    </div>
  );
}
