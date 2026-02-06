-- Tablas para Carpi Shop

-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de productos
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
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
    user_email TEXT NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    status_pago TEXT CHECK (status_pago IN ('pending', 'approved', 'rejected', 'transfer_waiting')) DEFAULT 'pending',
    status_envio TEXT CHECK (status_envio IN ('preparando', 'despachado', 'entregado')) DEFAULT 'preparando',
    tracking_number TEXT,
    mp_preference_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) - Por ahora permitimos lectura pública para productos
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Publicar productos" ON products FOR SELECT USING (true);

-- Órdenes protegidas
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
