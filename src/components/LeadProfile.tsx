import { useState } from "react";
import { Lead, STATUS_OPTIONS, LeadStatus } from "@/types/lead";
import { updateLead } from "@/store/leads-store";
import { CopyButton } from "./CopyButton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "./StatusBadge";
import { toast } from "@/hooks/use-toast";
import { Building2, MapPin, Phone, Mail, User, ExternalLink, Search, Globe, Instagram, Megaphone, Save } from "lucide-react";

function PhoneLink({ phone, isCelular }: { phone: string; isCelular?: boolean }) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
      <span>{phone}</span>
      <CopyButton value={phone} label="Telefone copiado" />
      {isCelular && digits.length >= 10 && (
        <a href={`https://wa.me/55${digits}`} target="_blank" rel="noopener noreferrer" className="text-success hover:text-success/80 ml-0.5" title="Abrir WhatsApp">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.305 0-4.461-.654-6.29-1.785l-.44-.268-2.834.95.95-2.834-.268-.44A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
        </a>
      )}
    </span>
  );
}

function EmailDisplay({ email }: { email: string }) {
  if (!email) return null;
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="truncate max-w-[200px]">{email}</span>
      <CopyButton value={email} label="Email copiado" />
    </span>
  );
}

interface Props {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
  onSaved: (lead: Lead) => void;
}

export function LeadProfile({ lead, open, onClose, onSaved }: Props) {
  const [form, setForm] = useState<Lead | null>(null);

  const current = form?.id === lead?.id ? form : lead;

  const setField = <K extends keyof Lead>(key: K, val: Lead[K]) => {
    if (!current) return;
    const updated = { ...current, [key]: val };
    setForm(updated);
  };

  const handleSave = () => {
    if (!current) return;
    updateLead(current);
    onSaved(current);
    toast({ title: "Qualificação salva!", description: `Lead "${current.fantasia || current.razaoSocial}" atualizado com sucesso.` });
  };

  if (!current) return null;

  const endereco = [current.logradouro, current.numero, current.complemento, current.bairro, `${current.cidade}/${current.uf}`, current.cep].filter(Boolean).join(", ");

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-[900px] w-full overflow-y-auto p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg truncate">{current.fantasia || current.razaoSocial}</SheetTitle>
              <p className="text-sm text-muted-foreground">{current.cnpj}</p>
            </div>
            <StatusBadge status={current.status} />
          </div>
        </SheetHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-border min-h-0">
          {/* Left Column - Read Only */}
          <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(100vh-120px)]">
            <Card className="border-0 shadow-none bg-muted/50">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2"><Building2 className="h-4 w-4" /> Dados da Empresa</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 space-y-1 text-sm">
                <p><span className="text-muted-foreground">Razão Social:</span> {current.razaoSocial}</p>
                {current.fantasia && <p><span className="text-muted-foreground">Fantasia:</span> {current.fantasia}</p>}
                <p><span className="text-muted-foreground">CNAE:</span> {current.cnaeDescricao}</p>
                <p><span className="text-muted-foreground">Abertura:</span> {current.dataAbertura}</p>
                <p><span className="text-muted-foreground">Situação:</span> {current.situacao}</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-none bg-muted/50">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2"><MapPin className="h-4 w-4" /> Endereço</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 text-sm">
                <p>{endereco}</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-none bg-muted/50">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2"><Phone className="h-4 w-4" /> Contatos</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 space-y-2">
                <PhoneLink phone={current.telefone1} />
                <PhoneLink phone={current.telefone2} />
                <PhoneLink phone={current.celular1} isCelular />
                <PhoneLink phone={current.celular2} isCelular />
                <EmailDisplay email={current.email1} />
                <EmailDisplay email={current.email2} />
              </CardContent>
            </Card>

            {current.socio1Nome && (
              <Card className="border-0 shadow-none bg-muted/50">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2"><User className="h-4 w-4" /> Quadro Societário</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-3">
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{current.socio1Nome}</p>
                    <div className="flex flex-col gap-1">
                      <PhoneLink phone={current.socio1Telefone1} />
                      <PhoneLink phone={current.socio1Celular1} isCelular />
                      <EmailDisplay email={current.socio1Email1} />
                    </div>
                  </div>
                  {current.socio2Nome && (
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{current.socio2Nome}</p>
                      <div className="flex flex-col gap-1">
                        <PhoneLink phone={current.socio2Telefone1} />
                        <PhoneLink phone={current.socio2Celular1} isCelular />
                        <EmailDisplay email={current.socio2Email1} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Qualification */}
          <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(100vh-120px)]">
            <div>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" /> Painel de Qualificação
              </h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Status do Lead</Label>
                  <Select value={current.status} onValueChange={(v) => setField("status", v as LeadStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <Label htmlFor="site" className="flex items-center gap-2"><Globe className="h-4 w-4" /> Possui Site?</Label>
                  <Switch id="site" checked={current.possuiSite} onCheckedChange={(v) => setField("possuiSite", v)} />
                </div>
                {current.possuiSite && (
                  <Input placeholder="https://www.exemplo.com.br" value={current.urlSite} onChange={(e) => setField("urlSite", e.target.value)} />
                )}

                <div className="flex items-center justify-between">
                  <Label htmlFor="insta" className="flex items-center gap-2"><Instagram className="h-4 w-4" /> Instagram Ativo?</Label>
                  <Switch id="insta" checked={current.instagramAtivo} onCheckedChange={(v) => setField("instagramAtivo", v)} />
                </div>
                {current.instagramAtivo && (
                  <Input placeholder="https://instagram.com/perfil" value={current.urlInstagram} onChange={(e) => setField("urlInstagram", e.target.value)} />
                )}

                <div className="flex items-center justify-between">
                  <Label htmlFor="ads" className="flex items-center gap-2"><Megaphone className="h-4 w-4" /> Faz Anúncios?</Label>
                  <Switch id="ads" checked={current.fazAnuncios} onCheckedChange={(v) => setField("fazAnuncios", v)} />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Atalhos de Pesquisa</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" className="justify-start" asChild>
                      <a href={`https://www.google.com/search?q=${encodeURIComponent(current.razaoSocial)}`} target="_blank" rel="noopener noreferrer">
                        <Search className="h-3.5 w-3.5 mr-1.5" /> Google
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" className="justify-start" asChild>
                      <a href={`https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=BR&q=${encodeURIComponent(current.razaoSocial)}`} target="_blank" rel="noopener noreferrer">
                        <Megaphone className="h-3.5 w-3.5 mr-1.5" /> Meta Ads
                      </a>
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Notas e Observações</Label>
                  <Textarea rows={5} placeholder="Anote aqui o que percebeu no site, Instagram, etc." value={current.observacoesSdr} onChange={(e) => setField("observacoesSdr", e.target.value)} />
                </div>

                <Button onClick={handleSave} className="w-full">
                  <Save className="h-4 w-4 mr-2" /> Salvar Qualificação
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
