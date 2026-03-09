"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Search } from "lucide-react";

type ProductRow = {
  id: string;
  name: string | null;
  sku: string | null;
  category: string | null;
  price: number | null;
};

type ProductPriceRow = {
  product_id: string;
  lista_precio_id: number;
  price: number;
};

type ProductComparisonRow = {
  product_id: string;
  name: string;
  sku: string;
  category: string;
  base_price: number;
  prices_by_list: Map<number, number>;
};

export default function PriceListsPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [rows, setRows] = useState<ProductComparisonRow[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    void fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError(null);

    const [{ data: productPrices, error: productPricesError }, { data: products, error: productsError }] =
      await Promise.all([
        supabase.from("product_prices").select("product_id,lista_precio_id,price").order("lista_precio_id", { ascending: true }),
        supabase.from("products").select("id,name,sku,category,price"),
      ]);

    if (productPricesError || productsError) {
      setError(productPricesError?.message ?? productsError?.message ?? "No se pudieron cargar las listas de precio.");
      setRows([]);
      setLoading(false);
      return;
    }

    const productMap = new Map((products as ProductRow[] | null ?? []).map((product) => [product.id, product]));

    const pricesByProduct = new Map<string, Map<number, number>>();
    for (const row of (productPrices as ProductPriceRow[] | null ?? [])) {
      if (!pricesByProduct.has(row.product_id)) {
        pricesByProduct.set(row.product_id, new Map<number, number>());
      }
      pricesByProduct.get(row.product_id)?.set(row.lista_precio_id, Number(row.price ?? 0));
    }

    const comparisonRows = Array.from(productMap.values())
      .map((product) => ({
        product_id: product.id,
        name: product.name ?? "Producto sin nombre",
        sku: product.sku ?? "-",
        category: product.category ?? "-",
        base_price: Number(product.price ?? 0),
        prices_by_list: pricesByProduct.get(product.id) ?? new Map<number, number>(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "es-AR"));

    setRows(comparisonRows);
    setLoading(false);
  }

  async function handlePriceChange(productId: string, listaPrecioId: number, value: string) {
    const normalized = value.trim().replace(",", ".");
    const parsed = Number(normalized);

    if (!Number.isFinite(parsed) || parsed < 0) {
      setSaveError("Ingresa un precio valido mayor o igual a 0.");
      return;
    }

    setSaveError(null);
    const key = `${productId}-${listaPrecioId}`;
    setSavingKey(key);

    const { error: upsertError } = await supabase.from("product_prices").upsert(
      {
        product_id: productId,
        lista_precio_id: listaPrecioId,
        price: parsed,
        currency: "ARS",
        manual_override: true,
      },
      { onConflict: "product_id,lista_precio_id" }
    );

    if (upsertError) {
      setSaveError(`No se pudo guardar el precio: ${upsertError.message}`);
      setSavingKey(null);
      return;
    }

    setRows((prevRows) =>
      prevRows.map((row) => {
        if (row.product_id !== productId) return row;
        const nextMap = new Map(row.prices_by_list);
        nextMap.set(listaPrecioId, parsed);
        return { ...row, prices_by_list: nextMap };
      })
    );

    setSavingKey(null);
  }

  const listIds = useMemo(() => {
    const ids = new Set<number>();
    rows.forEach((row) => {
      row.prices_by_list.forEach((_price, listId) => ids.add(listId));
    });
    return Array.from(ids).sort((a, b) => a - b);
  }, [rows]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        term.length === 0 || row.name.toLowerCase().includes(term) || row.sku.toLowerCase().includes(term);

      return matchesSearch;
    });
  }, [rows, search]);

  const summary = useMemo(() => {
    const distinctProducts = filteredRows.length;
    const totalValues = filteredRows.reduce((acc, row) => acc + row.prices_by_list.size, 0);
    const avgPrice =
      totalValues > 0
        ? filteredRows.reduce((acc, row) => {
            let sum = acc;
            row.prices_by_list.forEach((price) => {
              sum += Number(price ?? 0);
            });
            return sum;
          }, 0) / totalValues
        : 0;

    return {
      rows: filteredRows.length,
      products: distinctProducts,
      avgPrice,
    };
  }, [filteredRows]);

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Listas de Precio</h1>
        <p className="text-gray-500">Visualización completa de precios por lista y producto.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Listas detectadas</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{listIds.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Productos en vista</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{summary.products}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Precio promedio</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">${summary.avgPrice.toLocaleString("es-AR", { maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por SKU o nombre"
              className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-black"
            />
          </div>

          <button
            onClick={() => void fetchData()}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold hover:bg-gray-50"
          >
            Actualizar
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-sm flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5" />
            <span>{error}</span>
          </div>
        ) : (
          <>
            {saveError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-sm flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5" />
                <span>{saveError}</span>
              </div>
            ) : null}

            <div className="overflow-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm min-w-[1100px]">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left w-56">SKU</th>
                  <th className="px-4 py-3 text-left">Producto</th>
                  <th className="px-4 py-3 text-left w-44">Categoría</th>
                  <th className="px-4 py-3 text-right w-36">Precio Base</th>
                  {listIds.map((listId) => (
                    <th key={listId} className="px-4 py-3 text-right w-36">
                      Lista {listId}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.product_id} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-600 font-mono truncate" title={row.sku}>{row.sku}</td>
                    <td className="px-4 py-3 text-gray-900 truncate" title={row.name}>{row.name}</td>
                    <td className="px-4 py-3 text-gray-600 truncate" title={row.category}>{row.category}</td>
                    <td className="px-4 py-3 text-right text-gray-600">${row.base_price.toLocaleString("es-AR")}</td>
                    {listIds.map((listId) => {
                      const listPrice = row.prices_by_list.get(listId);
                      const cellKey = `${row.product_id}-${listId}`;
                      return (
                        <td key={`${row.product_id}-${listId}`} className="px-4 py-3 text-right font-semibold">
                          <div className="flex items-center justify-end gap-2">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              defaultValue={listPrice === undefined ? "" : listPrice}
                              onBlur={(event) => {
                                if (event.target.value.trim().length === 0) {
                                  return;
                                }
                                void handlePriceChange(row.product_id, listId, event.target.value);
                              }}
                              className="w-28 border border-gray-300 rounded px-2 py-1 text-right text-xs font-semibold focus:outline-none focus:border-black"
                            />
                            {savingKey === cellKey ? <span className="text-[10px] text-gray-400">Guardando...</span> : null}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={4 + listIds.length} className="px-4 py-10 text-center text-gray-500">
                      No hay resultados para los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
