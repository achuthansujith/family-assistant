export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/health
 *
 * Lightweight health check that also keeps the Supabase free-tier project
 * from pausing due to inactivity (free tier pauses after 7 days).
 *
 * Point a free cron service (e.g. cron-job.org) at this endpoint once daily.
 * No auth required - returns a simple JSON response.
 */
export async function GET() {
  try {
    // Minimal DB ping - just checks connectivity
    const supabase = createServiceClient();
    await supabase.from("households").select("id").limit(1);
    return NextResponse.json({ status: "ok", ts: new Date().toISOString() });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}

