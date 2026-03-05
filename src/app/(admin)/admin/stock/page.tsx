"use client";

import { createClient } from "@/utils/supabase/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Save, AlertCircle, Search, Layers, Package } from "lucide-react";
import ProductLinesManager from "@/components/admin/ProductLinesManager";
import ProductFormModal from "@/components/admin/ProductFormModal";
import { Plus, Edit2 } from "lucide-react";

type ColumnKey = "select" | "sku" | "product" | "category" | "stock" | "price" | "action";

const STOCK_COLUMN_WIDTHS_STORAGE_KEY = "admin-stock-column-widths-v1";
const DEFAULT_COLUMN_WIDTHS: Record<ColumnKey, number> = {
    select: 44,
    sku: 180,
    product: 420,
    category: 170,
    stock: 110,
    price: 130,
    action: 90,
};
const MIN_COLUMN_WIDTHS: Record<ColumnKey, number> = {
    select: 36,
    sku: 110,
    product: 220,
    category: 120,
    stock: 90,
    price: 100,
    action: 80,
};

export default function StockPage() {
    const supabase = createClient();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [showLowStock, setShowLowStock] = useState(false);
    const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(DEFAULT_COLUMN_WIDTHS);
    const resizingRef = useRef<{ key: ColumnKey; startX: number; startWidth: number } | null>(null);

    // ... (existing states)
    const [savingId, setSavingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'products' | 'lines'>('products');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // ... (existing Modal State)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any>(null);

    // ... (existing helper functions)

    const openCreateModal = () => {
        setEditingProduct(null);
        setIsModalOpen(true);
    };

    const openEditModal = (product: any) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    useEffect(() => {
        const raw = window.localStorage.getItem(STOCK_COLUMN_WIDTHS_STORAGE_KEY);
        if (!raw) return;

        try {
            const parsed = JSON.parse(raw) as Partial<Record<ColumnKey, number>>;
            setColumnWidths((prev) => ({ ...prev, ...parsed }));
        } catch {
            window.localStorage.removeItem(STOCK_COLUMN_WIDTHS_STORAGE_KEY);
        }
    }, []);

    useEffect(() => {
        window.localStorage.setItem(STOCK_COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(columnWidths));
    }, [columnWidths]);

    const handleResizeMouseMove = useCallback((event: MouseEvent) => {
        const resizing = resizingRef.current;
        if (!resizing) return;

        const delta = event.clientX - resizing.startX;
        const minWidth = MIN_COLUMN_WIDTHS[resizing.key];
        const nextWidth = Math.max(minWidth, resizing.startWidth + delta);

        setColumnWidths((prev) => ({
            ...prev,
            [resizing.key]: nextWidth,
        }));
    }, []);

    const stopResize = useCallback(() => {
        resizingRef.current = null;
        window.removeEventListener("mousemove", handleResizeMouseMove);
        window.removeEventListener("mouseup", stopResize);
    }, [handleResizeMouseMove]);

    const startResize = (key: ColumnKey) => (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();

        resizingRef.current = {
            key,
            startX: event.clientX,
            startWidth: columnWidths[key],
        };

        window.addEventListener("mousemove", handleResizeMouseMove);
        window.addEventListener("mouseup", stopResize);
    };

    useEffect(() => {
        return () => {
            stopResize();
        };
    }, [stopResize]);

    async function fetchProducts() {
        setLoading(true);
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) console.error('Error fetching products:', error);
        else setProducts(data || []);
        setLoading(false);
    }

    // Derive unique categories from products
    const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sku?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
        const matchesLowStock = !showLowStock || (p.stock || 0) < 5; // Low stock threshold < 5

        return matchesSearch && matchesCategory && matchesLowStock;
    });

    async function handleUpdate(id: string, updates: any) {
        setSavingId(id);
        const { error } = await supabase
            .from('products')
            .update(updates)
            .eq('id', id);

        if (!error) {
            setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
        }
        setSavingId(null);
    }

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredProducts.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredProducts.map(p => p.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleBulkDelete = async () => {
        if (!confirm(`¿Estás seguro de eliminar ${selectedIds.size} productos?`)) return;

        const ids = Array.from(selectedIds);
        const { error } = await supabase
            .from('products')
            .delete()
            .in('id', ids);

        if (!error) {
            setProducts(prev => prev.filter(p => !selectedIds.has(p.id)));
            setSelectedIds(new Set());
        } else {
            alert('Error al eliminar: ' + error.message);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold uppercase tracking-tighter mb-1">Gestión de Stock</h1>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Panel de Gerencia</p>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('products')}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-md transition-all flex items-center gap-2 ${activeTab === 'products' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Package size={14} /> Productos
                    </button>
                    <button
                        onClick={() => setActiveTab('lines')}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-md transition-all flex items-center gap-2 ${activeTab === 'lines' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Layers size={14} /> Líneas
                    </button>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={openCreateModal}
                        className="bg-black text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-zinc-800 transition-all flex items-center gap-2 shadow-sm"
                    >
                        <Plus size={16} /> Nuevo
                    </button>
                    {/* Filter placeholder */}
                </div>
            </div>

            {/* Modal */}
            <ProductFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSaved={fetchProducts}
                productToEdit={editingProduct}
            />

            {activeTab === 'lines' ? (
                <div className="max-w-4xl">
                    <ProductLinesManager />
                </div>
            ) : (
                <>
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-lg border border-gray-100 shadow-sm mb-6">
                        <div className="flex flex-1 gap-4 w-full">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Buscar por Nombre o SKU..."
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-black focus:border-black outline-none transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            {/* Category Filter */}
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="bg-gray-50 border border-gray-200 rounded-lg text-xs px-4 py-2 outline-none focus:border-black cursor-pointer uppercase font-bold text-gray-600"
                            >
                                <option value="all">Todas las Categorías</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>

                            {/* Low Stock Toggle */}
                            <button
                                onClick={() => setShowLowStock(!showLowStock)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all border ${showLowStock
                                    ? 'bg-red-50 text-red-600 border-red-200'
                                    : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <AlertCircle size={16} />
                                Bajo Stock
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-12 flex justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse table-fixed">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="relative py-4 px-4" style={{ width: columnWidths.select }}>
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-black focus:ring-black"
                                                checked={selectedIds.size === filteredProducts.length && filteredProducts.length > 0}
                                                onChange={toggleSelectAll}
                                            />
                                            <span
                                                onMouseDown={startResize("select")}
                                                className="absolute right-0 top-0 h-full w-2 cursor-col-resize select-none touch-none hover:bg-gray-200"
                                            />
                                        </th>
                                        <th className="relative text-left py-4 px-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold" style={{ width: columnWidths.sku }}>
                                            SKU
                                            <span
                                                onMouseDown={startResize("sku")}
                                                className="absolute right-0 top-0 h-full w-2 cursor-col-resize select-none touch-none hover:bg-gray-200"
                                            />
                                        </th>
                                        <th className="relative text-left py-4 px-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold" style={{ width: columnWidths.product }}>
                                            Producto
                                            <span
                                                onMouseDown={startResize("product")}
                                                className="absolute right-0 top-0 h-full w-2 cursor-col-resize select-none touch-none hover:bg-gray-200"
                                            />
                                        </th>
                                        <th className="relative text-left py-4 px-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold" style={{ width: columnWidths.category }}>
                                            Categoría
                                            <span
                                                onMouseDown={startResize("category")}
                                                className="absolute right-0 top-0 h-full w-2 cursor-col-resize select-none touch-none hover:bg-gray-200"
                                            />
                                        </th>
                                        <th className="relative text-left py-4 px-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold text-center" style={{ width: columnWidths.stock }}>
                                            Stock
                                            <span
                                                onMouseDown={startResize("stock")}
                                                className="absolute right-0 top-0 h-full w-2 cursor-col-resize select-none touch-none hover:bg-gray-200"
                                            />
                                        </th>
                                        <th className="relative text-left py-4 px-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold text-right" style={{ width: columnWidths.price }}>
                                            Precio ($)
                                            <span
                                                onMouseDown={startResize("price")}
                                                className="absolute right-0 top-0 h-full w-2 cursor-col-resize select-none touch-none hover:bg-gray-200"
                                            />
                                        </th>
                                        <th className="relative text-center py-4 px-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold" style={{ width: columnWidths.action }}>
                                            Acción
                                            <span
                                                onMouseDown={startResize("action")}
                                                className="absolute right-0 top-0 h-full w-2 cursor-col-resize select-none touch-none hover:bg-gray-200"
                                            />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredProducts.map((p) => {
                                        const isLowStock = (p.stock || 0) < 5;
                                        return (
                                            <tr
                                                key={p.id}
                                                className={`transition-colors group border-b border-gray-50 ${selectedIds.has(p.id)
                                                    ? 'bg-gray-100'
                                                    : isLowStock
                                                        ? 'bg-red-50/60 hover:bg-red-100/50'
                                                        : 'hover:bg-gray-50/50'
                                                    }`}
                                            >
                                                <td className="py-4 px-4" style={{ width: columnWidths.select }}>
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-gray-300 text-black focus:ring-black"
                                                        checked={selectedIds.has(p.id)}
                                                        onChange={() => toggleSelect(p.id)}
                                                    />
                                                </td>
                                                <td className="py-4 px-4 text-xs font-mono text-gray-500" style={{ width: columnWidths.sku }}>{p.sku || '-'}</td>
                                                <td className="py-4 px-4" style={{ width: columnWidths.product }}>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-gray-100 shrink-0">
                                                            {p.image_url && <img src={p.image_url} className="w-full h-full object-cover" />}
                                                        </div>
                                                        <span className="text-xs font-bold uppercase tracking-tight truncate block">{p.name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 text-[10px] uppercase text-gray-500" style={{ width: columnWidths.category }}>{p.category}</td>
                                                <td className="py-4 px-4" style={{ width: columnWidths.stock }}>
                                                    <input
                                                        type="number"
                                                        className="w-16 mx-auto block text-center bg-transparent border-b border-transparent group-hover:border-gray-300 focus:border-black outline-none text-xs font-medium py-1"
                                                        defaultValue={p.stock}
                                                        onBlur={(e) => handleUpdate(p.id, { stock: parseInt(e.target.value) })}
                                                    />
                                                </td>
                                                <td className="py-4 px-4" style={{ width: columnWidths.price }}>
                                                    <input
                                                        type="number"
                                                        className="w-24 ml-auto block text-right bg-transparent border-b border-transparent group-hover:border-gray-300 focus:border-black outline-none text-xs font-medium py-1"
                                                        defaultValue={p.price}
                                                        onBlur={(e) => handleUpdate(p.id, { price: parseFloat(e.target.value) })}
                                                    />
                                                </td>
                                                <td className="py-4 px-4 text-center" style={{ width: columnWidths.action }}>
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => openEditModal(p)}
                                                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                                            title="Editar"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        {/* Quick Save Indicator */}
                                                        {savingId === p.id && (
                                                            <div className="animate-spin h-3 w-3 border-b-2 border-black"></div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {filteredProducts.length === 0 && (
                                <div className="py-20 text-center text-gray-400">
                                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-[10px] uppercase tracking-widest font-bold">No hay productos en esta lista</p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
