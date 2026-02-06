"use client";

import { usePathname } from "next/navigation";

export default function AdminHeader({ userEmail, role }: { userEmail?: string, role?: string }) {
    const pathname = usePathname();

    const getPageTitle = () => {
        if (pathname === "/admin") return "Dashboard General";
        if (pathname.includes("/stock")) return "Gestión de Inventario";
        if (pathname.includes("/pedidos")) return "Control de Pedidos";
        return "Panel de Administración";
    };

    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-40">
            <div>
                <h1 className="text-lg font-bold text-gray-900">{getPageTitle()}</h1>
                <p className="text-xs text-gray-500 font-medium tracking-wide hidden md:block">CARPI OFFICIAL STORE</p>
            </div>

            <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold text-gray-900">{userEmail}</p>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {role}
                    </span>
                </div>
                <div className="h-8 w-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs">
                    {userEmail?.[0].toUpperCase()}
                </div>
            </div>
        </header>
    );
}
