import { useEffect, useState } from "react";
import { CheckCircle2, Circle, ListChecks } from "lucide-react";
import type { ActionStep } from "../types";

type ActionPlanPanelProps = {
  plan: ActionStep[];
  bare?: boolean;
};

export function ActionPlanPanel({ plan, bare }: ActionPlanPanelProps) {
  const [done, setDone] = useState<Record<number, boolean>>({});

  // Reset the checkboxes whenever a new plan arrives.
  useEffect(() => {
    setDone({});
  }, [plan]);

  const completed = Object.values(done).filter(Boolean).length;

  return (
    <section className={bare ? "w-full" : "glass-panel w-full px-4 py-4"}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-serif text-lg text-earth">
          <ListChecks className="h-4 w-4 text-sageDeep" />
          Action plan
        </span>
        {plan.length > 0 ? (
          <span className="text-[0.68rem] text-bark/55">
            {completed}/{plan.length} done
          </span>
        ) : null}
      </div>

      {plan.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-cream/70 px-4 py-5 text-center text-sm text-bark/60">
          Your next tiny steps will appear here.
        </p>
      ) : (
      <ul className="mt-3 space-y-2">
        {plan.map((step, index) => {
          const checked = Boolean(done[index]);
          return (
            <li key={`${step.title}-${index}`}>
              <button
                type="button"
                onClick={() => setDone((d) => ({ ...d, [index]: !d[index] }))}
                className="flex w-full items-start gap-3 rounded-xl bg-cream/80 px-3 py-2 text-left transition hover:bg-cream"
              >
                {checked ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sageDeep" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-bark/40" />
                )}
                <span className="min-w-0">
                  <span
                    className={`block text-sm font-medium ${
                      checked ? "text-bark/50 line-through" : "text-earth"
                    }`}
                  >
                    {step.title}
                    <span className="ml-2 rounded-full bg-mist/80 px-2 py-0.5 text-[0.62rem] font-normal uppercase tracking-wide text-sageDeep">
                      {step.minutes} min
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[0.78rem] leading-relaxed text-bark/70">
                    {step.reason}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      )}
    </section>
  );
}
