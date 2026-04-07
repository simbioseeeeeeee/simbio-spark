import { useState } from "react";
import { Lead } from "@/types/lead";
import { CloserPipeline } from "@/components/CloserPipeline";
import { LeadProfile } from "@/components/LeadProfile";
import { LeadExplorer } from "@/components/LeadExplorer";
import { NewLeadModal } from "@/components/NewLeadModal";
import { AppLayout } from "@/components/AppLayout";
import { TerritorySelector } from "@/components/TerritorySelector";
import { useLocation } from "react-router-dom";

function CloserPipelineView() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  return (
    <>
      <CloserPipeline onSelectLead={setSelectedLead} />
      <LeadProfile
        lead={selectedLead}
        open={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        onSaved={(updated) => setSelectedLead(updated)}
      />
    </>
  );
}

function CloserExplorerView({ territorio }: { territorio: string }) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  if (!territorio) {
    return <div className="text-center py-16 text-muted-foreground">Selecione um território acima para ver os leads.</div>;
  }

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-foreground">Explorador de Leads{territorio && territorio !== "__all__" ? ` — ${territorio}` : ""}</h2>
        <NewLeadModal onCreated={() => setRefreshKey((k) => k + 1)} />
      </div>
      <LeadExplorer key={refreshKey} territorio={territorio} onSelectLead={setSelectedLead} />
      <LeadProfile lead={selectedLead} open={!!selectedLead} onClose={() => setSelectedLead(null)} onSaved={(u) => setSelectedLead(u)} />
    </>
  );
}

export default function CloserWorkspace() {
  const location = useLocation();
  const isExplorer = location.pathname.includes("/explorador");
  const [territorio, setTerritorio] = useState("");

  return (
    <AppLayout headerExtra={isExplorer ? <TerritorySelector value={territorio} onChange={setTerritorio} /> : undefined}>
      {isExplorer ? (
        <CloserExplorerView territorio={territorio} />
      ) : (
        <CloserPipelineView />
      )}
    </AppLayout>
  );
}
