
CREATE OR REPLACE FUNCTION public.get_calls_list(
  p_cidade text DEFAULT NULL,
  p_resultado text DEFAULT NULL,
  p_days integer DEFAULT 7,
  p_limit integer DEFAULT 200,
  p_sdr_id uuid DEFAULT NULL
)
RETURNS TABLE(
  atividade_id uuid,
  lead_id uuid,
  fantasia text,
  razao_social text,
  cidade text,
  resultado text,
  nota text,
  duracao_segundos integer,
  url_gravacao text,
  transcricao text,
  sentimento text,
  de_numero text,
  para_numero text,
  created_at timestamptz,
  sdr_id uuid
)
LANGUAGE sql STABLE SET search_path = 'public'
AS $$
  SELECT
    a.id AS atividade_id,
    a.lead_id,
    l.fantasia, l.razao_social, l.cidade,
    a.resultado, a.nota,
    a.duracao_segundos, a.url_gravacao, a.transcricao, a.sentimento,
    a.de_numero, a.para_numero,
    a.created_at,
    a.sdr_id
  FROM public.atividades a
  INNER JOIN public.leads l ON l.id = a.lead_id
  WHERE a.tipo_atividade = 'Ligação'
    AND (p_cidade IS NULL OR l.cidade = p_cidade)
    AND (p_resultado IS NULL OR a.resultado = p_resultado)
    AND (p_sdr_id IS NULL OR a.sdr_id = p_sdr_id)
    AND a.created_at >= ((CURRENT_DATE - make_interval(days => p_days - 1)) AT TIME ZONE 'America/Sao_Paulo')
  ORDER BY a.created_at DESC
  LIMIT p_limit;
$$;
