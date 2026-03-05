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

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const body = (await request.json()) as { tracking_number?: string };

  if (!id) {
    return NextResponse.json({ error: "Order id is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("orders")
    .update({
      tracking_number: body.tracking_number ?? "",
      status_envio: "despachado",
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
