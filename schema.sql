-- Tablas para Carpi Shop

-- Habilitar extensión para UUIDs
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

-- Tabla de productos
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    xubio_product_id BIGINT,
    name TEXT NOT NULL,
    sku TEXT,
    publication_status TEXT NOT NULL DEFAULT 'published' CHECK (publication_status IN ('draft', 'published')),
    extra JSONB DEFAULT '{}'::jsonb,
    description TEXT,
    image_url TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de órdenes
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    fabricante_id UUID NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    status order_status NOT NULL DEFAULT 'pendiente_fabricante',
    status_envio shipping_status NOT NULL DEFAULT 'preparando',
    tracking_number TEXT,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    xubio_invoice_id TEXT,
    xubio_invoice_pdf_url TEXT,
    xubio_cae TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT,
    product_name TEXT NOT NULL,
    sku TEXT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    subtotal DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id TEXT NOT NULL,
    lista_precio_id INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    currency TEXT NOT NULL DEFAULT 'ARS',
    manual_override BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (product_id, lista_precio_id)
);

CREATE TABLE IF NOT EXISTS xubio_sync_log (
    id BIGSERIAL PRIMARY KEY,
    entity_type TEXT NOT NULL,
    synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    records_synced INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('success', 'error')),
    error_detail TEXT
);

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS xubio_product_id BIGINT,
    ADD COLUMN IF NOT EXISTS sku TEXT,
    ADD COLUMN IF NOT EXISTS publication_status TEXT NOT NULL DEFAULT 'published';

ALTER TABLE products
    DROP CONSTRAINT IF EXISTS products_publication_status_check;

ALTER TABLE products
    ADD CONSTRAINT products_publication_status_check CHECK (publication_status IN ('draft', 'published'));

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS user_id UUID,
    ADD COLUMN IF NOT EXISTS fabricante_id UUID,
    ADD COLUMN IF NOT EXISTS status order_status,
    ADD COLUMN IF NOT EXISTS approved_by UUID,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS xubio_invoice_id TEXT,
    ADD COLUMN IF NOT EXISTS xubio_invoice_pdf_url TEXT,
    ADD COLUMN IF NOT EXISTS xubio_cae TEXT;

ALTER TABLE product_prices
    ADD COLUMN IF NOT EXISTS manual_override BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_products_xubio_product_id ON products(xubio_product_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_xubio_product_id ON products(xubio_product_id);
CREATE INDEX IF NOT EXISTS idx_products_publication_status ON products(publication_status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_fabricante_id ON orders(fabricante_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_product_prices_lista_precio_id ON product_prices(lista_precio_id);

-- RLS (Row Level Security) - Por ahora permitimos lectura pública para productos
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Publicar productos" ON products;
CREATE POLICY "Publicar productos" ON products FOR SELECT USING (true);
DROP POLICY IF EXISTS "Products writable by admins" ON products;
DROP POLICY IF EXISTS "Products insertable by admins" ON products;
DROP POLICY IF EXISTS "Products updatable by admins" ON products;
DROP POLICY IF EXISTS "Products deletable by admins" ON products;
CREATE POLICY "Products insertable by admins" ON products
FOR INSERT
WITH CHECK (
    auth.role() = 'authenticated' AND public.is_staff_user()
);
CREATE POLICY "Products updatable by admins" ON products
FOR UPDATE
USING (
    auth.role() = 'authenticated' AND public.is_staff_user()
)
WITH CHECK (
    auth.role() = 'authenticated' AND public.is_staff_user()
);
CREATE POLICY "Products deletable by admins" ON products
FOR DELETE
USING (
    auth.role() = 'authenticated' AND public.is_staff_user()
);

ALTER TABLE product_prices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read product prices" ON product_prices;
CREATE POLICY "Authenticated can read product prices" ON product_prices
FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Product prices writable by admins" ON product_prices;
DROP POLICY IF EXISTS "Product prices insertable by admins" ON product_prices;
DROP POLICY IF EXISTS "Product prices updatable by admins" ON product_prices;
DROP POLICY IF EXISTS "Product prices deletable by admins" ON product_prices;
CREATE POLICY "Product prices insertable by admins" ON product_prices
FOR INSERT
WITH CHECK (
    auth.role() = 'authenticated' AND public.is_staff_user()
);
CREATE POLICY "Product prices updatable by admins" ON product_prices
FOR UPDATE
USING (
    auth.role() = 'authenticated' AND public.is_staff_user()
)
WITH CHECK (
    auth.role() = 'authenticated' AND public.is_staff_user()
);
CREATE POLICY "Product prices deletable by admins" ON product_prices
FOR DELETE
USING (
    auth.role() = 'authenticated' AND public.is_staff_user()
);

-- Órdenes protegidas
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
