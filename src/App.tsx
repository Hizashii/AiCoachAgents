import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
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
  Radio,
  Scale,
  Square,
  SunMedium,
  Volume2,
  VolumeX,
  Waves,
} from "lucide-react";
import { sendAgentChatStream } from "./api";
import { AICore } from "./components/AICore";
import { AgentIntelligencePanel } from "./components/AgentIntelligencePanel";
import { ChatInput } from "./components/ChatInput";
import { CockpitShell } from "./components/CockpitShell";
import { CommandPanel } from "./components/CommandPanel";
import { MoodMemoryPanel } from "./components/MoodMemoryPanel";
import { SafetyPanel } from "./components/SafetyPanel";
import { StatusPill } from "./components/StatusPill";
import { TechnicalStackCard } from "./components/TechnicalStackCard";
import { ThoughtTransformer } from "./components/ThoughtTransformer";
import { Transcript } from "./components/Transcript";
import { getMoodLogs, saveMoodLog, type MoodLog } from "./storage";
import type {
  ActionStep,
  AgentName,
  AgentTraceEntry,
  AppPresence,
  ChatMessage,
  CoachMap,
  SafetyLevel,
} from "./types";

const DEMO_MESSAGE = "I feel overwhelmed and I can’t start my assignment.";

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
  const [actionPlan, setActionPlan] = useState<ActionStep[]>([]);
  const [coachMap, setCoachMap] = useState<CoachMap | null>(null);
  const [studyContext, setStudyContext] = useState("");
  const [debateMode, setDebateMode] = useState(false);
  const [transformSeed, setTransformSeed] = useState("");
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [voiceReplyOn, setVoiceReplyOn] = useState(true);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeakingOut, setIsSpeakingOut] = useState(false);
  const exchangeLock = useRef(false);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  // Load any saved mood sessions once on mount.
  useEffect(() => {
    setMoodLogs(getMoodLogs());
  }, []);

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
      recognitionRef.current?.stop();
      window.speechSynthesis.cancel();
    };
  }, []);

  const processExchange = useCallback(async (userText: string, mode = "general") => {
    const trimmed = userText.trim();
    if (!trimmed || exchangeLock.current) return;
    exchangeLock.current = true;

    // Debate mode overrides the mode for any real (non-demo) exchange.
    const effectiveMode = debateMode && mode !== "demo" ? "debate" : mode;

    setPresence("listening");
    setAgentTrace([]);
    setThinkingTrace([]);
    setActionPlan([]);
    setCoachMap(null);
    setMessages((m) => [
      ...m,
      { id: createId(), role: "user", text: trimmed },
    ]);

    try {
      const result = await sendAgentChatStream(
        {
          message: trimmed,
          mode: effectiveMode,
          history: messages.slice(-10).map((m) => ({ role: m.role, content: m.text })),
          studyContext: studyContext.trim() || undefined,
        },
        {
          // Each agent appears live as the backend finishes it.
          onStep: (step) => {
            setThinkingTrace((prev) => {
              const withoutAgent = prev.filter((p) => p.agent !== step.agent);
              return [...withoutAgent, step];
            });
          },
        },
      );
      const reply = result.finalResponse;
      setAgentTrace(result.agentTrace);
      setThinkingTrace([]);
      setSafetyLevel(result.safetyLevel);
      setMockMode(result.mockMode);
      setActionPlan(result.actionPlan ?? []);
      setCoachMap(result.coachMap ?? null);
      setMessages((m) => [
        ...m,
        { id: createId(), role: "assistant", text: reply },
      ]);

      if (result.mockMode) {
        toast("Mock mode active", {
          description: "Ollama is offline — agents are using safe demo fallbacks.",
        });
      }
      if ((result.actionPlan?.length ?? 0) > 0 && result.safetyLevel !== "crisis") {
        toast.success("Action plan ready", {
          description: `${result.actionPlan?.length} tiny next steps generated.`,
        });
      }

      // Persist this exchange so Mood Memory can show patterns over time.
      saveMoodLog({
        id: createId(),
        createdAt: new Date().toISOString(),
        label: selectedLabel,
        mode: effectiveMode,
        safetyLevel: result.safetyLevel,
        userMessage: trimmed,
        assistantReply: reply,
      });
      setMoodLogs(getMoodLogs());

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
      exchangeLock.current = false;
    }
  }, [messages, speakText, debateMode, studyContext, selectedLabel]);

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
    toast("Demo started", { description: "Running the full multi-agent walkthrough." });
    void processExchange(DEMO_MESSAGE, "demo");
  }, [presence, processExchange]);

  const handleScenario = useCallback(
    (message: string, mode: string) => {
      if (presence !== "idle") return;
      setSelectedLabel(null);
      void processExchange(message, mode);
    },
    [presence, processExchange],
  );

  const handleSaveContext = useCallback(() => {
    if (!studyContext.trim()) return;
    toast.success("Context updated", {
      description: "Agents will use this assignment context when advising.",
    });
  }, [studyContext]);

  const handleClearContext = useCallback(() => {
    setStudyContext("");
    toast("Context cleared");
  }, []);

  const handleRunTransform = useCallback((text: string) => {
    // Seed the Thought Transformer panel (it remounts on a new seed) and bring
    // it into view.
    setTransformSeed(text);
    window.setTimeout(() => {
      document
        .getElementById("thought-transformer")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  }, []);

  const busy = presence !== "idle";
  const working = presence === "listening";
  const statusText = statusForPresence(presence);
  const safety: SafetyLevel = safetyLevel ?? "normal";
  const presenceLabel = presence === "speaking" ? "Speaking" : working ? "Thinking" : "Idle";
  const activeAgents: AgentName[] = (working ? thinkingTrace : agentTrace).map((e) => e.agent);

  const header = (
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 py-4">
      <div className="flex items-center gap-3">
        <span className="accent-glow flex h-10 w-10 items-center justify-center rounded-full bg-cream/90 text-sageDeep shadow-soft ring-2 ring-white/90">
          <Leaf className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.75} />
        </span>
        <div>
          <h1 className="font-serif text-xl font-semibold leading-none tracking-wide text-earth sm:text-2xl">
            Ethereal Wellness
          </h1>
          <p className="text-[0.7rem] text-bark/55">Agentic AI student coach</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-2.5">
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-sageDeep/30 bg-white/70 px-3 py-1 text-[0.7rem] font-medium text-sageDeep"
          aria-label={`AI state: ${presenceLabel}`}
        >
          <Radio className={`h-3.5 w-3.5 ${presence !== "idle" ? "animate-pulse" : ""}`} />
          {presenceLabel}
        </span>
        <StatusPill safetyLevel={safetyLevel} mockMode={mockMode} />
      </div>
    </header>
  );

  const left = (
    <CommandPanel
      moodOptions={MOOD_OPTIONS}
      actionOptions={ACTION_OPTIONS}
      selectedLabel={selectedLabel}
      busy={busy}
      onPreset={handlePreset}
      onDemo={handleDemo}
      onScenario={handleScenario}
      onTransform={handleRunTransform}
      debateMode={debateMode}
      onToggleDebate={() => setDebateMode((v) => !v)}
      studyContext={studyContext}
      onChangeContext={setStudyContext}
      onSaveContext={handleSaveContext}
      onClearContext={handleClearContext}
    />
  );

  const center = (
    <>
      <div className="stage-panel flex w-full max-w-xl flex-col items-center gap-2 px-5 py-6 sm:px-8 sm:py-7 lg:max-w-2xl">
        <AICore
          presence={presence}
          working={working}
          activeAgents={activeAgents}
          statusText={statusText}
        />
      </div>

      {safety === "crisis" ? (
        <div className="flex justify-center">
          <SafetyPanel />
        </div>
      ) : null}

      <Transcript messages={messages} />

      <div className="mx-auto w-full max-w-xl space-y-2">
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          onToggleVoiceInput={toggleVoiceInput}
          isListening={isListening}
          disabled={busy}
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
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
          <select
            value={selectedVoiceName}
            onChange={(e) => setSelectedVoiceName(e.target.value)}
            aria-label="Voice style"
            className="min-w-0 flex-1 rounded-full border border-stone/70 bg-white/70 px-3 py-1.5 text-xs text-bark outline-none transition focus:ring-2 focus:ring-sage/35"
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
        {voiceError ? <p className="text-xs text-rose-700">{voiceError}</p> : null}
        {!canUseSpeechRecognition ? (
          <p className="text-xs text-bark/70">
            Voice input is not supported in this browser. Please type instead.
          </p>
        ) : null}
      </div>
    </>
  );

  const right = (
    <AgentIntelligencePanel
      trace={agentTrace}
      thinkingTrace={thinkingTrace}
      isThinking={working}
      debateMode={debateMode}
      safetyLevel={safetyLevel}
      actionPlan={actionPlan}
      coachMap={coachMap}
    />
  );

  const bottom = (
    <>
      <div id="thought-transformer">
        <ThoughtTransformer key={transformSeed} initialText={transformSeed} />
      </div>
      <MoodMemoryPanel logs={moodLogs} onCleared={() => setMoodLogs(getMoodLogs())} />
      <TechnicalStackCard />
    </>
  );

  const footer = (
    <p className="text-[0.74rem] text-bark/55 sm:text-[0.8rem]">
      AI wellness companion — not a medical professional.
    </p>
  );

  return (
    <>
      <CockpitShell
        safety={safety}
        header={header}
        left={left}
        center={center}
        right={right}
        bottom={bottom}
        footer={footer}
      />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "rgba(247,244,236,0.96)",
            border: "1px solid rgba(217,207,194,0.7)",
            color: "#3d352e",
          },
        }}
      />
    </>
  );
}
