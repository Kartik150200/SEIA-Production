-- Create a single-table snapshot store for seeded app data.
CREATE TABLE public.app_data (
  key text PRIMARY KEY,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_data TO authenticated;
GRANT ALL ON public.app_data TO service_role;

ALTER TABLE public.app_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read app data" ON public.app_data
  FOR SELECT TO authenticated USING (true);
