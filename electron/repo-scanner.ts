import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { execFile } from 'child_process'
import { promisify } from 'util'
import type { RepoScanResult } from './types.js'
import { getEnhancedGitInfo } from './git-commands.js'
import { getTranslationCache } from './store.js'
import {
  findChineseReadme,
  findPrimaryReadme,
  resolveChineseReadmeWritePath,
} from './readme-files.js'

const execFileAsync = promisify(execFile)

const LANG_MAP: Record<string, string> = {
  'package.json': 'JavaScript',
  'pnpm-lock.yaml': 'JavaScript',
  'yarn.lock': 'JavaScript',
  'tsconfig.json': 'TypeScript',
  'pyproject.toml': 'Python',
  'requirements.txt': 'Python',
  'Cargo.toml': 'Rust',
  'go.mod': 'Go',
  'pom.xml': 'Java',
  'build.gradle': 'Java',
  'Gemfile': 'Ruby',
  'composer.json': 'PHP',
}

function excerptFromMarkdown(content: string, maxLen = 200): string {
  const plain = content
    .replace(/^---[\s\S]*?---\n/m, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`>#-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length > maxLen ? `${plain.slice(0, maxLen)}…` : plain
}

function descriptionFromPackage(pkg: Record<string, unknown>): string | undefined {
  const desc = pkg.description
  return typeof desc === 'string' && desc.trim() ? desc.trim() : undefined
}

async function detectLanguage(repoPath: string): Promise<string | undefined> {
  for (const [file, lang] of Object.entries(LANG_MAP)) {
    try {
      await fs.access(path.join(repoPath, file))
      return lang
    } catch {
      /* continue */
    }
  }
  return undefined
}

async function gitInfo(repoPath: string): Promise<{
  branch?: string
  dirty?: boolean
  remoteUrl?: string
  uncommittedFiles?: string[]
  uncommittedCount?: number
  aheadCount?: number
  behindCount?: number
  lastCommitMessage?: string
  lastCommitAuthor?: string
  lastCommitDate?: string
}> {
  try {
    const { stdout: branchOut } = await execFileAsync(
      'git',
      ['-C', repoPath, 'rev-parse', '--abbrev-ref', 'HEAD'],
      { timeout: 8000 },
    )
    const branch = branchOut.trim() || undefined

    let remoteUrl: string | undefined
    try {
      const { stdout: remoteOut } = await execFileAsync(
        'git',
        ['-C', repoPath, 'remote', 'get-url', 'origin'],
        { timeout: 5000 },
      )
      remoteUrl = remoteOut.trim() || undefined
    } catch {
      /* no remote */
    }

    const enhanced = await getEnhancedGitInfo(repoPath)

    return {
      branch,
      dirty: enhanced.uncommittedCount > 0,
      remoteUrl,
      ...enhanced,
    }
  } catch {
    return {}
  }
}

export async function scanRepository(repoPath: string): Promise<RepoScanResult> {
  const result: RepoScanResult = { hasReadme: false }

  try {
    const pkgPath = path.join(repoPath, 'package.json')
    const raw = await fs.readFile(pkgPath, 'utf-8')
    const pkg = JSON.parse(raw) as Record<string, unknown>
    result.description = descriptionFromPackage(pkg)
    result.language = 'JavaScript'
  } catch {
    result.language = await detectLanguage(repoPath)
  }

  const readmePath = await findPrimaryReadme(repoPath)
  if (readmePath) {
    result.hasReadme = true
    const content = await fs.readFile(readmePath, 'utf-8')
    result.readmeContent = content
    result.readmeExcerpt = excerptFromMarkdown(content)
    if (!result.description) {
      result.description = excerptFromMarkdown(content, 120)
    }
  }

  const git = await gitInfo(repoPath)
  result.gitBranch = git.branch
  result.gitDirty = git.dirty
  result.remoteUrl = git.remoteUrl
  result.uncommittedFiles = git.uncommittedFiles
  result.uncommittedCount = git.uncommittedCount
  result.aheadCount = git.aheadCount
  result.behindCount = git.behindCount
  result.lastCommitMessage = git.lastCommitMessage
  result.lastCommitAuthor = git.lastCommitAuthor
  result.lastCommitDate = git.lastCommitDate

  return result
}

export interface ReadmeResult {
  original: string | null
  chinese: string | null
  /** 实际读取到的中文版文件名，如 README_CN.md */
  chineseFileName?: string | null
}

export async function readReadme(repoPath: string): Promise<ReadmeResult> {
  const readmePath = await findPrimaryReadme(repoPath)
  const original = readmePath ? await fs.readFile(readmePath, 'utf-8') : null

  let chinese: string | null = null
  let chineseFileName: string | null = null

  const cn = await findChineseReadme(repoPath)
  if (cn) {
    chinese = await fs.readFile(cn.path, 'utf-8')
    chineseFileName = cn.fileName
  } else if (original) {
    const hash = crypto.createHash('md5').update(original).digest('hex')
    const cached = getTranslationCache(repoPath)
    if (cached && cached.hash === hash) {
      chinese = cached.translated
      chineseFileName = 'README-CN.md'
    }
  }

  return { original, chinese, chineseFileName }
}

export async function writeReadmeCN(repoPath: string, content: string): Promise<string> {
  const target = await resolveChineseReadmeWritePath(repoPath)
  await fs.writeFile(target, content, 'utf-8')
  return path.basename(target)
}
