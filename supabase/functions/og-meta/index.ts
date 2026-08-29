import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        const bookId = url.searchParams.get('id');

        if (!bookId) {
            return new Response('Missing book ID', { status: 400, headers: corsHeaders });
        }

        // Create Supabase client with anon key (no auth needed)
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // Fetch book data (only analyzed books, via RLS policy)
        const { data: book, error } = await supabase
            .from('books')
            .select('id, title, author, analysis, is_summarized')
            .eq('id', bookId)
            .eq('is_summarized', true)
            .single();

        if (error || !book) {
            return new Response(notFoundHTML(), {
                status: 404,
                headers: { ...corsHeaders, 'content-type': 'text/html; charset=utf-8' },
            });
        }

        // Parse analysis
        let analysis = book.analysis;
        if (typeof analysis === 'string') {
            try { analysis = JSON.parse(analysis); } catch { analysis = null; }
        }

        const title = book.title || '10kBook';
        const author = book.author || '';
        const description = analysis?.centralThesis?.oneLiner
            || analysis?.executiveSummary?.forBusy
            || `Phân tích tri thức chuyên sâu cuốn "${title}" bởi ${author}`;

        // Build full readable text content for SEO
        const textContent = buildTextContent(title, author, analysis);
        const siteUrl = Deno.env.get('SITE_URL') || 'https://10kbook.giauco.vn';
        const canonicalUrl = `${siteUrl}/#/book/${bookId}`;

        const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} — ${escapeHtml(author)} | 10kBook</title>
  <meta name="description" content="${escapeHtml(truncate(description, 160))}">
  <link rel="canonical" href="${canonicalUrl}">
  
  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="10kBook">
  <meta property="og:title" content="${escapeHtml(title)} — ${escapeHtml(author)}">
  <meta property="og:description" content="${escapeHtml(truncate(description, 300))}">
  <meta property="og:url" content="${canonicalUrl}">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(title)} — ${escapeHtml(author)} | 10kBook">
  <meta name="twitter:description" content="${escapeHtml(truncate(description, 200))}">

  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #121317; color: #E6EAF0; }
    h1 { color: #fff; } h2 { color: #3279F9; margin-top: 2em; } h3 { color: #B2BBC5; }
    .meta { color: #888; font-size: 0.9em; } .thesis { font-style: italic; font-size: 1.2em; color: #fff; border-left: 3px solid #3279F9; padding-left: 16px; }
    a.cta { display: inline-block; background: #3279F9; color: #fff; padding: 12px 32px; border-radius: 12px; text-decoration: none; margin-top: 24px; }
  </style>
</head>
<body>
  <header><a href="${siteUrl}" style="color:#3279F9;text-decoration:none;font-weight:bold;">← 10kBook</a></header>
  ${textContent}
  <hr>
  <p><a class="cta" href="${siteUrl}">Phân tích sách miễn phí với 10kBook →</a></p>
</body>
</html>`;

        return new Response(html, {
            status: 200,
            headers: { ...corsHeaders, 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=3600' },
        });
    } catch (err) {
        return new Response(`Error: ${err.message}`, { status: 500, headers: corsHeaders });
    }
});

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function truncate(str: string, max: number): string {
    if (!str) return '';
    return str.length > max ? str.substring(0, max - 3) + '...' : str;
}

function buildTextContent(title: string, author: string, analysis: any): string {
    if (!analysis) return `<h1>${escapeHtml(title)}</h1><p class="meta">Tác giả: ${escapeHtml(author)}</p>`;

    let html = `<h1>${escapeHtml(title)}</h1>\n<p class="meta">Tác giả: ${escapeHtml(author)}</p>\n`;

    // Central Thesis
    if (analysis.centralThesis) {
        html += `<h2>Central Thesis</h2>\n`;
        if (analysis.centralThesis.oneLiner) html += `<p class="thesis">${escapeHtml(analysis.centralThesis.oneLiner)}</p>\n`;
        if (analysis.centralThesis.expanded) html += `<p>${escapeHtml(analysis.centralThesis.expanded)}</p>\n`;
    }

    // Knowledge Architecture
    if (analysis.knowledgeArchitecture?.length) {
        html += `<h2>Knowledge Architecture</h2>\n`;
        analysis.knowledgeArchitecture.forEach((part: any, i: number) => {
            html += `<h3>${i + 1}. ${escapeHtml(part.partTitle || '')}</h3>\n<p>${escapeHtml(part.content || '')}</p>\n`;
        });
    }

    // Idea System
    if (analysis.ideaSystem?.length) {
        html += `<h2>Idea System</h2>\n`;
        analysis.ideaSystem.forEach((idea: any) => {
            html += `<h3>${escapeHtml(idea.name || '')}</h3>\n<p>${escapeHtml(idea.description || '')}</p>\n`;
            if (idea.protocol) html += `<p><strong>Giao thức:</strong> ${escapeHtml(idea.protocol)}</p>\n`;
        });
    }

    // Executive Summary
    if (analysis.executiveSummary) {
        html += `<h2>Summary</h2>\n`;
        if (analysis.executiveSummary.forBusy) html += `<p>${escapeHtml(analysis.executiveSummary.forBusy)}</p>\n`;
        if (analysis.executiveSummary.ifOnlyOneThing) html += `<p><strong>Bài học đắt giá:</strong> "${escapeHtml(analysis.executiveSummary.ifOnlyOneThing)}"</p>\n`;
    }

    // Critical Analysis
    if (analysis.criticalAnalysis) {
        html += `<h2>Critical Analysis</h2>\n`;
        if (analysis.criticalAnalysis.strengths?.length) {
            html += `<h3>Ưu điểm</h3><ul>${analysis.criticalAnalysis.strengths.map((s: string) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>\n`;
        }
        if (analysis.criticalAnalysis.weaknesses?.length) {
            html += `<h3>Hạn chế</h3><ul>${analysis.criticalAnalysis.weaknesses.map((s: string) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>\n`;
        }
    }

    return html;
}

function notFoundHTML(): string {
    return `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><title>Not Found | 10kBook</title></head>
<body style="font-family:system-ui;text-align:center;padding:80px;background:#121317;color:#fff;">
<h1>404</h1><p>Cuốn sách này chưa được phân tích hoặc không tồn tại.</p>
<p><a href="https://10kbook.giauco.vn" style="color:#3279F9;">← Về 10kBook</a></p></body></html>`;
}
