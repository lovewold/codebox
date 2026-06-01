import { useState } from 'react'
import { FolderPlus, FolderUp, Link2, Loader2, Plus } from 'lucide-react'
import type { RepoKind } from '../types'
import T from '../i18n'
import { CreateRepoDialog } from './CreateRepoDialog'
import { useFolderDrop } from '../hooks/useFolderDrop'

interface Props {
  onAddLocal: () => Promise<void>
  onImportUrl: (url: string) => Promise<{ ok: boolean; error?: string }>
  onCreateRepo: (name: string, kind: RepoKind) => Promise<{ ok: boolean; error?: string }>
  onDropFolderPaths: (paths: string[]) => Promise<void>
  busy?: boolean
}

export function ImportBar({
  onAddLocal,
  onImportUrl,
  onCreateRepo,
  onDropFolderPaths,
  busy,
}: Props) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const { dragOver, dropHandlers } = useFolderDrop({
    disabled: busy,
    onDropPaths: onDropFolderPaths,
  })

  async function handleImport(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setError(null)
    const res = await onImportUrl(url.trim())
    if (res.ok) setUrl('')
    else setError(res.error ?? T.importError)
  }

  return (
    <>
      <div
        className={`relative border-b border-border-default bg-bg-subtle px-4 py-3 transition ${
          dragOver ? 'ring-2 ring-inset ring-accent-fg/40 bg-accent-subtle/30' : ''
        }`}
        {...dropHandlers}
      >
        {dragOver && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-sm bg-accent-subtle/50">
            <span className="flex items-center gap-2 rounded-full bg-bg-default/95 px-4 py-2 text-sm text-accent-fg shadow">
              <FolderUp className="h-4 w-4" />
              {T.dropFolderHint}
            </span>
          </div>
        )}
        <form onSubmit={handleImport} className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-[280px] flex-1 items-center gap-2 rounded-lg border border-border-default bg-bg-default px-3 py-1.5">
            <Link2 className="h-4 w-4 shrink-0 text-fg-muted" />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={T.importUrlPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-sm text-fg-default outline-none placeholder:text-fg-subtle"
              disabled={busy}
            />
          </div>
          <button
            type="submit"
            disabled={busy || !url.trim()}
            className="flex items-center gap-2 rounded-lg bg-accent-emphasis px-4 py-2 text-sm font-medium text-fg-default transition hover:bg-accent-emphasis disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {T.importClone}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-border-default px-4 py-2 text-sm text-fg-default transition hover:bg-bg-inset disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {T.createRepo}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onAddLocal()}
            className="flex items-center gap-2 rounded-lg border border-border-default px-4 py-2 text-sm text-fg-default transition hover:bg-bg-inset disabled:opacity-50"
          >
            <FolderPlus className="h-4 w-4" />
            {T.addLocal}
          </button>
        </form>
        <p className="mt-2 text-xs text-fg-subtle">{T.dropFolderHint}</p>
        {error && <p className="mt-2 text-sm text-danger-fg">{error}</p>}
      </div>

      <CreateRepoDialog
        open={createOpen}
        busy={busy}
        onClose={() => setCreateOpen(false)}
        onCreate={onCreateRepo}
      />
    </>
  )
}
