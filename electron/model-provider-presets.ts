import type { ModelProviderPreset, ModelProviderType } from './types.js'

export const PROVIDER_PRESETS: ModelProviderPreset[] = [
  {
    type: 'openai',
    label: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    knownModels: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1', 'gpt-4.1-mini', 'o3', 'o4-mini'],
  },
  {
    type: 'anthropic',
    label: 'Anthropic',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-sonnet-4-20250514',
    knownModels: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-haiku-3-5-20241022'],
  },
  {
    type: 'google_gemini',
    label: 'Google Gemini',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.5-flash',
    knownModels: ['gemini-2.5-flash', 'gemini-2.5-pro'],
  },
  {
    type: 'deepseek',
    label: 'DeepSeek',
    defaultBaseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    knownModels: ['deepseek-chat', 'deepseek-reasoner'],
  },
  {
    type: 'xiaomi',
    label: '小米 MiMo',
    defaultBaseUrl: 'https://api.xiaomimimo.com/v1',
    defaultModel: 'mimo-v2.5-pro',
    knownModels: ['mimo-v2.5-pro', 'mimo-v2.5-flash'],
  },
  {
    type: 'custom_openai',
    label: '自定义 / OpenAI 兼容',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    knownModels: [],
  },
]

export function getPreset(type: ModelProviderType): ModelProviderPreset | undefined {
  return PROVIDER_PRESETS.find((p) => p.type === type)
}
