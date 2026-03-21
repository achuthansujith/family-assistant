import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { JoinHouseholdSchema } from "@/lib/validators/schemas";

// POST /api/household/invite - join a household via invite code
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = JoinHouseholdSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { invite_code } = parsed.data;

  // Find household by invite code
  const { data: household } = await supabase
    .from("households")
    .select("id, name")
    .eq("invite_code", invite_code)
    .single();

  if (!household) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from("household_members")
    .select("id")
    .eq("household_id", household.id)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    return NextResponse.json({ household, already_member: true });
  }

  // Join household
  const { error } = await supabase.from("household_members").insert({
    household_id: household.id,
    user_id: user.id,
    role: "member",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ household, joined: true });
}

// GET /api/household/invite - get current household invite code
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: member } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .single();

  if (!member) return NextResponse.json({ error: "No household" }, { status: 404 });

  const { data: household } = await supabase
    .from("households")
    .select("invite_code, name")
    .eq("id", member.household_id)
    .single();

  return NextResponse.json(household);
}
