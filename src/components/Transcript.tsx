import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, User } from "lucide-react";
import type { ChatMessage } from "../types";

type TranscriptProps = {
  messages: ChatMessage[];
};

export function Transcript({ messages }: TranscriptProps) {
  const recent = messages.slice(-14);

  return (
    <div className="w-full max-w-xl rounded-3xl border border-stone/90 bg-cream/85 px-4 py-4 shadow-lift ring-1 ring-white/60 backdrop-blur-md sm:px-5 sm:py-4">
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-stone/60 pb-3">
        <p className="font-serif text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-sageDeep">
          Conversation
        </p>
        <span className="text-[0.68rem] text-bark/50">{messages.length} messages</span>
      </div>
      <ul className="max-h-[min(280px,38vh)] space-y-3 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {recent.length === 0 ? (
            <li className="rounded-2xl bg-linen/60 px-4 py-6 text-center text-sm leading-relaxed text-bark/60">
              Share a thought
            </li>
          ) : (
            recent.map((m) =>
              m.role === "user" ? (
                <motion.li
                  key={m.id}
                  layout
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.28 }}
                  className="flex justify-end"
                >
                  <div className="max-w-[92%] rounded-2xl rounded-br-md bg-gradient-to-br from-mist/90 to-sage/25 px-4 py-3 shadow-soft ring-1 ring-sageMuted/25">
                    <div className="mb-1 flex items-center justify-end gap-1.5 text-[0.65rem] font-medium uppercase tracking-wide text-sageDeep/90">
                      <User className="h-3.5 w-3.5" strokeWidth={2} />
                      You
                    </div>
                    <p className="text-[0.92rem] leading-relaxed text-earth">{m.text}</p>
                  </div>
                </motion.li>
              ) : (
                <motion.li
                  key={m.id}
                  layout
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.28 }}
                  className="flex justify-start"
                >
                  <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-white/95 px-4 py-3 shadow-soft ring-1 ring-stone/70">
                    <div className="mb-1 flex items-center gap-1.5 text-[0.65rem] font-medium uppercase tracking-wide text-sageMuted">
                      <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
                      Companion
                    </div>
                    <p className="text-[0.92rem] leading-relaxed text-bark">{m.text}</p>
                  </div>
                </motion.li>
              ),
            )
          )}
        </AnimatePresence>
      </ul>
    </div>
  );
}
