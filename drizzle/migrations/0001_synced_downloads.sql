CREATE TABLE public.synced_downloads (
  user_id uuid NOT NULL,
  track_id text NOT NULL,
  track jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, track_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.synced_downloads TO authenticated;
GRANT ALL ON public.synced_downloads TO service_role;
ALTER TABLE public.synced_downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own synced downloads" ON public.synced_downloads FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);