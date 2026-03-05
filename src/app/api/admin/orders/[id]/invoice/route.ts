import { NextResponse } from "next/server";
import { createRouteClient } from "@/utils/supabase/route";
import { createAdminClient } from "@/lib/supabase-admin";
import { createXubioInvoice } from "@/lib/xubio";
import { sendInvoiceEmail } from "@/lib/email";

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
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();

  const role = (profile?.role as string | undefined) ?? (isAdminEmail ? "admin_carpi" : undefined);

  if (!role || !STAFF_ROLES.includes(role)) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true as const, userId: user.id };
}

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const admin = createAdminClient();

  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id,user_id,fabricante_id,total,status")
    .eq("id", id)
    .maybeSingle();

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 });
  }

  if (!order) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  const { data: items, error: itemsError } = await admin
    .from("order_items")
    .select("product_name,quantity,unit_price")
    .eq("order_id", order.id);

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  if (!items || items.length === 0) {
    return NextResponse.json({ error: "El pedido no tiene items" }, { status: 400 });
  }

  const { data: buyer } = await admin
    .from("profiles")
    .select("full_name,email,cuit")
    .eq("id", order.user_id)
    .maybeSingle();

  const { data: fabricante } = await admin
    .from("profiles")
    .select("full_name,email")
    .eq("id", order.fabricante_id)
    .maybeSingle();

  try {
    const invoice = await createXubioInvoice({
      orderId: order.id,
      customer: {
        name: buyer?.full_name ?? fabricante?.full_name ?? "Cliente",
        email: buyer?.email ?? fabricante?.email ?? "",
        cuit: buyer?.cuit ?? undefined,
      },
      items: items.map((item) => ({
        description: item.product_name,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
      })),
    });

    const { error: updateError } = await admin
      .from("orders")
      .update({
        status: "facturado",
        approved_by: auth.userId,
        approved_at: new Date().toISOString(),
        xubio_invoice_id: invoice.id,
        xubio_cae: invoice.cae,
        xubio_invoice_pdf_url: invoice.pdf_url,
      })
      .eq("id", order.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (fabricante?.email) {
      await sendInvoiceEmail({
        to: fabricante.email,
        customerName: fabricante.full_name ?? "Fabricante",
        orderId: order.id,
        total: Number(order.total ?? 0),
        cae: invoice.cae,
        pdfUrl: invoice.pdf_url,
      });
    }

    return NextResponse.json({ ok: true, invoice });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "Error al emitir factura";
    const message = /\(401\)/.test(rawMessage)
      ? "Xubio rechazó la factura (401). Revisá credenciales/permisos (client_id, secret, tenant) y configuración fiscal de facturación en Xubio."
      : rawMessage;

    await admin
      .from("orders")
      .update({ notes: `Error emitiendo factura: ${rawMessage}` })
      .eq("id", order.id);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
