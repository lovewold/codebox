import fs from 'fs/promises'
import path from 'path'

/** 英文 / 主 README 候选（按优先级） */
export const PRIMARY_README_NAMES = [
  'README.md',
  'readme.md',
  'Readme.md',
  'README.MD',
  'README',
]

/** 仓库内常见的中文 README 文件名（按优先级） */
export const CHINESE_README_NAMES = [
  'README-CN.md',
  'README_CN.md',
  'readme-cn.md',
  'readme_cn.md',
  'README.zh-CN.md',
  'README.zh.md',
  'README_ZH.md',
  'README_zh.md',
  'Readme-CN.md',
  'Readme_CN.md',
]

const CHINESE_README_RE =
  /^readme([-._\s]?(zh|cn)|[-.]zh[-.]?cn|[-._]zh|[-._]cn)([-.]?(md|markdown))?$/i

export function isChineseReadmeFileName(fileName: string): boolean {
  const lower = fileName.toLowerCase()
  if (lower === 'readme.md' || lower === 'readme') return false
  if (CHINESE_README_NAMES.some((n) => n.toLowerCase() === lower)) return true
  return CHINESE_README_RE.test(fileName)
}

export function isPrimaryReadmeFileName(fileName: string): boolean {
  if (isChineseReadmeFileName(fileName)) return false
  return PRIMARY_README_NAMES.some((n) => n.toLowerCase() === fileName.toLowerCase())
}

export async function findPrimaryReadme(repoPath: string): Promise<string | null> {
  for (const name of PRIMARY_README_NAMES) {
    const p = path.join(repoPath, name)
    try {
      await fs.access(p)
      return p
    } catch {
      /* continue */
    }
  }
  try {
    const entries = await fs.readdir(repoPath, { withFileTypes: true })
    for (const e of entries) {
      if (!e.isFile()) continue
      if (isPrimaryReadmeFileName(e.name)) {
        return path.join(repoPath, e.name)
      }
    }
  } catch {
    /* ignore */
  }
  return null
}

export async function findChineseReadme(
  repoPath: string,
): Promise<{ path: string; fileName: string } | null> {
  for (const name of CHINESE_README_NAMES) {
    const p = path.join(repoPath, name)
    try {
      await fs.access(p)
      return { path: p, fileName: name }
    } catch {
      /* continue */
    }
  }
  try {
    const entries = await fs.readdir(repoPath, { withFileTypes: true })
    const candidates = entries
      .filter((e) => e.isFile() && isChineseReadmeFileName(e.name))
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b))
    if (candidates.length > 0) {
      const fileName = candidates[0]
      return { path: path.join(repoPath, fileName), fileName }
    }
  } catch {
    /* ignore */
  }
  return null
}

/** 翻译结果写入：若已有中文版文件则覆盖该文件，否则默认 README-CN.md */
export async function resolveChineseReadmeWritePath(repoPath: string): Promise<string> {
  const existing = await findChineseReadme(repoPath)
  if (existing) return existing.path
  return path.join(repoPath, 'README-CN.md')
}
