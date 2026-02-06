import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { CartProvider } from "@/context/CartContext";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Carpi Shop",
    description: "Tienda oficial de Carpi Argentina",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <CartProvider>
            <html lang="es">
                <head>
                    <link rel="stylesheet" href="/css/font-awesome.min.css" />
                </head>
                <body className={inter.className}>
                    {children}
                </body>
            </html>
        </CartProvider>
    );
}
