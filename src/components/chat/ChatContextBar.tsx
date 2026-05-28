import { useState, useRef, useEffect } from 'react'
import { ChevronDown, FolderGit2, X } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

interface Props {
  contextRepoId: string | null
  onChange: (repoId: string | null) => void
}

export function ChatContextBar({ contextRepoId, onChange }: Props) {
  const repos = useAppStore((s) => s.repos)
  const setCurrentTab = useAppStore((s) => s.setCurrentTab)

  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = repos.find((r) => r.id === contextRepoId) ?? null

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const filtered = search
    ? repos.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
    : repos

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-xl border border-border-default bg-bg-subtle px-4 py-2.5 text-left text-sm transition hover:bg-bg-inset"
      >
        <FolderGit2 className="h-4 w-4 shrink-0 text-accent-fg" />
        {selected ? (
          <span className="flex-1 truncate font-medium text-fg-default">
            {selected.name}
            {selected.gitBranch && (
              <span className="ml-1.5 font-mono text-xs text-fg-muted">{selected.gitBranch}</span>
            )}
          </span>
        ) : (
          <span className="flex-1 text-fg-muted">选择仓库以提供上下文</span>
        )}
        <ChevronDown className={`h-4 w-4 shrink-0 text-fg-muted transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-xl border border-border-default bg-bg-default shadow-lg">
          <div className="border-b border-border-default p-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索仓库..."
              className="w-full rounded-lg border border-border-default bg-bg-default px-3 py-1.5 text-sm text-fg-default outline-none focus:border-accent-fg"
              autoFocus
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {selected && (
              <button
                type="button"
                onClick={() => { onChange(null); setOpen(false) }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-fg-muted hover:bg-bg-subtle"
              >
                <X className="h-4 w-4" />
                清除选择
              </button>
            )}
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-fg-muted">未找到仓库</p>
            ) : (
              filtered.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => { onChange(r.id); setOpen(false) }}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                    r.id === contextRepoId
                      ? 'bg-accent-subtle text-accent-fg'
                      : 'text-fg-default hover:bg-bg-subtle'
                  }`}
                >
                  <FolderGit2 className="h-4 w-4 shrink-0" />
                  <span className="truncate font-medium">{r.name}</span>
                  {r.language && (
                    <span className="shrink-0 rounded bg-bg-inset px-1.5 py-0.5 text-xs text-fg-muted">
                      {r.language}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
          <div className="border-t border-border-default p-2">
            <button
              type="button"
              onClick={() => { setOpen(false); setCurrentTab('repos') }}
              className="w-full rounded-lg px-3 py-2 text-left text-xs text-accent-fg hover:bg-bg-subtle"
            >
              前往仓库管理
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
