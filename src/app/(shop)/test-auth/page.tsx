import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

export default async function TestAuthPage() {
    const { userId, sessionClaims } = await auth();

    return (
        <div className="min-h-screen bg-black text-white p-12">
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="space-y-2">
                    <h1 className="text-4xl font-extrabold uppercase tracking-tighter">Auth Debugger</h1>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Verifica tu rol y metadatos</p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <div className="bg-white/5 border border-white/10 p-6 space-y-4">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">User ID</p>
                            <p className="text-xs font-mono bg-white/5 p-2 rounded">{userId || "No logueado"}</p>
                        </div>

                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Rol Actual (Metadata)</p>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold uppercase">
                                    {/* @ts-ignore */}
                                    {sessionClaims?.metadata?.role || "CLIENTE (Sin rol)"}
                                </span>
                            </div>
                        </div>

                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Raw Session Claims (Debugging)</p>
                            <pre className="text-[10px] font-mono bg-black p-4 overflow-auto max-h-64">
                                {JSON.stringify(sessionClaims, null, 2)}
                            </pre>
                        </div>
                    </div>

                    <div className="space-y-4 pt-8">
                        <h2 className="text-xl font-bold uppercase tracking-tight">Guía de Pruebas</h2>
                        <div className="space-y-4 text-sm text-gray-400 font-light leading-relaxed">
                            <p>
                                Para probar los roles, debes ir a tu <a href="https://dashboard.clerk.com" target="_blank" className="text-white underline">Clerk Dashboard</a> e insertar el rol en la sección de <strong>Public Metadata</strong> del usuario.
                            </p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li><strong>Gerente:</strong> <code className="bg-white/10 px-1">{"{\"role\": \"gerente\"}"}</code></li>
                                <li><strong>Logística:</strong> <code className="bg-white/10 px-1">{"{\"role\": \"logistica\"}"}</code></li>
                                <li><strong>Admin:</strong> <code className="bg-white/10 px-1">{"{\"role\": \"admin\"}"}</code> (Total)</li>
                            </ul>
                        </div>
                        <div className="pt-4">
                            <Link href="/" className="text-[10px] font-bold uppercase tracking-[0.3em] border border-white/20 px-6 py-2 hover:bg-white hover:text-black transition-all">
                                Volver al inicio
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
