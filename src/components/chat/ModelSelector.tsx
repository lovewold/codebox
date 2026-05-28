import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Cpu, AlertCircle } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import T from '../../i18n'

const api = window.electronAPI

// Provider label abbreviation map
const PROVIDER_SHORT: Record<string, string> = {
  openai: 'GPT',
  anthropic: 'Claude',
  google_gemini: 'Gemini',
  deepseek: 'DS',
  xiaomi: 'MiMo',
  custom_openai: '自定义',
}

interface Props {
  onOpenSettings?: () => void
}

export function ModelSelector({ onOpenSettings }: Props) {
  const { modelProfiles, activeProfileId, setModelProfiles, setActiveProfileId } = useAppStore()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const activeProfile = modelProfiles.find((p) => p.id === activeProfileId) ?? null

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

  async function handleSelect(id: string) {
    const { profiles, activeProfileId: active } = await api.models.setActive(id)
    setModelProfiles(profiles)
    setActiveProfileId(active)
    setOpen(false)
  }

  const hasConfig = modelProfiles.length > 0

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-xl border border-border-default bg-bg-subtle px-3 py-2.5 text-left text-sm transition hover:bg-bg-inset"
      >
        <Cpu className={`h-4 w-4 shrink-0 ${hasConfig ? 'text-accent-fg' : 'text-attention-fg'}`} />
        {hasConfig && activeProfile ? (
          <span className="flex-1 truncate text-fg-default">
            <span className="text-xs text-fg-muted">
              {PROVIDER_SHORT[activeProfile.provider] || activeProfile.provider}
            </span>
            <span className="mx-1 text-fg-subtle">·</span>
            <span className="text-xs">{activeProfile.modelName}</span>
          </span>
        ) : (
          <span className="flex-1 text-xs text-attention-fg">
            <AlertCircle className="mr-0.5 inline h-3 w-3" />
            {T.modelNoConfig}
          </span>
        )}
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-fg-muted transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-72 rounded-xl border border-border-default bg-bg-default shadow-lg">
          <div className="max-h-64 overflow-y-auto p-1">
            {modelProfiles.length === 0 ? (
              <div className="px-3 py-4 text-center">
                <p className="text-xs text-fg-muted">{T.modelNoConfig}</p>
                {onOpenSettings && (
                  <button
                    type="button"
                    onClick={() => { setOpen(false); onOpenSettings() }}
                    className="mt-2 text-xs text-accent-fg hover:underline"
                  >
                    前往设置配置模型
                  </button>
                )}
              </div>
            ) : (
              modelProfiles.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => handleSelect(profile.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                    profile.id === activeProfileId
                      ? 'bg-accent-subtle text-accent-fg'
                      : 'text-fg-default hover:bg-bg-subtle'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium truncate">
                        {profile.name || PROVIDER_SHORT[profile.provider] || profile.provider}
                      </span>
                      <span className="shrink-0 rounded bg-bg-inset px-1 py-0.5 text-xs text-fg-muted">
                        {PROVIDER_SHORT[profile.provider] || profile.provider}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-fg-muted">{profile.modelName}</p>
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="border-t border-border-default p-2">
            <button
              type="button"
              onClick={() => { setOpen(false); onOpenSettings?.() }}
              className="w-full rounded-lg px-3 py-2 text-left text-xs text-accent-fg hover:bg-bg-subtle"
            >
              {T.modelManage}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
