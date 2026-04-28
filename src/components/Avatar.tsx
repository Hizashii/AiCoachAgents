import { TherapistSvg } from "./TherapistSvg";
import type { AppPresence } from "../types";

export type AvatarProps = {
  presence: AppPresence;
  className?: string;
};

export function Avatar({ presence, className }: AvatarProps) {
  const isSpeaking = presence === "speaking";

  return (
    <div
      className={[
        "avatar-wrap relative flex h-full w-full items-center justify-center overflow-hidden rounded-full",
        className ?? "",
      ].join(" ")}
    >
      <div
        className="pointer-events-none absolute inset-[8%] rounded-full bg-sage/15 blur-2xl"
        aria-hidden
      />
      <div className={`avatar ${isSpeaking ? "talking" : ""}`}>
        <div className="avatar-head flex h-full w-full items-center justify-center">
          <TherapistSvg
            className={[
              "avatar-svg block h-[118%] w-[118%] min-h-[118%] min-w-[118%] max-w-none shrink-0",
              isSpeaking ? "is-speaking" : "",
            ].join(" ")}
            style={{
              filter:
                "brightness(1.03) contrast(0.94) saturate(0.92) drop-shadow(0 10px 22px rgba(61, 53, 46, 0.12)) drop-shadow(0 0 28px rgba(143, 166, 142, 0.22))",
            }}
          />
        </div>
      </div>
    </div>
  );
}
