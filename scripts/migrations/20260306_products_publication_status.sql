-- Add draft/published control for product visibility on storefront.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS publication_status TEXT NOT NULL DEFAULT 'published';

UPDATE public.products
SET publication_status = 'published'
WHERE publication_status IS NULL;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_publication_status_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_publication_status_check
  CHECK (publication_status IN ('draft', 'published'));

CREATE INDEX IF NOT EXISTS idx_products_publication_status
  ON public.products(publication_status);
