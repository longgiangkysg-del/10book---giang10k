import { GoogleGenAI } from "@google/genai";
import { apiKeyManager } from "./apiKeyManager";
import { supabase } from "./supabaseClient";

// URL của Supabase Edge Function (slug: dynamic-responder)
const PROXY_URL = 'https://luhgjdvorwgridljhoar.supabase.co/functions/v1/dynamic-responder';

/**
 * Gọi Gemini qua Edge Function (khi user chưa có key riêng)
 * - Key được đọc từ Supabase Secrets server-side — không bao giờ ra browser
 * - Edge Function tự xử lý rate limit
 */
const callGeminiProxy = async (
  agentType: 'meta' | 'knowledge' | 'ideas' | 'full',
  bookTitle: string,
  author: string,
  goal: string
): Promise<any> => {
  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1aGdqZHZvcndncmlkbGpob2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0ODUyMzMsImV4cCI6MjA4MjA2MTIzM30.Hgmjm_rAnPnHUdHaQxImOd1-SMKTiXzeerREaqnavKk';

  // Get user JWT for user identification
  const { data: { session } } = await (supabase.auth as any).getSession();
  if (!session?.access_token) throw new Error("Yêu cầu đăng nhập.");

  const res = await fetch('https://luhgjdvorwgridljhoar.supabase.co/functions/v1/dynamic-responder', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,  // Gateway cần anon key ở đây
    },
    body: JSON.stringify({ bookTitle, author, goal, agentType, userToken: session.access_token }),
  });

  // Handle non-JSON response
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    console.error('Proxy returned non-JSON:', res.status, text.substring(0, 200));
    throw new Error(`Proxy lỗi (${res.status}): ${text.substring(0, 100)}`);
  }

  const json = await res.json();

  if (!res.ok) {
    console.error('Proxy error:', res.status, json);
    if (json.error === 'FREE_QUOTA_EXHAUSTED') throw new Error('FREE_QUOTA_EXHAUSTED');
    throw new Error(json.error || 'Lỗi từ server');
  }

  return json.data;
};

/** Trích xuất và parse JSON an toàn từ response text của Gemini */
const safeParseGeminiJson = (rawText: string): any => {
  let text = rawText || '{}';
  const startIdx = text.indexOf('{');
  const endIdx = text.lastIndexOf('}') + 1;
  if (startIdx !== -1 && endIdx > startIdx) {
    text = text.substring(startIdx, endIdx);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('❌ JSON parse failed. Raw text (first 500 chars):', text.substring(0, 500));
    throw new Error('AI trả về dữ liệu không hợp lệ (JSON malformed). Vui lòng thử lại.');
  }
};

const getApiKey = (): string => {
  const key = apiKeyManager.getKey();
  if (!key) {
    throw new Error("Vui lòng nhập API Key của bạn trước khi sử dụng tính năng này.");
  }
  return key;
};

const handleApiError = async (error: any) => {
  const errorMessage = error?.message || String(error);

  if (errorMessage.includes("API_KEY_INVALID") || errorMessage.includes("API key not found")) {
    console.error("Lỗi API Key cá nhân:", errorMessage);
    throw new Error("API Key cá nhân của bạn không hợp lệ hoặc đã hết hạn.");
  }

  if (errorMessage.includes("Requested entity was not found")) {
    console.warn("Dịch vụ không khả dụng với Key hiện tại. Vui lòng kiểm tra lại cấu hình Key.");
  }

  throw error;
};

// ═══════════════════════════════════════════════════════════
// RETRY HELPER - Auto retry on 503/429 overload errors
// ═══════════════════════════════════════════════════════════
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const retryWithDelay = async <T>(fn: () => Promise<T>, maxRetries = 3, baseDelayMs = 5000): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const msg = error?.message || String(error);
      const isRetryable = msg.includes('503') || msg.includes('429') || msg.includes('UNAVAILABLE') || msg.includes('high demand');

      if (isRetryable && attempt < maxRetries) {
        const waitTime = baseDelayMs * attempt;
        console.warn(`⏳ Attempt ${attempt}/${maxRetries} failed (overload). Retrying in ${waitTime / 1000}s...`);
        await delay(waitTime);
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
};

// ═══════════════════════════════════════════════════════════
// AGENT 1: META & OVERVIEW (Tổng quan + Phân tích phê bình)
// ═══════════════════════════════════════════════════════════
const processBookMeta = async (
  ai: GoogleGenAI,
  bookTitle: string,
  author: string,
  goal: string
) => {
  const prompt = `
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
  "expanded": "Phân tích sâu 300-500 từ. BẮT BUỘC xuống hàng giữa các phần bằng \\n\\n:\n\n(1) Vấn đề tác giả muốn giải quyết\n\n(2) Giải pháp/framework đề xuất\n\n(3) Logic/Bằng chứng hỗ trợ\n\n(4) Đóng góp độc đáo so với sách cùng chủ đề"
},
  "criticalAnalysis": {
    "strengths": [
      "Ưu điểm 1 với DẪN CHỨNG CỤ THỂ từ sách",
      "Ưu điểm 2...",
      "Ưu điểm 3...",
      "Ưu điểm 4..."
    ],
    "weaknesses": [
      "Hạn chế 1 - THÀNH THẬT về gaps, oversimplifications",
      "Hạn chế 2...",
      "Hạn chế 3...",
      "Hạn chế 4..."
    ],
    "counterArguments": [
      "Quan điểm phản biện 1 từ chuyên gia/nghiên cứu khác",
      "Quan điểm phản biện 2...",
      "Quan điểm phản biện 3..."
    ]
  },
  "personalizedInsights": {
    "relevanceScore": <0-100>,
    "relevanceExplanation": "Giải thích chi tiết tại sao sách này phù hợp/không phù hợp với mục tiêu của người đọc",
    "customActionPlan": [
      {"timeframe": "Ngay lập tức (Tuần 1)", "action": "Hành động cụ thể", "expectedOutcome": "Kết quả mong đợi"},
      {"timeframe": "Ngắn hạn (Tháng 1)", "action": "...", "expectedOutcome": "..."},
      {"timeframe": "Trung hạn (Quý 1)", "action": "...", "expectedOutcome": "..."},
      {"timeframe": "Dài hạn (Năm 1)", "action": "...", "expectedOutcome": "..."}
    ]
  },
  "executiveSummary": {
    "forBusy": "Tóm tắt 3-5 câu cho người bận rộn, bao gồm: vấn đề chính, giải pháp cốt lõi, và 1 hành động ngay",
    "ifOnlyOneThing": "Quote/insight đắt giá nhất từ sách (kèm giải thích tại sao quan trọng)"
  }
}

QUALITY: Mọi nhận định phải có dẫn chứng cụ thể. Không khen suông, phê bình thành thật.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: { parts: [{ text: prompt }] },
    config: {
      responseMimeType: "application/json",
      temperature: 0.3,
      topP: 0.85,
      maxOutputTokens: 16384,
      thinkingConfig: { thinkingBudget: 10000 }
    }
  });

  return safeParseGeminiJson(response.text || '{}');
};

// ═══════════════════════════════════════════════════════════
// AGENT 2: KNOWLEDGE ARCHITECTURE (Cấu trúc tri thức chuyên sâu)
// ═══════════════════════════════════════════════════════════
const processKnowledgeArchitecture = async (
  ai: GoogleGenAI,
  bookTitle: string,
  author: string,
  goal: string
) => {
  const prompt = `
You are an elite Knowledge Architect AI. Your SOLE mission: Extract and structure ALL knowledge from this book.

═══════════════════════════════════════════════════════════
BOOK: "${bookTitle}" by "${author}"
READER'S GOAL: "${goal}"
═══════════════════════════════════════════════════════════

LANGUAGE: Think in English, output in Vietnamese.

YOUR MISSION:
Create a comprehensive knowledge map covering EVERY major concept, chapter, and insight from the book.
This should be so thorough that someone reading your output understands 80% of the book's value.

EXTRACTION RULES:
1. Cover ALL chapters/sections - don't skip any major part
2. Each part must be 400-800 words MINIMUM
3. Explain the MECHANISM behind each concept, not just summary
4. Include specific examples, data, case studies from the book
5. Show connections between different parts
6. Note which parts are theory vs practical application

OUTPUT (JSON, Vietnamese):
{
  "knowledgeArchitecture": [
    {
      "partNumber": 1,
      "partTitle": "Tên phần/chương",
      "chapterReference": "Chương X / Phần Y trong sách gốc",
      "coreMessage": "Thông điệp cốt lõi trong 1-2 câu",
      "content": "Nội dung phân tích CHI TIẾT (400-800 từ):
        - Luận điểm chính của phần này
        - Cơ chế/logic đằng sau (TẠI SAO nó hoạt động)
        - Ví dụ cụ thể từ sách
        - Dữ liệu/nghiên cứu được trích dẫn (nếu có)
        - Cách áp dụng vào thực tế
        - Mối liên hệ với các phần khác",
      "keyQuotes": ["Quote quan trọng 1", "Quote 2"],
      "practicalApplication": "Cách áp dụng cụ thể phần này"
    },
    {
      "partNumber": 2,
      ...
    }
    // TIẾP TỤC cho đến khi cover HẾT nội dung sách
    // Mục tiêu: 15-30 parts tùy độ dài sách
  ]
}

CRITICAL REQUIREMENTS:
□ Minimum 15 parts, maximum 30 parts
□ Each part minimum 400 words in "content" field
□ Cover 100% of book's major topics
□ Specific examples, not generic statements
□ Show logical flow between parts
QUAN TRỌNG: PHẢI sử dụng ký tự xuống hàng (\\n\\n) để phân tách giữa các phần. KHÔNG viết liền một đoạn.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: { parts: [{ text: prompt }] },
    config: {
      responseMimeType: "application/json",
      temperature: 0.2,
      topP: 0.9,
      maxOutputTokens: 65536,
      thinkingConfig: { thinkingBudget: 32000 }
    }
  });

  return safeParseGeminiJson(response.text || '{}');
};

// ═══════════════════════════════════════════════════════════
// AGENT 3: IDEA SYSTEM (Hệ thống ý tưởng & Protocol thực hành)
// ═══════════════════════════════════════════════════════════
const processIdeaSystem = async (
  ai: GoogleGenAI,
  bookTitle: string,
  author: string,
  goal: string
) => {
  const prompt = `
You are an elite Systems Thinker AI. Your SOLE mission: Extract EVERY actionable framework, model, and idea from this book.

═══════════════════════════════════════════════════════════
BOOK: "${bookTitle}" by "${author}"
READER'S GOAL: "${goal}"
═══════════════════════════════════════════════════════════

LANGUAGE: Think in English, output in Vietnamese.

YOUR MISSION:
Identify and document ALL frameworks, mental models, techniques, and actionable ideas from the book.
Each idea must come with a SPECIFIC implementation protocol.

EXTRACTION CRITERIA FOR IDEAS:
✓ Named concepts/frameworks (e.g., "The 80/20 Rule", "Eisenhower Matrix")
✓ Mental models and thinking tools
✓ Step-by-step processes/techniques
✓ Principles that guide decision-making
✓ Counterintuitive insights
✓ Unique perspectives from the author

FOR EACH IDEA, PROVIDE:
1. Name: Tên chính thức hoặc tên mô tả
2. Description: Cơ chế hoạt động (WHY it works) - tâm lý học, logic, evidence
3. Protocol: Quy trình thực hiện 5-7 bước CỤ THỂ, có thể làm theo ngay
4. When to use: Điều kiện áp dụng (khi nào dùng, khi nào không)
5. Common mistakes: Sai lầm thường gặp khi áp dụng

OUTPUT (JSON, Vietnamese):
{
  "ideaSystem": [
    {
      "ideaNumber": 1,
      "name": "Tên framework/concept",
      "category": "MINDSET | STRATEGY | TECHNIQUE | PRINCIPLE | MODEL",
      "description": "Mô tả chi tiết 200-400 từ về:
        - Bản chất của ý tưởng này
        - Cơ chế tâm lý/logic đằng sau
        - Tại sao nó hiệu quả (evidence/research nếu có)
        - Ví dụ minh họa từ sách",
      "protocol": "Quy trình thực hiện:
        Bước 1: [Hành động cụ thể]
        Bước 2: [Hành động cụ thể]
        Bước 3: [Hành động cụ thể]
        Bước 4: [Hành động cụ thể]
        Bước 5: [Hành động cụ thể]
        (Thêm bước nếu cần)",
      "whenToUse": "Điều kiện áp dụng tối ưu",
      "whenNotToUse": "Khi nào KHÔNG nên dùng",
      "commonMistakes": ["Sai lầm 1", "Sai lầm 2"],
      "relatedIdeas": ["Liên kết với idea khác trong sách"]
    },
    {
      "ideaNumber": 2,
      ...
    }
    // TIẾP TỤC cho đến khi extract HẾT ideas
    // Mục tiêu: 10-25 ideas tùy độ phong phú của sách
  ]
}

CRITICAL REQUIREMENTS:
□ Minimum 10 ideas, maximum 25 ideas
□ Each "description" minimum 200 words
□ Each "protocol" must have 5-7 specific steps
□ Include BOTH famous frameworks AND hidden gems
□ Practical enough to implement TODAY
QUAN TRỌNG: PHẢI sử dụng ký tự xuống hàng (\\n\\n) để phân tách giữa các phần. KHÔNG viết liền một đoạn.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: { parts: [{ text: prompt }] },
    config: {
      responseMimeType: "application/json",
      temperature: 0.2,
      topP: 0.9,
      maxOutputTokens: 65536,
      thinkingConfig: { thinkingBudget: 32000 }
    }
  });

  return safeParseGeminiJson(response.text || '{}');
};

// ═══════════════════════════════════════════════════════════
// MAIN SERVICE EXPORT
// ═══════════════════════════════════════════════════════════
export const geminiService = {
  /**
   * Kiểm tra tính hợp lệ của API Key
   */
  async validateGeminiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        const msg = errorData?.error?.message || "Key không hợp lệ";
        throw new Error(msg);
      }

      return true;
    } catch (error: any) {
      console.error("Validation failed:", error);
      throw new Error(error.message || "Không thể kết nối với Gemini API. Vui lòng kiểm tra lại Key.");
    }
  },

  /**
   * Quét nhanh mục lục
   */
  async quickScan(bookTitle: string, author: string) {
    try {
      const ai = new GoogleGenAI({ apiKey: getApiKey() });
      const prompt = `Bạn là một chuyên gia thư viện. Hãy cung cấp mục lục (Table of Contents) tóm tắt của cuốn sách "${bookTitle}" của tác giả "${author}". 
      Chỉ trả về danh sách các chương, mỗi chương trên một dòng. Không thêm lời dẫn. Ngôn ngữ: Tiếng Việt.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [{ text: prompt }] },
        config: {
          temperature: 0.3,
          topP: 0.85,
          maxOutputTokens: 40960
        }
      });

      return response.text || "";
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Phân tích chuyên sâu - ORCHESTRATOR
   * Gọi 3 Agent song song và merge kết quả
   */
  async processBookFull(bookTitle: string, author: string, goal: string) {
    try {
      const userKey = apiKeyManager.getKey();

      // Nếu user có key riêng → gọi Gemini trực tiếp (nhanh hơn, không giới hạn)
      if (userKey) {
        const ai = new GoogleGenAI({ apiKey: userKey });
        console.log("🚀 Starting parallel analysis with personal key...");

        // Chạy 3 Agent SONG SONG với auto-retry khi bị 503/429
        const [metaResult, knowledgeResult, ideaResult] = await Promise.all([
          retryWithDelay(() => processBookMeta(ai, bookTitle, author, goal))
            .then(res => {
              console.log("✅ Agent 1-10 (Meta) completed");
              return res;
            })
            .catch(err => {
              console.error("❌ Agent 1 (Meta) failed:", err);
              return null;
            }),

          retryWithDelay(() => processKnowledgeArchitecture(ai, bookTitle, author, goal))
            .then(res => {
              console.log("✅ Agent 11-20 (Knowledge) completed -", res?.knowledgeArchitecture?.length || 0, "parts");
              return res;
            })
            .catch(err => {
              console.error("❌ Agent 11-20 (Knowledge) failed:", err);
              return null;
            }),

          retryWithDelay(() => processIdeaSystem(ai, bookTitle, author, goal))
            .then(res => {
              console.log("✅ Agent 21-30 (Ideas) completed -", res?.ideaSystem?.length || 0, "ideas");
              return res;
            })
            .catch(err => {
              console.error("❌ Agent 3 (Ideas) failed:", err);
              return null;
            })
        ]);

        // Merge kết quả từ 3 agents
        const mergedResult = {
          // Từ Agent 1: Meta
          bookMeta: metaResult?.bookMeta || {
            estimatedReadingTime: 0,
            difficultyLevel: "TRUNG BÌNH",
            bookType: "KẾT HỢP"
          },
          centralThesis: metaResult?.centralThesis || {
            oneLiner: "",
            expanded: ""
          },
          criticalAnalysis: metaResult?.criticalAnalysis || {
            strengths: [],
            weaknesses: [],
            counterArguments: []
          },
          personalizedInsights: metaResult?.personalizedInsights || {
            relevanceScore: 0,
            relevanceExplanation: "",
            customActionPlan: []
          },
          executiveSummary: metaResult?.executiveSummary || {
            forBusy: "",
            ifOnlyOneThing: ""
          },

          // Từ Agent 2: Knowledge Architecture
          knowledgeArchitecture: knowledgeResult?.knowledgeArchitecture || [],

          // Từ Agent 3: Idea System
          ideaSystem: ideaResult?.ideaSystem || []
        };

        console.log("🎉 Analysis complete!");
        console.log("📊 Stats:", {
          knowledgeParts: mergedResult.knowledgeArchitecture.length,
          ideas: mergedResult.ideaSystem.length,
          hasMetaData: !!metaResult
        });

        return mergedResult;

      } else {
        // Không có user key → gọi Edge Function (shared key an toàn, server-side)
        console.log("📌 No personal key — using Gemini Proxy (Edge Function)...");
        const result = await callGeminiProxy('full', bookTitle, author, goal);
        console.log("🎉 Proxy analysis complete!");
        return result;
      }

    } catch (error) {
      console.error("Gemini Critical Error:", error);
      return handleApiError(error);
    }
  },

  /**
   * Phân tích TỪNG PHẦN RIÊNG LẺ (để retry hoặc test)
   * Tự detect: có key riêng → gọi trực tiếp, không → dùng Edge Function proxy
   */
  async processMetaOnly(bookTitle: string, author: string, goal: string) {
    const userKey = apiKeyManager.getKey();
    if (userKey) {
      const ai = new GoogleGenAI({ apiKey: userKey });
      return retryWithDelay(() => processBookMeta(ai, bookTitle, author, goal));
    }
    // Không có key riêng → dùng proxy (shared key server-side)
    return callGeminiProxy('meta', bookTitle, author, goal);
  },

  async processKnowledgeOnly(bookTitle: string, author: string, goal: string) {
    const userKey = apiKeyManager.getKey();
    if (userKey) {
      const ai = new GoogleGenAI({ apiKey: userKey });
      return retryWithDelay(() => processKnowledgeArchitecture(ai, bookTitle, author, goal));
    }
    return callGeminiProxy('knowledge', bookTitle, author, goal);
  },

  async processIdeasOnly(bookTitle: string, author: string, goal: string) {
    const userKey = apiKeyManager.getKey();
    if (userKey) {
      const ai = new GoogleGenAI({ apiKey: userKey });
      return retryWithDelay(() => processIdeaSystem(ai, bookTitle, author, goal));
    }
    return callGeminiProxy('ideas', bookTitle, author, goal);
  }
};