export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deterministicParse } from "@/lib/parsers/quick-add";
import { callAi, isAiEnabled } from "@/lib/adapters/ai";
import { buildQuickAddPrompt } from "@/lib/prompts";
import { AiQuickAddResponseSchema } from "@/lib/validators/schemas";
import { z } from "zod";

const BodySchema = z.object({ text: z.string().min(1).max(500) });

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { text } = parsed.data;

  // Derive household from session - never trust client-supplied household_id
  const { data: member } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .single();

  if (!member) return NextResponse.json({ error: "No household" }, { status: 403 });
  const household_id = member.household_id;

  // Step 1: Always try deterministic parse first - no AI cost
  const { result, needsAi } = deterministicParse(text);

  // Return immediately if deterministic parse succeeded or AI is off
  if (!needsAi || !isAiEnabled()) {
    return NextResponse.json({ result, source: "deterministic" });
  }

  // Step 2: AI fallback only for genuinely ambiguous input
  try {
    const { system, user: userPrompt } = buildQuickAddPrompt(text);
    const aiResult = await callAi({
      feature: "quick_add",
      household_id,
      user_id: user.id,
      systemPrompt: system,
      userPrompt,
      maxTokens: 120, // JSON response is small - hard cap at 120
    });

    // Strip markdown code fences if model wraps JSON in them
    const raw = aiResult.text.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "").trim();
    const json = JSON.parse(raw);
    const validated = AiQuickAddResponseSchema.safeParse(json);

    if (!validated.success) {
      // AI returned invalid schema - fall back silently
      return NextResponse.json({ result, source: "deterministic_fallback" });
    }

    return NextResponse.json({ result: validated.data, source: "ai" });
  } catch {
    // AI failed or rate-limited - always fall back gracefully
    return NextResponse.json({ result, source: "deterministic_fallback" });
  }
}

