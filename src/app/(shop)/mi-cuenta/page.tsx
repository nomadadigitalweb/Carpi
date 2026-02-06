import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Package, User, LogOut, ChevronRight, Clock, CheckCircle, Truck } from "lucide-react";

export default async function MyAccountPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login?next=/mi-cuenta");
    }

    // Fetch orders
    const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('user_email', user.email) // Assuming user_email is the link, or user_id if available
        .order('created_at', { ascending: false });

    return (
        <div className="bg-white min-h-screen pb-20">
            {/* Header / Banner */}
            <div className="bg-zinc-900 text-white pt-32 pb-12 px-6">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-extrabold uppercase tracking-tighter mb-2">Mi Cuenta</h1>
                    <div className="flex items-center gap-2 text-zinc-400 text-sm">
                        <User size={16} />
                        <span>{user.email}</span>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 -mt-8">
                <div className="bg-white border boundary-gray-200 rounded-lg p-8 shadow-lg mb-12">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
                            <Package className="w-5 h-5" /> Mis Pedidos
                        </h2>

                        <form action="/auth/signout" method="post">
                            <button className="text-xs font-bold uppercase tracking-widest text-red-500 hover:text-red-700 flex items-center gap-2">
                                <LogOut size={14} /> Cerrar Sesión
                            </button>
                        </form>
                    </div>

                    <div className="space-y-6">
                        {(!orders || orders.length === 0) ? (
                            <div className="text-center py-12 border border-dashed border-gray-200 rounded-lg">
                                <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                <p className="text-sm text-gray-500 mb-4">Aún no has realizado pedidos.</p>
                                <Link href="/tienda" className="bg-black text-white px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all">
                                    Ir a la Tienda
                                </Link>
                            </div>
                        ) : (
                            orders.map((order) => (
                                <div key={order.id} className="border border-gray-100 rounded-lg p-6 hover:shadow-md transition-shadow group">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="font-mono text-xs text-gray-500">#{order.id.split('-')[0]}</span>
                                                {order.status_envio === 'entregado' && <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1"><CheckCircle size={10} /> Entregado</span>}
                                                {order.status_envio === 'despachado' && <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1"><Truck size={10} /> En camino</span>}
                                                {order.status_envio === 'preparando' && <span className="bg-orange-100 text-orange-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1"><Clock size={10} /> Preparando</span>}
                                            </div>
                                            <p className="text-xs text-gray-400">
                                                {new Date(order.created_at).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold">${Number(order.total).toLocaleString('es-AR')}</p>
                                            <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400">{order.items?.length || 1} Producto(s)</p>
                                        </div>
                                    </div>

                                    {order.tracking_number && (
                                        <div className="bg-gray-50 p-3 rounded text-xs flex items-center justify-between">
                                            <span className="text-gray-500 font-medium">Tracking Number:</span>
                                            <span className="font-mono font-bold">{order.tracking_number}</span>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
