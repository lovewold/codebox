import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import type { BrowserWindow } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { spawn as spawnPty, type IPty } from 'node-pty'

export interface TerminalInstance {
  pty: IPty
  repoPath: string
  pid: number
}

function killProcessTree(pid: number): void {
  if (!pid || pid <= 0) return
  if (process.platform === 'win32') {
    try {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' })
    } catch {
      // process may already be gone
    }
  } else {
    try {
      process.kill(-pid, 'SIGTERM')
    } catch {
      try {
        process.kill(pid, 'SIGKILL')
      } catch {
        // ignore
      }
    }
  }
}

/** node-pty 传入 env 会整表替换子进程环境，必须继承 Electron 侧完整变量（含 npm 全局、API Key 等） */
function buildPtyEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (value != null && value !== '') env[key] = value
  }

  // 从 GUI 启动 Electron 时 PATH 可能缺 npm 全局目录，补上常见路径
  if (process.platform === 'win32') {
    const extra: string[] = []
    const appData = env.APPDATA || process.env.APPDATA
    const localAppData = env.LOCALAPPDATA || process.env.LOCALAPPDATA
    if (appData) extra.push(path.join(appData, 'npm'))
    if (localAppData) {
      extra.push(path.join(localAppData, 'Programs', 'Microsoft VS Code', 'bin'))
      const nvmHome = env.NVM_HOME || process.env.NVM_HOME
      if (nvmHome) extra.push(path.join(nvmHome, 'nodejs'))
    }
    const pathKey = 'Path' in env ? 'Path' : 'PATH'
    const current = env[pathKey] || ''
    const merged = [...extra, ...current.split(path.delimiter)]
      .filter(Boolean)
      .filter((p, i, arr) => arr.indexOf(p) === i)
    env[pathKey] = merged.join(path.delimiter)
  }

  env.TERM = 'xterm-256color'
  env.COLORTERM = 'truecolor'
  return env
}

class TerminalManager {
  private terminals = new Map<string, TerminalInstance>()
  private window: BrowserWindow | null = null

  setWindow(win: BrowserWindow) {
    this.window = win
  }

  private findSessionByRepo(repoPath: string): string | null {
    const normalized = repoPath.trim()
    for (const [id, inst] of this.terminals) {
      if (inst.repoPath === normalized) return id
    }
    return null
  }

  create(repoPath: string): string {
    const normalized = repoPath.trim()
    if (!normalized || !fs.existsSync(normalized)) {
      throw new Error(`工作目录不存在: ${normalized || repoPath}`)
    }

    const existing = this.findSessionByRepo(normalized)
    if (existing) return existing

    const isWin = process.platform === 'win32'
    const shell = isWin
      ? (process.env.COMSPEC || 'C:\\Windows\\System32\\cmd.exe')
      : (process.env.SHELL || '/bin/bash')
    const args = isWin ? [] : ['-l']
    const env = buildPtyEnv()

    // WinPTY 比 ConPTY 在 Electron 里更稳定，避免「一直连接中」
    const pty = spawnPty(shell, args, {
      cwd: normalized,
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      env,
      ...(isWin ? { useConpty: false } : {}),
    })

    const sessionId = uuidv4()
    const pid = pty.pid ?? 0
    this.terminals.set(sessionId, { pty, repoPath: normalized, pid })

    pty.onData((data: string) => {
      this.window?.webContents.send('terminal:data', { id: sessionId, data })
    })

    pty.onExit(({ exitCode, signal }: { exitCode: number; signal: number }) => {
      this.window?.webContents.send('terminal:exit', { id: sessionId, exitCode, signal })
      const inst = this.terminals.get(sessionId)
      if (inst?.pid) killProcessTree(inst.pid)
      this.terminals.delete(sessionId)
    })

    return sessionId
  }

  write(sessionId: string, data: string): void {
    const inst = this.terminals.get(sessionId)
    if (!inst) return
    try {
      inst.pty.write(data)
    } catch {
      // PTY may already be closed
    }
  }

  resize(sessionId: string, cols: number, rows: number): void {
    const inst = this.terminals.get(sessionId)
    if (!inst) return
    if (!Number.isFinite(cols) || !Number.isFinite(rows) || cols < 2 || rows < 2) return
    try {
      inst.pty.resize(cols, rows)
    } catch {
      // ignore
    }
  }

  destroy(sessionId: string): void {
    const inst = this.terminals.get(sessionId)
    if (!inst) return
    const { pid } = inst
    try {
      inst.pty.kill()
    } catch {
      // already dead
    }
    killProcessTree(pid)
    this.terminals.delete(sessionId)
  }

  destroyByRepoPath(repoPath: string): void {
    const normalized = repoPath.trim()
    for (const [id, inst] of this.terminals) {
      if (inst.repoPath === normalized) {
        this.destroy(id)
      }
    }
  }

  destroyAll(): void {
    for (const id of [...this.terminals.keys()]) {
      this.destroy(id)
    }
  }
}

export const terminalManager = new TerminalManager()
