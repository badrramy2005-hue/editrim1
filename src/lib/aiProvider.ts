export type AiProviderPreset = 'openrouter' | 'openai' | 'custom';

export type AiProviderSettings = {
  preset: AiProviderPreset;
  baseURL: string;
  apiKey: string;
  model: string;
};

export const AI_PROVIDER_STORAGE_KEY = 'editrim_ai_provider_settings_v1';

export const DEFAULT_AI_PROVIDER_SETTINGS: AiProviderSettings = {
  preset: 'openrouter',
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: '',
  model: 'minimax/minimax-m3.1-flash',
};

export function readAiProviderSettings(): AiProviderSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_AI_PROVIDER_SETTINGS };
  try {
    const raw = window.localStorage.getItem(AI_PROVIDER_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AI_PROVIDER_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AiProviderSettings>;
    const preset: AiProviderPreset = parsed.preset === 'openai' || parsed.preset === 'custom' ? parsed.preset : 'openrouter';
    return {
      preset,
      baseURL: typeof parsed.baseURL === 'string' ? parsed.baseURL : DEFAULT_AI_PROVIDER_SETTINGS.baseURL,
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
      model: typeof parsed.model === 'string' ? parsed.model : DEFAULT_AI_PROVIDER_SETTINGS.model,
    };
  } catch {
    return { ...DEFAULT_AI_PROVIDER_SETTINGS };
  }
}

export function saveAiProviderSettings(settings: AiProviderSettings): void {
  window.localStorage.setItem(AI_PROVIDER_STORAGE_KEY, JSON.stringify(settings));
}

export function clearAiProviderSettings(): void {
  window.localStorage.removeItem(AI_PROVIDER_STORAGE_KEY);
}

export function hasAiProviderKey(): boolean {
  return Boolean(readAiProviderSettings().apiKey.trim());
}
