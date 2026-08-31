import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenAI } from 'https://esm.sh/@google/genai@1';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Khoá AI dùng chung nay CHỈ phục vụ admin. Người dùng thường phải tự nhập
// API Key riêng trong Cài đặt — anh Giang chốt ngày 31/08/2026.
// Danh sách này phải khớp ADMIN_EMAILS trong services/supabaseClient.ts.
const ADMIN_EMAILS = ['longgiangptit@gmail.com'];

// Model Gemini — giữ ĐỒNG BỘ với GEMINI_DEFAULT_MODEL trong services/aiProviders.ts.
// Deno không import được từ đó nên phải chép tay. gemini-2.5-pro đã bị Google
// chặn với project mới (404 "no longer available to new users").
const GEMINI_MODEL = 'gemini-3.1-pro-preview';

// Ngưỡng tối thiểu để coi kết quả là dùng được — giữ ĐỒNG BỘ với
// services/analysis-guard.ts (Deno không import được từ đó).
const MIN_KNOWLEDGE_PARTS = 3;
const MIN_IDEAS = 2;

/** Kết quả rỗng, thiếu, hay là lời từ chối trá hình thì không tính là một lượt. */
function ketQuaDungDuoc(r: any, loai: string): boolean {
    if (!r || r.error === 'UNKNOWN_BOOK') return false;
    if ((loai === 'meta' || loai === 'full') && !r.centralThesis?.oneLiner) return false;
    if ((loai === 'knowledge' || loai === 'full') && (r.knowledgeArchitecture?.length ?? 0) < MIN_KNOWLEDGE_PARTS) return false;
    if ((loai === 'ideas' || loai === 'full') && (r.ideaSystem?.length ?? 0) < MIN_IDEAS) return false;
    return true;
}

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

        // ── 2. Admin client cho DB queries + xác thực ──────────────
        const adminSupabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // ── 3. Auth: XÁC THỰC token, không chỉ đọc nội dung ────────
        // Trước đây chỗ này chỉ atob() phần payload để lấy `sub`. Chữ ký không
        // được kiểm, mà URL hàm này lẫn anon key đều nằm trong mã nguồn công
        // khai — nên ai cũng bịa được một token với `sub` bất kỳ và đốt khoá
        // Gemini dùng chung không giới hạn (Gemini bị gọi TRƯỚC bước ghi nhận
        // lượt, nên `sub` bịa vẫn tốn tiền). getUser() hỏi Supabase Auth nên
        // token giả trượt ngay tại đây.
        if (!userToken) {
            return new Response(JSON.stringify({ error: 'Missing userToken' }), {
                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const { data: authData, error: authError } = await adminSupabase.auth.getUser(userToken);
        const userId = authData?.user?.id;
        if (authError || !userId) {
            return new Response(JSON.stringify({ error: 'Invalid token' }), {
                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Ưu tiên 1: User key từ Supabase
        const { data: userProfile } = await adminSupabase
            .from('users')
            .select('gemini_api_key')
            .eq('id', userId)
            .single();

        let apiKey: string | null = userProfile?.gemini_api_key || null;
        let usedSharedKey = false;

        if (!apiKey) {
            // Không có khoá riêng thì chỉ admin mới đi tiếp được.
            if (!ADMIN_EMAILS.includes(authData.user.email || '')) {
                return new Response(JSON.stringify({ error: 'PERSONAL_KEY_REQUIRED' }), {
                    status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            apiKey = Deno.env.get('GEMINI_SHARED_KEY') || null;
            if (!apiKey) {
                return new Response(JSON.stringify({ error: 'Shared key not configured' }), {
                    status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Admin không bị đếm lượt. Bảng shared_key_usage và RPC
            // increment_shared_key_usage vẫn còn nguyên trong DB, phòng khi mở
            // lại chế độ miễn phí thì bật lên chứ không phải dựng lại từ đầu.
            usedSharedKey = true;
            console.log(`📌 Admin ${userId} dùng khoá chung`);
        }

        // ── 4. Gọi Gemini API server-side ────────────────────────
        const ai = new GoogleGenAI({ apiKey });
        const goalStr = goal || 'Trích xuất tri thức tối ưu và lộ trình thực thi';

        const callAgent = async (type: string) => {
            const prompt = buildPrompt(type, bookTitle, author, goalStr);
            const isHeavy = type === 'knowledge' || type === 'ideas';
            const response = await ai.models.generateContent({
                model: GEMINI_MODEL,
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
            if (startIdx !== -1 && endIdx > startIdx) rawText = rawText.substring(startIdx, endIdx);
            try {
                return JSON.parse(rawText);
            } catch {
                console.error('JSON parse failed:', rawText.substring(0, 300));
                throw new Error('AI trả về dữ liệu không hợp lệ (JSON malformed)');
            }
        };

        let result: any;

        if (agentType === 'full') {
            // TUẦN TỰ, không Promise.all — nhẹ bộ nhớ hơn vì mỗi lúc chỉ giữ một
            // câu trả lời cỡ 65k token.
            //
            // ⚠️ Nhưng CÁCH NÀY VẪN CHƯA ĐỦ. Đo ngày 31/08/2026: 'meta' một mình
            // xong sau 33s và trả 200, còn 'full' chết ở giây thứ 150-151 với
            // WORKER_RESOURCE_LIMIT dù chạy song song hay tuần tự — đó là trần
            // thời gian của Edge Function gói free, không phải chuyện bộ nhớ.
            // Ba agent nối nhau không thể vừa trong một lời gọi. Cách chữa thật
            // là để client gọi ba lượt riêng (mỗi lượt < 150s) và đổi cách đếm
            // quota, hoặc hạ maxOutputTokens/thinkingBudget cho mỗi agent.
            console.log('🚀 Full analysis: running 3 agents sequentially...');
            result = {};
            for (const loai of ['meta', 'knowledge', 'ideas']) {
                try {
                    Object.assign(result, await callAgent(loai));
                } catch (e) {
                    // Không dừng cả mẻ vì một agent: cửa kiểm ở cuối sẽ quyết định
                    // kết quả có đủ dùng hay không, và lượt chỉ bị trừ khi đủ.
                    console.error(`Agent ${loai} failed:`, e);
                }
            }
            console.log('✅ Full analysis complete');
        } else {
            // Single agent call
            result = await callAgent(agentType);
        }

        // Ba agent đều bọc .catch(() => ({})) nên hỏng vẫn ra một object rỗng và
        // đi tiếp như thường. Chặn ở đây, và KHÔNG trừ lượt: người dùng thử lại được.
        if (!ketQuaDungDuoc(result, agentType)) {
            console.error('Kết quả không dùng được, không trừ lượt:', JSON.stringify(result).slice(0, 300));
            return new Response(JSON.stringify({ error: 'ANALYSIS_FAILED' }), {
                status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
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

// Luật nguồn dữ liệu — giữ ĐỒNG BỘ với SOURCE_OF_TRUTH_RULE trong services/geminiService.ts.
// Thiếu luật này, model từ chối ("chưa có nội dung sách") nhưng vẫn trả đúng khuôn JSON,
// nên lời từ chối bị lưu thành một phần tri thức.
const SOURCE_OF_TRUTH_RULE = `
SOURCE OF TRUTH — READ CAREFULLY:
You are NOT given the book's full text, and you never will be. Write from your own knowledge
of this published work. That is the task as designed, not a missing input.
- NEVER say you need the book's text. Never put a refusal, disclaimer, or apology inside any
  JSON field — those fields are rendered verbatim to the reader.
- If the title or author looks misspelled, resolve it to the closest real published book
  (e.g. "100M Lead" by "Alex Homozi" → "$100M Leads" by Alex Hormozi) and analyse that one.
- ONLY if you genuinely do not know this book at all, return EXACTLY this and nothing else:
  {"error": "UNKNOWN_BOOK"}
`;

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
${SOURCE_OF_TRUTH_RULE}

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
${SOURCE_OF_TRUTH_RULE}

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
${SOURCE_OF_TRUTH_RULE}

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

