import { useState, useEffect } from "react";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { getDistinctCidades } from "@/store/leads-store";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, LogOut, Shield, Crosshair, Columns3, BarChart3 } from "lucide-react";

const ROLE_LABELS: Record<AppRole, string> = {
  sdr: "SDR",
  closer: "Closer",
  manager: "Gerente",
};

const ROLE_COLORS: Record<AppRole, string> = {
  sdr: "bg-primary/15 text-primary",
  closer: "bg-success/15 text-success",
  manager: "bg-warning/15 text-warning",
};

const ROLE_ICONS: Record<AppRole, React.ReactNode> = {
  sdr: <Crosshair className="h-3 w-3" />,
  closer: <Columns3 className="h-3 w-3" />,
  manager: <BarChart3 className="h-3 w-3" />,
};

interface Props {
  children: (territorio: string) => React.ReactNode;
  showTerritorio?: boolean;
  allTerritorios?: boolean;
  headerExtra?: React.ReactNode;
}

export function WorkspaceLayout({ children, showTerritorio = true, allTerritorios = false, headerExtra }: Props) {
  const { user, role, userName, signOut } = useAuth();
  const [territorio, setTerritorio] = useState("");
  const [cidades, setCidades] = useState<string[]>([]);

  useEffect(() => {
    getDistinctCidades().then((cities) => {
      setCidades(cities);
      if (!allTerritorios) {
        const def = cities.includes("CAMPINAS") ? "CAMPINAS" : cities[0] || "";
        setTerritorio(def);
      }
    }).catch(() => {});
  }, [allTerritorios]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground hidden sm:inline">Simbiose Sales OS</span>
          </div>

          {/* Role Badge */}
          {role && (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_COLORS[role]}`}>
              {ROLE_ICONS[role]}
              {ROLE_LABELS[role]}
            </span>
          )}

          {/* Territory Selector */}
          {showTerritorio && (
            <div className="flex items-center gap-2 ml-auto sm:ml-4">
              <MapPin className="h-4 w-4 text-primary" />
              <Select value={territorio} onValueChange={setTerritorio}>
                <SelectTrigger className="w-[200px] border-primary/30">
                  <SelectValue placeholder="Selecione o território..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {allTerritorios && <SelectItem value="__all__">Todos os Territórios</SelectItem>}
                  {cidades.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {headerExtra}

          {/* User Info + Logout */}
          <div className="flex items-center gap-3 ml-auto">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-foreground">{userName || user?.email}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5 text-muted-foreground">
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5 space-y-5">
        {showTerritorio && !territorio ? (
          <div className="text-center py-20 text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium">Selecione um território para começar</p>
          </div>
        ) : (
          children(territorio === "__all__" ? "" : territorio)
        )}
      </main>
    </div>
  );
}
