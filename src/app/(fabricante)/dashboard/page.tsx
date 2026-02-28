import { createClient } from "@/utils/supabase/server";

export default async function FabricanteDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ count: pendingCount }, { count: approvedCount }, { count: totalUsers }] = await Promise.all([
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("fabricante_id", user?.id)
      .eq("status", "pendiente_fabricante"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("fabricante_id", user?.id)
      .in("status", ["aprobado", "facturado", "pagado"]),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", user?.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard de Fabricante</h1>
        <p className="text-gray-500">Gestiona pedidos pendientes y usuarios de tu equipo.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-gray-500 font-bold">Pendientes</p>
          <p className="text-3xl font-bold mt-1">{pendingCount ?? 0}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-gray-500 font-bold">Aprobados/Facturados</p>
          <p className="text-3xl font-bold mt-1">{approvedCount ?? 0}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-gray-500 font-bold">Usuarios de equipo</p>
          <p className="text-3xl font-bold mt-1">{totalUsers ?? 0}</p>
        </div>
      </div>
    </div>
  );
}
