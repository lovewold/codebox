import { useState } from 'react'
import { Cloud, FolderOpen, Loader2, X } from 'lucide-react'
import type { RepoKind } from '../types'
import T from '../i18n'

interface Props {
  open: boolean
  busy?: boolean
  onClose: () => void
  onCreate: (name: string, kind: RepoKind) => Promise<{ ok: boolean; error?: string }>
}

export function CreateRepoDialog({ open, busy, onClose, onCreate }: Props) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState<RepoKind>('local')
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('请输入仓库名称')
      return
    }
    setError(null)
    const res = await onCreate(trimmed, kind)
    if (res.ok) {
      setName('')
      setKind('local')
      onClose()
    } else {
      setError(res.error ?? T.createRepoError)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border-default bg-bg-default shadow-xl"
        role="dialog"
        aria-labelledby="create-repo-title"
      >
        <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
          <h2 id="create-repo-title" className="text-sm font-semibold text-fg-default">
            {T.createRepo}
          </h2>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded p-1 text-fg-muted hover:bg-bg-inset hover:text-fg-default disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 px-4 py-4">
          <p className="text-xs text-fg-muted">{T.createRepoHint}</p>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setKind('local')}
              className={`flex flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left transition ${
                kind === 'local'
                  ? 'border-accent-fg bg-accent-subtle text-fg-default'
                  : 'border-border-default text-fg-muted hover:bg-bg-inset'
              }`}
            >
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <FolderOpen className="h-4 w-4" />
                {T.repoKindLocal}
              </span>
              <span className="text-[11px] leading-snug opacity-80">{T.repoKindLocalDesc}</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setKind('cloud')}
              className={`flex flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left transition ${
                kind === 'cloud'
                  ? 'border-accent-fg bg-accent-subtle text-fg-default'
                  : 'border-border-default text-fg-muted hover:bg-bg-inset'
              }`}
            >
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <Cloud className="h-4 w-4" />
                {T.repoKindCloud}
              </span>
              <span className="text-[11px] leading-snug opacity-80">{T.repoKindCloudDesc}</span>
            </button>
          </div>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={T.createRepoNamePlaceholder}
            disabled={busy}
            autoFocus
            className="w-full rounded-lg border border-border-default bg-bg-subtle px-3 py-2 text-sm text-fg-default outline-none focus:border-accent-fg disabled:opacity-50"
          />
          {error && <p className="text-sm text-danger-fg">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="rounded-lg border border-border-default px-4 py-2 text-sm text-fg-muted hover:bg-bg-inset disabled:opacity-50"
            >
              {T.cancel}
            </button>
            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="flex items-center gap-2 rounded-lg bg-accent-emphasis px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {T.createRepoConfirm}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
