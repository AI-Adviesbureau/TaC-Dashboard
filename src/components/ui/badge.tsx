import { cn } from "@/lib/cn";

type Tone = "ok" | "warn" | "bad" | "neutral" | "blue";

const TONES: Record<Tone, string> = {
  ok: "bg-[var(--ok)]/12 text-[var(--ok)]",
  warn: "bg-[var(--warn)]/12 text-[var(--warn)]",
  bad: "bg-[var(--bad)]/12 text-[var(--bad)]",
  blue: "bg-[var(--brand-blue-50)] text-[var(--brand-blue-700)]",
  neutral: "bg-[var(--surface-2)] text-[var(--muted)]",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
