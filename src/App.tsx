import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MessageSquare, Search, Settings, Sun, Moon } from 'lucide-react'
import { ImportBar } from './components/ImportBar'
import { RepoCard } from './components/RepoCard'
import { RepoDetail } from './components/RepoDetail'
import { SettingsPage } from './components/settings/SettingsPage'
import { Sidebar, ViewModeToggle } from './components/Sidebar'
import { ChatPage } from './components/chat/ChatPage'
import { GitHubExplore } from './components/GitHubExplore'
import { Logo } from './components/Logo'
import { GitPanel } from './components/GitPanel'
import { BackNavButton } from './components/BackNavButton'
import { destroyAllTerminalResources } from './lib/terminalCache'
import {
  filterRepos,
  uniqueLanguages,
  useAppStore,
} from './store/useAppStore'
import T from './i18n'
import type { RepoKind, RepoRecord } from './types'
import {
  electronUnavailableError,
  isElectronShell,
  waitForElectronAPI,
} from './lib/electron'

function getApi() {
  return window.electronAPI
}

export default function App() {
  const {
    repos,
    categories,
    settings,
    selectedId,
    viewMode,
    filter,
    loading,
    readmeContent,
    readmeLoading,
    currentTab,
    theme,
    setRepos,
    setCategories,
    setSettings,
    selectRepo,
    setViewMode,
    setFilter,
    setLoading,
    setReadme,
    setReadmeLoading,
    setCurrentTab,
    setTheme,
    setModelProfiles,
    setActiveProfileId,
    settingsOpen,
    setSettingsOpen,
    relocateTerminalPath,
  } = useAppStore()
  const [importBusy, setImportBusy] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [gitPanelRepo, setGitPanelRepo] = useState<RepoRecord | null>(null)
  const [detailWidth, setDetailWidth] = useState(640)
  const [bootError, setBootError] = useState<string | null>(null)
  const [booting, setBooting] = useState(true)
  const detailDragRef = useRef(false)

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    const cleanup = () => destroyAllTerminalResources()
    window.addEventListener('beforeunload', cleanup)
    return () => window.removeEventListener('beforeunload', cleanup)
  }, [])

  async function toggleTheme() {
    const api = getApi()
    if (!api) return
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    if (settings) {
      await api.settings.save({ ...settings, theme: next })
    }
  }

  const loadAll = useCallback(async () => {
    const api = await waitForElectronAPI()
    if (!api) {
      throw electronUnavailableError()
    }
    await api.repos.syncWorkspace()
    const [r, c, s] = await Promise.all([
      api.repos.list(),
      api.repos.categories(),
      api.settings.get(),
    ])
    setRepos(r)
    setCategories(c)
    setSettings(s)
    setViewMode(s.defaultView ?? 'grid')
    setModelProfiles(s.modelProfiles || [])
    setActiveProfileId(s.activeProfileId || null)
    if (s.theme) {
      setTheme(s.theme)
      document.documentElement.setAttribute('data-theme', s.theme)
    }
  }, [setRepos, setCategories, setSettings, setViewMode, setTheme, setModelProfiles, setActiveProfileId])

  useEffect(() => {
    let cancelled = false
    setBooting(true)
    setBootError(null)
    loadAll()
      .catch((err: unknown) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : String(err)
        setBootError(message)
        console.error('[App] loadAll failed:', err)
      })
      .finally(() => {
        if (!cancelled) setBooting(false)
      })
    return () => {
      cancelled = true
    }
  }, [loadAll])

  const filtered = useMemo(
    () => filterRepos(repos, filter, categories),
    [repos, filter],
  )

  const languages = useMemo(() => uniqueLanguages(repos), [repos])

  const selected = repos.find((r) => r.id === selectedId) ?? null

  useEffect(() => {
    const api = getApi()
    if (!selected || !api) {
      setReadme(null)
      return
    }
    let cancelled = false
    setReadmeLoading(true)
    api.repos
      .readme(selected.localPath)
      .then((content) => {
        if (!cancelled) setReadme(content)
      })
      .finally(() => {
        if (!cancelled) setReadmeLoading(false)
      })
    api.repos.update(selected.id, { lastOpenedAt: new Date().toISOString() })
    return () => {
      cancelled = true
    }
  }, [selected?.id, selected?.localPath, setReadme, setReadmeLoading])

  async function afterRepoAdded(repoId: string) {
    await loadAll()
    selectRepo(repoId)
    setCurrentTab('repos')
  }

  async function handleImportUrl(url: string) {
    const api = getApi()
    if (!api) return { ok: false, error: 'Electron API 不可用' }
    setImportBusy(true)
    try {
      const res = await api.repos.importUrl(url)
      if (res.ok) {
        await afterRepoAdded(res.repo.id)
        return { ok: true }
      }
      return { ok: false, error: res.error }
    } finally {
      setImportBusy(false)
    }
  }

  async function handleAddLocal() {
    const api = getApi()
    if (!api) return
    setImportBusy(true)
    try {
      const res = await api.repos.addLocal()
      if (res.ok) {
        await afterRepoAdded(res.repo.id)
      }
    } finally {
      setImportBusy(false)
    }
  }

  async function handleCreateRepo(name: string, kind: RepoKind) {
    const api = getApi()
    if (!api) return { ok: false, error: 'Electron API 不可用' }
    setImportBusy(true)
    setImportMessage(null)
    try {
      const res = await api.repos.create(name, kind)
      if (res.ok) {
        await afterRepoAdded(res.repo.id)
        return { ok: true }
      }
      return { ok: false, error: res.error }
    } finally {
      setImportBusy(false)
    }
  }

  async function handleDropFolderPaths(paths: string[]) {
    const api = getApi()
    if (!api || paths.length === 0) return
    setImportBusy(true)
    setImportMessage(null)
    try {
      const res = await api.repos.addLocalFromPath(paths[0])
      if (res.ok) {
        await afterRepoAdded(res.repo.id)
      } else {
        setImportMessage(res.error)
      }
    } finally {
      setImportBusy(false)
    }
  }

  async function handleRelocatePath(repoId: string, oldPath: string, newPath: string) {
    const api = getApi()
    if (!api) return { ok: false, error: 'Electron API 不可用' }
    const res = await api.repos.relocate(repoId, newPath)
    if (res.ok) {
      relocateTerminalPath(oldPath, res.repo.localPath, repoId)
      setRepos(repos.map((r) => (r.id === repoId ? res.repo : r)))
      const md = await api.repos.readme(res.repo.localPath)
      setReadme(md)
      return { ok: true }
    }
    return { ok: false, error: res.error }
  }

  async function handleRefreshAll() {
    const api = getApi()
    if (!api) return
    setLoading(true)
    try {
      const updated = await api.repos.refreshAll()
      setRepos(updated)
    } finally {
      setLoading(false)
    }
  }

  async function handleRefreshOne(id: string) {
    const api = getApi()
    if (!api) return
    const u = await api.repos.refresh(id)
    if (u) {
      setRepos(repos.map((r) => (r.id === u.id ? u : r)))
      const md = await api.repos.readme(u.localPath)
      setReadme(md)
    }
  }

  async function toggleStar(id: string, starred: boolean) {
    const api = getApi()
    if (!api) return
    const updated = await api.repos.update(id, { starred: !starred })
    if (updated) {
      setRepos(repos.map((r) => (r.id === id ? updated : r)))
    }
  }

  async function toggleCategory(repoId: string, categoryId: string) {
    const api = getApi()
    if (!api) return
    const repo = repos.find((r) => r.id === repoId)
    if (!repo) return
    const current = repo.categoryIds ?? []
    const ids = current.includes(categoryId)
      ? current.filter((x) => x !== categoryId)
      : [...current, categoryId]
    const updated = await api.repos.update(repoId, { categoryIds: ids })
    if (updated) {
      setRepos(repos.map((r) => (r.id === repoId ? updated : r)))
    }
  }

  function handleSelectFromExplore(id: string) {
    selectRepo(id)
    setCurrentTab('repos')
  }

  function handleDetailResizeStart(e: React.MouseEvent) {
    e.preventDefault()
    detailDragRef.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    const onMove = (ev: MouseEvent) => {
      if (!detailDragRef.current) return
      setDetailWidth(Math.max(400, Math.min(900, window.innerWidth - ev.clientX)))
    }
    const onUp = () => {
      detailDragRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const renderRepoDetail = (repo: NonNullable<typeof selected>) => (
    <RepoDetail
      repo={repo}
      categories={categories}
      readme={readmeContent}
      readmeLoading={readmeLoading}
      onRefresh={() => handleRefreshOne(repo.id)}
      onOpenFolder={() => getApi()?.repos.openFolder(repo.localPath)}
      onRemove={async () => {
        const api = getApi()
        if (!api) return
        await api.repos.remove(repo.id)
        selectRepo(null)
        await loadAll()
      }}
      onToggleCategory={(cid) => toggleCategory(repo.id, cid)}
      onOpenGitPanel={repo.repoKind === 'cloud' ? () => setGitPanelRepo(repo) : undefined}
      onRelocatePath={async (newPath) => {
        const res = await handleRelocatePath(repo.id, repo.localPath, newPath)
        if (!res.ok && res.error) {
          return { ok: false, error: res.error }
        }
        return { ok: true }
      }}
    />
  )

  const tabs = [
    { id: 'chat' as const, label: '聊天', icon: MessageSquare },
    { id: 'repos' as const, label: '仓库' },
    { id: 'explore' as const, label: '探索' },
  ]

  const listPanel = (
    <div className="flex min-w-0 flex-1 flex-col border-r border-border-default bg-bg-default">
      <div className="flex items-center gap-3 border-b border-border-default px-4 py-3">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-border-default bg-bg-default px-3 py-1.5">
          <Search className="h-4 w-4 text-fg-muted" />
          <input
            type="search"
            value={filter.search}
            onChange={(e) => setFilter({ search: e.target.value })}
            placeholder={T.searchPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-fg-subtle"
          />
        </div>
        <ViewModeToggle mode={viewMode} onChange={setViewMode} />
        <span className="text-xs text-fg-muted">{T.repoCount(filtered.length)}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <EmptyState />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((repo) => (
              <RepoCard
                key={repo.id}
                repo={repo}
                categories={categories}
                selected={repo.id === selectedId}
                viewMode="grid"
                onSelect={() => selectRepo(repo.id)}
                onToggleStar={() => toggleStar(repo.id, repo.starred)}
                onToggleCategory={(cid) => toggleCategory(repo.id, cid)}
              />
            ))}
          </div>
        ) : viewMode === 'list' ? (
          <div className="flex flex-col gap-2">
            {filtered.map((repo) => (
              <RepoCard
                key={repo.id}
                repo={repo}
                categories={categories}
                selected={repo.id === selectedId}
                viewMode="list"
                onSelect={() => selectRepo(repo.id)}
                onToggleStar={() => toggleStar(repo.id, repo.starred)}
                onToggleCategory={(cid) => toggleCategory(repo.id, cid)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {filtered.map((repo) => (
              <RepoCard
                key={repo.id}
                repo={repo}
                categories={categories}
                selected={repo.id === selectedId}
                viewMode="compact"
                onSelect={() => selectRepo(repo.id)}
                onToggleStar={() => toggleStar(repo.id, repo.starred)}
                onToggleCategory={(cid) => toggleCategory(repo.id, cid)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )

  if (bootError) {
    const inElectron = isElectronShell()
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center"
        style={{ background: '#f6f8fa', color: '#1f2328' }}
      >
        <p className="text-lg font-semibold" style={{ color: '#cf222e' }}>
          应用加载失败
        </p>
        <p className="max-w-lg text-sm leading-relaxed" style={{ color: '#656d76' }}>
          {bootError}
        </p>
        {!inElectron && (
          <p className="max-w-lg text-sm leading-relaxed" style={{ color: '#0969da' }}>
            提示：请在终端执行 <code className="rounded bg-white px-1.5 py-0.5">npm run dev</code>，使用弹出的桌面窗口，不要访问浏览器里的 localhost。
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setBootError(null)
            setBooting(true)
            loadAll()
              .catch((err: unknown) => {
                setBootError(err instanceof Error ? err.message : String(err))
              })
              .finally(() => setBooting(false))
          }}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          style={{ background: '#0550ae' }}
        >
          重试
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-bg-default">
      {booting && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-50 h-0.5 bg-accent-emphasis/30">
          <div className="h-full w-1/3 animate-pulse bg-accent-emphasis" />
        </div>
      )}
      {/* header */}
      <header className="flex shrink-0 items-center justify-between border-b border-border-default px-4 py-2">
        <div className="flex items-center gap-4">
          <Logo />
          <span className="rounded bg-bg-inset px-2 py-0.5 text-xs text-fg-muted">
            {T.appBadge}
          </span>
          <div className="flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCurrentTab(tab.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  currentTab === tab.id
                    ? 'bg-accent-emphasis text-white'
                    : 'text-fg-muted hover:bg-bg-inset hover:text-fg-default'
                }`}
              >
                {tab.icon && <tab.icon className="h-4 w-4" />}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-lg p-2 text-fg-muted hover:bg-bg-inset hover:text-fg-default"
            title={theme === 'light' ? '切换深色主题' : '切换浅色主题'}
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-sm text-fg-muted hover:bg-bg-inset hover:text-fg-default"
          >
            <Settings className="h-4 w-4" />
            {T.settings}
          </button>
        </div>
      </header>

      {/* Chat tab */}
      {currentTab === 'chat' && <ChatPage />}

      {/* Explore tab */}
      {currentTab === 'explore' && (
        <GitHubExplore
          onCloneDone={loadAll}
          onSelectRepo={handleSelectFromExplore}
        />
      )}

      {/* Repos tab */}
      {currentTab === 'repos' && (
        <>
          <ImportBar
            onAddLocal={handleAddLocal}
            onImportUrl={handleImportUrl}
            onCreateRepo={handleCreateRepo}
            onDropFolderPaths={handleDropFolderPaths}
            busy={importBusy}
          />
          {importMessage && (
            <div className="border-b border-border-default bg-danger-fg/10 px-4 py-2 text-sm text-danger-fg">
              {importMessage}
            </div>
          )}

          <div className="flex min-h-0 flex-1 bg-bg-default">
            <Sidebar
              categories={categories}
              activeCategoryId={filter.categoryId}
              starredOnly={filter.starredOnly}
              languages={languages}
              activeLanguage={filter.language}
              onCategory={(id) => setFilter({ categoryId: id })}
              onStarredOnly={(v) => setFilter({ starredOnly: v })}
              onLanguage={(lang) => setFilter({ language: lang })}
              onRefreshAll={handleRefreshAll}
              onOpenWorkspace={() => getApi()?.workspace.open()}
              loading={loading}
              onDropRepo={async (repoId, categoryId) => {
                const repo = repos.find((r) => r.id === repoId)
                if (!repo) return
                const current = repo.categoryIds ?? []
                const ids = current.includes(categoryId)
                  ? current.filter((x) => x !== categoryId)
                  : [categoryId]
                const updated = await api.repos.update(repoId, { categoryIds: ids })
                if (updated) {
                  setRepos(repos.map((r) => (r.id === repoId ? updated : r)))
                }
              }}
            />

            {viewMode === 'compact' ? (
              <div className="flex min-w-0 flex-1 bg-bg-default">
                <div className="w-56 shrink-0 overflow-y-auto border-r border-border-default bg-bg-default p-2">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-fg-muted">仓库列表</span>
                    <ViewModeToggle mode={viewMode} onChange={setViewMode} />
                  </div>
                  {filtered.map((repo) => (
                    <RepoCard
                      key={repo.id}
                      repo={repo}
                      categories={categories}
                      selected={repo.id === selectedId}
                      viewMode="compact"
                      onSelect={() => selectRepo(repo.id)}
                      onToggleStar={() => toggleStar(repo.id, repo.starred)}
                      onToggleCategory={(cid) => toggleCategory(repo.id, cid)}
                    />
                  ))}
                </div>
                <div className="min-w-0 flex-1 bg-bg-default">
                  {selected ? renderRepoDetail(selected) : <DetailPlaceholder />}
                </div>
              </div>
            ) : (
              <>
                {listPanel}
                {/* Resize handle */}
                <div
                  className="hidden w-1 shrink-0 cursor-col-resize bg-transparent transition hover:bg-accent-fg/20 active:bg-accent-fg/30 xl:block"
                  onMouseDown={handleDetailResizeStart}
                />
                <div
                  className="hidden shrink-0 overflow-hidden bg-bg-default xl:block"
                  style={{ width: detailWidth }}
                >
                  {selected ? renderRepoDetail(selected) : <DetailPlaceholder />}
                </div>
              </>
            )}
          </div>

          {/* mobile fullscreen detail */}
          {selected && viewMode !== 'compact' && (
            <div className="fixed inset-0 z-40 flex flex-col bg-bg-default xl:hidden">
              <div className="flex items-center border-b border-border-default bg-bg-subtle/80 px-4 py-2.5 backdrop-blur-sm">
                <BackNavButton onClick={() => selectRepo(null)} label={T.backToList} />
              </div>
              <div className="flex-1 overflow-hidden">
                {renderRepoDetail(selected)}
              </div>
            </div>
          )}
        </>
      )}

      {settingsOpen && (
        <SettingsPage
          onClose={async () => {
            setSettingsOpen(false)
            const api = getApi()
            if (!api) return
            const s = await api.settings.get()
            setSettings(s)
            setModelProfiles(s.modelProfiles || [])
            setActiveProfileId(s.activeProfileId || null)
            if (s.theme) document.documentElement.setAttribute('data-theme', s.theme)
          }}
        />
      )}

      {gitPanelRepo && (
        <GitPanel
          repo={gitPanelRepo}
          onClose={() => setGitPanelRepo(null)}
        />
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center py-16 text-center text-fg-muted">
      <p className="text-lg">{T.emptyTitle}</p>
      <p className="mt-2 max-w-sm text-sm">{T.emptyDesc}</p>
    </div>
  )
}

function DetailPlaceholder() {
  return (
    <div className="flex h-full items-center justify-center p-8 text-center text-fg-muted">
      <div>
        <p className="text-base">{T.selectRepo}</p>
        <p className="mt-2 text-sm">{T.selectRepoHint}</p>
      </div>
    </div>
  )
}
