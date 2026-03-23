"use client";

import { useState, useTransition } from "react";

type SyncResponse = {
  entityType: "products" | "price_lists" | "stock" | "catalog";
  status: "success" | "error";
  recordsSynced: number;
  errorDetail?: string;
};

export default function SyncStatusPanel() {
  const [lastResult, setLastResult] = useState<SyncResponse | null>(null);
  const [pendingType, setPendingType] = useState<"products" | "prices" | "stock" | "catalog" | null>(null);
  const [isPending, startTransition] = useTransition();

  const runSync = (type: "products" | "prices" | "stock" | "catalog") => {
    setPendingType(type);
    setLastResult(null);

    startTransition(async () => {
      try {
        const endpoint =
          type === "products"
            ? "/api/xubio/sync-products"
            : type === "stock"
              ? "/api/xubio/sync-stock"
            : type === "prices"
              ? "/api/xubio/sync-prices"
              : "/api/xubio/sync-catalog";
        const response = await fetch(endpoint, { method: "POST" });
        const data = (await response.json()) as SyncResponse | { error: string };

        if (!response.ok) {
          const resolvedError =
            "error" in data
              ? data.error
              : "errorDetail" in data && typeof data.errorDetail === "string"
                ? data.errorDetail
                : "Error de sincronización";

          setLastResult({
            entityType:
              type === "catalog"
                ? "catalog"
                : type === "products"
                  ? "products"
                  : type === "stock"
                    ? "stock"
                    : "price_lists",
            status: "error",
            recordsSynced: 0,
            errorDetail: resolvedError,
          });
          return;
        }

        setLastResult(data as SyncResponse);
      } catch (error) {
        setLastResult({
          entityType:
            type === "catalog"
              ? "catalog"
              : type === "products"
                ? "products"
                : type === "stock"
                  ? "stock"
                  : "price_lists",
          status: "error",
          recordsSynced: 0,
          errorDetail: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setPendingType(null);
      }
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900">Sincronización Xubio</h2>
        <p className="text-xs text-gray-500 mt-1">Actualiza productos y listas de precio en Supabase.</p>
        <p className="text-xs text-gray-500">El stock se sincroniza automáticamente por cron durante el día.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => runSync("products")}
          disabled={isPending}
          className="px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold hover:bg-zinc-800 disabled:opacity-40"
        >
          {pendingType === "products" ? "Sincronizando productos..." : "Sync Productos"}
        </button>

        <button
          onClick={() => runSync("stock")}
          disabled={isPending}
          className="px-4 py-2 rounded-lg border border-emerald-300 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
        >
          {pendingType === "stock" ? "Sincronizando stock..." : "Sync Stock"}
        </button>

        <button
          onClick={() => runSync("prices")}
          disabled={isPending}
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold hover:bg-gray-50 disabled:opacity-40"
        >
          {pendingType === "prices" ? "Sincronizando precios..." : "Sync Precios"}
        </button>

        <button
          onClick={() => runSync("catalog")}
          disabled={isPending}
          className="px-4 py-2 rounded-lg border border-red-300 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40"
        >
          {pendingType === "catalog" ? "Reemplazando catálogo..." : "Reemplazar catálogo con Xubio"}
        </button>
      </div>

      {lastResult && (
        <div
          className={`rounded-lg p-3 text-sm ${
            lastResult.status === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          <p className="font-semibold uppercase text-xs tracking-wider">{lastResult.entityType}</p>
          <p>Estado: {lastResult.status}</p>
          <p>Registros: {lastResult.recordsSynced}</p>
          {lastResult.errorDetail && <p>Error: {lastResult.errorDetail}</p>}
        </div>
      )}
    </div>
  );
}
