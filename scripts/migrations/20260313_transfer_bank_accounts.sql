-- ============================================================
-- Transfer Bank Accounts for Invoice Emails
-- Date: 2026-03-13
-- ============================================================

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

CREATE TABLE IF NOT EXISTS public.transfer_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_holder TEXT,
  cbu TEXT NOT NULL,
  alias TEXT NOT NULL,
  cuit TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transfer_bank_accounts_is_active ON public.transfer_bank_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_transfer_bank_accounts_display_order ON public.transfer_bank_accounts(display_order, created_at);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_transfer_bank_accounts_updated_at ON public.transfer_bank_accounts;
CREATE TRIGGER trg_transfer_bank_accounts_updated_at
  BEFORE UPDATE ON public.transfer_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.transfer_bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transfer_bank_accounts_select_staff" ON public.transfer_bank_accounts;
CREATE POLICY "transfer_bank_accounts_select_staff"
  ON public.transfer_bank_accounts FOR SELECT
  USING (public.is_staff_user());

DROP POLICY IF EXISTS "transfer_bank_accounts_insert_staff" ON public.transfer_bank_accounts;
CREATE POLICY "transfer_bank_accounts_insert_staff"
  ON public.transfer_bank_accounts FOR INSERT
  WITH CHECK (public.is_staff_user());

DROP POLICY IF EXISTS "transfer_bank_accounts_update_staff" ON public.transfer_bank_accounts;
CREATE POLICY "transfer_bank_accounts_update_staff"
  ON public.transfer_bank_accounts FOR UPDATE
  USING (public.is_staff_user())
  WITH CHECK (public.is_staff_user());

DROP POLICY IF EXISTS "transfer_bank_accounts_delete_staff" ON public.transfer_bank_accounts;
CREATE POLICY "transfer_bank_accounts_delete_staff"
  ON public.transfer_bank_accounts FOR DELETE
  USING (public.is_staff_user());
