import { GoogleGenAI } from "@google/genai";

// ═══════════════════════════════════════════════════════════
// AI PROVIDER REGISTRY — Unified interface for 6 AI providers
// ═══════════════════════════════════════════════════════════

export interface AIModel {
  id: string;
  name: string;
  maxOutputTokens: number;
  supportsJson: boolean;
}

export interface AIProvider {
  id: string;
  name: string;
  baseUrl: string;
  keyLink: string;
  color: string;
  models: AIModel[];
  defaultModel: string;
}

export interface GenerateConfig {
  model?: string;
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
  responseFormat?: 'json' | 'text';
}

// ═══════════════════════════════════════════════════════════
// PROVIDER DEFINITIONS
// ═══════════════════════════════════════════════════════════

export const PROVIDERS: Record<string, AIProvider> = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    keyLink: 'https://aistudio.google.com/app/apikey',
    color: '#4285F4',
    defaultModel: 'gemini-2.5-pro',
    models: [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', maxOutputTokens: 65536, supportsJson: true },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', maxOutputTokens: 65536, supportsJson: true },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Free)', maxOutputTokens: 8192, supportsJson: true },
    ]
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    keyLink: 'https://platform.openai.com/api-keys',
    color: '#10A37F',
    defaultModel: 'gpt-4o',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', maxOutputTokens: 16384, supportsJson: true },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', maxOutputTokens: 16384, supportsJson: true },
      { id: 'gpt-4.1', name: 'GPT-4.1', maxOutputTokens: 32768, supportsJson: true },
      { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', maxOutputTokens: 32768, supportsJson: true },
    ]
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    keyLink: 'https://platform.deepseek.com/api_keys',
    color: '#0066FF',
    defaultModel: 'deepseek-chat',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek V3', maxOutputTokens: 16384, supportsJson: true },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1 (Reasoning)', maxOutputTokens: 16384, supportsJson: true },
    ]
  },
  grok: {
    id: 'grok',
    name: 'Grok (xAI)',
    baseUrl: 'https://api.x.ai/v1',
    keyLink: 'https://console.x.ai',
    color: '#1DA1F2',
    defaultModel: 'grok-3',
    models: [
      { id: 'grok-3', name: 'Grok 3', maxOutputTokens: 16384, supportsJson: true },
      { id: 'grok-3-mini', name: 'Grok 3 Mini', maxOutputTokens: 16384, supportsJson: true },
    ]
  },
  claude: {
    id: 'claude',
    name: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com',
    keyLink: 'https://console.anthropic.com/settings/keys',
    color: '#D97757',
    defaultModel: 'claude-sonnet-4-6',
    models: [
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', maxOutputTokens: 16384, supportsJson: true },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', maxOutputTokens: 8192, supportsJson: true },
    ]
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    keyLink: 'https://console.groq.com/keys',
    color: '#F55036',
    defaultModel: 'llama-3.3-70b-versatile',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'LLaMA 3.3 70B', maxOutputTokens: 8192, supportsJson: true },
      { id: 'llama-3.1-8b-instant', name: 'LLaMA 3.1 8B (Fast)', maxOutputTokens: 8192, supportsJson: true },
      { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 70B', maxOutputTokens: 8192, supportsJson: true },
    ]
  }
};

export const PROVIDER_LIST = Object.values(PROVIDERS);

// ═══════════════════════════════════════════════════════════
// API CALL IMPLEMENTATIONS
// ═══════════════════════════════════════════════════════════

/** OpenAI-compatible API call (works for OpenAI, DeepSeek, Grok, Groq) */
const callOpenAICompatible = async (
  baseUrl: string,
  apiKey: string,
  prompt: string,
  config: GenerateConfig
): Promise<string> => {
  const body: any = {
    model: config.model || 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: config.temperature ?? 0.3,
    top_p: config.topP ?? 0.9,
    max_tokens: config.maxOutputTokens ?? 16384,
  };

  if (config.responseFormat === 'json') {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }));
    throw new Error(err.error?.message || `API error: ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
};

/** Anthropic Claude API call */
const callClaude = async (
  apiKey: string,
  prompt: string,
  config: GenerateConfig
): Promise<string> => {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: config.model || 'claude-sonnet-4-6',
      max_tokens: config.maxOutputTokens ?? 16384,
      temperature: config.temperature ?? 0.3,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }));
    throw new Error(err.error?.message || `Claude API error: ${res.status}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || '';
};

/** Google Gemini API call */
const callGemini = async (
  apiKey: string,
  prompt: string,
  config: GenerateConfig
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: config.model || 'gemini-2.5-pro',
    contents: { parts: [{ text: prompt }] },
    config: {
      responseMimeType: config.responseFormat === 'json' ? 'application/json' : undefined,
      temperature: config.temperature ?? 0.3,
      topP: config.topP ?? 0.85,
      maxOutputTokens: config.maxOutputTokens ?? 16384,
      thinkingConfig: { thinkingBudget: 10000 }
    }
  });
  return response.text || '';
};

// ═══════════════════════════════════════════════════════════
// UNIFIED API
// ═══════════════════════════════════════════════════════════

/** Generate content using the specified provider */
export const generateContent = async (
  providerId: string,
  apiKey: string,
  prompt: string,
  config: GenerateConfig = {}
): Promise<string> => {
  const provider = PROVIDERS[providerId];
  if (!provider) throw new Error(`Unknown provider: ${providerId}`);

  // Auto-inject default model if not specified
  if (!config.model) {
    config = { ...config, model: provider.defaultModel };
  }

  switch (providerId) {
    case 'gemini':
      return callGemini(apiKey, prompt, config);
    case 'claude':
      return callClaude(apiKey, prompt, config);
    case 'openai':
    case 'deepseek':
    case 'grok':
    case 'groq':
      return callOpenAICompatible(provider.baseUrl, apiKey, prompt, config);
    default:
      throw new Error(`Provider ${providerId} not implemented`);
  }
};

/** Validate an API key for a provider */
export const validateProviderKey = async (providerId: string, apiKey: string): Promise<boolean> => {
  const provider = PROVIDERS[providerId];
  if (!provider) throw new Error(`Unknown provider: ${providerId}`);

  switch (providerId) {
    case 'gemini': {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (!res.ok) throw new Error('Gemini API Key không hợp lệ');
      return true;
    }
    case 'openai':
    case 'deepseek':
    case 'grok':
    case 'groq': {
      const res = await fetch(`${provider.baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (!res.ok) throw new Error(`${provider.name} API Key không hợp lệ`);
      return true;
    }
    case 'claude': {
      // Claude doesn't have a /models endpoint, do a minimal message call
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || 'Claude API Key không hợp lệ');
      }
      return true;
    }
    default:
      throw new Error(`Cannot validate key for ${providerId}`);
  }
};

/** Quick test: generate a short response to verify key works with the actual model */
export const testProviderKey = async (providerId: string, apiKey: string, modelId?: string): Promise<string> => {
  const config: GenerateConfig = {
    model: modelId || PROVIDERS[providerId]?.defaultModel,
    temperature: 0.5,
    maxOutputTokens: 100,
  };

  return generateContent(providerId, apiKey, 'Trả lời đúng 1 câu ngắn bằng tiếng Việt: "Đã kết nối thành công!"', config);
};
