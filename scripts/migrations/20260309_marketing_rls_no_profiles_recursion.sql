-- Hotfix: avoid profiles RLS recursion in marketing policies.
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
