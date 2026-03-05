import { NextResponse } from "next/server";
import { createRouteClient } from "@/utils/supabase/route";
import { createAdminClient } from "@/lib/supabase-admin";

const STAFF_ROLES = ["admin_carpi", "gestor_financiero", "encargado_ventas"];
const ADMIN_EMAIL = "admin@carpi.com";

async function requireStaff() {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const isAdminEmail = user.email?.toLowerCase() === ADMIN_EMAIL;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile?.role as string | undefined) ?? (isAdminEmail ? "admin_carpi" : undefined);

  if (!role || !STAFF_ROLES.includes(role)) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true as const };
}

export async function GET() {
  const auth = await requireStaff();
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ orders: data ?? [] });
}
