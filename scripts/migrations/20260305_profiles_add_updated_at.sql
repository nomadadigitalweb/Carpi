-- Ensure profiles.updated_at exists in legacy environments
BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

COMMIT;
