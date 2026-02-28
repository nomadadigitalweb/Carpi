"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { PostFormData, Post, Category } from "@/types/blog";

/* ─── helpers ─── */

const STAFF_ROLES = ["admin_carpi", "gestor_financiero", "encargado_ventas"];

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No autenticado.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", user.id)
    .single();

  if (!profile || !STAFF_ROLES.includes(profile.role)) {
    throw new Error("Sin permisos para gestionar el blog.");
  }

  return { supabase, user, profile };
}

function slugify(text: string): string {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ─── Categories ─── */

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");

  if (error) throw new Error(error.message);
  return (data ?? []) as Category[];
}

export async function createCategory(name: string): Promise<Category> {
  const { supabase } = await requireStaff();

  const slug = slugify(name);
  const { data, error } = await supabase
    .from("categories")
    .insert({ name, slug })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  return data as Category;
}

export async function deleteCategory(id: string): Promise<void> {
  const { supabase } = await requireStaff();

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
}

/* ─── Posts ─── */

export async function getPosts(opts?: {
  status?: string;
  categorySlug?: string;
  limit?: number;
  offset?: number;
}): Promise<{ posts: Post[]; count: number }> {
  const supabase = await createClient();

  let query = supabase
    .from("posts")
    .select(
      "*, category:categories(*), author:profiles!posts_author_id_fkey(full_name, email)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (opts?.status) {
    query = query.eq("status", opts.status);
  }

  if (opts?.categorySlug) {
    // Need to filter by a joined table's slug
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", opts.categorySlug)
      .single();
    if (cat) {
      query = query.eq("category_id", cat.id);
    }
  }

  if (opts?.limit) {
    const offset = opts.offset ?? 0;
    query = query.range(offset, offset + opts.limit - 1);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return { posts: (data ?? []) as Post[], count: count ?? 0 };
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(
      "*, category:categories(*), author:profiles!posts_author_id_fkey(full_name, email)"
    )
    .eq("slug", slug)
    .single();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return (data as Post) ?? null;
}

export async function getPostById(id: string): Promise<Post | null> {
  const { supabase } = await requireStaff();
  const { data, error } = await supabase
    .from("posts")
    .select(
      "*, category:categories(*), author:profiles!posts_author_id_fkey(full_name, email)"
    )
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return (data as Post) ?? null;
}

export async function createPost(formData: PostFormData): Promise<Post> {
  const { supabase, user } = await requireStaff();

  const slug = slugify(formData.title);

  // Check slug uniqueness, append suffix if needed
  let finalSlug = slug;
  let attempt = 0;
  while (true) {
    const { data: existing } = await supabase
      .from("posts")
      .select("id")
      .eq("slug", finalSlug)
      .maybeSingle();
    if (!existing) break;
    attempt++;
    finalSlug = `${slug}-${attempt}`;
  }

  const insertData: Record<string, unknown> = {
    title: formData.title,
    slug: finalSlug,
    content: formData.content,
    excerpt: formData.excerpt || null,
    featured_image: formData.featured_image || null,
    category_id: formData.category_id || null,
    status: formData.status,
    author_id: user.id,
  };

  if (formData.status === "published") {
    insertData.published_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("posts")
    .insert(insertData)
    .select(
      "*, category:categories(*), author:profiles!posts_author_id_fkey(full_name, email)"
    )
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  return data as Post;
}

export async function updatePost(
  id: string,
  formData: PostFormData
): Promise<Post> {
  const { supabase } = await requireStaff();

  // Get current post for slug comparison
  const { data: current } = await supabase
    .from("posts")
    .select("slug, status")
    .eq("id", id)
    .single();

  // Regenerate slug only if title changed
  let finalSlug = current?.slug ?? slugify(formData.title);
  const newSlug = slugify(formData.title);

  if (newSlug !== current?.slug) {
    finalSlug = newSlug;
    let attempt = 0;
    while (true) {
      const { data: existing } = await supabase
        .from("posts")
        .select("id")
        .eq("slug", finalSlug)
        .neq("id", id)
        .maybeSingle();
      if (!existing) break;
      attempt++;
      finalSlug = `${newSlug}-${attempt}`;
    }
  }

  const updateData: Record<string, unknown> = {
    title: formData.title,
    slug: finalSlug,
    content: formData.content,
    excerpt: formData.excerpt || null,
    featured_image: formData.featured_image || null,
    category_id: formData.category_id || null,
    status: formData.status,
  };

  // Set published_at if transitioning to published
  if (formData.status === "published" && current?.status !== "published") {
    updateData.published_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("posts")
    .update(updateData)
    .eq("id", id)
    .select(
      "*, category:categories(*), author:profiles!posts_author_id_fkey(full_name, email)"
    )
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath(`/blog/${finalSlug}`);
  return data as Post;
}

export async function deletePost(id: string): Promise<void> {
  const { supabase } = await requireStaff();

  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
}
