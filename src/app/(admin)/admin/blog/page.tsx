"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  FileText,
  Tag,
  Search,
} from "lucide-react";
import { getPosts, deletePost, getCategories, createCategory, deleteCategory } from "@/actions/blog";
import type { Post, Category } from "@/types/blog";

export default function BlogAdminPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [catLoading, setCatLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [postsRes, cats] = await Promise.all([
        getPosts(),
        getCategories(),
      ]);
      setPosts(postsRes.posts);
      setCategories(cats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`¿Eliminar el post "${title}"?`)) return;
    try {
      await deletePost(id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar");
    }
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    setCatLoading(true);
    try {
      const cat = await createCategory(newCatName.trim());
      setCategories((prev) => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCatName("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al crear categoría");
    } finally {
      setCatLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar la categoría "${name}"? Los posts no se borrarán.`)) return;
    try {
      await deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar");
    }
  };

  const filteredPosts = posts.filter((p) => {
    const matchSearch =
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.excerpt ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blog</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona los posts y categorías del blog
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCatModal(!showCatModal)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Tag size={16} />
            Categorías
          </button>
          <Link
            href="/admin/blog/nuevo"
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors"
          >
            <Plus size={16} />
            Nuevo Post
          </Link>
        </div>
      </div>

      {/* Categories Modal */}
      {showCatModal && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
            Categorías
          </h3>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Nueva categoría..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
              onKeyDown={(e) => e.key === "Enter" && handleCreateCategory()}
            />
            <button
              onClick={handleCreateCategory}
              disabled={catLoading}
              className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 disabled:opacity-50 transition-colors"
            >
              {catLoading ? "..." : "Agregar"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <span
                key={cat.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700"
              >
                {cat.name}
                <button
                  onClick={() => handleDeleteCategory(cat.id, cat.name)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </span>
            ))}
            {categories.length === 0 && (
              <p className="text-sm text-gray-400">No hay categorías aún.</p>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar posts..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
        >
          <option value="all">Todos</option>
          <option value="draft">Borradores</option>
          <option value="published">Publicados</option>
        </select>
      </div>

      {/* Posts Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : filteredPosts.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <FileText size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">
            {search || statusFilter !== "all"
              ? "No se encontraron posts con esos filtros."
              : "Aún no hay posts. ¡Crea el primero!"}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="border-b border-gray-100">
              <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3">Título</th>
                <th className="px-5 py-3">Categoría</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3">Autor</th>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredPosts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {post.featured_image ? (
                        <img
                          src={post.featured_image}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover border border-gray-100"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <FileText size={16} className="text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900 line-clamp-1">
                          {post.title}
                        </p>
                        <p className="text-xs text-gray-400 line-clamp-1">
                          /{post.slug}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {post.category ? (
                      <span className="inline-block px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                        {post.category.name}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        post.status === "published"
                          ? "bg-green-50 text-green-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {post.status === "published" ? "Publicado" : "Borrador"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    {post.author?.full_name ?? post.author?.email ?? "—"}
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-500">
                    {new Date(post.created_at).toLocaleDateString("es-AR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      {post.status === "published" && (
                        <Link
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Ver en el blog"
                        >
                          <Eye size={16} />
                        </Link>
                      )}
                      <Link
                        href={`/admin/blog/${post.id}`}
                        className="p-2 text-gray-400 hover:text-zinc-900 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </Link>
                      <button
                        onClick={() => handleDelete(post.id, post.title)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
