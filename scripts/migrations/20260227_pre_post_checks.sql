-- Carpi migration verification checks
-- Run PRE section before executing:
--   scripts/migrations/20260227_carpi_incremental_production.sql
-- Run POST section after executing migration.

-- =========================================================
-- PRE-CHECKS
-- =========================================================

-- 1) Current table shape (orders/profiles/products)
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'orders', 'products', 'order_items', 'product_prices', 'xubio_sync_log')
ORDER BY table_name, ordinal_position;

-- 2) Count core records
SELECT
  (SELECT COUNT(*) FROM public.profiles) AS profiles_count,
  (SELECT COUNT(*) FROM public.products) AS products_count,
  (SELECT COUNT(*) FROM public.orders) AS orders_count;

-- 3) Legacy role distribution (if role exists)
SELECT role, COUNT(*)
FROM public.profiles
GROUP BY role
ORDER BY COUNT(*) DESC;

-- 4) Orders linked by legacy email (for expected backfill coverage)
SELECT
  COUNT(*) FILTER (
    WHERE NULLIF(to_jsonb(o)->>'user_email', '') IS NOT NULL
  ) AS orders_with_user_email,
  COUNT(*) FILTER (
    WHERE EXISTS (
      SELECT 1
      FROM auth.users u
      WHERE lower(u.email) = lower(NULLIF(to_jsonb(o)->>'user_email', ''))
    )
  ) AS orders_email_match_auth_user,
  COUNT(*) FILTER (
    WHERE NOT EXISTS (
      SELECT 1
      FROM auth.users u
      WHERE lower(u.email) = lower(NULLIF(to_jsonb(o)->>'user_email', ''))
    )
    AND NULLIF(to_jsonb(o)->>'user_email', '') IS NOT NULL
  ) AS orders_email_without_match
FROM public.orders o;

-- 5) Potential duplicate xubio_product_id before unique index
SELECT (NULLIF(to_jsonb(p)->>'xubio_product_id', ''))::BIGINT AS xubio_product_id, COUNT(*)
FROM public.products p
WHERE NULLIF(to_jsonb(p)->>'xubio_product_id', '') IS NOT NULL
GROUP BY (NULLIF(to_jsonb(p)->>'xubio_product_id', ''))::BIGINT
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC, (NULLIF(to_jsonb(p)->>'xubio_product_id', ''))::BIGINT;

-- 6) Existing RLS policies snapshot
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'products', 'product_prices', 'orders', 'order_items', 'xubio_sync_log')
ORDER BY tablename, policyname;


-- =========================================================
-- POST-CHECKS
-- =========================================================

-- 1) New role distribution and invalid roles check
SELECT role, COUNT(*)
FROM public.profiles
GROUP BY role
ORDER BY COUNT(*) DESC;

SELECT COUNT(*) AS invalid_roles
FROM public.profiles
WHERE role NOT IN ('admin_carpi', 'gestor_financiero', 'encargado_ventas', 'fabricante', 'usuario');

-- 2) Required new columns existence
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'profiles' AND column_name IN ('parent_id','lista_precio_id','can_view_team_orders','is_active','email')) OR
    (table_name = 'orders' AND column_name IN ('user_id','fabricante_id','status','xubio_invoice_id','xubio_cae','xubio_invoice_pdf_url')) OR
    (table_name = 'products' AND column_name IN ('xubio_product_id','sku'))
  )
ORDER BY table_name, column_name;

-- 3) Backfill coverage for orders
SELECT
  COUNT(*) AS total_orders,
  COUNT(*) FILTER (WHERE user_id IS NOT NULL) AS orders_with_user_id,
  COUNT(*) FILTER (WHERE fabricante_id IS NOT NULL) AS orders_with_fabricante_id,
  COUNT(*) FILTER (WHERE status IS NOT NULL) AS orders_with_status
FROM public.orders;

-- 4) New tables availability
SELECT
  to_regclass('public.order_items') IS NOT NULL AS order_items_exists,
  to_regclass('public.product_prices') IS NOT NULL AS product_prices_exists,
  to_regclass('public.xubio_sync_log') IS NOT NULL AS xubio_sync_log_exists;

-- 5) Unique index for Xubio products
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'products'
  AND indexname = 'uq_products_xubio_product_id';

-- 6) Final duplicate check (must be 0 rows)
SELECT xubio_product_id, COUNT(*)
FROM public.products
WHERE xubio_product_id IS NOT NULL
GROUP BY xubio_product_id
HAVING COUNT(*) > 1;

-- 7) Policy presence check
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'products', 'product_prices', 'orders', 'order_items', 'xubio_sync_log')
ORDER BY tablename, policyname;

-- 8) Trigger check for auto-profile creation
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'auth'
  AND event_object_table = 'users'
  AND trigger_name = 'on_auth_user_created';
