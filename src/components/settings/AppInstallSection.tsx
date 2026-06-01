import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, FolderOpen, Loader2, MonitorDown, Pin } from 'lucide-react'
import T from '../../i18n'

const api = window.electronAPI

interface InstallInfo {
  version: string
  productName: string
  execPath: string
  installDir: string
  isPackaged: boolean
  isPortable: boolean
  hasDesktopShortcut: boolean
  hasStartMenuShortcut: boolean
  installerPath: string | null
}

export function AppInstallSection() {
  const [info, setInfo] = useState<InstallInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.app.getInstallInfo()
      setInfo(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function handleCreateDesktop() {
    setBusy('desktop')
    setMessage(null)
    setError(null)
    try {
      const res = await api.app.createDesktopShortcut()
      if (res.ok) {
        setMessage(T.desktopShortcutCreated)
        await refresh()
      } else {
        setError(res.error)
      }
    } finally {
      setBusy(null)
    }
  }

  async function handleCreateStartMenu() {
    setBusy('startMenu')
    setMessage(null)
    setError(null)
    try {
      const res = await api.app.createStartMenuShortcut()
      if (res.ok) {
        setMessage(T.startMenuShortcutCreated)
        await refresh()
      } else {
        setError(res.error)
      }
    } finally {
      setBusy(null)
    }
  }

  async function handleOpenInstaller() {
    setBusy('installer')
    setMessage(null)
    setError(null)
    try {
      const res = await api.app.openInstaller()
      if (!res.ok) setError(res.error)
    } finally {
      setBusy(null)
    }
  }

  if (loading && !info) {
    return (
      <section className="mb-8 flex items-center gap-2 text-sm text-fg-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        {T.loading}
      </section>
    )
  }

  const runMode = !info?.isPackaged
    ? T.appRunModeDev
    : info.isPortable
      ? T.appRunModePortable
      : T.appRunModeInstalled

  return (
    <section className="mb-8">
      <h3 className="mb-1 text-sm font-medium text-fg-default">{T.appInstallSection}</h3>
      <p className="mb-3 text-xs text-fg-muted">{T.appInstallHint}</p>

      <div className="rounded-xl border border-border-default bg-bg-subtle p-4 text-sm">
        <dl className="space-y-2 text-fg-muted">
          <div className="flex flex-wrap gap-x-2">
            <dt className="shrink-0">{T.appVersionLabel}</dt>
            <dd className="text-fg-default">{info?.version ?? '—'}</dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt className="shrink-0">{T.appRunModeLabel}</dt>
            <dd className="text-fg-default">{runMode}</dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt className="shrink-0">{T.appInstallPathLabel}</dt>
            <dd className="min-w-0 break-all font-mono text-xs text-fg-default">{info?.execPath}</dd>
          </div>
          {info?.isPortable && info.installerPath && (
            <div className="flex flex-wrap gap-x-2">
              <dt className="shrink-0">{T.appInstallerPathLabel}</dt>
              <dd className="min-w-0 break-all font-mono text-xs text-fg-default">{info.installerPath}</dd>
            </div>
          )}
          <div className="flex flex-wrap gap-x-4 pt-1">
            <span className={info?.hasDesktopShortcut ? 'text-success-fg' : 'text-fg-subtle'}>
              {info?.hasDesktopShortcut ? T.desktopShortcutExists : T.desktopShortcutMissing}
            </span>
            <span className={info?.hasStartMenuShortcut ? 'text-success-fg' : 'text-fg-subtle'}>
              {info?.hasStartMenuShortcut ? T.startMenuShortcutExists : T.startMenuShortcutMissing}
            </span>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!!busy || !info?.isPackaged}
            onClick={handleCreateDesktop}
            className="flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-2 text-sm text-fg-default hover:bg-bg-inset disabled:opacity-50"
          >
            {busy === 'desktop' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Pin className="h-4 w-4" />
            )}
            {T.createDesktopShortcut}
          </button>
          <button
            type="button"
            disabled={!!busy || !info?.isPackaged}
            onClick={handleCreateStartMenu}
            className="flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-2 text-sm text-fg-default hover:bg-bg-inset disabled:opacity-50"
          >
            {busy === 'startMenu' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MonitorDown className="h-4 w-4" />
            )}
            {T.createStartMenuShortcut}
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => api.app.openInstallDir()}
            className="flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-2 text-sm text-fg-default hover:bg-bg-inset disabled:opacity-50"
          >
            <FolderOpen className="h-4 w-4" />
            {T.openAppInstallDir}
          </button>
          {info?.isPortable && (
            <button
              type="button"
              disabled={!!busy || !info.installerPath}
              onClick={handleOpenInstaller}
              className="flex items-center gap-1.5 rounded-lg bg-accent-emphasis px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy === 'installer' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              {T.runInstaller}
            </button>
          )}
        </div>

        {info?.isPortable && !info.installerPath && (
          <p className="mt-3 text-xs text-attention-fg">{T.appPortableNoInstallerHint}</p>
        )}

        {message && <p className="mt-3 text-xs text-success-fg">{message}</p>}
        {error && <p className="mt-3 text-xs text-danger-fg">{error}</p>}
      </div>
    </section>
  )
}
