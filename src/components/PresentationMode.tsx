import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Cpu,
  Pause,
  Play,
  Presentation,
  RotateCcw,
  Sparkles,
  Timer,
  X,
} from "lucide-react";

type Scenario = {
  label: string;
  text: string;
  kind: "chat" | "transform";
  mode?: string;
};

type Step = {
  time: string;
  title: string;
  say: string;
  tech: string;
};

const STEPS: Step[] = [
  {
    time: "0:00 – 0:30",
    title: "Concept",
    say: "Ethereal Wellness is an agentic AI coaching prototype for students. It turns messy, overwhelmed thoughts into small, doable next steps — and it makes the AI's thinking visible.",
    tech: "React + Vite + TypeScript frontend, Node/Express backend, a local LLM via Ollama. Not a chatbot — a visible multi-agent system.",
  },
  {
    time: "0:30 – 1:30",
    title: "User input & agents",
    say: "I type or speak a thought. Behind the scenes several specialized agents handle it — Listener, Coach, Safety, Planner, Mapper, Summary and Speaker.",
    tech: "Browser Speech APIs for voice in/out. Each agent is a separate prompt with one job — that separation of roles is what makes it agentic.",
  },
  {
    time: "1:30 – 2:30",
    title: "Live agent process",
    say: "Watch the Agent Network: each agent wakes up live as the backend finishes it. I can also replay the whole process step by step.",
    tech: "A WebSocket streams each agent step the moment it completes, with an automatic HTTP fallback. The replay timeline reconstructs the run.",
  },
  {
    time: "2:30 – 3:30",
    title: "Structured outputs",
    say: "The system doesn't just chat — it produces a spoken reply, a tiny action plan, a Coach Canvas mind-map, and it can transform a messy thought into three useful versions.",
    tech: "Generative + transformative AI: agents return strict JSON that the UI renders as cards and a canvas, with safe fallbacks if the model misbehaves.",
  },
  {
    time: "3:30 – 5:00",
    title: "Safety & transparency",
    say: "A deterministic Safety Agent classifies every message. On a crisis the whole interface calms down and shows real-world support. Everything the AI did stays visible and explainable.",
    tech: "Safety is rule-based on purpose — the LLM never decides safety. The UI reads a data-safety variable to adapt its colour, motion and glow.",
  },
];

const SCENARIOS: Scenario[] = [
  {
    label: "Overwhelmed (full demo)",
    text: "I feel overwhelmed and I can’t start my assignment.",
    kind: "chat",
    mode: "demo",
  },
  {
    label: "Presentation anxiety",
    text: "I’m anxious about presenting tomorrow.",
    kind: "chat",
    mode: "anxious",
  },
  {
    label: "Help me decide",
    text: "Help me decide what feature to build next.",
    kind: "chat",
    mode: "decide",
  },
  {
    label: "Transform a thought",
    text: "I’m cooked and I’ll fail.",
    kind: "transform",
  },
];

const TOTAL_SECONDS = 5 * 60;

type PresentationModeProps = {
  open: boolean;
  onClose: () => void;
  onRunScenario: (message: string, mode?: string) => void;
  onRunTransform: (text: string) => void;
  onResetDemo: () => void;
};

export function PresentationMode({
  open,
  onClose,
  onRunScenario,
  onRunTransform,
  onResetDemo,
}: PresentationModeProps) {
  const [step, setStep] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  // Close on Escape for accessibility.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const resetTimer = () => {
    setRunning(false);
    setSecondsLeft(TOTAL_SECONDS);
    setStep(0);
  };

  const mm = Math.floor(secondsLeft / 60);
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const progress = ((TOTAL_SECONDS - secondsLeft) / TOTAL_SECONDS) * 100;
  const current = STEPS[step];

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-earth/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Presentation mode"
        >
          <motion.div
            initial={{ scale: 0.96, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 12 }}
            transition={{ duration: 0.25 }}
            className="glass-panel relative max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-white/80 px-6 py-6"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close presentation mode"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-bark/60 transition hover:bg-white/70 hover:text-earth"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="flex items-center gap-2 font-serif text-2xl text-earth">
              <Presentation className="h-5 w-5 text-sageDeep" />
              Presentation Mode
            </h2>
            <p className="text-sm text-bark/65">A guided 5-minute exam walkthrough</p>

            {/* Timer + progress */}
            <div className="mt-4 rounded-2xl bg-cream/70 px-4 py-3 ring-1 ring-stone/50">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-bark/75">
                  <Timer className="h-4 w-4" />
                  {mm}:{ss} remaining
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setRunning((r) => !r)}
                    className="inline-flex items-center gap-1 rounded-full border border-stone/60 bg-white/70 px-3 py-1 text-xs text-bark transition hover:bg-white"
                  >
                    {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    {running ? "Pause" : "Start"}
                  </button>
                  <button
                    type="button"
                    onClick={resetTimer}
                    className="inline-flex items-center gap-1 rounded-full border border-stone/60 bg-white/70 px-3 py-1 text-xs text-bark transition hover:bg-white"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </button>
                </div>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-stone/40">
                <div
                  className="h-full rounded-full bg-sageMuted transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Current step */}
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25 }}
                className="mt-4"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-mist/70 px-2.5 py-0.5 text-[0.7rem] font-medium text-sageDeep">
                    Step {step + 1} / {STEPS.length}
                  </span>
                  <span className="text-[0.7rem] text-bark/55">{current.time}</span>
                </div>
                <h3 className="mt-2 font-serif text-xl text-earth">{current.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-bark/85">{current.say}</p>

                <div className="mt-3 flex items-start gap-2 rounded-2xl bg-white/60 px-3.5 py-2.5 ring-1 ring-stone/50">
                  <Cpu className="mt-0.5 h-4 w-4 shrink-0 text-sageDeep" />
                  <p className="text-[0.82rem] leading-relaxed text-bark/75">
                    <span className="font-semibold text-earth">What's happening technically: </span>
                    {current.tech}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
                className="inline-flex items-center gap-1 rounded-full border border-stone/60 bg-white/70 px-3 py-1.5 text-sm text-bark transition hover:bg-white disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                disabled={step === STEPS.length - 1}
                className="inline-flex items-center gap-1 rounded-full bg-sageMuted px-4 py-1.5 text-sm font-medium text-white transition hover:bg-moss disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Preloaded scenarios */}
            <div className="mt-5 border-t border-stone/50 pt-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium text-earth">
                <Sparkles className="h-4 w-4 text-sageDeep" />
                One-click demo scenarios
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SCENARIOS.map((sc) => (
                  <button
                    key={sc.label}
                    type="button"
                    onClick={() => {
                      if (sc.kind === "transform") onRunTransform(sc.text);
                      else onRunScenario(sc.text, sc.mode);
                      onClose();
                    }}
                    className="rounded-2xl border border-stone/60 bg-white/70 px-3 py-2 text-left transition hover:border-sageMuted/50 hover:bg-mist/40"
                  >
                    <span className="block text-sm font-medium text-earth">{sc.label}</span>
                    <span className="mt-0.5 block text-[0.74rem] text-bark/60">“{sc.text}”</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={onResetDemo}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-stone/60 bg-white/70 px-3 py-1.5 text-xs text-bark transition hover:bg-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset demo (clear conversation)
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
