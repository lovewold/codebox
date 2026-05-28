import Store from 'electron-store'
import path from 'path'
import { app } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import type { AppSettings, Category, ModelProfile, RepoRecord } from './types.js'

interface StoreSchema {
  repos: RepoRecord[]
  categories: Category[]
  settings: AppSettings
}

const defaultWorkspace = path.join(
  app.getPath('documents'),
  '码盒',
  'repos',
)

function defaultSettings(): AppSettings {
  return {
    workspaceRoot: defaultWorkspace,
    aiApiKey: '',
    aiBaseUrl: 'https://api.openai.com/v1',
    aiModel: 'gpt-4o-mini',
    defaultView: 'grid',
    theme: 'light',
    terminalTheme: 'warm',
    modelProfiles: [],
    activeProfileId: null,
  }
}

export const store = new Store<StoreSchema>({
  name: 'mahe-data',
  defaults: {
    repos: [],
    categories: [
      { id: 'uncategorized', name: '未分类', color: '#6e7681', parentId: null },
      { id: 'cat-skill', name: 'Skill', color: '#58a6ff', parentId: null },
      { id: 'cat-skill-cli', name: 'CLI 工具', color: '#58a6ff', parentId: 'cat-skill' },
      { id: 'cat-skill-auto', name: '自动化', color: '#58a6ff', parentId: 'cat-skill' },
      { id: 'cat-agent', name: 'AI Agent', color: '#3fb950', parentId: null },
      { id: 'cat-agent-chat', name: '对话助手', color: '#3fb950', parentId: 'cat-agent' },
      { id: 'cat-agent-flow', name: '工作流', color: '#3fb950', parentId: 'cat-agent' },
      { id: 'cat-learn', name: '学习参考', color: '#d29922', parentId: null },
      { id: 'cat-tools', name: '工具库', color: '#bc8cff', parentId: null },
    ],
    settings: defaultSettings(),
  },
})

function migrateProfiles(s: AppSettings): AppSettings {
  if (s.modelProfiles && s.modelProfiles.length > 0) return s
  if (!s.aiApiKey) return s

  const now = new Date().toISOString()
  const profile: ModelProfile = {
    id: uuidv4(),
    name: '默认模型',
    provider: 'custom_openai',
    baseUrl: s.aiBaseUrl || 'https://api.openai.com/v1',
    apiKey: s.aiApiKey,
    modelName: s.aiModel || 'gpt-4o-mini',
    createdAt: now,
    updatedAt: now,
  }

  return { ...s, modelProfiles: [profile], activeProfileId: profile.id }
}

export function normalizeRepo(r: RepoRecord): RepoRecord {
  return {
    ...r,
    categoryIds: Array.isArray(r.categoryIds) ? r.categoryIds : ['uncategorized'],
    starred: r.starred ?? false,
    hasReadme: r.hasReadme ?? false,
    addedAt: r.addedAt ?? new Date().toISOString(),
  }
}

function normalizeCategory(c: Category): Category {
  return {
    ...c,
    parentId: c.parentId ?? null,
    color: c.color ?? '#6e7681',
  }
}

export function getRepos(): RepoRecord[] {
  return store.get('repos', []).map(normalizeRepo)
}

export function setRepos(repos: RepoRecord[]): void {
  store.set('repos', repos.map(normalizeRepo))
}

export function getCategories(): Category[] {
  return store.get('categories', []).map(normalizeCategory)
}

export function setCategories(categories: Category[]): void {
  store.set('categories', categories.map(normalizeCategory))
}

export function getSettings(): AppSettings {
  const raw = { ...defaultSettings(), ...store.get('settings') }
  const migrated = migrateProfiles(raw)
  if (migrated !== raw) {
    store.set('settings', migrated)
  }
  return migrated
}

export function setSettings(settings: Partial<AppSettings>): void {
  store.set('settings', { ...getSettings(), ...settings })
}

export function getActiveProfile(): ModelProfile | null {
  const s = getSettings()
  if (!s.activeProfileId) return null
  return s.modelProfiles.find((p) => p.id === s.activeProfileId) ?? null
}

// ── Translation Cache ──

interface TranslationCacheEntry {
  hash: string
  translated: string
}

export function getTranslationCache(repoPath: string): TranslationCacheEntry | null {
  const cache = (store as any).get('translationCache', {}) as Record<string, TranslationCacheEntry>
  return cache[repoPath] ?? null
}

export function setTranslationCache(repoPath: string, entry: TranslationCacheEntry): void {
  const cache = (store as any).get('translationCache', {}) as Record<string, TranslationCacheEntry>
  cache[repoPath] = entry
  ;(store as any).set('translationCache', cache)
}
