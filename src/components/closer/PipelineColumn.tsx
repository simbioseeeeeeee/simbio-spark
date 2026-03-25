import { useDroppable } from "@dnd-kit/core";

interface Props {
  id: string;
  children: React.ReactNode;
  colorClass: string;
  count: number;
  totalValue: number;
}

export function PipelineColumn({ id, children, colorClass, count, totalValue }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div className="w-[280px] shrink-0">
      <div className={`rounded-t-lg px-3 py-2 ${colorClass}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{id}</span>
          <span className="text-xs font-bold">{count}</span>
        </div>
        {totalValue > 0 && (
          <p className="text-xs opacity-75 mt-0.5">
            R$ {totalValue.toLocaleString("pt-BR")}
          </p>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={`bg-muted/30 rounded-b-lg p-2 space-y-2 min-h-[200px] transition-colors ${isOver ? "ring-2 ring-primary/40 bg-primary/5" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}
