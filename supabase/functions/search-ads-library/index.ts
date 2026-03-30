const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SearchRequest {
  query?: string;
  cidade?: string;
  uf?: string;
  keywords?: string[];
}

interface AdResult {
  anunciante: string;
  url_anuncio: string;
  descricao: string;
  plataforma: string;
  tempo_anunciando?: string;
  volume_estimado?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, cidade, uf, keywords } = await req.json() as SearchRequest;

    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');

    if (!firecrawlKey || !lovableKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'API keys não configuradas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Support multiple keywords
    const searchKeywords = keywords?.length
      ? keywords
      : [query || 'minha casa minha vida'];

    const locationPart = [cidade, uf].filter(Boolean).join(' ');

    console.log('Searching Ads Library for keywords:', searchKeywords, 'location:', locationPart);

    const allResults: any[] = [];

    // Build search terms from all keywords
    const searchTerms: string[] = [];
    for (const kw of searchKeywords) {
      searchTerms.push(
        `"${kw}" imobiliária anúncio facebook ads library ${locationPart}`.trim(),
        `"${kw}" construtora tráfego pago meta ads ${locationPart}`.trim(),
      );
    }

    // Also add region/empreendimento searches if cidade is provided
    if (cidade) {
      searchTerms.push(
        `empreendimento imobiliário "${cidade}" anúncio facebook meta ads`.trim(),
        `lançamento imobiliário "${cidade}" construtora anúncio ${searchKeywords[0]}`.trim(),
      );
    }

    // Limit to 6 searches max to avoid rate limits
    const limitedTerms = searchTerms.slice(0, 6);

    const searches = await Promise.all(
      limitedTerms.map(async (term) => {
        try {
          console.log('Firecrawl search term:', term);
          const res = await fetch('https://api.firecrawl.dev/v1/search', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: term, limit: 10, lang: 'pt-br', country: 'BR' }),
          });
          const data = await res.json();
          console.log('Firecrawl response status:', res.status, 'results:', data?.data?.length ?? data?.results?.length ?? 0);
          if (!res.ok) {
            console.error('Firecrawl error body:', JSON.stringify(data).slice(0, 500));
          }
          return data?.data || data?.results || [];
        } catch (e) {
          console.error('Firecrawl search error:', e);
          return [];
        }
      })
    );

    searches.forEach((results) => allResults.push(...results));
    console.log('Total raw results:', allResults.length);

    if (allResults.length === 0) {
      return new Response(
        JSON.stringify({ success: true, data: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const searchSummary = allResults
      .map((r: any, i: number) =>
        `[${i + 1}] URL: ${r.url || 'N/A'}\nTitle: ${r.title || 'N/A'}\nDescription: ${r.description || 'N/A'}\nContent: ${(r.markdown || '').slice(0, 600)}`,
      )
      .join('\n---\n');

    const keywordsStr = searchKeywords.join(', ');

    // Use AI to extract advertiser names with duration and volume info
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é um extrator de dados especializado em identificar anunciantes na Meta Ads Library.
Analise os resultados de busca e extraia os NOMES DAS EMPRESAS/ANUNCIANTES que aparecem.
Foque em imobiliárias, construtoras e corretores que estão anunciando sobre: ${keywordsStr}.
Retorne APENAS empresas reais encontradas nos resultados. NÃO invente nomes.

IMPORTANTE: Para cada anunciante, tente estimar:
- tempo_anunciando: há quanto tempo o anúncio está rodando (ex: "mais de 3 meses", "1 mês", "recente"). Se não souber, coloque "desconhecido".
- volume_estimado: quantidade estimada de anúncios ativos (ex: "20+", "10-20", "poucos"). Se não souber, coloque "desconhecido".

Priorize anunciantes que parecem ter anúncios rodando há mais de 3 meses ou com alto volume (20+ anúncios).`,
          },
          {
            role: 'user',
            content: `Extraia os nomes dos anunciantes encontrados nos resultados abaixo:\n\n${searchSummary}`,
          },
        ],
        tools: [{
          type: 'function' as const,
          function: {
            name: 'report_advertisers',
            description: 'Lista os anunciantes encontrados na busca da Meta Ads Library.',
            parameters: {
              type: 'object',
              properties: {
                anunciantes: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      nome: { type: 'string', description: 'Nome do anunciante/empresa' },
                      url_anuncio: { type: ['string', 'null'], description: 'URL do anúncio na Ads Library' },
                      descricao: { type: 'string', description: 'Breve descrição do que está anunciando' },
                      tempo_anunciando: { type: 'string', description: 'Estimativa de tempo anunciando (ex: mais de 3 meses, recente, desconhecido)' },
                      volume_estimado: { type: 'string', description: 'Estimativa de volume de anúncios (ex: 20+, 10-20, poucos, desconhecido)' },
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

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errText);
      throw new Error(`AI Gateway returned ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== 'report_advertisers') {
      console.error('AI did not call expected tool:', JSON.stringify(aiData.choices?.[0]?.message));
      return new Response(
        JSON.stringify({ success: true, data: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const anunciantes: AdResult[] = (parsed.anunciantes || []).map((a: any) => ({
      anunciante: a.nome || '',
      url_anuncio: a.url_anuncio || '',
      descricao: a.descricao || '',
      plataforma: 'Meta Ads',
      tempo_anunciando: a.tempo_anunciando || 'desconhecido',
      volume_estimado: a.volume_estimado || 'desconhecido',
    }));

    console.log('Found advertisers:', anunciantes.length);

    return new Response(
      JSON.stringify({ success: true, data: anunciantes }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Search ads error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
