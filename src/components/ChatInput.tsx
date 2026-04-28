import { Mic, SendHorizontal } from "lucide-react";

type ChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onToggleVoiceInput?: () => void;
  isListening?: boolean;
  disabled?: boolean;
  placeholder?: string;
};

export function ChatInput({
  value,
  onChange,
  onSend,
  onToggleVoiceInput,
  isListening,
  disabled,
  placeholder = "Share what is on your heart…",
}: ChatInputProps) {
  return (
    <div className="mx-auto flex w-full max-w-xl items-center gap-2 rounded-full border-2 border-stone/95 bg-cream/95 px-3 py-2.5 shadow-lift ring-1 ring-white/80 backdrop-blur-md">
      <button
        type="button"
        aria-label={isListening ? "Stop voice input" : "Start voice input"}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition hover:bg-mist/60 hover:text-earth ${
          isListening ? "bg-sageMuted/20 text-sageDeep" : "text-bark/60"
        }`}
        disabled={disabled}
        onClick={onToggleVoiceInput}
      >
        <Mic className="h-5 w-5" strokeWidth={1.75} />
      </button>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        className="min-w-0 flex-1 bg-transparent py-2 text-[0.98rem] text-earth placeholder:text-bark/45 focus:outline-none disabled:opacity-50"
      />
      <button
        type="button"
        onClick={onSend}
        disabled={disabled || !value.trim()}
        aria-label="Send message"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sageMuted text-white shadow-md transition hover:bg-moss hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-sm"
      >
        <SendHorizontal className="h-5 w-5" strokeWidth={1.85} />
      </button>
    </div>
  );
}
