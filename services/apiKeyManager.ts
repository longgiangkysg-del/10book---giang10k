// ═══════════════════════════════════════════════════════════
// API KEY MANAGER - Multi-Provider Runtime Key Storage
// ═══════════════════════════════════════════════════════════

/** Provider config stored in memory at runtime */
interface ProviderConfig {
  activeProvider: string;
  keys: Record<string, string>;
  selectedModels: Record<string, string>;
}

const config: ProviderConfig = {
  activeProvider: 'gemini',
  keys: {},
  selectedModels: {},
};

export const apiKeyManager = {
  // ── Active provider ──
  setActiveProvider(providerId: string): void {
    config.activeProvider = providerId;
  },

  getActiveProvider(): string {
    return config.activeProvider;
  },

  // ── Per-provider keys ──
  setProviderKey(providerId: string, key: string): void {
    config.keys[providerId] = key?.trim() || '';
  },

  getProviderKey(providerId: string): string {
    return config.keys[providerId] || '';
  },

  hasProviderKey(providerId: string): boolean {
    return (config.keys[providerId] || '').length > 0;
  },

  // ── Per-provider selected model ──
  setSelectedModel(providerId: string, modelId: string): void {
    config.selectedModels[providerId] = modelId;
  },

  getSelectedModel(providerId: string): string | undefined {
    return config.selectedModels[providerId];
  },

  // ── Backward-compatible: current active provider key ──
  /** @deprecated Use getProviderKey(getActiveProvider()) */
  setKey(key: string): void {
    config.keys[config.activeProvider] = key?.trim() || '';
  },

  /** @deprecated Use getProviderKey(getActiveProvider()) */
  getKey(): string {
    return config.keys[config.activeProvider] || '';
  },

  /** @deprecated Use hasProviderKey(getActiveProvider()) */
  hasKey(): boolean {
    return (config.keys[config.activeProvider] || '').length > 0;
  },

  // ── Bulk operations ──
  /** Load full config from Supabase at startup */
  loadConfig(saved: { activeProvider?: string; keys?: Record<string, string>; selectedModels?: Record<string, string> }): void {
    if (saved.activeProvider) config.activeProvider = saved.activeProvider;
    if (saved.keys) config.keys = { ...saved.keys };
    if (saved.selectedModels) config.selectedModels = { ...saved.selectedModels };
  },

  /** Export config for saving to Supabase */
  exportConfig(): ProviderConfig {
    return { ...config, keys: { ...config.keys }, selectedModels: { ...config.selectedModels } };
  },

  /** Get all configured provider IDs */
  getConfiguredProviders(): string[] {
    return Object.entries(config.keys)
      .filter(([, key]) => key.length > 0)
      .map(([id]) => id);
  },

  /** Clear everything (logout) */
  clearKey(): void {
    config.keys = {};
    config.selectedModels = {};
    config.activeProvider = 'gemini';
  }
};
