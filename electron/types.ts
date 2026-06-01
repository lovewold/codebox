export type ViewMode = 'grid' | 'list' | 'compact'
export type ModelProviderType = 'openai' | 'anthropic' | 'google_gemini' | 'deepseek' | 'xiaomi' | 'custom_openai'
export type RepoKind = 'local' | 'cloud'

export interface ModelProfile {
  id: string
  name: string
  provider: ModelProviderType
  baseUrl: string
  apiKey: string
  modelName: string
  createdAt: string
  updatedAt: string
}

export interface ModelProviderPreset {
  type: ModelProviderType
  label: string
  defaultBaseUrl: string
  defaultModel: string
  knownModels: string[]
}

export interface RepoRecord {
  id: string
  name: string
  localPath: string
  /** local=纯本地文件夹；cloud=Git/远程仓库 */
  repoKind: RepoKind
  remoteUrl?: string
  description?: string
  language?: string
  categoryIds: string[]
  starred: boolean
  lastOpenedAt?: string
  addedAt: string
  readmeExcerpt?: string
  hasReadme: boolean
  gitBranch?: string
  gitDirty?: boolean
  uncommittedFiles?: string[]
  uncommittedCount?: number
  aheadCount?: number
  behindCount?: number
  lastCommitMessage?: string
  lastCommitAuthor?: string
  lastCommitDate?: string
}

export interface Category {
  id: string
  name: string
  color: string
  parentId: string | null
}

export type TerminalThemeId = 'warm' | 'balanced' | 'classic' | 'soft-light'

export type LauncherId = 'codex' | 'cursor' | 'edge'

export interface AppSettings {
  workspaceRoot: string
  aiApiKey: string
  aiBaseUrl: string
  aiModel: string
  defaultView: ViewMode
  theme: 'light' | 'dark'
  terminalTheme?: TerminalThemeId
  /** 外部应用可执行文件路径（留空则自动检测） */
  launcherPaths?: Partial<Record<LauncherId, string>>
  modelProfiles: ModelProfile[]
  activeProfileId: string | null
}

export interface RepoScanResult {
  description?: string
  language?: string
  readmeContent?: string
  readmeExcerpt?: string
  hasReadme: boolean
  gitBranch?: string
  gitDirty?: boolean
  remoteUrl?: string
  uncommittedFiles?: string[]
  uncommittedCount?: number
  aheadCount?: number
  behindCount?: number
  lastCommitMessage?: string
  lastCommitAuthor?: string
  lastCommitDate?: string
}

export interface FilterState {
  search: string
  categoryId: string | null
  starredOnly: boolean
  language: string | null
}

export interface GitStatusResult {
  branch: string
  staged: { path: string; status: string }[]
  unstaged: { path: string; status: string }[]
  untracked: { path: string; status: string }[]
  ahead: number
  behind: number
}

export interface GitCommit {
  hash: string
  message: string
  author: string
  date: string
}

export interface GitBranch {
  name: string
  current: boolean
  remote: boolean
}
