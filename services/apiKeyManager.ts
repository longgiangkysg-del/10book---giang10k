// ═══════════════════════════════════════════════════════════
// API KEY MANAGER - Runtime API Key Storage
// ═══════════════════════════════════════════════════════════
// Vite compile-time thay thế process.env.*, nên cần module riêng
// để quản lý API key được user nhập vào runtime.

let currentApiKey: string = '';

export const apiKeyManager = {
  /**
   * Set API key (called when user inputs their key)
   */
  setKey(key: string): void {
    currentApiKey = key?.trim() || '';
  },

  /**
   * Get current API key
   */
  getKey(): string {
    return currentApiKey;
  },

  /**
   * Check if API key is configured
   */
  hasKey(): boolean {
    return currentApiKey.length > 0;
  },

  /**
   * Clear API key (logout or reset)
   */
  clearKey(): void {
    currentApiKey = '';
  }
};
