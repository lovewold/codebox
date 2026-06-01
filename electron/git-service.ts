import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'

const execFileAsync = promisify(execFile)

export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const trimmed = url.trim()
  const patterns = [
    /^https?:\/\/github\.com\/([^/]+)\/([^/.]+)/i,
    /^git@github\.com:([^/]+)\/([^/.]+)(\.git)?$/i,
    /^github\.com\/([^/]+)\/([^/.]+)/i,
  ]
  for (const re of patterns) {
    const m = trimmed.match(re)
    if (m) return { owner: m[1], repo: m[2].replace(/\.git$/, '') }
  }
  return null
}

export async function cloneRepository(
  url: string,
  targetDir: string,
): Promise<string> {
  await fs.mkdir(targetDir, { recursive: true })
  const parsed = parseGitHubUrl(url)
  const cloneUrl = parsed
    ? `https://github.com/${parsed.owner}/${parsed.repo}.git`
    : url.trim()

  let dest = targetDir
  if (parsed) {
    dest = path.join(targetDir, parsed.owner, parsed.repo)
    try {
      await fs.access(dest)
      await execFileAsync('git', ['-C', dest, 'pull', '--ff-only'], {
        timeout: 120000,
      })
      return dest
    } catch {
      /* clone fresh */
    }
    await fs.mkdir(path.dirname(dest), { recursive: true })
  }

  await execFileAsync('git', ['clone', '--depth', '1', cloneUrl, dest], {
    timeout: 300000,
  })
  return dest
}

export async function isGitRepository(dir: string): Promise<boolean> {
  try {
    await execFileAsync('git', ['-C', dir, 'rev-parse', '--is-inside-work-tree'], {
      timeout: 5000,
    })
    return true
  } catch {
    return false
  }
}

export async function initGitRepository(dir: string): Promise<void> {
  await execFileAsync('git', ['init'], { cwd: dir, timeout: 15000 })
}
