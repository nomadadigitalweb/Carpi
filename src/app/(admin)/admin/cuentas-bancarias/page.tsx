"use client";

import { useEffect, useState, useTransition } from "react";
import {
  createBankAccount,
  deleteBankAccount,
  listBankAccounts,
  updateBankAccount,
  type BankAccount,
} from "@/actions/bank-accounts";
import { Building2, Plus, RefreshCw, Save, Trash2 } from "lucide-react";

type Draft = {
  label: string;
  bank_name: string;
  account_holder: string;
  cbu: string;
  alias: string;
  cuit: string;
  is_active: boolean;
  display_order: string;
};

function toDraft(row: BankAccount): Draft {
  return {
    label: row.label,
    bank_name: row.bank_name,
    account_holder: row.account_holder ?? "",
    cbu: row.cbu,
    alias: row.alias,
    cuit: row.cuit,
    is_active: row.is_active,
    display_order: String(row.display_order ?? 0),
  };
}

export default function AdminCuentasBancariasPage() {
  const [rows, setRows] = useState<BankAccount[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newDraft, setNewDraft] = useState<Draft>({
    label: "",
    bank_name: "",
    account_holder: "",
    cbu: "",
    alias: "",
    cuit: "",
    is_active: true,
    display_order: "0",
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listBankAccounts();
      setRows(data);
      const nextDrafts: Record<string, Draft> = {};
      data.forEach((row) => {
        nextDrafts[row.id] = toDraft(row);
      });
      setDrafts(nextDrafts);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudieron cargar las cuentas bancarias.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onCreate = () => {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        await createBankAccount({
          ...newDraft,
          account_holder: newDraft.account_holder || null,
          display_order: Number(newDraft.display_order || 0),
        });

        setNewDraft({
          label: "",
          bank_name: "",
          account_holder: "",
          cbu: "",
          alias: "",
          cuit: "",
          is_active: true,
          display_order: "0",
        });
        setMessage("Cuenta bancaria creada.");
        await loadData();
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "No se pudo crear la cuenta bancaria.");
      }
    });
  };

  const onSave = (id: string) => {
    const draft = drafts[id];
    if (!draft) return;

    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        await updateBankAccount({
          id,
          ...draft,
          account_holder: draft.account_holder || null,
          display_order: Number(draft.display_order || 0),
        });
        setMessage("Cuenta bancaria actualizada.");
        await loadData();
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "No se pudo actualizar la cuenta bancaria.");
      }
    });
  };

  const onDelete = (id: string, label: string) => {
    const ok = confirm(`¿Eliminar la cuenta '${label}'?`);
    if (!ok) return;

    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        await deleteBankAccount(id);
        setMessage("Cuenta bancaria eliminada.");
        await loadData();
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "No se pudo eliminar la cuenta bancaria.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cuentas Bancarias</h1>
          <p className="text-sm text-gray-500 mt-1">Opciones de transferencia usadas en emails de factura.</p>
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

      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-900 flex items-center gap-2">
          <Plus size={16} /> Nueva Cuenta
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <input className="rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Etiqueta" value={newDraft.label} onChange={(e) => setNewDraft((prev) => ({ ...prev, label: e.target.value }))} />
          <input className="rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Banco" value={newDraft.bank_name} onChange={(e) => setNewDraft((prev) => ({ ...prev, bank_name: e.target.value }))} />
          <input className="rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Titular (opcional)" value={newDraft.account_holder} onChange={(e) => setNewDraft((prev) => ({ ...prev, account_holder: e.target.value }))} />
          <input className="rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="CBU" value={newDraft.cbu} onChange={(e) => setNewDraft((prev) => ({ ...prev, cbu: e.target.value }))} />
          <input className="rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Alias" value={newDraft.alias} onChange={(e) => setNewDraft((prev) => ({ ...prev, alias: e.target.value }))} />
          <input className="rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="CUIT" value={newDraft.cuit} onChange={(e) => setNewDraft((prev) => ({ ...prev, cuit: e.target.value }))} />
          <input className="rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Orden" type="number" value={newDraft.display_order} onChange={(e) => setNewDraft((prev) => ({ ...prev, display_order: e.target.value }))} />
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 px-1">
            <input type="checkbox" checked={newDraft.is_active} onChange={(e) => setNewDraft((prev) => ({ ...prev, is_active: e.target.checked }))} />
            Activa
          </label>
        </div>

        <button
          type="button"
          onClick={onCreate}
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          <Plus size={14} /> Crear Cuenta
        </button>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="px-6 py-10 text-sm text-gray-500">Cargando cuentas...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Cuenta</th>
                <th className="text-left px-4 py-3">Transferencia</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const draft = drafts[row.id] ?? toDraft(row);
                return (
                  <tr key={row.id} className="border-t border-gray-100 align-top">
                    <td className="px-4 py-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-gray-800 font-semibold">
                          <Building2 size={14} />
                          <input className="rounded border border-gray-300 px-2 py-1 text-xs w-full" value={draft.label} onChange={(e) => setDrafts((prev) => ({ ...prev, [row.id]: { ...draft, label: e.target.value } }))} />
                        </div>
                        <input className="rounded border border-gray-300 px-2 py-1 text-xs w-full" value={draft.bank_name} placeholder="Banco" onChange={(e) => setDrafts((prev) => ({ ...prev, [row.id]: { ...draft, bank_name: e.target.value } }))} />
                        <input className="rounded border border-gray-300 px-2 py-1 text-xs w-full" value={draft.account_holder} placeholder="Titular" onChange={(e) => setDrafts((prev) => ({ ...prev, [row.id]: { ...draft, account_holder: e.target.value } }))} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-2">
                        <input className="rounded border border-gray-300 px-2 py-1 text-xs w-full" value={draft.cbu} placeholder="CBU" onChange={(e) => setDrafts((prev) => ({ ...prev, [row.id]: { ...draft, cbu: e.target.value } }))} />
                        <input className="rounded border border-gray-300 px-2 py-1 text-xs w-full" value={draft.alias} placeholder="Alias" onChange={(e) => setDrafts((prev) => ({ ...prev, [row.id]: { ...draft, alias: e.target.value } }))} />
                        <input className="rounded border border-gray-300 px-2 py-1 text-xs w-full" value={draft.cuit} placeholder="CUIT" onChange={(e) => setDrafts((prev) => ({ ...prev, [row.id]: { ...draft, cuit: e.target.value } }))} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-2">
                        <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                          <input type="checkbox" checked={draft.is_active} onChange={(e) => setDrafts((prev) => ({ ...prev, [row.id]: { ...draft, is_active: e.target.checked } }))} />
                          Activa
                        </label>
                        <input className="rounded border border-gray-300 px-2 py-1 text-xs w-24" type="number" value={draft.display_order} onChange={(e) => setDrafts((prev) => ({ ...prev, [row.id]: { ...draft, display_order: e.target.value } }))} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button onClick={() => onSave(row.id)} disabled={isPending} className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-gray-300 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50">
                          <Save size={13} /> Guardar
                        </button>
                        <button onClick={() => onDelete(row.id, draft.label || row.label)} disabled={isPending} className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-red-300 text-red-700 text-xs font-semibold hover:bg-red-50 disabled:opacity-50">
                          <Trash2 size={13} /> Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!rows.length && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                    No hay cuentas configuradas.
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
