"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ListFilter, Search } from "lucide-react";

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

type JoinedRow = {
  product_id: string;
  lista_precio_id: number;
  lista_price: number;
  base_price: number;
  name: string;
  sku: string;
  category: string;
};

export default function PriceListsPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<JoinedRow[]>([]);
  const [selectedListId, setSelectedListId] = useState<number | "all">("all");
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

    const joined = (productPrices as ProductPriceRow[] | null ?? []).map((priceRow) => {
      const product = productMap.get(priceRow.product_id);

      return {
        product_id: priceRow.product_id,
        lista_precio_id: priceRow.lista_precio_id,
        lista_price: Number(priceRow.price ?? 0),
        base_price: Number(product?.price ?? 0),
        name: product?.name ?? "Producto sin nombre",
        sku: product?.sku ?? "-",
        category: product?.category ?? "-",
      } satisfies JoinedRow;
    });

    setRows(joined);
    setLoading(false);
  }

  const listIds = useMemo(() => {
    return Array.from(new Set(rows.map((row) => row.lista_precio_id))).sort((a, b) => a - b);
  }, [rows]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesList = selectedListId === "all" || row.lista_precio_id === selectedListId;
      const matchesSearch =
        term.length === 0 || row.name.toLowerCase().includes(term) || row.sku.toLowerCase().includes(term);

      return matchesList && matchesSearch;
    });
  }, [rows, selectedListId, search]);

  const summary = useMemo(() => {
    const distinctProducts = new Set(filteredRows.map((row) => row.product_id)).size;
    const avgPrice =
      filteredRows.length > 0
        ? filteredRows.reduce((acc, row) => acc + Number(row.lista_price ?? 0), 0) / filteredRows.length
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
          <div className="relative md:w-72">
            <ListFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select
              value={selectedListId}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedListId(value === "all" ? "all" : Number(value));
              }}
              className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-black"
            >
              <option value="all">Todas las listas</option>
              {listIds.map((listId) => (
                <option key={listId} value={listId}>
                  Lista {listId}
                </option>
              ))}
            </select>
          </div>

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
          <div className="overflow-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm table-fixed">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left w-24">Lista</th>
                  <th className="px-4 py-3 text-left w-56">SKU</th>
                  <th className="px-4 py-3 text-left">Producto</th>
                  <th className="px-4 py-3 text-left w-44">Categoría</th>
                  <th className="px-4 py-3 text-right w-36">Precio Lista</th>
                  <th className="px-4 py-3 text-right w-36">Precio Base</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={`${row.lista_precio_id}-${row.product_id}`} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium">{row.lista_precio_id}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono truncate" title={row.sku}>{row.sku}</td>
                    <td className="px-4 py-3 text-gray-900 truncate" title={row.name}>{row.name}</td>
                    <td className="px-4 py-3 text-gray-600 truncate" title={row.category}>{row.category}</td>
                    <td className="px-4 py-3 text-right font-semibold">${row.lista_price.toLocaleString("es-AR")}</td>
                    <td className="px-4 py-3 text-right text-gray-600">${row.base_price.toLocaleString("es-AR")}</td>
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                      No hay resultados para los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
