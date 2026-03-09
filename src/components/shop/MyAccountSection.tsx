"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createOrderFromCart } from "@/actions/orders";
import { useSupabaseProfile } from "@/hooks/useSupabaseProfile";
import { CheckCircle, Clock, LogOut, Package, Search, Truck, User } from "lucide-react";

type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  stock: number;
};

type ProductPriceRow = {
  product_id: string;
  price: number;
};

type OrderRow = {
  id: string;
  user_id: string;
  total: number;
  status: string;
  created_at: string;
  tracking_number: string | null;
};

type SelectedItem = {
  productId: string;
  name: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
};

type TeamUser = {
  id: string;
  email: string | null;
};

function statusBadge(status: string) {
  if (status === "pagado") return <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1"><CheckCircle size={10} /> Pagado</span>;
  if (status === "facturado") return <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1"><Truck size={10} /> Facturado</span>;
  if (status === "pendiente_fabricante" || status === "aprobado") return <span className="bg-orange-100 text-orange-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1"><Clock size={10} /> En proceso</span>;
  if (status === "rechazado") return <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Rechazado</span>;
  return <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">{status}</span>;
}

export default function MyAccountSection() {
  const router = useRouter();
  const { supabase, userId, profile, parentProfile, loading, error } = useSupabaseProfile();

  const [allProducts, setAllProducts] = useState<ProductRow[]>([]);
  const [priceByProduct, setPriceByProduct] = useState<Map<string, number>>(new Map());
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  const [search, setSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [includeTeamOrders, setIncludeTeamOrders] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const listaPrecioId = parentProfile?.lista_precio_id ?? null;

  useEffect(() => {
    if (!loading && !userId) {
      router.push("/login?next=/mi-cuenta");
    }
  }, [loading, userId, router]);

  useEffect(() => {
    async function fetchProductsAndPrices() {
      if (!userId) return;

      const { data: products } = await supabase
        .from("products")
        .select("id,name,sku,price,stock")
        .eq("publication_status", "published")
        .order("name", { ascending: true });

      const normalizedProducts = (products ?? []).map((product) => ({
        id: product.id,
        name: product.name,
        sku: (product as { sku?: string | null }).sku ?? null,
        price: Number(product.price ?? 0),
        stock: Number(product.stock ?? 0),
      }));

      setAllProducts(normalizedProducts);

      if (!listaPrecioId) {
        setPriceByProduct(new Map());
        return;
      }

      const productIds = normalizedProducts.map((product) => product.id);
      if (!productIds.length) {
        setPriceByProduct(new Map());
        return;
      }

      const { data: priceRows } = await supabase
        .from("product_prices")
        .select("product_id,price")
        .eq("lista_precio_id", listaPrecioId)
        .in("product_id", productIds);

      const map = new Map<string, number>();
      (priceRows as ProductPriceRow[] | null)?.forEach((row) => {
        map.set(row.product_id, Number(row.price ?? 0));
      });

      setPriceByProduct(map);
    }

    fetchProductsAndPrices();
  }, [supabase, userId, listaPrecioId]);

  const fetchOrders = useMemo(
    () => async () => {
      if (!userId || !profile) return;

      if (includeTeamOrders && profile.can_view_team_orders && profile.parent_id) {
        const { data: teamProfiles } = await supabase
          .from("profiles")
          .select("id,email")
          .eq("parent_id", profile.parent_id)
          .order("email", { ascending: true });

        const users = (teamProfiles ?? []) as TeamUser[];
        setTeamUsers(users);

        const userIds = users.map((row) => row.id);
        if (!userIds.includes(userId)) userIds.push(userId);

        const { data: rows } = await supabase
          .from("orders")
          .select("id,user_id,total,status,created_at,tracking_number")
          .in("user_id", userIds)
          .order("created_at", { ascending: false })
          .limit(30);

        setOrders((rows ?? []) as OrderRow[]);
      } else {
        setTeamUsers([]);
        const { data: rows } = await supabase
          .from("orders")
          .select("id,user_id,total,status,created_at,tracking_number")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(30);

        setOrders((rows ?? []) as OrderRow[]);
      }
    },
    [includeTeamOrders, profile, supabase, userId]
  );

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const productSuggestions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];

    return allProducts
      .filter((product) => product.name.toLowerCase().includes(term) || (product.sku ?? "").toLowerCase().includes(term))
      .slice(0, 8);
  }, [allProducts, search]);

  const selectedProduct = useMemo(
    () => allProducts.find((product) => product.id === selectedProductId) ?? null,
    [allProducts, selectedProductId]
  );

  const addSelectedItem = () => {
    if (!selectedProduct) return;

    const listaPrice = priceByProduct.get(selectedProduct.id);
    const unitPrice = listaPrice ?? Number(selectedProduct.price ?? 0);

    setSelectedItems((prev) => {
      const existing = prev.find((item) => item.productId === selectedProduct.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === selectedProduct.id ? { ...item, quantity: item.quantity + Math.max(1, quantity), unitPrice } : item
        );
      }

      return [
        ...prev,
        {
          productId: selectedProduct.id,
          name: selectedProduct.name,
          sku: selectedProduct.sku,
          quantity: Math.max(1, quantity),
          unitPrice,
        },
      ];
    });

    setSearch("");
    setSelectedProductId("");
    setQuantity(1);
  };

  const updateItemQuantity = (productId: string, nextQuantity: number) => {
    const quantityValue = Math.max(1, nextQuantity);
    setSelectedItems((prev) => prev.map((item) => (item.productId === productId ? { ...item, quantity: quantityValue } : item)));
  };

  const removeSelectedItem = (productId: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  const selectedTotal = selectedItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);

  const onSendOrder = () => {
    setSubmitError(null);
    setSubmitSuccess(null);

    if (selectedItems.length === 0) {
      setSubmitError("Agrega al menos un producto antes de enviar el pedido.");
      return;
    }

    startTransition(async () => {
      try {
        const orderId = await createOrderFromCart(
          selectedItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          }))
        );

        setSelectedItems([]);
        setSubmitSuccess(`Pedido #${orderId.slice(0, 8)} enviado para aprobación.`);
        await fetchOrders();
      } catch (caughtError) {
        setSubmitError(caughtError instanceof Error ? caughtError.message : "No se pudo enviar el pedido.");
      }
    });
  };

  const teamUserNameById = useMemo(() => {
    const map = new Map<string, string>();
    teamUsers.forEach((user) => {
      map.set(user.id, user.email || user.id);
    });
    return map;
  }, [teamUsers]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
      </div>
    );
  }

  if (!userId || !profile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-md w-full border border-gray-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-bold uppercase tracking-tight">No pudimos cargar tu cuenta</h2>
          <p className="text-sm text-gray-600 mt-2">
            Iniciá sesión nuevamente para continuar.
          </p>
          {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
          <button
            type="button"
            onClick={() => router.push("/login?next=/mi-cuenta")}
            className="mt-5 px-4 py-2.5 rounded-lg bg-black text-white text-sm font-semibold hover:bg-zinc-800"
          >
            Ir a Ingresar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pb-20">
      <div className="bg-zinc-900 text-white pt-32 pb-12 px-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-extrabold uppercase tracking-tighter mb-2">Mi Cuenta</h1>
          <div className="flex items-center gap-2 text-zinc-400 text-sm">
            <User size={16} />
            <span>{profile.email}</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-8 space-y-8">
        <section className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h2 className="text-lg font-bold uppercase tracking-tight">Estado del Usuario</h2>
              <p className="text-sm text-gray-500">Perfil y vínculo con fabricante para cálculo de precios.</p>
            </div>
            <form action="/auth/signout" method="post">
              <button className="text-xs font-bold uppercase tracking-widest text-red-500 hover:text-red-700 flex items-center gap-2">
                <LogOut size={14} /> Cerrar Sesión
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5 text-sm">
            <div className="bg-gray-50 rounded p-3">
              <p className="text-gray-500">Rol</p>
              <p className="font-semibold">{profile.role}</p>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <p className="text-gray-500">Fabricante (parent_id)</p>
              <p className="font-mono text-xs break-all">{profile.parent_id ?? "No asignado"}</p>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <p className="text-gray-500">Lista de precio fabricante</p>
              <p className="font-semibold">{parentProfile?.lista_precio_id ?? "No configurada"}</p>
            </div>
          </div>
          {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
        </section>

        <section className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-lg font-bold uppercase tracking-tight">Pedido Rápido</h2>
            <p className="text-sm text-gray-500">Busca productos sincronizados desde Xubio y arma tu pedido.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] gap-3 items-start">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setSelectedProductId("");
                }}
                placeholder="Buscar por nombre o SKU..."
                className="w-full border border-gray-300 rounded-lg py-2.5 pl-9 pr-3 text-sm outline-none focus:border-black"
              />

              {productSuggestions.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-auto">
                  {productSuggestions.map((product) => {
                    const listaPrice = priceByProduct.get(product.id);
                    const unitPrice = listaPrice ?? Number(product.price ?? 0);
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => {
                          setSelectedProductId(product.id);
                          setSearch(product.name);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <p className="text-sm font-medium">{product.name}</p>
                        <p className="text-xs text-gray-500">SKU: {product.sku ?? "-"} · ${unitPrice.toLocaleString("es-AR")}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value || 1))}
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm w-full lg:w-24"
            />

            <button
              type="button"
              onClick={addSelectedItem}
              disabled={!selectedProductId}
              className="px-4 py-2.5 rounded-lg bg-black text-white text-sm font-semibold hover:bg-zinc-800 disabled:opacity-40"
            >
              Agregar
            </button>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
                <tr>
                  <th className="text-left px-3 py-2">Producto</th>
                  <th className="text-right px-3 py-2">Precio Lista</th>
                  <th className="text-right px-3 py-2">Cantidad</th>
                  <th className="text-right px-3 py-2">Subtotal</th>
                  <th className="text-right px-3 py-2">Acción</th>
                </tr>
              </thead>
              <tbody>
                {selectedItems.map((item) => (
                  <tr key={item.productId} className="border-t border-gray-100">
                    <td className="px-3 py-2">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.sku ?? "-"}</p>
                    </td>
                    <td className="px-3 py-2 text-right">${item.unitPrice.toLocaleString("es-AR")}</td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(event) => updateItemQuantity(item.productId, Number(event.target.value || 1))}
                        className="border border-gray-300 rounded px-2 py-1 w-20 text-right"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">${(item.unitPrice * item.quantity).toLocaleString("es-AR")}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => removeSelectedItem(item.productId)} className="text-xs text-red-600 font-semibold hover:text-red-700">
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
                {selectedItems.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                      No hay ítems seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <p className="text-sm text-gray-600">
              Total estimado: <span className="font-bold text-black">${selectedTotal.toLocaleString("es-AR")}</span>
            </p>
            <button
              type="button"
              onClick={onSendOrder}
              disabled={isPending || selectedItems.length === 0}
              className="px-5 py-2.5 rounded-lg bg-black text-white text-sm font-semibold hover:bg-zinc-800 disabled:opacity-40"
            >
              {isPending ? "Enviando..." : "Enviar Pedido para Aprobación"}
            </button>
          </div>

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          {submitSuccess && <p className="text-sm text-green-600">{submitSuccess}</p>}
        </section>

        <section className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold uppercase tracking-tight flex items-center gap-2">
                <Package className="w-5 h-5" /> Historial de Pedidos
              </h2>
              <p className="text-sm text-gray-500">Últimos pedidos por usuario.</p>
            </div>

            {profile.can_view_team_orders && (
              <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={includeTeamOrders}
                  onChange={(event) => setIncludeTeamOrders(event.target.checked)}
                />
                Ver pedidos del equipo
              </label>
            )}
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
                <tr>
                  <th className="text-left px-3 py-2">Pedido</th>
                  {includeTeamOrders && <th className="text-left px-3 py-2">Usuario</th>}
                  <th className="text-left px-3 py-2">Estado</th>
                  <th className="text-right px-3 py-2">Total</th>
                  <th className="text-left px-3 py-2">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-mono text-xs">#{order.id.slice(0, 8)}</td>
                    {includeTeamOrders && (
                      <td className="px-3 py-2">{teamUserNameById.get(order.user_id) ?? (order.user_id === userId ? "Mi usuario" : order.user_id)}</td>
                    )}
                    <td className="px-3 py-2">{statusBadge(order.status)}</td>
                    <td className="px-3 py-2 text-right font-semibold">${Number(order.total).toLocaleString("es-AR")}</td>
                    <td className="px-3 py-2 text-gray-500">{new Date(order.created_at).toLocaleDateString("es-AR")}</td>
                  </tr>
                ))}
                {!orders.length && (
                  <tr>
                    <td colSpan={includeTeamOrders ? 5 : 4} className="px-3 py-8 text-center text-gray-500">
                      Aún no hay pedidos para mostrar. <Link href="/tienda" className="underline font-semibold">Ir a la tienda</Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
