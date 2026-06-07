import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combineert classnames en lost Tailwind-conflicten op. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
