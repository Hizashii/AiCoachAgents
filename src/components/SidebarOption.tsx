import type { ReactNode } from "react";

type SidebarOptionProps = {
  label: string;
  onClick: () => void;
  side?: "left" | "right";
  icon: ReactNode;
  disabled?: boolean;
  selected?: boolean;
};

export function SidebarOption({
  label,
  onClick,
  side = "left",
  icon,
  disabled,
  selected,
}: SidebarOptionProps) {
  const base =
    side === "left"
      ? "border-stone/90 bg-white/75 hover:border-sageMuted/55 hover:bg-mist/55 hover:shadow-soft"
      : "border-stone/90 bg-white/75 hover:border-moss/50 hover:bg-fern/45 hover:shadow-soft";

  const selectedStyles =
    side === "left"
      ? "border-sageMuted bg-mist/70 shadow-lift ring-2 ring-sageMuted/35 ring-offset-2 ring-offset-cream"
      : "border-moss bg-fern/55 shadow-lift ring-2 ring-moss/30 ring-offset-2 ring-offset-cream";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={[
        "group flex w-full min-h-[3.25rem] items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-left shadow-sm backdrop-blur-sm transition-all duration-300 sm:min-h-[3.5rem] sm:rounded-[1.15rem] sm:px-4 sm:py-4",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-sageMuted/45 focus-visible:ring-offset-2 focus-visible:ring-offset-cream/80",
        "disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none disabled:ring-0",
        selected ? selectedStyles : base,
        !selected && !disabled ? "hover:-translate-y-0.5" : "",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linen/90 text-sageDeep shadow-input ring-1 ring-stone/50 transition group-hover:bg-cream group-hover:text-moss",
          selected ? "bg-cream text-moss ring-sageMuted/40" : "",
        ].join(" ")}
      >
        {icon}
      </span>
      <span className="text-[0.95rem] font-medium leading-snug tracking-tight text-earth sm:text-base">
        {label}
      </span>
    </button>
  );
}
