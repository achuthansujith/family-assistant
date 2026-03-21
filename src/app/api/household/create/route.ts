import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  const householdName = (name as string)?.trim() || "Our Home";

  // Use service client to bypass RLS for the atomic creation sequence
  const service = createServiceClient();

  const { data: household, error: hErr } = await service
    .from("households")
    .insert({ name: householdName, created_by: user.id })
    .select()
    .single();

  if (hErr) return NextResponse.json({ error: hErr.message }, { status: 500 });

  const { error: mErr } = await service.from("household_members").insert({
    household_id: household.id,
    user_id: user.id,
    role: "owner",
  });
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  const { error: sErr } = await service.from("household_settings").insert({
    household_id: household.id,
  });
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  return NextResponse.json({ household });
}
