CREATE TABLE public.flow_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'Schwab',
  est_aum numeric NOT NULL DEFAULT 0,
  stated_need text NOT NULL DEFAULT 'Retirement',
  opportunity_band text NOT NULL DEFAULT '$1-3M',
  submitting_rep text NOT NULL DEFAULT '',
  intake_notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new',
  returned_reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flow_leads TO authenticated;
GRANT ALL ON public.flow_leads TO service_role;
ALTER TABLE public.flow_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can view flow leads" ON public.flow_leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team can create flow leads" ON public.flow_leads FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Team can update flow leads" ON public.flow_leads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Creator can delete flow leads" ON public.flow_leads FOR DELETE TO authenticated USING (auth.uid() = created_by);

CREATE TABLE public.flow_lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.flow_leads(id) ON DELETE CASCADE,
  author_id uuid,
  author_name text NOT NULL DEFAULT '',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flow_lead_notes TO authenticated;
GRANT ALL ON public.flow_lead_notes TO service_role;
ALTER TABLE public.flow_lead_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can view notes" ON public.flow_lead_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team can add notes" ON public.flow_lead_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Author can delete notes" ON public.flow_lead_notes FOR DELETE TO authenticated USING (auth.uid() = author_id);

CREATE TABLE public.planscout_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_key text NOT NULL UNIQUE,
  lead_name text NOT NULL DEFAULT '',
  retirement text NOT NULL DEFAULT '',
  tax text NOT NULL DEFAULT '',
  cash_flow text NOT NULL DEFAULT '',
  talking_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  risks jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planscout_insights TO authenticated;
GRANT ALL ON public.planscout_insights TO service_role;
ALTER TABLE public.planscout_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can view insights" ON public.planscout_insights FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team can create insights" ON public.planscout_insights FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team can update insights" ON public.planscout_insights FOR UPDATE TO authenticated USING (true);

CREATE TABLE public.conversion_trackers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_key text NOT NULL UNIQUE,
  lead_name text NOT NULL DEFAULT '',
  advisor_id text NOT NULL DEFAULT '',
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  next_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  meeting_at timestamptz,
  outcome text NOT NULL DEFAULT 'in_progress',
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversion_trackers TO authenticated;
GRANT ALL ON public.conversion_trackers TO service_role;
ALTER TABLE public.conversion_trackers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can view trackers" ON public.conversion_trackers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team can create trackers" ON public.conversion_trackers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team can update trackers" ON public.conversion_trackers FOR UPDATE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER flow_leads_touch BEFORE UPDATE ON public.flow_leads FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER planscout_touch BEFORE UPDATE ON public.planscout_insights FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trackers_touch BEFORE UPDATE ON public.conversion_trackers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();