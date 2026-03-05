"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createXubioInvoice } from "@/lib/xubio";
import { sendInvoiceEmail } from "@/lib/email";
import { CartLine, OrderStatus, ResolvedOrderLine } from "@/types/orders";

type ProfileRow = {
  id: string;
  role: string;
  parent_id: string | null;
  lista_precio_id: number | null;
  full_name: string | null;
  email: string | null;
  cuit: string | null;
};

export async function createOrderFromCart(lines: CartLine[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Debes iniciar sesión para crear pedidos.");
  }

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("id, role, parent_id, lista_precio_id")
    .eq("id", user.id)
    .single<Pick<ProfileRow, "id" | "role" | "parent_id" | "lista_precio_id">>();

  if (!myProfile || !["usuario", "fabricante"].includes(myProfile.role)) {
    throw new Error("Solo usuarios o fabricantes pueden crear pedidos.");
  }

  const isFabricante = myProfile.role === "fabricante";

  // For "usuario": must have a parent fabricante
  // For "fabricante": they ARE the fabricante (orders go to Carpi directly)
  if (!isFabricante && !myProfile.parent_id) {
    throw new Error("Tu cuenta no tiene fabricante asignado.");
  }

  let fabricanteId: string;
  let listaPrecioId: number | null;

  if (isFabricante) {
    // Fabricante ordering directly — they are their own fabricante
    fabricanteId = myProfile.id;
    listaPrecioId = myProfile.lista_precio_id ?? null;
  } else {
    // Usuario ordering — look up parent fabricante
    const { data: fabricante } = await supabase
      .from("profiles")
      .select("id, lista_precio_id")
      .eq("id", myProfile.parent_id!)
      .single<Pick<ProfileRow, "id" | "lista_precio_id">>();

    if (!fabricante?.lista_precio_id) {
      throw new Error("El fabricante no tiene lista de precios configurada.");
    }
    fabricanteId = fabricante.id;
    listaPrecioId = fabricante.lista_precio_id;
  }

  if (!listaPrecioId) {
    throw new Error("No hay lista de precios configurada.");
  }

  const productIds = Array.from(new Set(lines.map((line) => line.productId)));
  const { data: products } = await supabase
    .from("products")
    .select("id,name,sku")
    .in("id", productIds);

  const { data: prices } = await supabase
    .from("product_prices")
    .select("product_id,price")
    .eq("lista_precio_id", listaPrecioId)
    .in("product_id", productIds);

  const productById = new Map((products ?? []).map((product) => [product.id, product]));
  const priceByProductId = new Map((prices ?? []).map((price) => [price.product_id, Number(price.price)]));

  const resolvedLines: ResolvedOrderLine[] = lines.map((line) => {
    const product = productById.get(line.productId);
    const unitPrice = priceByProductId.get(line.productId);

    if (!product || unitPrice === undefined) {
      throw new Error("No se pudieron resolver todos los productos del carrito.");
    }

    return {
      productId: product.id,
      productName: product.name,
      sku: (product as { sku?: string | null }).sku ?? null,
      unitPrice,
      quantity: line.quantity,
    };
  });

  const total = resolvedLines.reduce((acc, line) => acc + line.unitPrice * line.quantity, 0);

  // Fabricante orders are auto-approved (sent directly to Carpi)
  const orderStatus: OrderStatus = isFabricante ? "aprobado" : "pendiente_fabricante";

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      fabricante_id: fabricanteId,
      total,
      status: orderStatus,
      ...(isFabricante
        ? { approved_by: user.id, approved_at: new Date().toISOString() }
        : {}),
    })
    .select("id")
    .single();

  if (orderError || !order) {
    throw new Error(orderError?.message ?? "No se pudo crear el pedido.");
  }

  const { error: itemsError } = await supabase.from("order_items").insert(
    resolvedLines.map((line) => ({
      order_id: order.id,
      product_id: line.productId,
      product_name: line.productName,
      sku: line.sku,
      quantity: line.quantity,
      unit_price: line.unitPrice,
    }))
  );

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  revalidatePath("/mi-cuenta");
  revalidatePath("/dashboard/pedidos");

  return order.id;
}

export async function approveOrder(orderId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Sesión inválida.");
  }

  const { data: approverProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single<Pick<ProfileRow, "id" | "role">>();

  const isStaff = approverProfile?.role
    ? ["admin_carpi", "gestor_financiero", "encargado_ventas"].includes(approverProfile.role)
    : false;

  const { data: order } = await supabase
    .from("orders")
    .select("id,user_id,fabricante_id,total,status")
    .eq("id", orderId)
    .single();

  if (!order) {
    throw new Error("Pedido no encontrado.");
  }

  if (!isStaff && order.fabricante_id !== user.id) {
    throw new Error("No tienes permisos para aprobar este pedido.");
  }

  const { data: items } = await supabase
    .from("order_items")
    .select("product_name,quantity,unit_price")
    .eq("order_id", order.id);

  const { data: buyer } = await supabase
    .from("profiles")
    .select("full_name,email,cuit")
    .eq("id", order.user_id)
    .single<Pick<ProfileRow, "full_name" | "email" | "cuit">>();

  await supabase
    .from("orders")
    .update({
      status: "aprobado" satisfies OrderStatus,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", order.id);

  try {
    const invoice = await createXubioInvoice({
      orderId: order.id,
      customer: {
        name: buyer?.full_name ?? "Cliente",
        email: buyer?.email ?? "",
        cuit: buyer?.cuit,
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
        status: "facturado" satisfies OrderStatus,
        xubio_invoice_id: invoice.id,
        xubio_cae: invoice.cae,
        xubio_invoice_pdf_url: invoice.pdf_url,
      })
      .eq("id", order.id);

    if (buyer?.email) {
      try {
        await sendInvoiceEmail({
          to: buyer.email,
          customerName: buyer.full_name ?? "Cliente",
          orderId: order.id,
          total: Number(order.total ?? 0),
          cae: invoice.cae,
          pdfUrl: invoice.pdf_url,
        });
      } catch (emailError) {
        await supabase
          .from("orders")
          .update({
            notes: `Factura emitida pero email falló: ${emailError instanceof Error ? emailError.message : "error desconocido"}`,
          })
          .eq("id", order.id);
      }
    }
  } catch (error) {
    await supabase
      .from("orders")
      .update({
        notes: `Aprobado sin facturar: ${error instanceof Error ? error.message : "error desconocido"}`,
      })
      .eq("id", order.id);
    throw error;
  }

  revalidatePath("/dashboard/pedidos");
  revalidatePath(`/dashboard/pedidos/${order.id}`);
  revalidatePath("/mi-cuenta");
}

export async function rejectOrder(orderId: string, reason?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Sesión inválida.");
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id,fabricante_id")
    .eq("id", orderId)
    .single();

  if (!order || order.fabricante_id !== user.id) {
    throw new Error("No puedes rechazar este pedido.");
  }

  const { error } = await supabase
    .from("orders")
    .update({
      status: "rechazado" satisfies OrderStatus,
      notes: reason ?? null,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", order.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/pedidos");
  revalidatePath(`/dashboard/pedidos/${order.id}`);
  revalidatePath("/mi-cuenta");
}

export async function approveOrderAction(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) {
    throw new Error("orderId es obligatorio.");
  }

  await approveOrder(orderId);
}

export async function rejectOrderAction(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");
  const reason = String(formData.get("reason") ?? "");

  if (!orderId) {
    throw new Error("orderId es obligatorio.");
  }

  await rejectOrder(orderId, reason || undefined);
}
