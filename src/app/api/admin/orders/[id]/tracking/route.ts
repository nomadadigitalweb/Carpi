import { NextResponse } from "next/server";
import { createRouteClient } from "@/utils/supabase/route";
import { createAdminClient } from "@/lib/supabase-admin";

const STAFF_ROLES = ["admin_carpi", "gestor_financiero", "encargado_ventas"];
const ADMIN_EMAIL = "admin@carpi.com";
const SHIPPING_STATUSES = ["preparando", "despachado", "entregado"] as const;

type ShippingStatus = (typeof SHIPPING_STATUSES)[number];

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
  const body = (await request.json()) as { tracking_number?: string; status_envio?: string };

  if (!id) {
    return NextResponse.json({ error: "Order id is required" }, { status: 400 });
  }

  if (body.status_envio && !SHIPPING_STATUSES.includes(body.status_envio as ShippingStatus)) {
    return NextResponse.json({ error: "Estado de envío inválido" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.tracking_number === "string") {
    updates.tracking_number = body.tracking_number;
  }

  if (body.status_envio) {
    updates.status_envio = body.status_envio;
  } else if (typeof body.tracking_number === "string" && body.tracking_number.trim().length > 0) {
    updates.status_envio = "despachado";
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("orders")
    .update(updates)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
