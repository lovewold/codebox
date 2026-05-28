import { execFile } from 'child_process'
import { promisify } from 'util'
import type { GitBranch, GitCommit, GitStatusResult } from './types.js'

const execFileAsync = promisify(execFile)

export async function getEnhancedGitInfo(repoPath: string): Promise<{
  uncommittedFiles: string[]
  uncommittedCount: number
  aheadCount: number
  behindCount: number
  lastCommitMessage?: string
  lastCommitAuthor?: string
  lastCommitDate?: string
}> {
  try {
    const [statusResult, logResult] = await Promise.allSettled([
      execFileAsync('git', ['-C', repoPath, 'status', '--porcelain', '-b'], { timeout: 10000 }),
      execFileAsync('git', ['-C', repoPath, 'log', '-1', '--format=%s|||%an|||%aI'], { timeout: 8000 }),
    ])

    let aheadCount = 0
    let behindCount = 0
    const uncommittedFiles: string[] = []

    if (statusResult.status === 'fulfilled') {
      const lines = statusResult.value.stdout.split('\n').filter(Boolean)
      for (const line of lines) {
        if (line.startsWith('##')) {
          const am = line.match(/ahead (\d+)/)
          const bm = line.match(/behind (\d+)/)
          if (am) aheadCount = parseInt(am[1], 10)
          if (bm) behindCount = parseInt(bm[1], 10)
        } else {
          uncommittedFiles.push(line.slice(3).trim())
        }
      }
    }

    let lastCommitMessage: string | undefined
    let lastCommitAuthor: string | undefined
    let lastCommitDate: string | undefined
    if (logResult.status === 'fulfilled' && logResult.value.stdout.trim()) {
      const parts = logResult.value.stdout.trim().split('|||')
      lastCommitMessage = parts[0] || undefined
      lastCommitAuthor = parts[1] || undefined
      lastCommitDate = parts[2] || undefined
    }

    return {
      uncommittedFiles,
      uncommittedCount: uncommittedFiles.length,
      aheadCount,
      behindCount,
      lastCommitMessage,
      lastCommitAuthor,
      lastCommitDate,
    }
  } catch {
    return { uncommittedFiles: [], uncommittedCount: 0, aheadCount: 0, behindCount: 0 }
  }
}

export async function getGitStatus(repoPath: string): Promise<GitStatusResult> {
  const { stdout } = await execFileAsync(
    'git',
    ['-C', repoPath, 'status', '--porcelain', '-b'],
    { timeout: 10000 },
  )
  const lines = stdout.split('\n').filter(Boolean)
  let branch = ''
  let ahead = 0
  let behind = 0
  const staged: { path: string; status: string }[] = []
  const unstaged: { path: string; status: string }[] = []
  const untracked: { path: string; status: string }[] = []

  for (const line of lines) {
    if (line.startsWith('##')) {
      const bm = line.match(/## (.+?)(?:\.{3}|$)/)
      if (bm) branch = bm[1]
      const am = line.match(/ahead (\d+)/)
      const bem = line.match(/behind (\d+)/)
      if (am) ahead = parseInt(am[1], 10)
      if (bem) behind = parseInt(bem[1], 10)
      continue
    }
    const xy = line.slice(0, 2)
    const filepath = line.slice(3).trim()

    if (xy === '??') {
      untracked.push({ path: filepath, status: '?' })
    } else {
      const x = xy[0]
      const y = xy[1]
      if (x !== ' ' && x !== '?') {
        staged.push({ path: filepath, status: x })
      }
      if (y !== ' ' && y !== '?') {
        unstaged.push({ path: filepath, status: y })
      }
    }
  }

  return { branch, staged, unstaged, untracked, ahead, behind }
}

export async function getCommitLog(repoPath: string, count = 20): Promise<GitCommit[]> {
  const { stdout } = await execFileAsync(
    'git',
    ['-C', repoPath, 'log', `-${count}`, '--format=%H|||%s|||%an|||%aI'],
    { timeout: 10000 },
  )
  return stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash, message, author, date] = line.split('|||')
      return { hash: hash.slice(0, 7), message, author, date }
    })
}

export async function getBranches(repoPath: string): Promise<GitBranch[]> {
  const { stdout } = await execFileAsync(
    'git',
    ['-C', repoPath, 'branch', '-a', '--format=%(refname:short)|||%(HEAD)|||%(refname)'],
    { timeout: 8000 },
  )
  return stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [shortName, head, fullRef] = line.split('|||')
      const isRemote = fullRef.startsWith('refs/remotes/')
      return {
        name: isRemote ? shortName.replace(/^origin\//, '') : shortName,
        current: head === '*',
        remote: isRemote,
      }
    })
    .filter((b, i, arr) => {
      // Hide remote branch if a local branch with same name exists
      if (b.remote) {
        return !arr.some((x) => !x.remote && x.name === b.name)
      }
      return arr.findIndex((x) => x.name === b.name) === i
    })
}

export async function getDiffSummary(repoPath: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['-C', repoPath, 'diff', '--stat'],
      { timeout: 10000 },
    )
    return stdout.trim() || '没有变更'
  } catch {
    return '无法获取 diff'
  }
}

export async function stageFiles(
  repoPath: string,
  files: string[],
): Promise<{ ok: boolean; error?: string }> {
  try {
    await execFileAsync('git', ['-C', repoPath, 'add', '--', ...files], { timeout: 15000 })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function unstageFiles(
  repoPath: string,
  files: string[],
): Promise<{ ok: boolean; error?: string }> {
  try {
    await execFileAsync('git', ['-C', repoPath, 'reset', 'HEAD', '--', ...files], { timeout: 15000 })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function commit(
  repoPath: string,
  message: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await execFileAsync('git', ['-C', repoPath, 'commit', '-m', message], { timeout: 15000 })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function push(repoPath: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await execFileAsync('git', ['-C', repoPath, 'push'], { timeout: 60000 })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function pull(repoPath: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await execFileAsync('git', ['-C', repoPath, 'pull', '--ff-only'], { timeout: 60000 })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function switchBranch(
  repoPath: string,
  branch: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await execFileAsync('git', ['-C', repoPath, 'switch', branch], { timeout: 15000 })
    return { ok: true }
  } catch {
    // Branch might only exist on remote — find the actual remote ref
    let remoteRef: string | null = null
    try {
      const { stdout } = await execFileAsync(
        'git',
        ['-C', repoPath, 'for-each-ref', '--format=%(refname:short)', `refs/remotes/*/${branch}`],
        { timeout: 5000 },
      )
      const matches = stdout.trim().split('\n').filter(Boolean)
      if (matches.length > 0) {
        // Prefer origin if available, otherwise use the first match
        remoteRef = matches.find((r) => r.startsWith('origin/')) ?? matches[0]
      }
    } catch { /* ignore */ }

    if (remoteRef) {
      try {
        await execFileAsync('git', ['-C', repoPath, 'switch', '-c', branch, remoteRef], { timeout: 15000 })
        return { ok: true }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }

    return { ok: false, error: `未找到远程分支 "${branch}"` }
  }
}
