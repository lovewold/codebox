import fs from 'fs/promises'
import path from 'path'
import { execFile, spawn } from 'child_process'
import { promisify } from 'util'
import type { LauncherId } from './types.js'

const execFileAsync = promisify(execFile)

export interface LaunchOptions {
  repoPath?: string
  url?: string
  remoteUrl?: string
}

export interface LaunchResult {
  ok: boolean
  error?: string
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

function expandEnv(p: string): string {
  return p.replace(/%([^%]+)%/g, (_, key) => process.env[key] ?? '')
}

const WINDOWS_CURSOR_CANDIDATES = [
  '%LOCALAPPDATA%\\Programs\\cursor\\Cursor.exe',
  '%LOCALAPPDATA%\\cursor\\Cursor.exe',
]

const WINDOWS_EDGE_CANDIDATES = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
]

const WINDOWS_CODEX_CANDIDATES = [
  '%APPDATA%\\npm\\codex.cmd',
  '%LOCALAPPDATA%\\Programs\\codex\\Codex.exe',
  '%LOCALAPPDATA%\\codex\\Codex.exe',
]

async function whereOnPath(name: string): Promise<string | null> {
  if (process.platform !== 'win32') return null
  try {
    const { stdout } = await execFileAsync('where.exe', [name], { timeout: 5000 })
    const line = stdout
      .toString()
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find(Boolean)
    if (line && (await fileExists(line))) return line
  } catch {
    /* not in PATH */
  }
  return null
}

async function firstExisting(candidates: string[]): Promise<string | null> {
  for (const raw of candidates) {
    const p = path.normalize(expandEnv(raw))
    if (await fileExists(p)) return p
  }
  return null
}

export async function detectLauncherDefaults(): Promise<Partial<Record<LauncherId, string>>> {
  const out: Partial<Record<LauncherId, string>> = {}
  if (process.platform !== 'win32') return out

  out.cursor =
    (await firstExisting(WINDOWS_CURSOR_CANDIDATES)) ??
    (await whereOnPath('cursor')) ??
    undefined

  out.edge = (await firstExisting(WINDOWS_EDGE_CANDIDATES)) ?? undefined

  out.codex =
    (await firstExisting(WINDOWS_CODEX_CANDIDATES)) ??
    (await whereOnPath('codex.cmd')) ??
    (await whereOnPath('codex')) ??
    undefined

  return out
}

async function resolveExecutable(
  id: LauncherId,
  customPaths: Partial<Record<LauncherId, string>> = {},
): Promise<string | null> {
  const custom = customPaths[id]?.trim()
  if (custom && (await fileExists(custom))) return path.normalize(custom)

  const defaults = await detectLauncherDefaults()
  return defaults[id] ?? null
}

function githubWebUrl(remoteUrl?: string): string | null {
  if (!remoteUrl?.trim()) return null
  let u = remoteUrl.trim()
  if (u.startsWith('git@')) {
    u = u.replace(/^git@github\.com:/, 'https://github.com/').replace(/\.git$/, '')
  } else {
    u = u.replace(/\.git$/, '')
  }
  if (u.startsWith('http://') || u.startsWith('https://')) return u
  return null
}

function quoteArg(arg: string): string {
  return arg.includes(' ') || arg.includes('"') ? `"${arg.replace(/"/g, '\\"')}"` : arg
}

function spawnDetached(command: string, args: string[], cwd?: string): LaunchResult {
  try {
    const child = spawn(command, args, {
      cwd: cwd && cwd.length > 0 ? cwd : undefined,
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    })
    child.unref()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

function spawnWindowsGui(title: string, exe: string, args: string[], cwd?: string): LaunchResult {
  const cmdLine = [quoteArg(exe), ...args.map(quoteArg)].join(' ')
  return spawnDetached('cmd.exe', ['/c', 'start', title, cmdLine], cwd)
}

export async function launchExternalApp(
  id: LauncherId,
  customPaths: Partial<Record<LauncherId, string>> = {},
  options: LaunchOptions = {},
): Promise<LaunchResult> {
  const exe = await resolveExecutable(id, customPaths)
  if (!exe) {
    const labels: Record<LauncherId, string> = {
      codex: 'Codex',
      cursor: 'Cursor',
      edge: 'Microsoft Edge',
    }
    return {
      ok: false,
      error: `未找到 ${labels[id]}，请在设置 → 通用 → 外部启动项中配置路径`,
    }
  }

  const repoPath = options.repoPath?.trim()
  const cwd = repoPath && (await fileExists(repoPath)) ? repoPath : undefined

  if (id === 'cursor') {
    const args = cwd ? [cwd] : []
    if (process.platform === 'win32') {
      return spawnWindowsGui('Cursor', exe, args, cwd)
    }
    return spawnDetached(exe, args, cwd)
  }

  if (id === 'edge') {
    const url =
      options.url?.trim() ||
      githubWebUrl(options.remoteUrl) ||
      'https://www.bing.com'
    if (process.platform === 'win32') {
      return spawnWindowsGui('Edge', exe, [url])
    }
    return spawnDetached(exe, [url])
  }

  if (id === 'codex') {
    const ext = path.extname(exe).toLowerCase()
    if (process.platform === 'win32') {
      if (ext === '.cmd' || ext === '.bat') {
        if (cwd) {
          return spawnDetached('cmd.exe', ['/c', 'start', 'Codex', 'cmd.exe', '/k', `cd /d ${quoteArg(cwd)} && ${quoteArg(exe)}`])
        }
        return spawnWindowsGui('Codex', exe, [])
      }
      return spawnWindowsGui('Codex', exe, cwd ? [cwd] : [], cwd)
    }
    return spawnDetached(exe, cwd ? [cwd] : [], cwd)
  }

  return { ok: false, error: '未知启动项' }
}
