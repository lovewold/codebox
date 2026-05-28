import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Download, ExternalLink, Info, Languages, Loader2, RefreshCw } from 'lucide-react'

const api = window.electronAPI

interface Props {
  onCloneDone: () => void
  onSelectRepo: (id: string) => void
}

const PLATFORMS = [
  { id: 'github', label: 'GitHub', home: 'https://github.com' },
  { id: 'gitee', label: 'Gitee', home: 'https://gitee.com' },
]

function translateProxy(raw: string) {
  return `https://translate.google.com/translate?hl=zh-CN&sl=auto&tl=zh-CN&u=${encodeURIComponent(raw)}`
}

function untranslate(url: string) {
  const m = url.match(/[?&]u=([^&]+)/)
  return m ? decodeURIComponent(m[1]) : url
}

function detectRepoUrl(url: string): string | null {
  const real = untranslate(url)
  const match = real.match(/^https?:\/\/(github\.com|gitee\.com)\/([^/]+\/[^/]+)/)
  if (!match) return null
  const repoPath = match[2]
  const excluded = ['explore', 'topics', 'trending', 'notifications', 'settings', 'marketplace', 'search', 'mine', 'organizations', 'dashboard', 'new', 'pricing', 'features', 'blog', 'about']
  if (excluded.some((e) => repoPath === e || repoPath.startsWith(`${e}/`))) return null
  return `https://${match[1]}/${repoPath}`
}

export function GitHubExplore({ onCloneDone, onSelectRepo }: Props) {
  const [platform, setPlatform] = useState(PLATFORMS[0])
  const [baseUrl, setBaseUrl] = useState(platform.home)
  const [inputUrl, setInputUrl] = useState(platform.home)
  const [loading, setLoading] = useState(false)
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)
  const [cloneUrl, setCloneUrl] = useState<string | null>(null)
  const [cloning, setCloning] = useState(false)
  const [cloneError, setCloneError] = useState<string | null>(null)
  const [translating, setTranslating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const wvRef = useRef<any>(null)

  const checkRepoUrl = useCallback((currentUrl: string) => {
    setCloneUrl(detectRepoUrl(currentUrl))
  }, [])

  // Create webview
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const wv = document.createElement('webview') as any
    wv.id = 'explore-wv'
    wv.src = platform.home
    wv.style.width = '100%'
    wv.style.height = '100%'
    wv.style.border = 'none'
    wv.setAttribute('allowpopups', 'true')
    container.appendChild(wv)
    wvRef.current = wv

    const onLoadStart = () => setLoading(true)
    const onLoadStop = () => setLoading(false)
    const onNavigate = (e: any) => {
      const dest = e.url
      setInputUrl(dest)
      checkRepoUrl(dest)
      if (dest.includes('translate.google.com')) {
        const src = untranslate(dest)
        if (src) setBaseUrl(src)
      } else if (!dest.startsWith('about:')) {
        setBaseUrl(dest)
      }
    }
    const onNavigateInPage = (e: any) => {
      if (!e.isMainFrame) return
      const dest = e.url
      setInputUrl(dest)
      checkRepoUrl(dest)
      if (dest.includes('translate.google.com')) {
        const src = untranslate(dest)
        if (src) setBaseUrl(src)
      } else if (!dest.startsWith('about:')) {
        setBaseUrl(dest)
      }
    }

    // Intercept new-window
    const onNewWindow = (e: any) => {
      e.preventDefault()
      const targetUrl = e.url
      if (targetUrl && targetUrl !== 'about:blank') {
        wv.loadURL(targetUrl)
      }
    }
    wv.addEventListener('new-window', onNewWindow)

    // Inject target="_blank" stripping
    wv.addEventListener('did-start-navigation', () => {
      try {
        wv.executeJavaScript(`
          (function() {
            var _open = window.open
            window.open = function(url) {
              if (url && url !== 'about:blank') {
                window.location.href = url
              }
              return null
            }
            function stripTargets() {
              var links = document.querySelectorAll('a[target="_blank"], a[target="_new"]')
              for (var i = 0; i < links.length; i++) {
                links[i].removeAttribute('target')
              }
            }
            stripTargets()
            var observer = new MutationObserver(function() { stripTargets() })
            observer.observe(document.documentElement, { childList: true, subtree: true })
          })()
        `)
      } catch { /* ignore */ }
    })

    wv.addEventListener('dom-ready', () => {
      try {
        wv.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
        )
      } catch { /* ignore */ }
    })

    wv.addEventListener('did-start-loading', onLoadStart)
    wv.addEventListener('did-stop-loading', onLoadStop)
    wv.addEventListener('did-navigate', onNavigate)
    wv.addEventListener('did-navigate-in-page', onNavigateInPage)

    const interval = setInterval(() => {
      try { setCanGoBack(wv.canGoBack()) } catch { /* ignore */ }
      try { setCanGoForward(wv.canGoForward()) } catch { /* ignore */ }
    }, 500)

    return () => {
      wv.removeEventListener('new-window', onNewWindow)
      wv.removeEventListener('did-start-loading', onLoadStart)
      wv.removeEventListener('did-stop-loading', onLoadStop)
      wv.removeEventListener('did-navigate', onNavigate)
      wv.removeEventListener('did-navigate-in-page', onNavigateInPage)
      clearInterval(interval)
      try { wv.stop() } catch { /* ignore */ }
      try { container.removeChild(wv) } catch { /* ignore */ }
      wvRef.current = null
    }
  }, [])

  const loadPlatform = useCallback((p: typeof PLATFORMS[0]) => {
    setPlatform(p)
    setInputUrl(p.home)
    setBaseUrl(p.home)
    setTranslating(false)
    setCloneUrl(null)
    if (wvRef.current) wvRef.current.loadURL(p.home)
  }, [])

  function navigate() {
    let target = inputUrl.trim()
    if (!target) return
    if (!target.startsWith('http')) {
      target = `${platform.home}/${target.replace(/^\//, '')}`
      setInputUrl(target)
    }
    setBaseUrl(target)
    if (wvRef.current) wvRef.current.loadURL(translating ? translateProxy(target) : target)
  }

  function goBack() {
    if (wvRef.current && canGoBack) wvRef.current.goBack()
  }

  function goForward() {
    if (wvRef.current && canGoForward) wvRef.current.goForward()
  }

  function handleRefresh() {
    if (wvRef.current) wvRef.current.reload()
  }

  function toggleTranslate() {
    const next = !translating
    setTranslating(next)
    if (wvRef.current) {
      wvRef.current.loadURL(next ? translateProxy(baseUrl) : baseUrl)
    }
  }

  async function handleClone() {
    if (!cloneUrl || cloning) return
    setCloning(true)
    setCloneError(null)
    try {
      const res = await api.repos.importUrl(cloneUrl)
      if (res.ok) {
        onCloneDone()
        onSelectRepo(res.repo.id)
      } else {
        setCloneError(res.error || '克隆失败')
      }
    } catch (err) {
      setCloneError(err instanceof Error ? err.message : '克隆失败')
    } finally {
      setCloning(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') navigate()
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border-default bg-bg-subtle px-3 py-2">
        <div className="flex shrink-0 rounded-lg border border-border-default bg-bg-default p-0.5">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => loadPlatform(p)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                platform.id === p.id
                  ? 'bg-accent-emphasis text-white'
                  : 'text-fg-muted hover:text-fg-default'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={goBack}
          disabled={!canGoBack}
          className="rounded p-1.5 text-fg-muted hover:bg-bg-inset hover:text-fg-default disabled:opacity-30"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={goForward}
          disabled={!canGoForward}
          className="rounded p-1.5 text-fg-muted hover:bg-bg-inset hover:text-fg-default disabled:opacity-30"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleRefresh}
          className="rounded p-1.5 text-fg-muted hover:bg-bg-inset hover:text-fg-default"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>

        {/* Translate toggle */}
        <button
          type="button"
          onClick={toggleTranslate}
          className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition ${
            translating
              ? 'bg-accent-emphasis text-white'
              : 'text-fg-muted hover:bg-bg-inset hover:text-fg-default'
          }`}
          title={translating ? '关闭翻译' : 'Google 翻译此页'}
        >
          <Languages className="h-3.5 w-3.5" />
          翻译
        </button>

        <div className="flex flex-1 items-center gap-2 rounded-lg border border-border-default bg-bg-default px-3 py-1.5">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-w-0 flex-1 bg-transparent text-sm text-fg-default outline-none"
            placeholder="输入仓库地址..."
          />
          <button
            type="button"
            onClick={() => {
              const w = window.open(baseUrl, '_blank')
              if (w) w.opener = null
            }}
            className="shrink-0 rounded p-0.5 text-fg-muted hover:text-fg-default"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>

        {cloneUrl && (
          <button
            type="button"
            onClick={handleClone}
            disabled={cloning}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-accent-emphasis px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {cloning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            一键克隆
          </button>
        )}
      </div>

      {cloneError && (
        <div className="shrink-0 border-b border-border-default bg-attention-fg/10 px-4 py-1.5 text-xs text-attention-fg">
          {cloneError}
          <button type="button" onClick={() => setCloneError(null)} className="ml-2 underline">关闭</button>
        </div>
      )}

      {/* subtle translate notice — only visible when translation is active */}
      {translating && (
        <div className="shrink-0 flex items-center gap-2 border-b border-border-default bg-accent-subtle px-4 py-1.5 text-[11px] text-fg-muted">
          <Info className="h-3 w-3 shrink-0" />
          <span>Google 翻译模式下偶有安全验证，如搜索框无法输入，关闭翻译即可</span>
          <button
            type="button"
            onClick={() => {
              setTranslating(false)
              if (wvRef.current) wvRef.current.loadURL(baseUrl)
            }}
            className="ml-auto shrink-0 text-accent-fg hover:underline"
          >
            关闭翻译
          </button>
        </div>
      )}

      <div ref={containerRef} className="flex-1 bg-white" />
    </div>
  )
}
