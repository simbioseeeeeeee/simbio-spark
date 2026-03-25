import { useRef, useState } from "react";
import { parseCSV, importLeads } from "@/store/leads-store";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Upload, Loader2 } from "lucide-react";

interface Props {
  onImported: () => void;
}

export function CSVImport({ onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        toast({ title: "Erro", description: "Nenhum lead encontrado no CSV.", variant: "destructive" });
        return;
      }
      const count = await importLeads(parsed);
      toast({ title: "Importação concluída!", description: `${count} leads importados com sucesso.` });
      onImported();
    } catch (err: any) {
      toast({ title: "Erro na importação", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
      <Button onClick={() => inputRef.current?.click()} variant="outline" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
        {loading ? "Importando..." : "Importar CSV"}
      </Button>
    </>
  );
}
