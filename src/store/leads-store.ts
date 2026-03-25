import { Lead } from "@/types/lead";

const STORAGE_KEY = "crm_leads";

export function getLeads(): Lead[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveLeads(leads: Lead[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
}

export function updateLead(updated: Lead) {
  const leads = getLeads();
  const idx = leads.findIndex((l) => l.id === updated.id);
  if (idx !== -1) {
    leads[idx] = updated;
    saveLeads(leads);
  }
}

function clean(val: string | undefined | null): string {
  if (!val || val === "nan" || val === "NaN" || val === "undefined") return "";
  return String(val).trim();
}

function cleanPhone(val: string): string {
  const c = clean(val).replace(/\.0$/, "");
  if (!c || c === "1") return "";
  return c;
}

export function parseCSV(text: string): Lead[] {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(";");
  const col = (row: string[], name: string) => {
    const idx = headers.indexOf(name);
    return idx >= 0 ? row[idx] || "" : "";
  };

  return lines.slice(1).map((line, i) => {
    const row = line.split(";");
    return {
      id: `lead-${i}-${Date.now()}`,
      cnpj: clean(col(row, "CNPJ")).replace(/\.0$/, ""),
      razaoSocial: clean(col(row, "RazaoSocial")),
      fantasia: clean(col(row, "Fantasia")),
      dataAbertura: clean(col(row, "DataAbertura")),
      situacao: clean(col(row, "SituacaoReceitaFederal")),
      cnaeDescricao: clean(col(row, "CNAEDescricao")),
      logradouro: `${clean(col(row, "TipoLogradouro"))} ${clean(col(row, "Logradouro"))}`.trim(),
      numero: clean(col(row, "Numero")),
      complemento: clean(col(row, "Complemento")),
      bairro: clean(col(row, "Bairro")),
      cidade: clean(col(row, "Cidade")),
      uf: clean(col(row, "UF")),
      cep: clean(col(row, "CEP")).replace(/\.0$/, ""),
      telefone1: cleanPhone(col(row, "Telefone1")),
      telefone2: cleanPhone(col(row, "Telefone2")),
      celular1: cleanPhone(col(row, "Celular1")),
      celular2: cleanPhone(col(row, "Celular2")),
      email1: clean(col(row, "Email1")),
      email2: clean(col(row, "Email2")),
      socio1Nome: clean(col(row, "Socio1Nome")),
      socio1Telefone1: cleanPhone(col(row, "Socio1Telefone1")),
      socio1Telefone2: cleanPhone(col(row, "Socio1Telefone2")),
      socio1Celular1: cleanPhone(col(row, "Socio1Celular1")),
      socio1Celular2: cleanPhone(col(row, "Socio1Celular2")),
      socio1Email1: clean(col(row, "Socio1Email1")),
      socio2Nome: clean(col(row, "Socio2Nome")),
      socio2Telefone1: cleanPhone(col(row, "Socio2Telefone1")),
      socio2Celular1: cleanPhone(col(row, "Socio2Celular1")),
      socio2Email1: clean(col(row, "Socio2Email1")),
      status: "A Contatar",
      possuiSite: false,
      urlSite: "",
      instagramAtivo: false,
      urlInstagram: "",
      fazAnuncios: false,
      observacoesSdr: "",
    };
  });
}
