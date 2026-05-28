import { useCallback, useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { destroyTerminalResources } from '../lib/terminalCache'
import { fitTerminalToContainer, scheduleTerminalFit } from '../lib/fitTerminal'
import { getTerminalTheme, normalizeTerminalThemeId } from '../lib/terminalThemes'
import { useAppStore } from '../store/useAppStore'

const api = window.electronAPI
const BOOT_TIMEOUT_MS = 15_000

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms)
    promise
      .then((v) => {
        clearTimeout(timer)
        resolve(v)
      })
      .catch((e) => {
        clearTimeout(timer)
        reject(e)
      })
  })
}

interface TerminalPanelProps {
  repoPath: string
  onClose: () => void
  keepAlive?: boolean
  layoutTick?: number
}

export function TerminalPanel({ repoPath, onClose, keepAlive = false, layoutTick = 0 }: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const forceDestroyRef = useRef(false)
  const needsFitRef = useRef(true)
  const settings = useAppStore((s) => s.settings)
  const terminalThemeId = normalizeTerminalThemeId(settings?.terminalTheme)

  const [exited, setExited] = useState(false)
  const [booting, setBooting] = useState(true)
  const [bootError, setBootError] = useState<string | null>(null)
  const [relaunchKey, setRelaunchKey] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container || !api) {
      setBootError('Electron API 不可用')
      setBooting(false)
      return
    }

    let disposed = false
    let sessionId: string | null = null
    let observer: ResizeObserver | undefined
    let cancelScheduledFit: (() => void) | undefined
    let resizeTimer: ReturnType<typeof setTimeout> | undefined

    setExited(false)
    setBootError(null)
    setBooting(true)
    needsFitRef.current = true

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", Consolas, monospace',
      theme: getTerminalTheme(terminalThemeId),
      allowTransparency: false,
      scrollback: 5000,
    })
    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    fitRef.current = fitAddon
    term.open(container)
    termRef.current = term

    const pushPtySize = (cols: number, rows: number) => {
      if (!sessionId || disposed) return
      api.terminal.resize(sessionId, cols, rows)
    }

    const applyFit = () => {
      if (disposed || !container) return
      const size = fitTerminalToContainer(container, term, fitAddon)
      if (size) {
        pushPtySize(size.cols, size.rows)
        needsFitRef.current = false
      }
    }

    const scheduleFit = () => {
      cancelScheduledFit?.()
      cancelScheduledFit = scheduleTerminalFit(container, term, fitAddon, pushPtySize)
    }

    const onMouseDown = () => term.focus()
    container.addEventListener('mousedown', onMouseDown, true)
    const onWindowFocus = () => term.focus()
    window.addEventListener('focus', onWindowFocus)
    const onWindowResize = () => scheduleFit()
    window.addEventListener('resize', onWindowResize)

    const markReady = () => {
      if (!disposed) setBooting(false)
    }

    const dataDisposable = term.onData((data) => {
      if (sessionId) api.terminal.write(sessionId, data)
    })

    const unsubData = api.terminal.onData(({ id, data }) => {
      if (id !== sessionId) return
      markReady()
      if (needsFitRef.current) {
        applyFit()
      }
      term.write(data)
    })

    const unsubExit = api.terminal.onExit(({ id, exitCode, signal }) => {
      if (id !== sessionId) return
      setExited(true)
      markReady()
      term.write(`\r\n\n[进程已退出: ${exitCode}${signal ? ` / 信号 ${signal}` : ''}]\r\n`)
    })

    observer = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => scheduleFit(), 80)
    })

    ;(async () => {
      try {
        const id = await withTimeout(
          api.terminal.create(repoPath),
          BOOT_TIMEOUT_MS,
          '连接超时，请点「重新连接」',
        )
        if (disposed) return

        sessionId = id
        sessionIdRef.current = id
        markReady()

        scheduleFit()
        observer.observe(container)
        requestAnimationFrame(() => {
          if (!disposed) {
            scheduleFit()
            term.focus()
          }
        })
      } catch (err) {
        if (disposed) return
        const message = err instanceof Error ? err.message : String(err)
        setBootError(message)
        markReady()
        term.writeln(`\r\n连接失败: ${message}\r\n`)
      }
    })()

    return () => {
      disposed = true
      cancelScheduledFit?.()
      if (resizeTimer) clearTimeout(resizeTimer)
      dataDisposable.dispose()
      container.removeEventListener('mousedown', onMouseDown, true)
      window.removeEventListener('focus', onWindowFocus)
      window.removeEventListener('resize', onWindowResize)
      observer?.disconnect()
      unsubData()
      unsubExit()
      term.dispose()
      termRef.current = null
      fitRef.current = null

      const shouldKillPty = forceDestroyRef.current || !keepAlive
      if (shouldKillPty) {
        if (sessionId) {
          api.terminal.destroy(sessionId)
        } else {
          void api.terminal.destroyForRepo(repoPath)
        }
        sessionIdRef.current = null
      }
    }
  }, [repoPath, relaunchKey, keepAlive, terminalThemeId])

  useEffect(() => {
    const term = termRef.current
    if (term) {
      term.options.theme = getTerminalTheme(terminalThemeId)
    }
  }, [terminalThemeId])

  useEffect(() => {
    const container = containerRef.current
    const term = termRef.current
    const fit = fitRef.current
    const sid = sessionIdRef.current
    if (!container || !term || !fit || !sid || !api) return

    needsFitRef.current = true
    const cancel = scheduleTerminalFit(container, term, fit, (cols, rows) => {
      api.terminal.resize(sid, cols, rows)
      needsFitRef.current = false
    })
    return cancel
  }, [layoutTick])

  const handleClose = useCallback(() => {
    forceDestroyRef.current = true
    if (sessionIdRef.current) {
      api?.terminal.destroy(sessionIdRef.current)
    }
    sessionIdRef.current = null
    onClose()
  }, [onClose])

  const handleRelaunch = useCallback(() => {
    forceDestroyRef.current = true
    destroyTerminalResources(repoPath)
    sessionIdRef.current = null
    forceDestroyRef.current = false
    setRelaunchKey((k) => k + 1)
  }, [repoPath])

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border-default bg-bg-subtle px-4 py-1.5">
        <span className="font-mono text-xs text-fg-muted truncate">终端 — {repoPath}</span>
        <div className="flex shrink-0 items-center gap-2">
          {booting && !bootError && (
            <span className="text-xs text-fg-muted animate-pulse">连接中…</span>
          )}
          {(exited || bootError) && (
            <button
              type="button"
              onClick={handleRelaunch}
              className="rounded px-2 py-0.5 text-xs text-accent-fg hover:bg-bg-inset"
            >
              重新连接
            </button>
          )}
          <button
            type="button"
            onClick={handleClose}
            className="rounded px-2 py-0.5 text-xs text-fg-muted hover:bg-bg-inset hover:text-fg-default"
          >
            关闭终端
          </button>
        </div>
      </div>

      <div className="relative min-h-0 min-w-0 flex-1">
        {booting && !bootError && (
          <div
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
            style={{ backgroundColor: `${getTerminalTheme(terminalThemeId).background ?? '#0d1117'}99` }}
          >
            <span className="rounded-full bg-bg-subtle/90 px-3 py-1 text-xs text-fg-muted shadow">
              正在连接…
            </span>
          </div>
        )}
        <div ref={containerRef} className="absolute inset-0" />
      </div>
    </div>
  )
}
