import { CartProvider } from "@/context/CartContext";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { AnalyticsTracker } from "@/lib/analytics";
import { createClient } from "@/utils/supabase/server";

type AppRole = "admin_carpi" | "gestor_financiero" | "encargado_ventas" | "fabricante" | "usuario";

const staffRoles: AppRole[] = ["admin_carpi", "gestor_financiero", "encargado_ventas"];

export default async function ShopLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    let role: AppRole | null = null;

    if (user) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

        role = (profile?.role as AppRole | undefined) ?? null;
    }

    const isAdminEmail = user?.email?.toLowerCase() === "admin@carpi.com";
    const isStaffUser = (role ? staffRoles.includes(role) : false) || isAdminEmail;
    const isFabricante = role === "fabricante";

    const accountHref = !user
        ? "/login?next=/mi-cuenta"
        : isStaffUser
            ? "/admin"
            : isFabricante
                ? "/dashboard"
                : "/mi-cuenta";

    const accountLabel = !user
        ? "INGRESAR"
        : isStaffUser
            ? "ADMINISTRADOR"
            : isFabricante
                ? "DASHBOARD"
                : "MI CUENTA";

    const navItems: Array<{ label: string; href: string }> = [
        { label: "Productos", href: "/productos" },
        { label: "ADN Italiano", href: "/adn" },
        { label: "Canales de Venta", href: "/venta" },
        { label: "Blog", href: "/blog" },
        { label: "Contacto", href: "/#contact" },
    ];

    return (
        <div className="min-h-screen bg-black selection:bg-white selection:text-black">
            <header className="fixed top-0 left-0 right-0 z-50 grid grid-cols-3 items-center px-8 py-6 bg-black/95 backdrop-blur-sm transition-all duration-300">
                {/* Logo Left */}
                <div className="flex items-center">
                    <Link href="/" className="transition-opacity hover:opacity-70">
                        <img src="/images/carpi.png" alt="Carpi Argentina" className="h-6 md:h-8 w-auto brightness-0 invert" />
                    </Link>
                </div>

                {/* Centered Nav */}
                <nav className="hidden lg:flex items-center justify-center gap-8">
                    {navItems.map((item) => (
                        <Link
                            key={item.label}
                            href={item.href}
                            className="text-[10px] font-medium uppercase tracking-[0.25em] text-white/70 hover:text-white transition-all relative group"
                        >
                            {item.label}
                            <span className="absolute left-0 bottom-[-4px] w-0 h-[1px] bg-white transition-all duration-300 group-hover:w-full"></span>
                        </Link>
                    ))}
                </nav>

                {/* Actions Right */}
                <div className="flex items-center justify-end gap-6 text-white">
                    <Link href="/tienda" className="text-[10px] font-bold uppercase tracking-[0.25em] hover:text-gray-400 transition-colors">Tienda</Link>
                    <Link href="/cart" className="relative group">
                        <ShoppingCart className="w-5 h-5 text-white hover:text-gray-400 transition-colors" />
                        <span className="absolute -top-2 -right-2 bg-white text-black text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">0</span>
                    </Link>
                    <Link
                        href={accountHref}
                        className="text-[10px] font-bold uppercase tracking-[0.3em] hover:text-gray-300 transition-colors border border-white/20 px-6 py-3 hover:bg-white hover:text-black"
                    >
                        {accountLabel}
                    </Link>
                </div>
            </header>
            <AnalyticsTracker />
            <main>
                {children}
            </main>

            <a
                href="https://wa.me/5491124274850"
                target="_blank"
                rel="noopener noreferrer"
                title="Contactar por WhatsApp"
                className="fixed bottom-10 right-10 z-50 bg-[#25D366] p-3 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 group"
            >
                <svg className="w-10 h-10 text-white fill-current group-hover:rotate-12 transition-transform" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.025 3.207l-.694 2.547 2.628-.69c.906.522 1.812.8 2.812.8 3.178 0 5.767-2.587 5.768-5.766 0-3.181-2.587-5.764-5.767-5.764zm3.336 8.092c-.144.405-.838.74-1.15.795-.295.053-.665.088-1.077-.044-.265-.084-.66-.217-1.127-.417-1.996-.85-3.275-2.887-3.375-3.021-.1-.133-.733-.977-.733-1.87 0-.894.468-1.334.635-1.514.167-.18.364-.226.486-.226.121 0 .242 0 .346.005.11.004.258-.04.404.316.145.356.5 1.22.545 1.31.045.09.075.195.015.315-.06.12-.09.195-.18.299-.09.105-.19.232-.27.31-.09.09-.184.187-.08.366.105.18.468.775 1.005 1.25.692.613 1.275.803 1.455.893.18.09.285.075.39-.045.105-.12.45-.525.57-.704.12-.18.24-.15.405-.09.165.06 1.045.493 1.225.584.18.09.3.135.345.21.045.075.045.435-.1.84z" />
                </svg>
            </a>
        </div>
    );
}
