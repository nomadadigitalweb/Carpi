import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

/**
 * GET /api/analytics/aggregate
 * Refreshes the analytics_daily table for today (and optionally yesterday).
 * Called by Vercel cron or manually.
 */
export async function GET(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Supabase env vars missing" },
      { status: 500 }
    );
  }

  // Verify cron secret
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Refresh today and yesterday (in case yesterday's last events weren't captured)
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split("T")[0];

    await supabaseAdmin.rpc("refresh_analytics_daily", {
      target_date: yesterday,
    });
    await supabaseAdmin.rpc("refresh_analytics_daily", {
      target_date: today,
    });

    return NextResponse.json({ ok: true, refreshed: [yesterday, today] });
  } catch (err) {
    console.error("Aggregation error:", err);
    return NextResponse.json(
      { error: "Aggregation failed" },
      { status: 500 }
    );
  }
}
