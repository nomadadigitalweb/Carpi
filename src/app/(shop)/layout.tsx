import { CartProvider } from "@/context/CartContext";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";

export default function ShopLayout({
    children,
}: {
    children: React.ReactNode;
}) {
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
                    {['Productos', 'ADN Italiano', 'Canales de Venta', 'Contacto'].map((item) => (
                        <Link
                            key={item}
                            href={item === 'Contacto' ? '/#contact' : item === 'ADN Italiano' ? '/adn' : item === 'Canales de Venta' ? '/venta' : `/${item.toLowerCase().replace(/ /g, '-')}`}
                            className="text-[10px] font-medium uppercase tracking-[0.25em] text-white/70 hover:text-white transition-all relative group"
                        >
                            {item}
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
                        href="/login"
                        className="text-[10px] font-bold uppercase tracking-[0.3em] hover:text-gray-300 transition-colors border border-white/20 px-6 py-3 hover:bg-white hover:text-black"
                    >
                        INGRESAR
                    </Link>
                </div>
            </header>
            <main>
                {children}
            </main>
        </div>
    );
}
