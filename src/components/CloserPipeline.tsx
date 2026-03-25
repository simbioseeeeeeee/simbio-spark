import { useState, useEffect, useCallback } from "react";
import { Lead, ESTAGIO_FUNIL_OPTIONS, EstagioFunil, ESTAGIO_COLORS, Atividade } from "@/types/lead";
import { getKanbanLeads, updateLead, getLeadAtividades } from "@/store/leads-store";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  territorio: string;
  onSelectLead: (lead: Lead) => void;
}

const COLUMNS: EstagioFunil[] = ESTAGIO_FUNIL_OPTIONS;

function KanbanCard({ lead, onClick, atividades }: { lead: Lead; onClick: () => void; atividades: Atividade[] }) {
  return (
    <div
      className="rounded-lg border border-border bg-card p-3 cursor-pointer hover:border-primary/30 transition-colors space-y-2"
      onClick={onClick}
    >
      <p className="font-medium text-sm truncate">{lead.fantasia || lead.razao_social}</p>
      <p className="text-xs text-muted-foreground">{lead.bairro} · {lead.celular1 || lead.telefone1 || "—"}</p>
      {lead.lead_score !== null && (
        <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-bold ${
          lead.lead_score >= 70 ? "bg-success/15 text-success" : lead.lead_score >= 40 ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"
        }`}>{lead.lead_score} pts</span>
      )}
      {/* Last 3 activities */}
      {atividades.length > 0 && (
        <div className="border-t border-border pt-2 space-y-1">
          {atividades.slice(0, 3).map((a) => (
            <div key={a.id} className="text-xs text-muted-foreground flex gap-1.5">
              <span className="font-medium text-foreground/70">{a.tipo_atividade}</span>
              <span>→ {a.resultado}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CloserPipeline({ territorio, onSelectLead }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [atividades, setAtividades] = useState<Record<string, Atividade[]>>({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!territorio) return;
    setLoading(true);
    try {
      const data = await getKanbanLeads(territorio);
      setLeads(data);
      // Load activities for all leads
      const atvsMap: Record<string, Atividade[]> = {};
      await Promise.all(
        data.slice(0, 50).map(async (lead) => {
          try {
            atvsMap[lead.id] = await getLeadAtividades(lead.id, 3);
          } catch { atvsMap[lead.id] = []; }
        })
      );
      setAtividades(atvsMap);
    } catch (err: any) {
      toast({ title: "Erro ao carregar pipeline", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [territorio]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {COLUMNS.map((col) => {
          const colLeads = leads.filter((l) => l.estagio_funil === col);
          const colorClass = ESTAGIO_COLORS[col] || "";
          return (
            <div key={col} className="w-[280px] shrink-0">
              <div className={`rounded-t-lg px-3 py-2 flex items-center justify-between ${colorClass}`}>
                <span className="text-sm font-semibold">{col}</span>
                <span className="text-xs font-bold">{colLeads.length}</span>
              </div>
              <div className="bg-muted/30 rounded-b-lg p-2 space-y-2 min-h-[200px]">
                {colLeads.map((lead) => (
                  <KanbanCard
                    key={lead.id}
                    lead={lead}
                    onClick={() => onSelectLead(lead)}
                    atividades={atividades[lead.id] || []}
                  />
                ))}
                {colLeads.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">Vazio</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
