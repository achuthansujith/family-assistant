// ============================================================
// AI Provider Adapter
// Swap provider by replacing this file or setting AI_PROVIDER env var.
// The app works fully with AI_ENABLED=false - no OpenAI key required.
// ============================================================

import OpenAI from "openai";
import { createServiceClient } from "@/lib/supabase/server";

// Read once at module load - these are server-only env vars
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
// Hard cap: summary 300 tokens, quick-add 120 tokens. Keeps cost minimal.
const DEFAULT_MAX_TOKENS = parseInt(process.env.OPENAI_MAX_TOKENS ?? "300");
// Treat missing key OR explicit false as disabled
const AI_ENABLED =
  process.env.AI_ENABLED !== "false" && !!process.env.OPENAI_API_KEY;
// Default 3/day - conservative. Operator can raise via env.
const MAX_CALLS_PER_DAY = parseInt(process.env.AI_MAX_CALLS_PER_DAY ?? "3");

let openaiClient: OpenAI | null = null;

function getClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

export type AiCallOptions = {
  feature: "daily_summary" | "weekly_summary" | "quick_add" | "parse_item";
  household_id: string;
  user_id: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
};

export type AiCallResult = {
  text: string;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
};

// Single DB query - counts only successful calls today for this household
async function checkRateLimit(
  household_id: string
): Promise<{ allowed: boolean; remaining: number }> {
  const supabase = createServiceClient();
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("ai_usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("household_id", household_id)
    .eq("success", true)
    .gte("created_at", todayMidnight.toISOString());

  const used = count ?? 0;
  return { allowed: used < MAX_CALLS_PER_DAY, remaining: MAX_CALLS_PER_DAY - used };
}

async function logUsage(
  opts: AiCallOptions,
  usage: AiCallResult["usage"] | null,
  success: boolean,
  error?: string
) {
  // Fire-and-forget - don't block the response on logging
  const supabase = createServiceClient();
  supabase.from("ai_usage_logs").insert({
    household_id: opts.household_id,
    user_id: opts.user_id,
    feature: opts.feature,
    prompt_tokens: usage?.prompt_tokens ?? null,
    completion_tokens: usage?.completion_tokens ?? null,
    total_tokens: usage?.total_tokens ?? null,
    model: MODEL,
    success,
    error_message: error ?? null,
  });
}

export async function callAi(opts: AiCallOptions): Promise<AiCallResult> {
  if (!AI_ENABLED) throw new Error("AI is disabled");

  const { allowed, remaining } = await checkRateLimit(opts.household_id);
  if (!allowed) {
    throw new Error(
      `Daily AI limit (${MAX_CALLS_PER_DAY}) reached. Resets at midnight.`
    );
  }

  try {
    const client = getClient();
    const response = await client.chat.completions.create({
      model: MODEL,
      // Use caller's override, else default cap. Never exceed DEFAULT_MAX_TOKENS.
      max_tokens: Math.min(opts.maxTokens ?? DEFAULT_MAX_TOKENS, DEFAULT_MAX_TOKENS),
      messages: [
        { role: "system", content: opts.systemPrompt },
        { role: "user", content: opts.userPrompt },
      ],
      temperature: 0.2, // lower = more deterministic, slightly cheaper
    });

    const text = response.choices[0]?.message?.content ?? "";
    const usage = {
      prompt_tokens: response.usage?.prompt_tokens ?? 0,
      completion_tokens: response.usage?.completion_tokens ?? 0,
      total_tokens: response.usage?.total_tokens ?? 0,
    };

    await logUsage(opts, usage, true);
    return { text, usage };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown AI error";
    await logUsage(opts, null, false, msg);
    throw err;
  }
}

/** Safe to call anywhere - returns false if key missing or AI_ENABLED=false */
export function isAiEnabled(): boolean {
  return AI_ENABLED;
}

/** Remaining calls today for a household. Returns 0 if AI disabled. */
export async function getRemainingCalls(household_id: string): Promise<number> {
  if (!AI_ENABLED) return 0;
  const { remaining } = await checkRateLimit(household_id);
  return remaining;
}
