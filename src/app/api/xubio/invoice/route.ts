import { NextResponse } from "next/server";
import { createRouteClient } from "@/utils/supabase/route";
import { createXubioInvoice } from "@/lib/xubio";
import { sendInvoiceEmail } from "@/lib/email";

const allowedRoles = ["admin_carpi", "gestor_financiero", "encargado_ventas", "fabricante"];
const adminEmail = "admin@carpi.com";

export async function POST(request: Request) {
  const supabase = await createRouteClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const isAdminEmail = user.email?.toLowerCase() === adminEmail;
  const role = (profile?.role as string | undefined) ?? (isAdminEmail ? "admin_carpi" : undefined);

  if (!role || !allowedRoles.includes(role)) {
    return NextResponse.json({ error: "Forbidden: sin permisos para facturar en Xubio" }, { status: 403 });
  }

  const body = (await request.json()) as { orderId?: string };
  const orderId = body.orderId;

  if (!orderId) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id,user_id,fabricante_id,total,status")
    .eq("id", orderId)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (role === "fabricante" && order.fabricante_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: items } = await supabase
    .from("order_items")
    .select("product_name,quantity,unit_price")
    .eq("order_id", order.id);

  const { data: buyer } = await supabase
    .from("profiles")
    .select("full_name,email,cuit")
    .eq("id", order.user_id)
    .single();

  const invoice = await createXubioInvoice({
    orderId: order.id,
    customer: {
      name: buyer?.full_name ?? "Cliente",
      email: buyer?.email ?? "",
      cuit: buyer?.cuit ?? undefined,
    },
    items: (items ?? []).map((item) => ({
      description: item.product_name,
      quantity: item.quantity,
      unitPrice: Number(item.unit_price),
    })),
  });

  await supabase
    .from("orders")
    .update({
      status: "facturado",
      xubio_invoice_id: invoice.id,
      xubio_cae: invoice.cae,
      xubio_invoice_pdf_url: invoice.pdf_url,
    })
    .eq("id", order.id);

  if (buyer?.email) {
    await sendInvoiceEmail({
      to: buyer.email,
      customerName: buyer.full_name ?? "Cliente",
      orderId: order.id,
      total: Number(order.total ?? 0),
      cae: invoice.cae,
      pdfUrl: invoice.pdf_url,
    });
  }

  return NextResponse.json({
    ok: true,
    invoice,
  });
}
