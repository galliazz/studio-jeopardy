CREATE TABLE public.soundboard_clips (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  host_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Clip',
  position integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'preset',
  preset_key text,
  storage_path text,
  trim_start_ms integer NOT NULL DEFAULT 0,
  trim_end_ms integer NOT NULL DEFAULT 0,
  gain real NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT soundboard_clips_source_chk CHECK (source IN ('preset','upload'))
);

CREATE INDEX soundboard_clips_game_idx ON public.soundboard_clips (game_id, position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.soundboard_clips TO authenticated;
GRANT ALL ON public.soundboard_clips TO service_role;

ALTER TABLE public.soundboard_clips ENABLE ROW LEVEL SECURITY;

CREATE POLICY soundboard_host_all ON public.soundboard_clips FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.games g WHERE g.id = soundboard_clips.game_id AND g.host_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.games g WHERE g.id = soundboard_clips.game_id AND g.host_id = auth.uid()));