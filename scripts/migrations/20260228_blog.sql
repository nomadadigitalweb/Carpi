-- ============================================================
-- Blog Autoadministrable — Migration
-- Date: 2026-02-28
-- Adds: categories, posts tables + RLS + storage bucket
-- ============================================================

-- 1. Post status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'post_status') THEN
    CREATE TYPE public.post_status AS ENUM ('draft', 'published');
  END IF;
END$$;

CREATE OR REPLACE FUNCTION public.is_staff_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin_carpi', 'encargado_ventas', 'gestor_financiero')
  );
$$;

REVOKE ALL ON FUNCTION public.is_staff_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff_user() TO authenticated;

-- 2. Categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 3. Posts table
CREATE TABLE IF NOT EXISTS public.posts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title           TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  content         TEXT,                               -- HTML from TinyMCE
  excerpt         TEXT,                               -- Short summary
  featured_image  TEXT,                               -- URL in Supabase Storage
  category_id     UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  status          public.post_status DEFAULT 'draft',
  author_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  published_at    TIMESTAMPTZ,                        -- set when status = published
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_slug       ON public.posts (slug);
CREATE INDEX IF NOT EXISTS idx_posts_status     ON public.posts (status);
CREATE INDEX IF NOT EXISTS idx_posts_category   ON public.posts (category_id);
CREATE INDEX IF NOT EXISTS idx_posts_author     ON public.posts (author_id);
CREATE INDEX IF NOT EXISTS idx_posts_published  ON public.posts (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_categories_slug  ON public.categories (slug);

-- 4. Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_posts_updated_at ON public.posts;
CREATE TRIGGER trg_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 5. RLS — Categories
-- ============================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Anyone can read categories
DROP POLICY IF EXISTS "categories_select_public" ON public.categories;
CREATE POLICY "categories_select_public"
  ON public.categories FOR SELECT
  USING (true);

-- Only staff (admin_carpi, gestor_financiero, encargado_ventas) can insert/update/delete
DROP POLICY IF EXISTS "categories_insert_staff" ON public.categories;
CREATE POLICY "categories_insert_staff"
  ON public.categories FOR INSERT
  WITH CHECK (public.is_staff_user());

DROP POLICY IF EXISTS "categories_update_staff" ON public.categories;
CREATE POLICY "categories_update_staff"
  ON public.categories FOR UPDATE
  USING (public.is_staff_user())
  WITH CHECK (public.is_staff_user());

DROP POLICY IF EXISTS "categories_delete_staff" ON public.categories;
CREATE POLICY "categories_delete_staff"
  ON public.categories FOR DELETE
  USING (public.is_staff_user());

-- ============================================================
-- 6. RLS — Posts
-- ============================================================
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Public can read published posts only
DROP POLICY IF EXISTS "posts_select_published" ON public.posts;
CREATE POLICY "posts_select_published"
  ON public.posts FOR SELECT
  USING (status = 'published' OR public.is_staff_user());

-- Staff can insert
DROP POLICY IF EXISTS "posts_insert_staff" ON public.posts;
CREATE POLICY "posts_insert_staff"
  ON public.posts FOR INSERT
  WITH CHECK (public.is_staff_user());

-- Staff can update
DROP POLICY IF EXISTS "posts_update_staff" ON public.posts;
CREATE POLICY "posts_update_staff"
  ON public.posts FOR UPDATE
  USING (public.is_staff_user())
  WITH CHECK (public.is_staff_user());

-- Staff can delete
DROP POLICY IF EXISTS "posts_delete_staff" ON public.posts;
CREATE POLICY "posts_delete_staff"
  ON public.posts FOR DELETE
  USING (public.is_staff_user());

-- ============================================================
-- 7. Storage bucket — blog-media
-- ============================================================
-- Run this in Supabase Dashboard > Storage or via SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-media', 'blog-media', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for blog-media bucket
DROP POLICY IF EXISTS "blog_media_select_public" ON storage.objects;
CREATE POLICY "blog_media_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'blog-media');

-- Staff can upload to blog-media
DROP POLICY IF EXISTS "blog_media_insert_staff" ON storage.objects;
CREATE POLICY "blog_media_insert_staff"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'blog-media'
    AND public.is_staff_user()
  );

-- Staff can update (overwrite) in blog-media
DROP POLICY IF EXISTS "blog_media_update_staff" ON storage.objects;
CREATE POLICY "blog_media_update_staff"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'blog-media'
    AND public.is_staff_user()
  )
  WITH CHECK (
    bucket_id = 'blog-media'
    AND public.is_staff_user()
  );

-- Staff can delete from blog-media
DROP POLICY IF EXISTS "blog_media_delete_staff" ON storage.objects;
CREATE POLICY "blog_media_delete_staff"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'blog-media'
    AND public.is_staff_user()
  );

-- ============================================================
-- POST-CHECK: verify tables exist
-- ============================================================
SELECT 'categories' AS tabla, count(*) AS filas FROM public.categories
UNION ALL
SELECT 'posts', count(*) FROM public.posts;
