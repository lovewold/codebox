import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { DEFAULT_REPO_CATEGORY_ID, migrateRepoCategoryIds } from './categories-default.js'
import { resolveRepoKind } from './repo-kind.js'
import { scanRepository } from './repo-scanner.js'
import { getRepos, setRepos } from './store.js'
import type { RepoKind, RepoRecord } from './types.js'

export interface UpsertRepoOptions {
  repoKind?: RepoKind
  remoteUrl?: string
}

export async function upsertRepo(
  localPath: string,
  remoteUrlOrOptions?: string | UpsertRepoOptions,
  options?: UpsertRepoOptions,
): Promise<RepoRecord> {
  let remoteUrl: string | undefined
  let repoKindOverride: RepoKind | undefined

  if (typeof remoteUrlOrOptions === 'string') {
    remoteUrl = remoteUrlOrOptions
    repoKindOverride = options?.repoKind
  } else if (remoteUrlOrOptions) {
    remoteUrl = remoteUrlOrOptions.remoteUrl
    repoKindOverride = remoteUrlOrOptions.repoKind
  }

  const normalized = path.normalize(localPath)
  const repos = getRepos()
  const existing = repos.find((r) => path.normalize(r.localPath) === normalized)

  const scan = await scanRepository(normalized)
  const name = path.basename(normalized)
  const repoKind = await resolveRepoKind(
    normalized,
    remoteUrl ?? scan.remoteUrl ?? existing?.remoteUrl,
    existing,
    repoKindOverride,
  )

  const record: RepoRecord = {
    id: existing?.id ?? uuidv4(),
    name,
    localPath: normalized,
    repoKind,
    remoteUrl: scan.remoteUrl ?? remoteUrl ?? existing?.remoteUrl,
    description: scan.description ?? existing?.description,
    language: scan.language ?? existing?.language,
    categoryIds: existing
      ? migrateRepoCategoryIds(existing.categoryIds)
      : [DEFAULT_REPO_CATEGORY_ID],
    starred: existing?.starred ?? false,
    lastOpenedAt: existing?.lastOpenedAt ?? new Date().toISOString(),
    addedAt: existing?.addedAt ?? new Date().toISOString(),
    readmeExcerpt: scan.readmeExcerpt,
    hasReadme: scan.hasReadme,
    gitBranch: scan.gitBranch,
    gitDirty: scan.gitDirty,
  }

  const next = existing
    ? repos.map((r) => (r.id === record.id ? record : r))
    : [...repos, record]
  setRepos(next)
  return record
}
