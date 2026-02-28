import { NextResponse } from "next/server";
import { createRouteClient } from "@/utils/supabase/route";
import { runPriceSync } from "@/lib/xubio-sync";

const allowedRoles = ["admin_carpi", "gestor_financiero", "encargado_ventas"];
const cronSecret = process.env.CRON_SECRET;

async function handler(request: Request) {
  const requestSecret = request.headers.get("x-cron-secret") ?? request.headers.get("authorization")?.replace("Bearer ", "");
  if (cronSecret && requestSecret === cronSecret) {
    const result = await runPriceSync();
    return NextResponse.json(result, { status: result.status === "success" ? 200 : 500 });
  }

  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (!profile?.role || !allowedRoles.includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await runPriceSync();
  return NextResponse.json(result, { status: result.status === "success" ? 200 : 500 });
}

export async function GET(request: Request) {
  return handler(request);
}

export async function POST(request: Request) {
  return handler(request);
}
