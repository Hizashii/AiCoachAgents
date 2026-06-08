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
        className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-cream/40 via-transparent to-linen/80"
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 -z-10 observatory-grid" aria-hidden />
      <div className="pointer-events-none fixed inset-0 -z-10 leaf-light-overlay" aria-hidden />

      <div className="relative z-10 mx-auto flex w-full max-w-[1520px] flex-1 flex-col px-4 sm:px-6 lg:px-8">
        {header}

        <main className="flex-1 pb-8 pt-4 lg:pt-6">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,18.5rem)_minmax(0,1fr)_minmax(0,18.5rem)] lg:items-start lg:gap-6 xl:gap-8">
            <div className="order-2 flex flex-col lg:order-1 lg:min-w-0">{left}</div>
            <div className="order-1 flex min-w-0 flex-col items-center gap-5 lg:order-2">{center}</div>
            <div className="order-3 flex flex-col lg:min-w-0">{right}</div>
          </div>

          {bottom ? (
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:items-stretch">
              {bottom}
            </div>
          ) : null}
        </main>

        {footer ? <footer className="shrink-0 pb-6 pt-2 text-center">{footer}</footer> : null}
      </div>
    </div>
  );
}
