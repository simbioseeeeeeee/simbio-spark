export type LeadStatus = "A Contatar" | "Em Qualificação" | "Qualificado - ICP Simbiose" | "Desqualificado";

export interface Lead {
  id: string;
  cnpj: string;
  razaoSocial: string;
  fantasia: string;
  dataAbertura: string;
  situacao: string;
  cnaeDescricao: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  telefone1: string;
  telefone2: string;
  celular1: string;
  celular2: string;
  email1: string;
  email2: string;
  socio1Nome: string;
  socio1Telefone1: string;
  socio1Telefone2: string;
  socio1Celular1: string;
  socio1Celular2: string;
  socio1Email1: string;
  socio2Nome: string;
  socio2Telefone1: string;
  socio2Celular1: string;
  socio2Email1: string;
  // Qualification fields
  status: LeadStatus;
  possuiSite: boolean;
  urlSite: string;
  instagramAtivo: boolean;
  urlInstagram: string;
  fazAnuncios: boolean;
  observacoesSdr: string;
}

export const STATUS_OPTIONS: LeadStatus[] = [
  "A Contatar",
  "Em Qualificação",
  "Qualificado - ICP Simbiose",
  "Desqualificado",
];

export const STATUS_COLORS: Record<LeadStatus, string> = {
  "A Contatar": "bg-muted text-muted-foreground",
  "Em Qualificação": "bg-warning/15 text-warning border border-warning/30",
  "Qualificado - ICP Simbiose": "bg-success/15 text-success border border-success/30",
  "Desqualificado": "bg-destructive/15 text-destructive border border-destructive/30",
};
