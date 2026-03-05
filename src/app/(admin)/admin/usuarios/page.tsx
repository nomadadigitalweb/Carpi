"use client";

import { useEffect, useState, useTransition } from "react";
import {
  createManagedAccount,
  deleteManagedAccount,
  listManagedProfiles,
  updateManagedProfile,
  type ManagedProfile,
} from "@/actions/admin-users";
import { Factory, Plus, RefreshCw, Save, Trash2, Users } from "lucide-react";

type UserDraft = {
  parent_id: string;
  can_view_team_orders: boolean;
  is_active: boolean;
};

type FabricanteDraft = {
  lista_precio_id: string;
  is_active: boolean;
};

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<ManagedProfile[]>([]);
  const [fabricantes, setFabricantes] = useState<ManagedProfile[]>([]);
  const [userDrafts, setUserDrafts] = useState<Record<string, UserDraft>>({});
  const [fabricanteDrafts, setFabricanteDrafts] = useState<Record<string, FabricanteDraft>>({});

  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserFabricanteId, setNewUserFabricanteId] = useState("");

  const [newFabricanteEmail, setNewFabricanteEmail] = useState("");
  const [newFabricantePassword, setNewFabricantePassword] = useState("");
  const [newFabricanteLista, setNewFabricanteLista] = useState("");

  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await listManagedProfiles();
      setUsuarios(data.usuarios);
      setFabricantes(data.fabricantes);

      const nextUserDrafts: Record<string, UserDraft> = {};
      data.usuarios.forEach((u) => {
        nextUserDrafts[u.id] = {
          parent_id: u.parent_id ?? "",
          can_view_team_orders: Boolean(u.can_view_team_orders),
          is_active: u.is_active !== false,
        };
      });
      setUserDrafts(nextUserDrafts);

      const nextFabricanteDrafts: Record<string, FabricanteDraft> = {};
      data.fabricantes.forEach((f) => {
        nextFabricanteDrafts[f.id] = {
          lista_precio_id: f.lista_precio_id?.toString() ?? "",
          is_active: f.is_active !== false,
        };
      });
      setFabricanteDrafts(nextFabricanteDrafts);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudieron cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onCreateUsuario = () => {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        await createManagedAccount({
          email: newUserEmail,
          password: newUserPassword,
          role: "usuario",
          parent_id: newUserFabricanteId || null,
          can_view_team_orders: false,
          is_active: true,
        });

        setNewUserEmail("");
        setNewUserPassword("");
        setNewUserFabricanteId("");
        setMessage("Usuario creado correctamente.");
        await loadData();
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "No se pudo crear el usuario.");
      }
    });
  };

  const onCreateFabricante = () => {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        await createManagedAccount({
          email: newFabricanteEmail,
          password: newFabricantePassword,
          role: "fabricante",
          lista_precio_id: newFabricanteLista ? Number(newFabricanteLista) : null,
          is_active: true,
        });

        setNewFabricanteEmail("");
        setNewFabricantePassword("");
        setNewFabricanteLista("");
        setMessage("Fabricante creado correctamente.");
        await loadData();
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "No se pudo crear el fabricante.");
      }
    });
  };

  const onSaveUsuario = (id: string) => {
    const draft = userDrafts[id];
    if (!draft) return;

    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        await updateManagedProfile({
          id,
          role: "usuario",
          parent_id: draft.parent_id || null,
          can_view_team_orders: draft.can_view_team_orders,
          is_active: draft.is_active,
        });

        setMessage("Usuario actualizado.");
        await loadData();
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "No se pudo actualizar el usuario.");
      }
    });
  };

  const onSaveFabricante = (id: string) => {
    const draft = fabricanteDrafts[id];
    if (!draft) return;

    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        await updateManagedProfile({
          id,
          role: "fabricante",
          lista_precio_id: draft.lista_precio_id ? Number(draft.lista_precio_id) : null,
          is_active: draft.is_active,
        });

        setMessage("Fabricante actualizado.");
        await loadData();
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "No se pudo actualizar el fabricante.");
      }
    });
  };

  const onDeleteAccount = (id: string, label: string) => {
    const ok = confirm(`¿Eliminar ${label}? Esta acción no se puede deshacer.`);
    if (!ok) return;

    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        await deleteManagedAccount(id);
        setMessage(`${label} eliminado.`);
        await loadData();
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : `No se pudo eliminar ${label}.`);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-sm text-gray-500 mt-1">
            CRUD de usuarios y fabricantes, con asignación de fabricante para usuarios.
          </p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw size={16} />
          Actualizar
        </button>
      </div>

      {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-3 text-sm">{message}</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-900 flex items-center gap-2">
            <Users size={16} /> Crear Usuario
          </h2>
          <div className="grid grid-cols-1 gap-3">
            <input
              type="email"
              placeholder="Email"
              value={newUserEmail}
              onChange={(event) => setNewUserEmail(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={newUserPassword}
              onChange={(event) => setNewUserPassword(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <select
              value={newUserFabricanteId}
              onChange={(event) => setNewUserFabricanteId(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Asignar fabricante...</option>
              {fabricantes.map((fabricante) => (
                <option key={fabricante.id} value={fabricante.id}>
                  {fabricante.email || fabricante.id}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onCreateUsuario}
              disabled={isPending}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              <Plus size={14} /> Crear Usuario
            </button>
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-900 flex items-center gap-2">
            <Factory size={16} /> Crear Fabricante
          </h2>
          <div className="grid grid-cols-1 gap-3">
            <input
              type="email"
              placeholder="Email"
              value={newFabricanteEmail}
              onChange={(event) => setNewFabricanteEmail(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={newFabricantePassword}
              onChange={(event) => setNewFabricantePassword(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="Lista de precio (opcional)"
              value={newFabricanteLista}
              onChange={(event) => setNewFabricanteLista(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={onCreateFabricante}
              disabled={isPending}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              <Plus size={14} /> Crear Fabricante
            </button>
          </div>
        </section>
      </div>

      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">Usuarios</h3>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-gray-500">Cargando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Fabricante</th>
                <th className="text-left px-4 py-3">Ver equipo</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => {
                const draft = userDrafts[usuario.id];
                return (
                  <tr key={usuario.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-700">{usuario.email ?? usuario.id}</td>
                    <td className="px-4 py-3">
                      <select
                        value={draft?.parent_id ?? ""}
                        onChange={(event) =>
                          setUserDrafts((prev) => ({
                            ...prev,
                            [usuario.id]: {
                              ...(prev[usuario.id] ?? { parent_id: "", can_view_team_orders: false, is_active: true }),
                              parent_id: event.target.value,
                            },
                          }))
                        }
                        className="rounded-lg border border-gray-300 px-2 py-1"
                      >
                        <option value="">Sin fabricante</option>
                        {fabricantes.map((fabricante) => (
                          <option key={fabricante.id} value={fabricante.id}>
                            {fabricante.email || fabricante.id}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={Boolean(draft?.can_view_team_orders)}
                        onChange={(event) =>
                          setUserDrafts((prev) => ({
                            ...prev,
                            [usuario.id]: {
                              ...(prev[usuario.id] ?? { parent_id: "", can_view_team_orders: false, is_active: true }),
                              can_view_team_orders: event.target.checked,
                            },
                          }))
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={Boolean(draft?.is_active)}
                        onChange={(event) =>
                          setUserDrafts((prev) => ({
                            ...prev,
                            [usuario.id]: {
                              ...(prev[usuario.id] ?? { parent_id: "", can_view_team_orders: false, is_active: true }),
                              is_active: event.target.checked,
                            },
                          }))
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onSaveUsuario(usuario.id)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <Save size={12} /> Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteAccount(usuario.id, usuario.email || "usuario")}
                          disabled={isPending}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 size={12} /> Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!usuarios.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No hay usuarios cargados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">Fabricantes</h3>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-gray-500">Cargando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Lista Precio</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {fabricantes.map((fabricante) => {
                const draft = fabricanteDrafts[fabricante.id];
                return (
                  <tr key={fabricante.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-700">{fabricante.email ?? fabricante.id}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={draft?.lista_precio_id ?? ""}
                        onChange={(event) =>
                          setFabricanteDrafts((prev) => ({
                            ...prev,
                            [fabricante.id]: {
                              ...(prev[fabricante.id] ?? { lista_precio_id: "", is_active: true }),
                              lista_precio_id: event.target.value,
                            },
                          }))
                        }
                        className="w-32 rounded-lg border border-gray-300 px-2 py-1"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={Boolean(draft?.is_active)}
                        onChange={(event) =>
                          setFabricanteDrafts((prev) => ({
                            ...prev,
                            [fabricante.id]: {
                              ...(prev[fabricante.id] ?? { lista_precio_id: "", is_active: true }),
                              is_active: event.target.checked,
                            },
                          }))
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onSaveFabricante(fabricante.id)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <Save size={12} /> Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteAccount(fabricante.id, fabricante.email || "fabricante")}
                          disabled={isPending}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 size={12} /> Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!fabricantes.length && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    No hay fabricantes cargados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
