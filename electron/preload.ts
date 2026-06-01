import { contextBridge, ipcRenderer } from 'electron'
import type { AppSettings, Category, FilterState, GitBranch, GitCommit, GitStatusResult, LauncherId, ModelProfile, RepoKind, RepoRecord, RepoScanResult, ViewMode } from './types'

export interface ElectronAPI {
  repos: {
    list: () => Promise<RepoRecord[]>
    categories: () => Promise<Category[]>
    addLocal: () => Promise<{ ok: true; repo: RepoRecord } | { ok: false; error: string }>
    addLocalFromPath: (localPath: string) => Promise<{ ok: true; repo: RepoRecord } | { ok: false; error: string }>
    create: (folderName: string, kind?: RepoKind) => Promise<{ ok: true; repo: RepoRecord } | { ok: false; error: string }>
    relocate: (id: string, newLocalPath: string) => Promise<{ ok: true; repo: RepoRecord } | { ok: false; error: string }>
    importUrl: (url: string) => Promise<{ ok: true; repo: RepoRecord } | { ok: false; error: string }>
    update: (id: string, patch: Partial<RepoRecord>) => Promise<RepoRecord | null>
    refresh: (id: string) => Promise<RepoRecord | null>
    refreshAll: () => Promise<RepoRecord[]>
    syncWorkspace: () => Promise<
      | { ok: true; added: number; updated: number; total: number; paths: string[] }
      | { ok: false; error: string; added: number; updated: number; total: number; paths: string[] }
    >
    remove: (id: string) => Promise<boolean>
    scan: (localPath: string) => Promise<RepoScanResult>
    readme: (localPath: string) => Promise<{
      original: string | null
      chinese: string | null
      chineseFileName?: string | null
    }>
    openFolder: (localPath: string) => Promise<void>
    openTerminal: (localPath: string) => Promise<void>
    pickFolder: () => Promise<string | null>
    listFiles: (dirPath: string) => Promise<Array<{ name: string; isDirectory: boolean; path: string }>>
    readFile: (filePath: string) => Promise<{ ok: true; content: string } | { ok: false; error: string }>
    watchFiles: (repoPath: string) => Promise<void>
    unwatchFiles: (repoPath: string) => Promise<void>
    onFilesChanged: (cb: (data: { repoPath: string }) => void) => () => void
  }
  git: {
    status: (repoPath: string) => Promise<GitStatusResult>
    log: (repoPath: string, count?: number) => Promise<GitCommit[]>
    branches: (repoPath: string) => Promise<GitBranch[]>
    diffSummary: (repoPath: string) => Promise<string>
    stage: (repoPath: string, files: string[]) => Promise<{ ok: boolean; error?: string }>
    unstage: (repoPath: string, files: string[]) => Promise<{ ok: boolean; error?: string }>
    commit: (repoPath: string, message: string) => Promise<{ ok: boolean; error?: string }>
    push: (repoPath: string) => Promise<{ ok: boolean; error?: string }>
    pull: (repoPath: string) => Promise<{ ok: boolean; error?: string }>
    switchBranch: (repoPath: string, branch: string) => Promise<{ ok: boolean; error?: string }>
  }
  agent: {
    chat: (messages: Array<{ role: string; content: string }>) => Promise<void>
    onDelta: (cb: (data: { id: string; content: string }) => void) => () => void
    onToolStart: (cb: (data: { id: string; name: string; args: string }) => void) => () => void
    onToolResult: (cb: (data: { id: string; name: string; result: string }) => void) => () => void
    onProgress: (cb: (data: { text: string }) => void) => () => void
    onDone: (cb: () => void) => () => void
    onError: (cb: (data: { message: string }) => void) => () => void
    abort: () => Promise<void>
  }
  github: {
    search: (query: string, page?: number) => Promise<{ items?: Array<{ full_name: string; html_url: string; description: string; stargazers_count: number; language: string; owner: { avatar_url: string } }>; error?: string }>
  }
  translate: {
    readme: (text: string, repoPath?: string) => Promise<{ ok: true; text: string } | { ok: false; error: string }>
  }
  settings: {
    get: () => Promise<AppSettings>
    save: (partial: Partial<AppSettings>) => Promise<AppSettings>
  }
  categories: {
    save: (categories: Category[]) => Promise<Category[]>
    add: (category: Category) => Promise<Category[]>
    update: (id: string, patch: Partial<Category>) => Promise<Category[]>
    remove: (id: string) => Promise<Category[]>
  }
  workspace: { open: () => Promise<string> }
  storePath: () => Promise<string>
  models: {
    list: () => Promise<{ profiles: ModelProfile[]; activeProfileId: string | null }>
    presets: () => Promise<import('./types').ModelProviderPreset[]>
    save: (profile: ModelProfile) => Promise<{ profiles: ModelProfile[]; activeProfileId: string | null }>
    delete: (id: string) => Promise<{ profiles: ModelProfile[]; activeProfileId: string | null }>
    setActive: (id: string) => Promise<{ profiles: ModelProfile[]; activeProfileId: string | null }>
  }
  cookies: {
    list: () => Promise<Array<{ name: string; domain: string; value: string; expirationDate?: number }>>
    clear: (domain?: string) => Promise<{ ok: boolean }>
  }
  terminal: {
    create: (repoPath: string) => Promise<string>
    write: (sessionId: string, data: string) => Promise<void>
    resize: (sessionId: string, cols: number, rows: number) => Promise<void>
    destroy: (sessionId: string) => Promise<void>
    destroyForRepo: (repoPath: string) => Promise<void>
    destroyAll: () => Promise<void>
    onData: (cb: (data: { id: string; data: string }) => void) => () => void
    onExit: (cb: (data: { id: string; exitCode: number; signal: number }) => void) => () => void
  }
  launcher: {
    open: (
      id: LauncherId,
      options?: { repoPath?: string; url?: string; remoteUrl?: string },
    ) => Promise<{ ok: boolean; error?: string }>
    pickPath: () => Promise<string | null>
    detectDefaults: () => Promise<Partial<Record<LauncherId, string>>>
  }
  app: {
    getInstallInfo: () => Promise<{
      version: string
      productName: string
      execPath: string
      installDir: string
      isPackaged: boolean
      isPortable: boolean
      hasDesktopShortcut: boolean
      hasStartMenuShortcut: boolean
      installerPath: string | null
    }>
    createDesktopShortcut: () => Promise<{ ok: true; path: string } | { ok: false; error: string }>
    createStartMenuShortcut: () => Promise<{ ok: true; path: string } | { ok: false; error: string }>
    openInstallDir: () => Promise<void>
    openInstaller: () => Promise<{ ok: true } | { ok: false; error: string }>
  }
}

const api: ElectronAPI = {
  repos: {
    list: () => ipcRenderer.invoke('repos:list'),
    categories: () => ipcRenderer.invoke('repos:categories'),
    addLocal: () => ipcRenderer.invoke('repos:add-local'),
    addLocalFromPath: (localPath) => ipcRenderer.invoke('repos:add-local-from-path', localPath),
    create: (folderName, kind) => ipcRenderer.invoke('repos:create', folderName, kind),
    relocate: (id, newLocalPath) => ipcRenderer.invoke('repos:relocate', id, newLocalPath),
    importUrl: (url) => ipcRenderer.invoke('repos:import-url', url),
    update: (id, patch) => ipcRenderer.invoke('repos:update', id, patch),
    refresh: (id) => ipcRenderer.invoke('repos:refresh', id),
    refreshAll: () => ipcRenderer.invoke('repos:refresh-all'),
    syncWorkspace: () => ipcRenderer.invoke('repos:sync-workspace'),
    remove: (id) => ipcRenderer.invoke('repos:remove', id),
    scan: (localPath) => ipcRenderer.invoke('repos:scan', localPath),
    readme: (localPath) => ipcRenderer.invoke('repos:readme', localPath),
    openFolder: (localPath) => ipcRenderer.invoke('repos:open-folder', localPath),
    openTerminal: (localPath) => ipcRenderer.invoke('repos:open-terminal', localPath),
    pickFolder: () => ipcRenderer.invoke('repos:pick-folder'),
    listFiles: (dirPath) => ipcRenderer.invoke('repos:list-files', dirPath),
    readFile: (filePath) => ipcRenderer.invoke('repos:read-file', filePath),
    watchFiles: (repoPath) => ipcRenderer.invoke('repos:watch-files', repoPath),
    unwatchFiles: (repoPath) => ipcRenderer.invoke('repos:unwatch-files', repoPath),
    onFilesChanged: (cb) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { repoPath: string }) => cb(data)
      ipcRenderer.on('repos:files-changed', handler)
      return () => ipcRenderer.removeListener('repos:files-changed', handler)
    },
  },
  git: {
    status: (repoPath) => ipcRenderer.invoke('git:status', repoPath),
    log: (repoPath, count) => ipcRenderer.invoke('git:log', repoPath, count),
    branches: (repoPath) => ipcRenderer.invoke('git:branches', repoPath),
    diffSummary: (repoPath) => ipcRenderer.invoke('git:diff-summary', repoPath),
    stage: (repoPath, files) => ipcRenderer.invoke('git:stage', repoPath, files),
    unstage: (repoPath, files) => ipcRenderer.invoke('git:unstage', repoPath, files),
    commit: (repoPath, message) => ipcRenderer.invoke('git:commit', repoPath, message),
    push: (repoPath) => ipcRenderer.invoke('git:push', repoPath),
    pull: (repoPath) => ipcRenderer.invoke('git:pull', repoPath),
    switchBranch: (repoPath, branch) => ipcRenderer.invoke('git:switch-branch', repoPath, branch),
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    save: (partial) => ipcRenderer.invoke('settings:save', partial),
  },
  categories: {
    save: (categories) => ipcRenderer.invoke('categories:save', categories),
    add: (category) => ipcRenderer.invoke('categories:add', category),
    update: (id, patch) => ipcRenderer.invoke('categories:update', id, patch),
    remove: (id) => ipcRenderer.invoke('categories:remove', id),
  },
  agent: {
    chat: (messages) => ipcRenderer.invoke('agent:chat', messages),
    onDelta: (cb) => {
      const h = (_e: unknown, d: { id: string; content: string }) => cb(d)
      ipcRenderer.on('agent:delta', h)
      return () => ipcRenderer.removeListener('agent:delta', h)
    },
    onToolStart: (cb) => {
      const h = (_e: unknown, d: { id: string; name: string; args: string }) => cb(d)
      ipcRenderer.on('agent:tool-start', h)
      return () => ipcRenderer.removeListener('agent:tool-start', h)
    },
    onToolResult: (cb) => {
      const h = (_e: unknown, d: { id: string; name: string; result: string }) => cb(d)
      ipcRenderer.on('agent:tool-result', h)
      return () => ipcRenderer.removeListener('agent:tool-result', h)
    },
    onProgress: (cb) => {
      const h = (_e: unknown, d: { text: string }) => cb(d)
      ipcRenderer.on('agent:progress', h)
      return () => ipcRenderer.removeListener('agent:progress', h)
    },
    onDone: (cb) => {
      ipcRenderer.on('agent:done', cb)
      return () => ipcRenderer.removeListener('agent:done', cb)
    },
    onError: (cb) => {
      const h = (_e: unknown, d: { message: string }) => cb(d)
      ipcRenderer.on('agent:error', h)
      return () => ipcRenderer.removeListener('agent:error', h)
    },
    abort: () => ipcRenderer.invoke('agent:abort'),
  },
  github: {
    search: (query, page) => ipcRenderer.invoke('github:search', query, page),
  },
  translate: {
    readme: (text, repoPath?) => ipcRenderer.invoke('translate:readme', text, repoPath),
  },
  workspace: { open: () => ipcRenderer.invoke('workspace:open') },
  storePath: () => ipcRenderer.invoke('store:path'),
  models: {
    list: () => ipcRenderer.invoke('models:list'),
    presets: () => ipcRenderer.invoke('models:presets'),
    save: (profile) => ipcRenderer.invoke('models:save', profile),
    delete: (id) => ipcRenderer.invoke('models:delete', id),
    setActive: (id) => ipcRenderer.invoke('models:set-active', id),
  },
  cookies: {
    list: () => ipcRenderer.invoke('cookies:list'),
    clear: (domain) => ipcRenderer.invoke('cookies:clear', domain),
  },
  terminal: {
    create: (repoPath) => ipcRenderer.invoke('terminal:create', repoPath),
    write: (sessionId, data) => ipcRenderer.invoke('terminal:write', sessionId, data),
    resize: (sessionId, cols, rows) => ipcRenderer.invoke('terminal:resize', sessionId, cols, rows),
    destroy: (sessionId) => ipcRenderer.invoke('terminal:destroy', sessionId),
    destroyForRepo: (repoPath) => ipcRenderer.invoke('terminal:destroy-for-repo', repoPath),
    destroyAll: () => ipcRenderer.invoke('terminal:destroy-all'),
    onData: (cb) => {
      const h = (_e: unknown, d: { id: string; data: string }) => cb(d)
      ipcRenderer.on('terminal:data', h)
      return () => ipcRenderer.removeListener('terminal:data', h)
    },
    onExit: (cb) => {
      const h = (_e: unknown, d: { id: string; exitCode: number; signal: number }) => cb(d)
      ipcRenderer.on('terminal:exit', h)
      return () => ipcRenderer.removeListener('terminal:exit', h)
    },
  },
  launcher: {
    open: (id, options) => ipcRenderer.invoke('launcher:open', id, options),
    pickPath: () => ipcRenderer.invoke('launcher:pick-path'),
    detectDefaults: () => ipcRenderer.invoke('launcher:detect-defaults'),
  },
  app: {
    getInstallInfo: () => ipcRenderer.invoke('app:get-install-info'),
    createDesktopShortcut: () => ipcRenderer.invoke('app:create-desktop-shortcut'),
    createStartMenuShortcut: () => ipcRenderer.invoke('app:create-startmenu-shortcut'),
    openInstallDir: () => ipcRenderer.invoke('app:open-install-dir'),
    openInstaller: () => ipcRenderer.invoke('app:open-installer'),
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export type { ViewMode, FilterState }
