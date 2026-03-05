import { NextResponse } from "next/server";
import { createRouteClient } from "@/utils/supabase/route";
import { createAdminClient } from "@/lib/supabase-admin";

const STAFF_ROLES = ["admin_carpi", "gestor_financiero", "encargado_ventas"];
const ADMIN_EMAIL = "admin@carpi.com";
const ORDER_STATUSES = ["pendiente_fabricante", "aprobado", "facturado", "pagado", "rechazado", "cancelado"] as const;

type OrderStatus = (typeof ORDER_STATUSES)[number];

async function requireStaff() {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const isAdminEmail = user.email?.toLowerCase() === ADMIN_EMAIL;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();

  const role = (profile?.role as string | undefined) ?? (isAdminEmail ? "admin_carpi" : undefined);

  if (!role || !STAFF_ROLES.includes(role)) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true as const, userId: user.id };
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const body = (await request.json()) as { status?: string; note?: string };

  if (!body.status || !ORDER_STATUSES.includes(body.status as OrderStatus)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  const admin = createAdminClient();
  const updates: Record<string, unknown> = {
    status: body.status,
  };

  if (body.status === "aprobado" || body.status === "rechazado") {
    updates.approved_by = auth.userId;
    updates.approved_at = new Date().toISOString();
  }

  if (typeof body.note === "string") {
    updates.notes = body.note;
  }

  const { error } = await admin.from("orders").update(updates).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
