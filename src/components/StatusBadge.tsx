import { LeadStatus, STATUS_COLORS } from "@/types/lead";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_COLORS[status] || "bg-muted text-muted-foreground")}>
      {status}
    </span>
  );
}
