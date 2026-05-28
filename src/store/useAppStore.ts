import { create } from 'zustand'
import { destroyTerminalResources } from '../lib/terminalCache'
import type { AppSettings, Category, FilterState, ModelProfile, RepoRecord, ViewMode } from '../types'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  toolName?: string
  toolArgs?: string
  toolResult?: string
  toolCallId?: string
  timestamp: string
}

export interface ChatSession {
  id: string
  title: string
  repoId: string | null
  createdAt: string
  updatedAt: string
}

interface AppState {
  repos: RepoRecord[]
  categories: Category[]
  settings: AppSettings | null
  selectedId: string | null
  viewMode: ViewMode
  filter: FilterState
  loading: boolean
  readmeContent: {
    original: string | null
    chinese: string | null
    chineseFileName?: string | null
  } | null
  readmeLoading: boolean
  currentTab: 'chat' | 'repos' | 'explore'
  theme: 'light' | 'dark'
  chatMessages: ChatMessage[]
  chatBusy: boolean
  chatContextRepoId: string | null
  chatSessions: ChatSession[]
  activeSessionId: string | null
  sidebarCollapsed: boolean
  modelProfiles: ModelProfile[]
  activeProfileId: string | null

  setRepos: (repos: RepoRecord[]) => void
  setCategories: (categories: Category[]) => void
  setSettings: (settings: AppSettings) => void
  selectRepo: (id: string | null) => void
  setViewMode: (mode: ViewMode) => void
  setFilter: (patch: Partial<FilterState>) => void
  setLoading: (loading: boolean) => void
  setReadme: (content: {
    original: string | null
    chinese: string | null
    chineseFileName?: string | null
  } | null) => void
  setReadmeLoading: (loading: boolean) => void
  setCurrentTab: (tab: 'chat' | 'repos' | 'explore') => void
  setTheme: (theme: 'light' | 'dark') => void
  addChatMessage: (msg: ChatMessage) => void
  appendChatContent: (id: string, chunk: string) => void
  setChatBusy: (busy: boolean) => void
  setChatContextRepo: (repoId: string | null) => void
  clearChat: () => void
  replaceChatMessages: (msgs: ChatMessage[]) => void
  setChatSessions: (sessions: ChatSession[]) => void
  setActiveSessionId: (id: string | null) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  upsertChatSession: (session: ChatSession) => void
  removeChatSession: (id: string) => void
  setModelProfiles: (profiles: ModelProfile[]) => void
  setActiveProfileId: (id: string | null) => void
  settingsOpen: boolean
  setSettingsOpen: (open: boolean) => void

  /** repoPath → 已创建 PTY 会话（返回列表后仍保持） */
  terminalSessions: Record<string, { repoId: string }>
  /** repoPath → 仓库详情内是否显示终端面板 */
  terminalPanelOpen: Record<string, boolean>

  ensureTerminalSession: (repoId: string, repoPath: string) => void
  setTerminalPanelOpen: (repoPath: string, open: boolean) => void
  closeTerminalSession: (repoPath: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  repos: [],
  categories: [],
  settings: null,
  selectedId: null,
  viewMode: 'grid',
  filter: {
    search: '',
    categoryId: null,
    starredOnly: false,
    language: null,
  },
  loading: false,
  readmeContent: null,
  readmeLoading: false,
  currentTab: 'chat',
  theme: 'light',
  chatMessages: [],
  chatBusy: false,
  chatContextRepoId: null,
  chatSessions: [],
  activeSessionId: null,
  sidebarCollapsed: false,
  modelProfiles: [],
  activeProfileId: null,

  setRepos: (repos) => set({ repos }),
  setCategories: (categories) => set({ categories }),
  setSettings: (settings) =>
    set({ settings, viewMode: settings.defaultView, theme: settings.theme || 'light' }),
  selectRepo: (id) => set({ selectedId: id, readmeContent: null }),
  setViewMode: (viewMode) => set({ viewMode }),
  setFilter: (patch) =>
    set((s) => ({ filter: { ...s.filter, ...patch } })),
  setLoading: (loading) => set({ loading }),
  setReadme: (readmeContent) => set({ readmeContent }),
  setReadmeLoading: (readmeLoading) => set({ readmeLoading }),
  setCurrentTab: (currentTab) => set({ currentTab }),
  setTheme: (theme) => set({ theme }),
  addChatMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
  appendChatContent: (id, chunk) =>
    set((s) => ({
      chatMessages: s.chatMessages.map((m) =>
        m.id === id ? { ...m, content: m.content + chunk } : m,
      ),
    })),
  setChatBusy: (chatBusy) => set({ chatBusy }),
  setChatContextRepo: (chatContextRepoId) => set({ chatContextRepoId }),
  clearChat: () => set({ chatMessages: [] }),
  replaceChatMessages: (chatMessages) => set({ chatMessages }),
  setChatSessions: (chatSessions) => set({ chatSessions }),
  setActiveSessionId: (activeSessionId) => set({ activeSessionId }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  upsertChatSession: (session) =>
    set((s) => {
      const existing = s.chatSessions.find((cs) => cs.id === session.id)
      const next = existing
        ? s.chatSessions.map((cs) => (cs.id === session.id ? session : cs))
        : [session, ...s.chatSessions]
      next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      return { chatSessions: next }
    }),
  removeChatSession: (id) =>
    set((s) => ({
      chatSessions: s.chatSessions.filter((cs) => cs.id !== id),
    })),
  setModelProfiles: (modelProfiles) => set({ modelProfiles }),
  setActiveProfileId: (activeProfileId) => set({ activeProfileId }),
  settingsOpen: false,
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),

  terminalSessions: {},
  terminalPanelOpen: {},

  ensureTerminalSession: (repoId, repoPath) =>
    set((s) => ({
      terminalSessions: {
        ...s.terminalSessions,
        [repoPath]: { repoId },
      },
      terminalPanelOpen: {
        ...s.terminalPanelOpen,
        [repoPath]: true,
      },
    })),

  setTerminalPanelOpen: (repoPath, open) =>
    set((s) => ({
      terminalPanelOpen: {
        ...s.terminalPanelOpen,
        [repoPath]: open,
      },
    })),

  closeTerminalSession: (repoPath) => {
    destroyTerminalResources(repoPath)
    set((s) => {
      const { [repoPath]: _s, ...terminalSessions } = s.terminalSessions
      const { [repoPath]: _o, ...terminalPanelOpen } = s.terminalPanelOpen
      return { terminalSessions, terminalPanelOpen }
    })
  },
}))

export function filterRepos(
  repos: RepoRecord[],
  filter: FilterState,
  categories?: Category[],
): RepoRecord[] {
  const q = filter.search.trim().toLowerCase()

  // Build set of all child category IDs for the selected parent
  const childIds = new Set<string>()
  if (filter.categoryId && categories) {
    const stack = [filter.categoryId]
    while (stack.length > 0) {
      const id = stack.pop()!
      for (const c of categories) {
        if (c.parentId === id) {
          childIds.add(c.id)
          stack.push(c.id)
        }
      }
    }
  }

  return repos
    .filter((r) => {
      const categoryIds = r.categoryIds ?? []
      if (filter.starredOnly && !r.starred) return false
      if (filter.categoryId) {
        const match = categoryIds.includes(filter.categoryId) ||
          categoryIds.some((cid) => childIds.has(cid))
        if (!match) return false
      }
      if (filter.language && r.language !== filter.language) return false
      if (!q) return true
      const hay = [
        r.name,
        r.description,
        r.readmeExcerpt,
        r.localPath,
        r.remoteUrl,
        r.language,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
    .sort((a, b) => {
      const ta = a.lastOpenedAt ?? a.addedAt
      const tb = b.lastOpenedAt ?? b.addedAt
      return tb.localeCompare(ta)
    })
}

export function uniqueLanguages(repos: RepoRecord[]): string[] {
  const set = new Set<string>()
  repos.forEach((r) => {
    if (r.language) set.add(r.language)
  })
  return [...set].sort()
}
