import { useState, useEffect } from "react";
import { getDistinctCidades } from "@/store/leads-store";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  showAll?: boolean;
}

export function TerritorySelector({ value, onChange, showAll = false }: Props) {
  const [cidades, setCidades] = useState<string[]>([]);

  useEffect(() => {
    getDistinctCidades().then(setCidades).catch(() => {});
  }, []);

  return (
    <div className="flex items-center gap-2">
      <MapPin className="h-4 w-4 text-primary" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[200px] border-primary/30">
          <SelectValue placeholder="Selecione território..." />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {showAll && <SelectItem value="__all__">Todos os Territórios</SelectItem>}
          {cidades.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
