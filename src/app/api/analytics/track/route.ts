import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

function detectDevice(ua: string): string {
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android.*mobile|windows phone/i.test(ua))
    return "mobile";
  return "desktop";
}

export async function POST(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Supabase env vars missing" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const {
      event_type,
      path,
      product_id,
      session_id,
      referrer,
      search_term,
      metadata,
    } = body;

    if (!event_type || !session_id) {
      return NextResponse.json(
        { error: "event_type and session_id required" },
        { status: 400 }
      );
    }

    const validEvents = [
      "page_view",
      "product_view",
      "add_to_cart",
      "search",
      "checkout",
    ];
    if (!validEvents.includes(event_type)) {
      return NextResponse.json(
        { error: "Invalid event_type" },
        { status: 400 }
      );
    }

    const ua = request.headers.get("user-agent") ?? "";
    const device_type = detectDevice(ua);

    // Try to get user_id from auth (optional)
    let user_id: string | null = null;
    try {
      const authHeader = request.headers.get("authorization");
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const {
          data: { user },
        } = await supabaseAdmin.auth.getUser(token);
        user_id = user?.id ?? null;
      }
    } catch {
      // ignore auth errors for tracking
    }

    const { error } = await supabaseAdmin.from("analytics_events").insert({
      event_type,
      path: path || null,
      product_id: product_id || null,
      session_id,
      user_id,
      referrer: referrer || null,
      user_agent: ua,
      device_type,
      search_term: search_term || null,
      metadata: metadata || {},
    });

    if (error) {
      console.error("Analytics insert error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Analytics API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
