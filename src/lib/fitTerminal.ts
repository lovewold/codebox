import type { Terminal } from '@xterm/xterm'
import type { FitAddon } from '@xterm/addon-fit'

const MIN_COLS = 40
const MIN_ROWS = 8

/** 在容器有有效尺寸后再 fit，避免列宽过小导致异常换行 */
export function fitTerminalToContainer(
  container: HTMLElement,
  term: Terminal,
  fitAddon: FitAddon,
): { cols: number; rows: number } | null {
  const width = container.clientWidth
  const height = container.clientHeight
  if (width < 50 || height < 50) return null

  try {
    fitAddon.fit()
  } catch {
    return null
  }

  let cols = term.cols
  let rows = term.rows

  // fit 失败或列数异常偏小时，按像素估算
  if (cols < MIN_COLS) {
    const fontSize = (term.options.fontSize as number) || 14
    const charW = Math.max(7, fontSize * 0.6)
    const charH = Math.max(14, fontSize * 1.2)
    cols = Math.max(MIN_COLS, Math.floor((width - 12) / charW))
    rows = Math.max(MIN_ROWS, Math.floor((height - 12) / charH))
    term.resize(cols, rows)
  }

  if (cols < 2 || rows < 2) return null
  return { cols, rows }
}

/** 多次重试直到容器布局稳定 */
export function scheduleTerminalFit(
  container: HTMLElement,
  term: Terminal,
  fitAddon: FitAddon,
  onFit: (cols: number, rows: number) => void,
  maxAttempts = 12,
): () => void {
  let attempts = 0
  let cancelled = false
  let rafId = 0

  const tick = () => {
    if (cancelled) return
    attempts += 1
    const size = fitTerminalToContainer(container, term, fitAddon)
    if (size) {
      onFit(size.cols, size.rows)
      if (attempts < 3) {
        rafId = requestAnimationFrame(tick)
      }
      return
    }
    if (attempts < maxAttempts) {
      rafId = requestAnimationFrame(tick)
    }
  }

  rafId = requestAnimationFrame(tick)
  return () => {
    cancelled = true
    cancelAnimationFrame(rafId)
  }
}
