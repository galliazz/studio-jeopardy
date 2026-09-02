ALTER TABLE public.games ADD COLUMN IF NOT EXISTS overlay_token uuid NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS games_overlay_token_key ON public.games (overlay_token);