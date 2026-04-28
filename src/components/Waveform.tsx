import { motion } from "framer-motion";
import type { AppPresence } from "../types";

const BAR_COUNT = 28;

type WaveformProps = {
  presence: AppPresence;
};

export function Waveform({ presence }: WaveformProps) {
  const speaking = presence === "speaking";
  const thinking = presence === "listening";

  return (
    <div
      className="flex h-12 items-end justify-center gap-[3px] px-4"
      aria-hidden
    >
      {Array.from({ length: BAR_COUNT }, (_, i) => {
        const phase = (i / BAR_COUNT) * Math.PI * 2;
        const baseH = speaking ? 5 : 3;
        const idleWave = baseH + Math.sin(phase + i * 0.2) * 1.2;
        const thinkingWave = baseH + 1.2 + Math.sin(phase * 1.2) * 2;

        return (
          <motion.span
            key={i}
            className="w-[3px] rounded-full bg-gradient-to-t from-sageMuted/50 via-sage/80 to-fern/95"
            initial={false}
            animate={{
              height: speaking
                ? [baseH + 2, 26 + Math.sin(phase) * 10, baseH + 6]
                : thinking
                  ? thinkingWave
                  : idleWave,
              opacity: speaking ? 1 : thinking ? 0.55 : 0.4,
            }}
            transition={{
              duration: speaking ? 0.48 : thinking ? 2.8 : 3.2,
              repeat: speaking ? Infinity : thinking ? Infinity : Infinity,
              repeatType: speaking ? "mirror" : "mirror",
              ease: "easeInOut",
              delay: i * (speaking ? 0.035 : 0.02),
            }}
          />
        );
      })}
    </div>
  );
}
