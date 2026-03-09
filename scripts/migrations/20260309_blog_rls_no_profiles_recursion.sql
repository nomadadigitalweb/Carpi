-- Blog RLS hotfix: avoid querying profiles directly inside policies.
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

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
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

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "posts_select_published" ON public.posts;
CREATE POLICY "posts_select_published"
  ON public.posts FOR SELECT
  USING (status = 'published' OR public.is_staff_user());

DROP POLICY IF EXISTS "posts_insert_staff" ON public.posts;
CREATE POLICY "posts_insert_staff"
  ON public.posts FOR INSERT
  WITH CHECK (public.is_staff_user());

DROP POLICY IF EXISTS "posts_update_staff" ON public.posts;
CREATE POLICY "posts_update_staff"
  ON public.posts FOR UPDATE
  USING (public.is_staff_user())
  WITH CHECK (public.is_staff_user());

DROP POLICY IF EXISTS "posts_delete_staff" ON public.posts;
CREATE POLICY "posts_delete_staff"
  ON public.posts FOR DELETE
  USING (public.is_staff_user());

DROP POLICY IF EXISTS "blog_media_insert_staff" ON storage.objects;
CREATE POLICY "blog_media_insert_staff"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'blog-media' AND public.is_staff_user());

DROP POLICY IF EXISTS "blog_media_update_staff" ON storage.objects;
CREATE POLICY "blog_media_update_staff"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'blog-media' AND public.is_staff_user())
  WITH CHECK (bucket_id = 'blog-media' AND public.is_staff_user());

DROP POLICY IF EXISTS "blog_media_delete_staff" ON storage.objects;
CREATE POLICY "blog_media_delete_staff"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'blog-media' AND public.is_staff_user());
