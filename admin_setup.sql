-- 1. Crear tabla de perfiles (si no existe)
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
  role TEXT DEFAULT 'usuario' CHECK (role IN ('admin_carpi', 'gestor_financiero', 'encargado_ventas', 'fabricante', 'usuario')),
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

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin_carpi', 'gestor_financiero', 'encargado_ventas', 'fabricante', 'usuario'));

-- 2. Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Limpiar políticas existentes para evitar errores de duplicado
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Profiles selectable by hierarchy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles updatable by hierarchy" ON public.profiles;

-- 4. Crear políticas de acceso
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

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
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

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
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

ALTER TABLE public.xubio_sync_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Xubio logs visible to staff" ON public.xubio_sync_log;
CREATE POLICY "Xubio logs visible to staff" ON public.xubio_sync_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin_carpi', 'gestor_financiero', 'encargado_ventas')
    )
  );

-- 5. Función y disparador para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'usuario');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. COMANDO PARA HACER ADMIN A UN USUARIO (Ejecuta esto reemplazando el email)
-- UPDATE public.profiles 
-- SET role = 'admin_carpi' 
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'TU_EMAIL_AQUI');
