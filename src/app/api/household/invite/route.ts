export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { JoinHouseholdSchema } from "@/lib/validators/schemas";

// POST /api/household/invite - join a household via invite code
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = JoinHouseholdSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid invite code format" }, { status: 400 });
  }

  const { invite_code } = parsed.data;

  // Use service client to look up household — the joining user is not yet a member
  // so RLS would block a normal select on households
  const service = createServiceClient();

  const { data: household, error: lookupError } = await service
    .from("households")
    .select("id, name")
    .eq("invite_code", invite_code.trim().toLowerCase())
    .single();

  if (lookupError || !household) {
    // Try without lowercasing in case code is mixed-case
    const { data: household2 } = await service
      .from("households")
      .select("id, name")
      .eq("invite_code", invite_code.trim())
      .single();

    if (!household2) {
      return NextResponse.json({ error: "Invalid invite code. Check the code and try again." }, { status: 404 });
    }

    // Already a member?
    const { data: existing } = await service
      .from("household_members")
      .select("id")
      .eq("household_id", household2.id)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      return NextResponse.json({ household: household2, already_member: true });
    }

    const { error: joinError } = await service.from("household_members").insert({
      household_id: household2.id,
      user_id: user.id,
      role: "member",
    });

    if (joinError) {
      return NextResponse.json({ error: joinError.message }, { status: 500 });
    }

    return NextResponse.json({ household: household2, joined: true });
  }

  // Already a member?
  const { data: existing } = await service
    .from("household_members")
    .select("id")
    .eq("household_id", household.id)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    return NextResponse.json({ household, already_member: true });
  }

  // Join — use service client so RLS insert policy doesn't block
  const { error: joinError } = await service.from("household_members").insert({
    household_id: household.id,
    user_id: user.id,
    role: "member",
  });

  if (joinError) {
    return NextResponse.json({ error: joinError.message }, { status: 500 });
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
