import DashboardStats from "@/components/admin/DashboardStats";

export default function AdminPage() {
    return (
        <div className="max-w-6xl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Bienvenido al Panel</h1>
                <p className="text-gray-500">Aquí tienes un resumen de la actividad de tu tienda.</p>
            </div>

            <DashboardStats />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Activity Placeholder */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 h-64 flex flex-col items-center justify-center text-gray-400">
                    <span className="text-sm">Gráfico de Ventas (Próximamente)</span>
                </div>

                {/* Quick Actions Placeholder */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 mb-4">Acciones Rápidas</h3>
                    <div className="space-y-3">
                        <button className="w-full text-left px-4 py-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm font-medium transition-colors">
                            + Agregar Producto Nuevo
                        </button>
                        <button className="w-full text-left px-4 py-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm font-medium transition-colors">
                            Descargar Reporte Mensual
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
