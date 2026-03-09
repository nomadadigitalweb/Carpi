"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { PostFormData, Post, Category } from "@/types/blog";

/* ─── helpers ─── */

const STAFF_ROLES = ["admin_carpi", "gestor_financiero", "encargado_ventas"];

type AuthorProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

async function hydratePostAuthors(supabase: Awaited<ReturnType<typeof createClient>>, posts: Post[]): Promise<Post[]> {
  const authorIds = Array.from(new Set(posts.map((post) => post.author_id).filter((id): id is string => Boolean(id))));

  if (authorIds.length === 0) {
    return posts.map((post) => ({ ...post, author: null }));
  }

  const { data: authors, error } = await supabase
    .from("profiles")
    .select("id,full_name,email")
    .in("id", authorIds);

  if (error) {
    // If profiles RLS is misconfigured, avoid crashing the public blog.
    return posts.map((post) => ({ ...post, author: null }));
  }

  const authorById = new Map(((authors ?? []) as AuthorProfile[]).map((author) => [author.id, author]));

  return posts.map((post) => {
    const authorId = post.author_id ?? null;
    const author = authorId ? authorById.get(authorId) : null;

    return {
      ...post,
      author: author
        ? {
            full_name: author.full_name,
            email: author.email,
          }
        : null,
    };
  });
}

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
    .select("*, category:categories(*)", { count: "exact" })
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

  const hydratedPosts = await hydratePostAuthors(supabase, (data ?? []) as Post[]);

  return { posts: hydratedPosts, count: count ?? 0 };
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("*, category:categories(*)")
    .eq("slug", slug)
    .single();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  if (!data) return null;

  const [hydrated] = await hydratePostAuthors(supabase, [data as Post]);
  return hydrated ?? null;
}

export async function getPostById(id: string): Promise<Post | null> {
  const { supabase } = await requireStaff();
  const { data, error } = await supabase
    .from("posts")
    .select("*, category:categories(*)")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  if (!data) return null;

  const [hydrated] = await hydratePostAuthors(supabase, [data as Post]);
  return hydrated ?? null;
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
    .select("*, category:categories(*)")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  const [hydrated] = await hydratePostAuthors(supabase, [data as Post]);
  return hydrated;
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
    .select("*, category:categories(*)")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath(`/blog/${finalSlug}`);
  const [hydrated] = await hydratePostAuthors(supabase, [data as Post]);
  return hydrated;
}

export async function deletePost(id: string): Promise<void> {
  const { supabase } = await requireStaff();

  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
}
