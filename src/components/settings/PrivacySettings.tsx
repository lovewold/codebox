import { useState, useEffect } from 'react'
import { Trash2, Cookie, HardDrive } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import T from '../../i18n'

const api = window.electronAPI

interface CookieInfo {
  name: string
  domain: string
  value: string
  expirationDate?: number
}

export function PrivacySettings() {
  const { repos, modelProfiles } = useAppStore()
  const [cookies, setCookies] = useState<CookieInfo[]>([])
  const [storePath, setStorePath] = useState('')
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    loadCookies()
    api.storePath().then(setStorePath)
  }, [])

  async function loadCookies() {
    const list = await api.cookies.list()
    setCookies(list)
  }

  async function handleClear(domain?: string) {
    setClearing(true)
    await api.cookies.clear(domain)
    await loadCookies()
    setClearing(false)
  }

  const githubCookies = cookies.filter((c) => c.domain.includes('github.com'))
  const giteeCookies = cookies.filter((c) => c.domain.includes('gitee.com'))

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <h2 className="mb-6 text-lg font-semibold text-fg-default">{T.settingsPrivacy}</h2>

      {/* Cookies */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Cookie className="h-4 w-4 text-fg-muted" />
            <h3 className="text-sm font-medium text-fg-default">{T.privacyCookies}</h3>
          </div>
          <span className="text-xs text-fg-muted">{T.privacyCookiesCount(cookies.length)}</span>
        </div>
        <p className="mb-3 text-xs text-fg-muted">{T.privacyCookiesDesc}</p>

        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => handleClear('github.com')}
            disabled={clearing || githubCookies.length === 0}
            className="rounded-lg border border-border-default px-3 py-1.5 text-xs text-fg-muted hover:bg-bg-inset hover:text-fg-default disabled:opacity-40"
          >
            <Trash2 className="mr-1 inline h-3 w-3" />
            {T.privacyClearGithubCookies} ({githubCookies.length})
          </button>
          <button
            type="button"
            onClick={() => handleClear('gitee.com')}
            disabled={clearing || giteeCookies.length === 0}
            className="rounded-lg border border-border-default px-3 py-1.5 text-xs text-fg-muted hover:bg-bg-inset hover:text-fg-default disabled:opacity-40"
          >
            <Trash2 className="mr-1 inline h-3 w-3" />
            {T.privacyClearGiteeCookies} ({giteeCookies.length})
          </button>
          <button
            type="button"
            onClick={() => handleClear()}
            disabled={clearing || cookies.length === 0}
            className="rounded-lg border border-danger-fg/30 px-3 py-1.5 text-xs text-danger-fg hover:bg-danger-fg/10 disabled:opacity-40"
          >
            <Trash2 className="mr-1 inline h-3 w-3" />
            {T.privacyClearAllCookies}
          </button>
        </div>

        {cookies.length === 0 ? (
          <p className="rounded-lg border border-border-default bg-bg-subtle px-4 py-6 text-center text-xs text-fg-muted">
            {T.privacyNoCookies}
          </p>
        ) : (
          <div className="max-h-60 overflow-y-auto rounded-lg border border-border-default">
            {cookies.map((c, i) => (
              <div
                key={`${c.domain}-${c.name}-${i}`}
                className="flex items-center gap-2 border-b border-border-default px-3 py-2 last:border-0 text-xs"
              >
                <span className="font-medium text-fg-default truncate">{c.name}</span>
                <span className="text-fg-muted">{c.domain}</span>
                {c.expirationDate && (
                  <span className="ml-auto text-fg-subtle">
                    {new Date(c.expirationDate * 1000).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Storage info */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <HardDrive className="h-4 w-4 text-fg-muted" />
          <h3 className="text-sm font-medium text-fg-default">{T.privacyStorage}</h3>
        </div>
        <div className="rounded-lg border border-border-default bg-bg-subtle p-4 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-fg-muted">{T.privacyStoragePath}</span>
            <span className="font-mono text-fg-default">{storePath || '加载中...'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-fg-muted">仓库</span>
            <span className="text-fg-default">{T.privacyRepoCount(repos.length)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-fg-muted">模型配置</span>
            <span className="text-fg-default">{T.privacyProfileCount(modelProfiles.length)}</span>
          </div>
        </div>
      </section>
    </div>
  )
}
