import { createClient } from "@/utils/supabase/server";
import SyncStatusPanel from "@/components/admin/SyncStatusPanel";

export default async function AdminSyncPage() {
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from("xubio_sync_log")
    .select("id,entity_type,synced_at,records_synced,status,error_detail")
    .order("synced_at", { ascending: false })
    .limit(30);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sincronización Xubio</h1>
        <p className="text-gray-500">Ejecuta sincronizaciones manuales y revisa el historial.</p>
      </div>

      <SyncStatusPanel />

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-right">Registros</th>
              <th className="px-4 py-3 text-left">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {logs?.map((log) => (
              <tr key={log.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium">{log.entity_type}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(log.synced_at).toLocaleString("es-AR")}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      log.status === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {log.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold">{log.records_synced}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{log.error_detail ?? "-"}</td>
              </tr>
            ))}
            {!logs?.length && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                  No hay sincronizaciones registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
