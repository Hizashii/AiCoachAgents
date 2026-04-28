import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  CalendarHeart,
  Cloud,
  CloudFog,
  Compass,
  Feather,
  Layers2,
  Leaf,
  LifeBuoy,
  MessageCircle,
  Scale,
  Settings,
  Square,
  SunMedium,
  UserRound,
  Volume2,
  VolumeX,
  Waves,
} from "lucide-react";
import { sendAgentChat } from "./api";
import { AgentTracePanel } from "./components/AgentTracePanel";
import { Avatar } from "./components/Avatar";
import { ChatInput } from "./components/ChatInput";
import { SidebarOption } from "./components/SidebarOption";
import { Transcript } from "./components/Transcript";
import { Waveform } from "./components/Waveform";
import type { AgentTraceEntry, AppPresence, ChatMessage, SafetyLevel } from "./types";

const THINKING_MS = 1400;
const DEMO_MESSAGE = "I feel overwhelmed and I can’t start my assignment.";
const AGENT_SEQUENCE: AgentTraceEntry[] = [
  { agent: "Listener Agent", output: "Reading your message and identifying emotion + intent..." },
  { agent: "Coach Agent", output: "Preparing practical, non-medical next steps..." },
  { agent: "Safety Agent", output: "Running safety scan for crisis or risk language..." },
  { agent: "Summary Agent", output: "Summarizing conversation state for the demo trace..." },
  { agent: "Speaker Agent", output: "Crafting a warm, short response for voice output..." },
];

type WebkitWindow = Window & {
  SpeechRecognition?: {
    new (): BrowserSpeechRecognition;
  };
  webkitSpeechRecognition?: {
    new (): BrowserSpeechRecognition;
  };
};

type BrowserSpeechRecognitionResult = {
  transcript: string;
};

type BrowserSpeechRecognitionResultList = {
  [index: number]: {
    [index: number]: BrowserSpeechRecognitionResult;
  };
};

type BrowserSpeechRecognitionEvent = {
  results: BrowserSpeechRecognitionResultList;
};

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const MOOD_OPTIONS = [
  { label: "I feel anxious", icon: CloudFog },
  { label: "I feel stressed", icon: Waves },
  { label: "I feel down", icon: Cloud },
  { label: "I feel overwhelmed", icon: Layers2 },
  { label: "I feel uncertain", icon: Compass },
  { label: "I feel okay", icon: SunMedium },
] as const;

const ACTION_OPTIONS = [
  { label: "Talk to me", icon: MessageCircle },
  { label: "Calm me down", icon: Feather },
  { label: "Help me decide", icon: Scale },
  { label: "Journaling", icon: BookOpen },
  { label: "Daily check-in", icon: CalendarHeart },
  { label: "Crisis help", icon: LifeBuoy },
] as const;

const PRESET_PROMPTS: Record<string, { mode: string; message: string }> = {
  "I feel anxious": {
    mode: "grounding",
    message: "I feel anxious. Please help me calm down with non-medical grounding steps.",
  },
  "I feel stressed": {
    mode: "productivity",
    message: "I feel stressed. Help me prioritize and choose one manageable next step.",
  },
  "I feel down": {
    mode: "reflection",
    message: "I feel down. Offer a gentle reflection prompt and one tiny action.",
  },
  "I feel overwhelmed": {
    mode: "productivity",
    message: "I feel overwhelmed. Break this into very small, practical steps.",
  },
  "I feel uncertain": {
    mode: "decision",
    message: "I feel uncertain. Help me make a decision with a simple framework.",
  },
  "I feel okay": {
    mode: "check-in",
    message: "I feel okay. Give me a short daily check-in prompt.",
  },
  "Talk to me": {
    mode: "support",
    message: "Talk to me and ask one question that helps me open up.",
  },
  "Calm me down": {
    mode: "grounding",
    message: "Calm me down with a short breathing and grounding routine.",
  },
  "Help me decide": {
    mode: "decision",
    message: "Help me decide with pros/cons and a practical next step.",
  },
  Journaling: {
    mode: "journaling",
    message: "Give me a journaling starter for how I feel today.",
  },
  "Daily check-in": {
    mode: "check-in",
    message: "Run a short daily check-in for mood, body, and next step.",
  },
  "Crisis help": {
    mode: "crisis",
    message: "I might be in a crisis. Give immediate safety guidance and emergency direction.",
  },
};

function statusForPresence(presence: AppPresence): string {
  switch (presence) {
    case "listening":
      return "Taking that in...";
    case "speaking":
      return "Let’s take this slowly.";
    default:
      return "I’m here with you.";
  }
}

export default function App() {
  const [presence, setPresence] = useState<AppPresence>("idle");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [agentTrace, setAgentTrace] = useState<AgentTraceEntry[]>([]);
  const [thinkingTrace, setThinkingTrace] = useState<AgentTraceEntry[]>([]);
  const [safetyLevel, setSafetyLevel] = useState<SafetyLevel | null>(null);
  const [mockMode, setMockMode] = useState(false);
  const [voiceReplyOn, setVoiceReplyOn] = useState(true);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeakingOut, setIsSpeakingOut] = useState(false);
  const exchangeLock = useRef(false);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const traceTimerRef = useRef<number | null>(null);
  const stopThinkingTrace = useCallback(() => {
    if (traceTimerRef.current !== null) {
      window.clearInterval(traceTimerRef.current);
      traceTimerRef.current = null;
    }
  }, []);

  const startThinkingTrace = useCallback(() => {
    stopThinkingTrace();
    setThinkingTrace(
      AGENT_SEQUENCE.map((step, idx) => ({
        agent: step.agent,
        output: idx === 0 ? step.output : "Waiting for previous agent...",
      })),
    );
    let stepIndex = 1;
    traceTimerRef.current = window.setInterval(() => {
      setThinkingTrace((prev) =>
        prev.map((item, idx) => {
          if (idx < stepIndex) return { ...item, output: `${AGENT_SEQUENCE[idx].output} Done.` };
          if (idx === stepIndex) return { ...item, output: AGENT_SEQUENCE[idx].output };
          return item;
        }),
      );
      stepIndex += 1;
      if (stepIndex >= AGENT_SEQUENCE.length) {
        stopThinkingTrace();
      }
    }, 700);
  }, [stopThinkingTrace]);


  const getPreferredVoice = useCallback(
    (voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined => {
      if (selectedVoiceName) {
        const explicit = voices.find((v) => v.name === selectedVoiceName);
        if (explicit) return explicit;
      }

      // Prefer natural-sounding English voices when available.
      const preferredPatterns = [
        /natural/i,
        /neural/i,
        /samantha/i,
        /ava/i,
        /alloy/i,
        /google.*en/i,
        /microsoft.*aria/i,
        /microsoft.*jenny/i,
      ];

      for (const pattern of preferredPatterns) {
        const match = voices.find((v) => /^en[-_]/i.test(v.lang) && pattern.test(v.name));
        if (match) return match;
      }

      return voices.find((v) => /^en[-_]/i.test(v.lang)) ?? voices[0];
    },
    [selectedVoiceName],
  );

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeakingOut(false);
    setPresence((p) => (p === "speaking" ? "idle" : p));
  }, []);

  const speakText = useCallback(
    (text: string) =>
      new Promise<void>((resolve) => {
        if (!voiceReplyOn || !("speechSynthesis" in window)) {
          resolve();
          return;
        }

        stopSpeaking();
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        const bestVoice = getPreferredVoice(voices);
        if (bestVoice) utterance.voice = bestVoice;
        utterance.rate = 0.92;
        utterance.pitch = 1.02;
        utterance.onstart = () => {
          setIsSpeakingOut(true);
          setPresence("speaking");
        };
        utterance.onend = () => {
          setIsSpeakingOut(false);
          resolve();
        };
        utterance.onerror = () => {
          setIsSpeakingOut(false);
          resolve();
        };
        window.speechSynthesis.speak(utterance);
      }),
    [getPreferredVoice, stopSpeaking, voiceReplyOn],
  );

  const canUseSpeechRecognition = useMemo(() => {
    const w = window as WebkitWindow;
    return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
  }, []);

  const toggleVoiceInput = useCallback(() => {
    setVoiceError(null);
    const w = window as WebkitWindow;
    const SpeechRec = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SpeechRec) {
      setVoiceError("Voice input is not supported in this browser. Please type instead.");
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRec();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: BrowserSpeechRecognitionEvent) => {
      const spoken = event.results?.[0]?.[0]?.transcript?.trim();
      if (spoken) setInput(spoken);
    };
    recognition.onerror = () => {
      setVoiceError("Could not capture voice input. Please try again or type instead.");
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const loadVoices = () => {
      const voices = synth.getVoices();
      setAvailableVoices(voices);
      if (!selectedVoiceName) {
        const preferred = getPreferredVoice(voices);
        if (preferred) setSelectedVoiceName(preferred.name);
      }
    };
    loadVoices();
    synth.onvoiceschanged = loadVoices;
    return () => {
      synth.onvoiceschanged = null;
    };
  }, [getPreferredVoice, selectedVoiceName]);

  useEffect(() => {
    return () => {
      stopThinkingTrace();
      recognitionRef.current?.stop();
      window.speechSynthesis.cancel();
    };
  }, [stopThinkingTrace]);

  const processExchange = useCallback(async (userText: string, mode = "general") => {
    const trimmed = userText.trim();
    if (!trimmed || exchangeLock.current) return;
    exchangeLock.current = true;

    setPresence("listening");
    setMessages((m) => [
      ...m,
      { id: createId(), role: "user", text: trimmed },
    ]);
    startThinkingTrace();

    try {
      await new Promise((r) => setTimeout(r, THINKING_MS));

      const result = await sendAgentChat({
        message: trimmed,
        mode,
        history: messages.slice(-10).map((m) => ({ role: m.role, content: m.text })),
      });
      const reply = result.finalResponse;
      setAgentTrace(result.agentTrace);
      setThinkingTrace([]);
      setSafetyLevel(result.safetyLevel);
      setMockMode(result.mockMode);
      setMessages((m) => [
        ...m,
        { id: createId(), role: "assistant", text: reply },
      ]);
      await speakText(reply);
      setPresence("idle");
    } catch (error) {
      setThinkingTrace([]);
      setMockMode(false);
      const errorMessage =
        error instanceof Error ? error.message : "The assistant is temporarily unavailable.";
      setMessages((m) => [
        ...m,
        { id: createId(), role: "assistant", text: errorMessage },
      ]);
      setPresence("idle");
    } finally {
      stopThinkingTrace();
      exchangeLock.current = false;
    }
  }, [messages, speakText, startThinkingTrace, stopThinkingTrace]);

  const handleSend = useCallback(() => {
    const t = input.trim();
    if (!t || presence !== "idle") return;
    setInput("");
    setSelectedLabel(null);
    void processExchange(t, "general");
  }, [input, presence, processExchange]);

  const handlePreset = useCallback(
    (label: string) => {
      if (presence !== "idle") return;
      const preset = PRESET_PROMPTS[label] ?? { mode: "general", message: label };
      setSelectedLabel(label);
      setInput("");
      void processExchange(preset.message, preset.mode);
    },
    [presence, processExchange],
  );

  const handleDemo = useCallback(() => {
    if (presence !== "idle") return;
    setSelectedLabel("demo");
    void processExchange(DEMO_MESSAGE, "demo");
  }, [presence, processExchange]);

  const busy = presence !== "idle";
  const statusText = statusForPresence(presence);

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 -z-20 wellness-room-base" aria-hidden />
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-cream/50 via-transparent to-linen/80"
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 -z-10 leaf-light-overlay" aria-hidden />

      <header className="relative z-10 flex shrink-0 items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cream/90 text-sageDeep shadow-soft ring-2 ring-white/90">
            <Leaf className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.75} />
          </span>
          <h1 className="font-serif text-xl font-semibold tracking-wide text-earth sm:text-2xl">
            Ethereal Wellness
          </h1>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            aria-label="Settings"
            className="flex h-11 w-11 items-center justify-center rounded-full text-bark/65 transition hover:bg-white/70 hover:text-earth hover:shadow-soft"
          >
            <Settings className="h-5 w-5" strokeWidth={1.65} />
          </button>
          <button
            type="button"
            aria-label="Profile"
            className="flex h-11 w-11 items-center justify-center rounded-full text-bark/65 transition hover:bg-white/70 hover:text-earth hover:shadow-soft"
          >
            <UserRound className="h-5 w-5" strokeWidth={1.65} />
          </button>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col gap-10 px-4 pb-8 pt-6 lg:flex-row lg:gap-10 lg:px-6 lg:pt-12 xl:px-10">
        <aside className="flex shrink-0 flex-row gap-3 overflow-x-auto pb-1 lg:w-64 lg:flex-col lg:overflow-visible lg:pb-0 xl:w-[17rem]">
          {MOOD_OPTIONS.map(({ label, icon: Icon }) => (
            <SidebarOption
              key={label}
              label={label}
              side="left"
              disabled={busy}
              selected={selectedLabel === label}
              icon={<Icon className="h-5 w-5" strokeWidth={1.65} />}
              onClick={() => handlePreset(label)}
            />
          ))}
        </aside>

        <section className="flex min-w-0 flex-1 flex-col items-center gap-6 lg:py-1">
          <button
            type="button"
            onClick={handleDemo}
            disabled={busy}
            title="Run classroom demo scenario"
            className="self-end rounded-full border border-stone/60 bg-white/55 px-3 py-1 text-[0.65rem] font-medium uppercase tracking-wide text-bark/70 transition hover:bg-white/75 hover:text-bark disabled:opacity-40"
          >
            Demo
          </button>
          <div className="relative w-[min(100%,340px)] max-w-[min(94vw,380px)]">
            <div
              className="pointer-events-none absolute -inset-4 rounded-full bg-leaf-shade opacity-90 blur-2xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -inset-1 rounded-full bg-gradient-to-br from-white/55 via-cream/25 to-transparent shadow-[inset_0_0_40px_rgba(255,255,255,0.35)] ring-1 ring-white/70 backdrop-blur-[2px]"
              aria-hidden
            />

            <motion.div
              className="relative rounded-full bg-gradient-to-br from-white/95 via-cream/90 to-mist/75 p-[3px] shadow-natural ring-1 ring-stone/40"
              animate={{
                scale: presence === "speaking" ? [1, 1.025, 1] : 1,
                boxShadow:
                  presence === "speaking"
                    ? "0 20px 50px -12px rgba(85, 107, 84, 0.35), 0 0 0 1px rgba(255,255,255,0.5)"
                    : "0 18px 44px -16px rgba(61, 53, 46, 0.2), 0 0 0 1px rgba(255,255,255,0.45)",
              }}
              transition={{
                duration: presence === "speaking" ? 1.85 : 0.45,
                repeat: presence === "speaking" ? Infinity : 0,
                ease: "easeInOut",
              }}
            >
              <div className="rounded-full bg-gradient-to-b from-white/80 via-cream/50 to-linen/60 p-1.5 shadow-glass ring-1 ring-white/90">
                <div className="relative aspect-square overflow-hidden rounded-full bg-gradient-to-b from-cream via-linen to-sand shadow-[inset_0_2px_24px_rgba(61,53,46,0.06)]">
                  <Avatar presence={presence} className="h-full w-full min-h-[200px]" />
                </div>
              </div>
            </motion.div>
          </div>

          <div className="min-h-[2.75rem] text-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={presence}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="font-serif text-xl text-earth sm:text-2xl"
              >
                {statusText}
              </motion.p>
            </AnimatePresence>
          </div>
          {mockMode ? (
            <p className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-800">
              Demo fallback active (mock mode): Ollama unavailable.
            </p>
          ) : null}

          <Waveform presence={presence} />

          <Transcript messages={messages} />
          <AgentTracePanel
            trace={agentTrace}
            thinkingTrace={thinkingTrace}
            isThinking={presence === "listening"}
            safetyLevel={safetyLevel}
          />

          <div className="flex w-full max-w-xl items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setVoiceReplyOn((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full border border-stone/70 bg-white/70 px-3 py-1.5 text-xs text-bark transition hover:bg-white"
            >
              {voiceReplyOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              Voice reply {voiceReplyOn ? "on" : "off"}
            </button>
            <button
              type="button"
              onClick={stopSpeaking}
              className="inline-flex items-center gap-2 rounded-full border border-stone/70 bg-white/70 px-3 py-1.5 text-xs text-bark transition hover:bg-white disabled:opacity-50"
              disabled={!isSpeakingOut}
            >
              <Square className="h-3.5 w-3.5" />
              Stop speaking
            </button>
          </div>
          <div className="w-full max-w-xl">
            <label className="mb-1 block text-[0.68rem] uppercase tracking-wide text-bark/65">
              Voice style
            </label>
            <select
              value={selectedVoiceName}
              onChange={(e) => setSelectedVoiceName(e.target.value)}
              className="w-full rounded-xl border border-stone/70 bg-white/70 px-3 py-2 text-xs text-bark outline-none transition focus:ring-2 focus:ring-sage/35"
            >
              {availableVoices.length === 0 ? (
                <option value="">Default browser voice</option>
              ) : (
                availableVoices
                  .filter((v) => /^en[-_]/i.test(v.lang))
                  .map((voice) => (
                    <option key={`${voice.name}-${voice.lang}`} value={voice.name}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))
              )}
            </select>
          </div>
          {voiceError ? <p className="w-full max-w-xl text-xs text-rose-700">{voiceError}</p> : null}
          {!canUseSpeechRecognition ? (
            <p className="w-full max-w-xl text-xs text-bark/70">
              Voice input is not supported in this browser. Please type instead.
            </p>
          ) : null}

          <div className="mt-auto w-full pt-1">
            <ChatInput
              value={input}
              onChange={setInput}
              onSend={handleSend}
              onToggleVoiceInput={toggleVoiceInput}
              isListening={isListening}
              disabled={busy}
            />
          </div>
        </section>

        <aside className="flex shrink-0 flex-row gap-3 overflow-x-auto pb-1 lg:w-64 lg:flex-col lg:overflow-visible lg:pb-0 xl:w-[17rem]">
          {ACTION_OPTIONS.map(({ label, icon: Icon }) => (
            <SidebarOption
              key={label}
              label={label}
              side="right"
              disabled={busy}
              selected={selectedLabel === label}
              icon={<Icon className="h-5 w-5" strokeWidth={1.65} />}
              onClick={() => handlePreset(label)}
            />
          ))}
        </aside>
      </main>

      <footer className="relative z-10 shrink-0 px-4 pb-6 pt-2 text-center">
        <p className="text-[0.74rem] text-bark/55 sm:text-[0.8rem]">
          AI wellness companion — not a medical professional.
        </p>
      </footer>
    </div>
  );
}
