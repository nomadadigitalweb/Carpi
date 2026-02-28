"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createOrderFromCart } from "@/actions/orders";
import { useCart } from "@/context/CartContext";
import { trackCheckout } from "@/lib/analytics";

export default function CheckoutPage() {
  const { cart, totalPrice, clearCart } = useCart();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hasItems = cart.length > 0;
  const lines = useMemo(() => cart.map((item) => ({ productId: item.id, quantity: item.quantity })), [cart]);

  // Track checkout page load
  useEffect(() => {
    if (hasItems) {
      trackCheckout(cart.reduce((a, i) => a + i.quantity, 0), totalPrice);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onConfirmOrder = () => {
    setError(null);

    startTransition(async () => {
      try {
        const orderId = await createOrderFromCart(lines);
        clearCart();
        router.push(`/mi-cuenta?pedido=${orderId}`);
      } catch (orderError) {
        setError(orderError instanceof Error ? orderError.message : "No se pudo generar el pedido.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-white pt-28 pb-16 px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold uppercase tracking-tighter">Confirmar pedido</h1>
          <p className="text-gray-500 mt-2">Los pedidos se envían al fabricante y quedan pendientes de aprobación.</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Producto</th>
                <th className="px-4 py-3 text-right">Cantidad</th>
                <th className="px-4 py-3 text-right">Unitario</th>
                <th className="px-4 py-3 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item) => (
                <tr key={item.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3 text-right">{item.quantity}</td>
                  <td className="px-4 py-3 text-right">${Number(item.price).toLocaleString("es-AR")}</td>
                  <td className="px-4 py-3 text-right font-semibold">${Number(item.price * item.quantity).toLocaleString("es-AR")}</td>
                </tr>
              ))}
              {!hasItems && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    Tu carrito está vacío.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 font-bold">Total estimado</p>
            <p className="text-2xl font-bold">${Number(totalPrice).toLocaleString("es-AR")}</p>
          </div>

          <div className="flex gap-3">
            <Link href="/tienda" className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold hover:bg-gray-100">
              Seguir comprando
            </Link>
            <button
              onClick={onConfirmOrder}
              disabled={!hasItems || isPending}
              className="px-5 py-2 rounded-lg bg-black text-white text-sm font-semibold hover:bg-zinc-800 disabled:opacity-40"
            >
              {isPending ? "Generando..." : "Confirmar pedido"}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
