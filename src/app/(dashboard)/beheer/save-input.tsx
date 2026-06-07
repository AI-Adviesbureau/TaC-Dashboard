"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";

/** Tekstveld dat bij blur/Enter de waarde opslaat en kort een vinkje toont. */
export function SaveInput({
  initial,
  placeholder,
  onSave,
}: {
  initial: string;
  placeholder?: string;
  onSave: (value: string) => Promise<void>;
}) {
  const [value, setValue] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const dirty = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(initial);
  }, [initial]);

  async function commit() {
    if (!dirty.current || value === initial) return;
    setState("saving");
    await onSave(value);
    dirty.current = false;
    setState("saved");
    setTimeout(() => setState("idle"), 1500);
  }

  return (
    <div className="relative flex items-center">
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          setValue(e.target.value);
          dirty.current = true;
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="w-full rounded-lg border bg-[var(--surface)] px-2.5 py-1.5 text-sm outline-none transition focus:border-[var(--brand-green)] focus:ring-2 focus:ring-[var(--brand-green-50)]"
      />
      {state === "saving" && (
        <Loader2 className="absolute right-2 h-3.5 w-3.5 animate-spin text-[var(--muted)]" />
      )}
      {state === "saved" && <Check className="absolute right-2 h-3.5 w-3.5 text-[var(--ok)]" />}
    </div>
  );
}
