-- Carpi incremental migration (safe/idempotent)
-- Date: 2026-02-27
-- Scope: roles hierarchy, orders refactor, dynamic pricing, Xubio sync logs, RLS

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM (
      'pendiente_fabricante',
      'aprobado',
      'facturado',
      'pagado',
      'rechazado',
      'cancelado'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shipping_status') THEN
    CREATE TYPE shipping_status AS ENUM ('preparando', 'despachado', 'entregado');
  END IF;
END$$;

-- ---------------------------------
-- Profiles
-- ---------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  cuit TEXT,
  company_name TEXT,
  parent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  lista_precio_id INTEGER,
  can_view_team_orders BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  role TEXT DEFAULT 'usuario',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS cuit TEXT,
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lista_precio_id INTEGER,
  ADD COLUMN IF NOT EXISTS can_view_team_orders BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Backfill profile email from auth.users where missing
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND (p.email IS NULL OR p.email = '');

-- Legacy role normalization
UPDATE public.profiles SET role = 'admin_carpi' WHERE role = 'admin';
UPDATE public.profiles SET role = 'encargado_ventas' WHERE role = 'gerente';
UPDATE public.profiles SET role = 'gestor_financiero' WHERE role = 'logistica';
UPDATE public.profiles SET role = 'usuario' WHERE role = 'user' OR role IS NULL;

ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'usuario';
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin_carpi', 'gestor_financiero', 'encargado_ventas', 'fabricante', 'usuario'));

-- ---------------------------------
-- Products + dynamic pricing
-- ---------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS xubio_product_id BIGINT,
  ADD COLUMN IF NOT EXISTS sku TEXT;

CREATE TABLE IF NOT EXISTS public.product_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id TEXT NOT NULL,
  lista_precio_id INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  currency TEXT NOT NULL DEFAULT 'ARS',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (product_id, lista_precio_id)
);

-- Deduplicate products by xubio_product_id to allow unique index creation
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY xubio_product_id ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC) AS rn
  FROM public.products
  WHERE xubio_product_id IS NOT NULL
)
UPDATE public.products p
SET xubio_product_id = NULL
FROM duplicates d
WHERE p.id = d.id
  AND d.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_products_xubio_product_id ON public.products(xubio_product_id);
CREATE INDEX IF NOT EXISTS idx_product_prices_lista_precio_id ON public.product_prices(lista_precio_id);

-- ---------------------------------
-- Orders + order_items
-- ---------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS fabricante_id UUID,
  ADD COLUMN IF NOT EXISTS status order_status,
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS xubio_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS xubio_invoice_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS xubio_cae TEXT;

-- If status_envio is text, convert to enum safely
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'status_envio' AND data_type <> 'USER-DEFINED'
  ) THEN
    ALTER TABLE public.orders
      ALTER COLUMN status_envio DROP DEFAULT;

    ALTER TABLE public.orders
      ALTER COLUMN status_envio TYPE shipping_status
      USING (
        CASE
          WHEN status_envio IN ('preparando','despachado','entregado') THEN status_envio::shipping_status
          ELSE 'preparando'::shipping_status
        END
      );

    ALTER TABLE public.orders
      ALTER COLUMN status_envio SET DEFAULT 'preparando'::shipping_status;
  END IF;
END$$;

-- Backfill order status from legacy status_pago when available
UPDATE public.orders
SET status = CASE
  WHEN status IS NOT NULL THEN status
  WHEN status_pago = 'approved' THEN 'aprobado'::order_status
  WHEN status_pago = 'rejected' THEN 'rechazado'::order_status
  WHEN status_pago = 'transfer_waiting' THEN 'aprobado'::order_status
  ELSE 'pendiente_fabricante'::order_status
END;

ALTER TABLE public.orders
  ALTER COLUMN status SET DEFAULT 'pendiente_fabricante';

-- Backfill user_id by matching historical user_email against auth.users
UPDATE public.orders o
SET user_id = u.id
FROM auth.users u
WHERE o.user_id IS NULL
  AND o.user_email IS NOT NULL
  AND lower(o.user_email) = lower(u.email);

-- Backfill fabricante_id from user profile parent_id when possible
UPDATE public.orders o
SET fabricante_id = p.parent_id
FROM public.profiles p
WHERE o.fabricante_id IS NULL
  AND o.user_id = p.id
  AND p.parent_id IS NOT NULL;

-- Keep nullable for safety in production with historical records.
-- Application code should create all new rows with user_id/fabricante_id.

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id TEXT,
  product_name TEXT NOT NULL,
  sku TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  subtotal DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_fabricante_id ON public.orders(fabricante_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- ---------------------------------
-- Xubio sync log
-- ---------------------------------
CREATE TABLE IF NOT EXISTS public.xubio_sync_log (
  id BIGSERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  records_synced INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  error_detail TEXT
);

-- ---------------------------------
-- RLS + Policies
-- ---------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xubio_sync_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Publicar productos" ON public.products;
CREATE POLICY "Publicar productos" ON public.products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated can read product prices" ON public.product_prices;
CREATE POLICY "Authenticated can read product prices" ON public.product_prices
FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Profiles selectable by hierarchy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles updatable by hierarchy" ON public.profiles;

CREATE POLICY "Profiles selectable by hierarchy" ON public.profiles
FOR SELECT USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin_carpi', 'gestor_financiero', 'encargado_ventas')
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'fabricante'
      AND public.profiles.parent_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own profile." ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Profiles updatable by hierarchy" ON public.profiles
FOR UPDATE USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin_carpi', 'gestor_financiero', 'encargado_ventas')
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'fabricante'
      AND public.profiles.parent_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin_carpi', 'gestor_financiero', 'encargado_ventas')
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'fabricante'
      AND public.profiles.parent_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Orders access by hierarchy" ON public.orders;
CREATE POLICY "Orders access by hierarchy" ON public.orders
FOR SELECT USING (
  user_id = auth.uid()
  OR fabricante_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin_carpi', 'gestor_financiero', 'encargado_ventas')
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles me
    JOIN public.profiles owner ON owner.id = me.parent_id
    WHERE me.id = auth.uid()
      AND me.role = 'usuario'
      AND me.can_view_team_orders = true
      AND public.orders.fabricante_id = owner.id
  )
);

DROP POLICY IF EXISTS "Users create own orders" ON public.orders;
CREATE POLICY "Users create own orders" ON public.orders
FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.profiles me
    WHERE me.id = auth.uid()
      AND me.parent_id = public.orders.fabricante_id
  )
);

DROP POLICY IF EXISTS "Orders update by hierarchy" ON public.orders;
CREATE POLICY "Orders update by hierarchy" ON public.orders
FOR UPDATE USING (
  fabricante_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin_carpi', 'gestor_financiero', 'encargado_ventas')
  )
);

DROP POLICY IF EXISTS "Order items by order visibility" ON public.order_items;
CREATE POLICY "Order items by order visibility" ON public.order_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = public.order_items.order_id
      AND (
        o.user_id = auth.uid()
        OR o.fabricante_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('admin_carpi', 'gestor_financiero', 'encargado_ventas')
        )
      )
  )
);

DROP POLICY IF EXISTS "Order items insert from allowed orders" ON public.order_items;
CREATE POLICY "Order items insert from allowed orders" ON public.order_items
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = public.order_items.order_id
      AND o.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Xubio logs visible to staff" ON public.xubio_sync_log;
CREATE POLICY "Xubio logs visible to staff" ON public.xubio_sync_log
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin_carpi', 'gestor_financiero', 'encargado_ventas')
  )
);

-- ---------------------------------
-- Signup trigger
-- ---------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'usuario')
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

COMMIT;
