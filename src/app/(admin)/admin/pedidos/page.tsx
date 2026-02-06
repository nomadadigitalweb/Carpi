"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { Truck, Package, Clock, CheckCircle, Search, Save } from "lucide-react";

export default function OrdersPage() {
    const supabase = createClient();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    async function fetchOrders() {
        setLoading(true);
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (data) setOrders(data);
        setLoading(false);
    }

    async function handleUpdateTracking(id: string, tracking_number: string) {
        setUpdatingId(id);
        const { error } = await supabase
            .from('orders')
            .update({ tracking_number, status: 'shipped' })
            .eq('id', id);

        if (!error) {
            setOrders(prev => prev.map(o => o.id === id ? { ...o, tracking_number, status: 'shipped' } : o));
        }
        setUpdatingId(null);
    }

    const filteredOrders = orders.filter(o =>
        o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.user_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold uppercase tracking-tighter mb-1">Pedidos y Tracking</h1>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Panel de Logística</p>
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar ID de pedido..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 text-xs focus:ring-1 focus:ring-black outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="py-12 flex justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredOrders.map((order) => (
                        <div key={order.id} className="border border-gray-200 p-6 hover:shadow-md transition-shadow bg-white">
                            <div className="flex flex-col lg:flex-row justify-between gap-6">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-100 flex items-center justify-center">
                                            <Package className="w-5 h-5 text-gray-500" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Order ID</p>
                                            <p className="text-xs font-bold font-mono">{order.id.split('-')[0]}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-8">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Estado</p>
                                            <div className="flex items-center gap-2">
                                                {order.status === 'pending' && <Clock className="w-3 h-3 text-orange-500" />}
                                                {order.status === 'shipped' && <Truck className="w-3 h-3 text-blue-500" />}
                                                {order.status === 'delivered' && <CheckCircle className="w-3 h-3 text-green-500" />}
                                                <span className="text-[10px] font-bold uppercase tracking-widest">{order.status}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Total</p>
                                            <p className="text-sm font-bold">${Number(order.total).toLocaleString('es-AR')}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-gray-100 pt-6 lg:pt-0 lg:pl-8">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Tracking Number</p>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Ingresar tracking..."
                                            className="bg-gray-50 border border-gray-200 px-3 py-2 text-xs focus:ring-1 focus:ring-black outline-none w-48"
                                            defaultValue={order.tracking_number}
                                            onBlur={(e) => handleUpdateTracking(order.id, e.target.value)}
                                        />
                                        <button
                                            className="bg-black text-white p-2 hover:bg-gray-800 transition-colors"
                                            onClick={() => {/* El onBlur ya maneja el update, pero esto podria forzarlo */ }}
                                        >
                                            {updatingId === order.id ? <div className="animate-spin h-4 w-4 border-b-2 border-white"></div> : <Save className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <p className="text-[8px] text-gray-400 mt-2 uppercase tracking-tight italic">Al guardar, el estado cambiará a 'Enviado'</p>
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredOrders.length === 0 && (
                        <div className="py-20 text-center text-gray-400 bg-white border border-dashed border-gray-200">
                            <Package className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            <p className="text-[10px] uppercase tracking-widest font-bold">No hay pedidos pendientes</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
