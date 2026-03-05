"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Footer from "@/components/Footer";
import { useCart } from "@/context/CartContext";
import { trackProductView } from "@/lib/analytics";
import { createClient } from "@/utils/supabase/client";
import { ArrowLeft, Check, ShieldCheck, ShoppingBag, Truck } from "lucide-react";

type ProductDetailView = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  category: string | null;
  stock: number;
  display_price: number;
};

export default function ProductDetailClient({ product }: { product: ProductDetailView }) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);
  const [canOrder, setCanOrder] = useState(false);

  useEffect(() => {
    trackProductView(product.id);
  }, [product.id]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setCanOrder(Boolean(data.user));
    });
  }, []);

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.display_price,
      image: product.image_url ?? "/images/prod/fenix.jpg",
      quantity: 1,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="min-h-screen bg-white pt-24 text-black">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-black mb-12 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div className="space-y-4">
            <div className="aspect-[4/5] bg-gray-100 overflow-hidden">
              <img
                src={product.image_url || "/images/prod/fenix.jpg"}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="flex flex-col">
            <div className="mb-8">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400 block mb-2">{product.category}</span>
              <h1 className="text-3xl md:text-5xl font-extrabold uppercase tracking-tighter mb-4">{product.name}</h1>
              <p className="text-2xl font-light">${Number(product.display_price).toLocaleString("es-AR")}</p>
            </div>

            <div className="prose prose-sm text-gray-600 mb-10 max-w-none">
              <p className="whitespace-pre-wrap">{product.description || "No hay descripción disponible para este producto."}</p>
            </div>

            <div className="space-y-6 mb-12">
              <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
                <Truck className="w-5 h-5 text-gray-400" />
                <span>Envío a todo el país</span>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
                <ShieldCheck className="w-5 h-5 text-gray-400" />
                <span>Garantía oficial Carpi</span>
              </div>
            </div>

            <div className="mt-auto">
              {canOrder ? (
                <button
                  onClick={handleAddToCart}
                  disabled={product.stock <= 0}
                  className={`w-full py-5 text-xs font-bold uppercase tracking-[0.3em] transition-all duration-500 flex items-center justify-center gap-3 ${
                    added ? "bg-green-600 text-white" : "bg-black text-white hover:bg-gray-800"
                  } disabled:bg-gray-200 disabled:text-gray-400`}
                >
                  {added ? (
                    <>
                      <Check className="w-5 h-5" />
                      Agregado
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-5 h-5" />
                      {product.stock > 0 ? "Agregar al pedido" : "Sin stock"}
                    </>
                  )}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
