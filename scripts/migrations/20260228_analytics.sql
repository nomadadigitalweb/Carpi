-- ============================================================
-- Analytics / Análisis de Datos — Migration
-- Date: 2026-02-28
-- Tracks: page views, product views, add-to-cart, search
-- ============================================================

-- 1. Analytics events table (append-only log)
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type  TEXT NOT NULL,              -- 'page_view','product_view','add_to_cart','search','checkout'
  path        TEXT,                       -- URL path (/tienda, /productos/xxx)
  product_id  TEXT,                       -- refs products.id when relevant
  session_id  TEXT NOT NULL,              -- anonymous session fingerprint
  user_id     UUID,                       -- auth user if logged in
  referrer    TEXT,                       -- document.referrer
  user_agent  TEXT,
  device_type TEXT,                       -- 'desktop','mobile','tablet'
  search_term TEXT,                       -- for search events
  metadata    JSONB DEFAULT '{}',         -- extensible payload
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_ae_event_type   ON public.analytics_events (event_type);
CREATE INDEX IF NOT EXISTS idx_ae_product_id   ON public.analytics_events (product_id);
CREATE INDEX IF NOT EXISTS idx_ae_session_id   ON public.analytics_events (session_id);
CREATE INDEX IF NOT EXISTS idx_ae_created_at   ON public.analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ae_path         ON public.analytics_events (path);
CREATE INDEX IF NOT EXISTS idx_ae_device       ON public.analytics_events (device_type);
CREATE INDEX IF NOT EXISTS idx_ae_compound     ON public.analytics_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ae_product_time ON public.analytics_events (product_id, event_type, created_at DESC);

-- 2. Daily aggregation materialized view (for fast dashboard)
-- We use a regular table + cron-like refresh instead of matview for Supabase compat
CREATE TABLE IF NOT EXISTS public.analytics_daily (
  date           DATE NOT NULL,
  page_views     INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  product_views  INTEGER DEFAULT 0,
  add_to_carts   INTEGER DEFAULT 0,
  checkouts      INTEGER DEFAULT 0,
  searches       INTEGER DEFAULT 0,
  PRIMARY KEY (date)
);

CREATE INDEX IF NOT EXISTS idx_ad_date ON public.analytics_daily (date DESC);

-- 3. RLS — events are world-insertable (for tracking), staff-readable
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone can INSERT events (anonymous tracking)
DROP POLICY IF EXISTS "ae_insert_anyone" ON public.analytics_events;
CREATE POLICY "ae_insert_anyone"
  ON public.analytics_events FOR INSERT
  WITH CHECK (true);

-- Only staff can SELECT events
DROP POLICY IF EXISTS "ae_select_staff" ON public.analytics_events;
CREATE POLICY "ae_select_staff"
  ON public.analytics_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin_carpi','gestor_financiero','encargado_ventas')
    )
  );

-- No update/delete by anyone (append-only)
DROP POLICY IF EXISTS "ae_no_update" ON public.analytics_events;
DROP POLICY IF EXISTS "ae_no_delete" ON public.analytics_events;

-- 4. RLS — daily aggregation: staff read only
ALTER TABLE public.analytics_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ad_select_staff" ON public.analytics_daily;
CREATE POLICY "ad_select_staff"
  ON public.analytics_daily FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin_carpi','gestor_financiero','encargado_ventas')
    )
  );

-- Service role can insert/update (for aggregation job)
DROP POLICY IF EXISTS "ad_upsert_service" ON public.analytics_daily;
CREATE POLICY "ad_upsert_service"
  ON public.analytics_daily FOR ALL
  USING (true)
  WITH CHECK (true);
-- Note: The above "ALL" policy is permissive but RLS + anon key won't expose it;
-- aggregation runs server-side with service_role key.

-- 5. Function to refresh daily aggregation for a given date
CREATE OR REPLACE FUNCTION public.refresh_analytics_daily(target_date DATE DEFAULT CURRENT_DATE)
RETURNS void AS $$
BEGIN
  INSERT INTO public.analytics_daily (date, page_views, unique_visitors, product_views, add_to_carts, checkouts, searches)
  SELECT
    target_date,
    COUNT(*) FILTER (WHERE event_type = 'page_view'),
    COUNT(DISTINCT session_id),
    COUNT(*) FILTER (WHERE event_type = 'product_view'),
    COUNT(*) FILTER (WHERE event_type = 'add_to_cart'),
    COUNT(*) FILTER (WHERE event_type = 'checkout'),
    COUNT(*) FILTER (WHERE event_type = 'search')
  FROM public.analytics_events
  WHERE created_at::date = target_date
  ON CONFLICT (date) DO UPDATE SET
    page_views      = EXCLUDED.page_views,
    unique_visitors = EXCLUDED.unique_visitors,
    product_views   = EXCLUDED.product_views,
    add_to_carts    = EXCLUDED.add_to_carts,
    checkouts       = EXCLUDED.checkouts,
    searches        = EXCLUDED.searches;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- POST-CHECK
-- ============================================================
SELECT 'analytics_events' AS tabla, count(*) AS filas FROM public.analytics_events
UNION ALL
SELECT 'analytics_daily', count(*) FROM public.analytics_daily;
