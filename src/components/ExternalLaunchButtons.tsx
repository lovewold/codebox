import { useCallback, useState } from 'react'
import { Globe, Loader2, Sparkles, TerminalSquare } from 'lucide-react'
import type { LauncherId, RepoRecord } from '../types'
import T from '../i18n'

const api = window.electronAPI

const LAUNCHERS: { id: LauncherId; label: string; icon: typeof Sparkles }[] = [
  { id: 'codex', label: 'Codex', icon: Sparkles },
  { id: 'cursor', label: 'Cursor', icon: TerminalSquare },
  { id: 'edge', label: 'Edge', icon: Globe },
]

interface Props {
  repo: RepoRecord
}

export function ExternalLaunchButtons({ repo }: Props) {
  const [busy, setBusy] = useState<LauncherId | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleLaunch = useCallback(
    async (id: LauncherId) => {
      if (!api) return
      setBusy(id)
      setError(null)
      try {
        const res = await api.launcher.open(id, {
          repoPath: repo.localPath,
          remoteUrl: repo.remoteUrl,
        })
        if (!res.ok) setError(res.error ?? T.launcherError)
      } finally {
        setBusy(null)
      }
    },
    [repo.localPath, repo.remoteUrl],
  )

  return (
    <div className="flex flex-col items-end gap-0.5">
      <div className="flex flex-wrap justify-end gap-1">
        {LAUNCHERS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            disabled={busy !== null}
            onClick={() => void handleLaunch(id)}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-fg-muted transition hover:bg-bg-inset hover:text-fg-default disabled:opacity-50"
            title={T.launcherOpenIn(label)}
          >
            {busy === id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Icon className="h-3.5 w-3.5" />
            )}
            {label}
          </button>
        ))}
      </div>
      {error && <span className="max-w-[220px] truncate text-[10px] text-danger-fg">{error}</span>}
    </div>
  )
}
