import { useState } from "react";
import { Lead } from "@/types/lead";
import { CloserPipeline } from "@/components/CloserPipeline";
import { LeadProfile } from "@/components/LeadProfile";
import { WorkspaceLayout } from "@/components/WorkspaceLayout";

function CloserContent({ territorio }: { territorio: string }) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  return (
    <>
      <CloserPipeline territorio={territorio} onSelectLead={setSelectedLead} />
      <LeadProfile
        lead={selectedLead}
        open={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        onSaved={(updated) => setSelectedLead(updated)}
      />
    </>
  );
}

export default function CloserWorkspace() {
  return (
    <WorkspaceLayout>
      {(territorio) => <CloserContent territorio={territorio} />}
    </WorkspaceLayout>
  );
}
