import { motion, useReducedMotion } from "framer-motion";
import {
  Ear,
  Compass,
  ShieldCheck,
  ListChecks,
  Network,
  Volume2,
} from "lucide-react";
import { Avatar } from "./Avatar";
import type { AppPresence, AgentName } from "../types";

type AICoreState = "idle" | "listening" | "thinking" | "speaking";

type AICoreProps = {
  presence: AppPresence;
  /** True while the agent pipeline is running (between send and reply). */
  working: boolean;
  /** Agent names that have appeared in the current run, used to light nodes. */
  activeAgents: AgentName[];
  statusText: string;
};

// The six agents we visualize as orbiting satellites around the core. The
// `match` string is tested against the full AgentName so e.g. "Listener"
// lights up for "Listener Agent".
const ORBIT_NODES: Array<{
  match: string;
  label: string;
  icon: typeof Ear;
}> = [
  { match: "Listener", label: "Listener", icon: Ear },
  { match: "Coach", label: "Coach", icon: Compass },
  { match: "Safety", label: "Safety", icon: ShieldCheck },
  { match: "Planner", label: "Planner", icon: ListChecks },
  { match: "Mapper", label: "Mapper", icon: Network },
  { match: "Speaker", label: "Speaker", icon: Volume2 },
];

const STATE_LABEL: Record<AICoreState, string> = {
  idle: "Idle",
  listening: "Listening",
  thinking: "Agents working",
  speaking: "Speaking",
};

function resolveState(presence: AppPresence, working: boolean): AICoreState {
  if (presence === "speaking") return "speaking";
  if (working) return "thinking";
  if (presence === "listening") return "listening";
  return "idle";
}

export function AICore({ presence, working, activeAgents, statusText }: AICoreProps) {
  const reduceMotion = useReducedMotion();
  const state = resolveState(presence, working);
  const orbitDuration = state === "thinking" ? 18 : 42;
  const showRings = state === "listening" || state === "speaking" || state === "thinking";

  const activeSet = new Set(activeAgents);
  const isNodeActive = (match: string) =>
    [...activeSet].some((agent) => agent.toLowerCase().includes(match.toLowerCase()));

  return (
    <div className="relative flex w-full flex-col items-center">
      {/* Orbital field */}
      <div className="relative aspect-square w-[min(100%,360px)] max-w-[min(86vw,360px)]">
        {/* Expanding status rings */}
        {showRings && !reduceMotion ? (
          <>
            {[0, 0.9, 1.8].map((delay) => (
              <span
                key={delay}
                className="pointer-events-none absolute inset-[18%] rounded-full border border-sageDeep/30"
                style={{ animation: `ring-pulse 2.6s ease-out ${delay}s infinite` }}
                aria-hidden
              />
            ))}
          </>
        ) : null}

        {/* Faint orbit track */}
        <div
          className="pointer-events-none absolute inset-[6%] rounded-full border border-dashed border-sageDeep/20"
          aria-hidden
        />

        {/* Rotating ring carrying the agent satellites */}
        <motion.div
          className="absolute inset-0"
          animate={reduceMotion ? undefined : { rotate: 360 }}
          transition={{ duration: orbitDuration, ease: "linear", repeat: Infinity }}
        >
          {ORBIT_NODES.map((node, index) => {
            const angle = (index / ORBIT_NODES.length) * Math.PI * 2 - Math.PI / 2;
            const radius = 46; // percentage of half-size
            const left = 50 + Math.cos(angle) * radius;
            const top = 50 + Math.sin(angle) * radius;
            const active = isNodeActive(node.match);
            const Icon = node.icon;
            return (
              <div
                key={node.match}
                className="absolute"
                style={{ left: `${left}%`, top: `${top}%`, transform: "translate(-50%, -50%)" }}
              >
                {/* Counter-rotate so labels stay upright as the ring spins. */}
                <motion.div
                  animate={reduceMotion ? undefined : { rotate: -360 }}
                  transition={{ duration: orbitDuration, ease: "linear", repeat: Infinity }}
                  className="flex flex-col items-center gap-1"
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full ring-1 backdrop-blur transition-colors ${
                      active
                        ? "bg-sageDeep text-white ring-white/60 shadow-soft"
                        : "bg-white/75 text-sageDeep/70 ring-stone/50"
                    } ${active && state === "thinking" && !reduceMotion ? "agent-dot-running" : ""}`}
                    title={`${node.label} Agent`}
                  >
                    <Icon className="h-[1.05rem] w-[1.05rem]" strokeWidth={1.85} />
                  </span>
                  <span
                    className={`rounded-full px-1.5 text-[0.58rem] font-medium tracking-wide ${
                      active ? "text-sageDeep" : "text-bark/45"
                    }`}
                  >
                    {node.label}
                  </span>
                </motion.div>
              </div>
            );
          })}
        </motion.div>

        {/* The luminous core / avatar */}
        <motion.div
          className="absolute inset-[20%] rounded-full"
          animate={
            reduceMotion
              ? undefined
              : {
                  scale: state === "speaking" ? [1, 1.04, 1] : state === "thinking" ? [1, 1.02, 1] : [1, 1.025, 1],
                }
          }
          transition={{
            duration: state === "speaking" ? 1.6 : state === "thinking" ? 2.2 : 6,
            ease: "easeInOut",
            repeat: Infinity,
          }}
        >
          <div
            className="pointer-events-none absolute -inset-3 rounded-full bg-leaf-shade opacity-90 blur-2xl"
            aria-hidden
          />
          <div className="accent-glow relative h-full w-full rounded-full bg-gradient-to-br from-white/95 via-cream/85 to-mist/70 p-[3px] shadow-natural ring-1 ring-white/70">
            <div className="relative h-full w-full overflow-hidden rounded-full bg-gradient-to-b from-cream via-linen to-sand shadow-[inset_0_2px_24px_rgba(61,53,46,0.08)]">
              <Avatar presence={presence} className="h-full w-full" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* State chip + status line */}
      <div className="mt-3 flex flex-col items-center gap-1.5 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-sageDeep/30 bg-white/70 px-3 py-1 text-[0.7rem] font-medium uppercase tracking-wide text-sageDeep">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              state === "idle" ? "bg-sage/70" : "bg-sageDeep"
            } ${state !== "idle" && !reduceMotion ? "animate-pulse" : ""}`}
          />
          {STATE_LABEL[state]}
        </span>
        <p className="font-serif text-xl text-earth sm:text-2xl">{statusText}</p>
      </div>
    </div>
  );
}
