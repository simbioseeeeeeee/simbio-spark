-- Fix existing leads with status_sdr = 'Reunião Agendada' but null estagio_funil
UPDATE public.leads
SET estagio_funil = 'Reunião Agendada'
WHERE status_sdr = 'Reunião Agendada'
  AND (estagio_funil IS NULL);

-- Create trigger to auto-set estagio_funil when status_sdr changes to 'Reunião Agendada'
CREATE OR REPLACE FUNCTION public.sync_estagio_funil_on_reuniao()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status_sdr = 'Reunião Agendada' AND (NEW.estagio_funil IS NULL) THEN
    NEW.estagio_funil := 'Reunião Agendada';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_estagio_funil
  BEFORE INSERT OR UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_estagio_funil_on_reuniao();