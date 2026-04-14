import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { TerritorySelector } from "@/components/TerritorySelector";
import { LeadProfile } from "@/components/LeadProfile";
import { ActivityModal } from "@/components/ActivityModal";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  getFollowupKpis, getFollowupsList, reagendarFollowup, getUserRolesList,
  FollowupKpis, FollowupEntry,
} from "@/store/leads-store";
import { Lead, STATUS_OPTIONS, ESTAGIO_FUNIL_OPTIONS } from "@/types/lead";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  AlertTriangle, CalendarCheck, CalendarClock, Loader2, Clock, CalendarIcon, ExternalLink, CheckCircle2,
} from "lucide-react";
import { formatDistanceToNow, differenceInHours, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function RelativeTime({ date }: { date: string | null }) {
  if (!date) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span className="text-xs text-muted-foreground">
      {formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR })}
    </span>
  );
}

export default function FollowUps() {
  const { user } = useAuth();
  const [territorio, setTerritorio] = useState("__all__");
  const [kpis, setKpis] = useState<FollowupKpis>({ atrasados: 0, hoje: 0, proximos_3_dias: 0 });
  const [followups, setFollowups] = useState<FollowupEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<{ user_id: string; nome: string; role: string }[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [estagioFilter, setEstagioFilter] = useState("all");
  const [responsavelFilter, setResponsavelFilter] = useState("all");

  // Modals
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activityLead, setActivityLead] = useState<FollowupEntry | null>(null);
  const [reagendarLead, setReagendarLead] = useState<FollowupEntry | null>(null);
  const [reagendarDate, setReagendarDate] = useState<Date | undefined>();

  const cidade = territorio === "__all__" ? null : territorio;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [k, list, u] = await Promise.all([
        getFollowupKpis(cidade),
        getFollowupsList({
          cidade,
          statusSdr: statusFilter !== "all" ? statusFilter : null,
          estagioFunil: estagioFilter !== "all" ? estagioFilter : null,
          responsavelId: responsavelFilter !== "all" ? responsavelFilter : null,
        }),
        getUserRolesList(),
      ]);
      setKpis(k);
      setFollowups(list);
      setUsers(u);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [cidade, statusFilter, estagioFilter, responsavelFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleReagendar = async () => {
    if (!reagendarLead || !reagendarDate) return;
    try {
      await reagendarFollowup(reagendarLead.id, reagendarDate);
      toast({ title: "✅ Reagendado!" });
      setReagendarLead(null);
      setReagendarDate(undefined);
      loadData();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const openLeadProfile = async (entry: FollowupEntry) => {
    const { data } = await supabase.from("leads").select("*").eq("id", entry.id).single();
    if (data) setSelectedLead(data as any);
  };

  const isSlaBroken = (date: string | null) => {
    if (!date) return false;
    return differenceInHours(new Date(), new Date(date)) > 48;
  };

  const getUserName = (id: string | null) => {
    if (!id) return "—";
    return users.find((u) => u.user_id === id)?.nome || "—";
  };

  return (
    <AppLayout headerExtra={<TerritorySelector value={territorio} onChange={setTerritorio} />}>
      <h1 className="text-lg font-bold text-foreground">Follow-ups Pendentes</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="Atrasados" value={kpis.atrasados} icon={AlertTriangle} color="bg-destructive/10 text-destructive" />
        <KpiCard label="Hoje" value={kpis.hoje} icon={CalendarCheck} color="bg-primary/10 text-primary" />
        <KpiCard label="Próximos 3 dias" value={kpis.proximos_3_dias} icon={CalendarClock} color="bg-warning/10 text-warning" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status SDR" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            {STATUS_OPTIONS.filter((s) => !s.startsWith("Desqualificado")).map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={estagioFilter} onValueChange={setEstagioFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Estágio Funil" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Estágios</SelectItem>
            {ESTAGIO_FUNIL_OPTIONS.map((e) => (
              <SelectItem key={e} value={e}>{e}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={responsavelFilter} onValueChange={setResponsavelFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Responsável" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.user_id} value={u.user_id}>{u.nome || u.user_id.slice(0, 8)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="ml-auto">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar"}
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : followups.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-lg">
          <CalendarCheck className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Nenhum follow-up pendente</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Empresa</TableHead>
                  <TableHead className="w-[100px]">Cidade/UF</TableHead>
                  <TableHead className="w-[130px]">Status SDR</TableHead>
                  <TableHead className="w-[130px]">Estágio Funil</TableHead>
                  <TableHead className="w-[120px]">Último contato</TableHead>
                  <TableHead className="w-[130px]">Próximo passo</TableHead>
                  <TableHead className="w-[200px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {followups.map((f) => {
                  const slaViolated = isSlaBroken(f.data_proximo_passo);
                  return (
                    <TableRow
                      key={f.id}
                      className={cn(
                        "transition-colors",
                        slaViolated && "bg-destructive/5 hover:bg-destructive/10",
                        !slaViolated && "hover:bg-muted/50"
                      )}
                    >
                      <TableCell className="font-medium">
                        {f.fantasia || f.razao_social || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {f.cidade}{f.uf ? `/${f.uf}` : ""}
                      </TableCell>
                      <TableCell><StatusBadge status={f.status_sdr as any} /></TableCell>
                      <TableCell className="text-xs">{f.estagio_funil || "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <RelativeTime date={f.ultimo_contato_em} />
                          {f.ultimo_contato_tipo && (
                            <span className="text-[10px] text-muted-foreground">{f.ultimo_contato_tipo}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Clock className={cn("h-3.5 w-3.5", slaViolated ? "text-destructive" : "text-muted-foreground")} />
                          <span className={cn("text-xs", slaViolated && "text-destructive font-semibold")}>
                            {f.data_proximo_passo
                              ? format(new Date(f.data_proximo_passo), "dd/MM HH:mm")
                              : "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => setActivityLead(f)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Feito
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => { setReagendarLead(f); setReagendarDate(undefined); }}
                          >
                            <CalendarIcon className="h-3.5 w-3.5" />
                            Reagendar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => openLeadProfile(f)}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Reagendar Dialog */}
      <Dialog open={!!reagendarLead} onOpenChange={(o) => !o && setReagendarLead(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reagendar Follow-up</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-2">
            {reagendarLead?.fantasia || reagendarLead?.razao_social}
          </p>
          <Calendar
            mode="single"
            selected={reagendarDate}
            onSelect={setReagendarDate}
            initialFocus
            className="rounded-md border pointer-events-auto"
          />
          <Button onClick={handleReagendar} disabled={!reagendarDate} className="w-full">
            Confirmar
          </Button>
        </DialogContent>
      </Dialog>

      {/* Activity Modal */}
      {activityLead && (
        <ActivityModal
          lead={{ ...activityLead, cnpj: "", data_abertura: "", situacao: "", cnae_descricao: "", logradouro: "", numero: "", complemento: "", bairro: "", cep: "", telefone2: "", celular2: "", email2: "", socios: [], possui_site: false, url_site: "", instagram_ativo: false, url_instagram: "", faz_anuncios: false, whatsapp_automacao: false, whatsapp_humano: false, pesquisa_realizada: false, lead_score: null, dia_cadencia: 0, status_cadencia: "ativo", created_at: "", razao_social: activityLead.razao_social || "", fantasia: activityLead.fantasia || "", cidade: activityLead.cidade || "", uf: activityLead.uf || "", celular1: activityLead.celular1 || "", telefone1: activityLead.telefone1 || "", email1: activityLead.email1 || "", status_sdr: activityLead.status_sdr as any, estagio_funil: activityLead.estagio_funil as any, valor_negocio_estimado: null, data_proximo_passo: activityLead.data_proximo_passo, observacoes_sdr: activityLead.observacoes_sdr || "", observacoes_closer: activityLead.observacoes_closer || "", id: activityLead.id } as any}
          open={!!activityLead}
          onClose={() => setActivityLead(null)}
          onDone={() => { setActivityLead(null); loadData(); toast({ title: "✅ Atividade registrada!" }); }}
          userId={user?.id}
        />
      )}

      {/* Lead Profile */}
      <LeadProfile
        lead={selectedLead}
        open={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        onSaved={(updated) => { setSelectedLead(updated); loadData(); }}
      />
    </AppLayout>
  );
}
