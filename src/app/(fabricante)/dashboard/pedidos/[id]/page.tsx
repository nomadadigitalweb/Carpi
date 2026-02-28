import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { approveOrderAction, rejectOrderAction } from "@/actions/orders";

export default async function FabricantePedidoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: order } = await supabase
    .from("orders")
    .select("id,total,status,created_at,notes,fabricante_id,user_id,xubio_invoice_pdf_url,xubio_cae")
    .eq("id", id)
    .single();

  if (!order || order.fabricante_id !== user?.id) {
    notFound();
  }

  const { data: items } = await supabase
    .from("order_items")
    .select("id,product_name,quantity,unit_price,subtotal")
    .eq("order_id", order.id)
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedido #{order.id.slice(0, 8)}</h1>
          <p className="text-gray-500">Estado actual: {order.status}</p>
        </div>

        <div className="flex gap-2">
          {order.status === "pendiente_fabricante" && (
            <>
              <form action={approveOrderAction}>
                <input type="hidden" name="orderId" value={order.id} />
                <button className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors">
                  Aprobar y facturar
                </button>
              </form>

              <form action={rejectOrderAction} className="flex items-center gap-2">
                <input type="hidden" name="orderId" value={order.id} />
                <input
                  name="reason"
                  placeholder="Motivo (opcional)"
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm"
                />
                <button className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors">
                  Rechazar
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Producto</th>
              <th className="text-right px-4 py-3">Cantidad</th>
              <th className="text-right px-4 py-3">Unitario</th>
              <th className="text-right px-4 py-3">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items?.map((item) => (
              <tr key={item.id} className="border-t border-gray-100">
                <td className="px-4 py-3">{item.product_name}</td>
                <td className="px-4 py-3 text-right">{item.quantity}</td>
                <td className="px-4 py-3 text-right">${Number(item.unit_price).toLocaleString("es-AR")}</td>
                <td className="px-4 py-3 text-right font-semibold">${Number(item.subtotal).toLocaleString("es-AR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
        <p className="text-sm text-gray-500">Creado: {new Date(order.created_at).toLocaleString("es-AR")}</p>
        <p className="text-sm text-gray-500">Total: <span className="font-bold text-gray-900">${Number(order.total).toLocaleString("es-AR")}</span></p>
        {order.xubio_cae && <p className="text-sm text-gray-500">CAE: <span className="font-semibold text-gray-900">{order.xubio_cae}</span></p>}
        {order.xubio_invoice_pdf_url && (
          <a href={order.xubio_invoice_pdf_url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-blue-600 hover:underline">
            Ver factura PDF
          </a>
        )}
        {order.notes && <p className="text-sm text-red-600">Nota: {order.notes}</p>}
      </div>
    </div>
  );
}
