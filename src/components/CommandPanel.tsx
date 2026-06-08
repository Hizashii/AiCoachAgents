import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  FileText,
  Play,
  Presentation,
  Sparkles,
  Swords,
  Wand2,
  Scale,
  Save,
  Eraser,
} from "lucide-react";

export type CommandOption = { label: string; icon: LucideIcon };

type CommandTab = "mood" | "action" | "context" | "demo";

type CommandPanelProps = {
  moodOptions: readonly CommandOption[];
  actionOptions: readonly CommandOption[];
  selectedLabel: string | null;
  busy: boolean;
  onPreset: (label: string) => void;
  onDemo: () => void;
  onScenario: (message: string, mode: string) => void;
  onTransform: (text: string) => void;
  debateMode: boolean;
  onToggleDebate: () => void;
  studyContext: string;
  onChangeContext: (value: string) => void;
  onSaveContext: () => void;
  onClearContext: () => void;
};

const TABS: Array<{ id: CommandTab; label: string }> = [
  { id: "mood", label: "Mood" },
  { id: "action", label: "Action" },
  { id: "context", label: "Context" },
  { id: "demo", label: "Demo" },
];

export function CommandPanel({
  moodOptions,
  actionOptions,
  selectedLabel,
  busy,
  onPreset,
  onDemo,
  onScenario,
  onTransform,
  debateMode,
  onToggleDebate,
  studyContext,
  onChangeContext,
  onSaveContext,
  onClearContext,
}: CommandPanelProps) {
  const [tab, setTab] = useState<CommandTab>("mood");
  const contextActive = studyContext.trim().length > 0;

  return (
    <section className="glass-panel flex w-full flex-col gap-3 px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-serif text-lg text-earth">
          <Sparkles className="h-4 w-4 text-sageDeep" />
          Command Panel
        </h2>
        {debateMode ? (
          <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[0.62rem] font-medium uppercase tracking-wide text-gold">
            Debate
          </span>
        ) : null}
      </div>

      <div className="segmented" role="tablist" aria-label="Command tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            data-active={tab === t.id}
            onClick={() => setTab(t.id)}
            className="segmented-item"
          >
            <span className="truncate">{t.label}</span>
            {t.id === "context" && contextActive ? (
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
            ) : null}
          </button>
        ))}
      </div>

      {tab === "mood" ? (
        <div className="grid grid-cols-2 gap-2">
          {moodOptions.map(({ label, icon: Icon }) => (
            <CompactButton
              key={label}
              label={label.replace(/^I feel /, "")}
              icon={Icon}
              selected={selectedLabel === label}
              disabled={busy}
              onClick={() => onPreset(label)}
            />
          ))}
        </div>
      ) : null}

      {tab === "action" ? (
        <div className="grid grid-cols-2 gap-2">
          {actionOptions.map(({ label, icon: Icon }) => (
            <CompactButton
              key={label}
              label={label}
              icon={Icon}
              selected={selectedLabel === label}
              disabled={busy}
              onClick={() => onPreset(label)}
            />
          ))}
        </div>
      ) : null}

      {tab === "context" ? (
        <div className="flex flex-col gap-2">
          <label
            htmlFor="study-context"
            className="flex items-center gap-1.5 text-[0.68rem] uppercase tracking-wide text-bark/65"
          >
            <FileText className="h-3.5 w-3.5" />
            Assignment / project context
            <span
              className={`ml-auto rounded-full px-2 py-0.5 text-[0.6rem] font-medium ${
                contextActive ? "bg-sage/25 text-sageDeep" : "bg-stone/40 text-bark/55"
              }`}
            >
              {contextActive ? "Active" : "Empty"}
            </span>
          </label>
          <textarea
            id="study-context"
            value={studyContext}
            onChange={(e) => onChangeContext(e.target.value)}
            placeholder="Paste your assignment brief or project context. The agents will use it (RAG-lite) when giving advice…"
            rows={5}
            className="w-full rounded-2xl border border-stone/70 bg-white/70 p-3 text-sm text-bark outline-none transition focus:ring-2 focus:ring-sage/35"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSaveContext}
              disabled={!contextActive}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-sageMuted px-3 py-2 text-xs font-medium text-white shadow-soft transition hover:bg-moss disabled:opacity-40"
            >
              <Save className="h-3.5 w-3.5" />
              Save context
            </button>
            <button
              type="button"
              onClick={onClearContext}
              disabled={!contextActive}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-stone/60 bg-white/70 px-3 py-2 text-xs font-medium text-bark transition hover:bg-white disabled:opacity-40"
            >
              <Eraser className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>
        </div>
      ) : null}

      {tab === "demo" ? (
        <div className="flex flex-col gap-2">
          <DemoButton
            icon={Play}
            title="Overwhelmed (full demo)"
            hint="The signature 5-agent walkthrough"
            disabled={busy}
            onClick={onDemo}
          />
          <DemoButton
            icon={Presentation}
            title="Presentation anxiety"
            hint="Sensitive safety + grounding"
            disabled={busy}
            onClick={() => onScenario("I’m anxious about presenting tomorrow.", "anxious")}
          />
          <DemoButton
            icon={Scale}
            title="Feature decision"
            hint="Decision-support coaching"
            disabled={busy}
            onClick={() => onScenario("Help me decide what feature to build next.", "decide")}
          />
          <DemoButton
            icon={Wand2}
            title="Thought transformer"
            hint="Transformative AI demo"
            disabled={false}
            onClick={() => onTransform("I’m cooked and I’ll fail.")}
          />

          <button
            type="button"
            onClick={onToggleDebate}
            disabled={busy}
            aria-pressed={debateMode}
            className={`mt-1 inline-flex items-center justify-between gap-2 rounded-2xl border px-3.5 py-2.5 text-left text-sm font-medium transition disabled:opacity-40 ${
              debateMode
                ? "border-gold/50 bg-gold/15 text-bark"
                : "border-stone/60 bg-white/70 text-bark hover:bg-white"
            }`}
          >
            <span className="flex items-center gap-2">
              <Swords className="h-4 w-4 text-sageDeep" />
              Multi-agent debate
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[0.62rem] font-semibold uppercase ${
                debateMode ? "bg-gold/25 text-gold" : "bg-stone/40 text-bark/60"
              }`}
            >
              {debateMode ? "On" : "Off"}
            </span>
          </button>
        </div>
      ) : null}
    </section>
  );
}

type CompactButtonProps = {
  label: string;
  icon: LucideIcon;
  selected?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

function CompactButton({ label, icon: Icon, selected, disabled, onClick }: CompactButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`group flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left text-sm transition disabled:pointer-events-none disabled:opacity-40 ${
        selected
          ? "border-sageMuted bg-mist/60 text-earth shadow-soft ring-1 ring-sageMuted/30"
          : "border-stone/70 bg-white/70 text-bark hover:-translate-y-0.5 hover:border-sageMuted/50 hover:bg-mist/40"
      }`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 transition ${
          selected ? "bg-cream text-moss ring-sageMuted/40" : "bg-linen/80 text-sageDeep ring-stone/50"
        }`}
      >
        <Icon className="h-4 w-4" strokeWidth={1.7} />
      </span>
      <span className="min-w-0 truncate font-medium leading-tight">{label}</span>
    </button>
  );
}

type DemoButtonProps = {
  icon: LucideIcon;
  title: string;
  hint: string;
  disabled: boolean;
  onClick: () => void;
};

function DemoButton({ icon: Icon, title, hint, disabled, onClick }: DemoButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex items-center gap-3 rounded-2xl border border-stone/60 bg-white/70 px-3.5 py-2.5 text-left transition hover:border-sageMuted/50 hover:bg-mist/40 disabled:pointer-events-none disabled:opacity-40"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sageDeep/10 text-sageDeep ring-1 ring-sageDeep/20">
        <Icon className="h-4 w-4" strokeWidth={1.7} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium leading-tight text-earth">{title}</span>
        <span className="block text-[0.72rem] text-bark/60">{hint}</span>
      </span>
    </button>
  );
}
