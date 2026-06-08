import { motion } from "framer-motion";
import {
  Brain,
  Flag,
  Footprints,
  Network,
  OctagonAlert,
  Sparkles,
} from "lucide-react";
import type { CoachMap, SafetyLevel } from "../types";

type CoachCanvasProps = {
  coachMap: CoachMap | null;
  bare?: boolean;
};

const SAFETY_LABEL: Record<SafetyLevel, string> = {
  normal: "Normal",
  sensitive: "Sensitive",
  crisis: "Crisis",
};

const SAFETY_CLASS: Record<SafetyLevel, string> = {
  normal: "bg-mist/70 text-sageDeep",
  sensitive: "bg-amber-100/80 text-amber-800",
  crisis: "bg-rose-100/80 text-rose-800",
};

export function CoachCanvas({ coachMap, bare }: CoachCanvasProps) {
  return (
    <section className={bare ? "w-full" : "glass-panel w-full px-4 py-4"}>
      <header className="mb-3">
        <h2 className="flex items-center gap-2 font-serif text-lg text-earth">
          <Network className="h-4 w-4 text-sageDeep" />
          Coach Canvas
        </h2>
        <p className="text-[0.78rem] text-bark/65">How the AI understood the situation</p>
      </header>

      {!coachMap ? (
        <p className="rounded-2xl bg-cream/70 px-4 py-6 text-center text-sm text-bark/60">
          Send a message to map how the AI understands your situation.
        </p>
      ) : (
        <div className="relative pl-6">
          {/* The connecting rail behind the nodes. */}
          <span
            className="pointer-events-none absolute left-[0.6rem] top-2 bottom-8 w-px bg-gradient-to-b from-sage/60 via-sage/35 to-transparent"
            aria-hidden
          />

          <CanvasNode
            index={0}
            icon={<Sparkles className="h-3.5 w-3.5" />}
            label="User situation"
            value={coachMap.summary}
            accent
          />
          <CanvasNode
            index={1}
            icon={<Brain className="h-3.5 w-3.5" />}
            label="Emotion"
            value={coachMap.emotion}
          />
          <CanvasNode
            index={2}
            icon={<OctagonAlert className="h-3.5 w-3.5" />}
            label="Blocker"
            value={coachMap.blocker}
          />
          <CanvasNode
            index={3}
            icon={<Flag className="h-3.5 w-3.5" />}
            label="Goal"
            value={coachMap.goal}
          />
          <CanvasNode
            index={4}
            icon={<Footprints className="h-3.5 w-3.5" />}
            label="Next step"
            value={coachMap.nextStep}
            accent
          />

          <div className="relative mt-1 flex items-center gap-2 pl-1">
            <span className="text-[0.7rem] uppercase tracking-wide text-bark/55">
              Safety
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[0.7rem] font-medium ${SAFETY_CLASS[coachMap.safetyLevel]}`}
            >
              {SAFETY_LABEL[coachMap.safetyLevel]}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

type CanvasNodeProps = {
  index: number;
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
};

function CanvasNode({ index, icon, label, value, accent }: CanvasNodeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
      className="relative mb-2.5"
    >
      {/* Node dot on the rail. */}
      <span
        className={`absolute -left-[1.15rem] top-3 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-white ${
          accent ? "bg-sageDeep text-white" : "bg-mist text-sageDeep"
        }`}
        aria-hidden
      >
        {icon}
      </span>
      <div
        className={`rounded-2xl px-3.5 py-2 ring-1 ${
          accent
            ? "bg-gradient-to-br from-mist/70 to-fern/40 ring-sageMuted/30"
            : "bg-cream/80 ring-stone/50"
        }`}
      >
        <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-sageDeep/90">
          {label}
        </p>
        <p className="mt-0.5 text-sm leading-relaxed text-earth">{value}</p>
      </div>
    </motion.div>
  );
}
