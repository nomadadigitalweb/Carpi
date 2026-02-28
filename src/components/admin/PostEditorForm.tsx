"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ArrowLeft, Save, Eye, ImagePlus, X } from "lucide-react";
import Link from "next/link";
import {
  createPost,
  updatePost,
  getCategories,
} from "@/actions/blog";
import { uploadBlogImage } from "@/lib/blog-storage";
import type { Post, Category, PostFormData } from "@/types/blog";

// Dynamically import TinyMCE to avoid SSR issues
const BlogEditor = dynamic(() => import("@/components/admin/BlogEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] bg-gray-100 rounded-lg animate-pulse flex items-center justify-center text-gray-400 text-sm">
      Cargando editor...
    </div>
  ),
});

interface PostEditorFormProps {
  post?: Post | null;
}

export default function PostEditorForm({ post }: PostEditorFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(post?.title ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [featuredImage, setFeaturedImage] = useState<string | null>(
    post?.featured_image ?? null
  );
  const [categoryId, setCategoryId] = useState<string | null>(
    post?.category_id ?? null
  );
  const [status, setStatus] = useState<"draft" | "published">(
    post?.status ?? "draft"
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCategories().then(setCategories).catch(console.error);
  }, []);

  const handleFeaturedImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview immediately
    const previewUrl = URL.createObjectURL(file);
    setFeaturedImage(previewUrl);
    setUploadingImage(true);

    try {
      const url = await uploadBlogImage(file);
      setFeaturedImage(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error subiendo imagen");
      setFeaturedImage(post?.featured_image ?? null);
    } finally {
      setUploadingImage(false);
      URL.revokeObjectURL(previewUrl);
    }
  };

  const handleSave = async (asDraft?: boolean) => {
    if (!title.trim()) {
      setError("El título es obligatorio.");
      return;
    }

    setSaving(true);
    setError(null);

    const formData: PostFormData = {
      title: title.trim(),
      content,
      excerpt: excerpt.trim(),
      featured_image: featuredImage,
      category_id: categoryId,
      status: asDraft ? "draft" : status,
    };

    try {
      if (post) {
        await updatePost(post.id, formData);
      } else {
        await createPost(formData);
      }
      router.push("/admin/blog");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const isEditing = !!post;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/blog"
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditing ? "Editar Post" : "Nuevo Post"}
            </h1>
            {isEditing && (
              <p className="text-xs text-gray-400 mt-0.5">
                /{post.slug}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {status === "published" && isEditing && (
            <Link
              href={`/blog/${post.slug}`}
              target="_blank"
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Eye size={16} />
              Ver
            </Link>
          )}
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Guardar Borrador
          </button>
          <button
            onClick={() => {
              setStatus("published");
              handleSave(false);
            }}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            <Save size={16} />
            {saving
              ? "Guardando..."
              : isEditing
              ? "Actualizar"
              : "Publicar"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
        {/* Main content */}
        <div className="space-y-5">
          {/* Title */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título del post"
              className="w-full px-4 py-3 text-xl font-semibold border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/20 placeholder:text-gray-300"
            />
          </div>

          {/* Editor */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <BlogEditor value={content} onChange={setContent} height={550} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Status */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Estado
            </label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "draft" | "published")
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
            >
              <option value="draft">Borrador</option>
              <option value="published">Publicado</option>
            </select>
          </div>

          {/* Category */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Categoría
            </label>
            <select
              value={categoryId ?? ""}
              onChange={(e) => setCategoryId(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
            >
              <option value="">Sin categoría</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Featured Image */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Imagen Destacada
            </label>
            {featuredImage ? (
              <div className="relative group">
                <img
                  src={featuredImage}
                  alt="Featured"
                  className="w-full h-44 object-cover rounded-lg border border-gray-100"
                />
                {uploadingImage && (
                  <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                <button
                  onClick={() => {
                    setFeaturedImage(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors"
              >
                <ImagePlus size={24} />
                <span className="text-xs">Subir imagen</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFeaturedImageUpload}
              className="hidden"
            />
            {featuredImage && !uploadingImage && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 text-xs text-blue-600 hover:underline"
              >
                Cambiar imagen
              </button>
            )}
          </div>

          {/* Excerpt */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Extracto
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={4}
              placeholder="Breve descripción del post para listados y SEO..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20 resize-none placeholder:text-gray-300"
            />
            <p className="text-xs text-gray-400 mt-1">
              {excerpt.length}/300 caracteres recomendados
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
