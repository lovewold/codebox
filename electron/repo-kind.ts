import { isGitRepository } from './git-service.js'
import type { RepoKind, RepoRecord } from './types.js'

export function inferRepoKind(
  localPath: string,
  isGit: boolean,
  remoteUrl?: string,
  existing?: RepoRecord,
): RepoKind {
  if (existing?.repoKind) return existing.repoKind
  if (remoteUrl || isGit) return 'cloud'
  return 'local'
}

export async function resolveRepoKind(
  localPath: string,
  remoteUrl?: string,
  existing?: RepoRecord,
  override?: RepoKind,
): Promise<RepoKind> {
  if (override) return override
  const isGit = await isGitRepository(localPath)
  return inferRepoKind(localPath, isGit, remoteUrl, existing)
}

export function migrateRepoKind(r: RepoRecord): RepoKind {
  if (r.repoKind === 'local' || r.repoKind === 'cloud') return r.repoKind
  if (r.remoteUrl || r.gitBranch) return 'cloud'
  return 'local'
}
