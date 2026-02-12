"use client";

import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import { ShoppingBag, ArrowLeft, Check, ShieldCheck, Truck } from "lucide-react";

export default function ProductDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [added, setAdded] = useState(false);
    const { addToCart } = useCart();

    useEffect(() => {
        async function fetchProduct() {
            if (!id) return;
            setLoading(true);
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('id', id)
                .single();

            if (data) setProduct(data);
            setLoading(false);
        }
        fetchProduct();
    }, [id]);

    const handleAddToCart = () => {
        addToCart({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image_url,
            quantity: 1
        });
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
    );

    if (!product) return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6">
            <h1 className="text-2xl font-bold mb-4 uppercase tracking-tighter">Producto no encontrado</h1>
            <button onClick={() => router.back()} className="text-xs font-bold uppercase underline tracking-widest">Volver a la tienda</button>
        </div>
    );

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
                    {/* Media */}
                    <div className="space-y-4">
                        <div className="aspect-[4/5] bg-gray-100 overflow-hidden">
                            <img
                                src={product.image_url || "/images/prod/fenix.jpg"}
                                alt={product.name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>

                    {/* Info */}
                    <div className="flex flex-col">
                        <div className="mb-8">
                            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400 block mb-2">{product.category}</span>
                            <h1 className="text-3xl md:text-5xl font-extrabold uppercase tracking-tighter mb-4">{product.name}</h1>
                            <p className="text-2xl font-light">${Number(product.price).toLocaleString('es-AR')}</p>
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
                            <button
                                onClick={handleAddToCart}
                                disabled={product.stock <= 0}
                                className={`w-full py-5 text-xs font-bold uppercase tracking-[0.3em] transition-all duration-500 flex items-center justify-center gap-3 ${added
                                    ? "bg-green-600 text-white"
                                    : "bg-black text-white hover:bg-gray-800"
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
                                        {product.stock > 0 ? "Añadir al carrito" : "Sin Stock"}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}
