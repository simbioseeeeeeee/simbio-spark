-- Add cadencia columns to leads if not exist
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS dia_cadencia integer NOT NULL DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS status_cadencia text NOT NULL DEFAULT 'ativo';

-- Create atividades table
CREATE TABLE IF NOT EXISTS public.atividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tipo_atividade text NOT NULL,
  resultado text NOT NULL,
  nota text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;

-- Public policies (matching leads table pattern)
CREATE POLICY "Allow all select atividades" ON public.atividades FOR SELECT TO public USING (true);
CREATE POLICY "Allow all insert atividades" ON public.atividades FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow all update atividades" ON public.atividades FOR UPDATE TO public USING (true);
CREATE POLICY "Allow all delete atividades" ON public.atividades FOR DELETE TO public USING (true);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_atividades_lead_id ON public.atividades(lead_id);
CREATE INDEX IF NOT EXISTS idx_atividades_created_at ON public.atividades(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_territorio ON public.leads(cidade, status_sdr);
CREATE INDEX IF NOT EXISTS idx_leads_cadencia ON public.leads(cidade, lead_score, data_proximo_passo);

-- Function to get today's activity metrics for a territory
CREATE OR REPLACE FUNCTION public.get_daily_metrics(p_cidade text)
RETURNS TABLE(pesquisas_hoje bigint, tentativas_hoje bigint, conexoes_hoje bigint, reunioes_hoje bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    COUNT(*) FILTER (WHERE a.tipo_atividade = 'Pesquisa') AS pesquisas_hoje,
    COUNT(*) FILTER (WHERE a.tipo_atividade IN ('WhatsApp', 'Ligação', 'Email')) AS tentativas_hoje,
    COUNT(*) FILTER (WHERE a.resultado IN ('Conectado', 'Atendeu', 'Respondeu')) AS conexoes_hoje,
    COUNT(*) FILTER (WHERE a.resultado = 'Agendou Reunião') AS reunioes_hoje
  FROM public.atividades a
  INNER JOIN public.leads l ON l.id = a.lead_id
  WHERE l.cidade = p_cidade
    AND a.created_at >= (CURRENT_DATE AT TIME ZONE 'America/Sao_Paulo')
    AND a.created_at < ((CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'America/Sao_Paulo');
$$;

-- Function to get cadence leads for today
CREATE OR REPLACE FUNCTION public.get_cadencia_hoje(p_cidade text)
RETURNS SETOF public.leads
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT * FROM public.leads
  WHERE cidade = p_cidade
    AND lead_score >= 50
    AND status_cadencia = 'ativo'
    AND status_sdr NOT IN ('Desqualificado', 'Reunião Agendada')
    AND (data_proximo_passo IS NULL OR data_proximo_passo <= CURRENT_TIMESTAMP)
  ORDER BY lead_score DESC NULLS LAST, data_proximo_passo ASC NULLS FIRST
  LIMIT 100;
$$;

-- Function to get last N activities for a lead
CREATE OR REPLACE FUNCTION public.get_lead_atividades(p_lead_id uuid, p_limit integer DEFAULT 10)
RETURNS TABLE(id uuid, tipo_atividade text, resultado text, nota text, created_at timestamptz)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT a.id, a.tipo_atividade, a.resultado, a.nota, a.created_at
  FROM public.atividades a
  WHERE a.lead_id = p_lead_id
  ORDER BY a.created_at DESC
  LIMIT p_limit;
$$;