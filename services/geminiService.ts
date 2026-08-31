import { GoogleGenAI } from "@google/genai";
import { apiKeyManager } from "./apiKeyManager";
import { supabase } from "./supabaseClient";
import { generateContent as callProvider, validateProviderKey, testProviderKey, PROVIDERS, GEMINI_DEFAULT_MODEL, type GenerateConfig } from "./aiProviders";
import { buildMetaPrompt, buildKnowledgePrompt, buildIdeasPrompt } from "./analysis-prompts";
import { assertAnalysisUsable, parseAnalysisJson } from "./analysis-guard";

// URL của Supabase Edge Function — slug phải khớp tên thư mục supabase/functions/
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
    // Khoá AI chung nay chỉ dành cho admin — người dùng phải tự thêm key riêng.
    if (json.error === 'PERSONAL_KEY_REQUIRED') {
      throw new Error('API_KEY_ERROR: Bạn cần thêm API Key AI của riêng mình để phân tích sách. Vào Cài đặt, chọn nhà cung cấp rồi dán key vào.');
    }
    // Máy chủ đã chặn kết quả rỗng và KHÔNG trừ lượt — phải nói rõ để người dùng
    // dám bấm lại, thay vì tưởng mình vừa đốt mất lượt duy nhất của tháng.
    if (json.error === 'ANALYSIS_FAILED') {
      throw new Error('ANALYSIS_FAILED: AI không trả về kết quả dùng được cho cuốn này. Lượt miễn phí của bạn CHƯA bị trừ — kiểm lại tên sách và tên tác giả rồi thử lại.');
    }
    // Supabase tự cắt hàm ở giây thứ 150 và trả mã của riêng nó, không phải JSON
    // của mình. Không dịch ra tiếng người thì người dùng chỉ thấy "Lỗi từ server".
    if (json.code === 'WORKER_RESOURCE_LIMIT' || res.status === 546) {
      throw new Error('ANALYSIS_FAILED: Lượt phân tích chạy quá lâu nên máy chủ đã cắt giữa chừng. Lượt miễn phí của bạn CHƯA bị trừ. Hãy thử lại, hoặc thêm API Key riêng trong Cài đặt để chạy nhanh hơn.');
    }
    throw new Error(json.error || 'Lỗi từ server');
  }

  return json.data;
};

/** Tên gọi cũ trong file này — logic dùng chung ở analysis-guard. */
const safeParseGeminiJson = parseAnalysisJson;

const getApiKey = (): string => {
  const key = apiKeyManager.getKey();
  if (!key) {
    throw new Error("Vui lòng nhập API Key của bạn trước khi sử dụng tính năng này.");
  }
  return key;
};

/** Phát hiện lỗi liên quan đến API Key (invalid, expired, quota) */
const isApiKeyError = (error: any): boolean => {
  const msg = (error?.message || String(error)).toLowerCase();
  return msg.includes('api_key_invalid') ||
    msg.includes('api key not found') ||
    msg.includes('api key expired') ||
    msg.includes('invalid_argument') ||
    msg.includes('permission_denied') ||
    msg.includes('please renew the api key') ||
    (msg.includes('400') && (msg.includes('key') || msg.includes('invalid')));
};

/** Phát hiện lỗi hết quota (free tier hoặc paid tier) */
const isQuotaError = (error: any): boolean => {
  const msg = (error?.message || String(error)).toLowerCase();
  return msg.includes('resource_exhausted') ||
    msg.includes('quota exceeded') ||
    msg.includes('exceeded your current quota') ||
    msg.includes('free_quota_exhausted') ||
    (msg.includes('429') && msg.includes('quota'));
};

const handleApiError = async (error: any) => {
  const errorMessage = error?.message || String(error);

  if (isApiKeyError(error)) {
    console.error("Lỗi API Key:", errorMessage);
    throw new Error("API_KEY_ERROR: API Key của bạn không hợp lệ hoặc đã hết hạn. Vui lòng vào Cài đặt để cập nhật Key mới.");
  }

  if (errorMessage.includes("Requested entity was not found")) {
    throw new Error("API_KEY_ERROR: Model AI không khả dụng với Key hiện tại. Vui lòng kiểm tra lại Key.");
  }

  if (isQuotaError(error)) {
    throw new Error("QUOTA_ERROR: API Key của bạn đã hết quota miễn phí cho model Gemini 2.5 Pro. Vui lòng liên kết thanh toán (billing) trong Google AI Studio hoặc chờ quota reset.");
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
      // Không retry lỗi API key hoặc quota — chỉ retry lỗi server overload
      if (isApiKeyError(error) || isQuotaError(error)) throw error;
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
// UNIFIED AGENT CALL — Uses active provider
// ═══════════════════════════════════════════════════════════
const callAgent = async (
  providerId: string,
  apiKey: string,
  prompt: string,
  config: GenerateConfig
): Promise<any> => {
  const rawText = await callProvider(providerId, apiKey, prompt, config);
  return safeParseGeminiJson(rawText);
};

// ═══════════════════════════════════════════════════════════
// AGENT 1: META & OVERVIEW (Tổng quan + Phân tích phê bình)
// ═══════════════════════════════════════════════════════════
const processBookMeta = async (
  ai: GoogleGenAI | null,
  bookTitle: string,
  author: string,
  goal: string,
  providerOverride?: { providerId: string; apiKey: string }
) => {
  const prompt = buildMetaPrompt(bookTitle, author, goal);

  // Use multi-provider if override provided
  if (providerOverride) {
    return callAgent(providerOverride.providerId, providerOverride.apiKey, prompt, {
      temperature: 0.3, topP: 0.85, maxOutputTokens: 16384, responseFormat: 'json'
    });
  }

  // Legacy Gemini path
  const response = await ai!.models.generateContent({
    model: GEMINI_DEFAULT_MODEL,
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
  ai: GoogleGenAI | null,
  bookTitle: string,
  author: string,
  goal: string,
  providerOverride?: { providerId: string; apiKey: string }
) => {
  const prompt = buildKnowledgePrompt(bookTitle, author, goal);

  if (providerOverride) {
    return callAgent(providerOverride.providerId, providerOverride.apiKey, prompt, {
      temperature: 0.2, topP: 0.9, maxOutputTokens: 65536, responseFormat: 'json'
    });
  }

  const response = await ai!.models.generateContent({
    model: GEMINI_DEFAULT_MODEL,
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
  ai: GoogleGenAI | null,
  bookTitle: string,
  author: string,
  goal: string,
  providerOverride?: { providerId: string; apiKey: string }
) => {
  const prompt = buildIdeasPrompt(bookTitle, author, goal);

  if (providerOverride) {
    return callAgent(providerOverride.providerId, providerOverride.apiKey, prompt, {
      temperature: 0.2, topP: 0.9, maxOutputTokens: 65536, responseFormat: 'json'
    });
  }

  const response = await ai!.models.generateContent({
    model: GEMINI_DEFAULT_MODEL,
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

  /** Test nhanh API key bằng cách gọi generateContent với model thật */
  async testGeminiKey(apiKey: string): Promise<string> {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: GEMINI_DEFAULT_MODEL,
        contents: 'Trả lời đúng 1 câu ngắn bằng tiếng Việt: "Đã kết nối thành công!"',
      });
      return response.text?.trim() || 'Kết nối thành công!';
    } catch (error: any) {
      console.error("Test key failed:", error);
      if (isQuotaError(error)) {
        throw new Error("QUOTA_ERROR: API Key hợp lệ nhưng đã hết quota miễn phí cho Gemini 2.5 Pro. Vui lòng liên kết thanh toán (billing) trong Google AI Studio.");
      }
      throw new Error(error.message || "Key hợp lệ nhưng không thể gọi AI. Vui lòng thử lại.");
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
        model: GEMINI_DEFAULT_MODEL,
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
  /**
   * Phân tích trọn một cuốn = ba agent gọi RIÊNG, song song, rồi gộp.
   *
   * CỐ Ý không dùng agentType 'full' của Edge Function nữa: ba agent nối nhau
   * trong một lời gọi vượt trần 150 giây của Supabase và chết với
   * WORKER_RESOURCE_LIMIT — đo ngày 31/08/2026, cả khi chạy song song lẫn tuần
   * tự. Tách thành ba lời gọi thì mỗi cái tự do trong hạn mức của riêng nó.
   *
   * Mỗi hàm con tự chọn đường (khoá riêng của người dùng hay khoá chung qua
   * Edge Function) và tự soát kết quả, nên ở đây chỉ còn việc gộp.
   */
  async processBookFull(bookTitle: string, author: string, goal: string) {
    try {
      const providerId = apiKeyManager.getActiveProvider();
      const providerName = PROVIDERS[providerId]?.name || providerId;
      console.log(`🚀 Phân tích "${bookTitle}" — 3 agent song song...`);

      const [meta, knowledge, ideas] = await Promise.all([
        this.processMetaOnly(bookTitle, author, goal),
        this.processKnowledgeOnly(bookTitle, author, goal),
        this.processIdeasOnly(bookTitle, author, goal),
      ]);

      const merged = {
        ...meta,
        knowledgeArchitecture: knowledge?.knowledgeArchitecture || [],
        ideaSystem: ideas?.ideaSystem || [],
        _metadata: { provider: providerName, analyzedAt: new Date().toISOString() },
      };

      return assertAnalysisUsable(merged, 'full');
    } catch (error) {
      console.error("AI Critical Error:", error);
      return handleApiError(error);
    }
  },

  /**
   * Phân tích TỪNG PHẦN RIÊNG LẺ (để retry hoặc test)
   * Tự detect: có key riêng → gọi trực tiếp, không → dùng Edge Function proxy
   */
  async processMetaOnly(bookTitle: string, author: string, goal: string) {
    const providerId = apiKeyManager.getActiveProvider();
    const userKey = apiKeyManager.getProviderKey(providerId);
    if (userKey) {
      const providerOverride = providerId !== 'gemini' ? { providerId, apiKey: userKey } : undefined;
      const ai = providerId === 'gemini' ? new GoogleGenAI({ apiKey: userKey }) : null;
      return assertAnalysisUsable(await retryWithDelay(() => processBookMeta(ai, bookTitle, author, goal, providerOverride)), 'meta');
    }
    return assertAnalysisUsable(await callGeminiProxy('meta', bookTitle, author, goal), 'meta');
  },

  async processKnowledgeOnly(bookTitle: string, author: string, goal: string) {
    const providerId = apiKeyManager.getActiveProvider();
    const userKey = apiKeyManager.getProviderKey(providerId);
    if (userKey) {
      const providerOverride = providerId !== 'gemini' ? { providerId, apiKey: userKey } : undefined;
      const ai = providerId === 'gemini' ? new GoogleGenAI({ apiKey: userKey }) : null;
      return assertAnalysisUsable(await retryWithDelay(() => processKnowledgeArchitecture(ai, bookTitle, author, goal, providerOverride)), 'knowledge');
    }
    return assertAnalysisUsable(await callGeminiProxy('knowledge', bookTitle, author, goal), 'knowledge');
  },

  async processIdeasOnly(bookTitle: string, author: string, goal: string) {
    const providerId = apiKeyManager.getActiveProvider();
    const userKey = apiKeyManager.getProviderKey(providerId);
    if (userKey) {
      const providerOverride = providerId !== 'gemini' ? { providerId, apiKey: userKey } : undefined;
      const ai = providerId === 'gemini' ? new GoogleGenAI({ apiKey: userKey }) : null;
      return assertAnalysisUsable(await retryWithDelay(() => processIdeaSystem(ai, bookTitle, author, goal, providerOverride)), 'ideas');
    }
    return assertAnalysisUsable(await callGeminiProxy('ideas', bookTitle, author, goal), 'ideas');
  },

  // ── Multi-provider validation & testing (delegates to aiProviders) ──
  async validateProviderKey(providerId: string, apiKey: string): Promise<boolean> {
    return validateProviderKey(providerId, apiKey);
  },

  async testProviderKey(providerId: string, apiKey: string): Promise<string> {
    return testProviderKey(providerId, apiKey);
  }
};