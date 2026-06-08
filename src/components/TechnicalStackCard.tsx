import { Cpu } from "lucide-react";

const STACK: Array<{ label: string; tone: string }> = [
  { label: "React", tone: "bg-teal/12 text-teal" },
  { label: "TypeScript", tone: "bg-teal/12 text-teal" },
  { label: "Vite", tone: "bg-teal/12 text-teal" },
  { label: "Tailwind", tone: "bg-sageDeep/12 text-sageDeep" },
  { label: "Express", tone: "bg-sageDeep/12 text-sageDeep" },
  { label: "Ollama LLM", tone: "bg-gold/15 text-gold" },
  { label: "WebSocket", tone: "bg-gold/15 text-gold" },
  { label: "Speech API", tone: "bg-gold/15 text-gold" },
  { label: "Agentic AI", tone: "bg-sageDeep text-white" },
];

export function TechnicalStackCard() {
  return (
    <section className="glass-panel flex h-full w-full flex-col gap-3 px-4 py-4">
      <div>
        <h2 className="flex items-center gap-2 font-serif text-lg text-earth">
          <Cpu className="h-4 w-4 text-sageDeep" />
          Web Tech Stack
        </h2>
        <p className="text-[0.78rem] text-bark/65">
          The technologies this prototype demonstrates
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {STACK.map((item) => (
          <span
            key={item.label}
            className={`rounded-full px-3 py-1 text-[0.74rem] font-medium ring-1 ring-white/40 ${item.tone}`}
          >
            {item.label}
          </span>
        ))}
      </div>
      <p className="text-[0.72rem] leading-relaxed text-bark/55">
        A visible multi-agent pipeline streamed live over WebSockets — generative, transformative,
        and agentic AI with deterministic safety guardrails.
      </p>
    </section>
  );
}
