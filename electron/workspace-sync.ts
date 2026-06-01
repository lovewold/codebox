import fs from 'fs/promises'
import path from 'path'
import { upsertRepo } from './repo-registry.js'
import { getRepos, getSettings } from './store.js'
import {
  discoverGitReposInWorkspace,
  discoverLocalFoldersInWorkspace,
} from './workspace-scanner.js'

export interface WorkspaceSyncResult {
  added: number
  updated: number
  total: number
  paths: string[]
}

export async function syncWorkspaceRepos(): Promise<WorkspaceSyncResult> {
  const { workspaceRoot } = getSettings()
  await fs.mkdir(workspaceRoot, { recursive: true })

  const cloudPaths = await discoverGitReposInWorkspace(workspaceRoot)
  const localPaths = await discoverLocalFoldersInWorkspace(workspaceRoot)
  const paths = [...new Set([...cloudPaths, ...localPaths])]

  let added = 0
  let updated = 0

  const before = new Set(getRepos().map((r) => path.normalize(r.localPath)))

  for (const localPath of cloudPaths) {
    const norm = path.normalize(localPath)
    const isNew = !before.has(norm)
    await upsertRepo(localPath, { repoKind: 'cloud' })
    if (isNew) added += 1
    else updated += 1
  }

  for (const localPath of localPaths) {
    const norm = path.normalize(localPath)
    if (cloudPaths.some((p) => path.normalize(p) === norm)) continue
    const isNew = !before.has(norm)
    await upsertRepo(localPath, { repoKind: 'local' })
    if (isNew) added += 1
    else updated += 1
  }

  return { added, updated, total: paths.length, paths }
}
