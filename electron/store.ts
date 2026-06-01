import Store from 'electron-store'

import path from 'path'

import { app } from 'electron'

import { v4 as uuidv4 } from 'uuid'

import {

  DEFAULT_CATEGORIES,

  DEFAULT_REPO_CATEGORY_ID,

  migrateCategories,

  migrateRepoCategoryIds,

} from './categories-default.js'

import type { AppSettings, Category, ModelProfile, RepoRecord } from './types.js'
import { migrateRepoKind } from './repo-kind.js'



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

    launcherPaths: {},

    modelProfiles: [],

    activeProfileId: null,

  }

}



export const store = new Store<StoreSchema>({

  name: 'mahe-data',

  defaults: {

    repos: [],

    categories: DEFAULT_CATEGORIES,

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

    repoKind: migrateRepoKind(r),

    categoryIds: migrateRepoCategoryIds(r.categoryIds),

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



function categoriesEqual(a: Category[], b: Category[]): boolean {

  if (a.length !== b.length) return false

  return JSON.stringify(a) === JSON.stringify(b)

}



export function getRepos(): RepoRecord[] {

  return store.get('repos', []).map(normalizeRepo)

}



export function setRepos(repos: RepoRecord[]): void {

  store.set('repos', repos.map(normalizeRepo))

}



export function getCategories(): Category[] {

  const raw = store.get('categories', DEFAULT_CATEGORIES).map(normalizeCategory)

  const migrated = migrateCategories(raw)

  if (!categoriesEqual(raw, migrated)) {

    store.set('categories', migrated)

  }

  return migrated

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



export { DEFAULT_REPO_CATEGORY_ID }



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


