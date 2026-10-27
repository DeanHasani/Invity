import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * One CSV cell. Guest names and notes come from anyone with the link, so a
 * leading = + - @ (or TAB/CR) gets a ' to stop spreadsheets running it as a
 * formula, and a bare CR is quoted so it can't start a fake row.
 */
export function csvEscape(v: string): string {
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
