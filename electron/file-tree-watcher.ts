import fs from 'fs'
import path from 'path'
import type { BrowserWindow } from 'electron'

function normKey(repoPath: string): string {
  return path.normalize(repoPath.trim()).toLowerCase()
}

class FileTreeWatcherManager {
  private refs = new Map<string, number>()
  private watchers = new Map<string, fs.FSWatcher>()
  private timers = new Map<string, NodeJS.Timeout>()
  private paths = new Map<string, string>()
  private window: BrowserWindow | null = null

  setWindow(win: BrowserWindow | null) {
    this.window = win
  }

  watch(repoPath: string): void {
    const trimmed = repoPath.trim()
    if (!trimmed) return
    const key = normKey(trimmed)
    const next = (this.refs.get(key) ?? 0) + 1
    this.refs.set(key, next)
    if (next > 1) return

    this.paths.set(key, trimmed)
    try {
      const watcher = fs.watch(trimmed, { recursive: true }, () => {
        this.scheduleNotify(trimmed)
      })
      watcher.on('error', () => {
        this.stopWatching(key)
      })
      this.watchers.set(key, watcher)
    } catch {
      this.refs.delete(key)
      this.paths.delete(key)
    }
  }

  unwatch(repoPath: string): void {
    const trimmed = repoPath.trim()
    if (!trimmed) return
    const key = normKey(trimmed)
    const next = (this.refs.get(key) ?? 0) - 1
    if (next <= 0) {
      this.stopWatching(key)
    } else {
      this.refs.set(key, next)
    }
  }

  private stopWatching(key: string): void {
    this.refs.delete(key)
    this.paths.delete(key)
    const timer = this.timers.get(key)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(key)
    }
    const watcher = this.watchers.get(key)
    if (watcher) {
      try {
        watcher.close()
      } catch {
        // ignore
      }
      this.watchers.delete(key)
    }
  }

  private scheduleNotify(repoPath: string): void {
    const key = normKey(repoPath)
    const existing = this.timers.get(key)
    if (existing) clearTimeout(existing)
    this.timers.set(
      key,
      setTimeout(() => {
        this.timers.delete(key)
        this.window?.webContents.send('repos:files-changed', { repoPath })
      }, 350),
    )
  }
}

export const fileTreeWatcher = new FileTreeWatcherManager()
