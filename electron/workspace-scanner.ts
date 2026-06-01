import fs from 'fs/promises'
import path from 'path'
import { isGitRepository } from './git-service.js'

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'release',
  'build',
  '.vscode',
  '.cursor',
  '.claude',
  'win-unpacked',
  '__pycache__',
  '.next',
  'vendor',
])

/**
 * 扫描工作区内的 Git 仓库（支持扁平目录与 owner/repo 嵌套）。
 */
export async function discoverGitReposInWorkspace(
  workspaceRoot: string,
  maxDepth = 4,
): Promise<string[]> {
  const root = path.normalize(workspaceRoot.trim())
  const found = new Set<string>()

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > maxDepth) return

    let stat
    try {
      stat = await fs.stat(dir)
    } catch {
      return
    }
    if (!stat.isDirectory()) return

    if (await isGitRepository(dir)) {
      found.add(path.normalize(dir))
      return
    }

    let entries
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const name = entry.name
      if (SKIP_DIRS.has(name)) continue
      if (name.startsWith('.')) continue
      await walk(path.join(dir, name), depth + 1)
    }
  }

  try {
    await fs.access(root)
  } catch {
    return []
  }

  await walk(root, 0)
  return [...found].sort((a, b) => a.localeCompare(b))
}

/**
 * 扫描工作区顶层非 Git 项目文件夹（本地仓库）。
 * 跳过仅作为嵌套 Git 仓库容器的目录（如 owner/）。
 */
export async function discoverLocalFoldersInWorkspace(workspaceRoot: string): Promise<string[]> {
  const root = path.normalize(workspaceRoot.trim())

  try {
    await fs.access(root)
  } catch {
    return []
  }

  const gitPaths = new Set(await discoverGitReposInWorkspace(root, 4))

  let entries
  try {
    entries = await fs.readdir(root, { withFileTypes: true })
  } catch {
    return []
  }

  const found: string[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const name = entry.name
    if (SKIP_DIRS.has(name) || name.startsWith('.')) continue

    const dir = path.normalize(path.join(root, name))
    if (gitPaths.has(dir)) continue
    if (await isGitRepository(dir)) continue

    const hasGitDescendant = [...gitPaths].some((g) => g.startsWith(dir + path.sep))
    if (hasGitDescendant) continue

    found.push(dir)
  }

  return found.sort((a, b) => a.localeCompare(b))
}
