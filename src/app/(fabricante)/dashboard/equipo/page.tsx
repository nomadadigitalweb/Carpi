import { createClient } from "@/utils/supabase/server";

export default async function FabricanteEquipoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: members } = await supabase
    .from("profiles")
    .select("id,email,full_name,can_view_team_orders,is_active,updated_at")
    .eq("parent_id", user?.id)
    .order("updated_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Usuarios de tu equipo</h1>
        <p className="text-gray-500">Controla permisos de visualización y estado de cada usuario.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Nombre</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Ver pedidos de equipo</th>
              <th className="text-left px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {members?.map((member) => (
              <tr key={member.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium">{member.full_name ?? "Sin nombre"}</td>
                <td className="px-4 py-3 text-gray-500">{member.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${member.can_view_team_orders ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                    {member.can_view_team_orders ? "Sí" : "No"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${member.is_active ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>
                    {member.is_active ? "Activo" : "Inactivo"}
                  </span>
                </td>
              </tr>
            ))}
            {!members?.length && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                  Aún no tienes usuarios asociados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
