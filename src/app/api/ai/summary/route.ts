import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callAi, isAiEnabled } from "@/lib/adapters/ai";
import { buildDailySummaryPrompt } from "@/lib/prompts";
import { format, startOfDay, endOfDay } from "date-fns";

export async function POST(_req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Always derive household from session - never from request body
  const { data: member } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .single();

  if (!member) return NextResponse.json({ error: "No household" }, { status: 404 });
  const household_id = member.household_id;

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  // Fetch only the columns the prompt actually uses - minimises data transfer
  const [overdueRes, dueTodayRes, eventsRes, remindersRes, groceriesRes] =
    await Promise.all([
      supabase.from("chores").select("title")
        .eq("household_id", household_id).eq("status", "pending")
        .lt("due_date", todayStr).limit(5),
      supabase.from("chores").select("title")
        .eq("household_id", household_id).eq("status", "pending")
        .eq("due_date", todayStr).limit(5),
      supabase.from("events").select("title,starts_at")
        .eq("household_id", household_id)
        .gte("starts_at", startOfDay(today).toISOString())
        .lte("starts_at", endOfDay(today).toISOString()).limit(5),
      supabase.from("reminders").select("title")
        .eq("household_id", household_id).eq("status", "pending")
        .lte("due_at", endOfDay(today).toISOString()).limit(5),
      supabase.from("grocery_items").select("name")
        .eq("household_id", household_id).eq("purchased", false).limit(8),
    ]);

  const summaryData = {
    date: format(today, "EEEE, MMMM d"),
    overdueChores: overdueRes.data ?? [],
    dueTodayChores: dueTodayRes.data ?? [],
    todaysEvents: eventsRes.data ?? [],
    pendingReminders: remindersRes.data ?? [],
    unpurchasedGroceries: groceriesRes.data ?? [],
  };

  // Always build deterministic summary - used as fallback and when AI is off
  const deterministicSummary = buildDeterministicSummary(summaryData);

  if (!isAiEnabled()) {
    return NextResponse.json({ summary: deterministicSummary, ai_powered: false, data: summaryData });
  }

  try {
    const { system, user: userPrompt } = buildDailySummaryPrompt(summaryData);
    const aiResult = await callAi({
      feature: "daily_summary",
      household_id,
      user_id: user.id,
      systemPrompt: system,
      userPrompt,
      maxTokens: 300,
    });
    return NextResponse.json({
      summary: aiResult.text,
      ai_powered: true,
      tokens_used: aiResult.usage.total_tokens,
      data: summaryData,
    });
  } catch (err) {
    // Rate limit hit or API error - return deterministic summary, never fail the user
    const msg = err instanceof Error ? err.message : "AI unavailable";
    return NextResponse.json({ summary: deterministicSummary, ai_powered: false, ai_error: msg, data: summaryData });
  }
}

function buildDeterministicSummary(data: {
  date: string;
  overdueChores: { title: string }[];
  dueTodayChores: { title: string }[];
  todaysEvents: { title: string }[];
  pendingReminders: { title: string }[];
  unpurchasedGroceries: { name: string }[];
}): string {
  const parts: string[] = [`${data.date}.`];
  if (data.overdueChores.length > 0)
    parts.push(`Overdue: ${data.overdueChores.map(c => c.title).join(", ")}.`);
  if (data.dueTodayChores.length > 0)
    parts.push(`Due today: ${data.dueTodayChores.map(c => c.title).join(", ")}.`);
  if (data.todaysEvents.length > 0)
    parts.push(`Events: ${data.todaysEvents.map(e => e.title).join(", ")}.`);
  if (data.pendingReminders.length > 0)
    parts.push(`${data.pendingReminders.length} reminder(s) due.`);
  if (data.unpurchasedGroceries.length > 0)
    parts.push(`Shopping: ${data.unpurchasedGroceries.length} item(s) pending.`);
  if (parts.length === 1) parts.push("Nothing urgent today.");
  return parts.join(" ");
}
