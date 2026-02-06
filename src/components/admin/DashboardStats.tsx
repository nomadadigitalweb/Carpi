import { createClient } from "@/utils/supabase/server";
import { Package, TrendingUp, AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function DashboardStats() {
    const supabase = await createClient();

    // Fetch stats in parallel for speed
    const [productsCount, ordersCount, lowStockCount] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }).lt('stock', 5)
    ]);

    const stats = [
        {
            label: "Productos Totales",
            value: productsCount.count || 0,
            icon: Package,
            color: "bg-blue-500",
            href: "/admin/stock"
        },
        {
            label: "Órdenes Activas",
            value: ordersCount.count || 0,
            icon: TrendingUp,
            color: "bg-green-500",
            href: "/admin/pedidos"
        },
        {
            label: "Bajo Stock",
            value: lowStockCount.count || 0,
            icon: AlertTriangle,
            color: "bg-amber-500",
            href: "/admin/stock"
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {stats.map((stat, i) => (
                <Link
                    key={i}
                    href={stat.href}
                    className="group bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">{stat.label}</p>
                            <h3 className="text-3xl font-bold text-gray-900">{stat.value}</h3>
                        </div>
                        <div className={`${stat.color} p-3 rounded-lg text-white shadow-lg group-hover:scale-110 transition-transform`}>
                            <stat.icon size={20} strokeWidth={2.5} />
                        </div>
                    </div>

                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-50 group-hover:bg-gray-100 transition-colors">
                        <div className={`h-full ${stat.color} opacity-20`} style={{ width: '40%' }}></div>
                    </div>

                    <div className="mt-4 flex items-center text-xs font-semibold text-gray-400 group-hover:text-gray-600 transition-colors">
                        Ver detalles <ArrowRight size={14} className="ml-1" />
                    </div>
                </Link>
            ))}
        </div>
    );
}
