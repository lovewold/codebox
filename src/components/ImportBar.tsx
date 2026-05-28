import { useState } from 'react'
import { FolderPlus, Link2, Loader2 } from 'lucide-react'
import T from '../i18n'

interface Props {
  onAddLocal: () => Promise<void>
  onImportUrl: (url: string) => Promise<{ ok: boolean; error?: string }>
  busy?: boolean
}

export function ImportBar({ onAddLocal, onImportUrl, busy }: Props) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleImport(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setError(null)
    const res = await onImportUrl(url.trim())
    if (res.ok) setUrl('')
    else setError(res.error ?? T.importError)
  }

  return (
    <div className="border-b border-border-default bg-bg-subtle px-4 py-3">
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
          onClick={() => onAddLocal()}
          className="flex items-center gap-2 rounded-lg border border-border-default px-4 py-2 text-sm text-fg-default transition hover:bg-bg-inset disabled:opacity-50"
        >
          <FolderPlus className="h-4 w-4" />
          {T.addLocal}
        </button>
      </form>
      {error && (
        <p className="mt-2 text-sm text-danger-fg">{error}</p>
      )}
    </div>
  )
}
