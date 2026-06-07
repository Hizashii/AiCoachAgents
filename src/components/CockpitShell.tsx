import type { ReactNode } from "react";
import type { SafetyLevel } from "../types";

type CockpitShellProps = {
  safety: SafetyLevel;
  header: ReactNode;
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  bottom?: ReactNode;
  footer?: ReactNode;
};

// The premium "Ethereal AI cockpit" frame: ambient background, top bar, and a
// responsive three-column main area with an optional full-width bottom strip.
// The data-safety attribute lets the whole UI adapt to the AI's safety level.
export function CockpitShell({
  safety,
  header,
  left,
  center,
  right,
  bottom,
  footer,
}: CockpitShellProps) {
  return (
    <div
      data-safety={safety}
      className="relative flex min-h-screen flex-col overflow-x-hidden"
    >
      <div className="pointer-events-none fixed inset-0 -z-20 wellness-room-base" aria-hidden />
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-cream/50 via-transparent to-linen/80"
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 -z-10 leaf-light-overlay" aria-hidden />

      {header}

      <main className="relative z-10 mx-auto w-full max-w-[1600px] flex-1 px-4 pb-8 pt-4 lg:px-6 lg:pt-8 xl:px-10">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[19rem_minmax(0,1fr)_22rem] lg:gap-6">
          <div className="order-2 flex flex-col gap-4 lg:order-1">{left}</div>
          <div className="order-1 flex min-w-0 flex-col items-center gap-5 lg:order-2">
            {center}
          </div>
          <div className="order-3 flex flex-col gap-4 lg:order-3">{right}</div>
        </div>

        {bottom ? (
          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">{bottom}</div>
        ) : null}
      </main>

      {footer ? (
        <footer className="relative z-10 shrink-0 px-4 pb-6 pt-2 text-center">{footer}</footer>
      ) : null}
    </div>
  );
}
