"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { Plus, Trash2, Save, X, Layers } from "lucide-react";

type ProductLine = {
    id: string;
    name: string;
    image_url?: string;
    created_at: string;
};

export default function ProductLinesManager() {
    const supabase = createClient();
    const [lines, setLines] = useState<ProductLine[]>([]);
    const [loading, setLoading] = useState(true);
    const [newLineName, setNewLineName] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        fetchLines();
    }, []);

    async function fetchLines() {
        setLoading(true);
        const { data, error } = await supabase
            .from('product_lines')
            .select('*')
            .order('name');

        if (data) setLines(data);
        setLoading(false);
    }

    async function handleCreate() {
        if (!newLineName.trim()) return;
        setIsCreating(true);

        const { data, error } = await supabase
            .from('product_lines')
            .insert([{ name: newLineName }])
            .select()
            .single();

        if (error) {
            alert('Error al crear línea: ' + error.message);
        } else if (data) {
            setLines(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
            setNewLineName("");
        }
        setIsCreating(false);
    }

    async function handleDelete(id: string) {
        if (!confirm('¿Seguro que quieres borrar esta línea?')) return;

        const { error } = await supabase
            .from('product_lines')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Error al borrar: ' + error.message);
        } else {
            setLines(prev => prev.filter(l => l.id !== id));
        }
    }

    return (
        <div className="bg-white border boundary-gray-200 rounded-lg p-6 shadow-sm max-w-2xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-bold uppercase tracking-wide flex items-center gap-2">
                        <Layers className="w-5 h-5" /> Líneas de Producto
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">Categorías para organizar el inventario.</p>
                </div>
            </div>

            {/* Create New */}
            <div className="flex gap-2 mb-8 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <input
                    type="text"
                    placeholder="Nombre de nueva línea..."
                    className="flex-1 bg-white border border-gray-300 px-3 py-2 text-sm rounded outline-none focus:border-black transition-colors"
                    value={newLineName}
                    onChange={(e) => setNewLineName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
                <button
                    onClick={handleCreate}
                    disabled={isCreating || !newLineName.trim()}
                    className="bg-black text-white px-4 py-2 rounded text-xs font-bold uppercase tracking-wider hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                >
                    {isCreating ? <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" /> : <Plus size={14} />}
                    Crear
                </button>
            </div>

            {/* List */}
            {loading ? (
                <div className="text-center py-8">
                    <div className="animate-spin h-6 w-6 border-2 border-black border-t-transparent rounded-full mx-auto" />
                </div>
            ) : (
                <div className="space-y-2">
                    {lines.length === 0 && (
                        <div className="text-center py-8 text-gray-400 text-sm italic">
                            No hay líneas creadas todavía.
                        </div>
                    )}
                    {lines.map((line) => (
                        <div key={line.id} className="flex items-center justify-between p-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors group">
                            <span className="text-sm font-medium text-gray-800">{line.name}</span>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {/* Future: Edit button code here */}
                                <button
                                    onClick={() => handleDelete(line.id)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Eliminar"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
