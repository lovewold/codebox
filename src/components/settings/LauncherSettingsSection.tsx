import { useEffect, useState } from 'react'
import { ExternalLink, FolderOpen, Play } from 'lucide-react'
import type { LauncherId } from '../types'
import T from '../../i18n'

const api = window.electronAPI

const ITEMS: { id: LauncherId; label: string; hint: string }[] = [
  { id: 'codex', label: 'Codex', hint: T.launcherCodexHint },
  { id: 'cursor', label: 'Cursor', hint: T.launcherCursorHint },
  { id: 'edge', label: 'Microsoft Edge', hint: T.launcherEdgeHint },
]

interface Props {
  paths: Partial<Record<LauncherId, string>>
  onChange: (paths: Partial<Record<LauncherId, string>>) => void
}

export function LauncherSettingsSection({ paths, onChange }: Props) {
  const [detected, setDetected] = useState<Partial<Record<LauncherId, string>>>({})

  useEffect(() => {
    void api.launcher.detectDefaults().then(setDetected)
  }, [])

  async function handlePick(id: LauncherId) {
    const picked = await api.launcher.pickPath()
    if (picked) onChange({ ...paths, [id]: picked })
  }

  async function handleTest(id: LauncherId) {
    const res = await api.launcher.open(id, {})
    if (!res.ok) alert(res.error ?? T.launcherError)
  }

  function displayPath(id: LauncherId): string {
    return paths[id]?.trim() || detected[id] || T.launcherAutoDetect
  }

  return (
    <section className="mb-8">
      <h3 className="mb-1 text-sm font-medium text-fg-default">{T.generalLaunchers}</h3>
      <p className="mb-4 text-xs text-fg-muted">{T.generalLaunchersHint}</p>
      <div className="space-y-4">
        {ITEMS.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-border-default bg-bg-subtle p-4"
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-fg-default">{item.label}</span>
              <button
                type="button"
                onClick={() => void handleTest(item.id)}
                className="flex items-center gap-1 rounded-lg border border-border-default px-2 py-1 text-xs text-fg-muted hover:bg-bg-inset hover:text-fg-default"
              >
                <Play className="h-3 w-3" />
                {T.launcherTest}
              </button>
            </div>
            <p className="mb-2 text-xs text-fg-muted">{item.hint}</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={paths[item.id] ?? ''}
                onChange={(e) => {
                  const next = { ...paths }
                  const v = e.target.value
                  if (v.trim()) next[item.id] = v
                  else delete next[item.id]
                  onChange(next)
                }}
                placeholder={displayPath(item.id)}
                className="min-w-0 flex-1 rounded-lg border border-border-default bg-bg-default px-3 py-2 font-mono text-xs text-fg-default"
              />
              <button
                type="button"
                onClick={() => void handlePick(item.id)}
                className="flex shrink-0 items-center gap-1 rounded-lg border border-border-default px-2 py-2 text-xs text-fg-muted hover:bg-bg-inset"
                title={T.generalChooseFolder}
              >
                <FolderOpen className="h-3.5 w-3.5" />
              </button>
              {paths[item.id] && (
                <button
                  type="button"
                  onClick={() => {
                    const next = { ...paths }
                    delete next[item.id]
                    onChange(next)
                  }}
                  className="shrink-0 text-xs text-fg-muted hover:text-fg-default"
                >
                  {T.launcherUseAuto}
                </button>
              )}
            </div>
            {!paths[item.id] && detected[item.id] && (
              <p className="mt-1.5 flex items-center gap-1 text-[10px] text-fg-subtle">
                <ExternalLink className="h-3 w-3" />
                {T.launcherDetected}: {detected[item.id]}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
