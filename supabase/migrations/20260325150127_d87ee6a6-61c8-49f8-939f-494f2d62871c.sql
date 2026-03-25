
CREATE OR REPLACE FUNCTION public.distinct_ufs()
RETURNS TABLE(uf text)
LANGUAGE sql STABLE
AS $$
  SELECT DISTINCT l.uf FROM public.leads l WHERE l.uf IS NOT NULL ORDER BY l.uf;
$$;

CREATE OR REPLACE FUNCTION public.distinct_cidades(p_uf text DEFAULT NULL)
RETURNS TABLE(cidade text)
LANGUAGE sql STABLE
AS $$
  SELECT DISTINCT l.cidade FROM public.leads l
  WHERE l.cidade IS NOT NULL
    AND (p_uf IS NULL OR l.uf = p_uf)
  ORDER BY l.cidade;
$$;
