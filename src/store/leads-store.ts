import { supabase } from "@/integrations/supabase/client";
import { Lead, Socio } from "@/types/lead";

// Helper to map DB row to Lead interface
function rowToLead(row: any): Lead {
  return {
    id: row.id,
    cnpj: row.cnpj || "",
    razao_social: row.razao_social || "",
    fantasia: row.fantasia || "",
    data_abertura: row.data_abertura || "",
    situacao: row.situacao || "",
    cnae_descricao: row.cnae_descricao || "",
    logradouro: row.logradouro || "",
    numero: row.numero || "",
    complemento: row.complemento || "",
    bairro: row.bairro || "",
    cidade: row.cidade || "",
    uf: row.uf || "",
    cep: row.cep || "",
    telefone1: row.telefone1 || "",
    telefone2: row.telefone2 || "",
    celular1: row.celular1 || "",
    celular2: row.celular2 || "",
    email1: row.email1 || "",
    email2: row.email2 || "",
    socios: Array.isArray(row.socios) ? row.socios as Socio[] : [],
    status_sdr: row.status_sdr || "A Contatar",
    possui_site: row.possui_site || false,
    url_site: row.url_site || "",
    instagram_ativo: row.instagram_ativo || false,
    url_instagram: row.url_instagram || "",
    faz_anuncios: row.faz_anuncios || false,
    observacoes_sdr: row.observacoes_sdr || "",
    estagio_funil: row.estagio_funil || null,
    valor_negocio_estimado: row.valor_negocio_estimado || null,
    data_proximo_passo: row.data_proximo_passo || null,
    observacoes_closer: row.observacoes_closer || "",
    created_at: row.created_at,
  };
}

export async function getLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToLead);
}

export async function updateLead(lead: Lead): Promise<Lead> {
  const { data, error } = await supabase
    .from("leads")
    .update({
      status_sdr: lead.status_sdr,
      possui_site: lead.possui_site,
      url_site: lead.url_site,
      instagram_ativo: lead.instagram_ativo,
      url_instagram: lead.url_instagram,
      faz_anuncios: lead.faz_anuncios,
      observacoes_sdr: lead.observacoes_sdr,
      estagio_funil: lead.estagio_funil,
      valor_negocio_estimado: lead.valor_negocio_estimado,
      data_proximo_passo: lead.data_proximo_passo,
      observacoes_closer: lead.observacoes_closer,
    })
    .eq("id", lead.id)
    .select()
    .single();
  if (error) throw error;
  return rowToLead(data);
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

export function parseCSV(text: string) {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(";");
  const col = (row: string[], name: string) => {
    const idx = headers.indexOf(name);
    return idx >= 0 ? row[idx] || "" : "";
  };

  return lines.slice(1).map((line) => {
    const row = line.split(";");

    const socios: Socio[] = [];
    const s1Nome = clean(col(row, "Socio1Nome"));
    if (s1Nome) {
      socios.push({
        nome: s1Nome,
        telefone1: cleanPhone(col(row, "Socio1Telefone1")),
        telefone2: cleanPhone(col(row, "Socio1Telefone2")),
        celular1: cleanPhone(col(row, "Socio1Celular1")),
        celular2: cleanPhone(col(row, "Socio1Celular2")),
        email1: clean(col(row, "Socio1Email1")),
      });
    }
    const s2Nome = clean(col(row, "Socio2Nome"));
    if (s2Nome) {
      socios.push({
        nome: s2Nome,
        telefone1: cleanPhone(col(row, "Socio2Telefone1")),
        celular1: cleanPhone(col(row, "Socio2Celular1")),
        email1: clean(col(row, "Socio2Email1")),
      });
    }

    return {
      cnpj: clean(col(row, "CNPJ")).replace(/\.0$/, ""),
      razao_social: clean(col(row, "RazaoSocial")),
      fantasia: clean(col(row, "Fantasia")),
      data_abertura: clean(col(row, "DataAbertura")),
      situacao: clean(col(row, "SituacaoReceitaFederal")),
      cnae_descricao: clean(col(row, "CNAEDescricao")),
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
      socios: socios as any,
    };
  });
}

export async function importLeads(csvLeads: ReturnType<typeof parseCSV>): Promise<number> {
  // Upsert by CNPJ
  const { data, error } = await supabase
    .from("leads")
    .upsert(csvLeads, { onConflict: "cnpj" })
    .select();
  if (error) throw error;
  return data?.length || 0;
}
