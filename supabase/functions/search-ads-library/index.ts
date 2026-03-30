const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SearchRequest {
  keywords?: string[];
  cidade?: string;
  uf?: string;
}

interface AdResult {
  anunciante: string;
  url_anuncio: string;
  descricao: string;
  plataforma: string;
  tempo_anunciando?: string;
  volume_estimado?: string;
  total_ads?: number;
  meses_ativo?: number;
}

// ── Try Meta Ads Library API first ──
async function tryMetaApi(searchTerms: string[], locationPart: string): Promise<AdResult[] | null> {
  const metaToken = Deno.env.get('META_ACCESS_TOKEN');
  if (!metaToken) return null;

  const allAds: any[] = [];

  for (const term of searchTerms.slice(0, 3)) {
    const q = locationPart ? `${term} ${locationPart}` : term;
    const params = new URLSearchParams({
      search_terms: q,
      ad_reached_countries: '["BR"]',
      ad_active_status: 'ALL',
      fields: 'page_name,page_id,ad_creation_time,ad_delivery_start_time,ad_delivery_stop_time,ad_snapshot_url',
      limit: '500',
      access_token: metaToken,
    });

    try {
      const res = await fetch(`https://graph.facebook.com/v22.0/ads_archive?${params}`);
      const data = await res.json();

      if (!res.ok) {
        console.error('Meta API error:', JSON.stringify(data?.error || data).slice(0, 300));
        return null; // Fall back to Firecrawl
      }

      allAds.push(...(data?.data || []));

      // Follow 1 page
      if (data?.paging?.next && allAds.length < 800) {
        try {
          const r2 = await fetch(data.paging.next);
          const d2 = await r2.json();
          if (r2.ok) allAds.push(...(d2?.data || []));
        } catch (_) { /* ignore */ }
      }
    } catch (e) {
      console.error('Meta fetch error:', e);
      return null;
    }
  }

  if (allAds.length === 0) return null;

  // Aggregate by page
  const byPage: Record<string, { advertiser: string; page_id: string; count: number; first: Date; last: Date; maxMonths: number; urls: string[] }> = {};

  for (const ad of allAds) {
    const key = ad.page_id || ad.page_name || 'unknown';
    const start = new Date(ad.ad_delivery_start_time || ad.ad_creation_time || Date.now());
    const stop = ad.ad_delivery_stop_time ? new Date(ad.ad_delivery_stop_time) : new Date();

    if (!byPage[key]) {
      byPage[key] = { advertiser: ad.page_name || 'Desconhecido', page_id: ad.page_id || '', count: 0, first: start, last: stop, maxMonths: 0, urls: [] };
    }

    const e = byPage[key];
    e.count++;
    if (start < e.first) e.first = start;
    if (stop > e.last) e.last = stop;
    const months = Math.max(1, Math.ceil((Date.now() - start.getTime()) / (30.44 * 24 * 60 * 60 * 1000)));
    if (months > e.maxMonths) e.maxMonths = months;
    if (ad.ad_snapshot_url && e.urls.length < 3) e.urls.push(ad.ad_snapshot_url);
  }

  return Object.values(byPage)
    .map((agg) => {
      const volPerMonth = Math.max(1, Math.ceil(agg.count / Math.max(1, agg.maxMonths)));
      return {
        anunciante: agg.advertiser,
        url_anuncio: agg.urls[0] || `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=BR&view_all_page_id=${agg.page_id}`,
        descricao: `${agg.count} anúncio(s). Ativo desde ${agg.first.toISOString().slice(0, 10)}.`,
        plataforma: 'Meta Ads',
        tempo_anunciando: agg.maxMonths >= 12 ? `${Math.floor(agg.maxMonths / 12)} ano(s) e ${agg.maxMonths % 12} meses` : `${agg.maxMonths} mês(es)`,
        volume_estimado: `${agg.count} total (~${volPerMonth}/mês)`,
        total_ads: agg.count,
        meses_ativo: agg.maxMonths,
      };
    })
    .sort((a, b) => b.total_ads - a.total_ads);
}

// ── Fallback: Firecrawl scrape of Ads Library pages ──
async function firecrawlSearch(searchTerms: string[], locationPart: string): Promise<AdResult[]> {
  const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');

  if (!firecrawlKey || !lovableKey) {
    throw new Error('API keys não configuradas (FIRECRAWL_API_KEY / LOVABLE_API_KEY)');
  }

  // Build varied search terms
  const terms: string[] = [];
  for (const kw of searchTerms) {
    terms.push(
      `"${kw}" imobiliária anúncio facebook ads library ${locationPart}`.trim(),
      `"${kw}" construtora tráfego pago meta ads ${locationPart}`.trim(),
    );
  }
  if (locationPart) {
    terms.push(
      `empreendimento imobiliário "${locationPart}" anúncio facebook meta ads`,
      `lançamento imobiliário "${locationPart}" construtora anúncio ${searchTerms[0]}`,
    );
  }

  const allResults: any[] = [];
  const searches = await Promise.all(
    terms.slice(0, 6).map(async (term) => {
      try {
        console.log('Firecrawl search:', term);
        const res = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: term, limit: 10, lang: 'pt-br', country: 'BR' }),
        });
        const data = await res.json();
        return data?.data || data?.results || [];
      } catch { return []; }
    }),
  );
  searches.forEach((r) => allResults.push(...r));
  console.log('Firecrawl total raw:', allResults.length);

  if (allResults.length === 0) return [];

  // Now try to scrape actual Ads Library pages for each advertiser found
  // First, extract advertiser names via AI
  const summary = allResults
    .map((r: any, i: number) => `[${i + 1}] ${r.url || ''} | ${r.title || ''} | ${(r.markdown || '').slice(0, 400)}`)
    .join('\n---\n');

  const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${lovableKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `Você é um extrator de dados. Analise os resultados de busca e identifique ANUNCIANTES REAIS (imobiliárias, construtoras, corretores) que anunciam sobre: ${searchTerms.join(', ')}.
NÃO invente nomes. Retorne APENAS empresas mencionadas nos resultados.

Para cada anunciante, extraia dos textos:
- tempo_anunciando: se mencionar "há X meses", "desde 2023", etc. Caso contrário "desconhecido".
- volume_estimado: se mencionar quantidade de anúncios. Caso contrário "desconhecido".
- total_ads: número inteiro estimado de anúncios (0 se desconhecido).
- meses_ativo: número inteiro de meses anunciando (0 se desconhecido).`,
        },
        { role: 'user', content: `Extraia anunciantes:\n\n${summary}` },
      ],
      tools: [{
        type: 'function' as const,
        function: {
          name: 'report_advertisers',
          description: 'Lista os anunciantes encontrados.',
          parameters: {
            type: 'object',
            properties: {
              anunciantes: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    nome: { type: 'string' },
                    url_anuncio: { type: ['string', 'null'] },
                    descricao: { type: 'string' },
                    tempo_anunciando: { type: 'string' },
                    volume_estimado: { type: 'string' },
                    total_ads: { type: 'number' },
                    meses_ativo: { type: 'number' },
                  },
                  required: ['nome', 'descricao'],
                },
              },
            },
            required: ['anunciantes'],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: 'function', function: { name: 'report_advertisers' } },
    }),
  });

  if (!aiRes.ok) {
    console.error('AI error:', aiRes.status);
    return [];
  }

  const aiData = await aiRes.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) return [];

  const parsed = JSON.parse(toolCall.function.arguments);

  // Now scrape each advertiser's Ads Library page for real counts
  const advertisers: AdResult[] = [];
  for (const a of (parsed.anunciantes || [])) {
    const name = a.nome || '';
    const pageUrl = `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=BR&q=${encodeURIComponent(name)}`;

    let totalAds = a.total_ads || 0;
    let mesesAtivo = a.meses_ativo || 0;
    let tempoStr = a.tempo_anunciando || 'desconhecido';
    let volumeStr = a.volume_estimado || 'desconhecido';

    // Try scraping the Ads Library page for this advertiser
    try {
      const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: pageUrl, formats: ['markdown'], waitFor: 3000 }),
      });
      const scrapeData = await scrapeRes.json();
      const md = scrapeData?.data?.markdown || scrapeData?.markdown || '';

      if (md.length > 100) {
        // Extract ad count from page content
        const countMatch = md.match(/(\d[\d.,]*)\s*(?:resultado|result|anúncio|ad)/i);
        if (countMatch) {
          const num = parseInt(countMatch[1].replace(/[.,]/g, ''), 10);
          if (num > 0) totalAds = num;
        }

        // Extract dates for duration estimation
        const dateMatches = md.match(/(?:Início|Started|Ativo desde|Active since)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi);
        if (dateMatches && dateMatches.length > 0) {
          // rough estimation
          const firstDate = dateMatches[dateMatches.length - 1];
          const yearMatch = firstDate.match(/(\d{4})/);
          if (yearMatch) {
            const year = parseInt(yearMatch[1], 10);
            mesesAtivo = Math.max(1, Math.ceil((Date.now() - new Date(year, 0).getTime()) / (30.44 * 24 * 60 * 60 * 1000)));
          }
        }
      }
    } catch (e) {
      console.error('Scrape error for', name, e);
    }

    if (totalAds > 0) {
      const volPerMonth = Math.max(1, Math.ceil(totalAds / Math.max(1, mesesAtivo || 1)));
      volumeStr = `${totalAds} total (~${volPerMonth}/mês)`;
    }
    if (mesesAtivo > 0) {
      tempoStr = mesesAtivo >= 12 ? `${Math.floor(mesesAtivo / 12)} ano(s) e ${mesesAtivo % 12} meses` : `${mesesAtivo} mês(es)`;
    }

    advertisers.push({
      anunciante: name,
      url_anuncio: a.url_anuncio || pageUrl,
      descricao: a.descricao || '',
      plataforma: 'Meta Ads',
      tempo_anunciando: tempoStr,
      volume_estimado: volumeStr,
      total_ads: totalAds,
      meses_ativo: mesesAtivo,
    });
  }

  return advertisers.sort((a, b) => (b.total_ads || 0) - (a.total_ads || 0));
}

// ── Main handler ──
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { keywords, cidade, uf } = await req.json() as SearchRequest;

    const searchTerms = keywords?.length ? keywords : ['minha casa minha vida'];
    const locationPart = [cidade, uf].filter(Boolean).join(' ');

    console.log('Search ads:', searchTerms, 'location:', locationPart);

    // Try Meta API first, fallback to Firecrawl
    let results = await tryMetaApi(searchTerms, locationPart);

    if (!results || results.length === 0) {
      console.log('Meta API unavailable or empty, falling back to Firecrawl');
      results = await firecrawlSearch(searchTerms, locationPart);
    }

    console.log('Final advertisers:', results.length);

    return new Response(
      JSON.stringify({ success: true, data: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Search ads error:', error);
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
