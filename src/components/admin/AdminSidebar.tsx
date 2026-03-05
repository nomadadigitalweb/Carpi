"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, ShoppingBag, LayoutDashboard, RefreshCw, LogOut, FileText, BarChart3, Megaphone, Users } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function AdminSidebar({ role }: { role?: string }) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
    };

    const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

    return (
        <aside className="fixed left-0 top-0 h-full w-64 bg-zinc-900 text-white flex flex-col border-r border-white/5 z-50">
            {/* Logo Area */}
            <div className="h-16 flex items-center px-6 border-b border-white/5">
                <Link href="/" className="flex items-center gap-3 group">
                    <img src="/images/carpi.png" alt="Carpi" className="h-6 brightness-0 invert opacity-80 group-hover:opacity-100 transition-opacity" />
                    <span className="text-xs font-bold tracking-[0.2em] text-zinc-400 group-hover:text-white transition-colors">ADMIN</span>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-3 space-y-1">
                <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Principal</p>

                <Link
                    href="/admin"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${pathname === "/admin"
                        ? "bg-white/10 text-white"
                        : "text-zinc-400 hover:bg-white/5 hover:text-white"
                        }`}
                >
                    <LayoutDashboard size={18} />
                    <span>Dashboard</span>
                </Link>

                {(role === 'encargado_ventas' || role === 'admin_carpi') && (
                    <Link
                        href="/admin/stock"
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive("/admin/stock")
                            ? "bg-white/10 text-white"
                            : "text-zinc-400 hover:bg-white/5 hover:text-white"
                            }`}
                    >
                        <Package size={18} />
                        <span>Inventario</span>
                    </Link>
                )}

                {(role === 'encargado_ventas' || role === 'gestor_financiero' || role === 'admin_carpi') && (
                    <Link
                        href="/admin/pedidos"
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive("/admin/pedidos")
                            ? "bg-white/10 text-white"
                            : "text-zinc-400 hover:bg-white/5 hover:text-white"
                            }`}
                    >
                        <ShoppingBag size={18} />
                        <span>Pedidos</span>
                    </Link>
                )}

                {(role === 'encargado_ventas' || role === 'gestor_financiero' || role === 'admin_carpi') && (
                    <Link
                        href="/admin/sync"
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive("/admin/sync")
                            ? "bg-white/10 text-white"
                            : "text-zinc-400 hover:bg-white/5 hover:text-white"
                            }`}
                    >
                        <RefreshCw size={18} />
                        <span>Sync Xubio</span>
                    </Link>
                )}

                {(role === 'encargado_ventas' || role === 'admin_carpi') && (
                    <Link
                        href="/admin/blog"
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive("/admin/blog")
                            ? "bg-white/10 text-white"
                            : "text-zinc-400 hover:bg-white/5 hover:text-white"
                            }`}
                    >
                        <FileText size={18} />
                        <span>Blog</span>
                    </Link>
                )}

                {role === 'admin_carpi' && (
                    <Link
                        href="/admin/usuarios"
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive("/admin/usuarios")
                            ? "bg-white/10 text-white"
                            : "text-zinc-400 hover:bg-white/5 hover:text-white"
                            }`}
                    >
                        <Users size={18} />
                        <span>Usuarios</span>
                    </Link>
                )}

                <p className="px-3 pt-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Marketing</p>

                {(role === 'encargado_ventas' || role === 'gestor_financiero' || role === 'admin_carpi') && (
                    <Link
                        href="/admin/analytics"
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive("/admin/analytics")
                            ? "bg-white/10 text-white"
                            : "text-zinc-400 hover:bg-white/5 hover:text-white"
                            }`}
                    >
                        <BarChart3 size={18} />
                        <span>Análisis de Datos</span>
                    </Link>
                )}

                {(role === 'encargado_ventas' || role === 'gestor_financiero' || role === 'admin_carpi') && (
                    <Link
                        href="/admin/campanas-marketing"
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive("/admin/campanas-marketing")
                            ? "bg-white/10 text-white"
                            : "text-zinc-400 hover:bg-white/5 hover:text-white"
                            }`}
                    >
                        <Megaphone size={18} />
                        <span>Campañas Marketing</span>
                    </Link>
                )}
            </nav>

            {/* Footer / Logout */}
            <div className="p-4 border-t border-white/5">
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
                >
                    <LogOut size={18} />
                    <span>Cerrar Sesión</span>
                </button>
            </div>
        </aside>
    );
}
