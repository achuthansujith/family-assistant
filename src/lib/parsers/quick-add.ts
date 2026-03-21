import { addDays, addHours, nextDay, setHours, setMinutes, startOfDay } from "date-fns";
import type { QuickAddResult } from "@/types";

// ============================================================
// Deterministic quick-add parser
// Tries to classify input without AI first
// ============================================================

const GROCERY_KEYWORDS = /^(buy|get|pick up|grab|need|add)\s+/i;
const REMINDER_KEYWORDS = /^(remind|reminder|don't forget|remember)\s+/i;
const CHORE_KEYWORDS = /^(clean|wash|vacuum|mop|take out|do the|laundry|dishes|sweep|wipe)\s+/i;
const EVENT_KEYWORDS = /^(appointment|meeting|doctor|dentist|school|event|birthday|anniversary|trip|travel|flight|bill|pay)\s+/i;

const DAY_MAP: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

const TIME_REGEX = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;
const DAY_REGEX = new RegExp(`\\b(${Object.keys(DAY_MAP).join("|")})\\b`, "i");
const RELATIVE_DAY_REGEX = /\b(today|tomorrow|next week)\b/i;
const RECURRENCE_REGEX = /\b(every day|daily|every week|weekly|every month|monthly|every (\d+) days?)\b/i;

function parseTime(text: string, base: Date): Date {
  const timeMatch = text.match(TIME_REGEX);
  if (!timeMatch) return setHours(setMinutes(base, 0), 9); // default 9am

  let hours = parseInt(timeMatch[1]);
  const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
  const meridiem = timeMatch[3]?.toLowerCase();

  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;

  return setHours(setMinutes(base, minutes), hours);
}

function parseDate(text: string): Date {
  const now = new Date();
  const lower = text.toLowerCase();

  const relMatch = lower.match(RELATIVE_DAY_REGEX);
  if (relMatch) {
    if (relMatch[1] === "today") return startOfDay(now);
    if (relMatch[1] === "tomorrow") return startOfDay(addDays(now, 1));
    if (relMatch[1] === "next week") return startOfDay(addDays(now, 7));
  }

  const dayMatch = lower.match(DAY_REGEX);
  if (dayMatch) {
    const targetDay = DAY_MAP[dayMatch[1].toLowerCase()];
    const currentDay = now.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7;
    return startOfDay(addDays(now, daysUntil));
  }

  return startOfDay(addDays(now, 1)); // default tomorrow
}

function parseRecurrence(text: string): string | null {
  const match = text.match(RECURRENCE_REGEX);
  if (!match) return null;
  const rule = match[1].toLowerCase();
  if (rule.includes("day") && !rule.includes("every")) return "daily";
  if (rule === "every day" || rule === "daily") return "daily";
  if (rule === "every week" || rule === "weekly") return "weekly";
  if (rule === "every month" || rule === "monthly") return "monthly";
  if (match[2]) return `custom:${match[2]}:days`;
  return null;
}

function parseGroceryItems(text: string): Array<{ name: string; quantity?: string }> {
  // Remove leading buy/get/etc
  const cleaned = text.replace(GROCERY_KEYWORDS, "").trim();
  // Split on commas, "and", semicolons
  const parts = cleaned.split(/,\s*|\s+and\s+/i).map(p => p.trim()).filter(Boolean);

  return parts.map(part => {
    // Try to extract quantity: "2 liters of milk", "a dozen eggs", "3 apples"
    const qtyMatch = part.match(/^(\d+(?:\.\d+)?(?:\s*(?:kg|g|l|ml|liter|liters|pack|packs|dozen|x))?)\s+(?:of\s+)?(.+)$/i);
    if (qtyMatch) {
      return { name: qtyMatch[2].trim(), quantity: qtyMatch[1].trim() };
    }
    return { name: part };
  });
}

export type ParseResult = {
  result: QuickAddResult;
  needsAi: boolean;
};

export function deterministicParse(text: string): ParseResult {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // --- Grocery ---
  if (GROCERY_KEYWORDS.test(trimmed)) {
    const items = parseGroceryItems(trimmed);
    return {
      needsAi: false,
      result: {
        type: "grocery",
        confidence: 0.9,
        data: items.map(i => ({ name: i.name, quantity: i.quantity ?? null })),
      },
    };
  }

  // --- Reminder ---
  if (REMINDER_KEYWORDS.test(trimmed)) {
    const withoutKeyword = trimmed.replace(REMINDER_KEYWORDS, "").trim();
    const date = parseDate(withoutKeyword);
    const due_at = parseTime(withoutKeyword, date).toISOString();

    // Check for "wife" / "husband" / "partner" to assign
    const toSpouse = /\b(wife|husband|partner|spouse)\b/i.test(withoutKeyword);

    return {
      needsAi: false,
      result: {
        type: "reminder",
        confidence: 0.85,
        data: {
          title: withoutKeyword.replace(TIME_REGEX, "").replace(DAY_REGEX, "").replace(RELATIVE_DAY_REGEX, "").replace(/\b(wife|husband|partner|spouse)\b/i, "").trim(),
          due_at,
          assigned_to: toSpouse ? "__spouse__" : null, // resolved to actual ID in API
        },
      },
    };
  }

  // --- Chore ---
  if (CHORE_KEYWORDS.test(trimmed)) {
    const recurrence = parseRecurrence(lower);
    const date = parseDate(lower);
    return {
      needsAi: false,
      result: {
        type: "chore",
        confidence: 0.85,
        data: {
          title: trimmed,
          due_date: date.toISOString().split("T")[0],
          recurrence_rule: (recurrence ?? undefined) as import("@/types").RecurrenceRule | undefined,
        },
      },
    };
  }

  // --- Event ---
  if (EVENT_KEYWORDS.test(trimmed)) {
    const date = parseDate(lower);
    const starts_at = parseTime(lower, date).toISOString();
    return {
      needsAi: false,
      result: {
        type: "event",
        confidence: 0.8,
        data: {
          title: trimmed,
          starts_at,
          category: "appointment" as const,
        },
      },
    };
  }

  // --- Comma-separated list without buy keyword = likely grocery ---
  if (trimmed.includes(",") || /\band\b/i.test(trimmed)) {
    const items = parseGroceryItems(trimmed);
    if (items.length > 1) {
      return {
        needsAi: false,
        result: {
          type: "grocery",
          confidence: 0.75,
          data: items.map(i => ({ name: i.name, quantity: i.quantity ?? null })),
        },
      };
    }
  }

  // --- Unknown - needs AI ---
  return {
    needsAi: true,
    result: {
      type: "unknown",
      raw: trimmed,
      confidence: 0,
    },
  };
}
