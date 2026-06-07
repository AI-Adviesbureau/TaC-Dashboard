import Image from "next/image";
import { cn } from "@/lib/cn";

const RATIO = 164 / 109; // verhouding van het officiële logo

/**
 * Officieel Talenti a Casa-logo (public/logo-talenti.png).
 * - Volledige variant: de wordmark.
 * - Compacte variant: een klein merkje met de huisstijlkleuren (voor het
 *   ingeklapte zijmenu, waar de wordmark niet past).
 */
export function Logo({
  compact = false,
  height = 36,
  className = "",
}: {
  compact?: boolean;
  height?: number;
  className?: string;
}) {
  if (compact) {
    return (
      <span
        className={cn(
          "grid place-items-center rounded-2xl font-extrabold text-white shadow-sm",
          className
        )}
        style={{
          width: height,
          height,
          background: "linear-gradient(135deg, var(--brand-green), var(--brand-blue))",
        }}
        aria-label="Talenti a Casa"
      >
        <span className="relative text-[15px] leading-none">
          T
          <span
            className="absolute -right-1.5 -top-1 grid h-3 w-3 place-items-center rounded-full text-[8px] text-[var(--text)]"
            style={{ background: "var(--brand-yellow)" }}
          >
            a
          </span>
        </span>
      </span>
    );
  }

  return (
    <Image
      src="/logo-talenti.png"
      alt="Talenti a Casa"
      width={Math.round(height * RATIO)}
      height={height}
      priority
      className={className}
    />
  );
}
