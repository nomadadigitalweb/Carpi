-- Allow manual dashboard overrides for price lists without being overwritten by Xubio sync.
ALTER TABLE public.product_prices
  ADD COLUMN IF NOT EXISTS manual_override BOOLEAN NOT NULL DEFAULT FALSE;

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

DROP POLICY IF EXISTS "Product prices writable by admins" ON public.product_prices;
DROP POLICY IF EXISTS "Product prices insertable by admins" ON public.product_prices;
DROP POLICY IF EXISTS "Product prices updatable by admins" ON public.product_prices;
DROP POLICY IF EXISTS "Product prices deletable by admins" ON public.product_prices;

CREATE POLICY "Product prices insertable by admins" ON public.product_prices
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' AND public.is_staff_user()
);

CREATE POLICY "Product prices updatable by admins" ON public.product_prices
FOR UPDATE
USING (
  auth.role() = 'authenticated' AND public.is_staff_user()
)
WITH CHECK (
  auth.role() = 'authenticated' AND public.is_staff_user()
);

CREATE POLICY "Product prices deletable by admins" ON public.product_prices
FOR DELETE
USING (
  auth.role() = 'authenticated' AND public.is_staff_user()
);
