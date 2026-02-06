"use client";

import { useState, useEffect } from "react";
import { X, Save, Upload, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type Product = {
    id?: string;
    name: string;
    sku?: string;
    description?: string;
    price: number;
    stock: number;
    category?: string;
    image_url?: string;
};

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    productToEdit?: Product;
};

export default function ProductFormModal({ isOpen, onClose, onSaved, productToEdit }: Props) {
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [lines, setLines] = useState<{ name: string }[]>([]);

    // Form State
    const [formData, setFormData] = useState<Product>({
        name: "",
        sku: "",
        description: "",
        price: 0,
        stock: 0,
        category: "General",
        image_url: ""
    });

    useEffect(() => {
        if (isOpen) {
            fetchLines();
            if (productToEdit) {
                setFormData(productToEdit);
            } else {
                setFormData({
                    name: "",
                    sku: "",
                    description: "",
                    price: 0,
                    stock: 0,
                    category: "General",
                    image_url: ""
                });
            }
        }
    }, [isOpen, productToEdit]);

    async function fetchLines() {
        const { data } = await supabase.from('product_lines').select('name').order('name');
        if (data) setLines(data);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        try {
            if (productToEdit?.id) {
                // Update
                const { error } = await supabase
                    .from('products')
                    .update(formData)
                    .eq('id', productToEdit.id);
                if (error) throw error;
            } else {
                // Create
                const { error } = await supabase
                    .from('products')
                    .insert([formData]);
                if (error) throw error;
            }
            onSaved();
            onClose();
        } catch (error: any) {
            alert('Error al guardar: ' + error.message);
        } finally {
            setLoading(false);
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                <div className="sticky top-0 bg-white border-b border-gray-100 flex items-center justify-between p-6 z-10">
                    <h2 className="text-xl font-bold uppercase tracking-tight">
                        {productToEdit ? 'Editar Producto' : 'Nuevo Producto'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Name */}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Nombre del Producto</label>
                            <input
                                required
                                type="text"
                                className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                                placeholder="Ej: Bacha Fenix..."
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        {/* SKU */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">SKU (Código)</label>
                            <input
                                type="text"
                                className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none font-mono"
                                placeholder="COD-123"
                                value={formData.sku || ''}
                                onChange={e => setFormData({ ...formData, sku: e.target.value })}
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Categoría (Línea)</label>
                            <select
                                className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                            >
                                <option value="General">General</option>
                                {lines.map(l => (
                                    <option key={l.name} value={l.name}>{l.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Price */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Precio ($)</label>
                            <input
                                required
                                type="number"
                                min="0"
                                step="0.01"
                                className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none"
                                value={formData.price}
                                onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                            />
                        </div>

                        {/* Stock */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Stock Actual</label>
                            <input
                                required
                                type="number"
                                min="0"
                                className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none"
                                value={formData.stock}
                                onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                            />
                        </div>

                        {/* Image Upload */}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Imagen del Producto</label>

                            <div className="flex items-start gap-4">
                                <div className="flex-1">
                                    {/* Upload Button */}
                                    <div className="relative">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;

                                                setLoading(true);
                                                try {
                                                    const fileExt = file.name.split('.').pop();
                                                    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
                                                    const filePath = `${fileName}`;

                                                    const { error: uploadError } = await supabase.storage
                                                        .from('products')
                                                        .upload(filePath, file);

                                                    if (uploadError) throw uploadError;

                                                    const { data: { publicUrl } } = supabase.storage
                                                        .from('products')
                                                        .getPublicUrl(filePath);

                                                    setFormData(prev => ({ ...prev, image_url: publicUrl }));
                                                } catch (error: any) {
                                                    alert('Error subiendo imagen: ' + error.message);
                                                } finally {
                                                    setLoading(false);
                                                }
                                            }}
                                        />
                                        <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 border-dashed rounded hover:bg-gray-100 transition-colors">
                                            <Upload size={18} className="text-gray-400" />
                                            <div className="text-left">
                                                <p className="text-xs font-bold text-gray-700">Subir imagen</p>
                                                <p className="text-[10px] text-gray-400">JPG, PNG, WEBP (Max 2MB)</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* URL Fallback */}
                                    <div className="mt-2">
                                        <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">O pegar URL externa</p>
                                        <input
                                            type="text"
                                            className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs focus:border-black outline-none"
                                            placeholder="https://..."
                                            value={formData.image_url || ''}
                                            onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Preview */}
                                <div className="w-24 h-24 bg-gray-100 rounded-lg border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center relative">
                                    {formData.image_url ? (
                                        <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-center p-2">
                                            <div className="w-8 h-8 bg-gray-200 rounded-full mx-auto mb-1 animate-pulse" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Descripción</label>
                            <textarea
                                rows={4}
                                className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none resize-none"
                                placeholder="Detalles del producto..."
                                value={formData.description || ''}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="mr-3 px-6 py-2 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-black text-white px-6 py-2 rounded text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading && <Loader2 className="animate-spin" size={14} />}
                            {productToEdit ? 'Guardar Cambios' : 'Crear Producto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
