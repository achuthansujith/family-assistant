export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callAi, isAiEnabled } from "@/lib/adapters/ai";
import { buildMorningSummaryPrompt, buildEveningSummaryPrompt } from "@/lib/prompts";
import { format, addDays, startOfDay, endOfDay } from "date-fns";

// POST /api/notifications/summary?type=morning|evening
export async function POST(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") ?? "morning";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: member } = await supabase
    .from("household_members").select("household_id").eq("user_id", user.id).single();
  if (!member) return NextResponse.json({ error: "No household" }, { status: 404 });
  const hid = member.household_id;

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const tomorrow = addDays(today, 1);
  const tomorrowStr = format(tomorrow, "yyyy-MM-dd");

  let summaryText = "";
  let aiPowered = false;

  if (type === "morning") {
    const [overdue, todayChores, todayEvents, reminders, groceries, meals] = await Promise.all([
      supabase.from("chores").select("title").eq("household_id", hid).eq("status", "pending").lt("due_date", todayStr).limit(5),
      supabase.from("chores").select("title").eq("household_id", hid).eq("status", "pending").eq("due_date", todayStr).limit(5),
      supabase.from("events").select("title,starts_at").eq("household_id", hid)
        .gte("starts_at", startOfDay(today).toISOString()).lte("starts_at", endOfDay(today).toISOString()).limit(4),
      supabase.from("reminders").select("title").eq("household_id", hid).eq("status", "pending").lte("due_at", endOfDay(today).toISOString()).limit(4),
      supabase.from("grocery_items").select("name").eq("household_id", hid).eq("purchased", false).eq("need_soon", true).limit(5),
      supabase.from("meal_plans").select("meal_name,slot").eq("household_id", hid).eq("plan_date", todayStr).order("slot"),
    ]);

    const data = {
      date: format(today, "EEEE, MMMM d"),
      overdueChores: overdue.data ?? [],
      dueTodayChores: todayChores.data ?? [],
      todaysEvents: todayEvents.data ?? [],
      pendingReminders: reminders.data ?? [],
      needSoonGroceries: groceries.data ?? [],
      todayMeals: meals.data ?? [],
    };

    summaryText = buildDeterministicMorning(data);

    const { data: prefs } = await supabase.from("user_notification_prefs").select("ai_summaries").eq("user_id", user.id).single();
    if (prefs?.ai_summaries && isAiEnabled()) {
      try {
        const { system, user: userPrompt } = buildMorningSummaryPrompt(data);
        const result = await callAi({ feature: "daily_summary", household_id: hid, user_id: user.id, systemPrompt: system, userPrompt, maxTokens: 200 });
        summaryText = result.text;
        aiPowered = true;
      } catch {}
    }
  } else {
    const [completedToday, stillPending, overdue, tomorrowChores, tomorrowEvents, tomorrowMeals] = await Promise.all([
      supabase.from("chore_completions").select("chores(title)")
        .gte("completed_at", startOfDay(today).toISOString()).lte("completed_at", endOfDay(today).toISOString()).limit(8),
      supabase.from("chores").select("title").eq("household_id", hid).eq("status", "pending").eq("due_date", todayStr).limit(5),
      supabase.from("chores").select("title").eq("household_id", hid).eq("status", "pending").lt("due_date", todayStr).limit(3),
      supabase.from("chores").select("title").eq("household_id", hid).eq("status", "pending").eq("due_date", tomorrowStr).limit(5),
      supabase.from("events").select("title,starts_at").eq("household_id", hid)
        .gte("starts_at", startOfDay(tomorrow).toISOString()).lte("starts_at", endOfDay(tomorrow).toISOString()).limit(4),
      supabase.from("meal_plans").select("meal_name,slot").eq("household_id", hid).eq("plan_date", tomorrowStr).order("slot"),
    ]);

    const data = {
      completedToday: (completedToday.data ?? []).map((c: any) => ({ title: c.chores?.title ?? "" })).filter((c: any) => c.title),
      stillPending: stillPending.data ?? [],
      overdueCarryover: overdue.data ?? [],
      tomorrowChores: tomorrowChores.data ?? [],
      tomorrowEvents: tomorrowEvents.data ?? [],
      tomorrowMeals: tomorrowMeals.data ?? [],
      tomorrow: format(tomorrow, "EEEE, MMMM d"),
    };

    summaryText = buildDeterministicEvening(data);

    const { data: prefs } = await supabase.from("user_notification_prefs").select("ai_summaries").eq("user_id", user.id).single();
    if (prefs?.ai_summaries && isAiEnabled()) {
      try {
        const { system, user: userPrompt } = buildEveningSummaryPrompt(data);
        const result = await callAi({ feature: "daily_summary", household_id: hid, user_id: user.id, systemPrompt: system, userPrompt, maxTokens: 200 });
        summaryText = result.text;
        aiPowered = true;
      } catch {}
    }
  }

  // Log delivery
  await supabase.from("notification_delivery_log").insert({
    user_id: user.id, type, ai_powered: aiPowered, summary_text: summaryText,
  });

  // Send push notification to this user's devices
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  try {
    await fetch(`${appUrl}/api/push/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: req.headers.get("cookie") ?? "" },
      body: JSON.stringify({
        title: type === "morning" ? "Good morning " : "Evening wrap-up ",
        body: summaryText.slice(0, 120),
        url: "/dashboard",
      }),
    });
  } catch {}

  return NextResponse.json({ summary: summaryText, ai_powered: aiPowered });
}

function buildDeterministicMorning(data: any): string {
  const parts: string[] = [`Good morning! ${data.date}.`];
  if (data.overdueChores.length) parts.push(`${data.overdueChores.length} overdue: ${data.overdueChores.map((c: any) => c.title).join(", ")}.`);
  if (data.dueTodayChores.length) parts.push(`Today: ${data.dueTodayChores.map((c: any) => c.title).join(", ")}.`);
  if (data.todaysEvents.length) parts.push(`Events: ${data.todaysEvents.map((e: any) => e.title).join(", ")}.`);
  if (data.pendingReminders.length) parts.push(`${data.pendingReminders.length} reminder(s) due.`);
  if (data.todayMeals.length) parts.push(`Meals: ${data.todayMeals.map((m: any) => `${m.slot}: ${m.meal_name}`).join(", ")}.`);
  if (data.needSoonGroceries.length) parts.push(`Need soon: ${data.needSoonGroceries.map((g: any) => g.name).join(", ")}.`);
  if (parts.length === 1) parts.push("Nothing urgent today. Enjoy your day!");
  return parts.join(" ");
}

function buildDeterministicEvening(data: any): string {
  const parts: string[] = ["Good evening!"];
  if (data.completedToday.length) parts.push(`Done: ${data.completedToday.map((c: any) => c.title).join(", ")}.`);
  if (data.stillPending.length) parts.push(`Still pending: ${data.stillPending.map((c: any) => c.title).join(", ")}.`);
  if (data.overdueCarryover.length) parts.push(`${data.overdueCarryover.length} overdue carrying over.`);
  if (data.tomorrowChores.length || data.tomorrowEvents.length || data.tomorrowMeals.length) {
    parts.push(`Tomorrow (${data.tomorrow}):`);
    if (data.tomorrowChores.length) parts.push(data.tomorrowChores.map((c: any) => c.title).join(", ") + ".");
    if (data.tomorrowEvents.length) parts.push(data.tomorrowEvents.map((e: any) => e.title).join(", ") + ".");
    if (data.tomorrowMeals.length) parts.push(data.tomorrowMeals.map((m: any) => `${m.slot}: ${m.meal_name}`).join(", ") + ".");
  }
  if (parts.length === 1) parts.push("All clear. Rest well!");
  return parts.join(" ");
}
