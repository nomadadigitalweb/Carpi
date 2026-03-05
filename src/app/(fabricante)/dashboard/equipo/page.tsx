"use client";

import { useEffect, useState, useCallback } from "react";
import { UserPlus, Trash2, Save, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import {
  listTeamMembers,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  type TeamMember,
} from "@/actions/fabricante-users";

type EditDraft = {
  full_name: string;
  can_view_team_orders: boolean;
  is_active: boolean;
};

export default function FabricanteEquipoPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [drafts, setDrafts] = useState<Record<string, EditDraft>>({});

  // New user form
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");

  // Feedback
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      const data = await listTeamMembers();
      setMembers(data);

      const nextDrafts: Record<string, EditDraft> = {};
      data.forEach((m) => {
        nextDrafts[m.id] = {
          full_name: m.full_name ?? "",
          can_view_team_orders: m.can_view_team_orders,
          is_active: m.is_active,
        };
      });
      setDrafts(nextDrafts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar el equipo.");
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Clear messages after 4s
  useEffect(() => {
    if (error || message) {
      const t = setTimeout(() => { setError(null); setMessage(null); }, 4000);
      return () => clearTimeout(t);
    }
  }, [error, message]);

  const onCreateUser = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      await createTeamMember({ email: newEmail, password: newPassword, full_name: newName });
      setNewEmail("");
      setNewPassword("");
      setNewName("");
      setMessage("Usuario creado correctamente.");
      await fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el usuario.");
    } finally {
      setLoading(false);
    }
  };

  const onSave = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      await updateTeamMember({
        id,
        full_name: draft.full_name,
        can_view_team_orders: draft.can_view_team_orders,
        is_active: draft.is_active,
      });
      setMessage("Usuario actualizado.");
      await fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar.");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (id: string, label: string) => {
    if (!confirm(`¿Eliminar definitivamente a ${label}?`)) return;
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      await deleteTeamMember(id);
      setMessage("Usuario eliminado.");
      await fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar.");
    } finally {
      setLoading(false);
    }
  };

  const updateDraft = (id: string, partial: Partial<EditDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { full_name: "", can_view_team_orders: false, is_active: true }), ...partial },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Equipo</h1>
        <p className="text-gray-500">
          Creá, editá o eliminá los usuarios de tu equipo. Ellos pueden armar pedidos que vos aprobás antes de enviarse.
        </p>
      </div>

      {/* Feedback */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {message && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
          <CheckCircle size={16} /> {message}
        </div>
      )}

      {/* Create user form */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-900 flex items-center gap-2">
          <UserPlus size={16} /> Agregar usuario al equipo
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Nombre completo"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
          />
          <input
            type="email"
            placeholder="Email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
          />
          <input
            type="password"
            placeholder="Contraseña (mín. 6)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
          />
        </div>

        <button
          onClick={onCreateUser}
          disabled={loading || !newEmail || !newPassword}
          className="px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold hover:bg-zinc-800 disabled:opacity-40 flex items-center gap-2"
        >
          <UserPlus size={14} /> Crear usuario
        </button>
      </div>

      {/* Members table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Nombre</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Ver pedidos equipo</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-left px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const draft = drafts[member.id];
              return (
                <tr key={member.id} className="border-t border-gray-100">
                  {/* Name (editable) */}
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={draft?.full_name ?? ""}
                      onChange={(e) => updateDraft(member.id, { full_name: e.target.value })}
                      className="border border-gray-200 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-black/10"
                    />
                  </td>

                  {/* Email (read-only) */}
                  <td className="px-4 py-3 text-gray-500">{member.email}</td>

                  {/* Team orders toggle */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => updateDraft(member.id, { can_view_team_orders: !draft?.can_view_team_orders })}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold transition-colors ${
                        draft?.can_view_team_orders
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {draft?.can_view_team_orders ? <Eye size={12} /> : <EyeOff size={12} />}
                      {draft?.can_view_team_orders ? "Sí" : "No"}
                    </button>
                  </td>

                  {/* Active toggle */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => updateDraft(member.id, { is_active: !draft?.is_active })}
                      className={`px-2 py-1 rounded-full text-xs font-semibold transition-colors ${
                        draft?.is_active
                          ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                          : "bg-red-100 text-red-700 hover:bg-red-200"
                      }`}
                    >
                      {draft?.is_active ? "Activo" : "Inactivo"}
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSave(member.id)}
                        disabled={loading}
                        className="p-1.5 rounded-lg bg-black text-white hover:bg-zinc-700 disabled:opacity-40"
                        title="Guardar cambios"
                      >
                        <Save size={14} />
                      </button>
                      <button
                        onClick={() => onDelete(member.id, member.email || member.full_name || "usuario")}
                        disabled={loading}
                        className="p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-40"
                        title="Eliminar usuario"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!members.length && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                  Aún no tenés usuarios en tu equipo. ¡Creá uno arriba!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
