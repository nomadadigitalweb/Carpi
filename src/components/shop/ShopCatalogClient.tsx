"use client";

import { useEffect, useMemo, useState } from "react";
import Footer from "@/components/Footer";
import { useCart } from "@/context/CartContext";
import { createClient } from "@/utils/supabase/client";
import { Filter, ShoppingBag } from "lucide-react";

type ProductView = {
  id: string;
  name: string;
  image_url: string | null;
  stock: number;
  category: string | null;
  display_price: number;
};

export default function ShopCatalogClient({ products }: { products: ProductView[] }) {
  const { addToCart } = useCart();
  const [filter, setFilter] = useState("Todos");
  const [canOrder, setCanOrder] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setCanOrder(Boolean(data.user));
    });
  }, []);

  const categories = useMemo(
    () => ["Todos", ...Array.from(new Set(products.map((product) => product.category).filter((category): category is string => Boolean(category))))],
    [products]
  );

  const filteredProducts = useMemo(
    () => (filter === "Todos" ? products : products.filter((product) => product.category === filter)),
    [products, filter]
  );

  return (
    <div className="min-h-screen bg-white pt-24 text-black">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400">Colección Carpi</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold uppercase tracking-tighter">Tienda de Pedidos</h1>
          </div>

          <div className="flex items-center gap-4 overflow-x-auto pb-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`text-[10px] font-bold uppercase tracking-widest whitespace-nowrap px-4 py-2 border transition-all ${
                  filter === cat ? "bg-black text-white border-black" : "text-gray-500 border-gray-200 hover:border-black"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16">
          {filteredProducts.map((product) => (
            <div key={product.id} className="group flex flex-col h-full">
              <a href={`/tienda/${product.id}`} className="block relative aspect-[4/5] bg-gray-100 overflow-hidden mb-6">
                <img
                  src={product.image_url || "/images/prod/fenix.jpg"}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                {product.stock <= 0 && (
                  <div className="absolute top-4 left-4 bg-black text-white px-3 py-1 text-[8px] font-bold uppercase tracking-widest">
                    Agotado
                  </div>
                )}
              </a>

              <div className="flex-grow flex flex-col">
                <div className="flex justify-between items-start mb-2 gap-3">
                  <h2 className="text-sm font-bold uppercase tracking-tight group-hover:text-gray-600 transition-colors">
                    {product.name}
                  </h2>
                  <span className="text-sm font-medium whitespace-nowrap">
                    ${Number(product.display_price).toLocaleString("es-AR")}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-medium mb-4">{product.category}</p>

                {canOrder ? (
                  <button
                    onClick={() =>
                      addToCart({
                        id: product.id,
                        name: product.name,
                        price: product.display_price,
                        image: product.image_url ?? "/images/prod/fenix.jpg",
                        quantity: 1,
                      })
                    }
                    disabled={product.stock <= 0}
                    className="mt-auto w-full py-3 border border-black text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-black hover:text-white transition-all duration-300 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-black flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    Agregar al pedido
                  </button>
                ) : (
                  <p className="mt-auto text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold py-3 border border-gray-200 text-center">
                    Inicia sesión para armar pedidos
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="h-64 flex flex-col items-center justify-center text-gray-400">
            <ShoppingBag className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-xs uppercase tracking-widest font-bold">No se encontraron productos</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
