import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenAI } from 'https://esm.sh/@google/genai@1';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Rate limit config ────────────────────────────────────────
const DAILY_QUOTA = 1;

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // ── 1. Lấy request body (bao gồm userToken) ─────────────
        const { bookTitle, author, goal, agentType = 'full', userToken } = await req.json();
        if (!bookTitle || !author) {
            return new Response(JSON.stringify({ error: 'Missing bookTitle or author' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // ── 2. Auth: decode userToken để lấy user ID ─────────────
        if (!userToken) {
            return new Response(JSON.stringify({ error: 'Missing userToken' }), {
                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        let userId: string;
        try {
            const payload = JSON.parse(atob(userToken.split('.')[1]));
            userId = payload.sub;
            if (!userId) throw new Error('No sub in JWT');
        } catch {
            return new Response(JSON.stringify({ error: 'Invalid token' }), {
                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // ── 3. Admin client cho DB queries ─────────────────────────
        const adminSupabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // Ưu tiên 1: User key từ Supabase
        const { data: userProfile } = await adminSupabase
            .from('users')
            .select('gemini_api_key')
            .eq('id', userId)
            .single();

        let apiKey: string | null = userProfile?.gemini_api_key || null;
        let usedSharedKey = false;

        if (!apiKey) {
            // Ưu tiên 2: Shared key — kiểm tra rate limit
            const today = new Date().toISOString().split('T')[0];
            const { data: usage } = await adminSupabase
                .from('shared_key_usage')
                .select('count')
                .eq('user_id', userId)
                .eq('used_at', today)
                .maybeSingle();

            const usedToday = usage?.count ?? 0;

            if (usedToday >= DAILY_QUOTA) {
                return new Response(JSON.stringify({ error: 'FREE_QUOTA_EXHAUSTED' }), {
                    status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Lấy shared key từ Supabase Secrets (KHÔNG bao giờ ra client)
            apiKey = Deno.env.get('GEMINI_SHARED_KEY') || null;
            if (!apiKey) {
                return new Response(JSON.stringify({ error: 'Shared key not configured' }), {
                    status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Ghi nhận 1 lượt dùng
            await adminSupabase.rpc('increment_shared_key_usage', {
                p_user_id: userId,
                p_date: today
            });

            usedSharedKey = true;
            console.log(`📌 User ${userId} dùng shared key (${usedToday + 1}/${DAILY_QUOTA} hôm nay)`);
        }

        // ── 4. Gọi Gemini API server-side ────────────────────────
        const ai = new GoogleGenAI({ apiKey });
        const goalStr = goal || 'Trích xuất tri thức tối ưu và lộ trình thực thi';

        const callAgent = async (type: string) => {
            const prompt = buildPrompt(type, bookTitle, author, goalStr);
            const isHeavy = type === 'knowledge' || type === 'ideas';
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: { parts: [{ text: prompt }] },
                config: {
                    responseMimeType: 'application/json',
                    temperature: 0.2,
                    topP: 0.9,
                    maxOutputTokens: isHeavy ? 65536 : 16384,
                    thinkingConfig: { thinkingBudget: isHeavy ? 32000 : 10000 }
                }
            });
            let rawText = response.text || '{}';
            const startIdx = rawText.indexOf('{');
            const endIdx = rawText.lastIndexOf('}') + 1;
            if (startIdx !== -1) rawText = rawText.substring(startIdx, endIdx);
            return JSON.parse(rawText);
        };

        let result: any;

        if (agentType === 'full') {
            // Full analysis: 3 agents tuần tự → merge kết quả (1 quota)
            console.log('🚀 Full analysis: running 3 agents sequentially...');
            const [metaResult, knowledgeResult, ideaResult] = await Promise.all([
                callAgent('meta').catch(e => { console.error('Meta failed:', e); return {}; }),
                callAgent('knowledge').catch(e => { console.error('Knowledge failed:', e); return {}; }),
                callAgent('ideas').catch(e => { console.error('Ideas failed:', e); return {}; }),
            ]);
            result = { ...metaResult, ...knowledgeResult, ...ideaResult };
            console.log('✅ Full analysis complete');
        } else {
            // Single agent call
            result = await callAgent(agentType);
        }

        return new Response(JSON.stringify({ success: true, data: result, usedSharedKey }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        console.error('Edge function error:', err);
        return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

// ─── Prompt builder (full prompts, matching geminiService.ts) ────────────
function buildPrompt(agentType: string, bookTitle: string, author: string, goal: string): string {
    if (agentType === 'meta') {
        return `
You are an elite Book Analyst AI. Analyze the book's meta-structure and provide critical evaluation.

═══════════════════════════════════════════════════════════
BOOK: "${bookTitle}" by "${author}"
READER'S GOAL: "${goal}"
═══════════════════════════════════════════════════════════

LANGUAGE: Think in English, output in Vietnamese.

TASK: Provide book metadata, central thesis, critical analysis, and executive summary.

OUTPUT (JSON, Vietnamese):
{
  "bookMeta": {
    "estimatedReadingTime": <number in hours>,
    "difficultyLevel": "DỄ TIẾP CẬN | TRUNG BÌNH | CHUYÊN SÂU",
    "bookType": "LÝ THUYẾT | THỰC HÀNH | KẾT HỢP",
    "targetAudience": "Đối tượng độc giả phù hợp nhất",
    "prerequisites": "Kiến thức nền tảng cần có (nếu có)"
  },
  "centralThesis": {
    "oneLiner": "Luận điểm cốt lõi trong 1 câu súc tích",
    "expanded": "Phân tích sâu 300-500 từ. BẮT BUỘC xuống hàng giữa các phần bằng \\\\n\\\\n"
  },
  "criticalAnalysis": {
    "strengths": ["Ưu điểm 1 với DẪN CHỨNG CỤ THỂ", "Ưu điểm 2...", "Ưu điểm 3...", "Ưu điểm 4..."],
    "weaknesses": ["Hạn chế 1", "Hạn chế 2...", "Hạn chế 3...", "Hạn chế 4..."],
    "counterArguments": ["Quan điểm phản biện 1", "Quan điểm phản biện 2...", "Quan điểm phản biện 3..."]
  },
  "personalizedInsights": {
    "relevanceScore": <0-100>,
    "relevanceExplanation": "Giải thích chi tiết",
    "customActionPlan": [
      {"timeframe": "Ngay lập tức (Tuần 1)", "action": "Hành động cụ thể", "expectedOutcome": "Kết quả mong đợi"},
      {"timeframe": "Ngắn hạn (Tháng 1)", "action": "...", "expectedOutcome": "..."},
      {"timeframe": "Trung hạn (Quý 1)", "action": "...", "expectedOutcome": "..."},
      {"timeframe": "Dài hạn (Năm 1)", "action": "...", "expectedOutcome": "..."}
    ]
  },
  "executiveSummary": {
    "forBusy": "Tóm tắt 3-5 câu cho người bận rộn",
    "ifOnlyOneThing": "Quote/insight đắt giá nhất từ sách"
  }
}

QUALITY: Mọi nhận định phải có dẫn chứng cụ thể. Không khen suông, phê bình thành thật.
`;
    }

    if (agentType === 'knowledge') {
        return `
You are an elite Knowledge Architect AI. Your SOLE mission: Extract and structure ALL knowledge from this book.

═══════════════════════════════════════════════════════════
BOOK: "${bookTitle}" by "${author}"
READER'S GOAL: "${goal}"
═══════════════════════════════════════════════════════════

LANGUAGE: Think in English, output in Vietnamese.

EXTRACTION RULES:
1. Cover ALL chapters/sections - don't skip any major part
2. Each part must be 400-800 words MINIMUM
3. Explain the MECHANISM behind each concept
4. Include specific examples, data, case studies from the book
5. Show connections between different parts

OUTPUT (JSON, Vietnamese):
{
  "knowledgeArchitecture": [
    {
      "partNumber": 1,
      "partTitle": "Tên phần/chương",
      "content": "Nội dung phân tích CHI TIẾT (400-800 từ)"
    }
  ]
}

CRITICAL: Minimum 15 parts, maximum 30 parts. Each part minimum 400 words.
QUAN TRỌNG: PHẢI sử dụng ký tự xuống hàng (\\\\n\\\\n) để phân tách giữa các phần.
`;
    }

    if (agentType === 'ideas') {
        return `
You are an elite Systems Thinker AI. Extract ALL actionable frameworks and ideas from this book.

═══════════════════════════════════════════════════════════
BOOK: "${bookTitle}" by "${author}"
READER'S GOAL: "${goal}"
═══════════════════════════════════════════════════════════

LANGUAGE: Think in English, output in Vietnamese.

FOR EACH IDEA, PROVIDE:
1. Name: Tên chính thức hoặc tên mô tả
2. Description: Cơ chế hoạt động (WHY it works) - 200-400 từ
3. Protocol: Quy trình thực hiện 5-7 bước CỤ THỂ

OUTPUT (JSON, Vietnamese):
{
  "ideaSystem": [
    {
      "ideaNumber": 1,
      "name": "Tên framework/concept",
      "description": "Mô tả chi tiết 200-400 từ",
      "protocol": "Quy trình thực hiện:\\nBước 1: ...\\nBước 2: ...\\nBước 3: ...\\nBước 4: ...\\nBước 5: ..."
    }
  ]
}

CRITICAL: Minimum 10 ideas, maximum 25 ideas. Each description minimum 200 words.
QUAN TRỌNG: PHẢI sử dụng ký tự xuống hàng (\\\\n\\\\n) để phân tách giữa các phần.
`;
    }

    // Default: full analysis
    return `You are a Book Analyst AI. Give a concise analysis of "${bookTitle}" by ${author}.\n\nReturn JSON with: bookMeta (estimatedReadingTime, difficultyLevel, bookType), centralThesis (oneLiner, expanded), executiveSummary (forBusy, ifOnlyOneThing). Language: Vietnamese.`;
}

