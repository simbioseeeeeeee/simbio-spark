import { useState, useEffect, useCallback } from "react";
import { WorkspaceLayout } from "@/components/WorkspaceLayout";
import { getManagerAnalytics, getLeaderboard, ManagerAnalytics, LeaderboardEntry } from "@/store/leads-store";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, Activity, CalendarCheck, DollarSign, Trophy, Loader2, TrendingUp, Target, BarChart3,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

function KpiCard({ label, value, icon: Icon, color, prefix }: { label: string; value: string | number; icon: any; color: string; prefix?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
      <p className="text-3xl font-bold">{prefix}{value}</p>
    </div>
  );
}

const ROLE_BADGE: Record<string, string> = {
  sdr: "bg-primary/15 text-primary",
  closer: "bg-success/15 text-success",
  manager: "bg-warning/15 text-warning",
};

function ManagerContent({ territorio }: { territorio: string }) {
  const [period, setPeriod] = useState<number>(1);
  const [analytics, setAnalytics] = useState<ManagerAnalytics | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const cidade = territorio || null;
      const [a, l] = await Promise.all([
        getManagerAnalytics(cidade, period),
        getLeaderboard(cidade, period),
      ]);
      setAnalytics(a);
      setLeaderboard(l);
    } catch (err: any) {
      toast({ title: "Erro ao carregar analytics", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [territorio, period]);

  useEffect(() => { loadData(); }, [loadData]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(val);
  };

  if (loading || !analytics) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <>
      {/* Period Filter */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Control Tower
          {territorio && <span className="text-sm font-normal text-muted-foreground">— {territorio}</span>}
        </h2>
        <Tabs value={String(period)} onValueChange={(v) => setPeriod(Number(v))}>
          <TabsList>
            <TabsTrigger value="1">Hoje</TabsTrigger>
            <TabsTrigger value="7">7 Dias</TabsTrigger>
            <TabsTrigger value="30">30 Dias</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard label="Leads Qualificados" value={Number(analytics.total_leads_qualificados)} icon={Users} color="bg-primary/10 text-primary" />
        <KpiCard label="Atividades Executadas" value={Number(analytics.total_atividades)} icon={Activity} color="bg-warning/10 text-warning" />
        <KpiCard label="Reuniões Agendadas" value={Number(analytics.total_reunioes)} icon={CalendarCheck} color="bg-success/10 text-success" />
        <KpiCard label="Fechamentos Ganhos" value={Number(analytics.total_fechamentos)} icon={Target} color="bg-success/10 text-success" />
        <KpiCard
          label="Pipeline (R$)"
          value={formatCurrency(Number(analytics.valor_pipeline))}
          icon={DollarSign}
          color="bg-primary/10 text-primary"
        />
      </div>

      {/* Leaderboard */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Trophy className="h-4 w-4 text-warning" />
          Ranking da Equipe
        </h3>

        {leaderboard.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-lg text-muted-foreground">
            <Trophy className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Nenhum dado ainda</p>
            <p className="text-sm mt-1">O ranking aparecerá quando os usuários registrarem atividades.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[40px]">#</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-[100px]">Cargo</TableHead>
                  <TableHead className="w-[120px] text-center">Atividades</TableHead>
                  <TableHead className="w-[120px] text-center">Reuniões</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((entry, idx) => (
                  <TableRow key={entry.user_id}>
                    <TableCell className="font-bold text-muted-foreground">
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
                    </TableCell>
                    <TableCell className="font-medium">{entry.nome}</TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_BADGE[entry.role] || ""}`}>
                        {entry.role.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="text-center font-bold">{Number(entry.total_atividades)}</TableCell>
                    <TableCell className="text-center font-bold">{Number(entry.total_reunioes)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  );
}

export default function ManagerWorkspace() {
  return (
    <WorkspaceLayout allTerritorios>
      {(territorio) => <ManagerContent territorio={territorio} />}
    </WorkspaceLayout>
  );
}
