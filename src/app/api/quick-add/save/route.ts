import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const BodySchema = z.object({
  result: z.object({
    type: z.enum(["chore", "reminder", "grocery", "event", "unknown"]),
    confidence: z.number(),
    data: z.any(),
  }),
});

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: member } = await supabase
    .from("household_members").select("household_id").eq("user_id", user.id).single();
  if (!member) return NextResponse.json({ error: "No household" }, { status: 403 });
  const hid = member.household_id;

  const body = await req.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { result } = parsed.data;

  try {
    switch (result.type) {
      case "chore": {
        const { error } = await supabase.from("chores").insert({
          household_id: hid,
          created_by: user.id,
          title: result.data.title ?? "Untitled chore",
          due_date: result.data.due_date ?? null,
          recurrence_rule: result.data.recurrence_rule ?? null,
          priority: result.data.priority ?? "medium",
          status: "pending",
        });
        if (error) throw error;
        break;
      }
      case "reminder": {
        const due_at = result.data.due_at ?? new Date(Date.now() + 3600000).toISOString();
        const { error } = await supabase.from("reminders").insert({
          household_id: hid,
          created_by: user.id,
          title: result.data.title ?? "Untitled reminder",
          due_at,
          status: "pending",
        });
        if (error) throw error;
        break;
      }
      case "grocery": {
        const items = Array.isArray(result.data) ? result.data : [result.data];
        const rows = items.map((item: any) => ({
          household_id: hid,
          added_by: user.id,
          name: item.name ?? "Unknown item",
          quantity: item.quantity ?? null,
          category: item.category ?? "other",
          purchased: false,
        }));
        const { error } = await supabase.from("grocery_items").insert(rows);
        if (error) throw error;
        break;
      }
      case "event": {
        const starts_at = result.data.starts_at ?? new Date().toISOString();
        const { error } = await supabase.from("events").insert({
          household_id: hid,
          created_by: user.id,
          title: result.data.title ?? "Untitled event",
          starts_at,
          category: result.data.category ?? "other",
          attendee_ids: [user.id],
        });
        if (error) throw error;
        break;
      }
      default:
        return NextResponse.json({ error: "Cannot save unknown type" }, { status: 400 });
    }

    return NextResponse.json({ saved: true, type: result.type });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Save failed" }, { status: 500 });
  }
}
