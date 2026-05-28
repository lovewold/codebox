import { useCallback, useEffect, useState } from 'react'
import { GitBranch, GitCommit, Loader2, X } from 'lucide-react'
import type { GitBranch as GitBranchT, GitCommit as GitCommitT, GitStatusResult, RepoRecord } from '../types'
import T from '../i18n'

const api = window.electronAPI

interface Props {
  repo: RepoRecord
  onClose: () => void
}

type Tab = 'status' | 'log' | 'branches' | 'diff'

export function GitPanel({ repo, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('status')
  const [status, setStatus] = useState<GitStatusResult | null>(null)
  const [commits, setCommits] = useState<GitCommitT[]>([])
  const [branches, setBranches] = useState<GitBranchT[]>([])
  const [diffSummary, setDiffSummary] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [operationBusy, setOperationBusy] = useState(false)
  const [commitMessage, setCommitMessage] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [opFeedback, setOpFeedback] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [s, c, b] = await Promise.all([
        api.git.status(repo.localPath),
        api.git.log(repo.localPath, 20),
        api.git.branches(repo.localPath),
      ])
      setStatus(s)
      setCommits(c)
      setBranches(b)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [repo.localPath])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function loadDiff() {
    const d = await api.git.diffSummary(repo.localPath)
    setDiffSummary(d)
  }

  useEffect(() => {
    if (tab === 'diff' && !diffSummary) loadDiff()
  }, [tab])

  async function doAction(fn: () => Promise<{ ok: boolean; error?: string }>, successMsg: string) {
    setOperationBusy(true)
    setOpFeedback(null)
    try {
      const res = await fn()
      if (res.ok) {
        setOpFeedback(successMsg)
        await loadData()
        if (tab === 'diff') loadDiff()
      } else {
        setOpFeedback(res.error ?? '操作失败')
      }
    } catch (err) {
      setOpFeedback(err instanceof Error ? err.message : String(err))
    } finally {
      setOperationBusy(false)
    }
  }

  function handleStage(files: string[]) {
    doAction(() => api.git.stage(repo.localPath, files), '已暂存')
  }

  function handleUnstage(files: string[]) {
    doAction(() => api.git.unstage(repo.localPath, files), '已取消暂存')
  }

  function handleCommit() {
    if (!commitMessage.trim()) return
    doAction(async () => {
      const r = await api.git.commit(repo.localPath, commitMessage.trim())
      if (r.ok) setCommitMessage('')
      return r
    }, '提交成功')
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'status', label: T.gitStatusTab },
    { id: 'log', label: T.gitLogTab },
    { id: 'branches', label: T.gitBranchesTab },
    { id: 'diff', label: T.gitDiffTab },
  ]

  const allFiles = status
    ? [...status.unstaged, ...status.untracked]
    : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex h-[min(640px,90vh)] w-full max-w-2xl flex-col rounded-xl border border-border-default bg-bg-subtle shadow-xl">
        {/* header */}
        <div className="flex items-center justify-between border-b border-border-default px-5 py-3">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-accent-fg" />
            <h2 className="text-lg font-semibold text-fg-default">{repo.name}</h2>
            <span className="text-sm text-fg-muted">{T.gitPanelTitle}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-fg-muted hover:bg-bg-inset hover:text-fg-default"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* tabs */}
        <div className="flex gap-0.5 border-b border-border-default bg-bg-default px-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm transition ${
                tab === t.id
                  ? 'border-b-2 border-accent-fg font-medium text-fg-default'
                  : 'text-fg-muted hover:text-fg-default'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* feedback */}
        {opFeedback && (
          <div className={`px-4 py-2 text-sm ${opFeedback.includes('成功') || opFeedback.includes('已') ? 'text-success-fg' : 'text-danger-fg'}`}>
            {opFeedback}
          </div>
        )}

        {/* content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-fg-muted" />
            </div>
          ) : error ? (
            <div className="p-4 text-danger-fg">{error}</div>
          ) : tab === 'status' && status ? (
            <StatusTab
              status={status}
              allFiles={allFiles}
              selectedFiles={selectedFiles}
              setSelectedFiles={setSelectedFiles}
              commitMessage={commitMessage}
              setCommitMessage={setCommitMessage}
              operationBusy={operationBusy}
              onStage={handleStage}
              onUnstage={handleUnstage}
              onStageAll={() => handleStage(allFiles.map((f) => f.path))}
              onUnstageAll={() => handleUnstage(status.staged.map((f) => f.path))}
              onCommit={handleCommit}
              onPush={() => doAction(() => api.git.push(repo.localPath), '推送成功')}
              onPull={() => doAction(() => api.git.pull(repo.localPath), '拉取成功')}
            />
          ) : tab === 'log' ? (
            <LogTab commits={commits} />
          ) : tab === 'branches' ? (
            <BranchesTab
              branches={branches}
              onSwitch={(branch) =>
                doAction(() => api.git.switchBranch(repo.localPath, branch), `已切换到 ${branch}`)
              }
              operationBusy={operationBusy}
            />
          ) : tab === 'diff' ? (
            <pre className="whitespace-pre-wrap p-4 font-mono text-xs text-fg-default">
              {diffSummary || '加载中…'}
            </pre>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function StatusTab({
  status,
  allFiles,
  selectedFiles,
  setSelectedFiles,
  commitMessage,
  setCommitMessage,
  operationBusy,
  onStage,
  onUnstage,
  onStageAll,
  onUnstageAll,
  onCommit,
  onPush,
  onPull,
}: {
  status: GitStatusResult
  allFiles: { path: string; status: string }[]
  selectedFiles: Set<string>
  setSelectedFiles: (s: Set<string>) => void
  commitMessage: string
  setCommitMessage: (m: string) => void
  operationBusy: boolean
  onStage: (files: string[]) => void
  onUnstage: (files: string[]) => void
  onStageAll: () => void
  onUnstageAll: () => void
  onCommit: () => void
  onPush: () => void
  onPull: () => void
}) {
  const hasAnyChanges = status.staged.length + status.unstaged.length + status.untracked.length > 0

  function toggleFile(path: string) {
    const next = new Set(selectedFiles)
    if (next.has(path)) next.delete(path)
    else next.add(path)
    setSelectedFiles(next)
  }

  function getSelected(prefix: string) {
    return [...selectedFiles].filter((f) => f.startsWith(prefix))
  }

  return (
    <div className="flex flex-col p-4">
      {/* branch info */}
      <div className="mb-3 flex items-center gap-2 text-sm">
        <span className="text-fg-muted">{T.gitCurrentBranch}:</span>
        <span className="rounded bg-bg-inset px-2 py-0.5 font-mono text-fg-default">{status.branch}</span>
        {status.ahead > 0 && <span className="text-success-fg">{T.ahead(status.ahead)}</span>}
        {status.behind > 0 && <span className="text-attention-fg">{T.behind(status.behind)}</span>}
      </div>

      {!hasAnyChanges ? (
        <p className="py-8 text-center text-sm text-fg-muted">{T.gitNoChanges}</p>
      ) : (
        <>
          {/* staged */}
          {status.staged.length > 0 && (
            <FileSection
              title={T.gitStaged}
              files={status.staged}
              selected={selectedFiles}
              onToggle={toggleFile}
              actions={
                <>
                  <MiniBtn onClick={() => onUnstage(getSelected('staged:'))} disabled={operationBusy}>
                    {T.gitUnstageSelected}
                  </MiniBtn>
                  <MiniBtn onClick={onUnstageAll} disabled={operationBusy}>
                    {T.gitUnstageAll}
                  </MiniBtn>
                </>
              }
            />
          )}

          {/* unstaged */}
          {status.unstaged.length > 0 && (
            <FileSection
              title={T.gitUnstaged}
              files={status.unstaged}
              selected={selectedFiles}
              onToggle={toggleFile}
              actions={
                <MiniBtn onClick={() => onStage(getSelected('unstaged:'))} disabled={operationBusy}>
                  {T.gitStageSelected}
                </MiniBtn>
              }
            />
          )}

          {/* untracked */}
          {status.untracked.length > 0 && (
            <FileSection
              title={T.gitUntracked}
              files={status.untracked}
              selected={selectedFiles}
              onToggle={toggleFile}
              actions={
                <MiniBtn onClick={() => onStage(getSelected('untracked:'))} disabled={operationBusy}>
                  {T.gitStageSelected}
                </MiniBtn>
              }
            />
          )}

          {/* stage all button */}
          {allFiles.length > 0 && (
            <div className="mb-3">
              <MiniBtn onClick={onStageAll} disabled={operationBusy}>
                {T.gitStageAll}
              </MiniBtn>
            </div>
          )}
        </>
      )}

      {/* commit */}
      <div className="mt-2 border-t border-border-default pt-3">
        <textarea
          className="w-full rounded-lg border border-border-default bg-bg-default px-3 py-2 text-sm text-fg-default outline-none focus:border-accent-fg"
          rows={2}
          placeholder={T.gitCommitMessage}
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          disabled={operationBusy}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onCommit}
            disabled={operationBusy || !commitMessage.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-accent-emphasis px-4 py-2 text-sm font-medium text-fg-default hover:bg-accent-emphasis disabled:opacity-50"
          >
            <GitCommit className="h-4 w-4" />
            {T.gitCommit}
          </button>
          <button
            type="button"
            onClick={onPush}
            disabled={operationBusy}
            className="rounded-lg border border-border-default px-4 py-2 text-sm text-fg-default hover:bg-bg-inset disabled:opacity-50"
          >
            {T.gitPush}
          </button>
          <button
            type="button"
            onClick={onPull}
            disabled={operationBusy}
            className="rounded-lg border border-border-default px-4 py-2 text-sm text-fg-default hover:bg-bg-inset disabled:opacity-50"
          >
            {T.gitPull}
          </button>
        </div>
      </div>
    </div>
  )
}

function FileSection({
  title,
  files,
  selected,
  onToggle,
  actions,
}: {
  title: string
  files: { path: string; status: string }[]
  selected: Set<string>
  onToggle: (path: string) => void
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-fg-muted">{title} ({files.length})</span>
        {actions}
      </div>
      <div className="rounded-lg border border-border-default bg-bg-default">
        {files.map((f) => (
          <label
            key={f.path}
            className="flex cursor-pointer items-center gap-2 border-b border-border-default px-3 py-1.5 text-sm last:border-0 hover:bg-bg-inset"
          >
            <input
              type="checkbox"
              checked={selected.has(f.path)}
              onChange={() => onToggle(f.path)}
              className="h-3.5 w-3.5 rounded border-border-default bg-transparent accent-accent-fg"
            />
            <span className="font-mono text-xs text-fg-muted w-5">{f.status}</span>
            <span className="truncate text-fg-default">{f.path}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function MiniBtn({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded px-2 py-0.5 text-xs text-fg-muted hover:bg-bg-inset hover:text-fg-default disabled:opacity-50"
    >
      {children}
    </button>
  )
}

function LogTab({ commits }: { commits: GitCommitT[] }) {
  if (commits.length === 0) {
    return <p className="p-4 text-sm text-fg-muted">{T.gitNoChanges}</p>
  }
  return (
    <div className="divide-y divide-border-default">
      {commits.map((c) => (
        <div key={c.hash} className="px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <span className="min-w-0 flex-1 truncate text-sm text-fg-default">{c.message}</span>
            <span className="shrink-0 font-mono text-xs text-accent-fg">{c.hash}</span>
          </div>
          <div className="mt-1 flex gap-3 text-xs text-fg-muted">
            <span>{c.author}</span>
            <span>{c.date}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function BranchesTab({
  branches,
  onSwitch,
  operationBusy,
}: {
  branches: GitBranchT[]
  onSwitch: (branch: string) => void
  operationBusy: boolean
}) {
  return (
    <div className="divide-y divide-border-default">
      {branches.map((b) => (
        <div
          key={b.name}
          className={`flex items-center justify-between px-4 py-3 ${
            b.current ? 'bg-accent-subtle' : ''
          }`}
        >
          <div className="flex items-center gap-2">
            <GitBranch className={`h-4 w-4 ${b.current ? 'text-accent-fg' : 'text-fg-muted'}`} />
            <span className={`font-mono text-sm ${b.current ? 'font-medium text-fg-default' : 'text-fg-default'}`}>
              {b.name}
            </span>
            {b.current && (
              <span className="rounded bg-accent-emphasis px-2 py-0.5 text-xs text-fg-default">{T.gitCurrentBranch}</span>
            )}
            {b.remote && !b.current && (
              <span className="text-xs text-fg-muted">remote</span>
            )}
          </div>
          {!b.current && (
            <button
              type="button"
              onClick={() => onSwitch(b.name)}
              disabled={operationBusy}
              className="rounded border border-border-default px-3 py-1 text-xs text-fg-default hover:bg-bg-inset disabled:opacity-50"
            >
              {b.remote ? '检出远程分支' : T.gitSwitchBranch}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
