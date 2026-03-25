import { Lead, ESTAGIO_FUNIL_OPTIONS, EstagioFunil, ESTAGIO_COLORS } from "@/types/lead";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Calendar, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}

export function KanbanBoard({ leads, onSelectLead }: Props) {
  // Show leads with status "Reunião Agendada" or that have estagio_funil set
  const kanbanLeads = leads.filter(
    (l) => l.status_sdr === "Reunião Agendada" || l.estagio_funil
  );

  const getLeadsForStage = (stage: EstagioFunil) =>
    kanbanLeads.filter((l) => l.estagio_funil === stage);

  // Leads with "Reunião Agendada" status but no estagio_funil yet
  const unassigned = kanbanLeads.filter((l) => !l.estagio_funil);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {/* Unassigned column */}
      {unassigned.length > 0 && (
        <KanbanColumn
          title="Sem Estágio"
          color="bg-muted text-muted-foreground"
          leads={unassigned}
          onSelectLead={onSelectLead}
        />
      )}
      {ESTAGIO_FUNIL_OPTIONS.map((stage) => (
        <KanbanColumn
          key={stage}
          title={stage}
          color={ESTAGIO_COLORS[stage]}
          leads={getLeadsForStage(stage)}
          onSelectLead={onSelectLead}
        />
      ))}
    </div>
  );
}

function KanbanColumn({
  title,
  color,
  leads,
  onSelectLead,
}: {
  title: string;
  color: string;
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}) {
  return (
    <div className="min-w-[260px] w-[260px] flex-shrink-0">
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="secondary" className={cn("text-xs", color)}>
          {title}
        </Badge>
        <span className="text-xs text-muted-foreground">({leads.length})</span>
      </div>
      <div className="space-y-2">
        {leads.map((lead) => (
          <Card
            key={lead.id}
            className="cursor-pointer hover:shadow-md transition-shadow border-border"
            onClick={() => onSelectLead(lead)}
          >
            <CardContent className="p-3 space-y-2">
              <div className="flex items-start gap-2">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-sm font-medium leading-tight truncate">
                  {lead.fantasia || lead.razao_social}
                </p>
              </div>
              <p className="text-xs text-muted-foreground truncate">{lead.cidade}/{lead.uf}</p>
              {lead.valor_negocio_estimado && (
                <div className="flex items-center gap-1 text-xs text-success">
                  <DollarSign className="h-3 w-3" />
                  R$ {lead.valor_negocio_estimado.toLocaleString("pt-BR")}
                </div>
              )}
              {lead.data_proximo_passo && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {new Date(lead.data_proximo_passo).toLocaleDateString("pt-BR")}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {leads.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">Nenhum lead</p>
        )}
      </div>
    </div>
  );
}
