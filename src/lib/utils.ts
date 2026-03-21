import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isToday, isTomorrow, isPast, startOfDay, endOfDay, addDays } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEE, MMM d");
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isToday(d)) return `Today at ${format(d, "HH:mm")}`;
  if (isTomorrow(d)) return `Tomorrow at ${format(d, "HH:mm")}`;
  return format(d, "EEE, MMM d 'at' HH:mm");
}

export function isOverdue(date: string | null): boolean {
  if (!date) return false;
  return isPast(new Date(date)) && !isToday(new Date(date));
}

export function getNext7Days(): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(startOfDay(new Date()), i));
}

export function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

export function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "…" : str;
}
