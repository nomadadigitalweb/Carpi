-- ============================================================
-- Marketing Campaigns / Newsletter — Migration
-- Date: 2026-02-28
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'marketing_campaign_status') THEN
    CREATE TYPE public.marketing_campaign_status AS ENUM ('draft', 'ready', 'sent');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'marketing_recipient_status') THEN
    CREATE TYPE public.marketing_recipient_status AS ENUM ('pending', 'sent', 'failed');
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

CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name             TEXT NOT NULL,
  subject          TEXT NOT NULL,
  content_html     TEXT NOT NULL,
  content_text     TEXT,
  ai_prompt        TEXT,
  ai_context       JSONB DEFAULT '{}',
  status           public.marketing_campaign_status DEFAULT 'draft',
  recipient_filter TEXT DEFAULT 'usuarios_activos',
  total_recipients INTEGER DEFAULT 0,
  total_sent       INTEGER DEFAULT 0,
  total_failed     INTEGER DEFAULT 0,
  sent_at          TIMESTAMPTZ,
  created_by       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketing_campaign_recipients (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id       UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  profile_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  email             TEXT NOT NULL,
  full_name         TEXT,
  status            public.marketing_recipient_status DEFAULT 'pending',
  provider_message_id TEXT,
  error_message     TEXT,
  sent_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mc_status ON public.marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_mc_created_at ON public.marketing_campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mc_created_by ON public.marketing_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_mcr_campaign ON public.marketing_campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_mcr_status ON public.marketing_campaign_recipients(status);
CREATE INDEX IF NOT EXISTS idx_mcr_email ON public.marketing_campaign_recipients(email);

CREATE OR REPLACE FUNCTION public.set_marketing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_marketing_campaigns_updated_at ON public.marketing_campaigns;
CREATE TRIGGER trg_marketing_campaigns_updated_at
BEFORE UPDATE ON public.marketing_campaigns
FOR EACH ROW EXECUTE FUNCTION public.set_marketing_updated_at();

ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaign_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marketing_campaigns_staff_all" ON public.marketing_campaigns;
DROP POLICY IF EXISTS "marketing_campaigns_staff_insert" ON public.marketing_campaigns;
DROP POLICY IF EXISTS "marketing_campaigns_staff_update" ON public.marketing_campaigns;
DROP POLICY IF EXISTS "marketing_campaigns_staff_delete" ON public.marketing_campaigns;
CREATE POLICY "marketing_campaigns_staff_all"
  ON public.marketing_campaigns
  FOR SELECT
  USING (public.is_staff_user());
CREATE POLICY "marketing_campaigns_staff_insert"
  ON public.marketing_campaigns
  FOR INSERT
  WITH CHECK (public.is_staff_user());
CREATE POLICY "marketing_campaigns_staff_update"
  ON public.marketing_campaigns
  FOR UPDATE
  USING (public.is_staff_user())
  WITH CHECK (public.is_staff_user());
CREATE POLICY "marketing_campaigns_staff_delete"
  ON public.marketing_campaigns
  FOR DELETE
  USING (public.is_staff_user());

DROP POLICY IF EXISTS "marketing_recipients_staff_all" ON public.marketing_campaign_recipients;
DROP POLICY IF EXISTS "marketing_recipients_staff_insert" ON public.marketing_campaign_recipients;
DROP POLICY IF EXISTS "marketing_recipients_staff_update" ON public.marketing_campaign_recipients;
DROP POLICY IF EXISTS "marketing_recipients_staff_delete" ON public.marketing_campaign_recipients;
CREATE POLICY "marketing_recipients_staff_all"
  ON public.marketing_campaign_recipients
  FOR SELECT
  USING (public.is_staff_user());
CREATE POLICY "marketing_recipients_staff_insert"
  ON public.marketing_campaign_recipients
  FOR INSERT
  WITH CHECK (public.is_staff_user());
CREATE POLICY "marketing_recipients_staff_update"
  ON public.marketing_campaign_recipients
  FOR UPDATE
  USING (public.is_staff_user())
  WITH CHECK (public.is_staff_user());
CREATE POLICY "marketing_recipients_staff_delete"
  ON public.marketing_campaign_recipients
  FOR DELETE
  USING (public.is_staff_user());

SELECT 'marketing_campaigns' AS tabla, count(*) AS filas FROM public.marketing_campaigns
UNION ALL
SELECT 'marketing_campaign_recipients', count(*) FROM public.marketing_campaign_recipients;
