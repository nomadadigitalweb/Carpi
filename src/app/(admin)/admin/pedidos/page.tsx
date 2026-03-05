"use client";

import { useEffect, useState } from "react";
import { Truck, Package, Clock, CheckCircle, Search, Save } from "lucide-react";

const ORDER_STATUS_OPTIONS = [
    { value: 'pendiente_fabricante', label: 'Pendiente fabricante' },
    { value: 'aprobado', label: 'Aprobado' },
    { value: 'facturado', label: 'Facturado' },
    { value: 'pagado', label: 'Pagado' },
    { value: 'rechazado', label: 'Rechazado' },
    { value: 'cancelado', label: 'Cancelado' },
];

const SHIPPING_STATUS_OPTIONS = [
    { value: 'preparando', label: 'Preparando' },
    { value: 'despachado', label: 'Despachado' },
    { value: 'entregado', label: 'Entregado' },
];

function shortErrorMessage(message: string | undefined, fallback: string): string {
    if (!message) return fallback;
    const compact = message.replace(/\s+/g, ' ').trim();
    return compact.length > 220 ? `${compact.slice(0, 220)}...` : compact;
}

export default function OrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
    const [updatingShippingId, setUpdatingShippingId] = useState<string | null>(null);
    const [invoicingId, setInvoicingId] = useState<string | null>(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    async function fetchOrders() {
        setLoading(true);
        const response = await fetch('/api/admin/orders', { cache: 'no-store' });
        const payload = (await response.json()) as { orders?: any[]; error?: string };

        if (response.ok && payload.orders) {
            setOrders(payload.orders);
        } else {
            setOrders([]);
            console.error(payload.error ?? 'No se pudieron cargar pedidos');
        }
        setLoading(false);
    }

    async function handleUpdateTracking(id: string, tracking_number: string) {
        setUpdatingId(id);
        const response = await fetch(`/api/admin/orders/${id}/tracking`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ tracking_number }),
        });

        const payload = (await response.json()) as { ok?: boolean; error?: string };

        if (response.ok && payload.ok) {
            setOrders(prev => prev.map(o => o.id === id ? { ...o, tracking_number, status_envio: 'despachado' } : o));
        } else {
            alert(payload.error ?? 'No se pudo actualizar tracking');
        }
        setUpdatingId(null);
    }

    async function handleUpdateShippingStatus(id: string, status_envio: string) {
        setUpdatingShippingId(id);
        const response = await fetch(`/api/admin/orders/${id}/tracking`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status_envio }),
        });

        const payload = (await response.json()) as { ok?: boolean; error?: string };

        if (response.ok && payload.ok) {
            setOrders(prev => prev.map(o => o.id === id ? { ...o, status_envio } : o));
        } else {
            alert(payload.error ?? 'No se pudo actualizar estado de envío');
        }

        setUpdatingShippingId(null);
    }

    async function handleUpdateOrderStatus(id: string, status: string) {
        setUpdatingStatusId(id);

        const response = await fetch(`/api/admin/orders/${id}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status }),
        });

        const payload = (await response.json()) as { ok?: boolean; error?: string };

        if (response.ok && payload.ok) {
            setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
        } else {
            alert(payload.error ?? 'No se pudo actualizar el estado');
        }

        setUpdatingStatusId(null);
    }

    async function handleEmitInvoice(id: string) {
        setInvoicingId(id);

        const response = await fetch(`/api/admin/orders/${id}/invoice`, {
            method: 'POST',
        });

        const payload = (await response.json()) as { ok?: boolean; error?: string };

        if (response.ok && payload.ok) {
            setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'facturado' } : o));
            alert('Factura emitida en Xubio y email enviado al fabricante con datos bancarios.');
        } else {
            alert(shortErrorMessage(payload.error, 'No se pudo emitir la factura'));
        }

        setInvoicingId(null);
    }

    const filteredOrders = orders.filter(o =>
        o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.user_id ?? '').toLowerCase().includes(searchTerm.toLowerCase())
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
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Estado Pedido</p>
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        className="bg-gray-50 border border-gray-200 px-2 py-1 text-[10px] font-bold uppercase tracking-wider"
                                                        value={order.status ?? 'pendiente_fabricante'}
                                                        onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                                                        disabled={updatingStatusId === order.id}
                                                    >
                                                        {ORDER_STATUS_OPTIONS.map((option) => (
                                                            <option key={option.value} value={option.value}>
                                                                {option.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {updatingStatusId === order.id && (
                                                        <div className="animate-spin h-3 w-3 border-b-2 border-black" />
                                                    )}
                                                </div>
                                            </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Estado</p>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {order.status_envio === 'preparando' && <Clock className="w-3 h-3 text-orange-500" />}
                                                {order.status_envio === 'despachado' && <Truck className="w-3 h-3 text-blue-500" />}
                                                {order.status_envio === 'entregado' && <CheckCircle className="w-3 h-3 text-green-500" />}
                                                <span className="text-[10px] font-bold uppercase tracking-widest">{order.status_envio}</span>
                                                <select
                                                    className="bg-gray-50 border border-gray-200 px-2 py-1 text-[10px] font-bold uppercase tracking-wider"
                                                    value={order.status_envio ?? 'preparando'}
                                                    onChange={(e) => handleUpdateShippingStatus(order.id, e.target.value)}
                                                    disabled={updatingShippingId === order.id}
                                                >
                                                    {SHIPPING_STATUS_OPTIONS.map((option) => (
                                                        <option key={option.value} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </select>
                                                {updatingShippingId === order.id && (
                                                    <div className="animate-spin h-3 w-3 border-b-2 border-black" />
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Total</p>
                                            <p className="text-sm font-bold">${Number(order.total).toLocaleString('es-AR')}</p>
                                        </div>
                                    </div>

                                    <button
                                        className="text-[10px] mt-1 px-3 py-2 border border-black text-black font-bold uppercase tracking-wider hover:bg-black hover:text-white transition-colors disabled:opacity-50"
                                        onClick={() => handleEmitInvoice(order.id)}
                                        disabled={invoicingId === order.id || order.status === 'facturado'}
                                    >
                                        {invoicingId === order.id ? 'Emitiendo...' : order.status === 'facturado' ? 'Factura emitida' : 'Emitir factura'}
                                    </button>
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
                                    <p className="text-[8px] text-gray-400 mt-2 uppercase tracking-tight italic">Puedes cambiar el estado de envío manualmente desde el selector.</p>
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
