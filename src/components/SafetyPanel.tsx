import { motion } from "framer-motion";
import { LifeBuoy, Phone, HeartHandshake } from "lucide-react";

// Shown only when the AI classifies the situation as a crisis. It strips away
// decorative noise and surfaces calm, non-medical, real-world support guidance.
export function SafetyPanel() {
  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-xl rounded-3xl border border-rose-300/60 bg-rose-50/90 px-5 py-5 shadow-lift ring-1 ring-rose-200/70"
    >
      <div className="flex items-center gap-2 text-rose-800">
        <LifeBuoy className="h-5 w-5" strokeWidth={2} />
        <h2 className="text-base font-semibold">Immediate support comes first</h2>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-rose-900/85">
        This app is not a medical professional. If you might be in danger or
        thinking about harming yourself or someone else, please reach out to a
        real person right now.
      </p>

      <ul className="mt-4 space-y-2 text-sm text-rose-900/90">
        <li className="flex items-start gap-2">
          <Phone className="mt-0.5 h-4 w-4 shrink-0" />
          Contact your local emergency number immediately.
        </li>
        <li className="flex items-start gap-2">
          <HeartHandshake className="mt-0.5 h-4 w-4 shrink-0" />
          Reach out to someone you trust and tell them how you feel.
        </li>
      </ul>
    </motion.div>
  );
}
