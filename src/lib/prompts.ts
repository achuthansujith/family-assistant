// ============================================================
// Prompt builders
// Rules:
//   - System prompts are short and reused (cached by OpenAI)
//   - User prompts contain only the minimum structured data needed
//   - Lists are capped to avoid runaway token counts
//   - No prose in user prompts - just key:value lines
// ============================================================

import type { Chore, CalendarEvent, Reminder, GroceryItem } from "@/types";
import { format } from "date-fns";

// Shared system prompt for daily summary - kept short and static
// Static system prompts benefit from OpenAI prompt caching (50% discount on cached tokens)
const DAILY_SUMMARY_SYSTEM = `Household assistant. Reply in 2-4 sentences max. Be practical, not chatty. No greetings.`;

export function buildDailySummaryPrompt(data: {
  date: string;
  overdueChores: Pick<Chore, "title">[];
  dueTodayChores: Pick<Chore, "title">[];
  todaysEvents: Pick<CalendarEvent, "title" | "starts_at">[];
  pendingReminders: Pick<Reminder, "title">[];
  unpurchasedGroceries: Pick<GroceryItem, "name">[];
}): { system: string; user: string } {
  // Build a compact key:value context block - no wasted tokens
  const lines: string[] = [`day:${data.date}`];

  // Cap each list to avoid token blowout on busy households
  if (data.overdueChores.length > 0)
    lines.push(`overdue:${data.overdueChores.slice(0, 5).map(c => c.title).join("|")}`);
  if (data.dueTodayChores.length > 0)
    lines.push(`today:${data.dueTodayChores.slice(0, 5).map(c => c.title).join("|")}`);
  if (data.todaysEvents.length > 0)
    lines.push(`events:${data.todaysEvents.slice(0, 4).map(e => `${e.title}@${format(new Date(e.starts_at), "HH:mm")}`).join("|")}`);
  if (data.pendingReminders.length > 0)
    lines.push(`reminders:${data.pendingReminders.slice(0, 4).map(r => r.title).join("|")}`);
  if (data.unpurchasedGroceries.length > 0)
    lines.push(`shopping:${data.unpurchasedGroceries.slice(0, 6).map(g => g.name).join("|")}`);

  return { system: DAILY_SUMMARY_SYSTEM, user: lines.join("\n") };
}

// Quick-add system prompt - static so it can be cached
const QUICK_ADD_SYSTEM = `Parse household input to JSON only. No explanation.
Schema: {"type":"chore"|"reminder"|"grocery"|"event","confidence":0-1,"data":{}}
grocery data: {"items":[{"name":"","quantity":""}]}
reminder data: {"title":"","due_at":"ISO","assigned_to":"self"|"spouse"|null}
chore data: {"title":"","due_date":"YYYY-MM-DD","recurrence_rule":"daily"|"weekly"|"monthly"|null}
event data: {"title":"","starts_at":"ISO","category":"appointment"|"school"|"family"|"travel"|"bill_payment"|"other"}`;

export function buildQuickAddPrompt(text: string): { system: string; user: string } {
  // User prompt is just the raw input - minimal tokens
  return { system: QUICK_ADD_SYSTEM, user: text };
}

// Morning summary prompt - static system for caching
const MORNING_SUMMARY_SYSTEM = `Household assistant. Morning briefing in 2-4 sentences. Be practical and energising. No greetings.`;

export function buildMorningSummaryPrompt(data: {
  date: string;
  overdueChores: { title: string }[];
  dueTodayChores: { title: string }[];
  todaysEvents: { title: string; starts_at?: string }[];
  pendingReminders: { title: string }[];
  needSoonGroceries: { name: string }[];
  todayMeals: { slot: string; meal_name: string }[];
}): { system: string; user: string } {
  const lines: string[] = [`day:${data.date}`];
  if (data.overdueChores.length) lines.push(`overdue:${data.overdueChores.slice(0, 5).map(c => c.title).join("|")}`);
  if (data.dueTodayChores.length) lines.push(`today:${data.dueTodayChores.slice(0, 5).map(c => c.title).join("|")}`);
  if (data.todaysEvents.length) lines.push(`events:${data.todaysEvents.slice(0, 4).map(e => e.title).join("|")}`);
  if (data.pendingReminders.length) lines.push(`reminders:${data.pendingReminders.slice(0, 4).map(r => r.title).join("|")}`);
  if (data.todayMeals.length) lines.push(`meals:${data.todayMeals.map(m => `${m.slot}:${m.meal_name}`).join("|")}`);
  if (data.needSoonGroceries.length) lines.push(`need_soon:${data.needSoonGroceries.slice(0, 5).map(g => g.name).join("|")}`);
  return { system: MORNING_SUMMARY_SYSTEM, user: lines.join("\n") };
}

// Evening summary prompt
const EVENING_SUMMARY_SYSTEM = `Household assistant. Evening wrap-up in 2-4 sentences. Acknowledge progress, flag tomorrow. No greetings.`;

export function buildEveningSummaryPrompt(data: {
  tomorrow: string;
  completedToday: { title: string }[];
  stillPending: { title: string }[];
  overdueCarryover: { title: string }[];
  tomorrowChores: { title: string }[];
  tomorrowEvents: { title: string }[];
  tomorrowMeals: { slot: string; meal_name: string }[];
}): { system: string; user: string } {
  const lines: string[] = [`tomorrow:${data.tomorrow}`];
  if (data.completedToday.length) lines.push(`done:${data.completedToday.slice(0, 6).map(c => c.title).join("|")}`);
  if (data.stillPending.length) lines.push(`pending:${data.stillPending.slice(0, 4).map(c => c.title).join("|")}`);
  if (data.overdueCarryover.length) lines.push(`overdue:${data.overdueCarryover.slice(0, 3).map(c => c.title).join("|")}`);
  if (data.tomorrowChores.length) lines.push(`tomorrow_chores:${data.tomorrowChores.slice(0, 4).map(c => c.title).join("|")}`);
  if (data.tomorrowEvents.length) lines.push(`tomorrow_events:${data.tomorrowEvents.slice(0, 4).map(e => e.title).join("|")}`);
  if (data.tomorrowMeals.length) lines.push(`tomorrow_meals:${data.tomorrowMeals.map(m => `${m.slot}:${m.meal_name}`).join("|")}`);
  return { system: EVENING_SUMMARY_SYSTEM, user: lines.join("\n") };
}

const WEEKLY_SUMMARY_SYSTEM = `Household assistant. Weekly overview in 3-5 sentences. Focus on conflicts and priorities.`;

export function buildWeeklySummaryPrompt(data: {
  weekStart: string;
  weekEnd: string;
  chores: Pick<Chore, "title">[];
  events: Pick<CalendarEvent, "title" | "starts_at">[];
  reminders: Pick<Reminder, "title">[];
}): { system: string; user: string } {
  const lines = [
    `week:${data.weekStart}/${data.weekEnd}`,
    `chores:${data.chores.slice(0, 8).map(c => c.title).join("|") || "none"}`,
    `events:${data.events.slice(0, 6).map(e => `${e.title}(${format(new Date(e.starts_at), "EEE")})`).join("|") || "none"}`,
    `reminders:${data.reminders.slice(0, 4).map(r => r.title).join("|") || "none"}`,
  ];
  return { system: WEEKLY_SUMMARY_SYSTEM, user: lines.join("\n") };
}
