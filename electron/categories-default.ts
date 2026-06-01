import type { Category } from './types.js'

/** 默认分类：顶层「个人 / 工作」，其余为二、三级 */
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-personal', name: '个人', color: '#58a6ff', parentId: null },
  { id: 'cat-work', name: '工作', color: '#3fb950', parentId: null },
  { id: 'cat-skill', name: 'Skill', color: '#58a6ff', parentId: 'cat-personal' },
  { id: 'cat-skill-cli', name: 'CLI 工具', color: '#58a6ff', parentId: 'cat-skill' },
  { id: 'cat-skill-auto', name: '自动化', color: '#58a6ff', parentId: 'cat-skill' },
  { id: 'cat-learn', name: '学习参考', color: '#d29922', parentId: 'cat-personal' },
  { id: 'cat-agent', name: 'AI Agent', color: '#3fb950', parentId: 'cat-work' },
  { id: 'cat-agent-chat', name: '对话助手', color: '#3fb950', parentId: 'cat-agent' },
  { id: 'cat-agent-flow', name: '工作流', color: '#3fb950', parentId: 'cat-agent' },
  { id: 'cat-tools', name: '工具库', color: '#bc8cff', parentId: 'cat-work' },
]

export const DEFAULT_REPO_CATEGORY_ID = 'cat-personal'

const LEGACY_ROOT_PARENT: Record<string, string> = {
  'cat-skill': 'cat-personal',
  'cat-learn': 'cat-personal',
  'cat-agent': 'cat-work',
  'cat-tools': 'cat-work',
}

export function migrateCategories(existing: Category[]): Category[] {
  const byId = new Map(existing.map((c) => [c.id, { ...c, parentId: c.parentId ?? null }]))

  for (const def of DEFAULT_CATEGORIES) {
    if (!byId.has(def.id)) {
      byId.set(def.id, { ...def })
    }
  }

  for (const [id, parentId] of Object.entries(LEGACY_ROOT_PARENT)) {
    const cat = byId.get(id)
    if (cat && cat.parentId === null) {
      byId.set(id, { ...cat, parentId })
    }
  }

  // 旧版「未分类」降为个人下的二级（若用户仍在使用）
  const unc = byId.get('uncategorized')
  if (unc && unc.parentId === null) {
    byId.set('uncategorized', { ...unc, name: unc.name || '未分类', parentId: 'cat-personal' })
  }

  return DEFAULT_CATEGORIES.map((def) => byId.get(def.id) ?? def).concat(
    [...byId.values()].filter((c) => !DEFAULT_CATEGORIES.some((d) => d.id === c.id)),
  )
}

export function migrateRepoCategoryIds(categoryIds: string[] | undefined): string[] {
  const ids = (categoryIds ?? [])
    .map((id) => (id === 'uncategorized' ? DEFAULT_REPO_CATEGORY_ID : id))
    .filter((id, i, arr) => arr.indexOf(id) === i)
  return ids.length > 0 ? ids : [DEFAULT_REPO_CATEGORY_ID]
}
