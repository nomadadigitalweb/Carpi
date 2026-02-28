import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

export default async function FabricantePedidosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: orders } = await supabase
    .from("orders")
    .select("id,total,status,created_at")
    .eq("fabricante_id", user?.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pedidos de tu equipo</h1>
        <p className="text-gray-500">Aprueba los pedidos para iniciar la facturación en Xubio.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Pedido</th>
              <th className="text-left px-4 py-3">Fecha</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-right px-4 py-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {orders?.map((order) => (
              <tr key={order.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/dashboard/pedidos/${order.id}`} className="hover:underline">
                    #{order.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(order.created_at).toLocaleDateString("es-AR")}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold uppercase">
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold">
                  ${Number(order.total).toLocaleString("es-AR")}
                </td>
              </tr>
            ))}
            {!orders?.length && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                  No hay pedidos aún.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
