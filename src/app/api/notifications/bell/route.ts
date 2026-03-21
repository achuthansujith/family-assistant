import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/notifications/bell — returns recent notification delivery logs for the current user
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("notification_delivery_log")
    .select("id, type, summary_text, ai_powered, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Unread = delivered in last 24h and not yet dismissed (simple: just count last 24h)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const unread = (data ?? []).filter(n => n.created_at >= oneDayAgo).length;

  return NextResponse.json({ notifications: data ?? [], unread });
}
