"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, ShoppingBag, Users, LogOut } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

const links = [
  { href: "/dashboard", label: "Resumen", icon: LayoutDashboard },
  { href: "/dashboard/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/dashboard/equipo", label: "Equipo", icon: Users },
];

export default function FabricanteSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const onLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-zinc-900 text-white border-r border-white/5 z-50 flex flex-col">
      <div className="h-16 px-6 flex items-center border-b border-white/5">
        <Link href="/dashboard" className="text-xs tracking-[0.2em] font-bold text-zinc-300">
          FABRICANTE
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                active ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
        >
          <LogOut size={18} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
