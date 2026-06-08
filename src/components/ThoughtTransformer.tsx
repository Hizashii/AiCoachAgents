import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Check, Copy, Loader2, Sparkles, Wand2 } from "lucide-react";
import { transformThought } from "../api";
import type { ThoughtTransform } from "../types";

const CARD_META: Array<{
  key: keyof ThoughtTransform;
  label: string;
  hint: string;
}> = [
  { key: "calmer", label: "Calmer", hint: "A kinder reframe" },
  { key: "actionable", label: "Actionable", hint: "One concrete step" },
  { key: "presentation", label: "Presentation-ready", hint: "Say it clearly out loud" },
];

type ThoughtTransformerProps = {
  initialText?: string;
};

export function ThoughtTransformer({ initialText = "" }: ThoughtTransformerProps) {
  const [text, setText] = useState(initialText);
  const [result, setResult] = useState<ThoughtTransform | null>(null);
  const [loading, setLoading] = useState(false);
  const [mockMode, setMockMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleTransform = async () => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { transform, mockMode: mock } = await transformThought(trimmed);
      setResult(transform);
      setMockMode(mock);
      if (mock) toast("Mock fallback active", { description: "Ollama is offline — showing safe demo output." });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not transform the thought.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      toast.success("Thought copied", { description: `Copied the "${key}" version to your clipboard.` });
      window.setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
    } catch {
      // Clipboard may be blocked; ignore silently.
    }
  };

  return (
    <section className="glass-panel flex h-full w-full flex-col px-4 py-4">
      <header className="mb-3">
        <h2 className="flex items-center gap-2 font-serif text-lg text-earth">
          <Wand2 className="h-4 w-4 text-sageDeep" />
          Thought Transformer
        </h2>
        <p className="text-[0.78rem] text-bark/65">
          Turn a messy thought into calmer, actionable language
        </p>
      </header>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste a messy thought, e.g. “I'm so behind, I can't do this, I'm cooked.”"
        rows={3}
        aria-label="Thought to transform"
        className="w-full rounded-2xl border border-stone/70 bg-white/70 p-3 text-sm text-bark outline-none transition focus:ring-2 focus:ring-sage/35"
      />

      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleTransform}
          disabled={loading || !text.trim()}
          className="inline-flex items-center gap-2 rounded-full bg-sageMuted px-4 py-2 text-sm font-medium text-white shadow-soft transition hover:bg-moss disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Transform thought
        </button>
        {mockMode && result ? (
          <span className="text-[0.66rem] text-amber-700">Mock fallback</span>
        ) : null}
      </div>

      {error ? <p className="mt-2 text-xs text-rose-700">{error}</p> : null}

      <div className="mt-3 space-y-2">
        {!result ? (
          <p className="rounded-2xl bg-cream/70 px-4 py-5 text-center text-sm text-bark/60">
            Paste a messy thought and turn it into calmer, actionable language.
          </p>
        ) : (
          CARD_META.map(({ key, label, hint }, index) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.08 }}
              className="rounded-2xl bg-cream/80 px-3.5 py-2.5 ring-1 ring-stone/50"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-sageDeep">
                    {label}
                  </p>
                  <p className="text-[0.64rem] text-bark/50">{hint}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(key, result[key])}
                  aria-label={`Copy ${label} version`}
                  className="inline-flex items-center gap-1 rounded-full border border-stone/60 bg-white/70 px-2.5 py-1 text-[0.66rem] text-bark transition hover:bg-white"
                >
                  {copiedKey === key ? (
                    <>
                      <Check className="h-3 w-3" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" /> Copy
                    </>
                  )}
                </button>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-earth">{result[key]}</p>
            </motion.div>
          ))
        )}
      </div>
    </section>
  );
}
