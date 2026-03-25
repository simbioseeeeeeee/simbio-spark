
-- 1. Role enum
CREATE TYPE public.app_role AS ENUM ('sdr', 'closer', 'manager');

-- 2. user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  nome text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- 4. RLS policies for user_roles
CREATE POLICY "Users read own role" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Managers read all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Service role full access" ON public.user_roles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. Add tracking columns to leads and atividades
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS owner_id uuid;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS sdr_id uuid;
ALTER TABLE public.atividades ADD COLUMN IF NOT EXISTS owner_id uuid;
ALTER TABLE public.atividades ADD COLUMN IF NOT EXISTS sdr_id uuid;

-- 6. Manager analytics function
CREATE OR REPLACE FUNCTION public.get_manager_analytics(
  p_cidade text DEFAULT NULL,
  p_days integer DEFAULT 1
)
RETURNS TABLE(
  total_leads_qualificados bigint,
  total_atividades bigint,
  total_reunioes bigint,
  total_fechamentos bigint,
  valor_pipeline numeric
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM leads WHERE (p_cidade IS NULL OR cidade = p_cidade) AND lead_score >= 50),
    (SELECT COUNT(*) FROM atividades a INNER JOIN leads l ON l.id = a.lead_id
     WHERE (p_cidade IS NULL OR l.cidade = p_cidade)
       AND a.created_at >= ((CURRENT_DATE - make_interval(days => p_days - 1)) AT TIME ZONE 'America/Sao_Paulo')),
    (SELECT COUNT(*) FROM atividades a INNER JOIN leads l ON l.id = a.lead_id
     WHERE (p_cidade IS NULL OR l.cidade = p_cidade)
       AND a.resultado = 'Agendou Reunião'
       AND a.created_at >= ((CURRENT_DATE - make_interval(days => p_days - 1)) AT TIME ZONE 'America/Sao_Paulo')),
    (SELECT COUNT(*) FROM leads WHERE (p_cidade IS NULL OR cidade = p_cidade) AND estagio_funil = 'Fechado Ganho'),
    (SELECT COALESCE(SUM(valor_negocio_estimado), 0) FROM leads
     WHERE (p_cidade IS NULL OR cidade = p_cidade)
       AND estagio_funil IS NOT NULL
       AND estagio_funil NOT IN ('Fechado Ganho', 'Fechado Perdido'))
$$;

-- 7. Leaderboard function
CREATE OR REPLACE FUNCTION public.get_leaderboard(
  p_cidade text DEFAULT NULL,
  p_days integer DEFAULT 7
)
RETURNS TABLE(user_id uuid, nome text, role text, total_atividades bigint, total_reunioes bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ur.user_id,
    ur.nome,
    ur.role::text,
    COUNT(a.id) AS total_atividades,
    COUNT(a.id) FILTER (WHERE a.resultado = 'Agendou Reunião') AS total_reunioes
  FROM public.user_roles ur
  LEFT JOIN public.atividades a ON a.sdr_id = ur.user_id
    AND a.created_at >= ((CURRENT_DATE - make_interval(days => p_days - 1)) AT TIME ZONE 'America/Sao_Paulo')
    AND (p_cidade IS NULL OR EXISTS (SELECT 1 FROM public.leads l WHERE l.id = a.lead_id AND l.cidade = p_cidade))
  GROUP BY ur.user_id, ur.nome, ur.role
  ORDER BY total_atividades DESC
$$;
