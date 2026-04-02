const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Tìm bìa sách từ Tiki (ưu tiên) → Google Books (fallback)
 * Input:  { title, author }
 * Output: { coverUrl, source } hoặc { coverUrl: null }
 */
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { title, author } = await req.json();
    if (!title) {
      return new Response(JSON.stringify({ error: 'Missing title' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 1. Tìm trên Tiki ────────────────────────────────────
    const tikiCover = await searchTiki(title, author);
    if (tikiCover) {
      return json({ coverUrl: tikiCover, source: 'tiki' });
    }

    // ── 2. Fallback: Google Books API ────────────────────────
    const googleCover = await searchGoogleBooks(title, author);
    if (googleCover) {
      return json({ coverUrl: googleCover, source: 'google_books' });
    }

    return json({ coverUrl: null, source: null });

  } catch (err: any) {
    console.error('book-cover-search error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function json(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ═══════════════════════════════════════════════════════════
// TIKI SEARCH
// ═══════════════════════════════════════════════════════════
async function searchTiki(title: string, author: string): Promise<string | null> {
  try {
    const query = encodeURIComponent(`${title} ${author}`.trim());
    // category=8322 = Sách tiếng Việt trên Tiki
    const url = `https://tiki.vn/api/v2/products?q=${query}&limit=5&category=8322`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const products = data?.data || [];

    for (const product of products) {
      const img = product.thumbnail_url || product.image_url;
      if (img && img.startsWith('http')) {
        // Upgrade Tiki thumbnail sang chất lượng cao hơn
        return img.replace('/cache/100x100/', '/cache/280x280/')
                  .replace('/cache/200x200/', '/cache/280x280/');
      }
    }

    return null;
  } catch (err) {
    console.warn('Tiki search failed:', err);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════
// GOOGLE BOOKS SEARCH (fallback)
// ═══════════════════════════════════════════════════════════
async function searchGoogleBooks(title: string, author: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(author ? `${title} inauthor:${author}` : title);
    const url = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=3&printType=books`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const items = data?.items || [];

    for (const item of items) {
      const imageLinks = item?.volumeInfo?.imageLinks;
      // Ưu tiên ảnh lớn nhất
      const coverUrl = imageLinks?.extraLarge || imageLinks?.large ||
                       imageLinks?.medium || imageLinks?.thumbnail ||
                       imageLinks?.smallThumbnail;
      if (coverUrl) {
        // Google Books trả về http → upgrade sang https, bỏ zoom limit
        return coverUrl.replace('http://', 'https://').replace('&edge=curl', '');
      }
    }

    return null;
  } catch (err) {
    console.warn('Google Books search failed:', err);
    return null;
  }
}
