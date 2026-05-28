import { useState, useEffect } from 'react'
import { FolderOpen, Moon, Sun } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import T from '../../i18n'
import {
  TERMINAL_THEME_OPTIONS,
  normalizeTerminalThemeId,
  type TerminalThemeId,
} from '../../lib/terminalThemes'

const api = window.electronAPI

export function GeneralSettings() {
  const { settings, theme, setTheme, setSettings } = useAppStore()
  const [viewMode, setViewMode] = useState(settings?.defaultView || 'grid')
  const [workspace, setWorkspace] = useState(settings?.workspaceRoot || '')
  const [terminalTheme, setTerminalTheme] = useState<TerminalThemeId>(
    normalizeTerminalThemeId(settings?.terminalTheme),
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (settings) {
      setViewMode(settings.defaultView)
      setWorkspace(settings.workspaceRoot)
      setTerminalTheme(normalizeTerminalThemeId(settings.terminalTheme))
    }
  }, [settings])

  async function handleSaveTerminalTheme(id: TerminalThemeId) {
    setTerminalTheme(id)
    if (settings) {
      const s = await api.settings.save({ ...settings, terminalTheme: id })
      setSettings(s)
    }
  }

  async function handleToggleTheme(next: 'light' | 'dark') {
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    if (settings) {
      await api.settings.save({ ...settings, theme: next })
      setSettings({ ...settings, theme: next })
    }
  }

  async function handleSaveView(mode: typeof viewMode) {
    setViewMode(mode)
    setSaving(true)
    if (settings) {
      const s = await api.settings.save({ ...settings, defaultView: mode })
      setSettings(s)
    }
    setSaving(false)
  }

  async function handlePickWorkspace() {
    const folder = await api.repos.pickFolder()
    if (folder) {
      setWorkspace(folder)
      if (settings) {
        const s = await api.settings.save({ ...settings, workspaceRoot: folder })
        setSettings(s)
      }
    }
  }

  const views = [
    { id: 'grid' as const, label: T.viewGrid },
    { id: 'list' as const, label: T.viewList },
    { id: 'compact' as const, label: T.viewCompact },
  ]

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <h2 className="mb-6 text-lg font-semibold text-fg-default">{T.settingsGeneral}</h2>

      {/* Theme */}
      <section className="mb-8">
        <h3 className="mb-3 text-sm font-medium text-fg-default">{T.generalTheme}</h3>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleToggleTheme('light')}
            className={`flex flex-1 items-center gap-3 rounded-xl border p-4 transition ${
              theme === 'light'
                ? 'border-accent-fg bg-accent-subtle'
                : 'border-border-default bg-bg-subtle hover:bg-bg-inset'
            }`}
          >
            <Sun className="h-6 w-6 text-fg-default" />
            <div className="text-left">
              <p className="text-sm font-medium text-fg-default">{T.generalThemeLight}</p>
              <p className="text-xs text-fg-muted">浅色模式</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => handleToggleTheme('dark')}
            className={`flex flex-1 items-center gap-3 rounded-xl border p-4 transition ${
              theme === 'dark'
                ? 'border-accent-fg bg-accent-subtle'
                : 'border-border-default bg-bg-subtle hover:bg-bg-inset'
            }`}
          >
            <Moon className="h-6 w-6 text-fg-default" />
            <div className="text-left">
              <p className="text-sm font-medium text-fg-default">{T.generalThemeDark}</p>
              <p className="text-xs text-fg-muted">深色模式</p>
            </div>
          </button>
        </div>
      </section>

      {/* Terminal theme */}
      <section className="mb-8">
        <h3 className="mb-1 text-sm font-medium text-fg-default">{T.generalTerminalTheme}</h3>
        <p className="mb-3 text-xs text-fg-muted">{T.generalTerminalThemeHint}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {TERMINAL_THEME_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSaveTerminalTheme(opt.id)}
              className={`rounded-xl border p-3 text-left transition ${
                terminalTheme === opt.id
                  ? 'border-accent-fg bg-accent-subtle'
                  : 'border-border-default bg-bg-subtle hover:bg-bg-inset'
              }`}
            >
              <p className="text-sm font-medium text-fg-default">{opt.label}</p>
              <p className="mt-0.5 text-xs text-fg-muted">{opt.description}</p>
              <div className="mt-2 flex gap-1">
                {(['#da7756', '#3fb950', '#58a6ff', '#d29922'] as const).map((c) => (
                  <span
                    key={c}
                    className="h-3 w-3 rounded-full border border-border-default"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Default view */}
      <section className="mb-8">
        <h3 className="mb-3 text-sm font-medium text-fg-default">{T.generalDefaultView}</h3>
        <div className="flex gap-2">
          {views.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => handleSaveView(v.id)}
              disabled={saving}
              className={`rounded-lg px-4 py-2 text-sm transition ${
                viewMode === v.id
                  ? 'bg-accent-emphasis text-white'
                  : 'bg-bg-subtle text-fg-muted hover:bg-bg-inset'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </section>

      {/* Workspace path */}
      <section>
        <h3 className="mb-3 text-sm font-medium text-fg-default">{T.generalWorkspace}</h3>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={workspace}
            readOnly
            className="flex-1 rounded-lg border border-border-default bg-bg-subtle px-3 py-2 text-sm text-fg-default"
          />
          <button
            type="button"
            onClick={handlePickWorkspace}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border-default px-3 py-2 text-sm text-fg-muted hover:bg-bg-inset hover:text-fg-default"
          >
            <FolderOpen className="h-4 w-4" />
            {T.generalChooseFolder}
          </button>
        </div>
      </section>
    </div>
  )
}
