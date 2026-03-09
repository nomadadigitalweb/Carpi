-- Allow only admin roles to create/update/delete products from dashboard.
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

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Publicar productos" ON public.products;
CREATE POLICY "Publicar productos" ON public.products
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Products writable by admins" ON public.products;
DROP POLICY IF EXISTS "Products insertable by admins" ON public.products;
DROP POLICY IF EXISTS "Products updatable by admins" ON public.products;
DROP POLICY IF EXISTS "Products deletable by admins" ON public.products;

CREATE POLICY "Products insertable by admins" ON public.products
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' AND public.is_staff_user()
);

CREATE POLICY "Products updatable by admins" ON public.products
FOR UPDATE
USING (
  auth.role() = 'authenticated' AND public.is_staff_user()
)
WITH CHECK (
  auth.role() = 'authenticated' AND public.is_staff_user()
);

CREATE POLICY "Products deletable by admins" ON public.products
FOR DELETE
USING (
  auth.role() = 'authenticated' AND public.is_staff_user()
);
