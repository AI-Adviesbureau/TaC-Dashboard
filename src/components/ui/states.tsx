import { cn } from "@/lib/cn";
import { Inbox } from "lucide-react";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-xl", className)} />;
}

export function EmptyState({
  title = "Geen gegevens",
  hint,
  icon,
}: {
  title?: string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--surface-2)] text-[var(--muted)]">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <p className="text-sm font-bold">{title}</p>
      {hint && <p className="max-w-xs text-xs text-[var(--muted)]">{hint}</p>}
    </div>
  );
}

export function ErrorState({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-6 py-12 text-center">
      <p className="text-sm font-bold text-[var(--bad)]">Kon de gegevens niet laden</p>
      {message && <p className="max-w-md text-xs text-[var(--muted)]">{message}</p>}
    </div>
  );
}
