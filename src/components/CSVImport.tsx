import { useRef } from "react";
import { parseCSV, getLeads, saveLeads } from "@/store/leads-store";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";

interface Props {
  onImported: () => void;
}

export function CSVImport({ onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const newLeads = parseCSV(text);
      if (newLeads.length === 0) {
        toast({ title: "Erro", description: "Nenhum lead encontrado no CSV.", variant: "destructive" });
        return;
      }
      const existing = getLeads();
      saveLeads([...existing, ...newLeads]);
      toast({ title: "Importação concluída!", description: `${newLeads.length} leads importados com sucesso.` });
      onImported();
    };
    reader.readAsText(file, "UTF-8");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <>
      <input ref={inputRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
      <Button onClick={() => inputRef.current?.click()} variant="outline">
        <Upload className="h-4 w-4 mr-2" /> Importar CSV
      </Button>
    </>
  );
}
