import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import { Cloud, FolderGit2, FolderOpen, GripVertical, Star, Tag } from 'lucide-react'
import type { Category, RepoKind, RepoRecord } from '../types'
import T from '../i18n'

interface Props {
  repo: RepoRecord
  categories: Category[]
  selected: boolean
  viewMode: 'grid' | 'list' | 'compact'
  onSelect: () => void
  onToggleStar: () => void
  onToggleCategory: (categoryId: string) => void
}

function getCats(categories: Category[], ids: string[] | undefined) {
  const safeIds = ids ?? []
  return categories.filter((c) => safeIds.includes(c.id))
}

function RepoKindBadge({ kind }: { kind: RepoKind }) {
  const isCloud = kind === 'cloud'
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] ${
        isCloud ? 'bg-accent-subtle text-accent-fg' : 'bg-bg-inset text-fg-muted'
      }`}
    >
      {isCloud ? <Cloud className="h-3 w-3" /> : <FolderOpen className="h-3 w-3" />}
      {isCloud ? T.repoKindCloud : T.repoKindLocal}
    </span>
  )
}

export function RepoCard({
  repo,
  categories,
  selected,
  viewMode,
  onSelect,
  onToggleStar,
  onToggleCategory,
}: Props) {
  const cats = getCats(categories, repo.categoryIds)
  const cardRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('application/repo-id', repo.id)
    e.dataTransfer.effectAllowed = 'link'

    // Calculate shrink origin: angle from card center to cursor
    const card = cardRef.current
    if (card) {
      const rect = card.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = e.clientX - cx
      const dy = e.clientY - cy
      // Normalize to -1..1 range relative to card dimensions
      const ox = 50 + (dx / (rect.width / 2)) * 50
      const oy = 50 + (dy / (rect.height / 2)) * 50
      card.style.setProperty('--shrink-x', `${ox}%`)
      card.style.setProperty('--shrink-y', `${oy}%`)
    }

    // Create a small dot as drag image
    const dot = document.createElement('div')
    dot.style.cssText = `
      width: 24px; height: 24px;
      border-radius: 50%;
      background: var(--accent-fg, #58a6ff);
      box-shadow: 0 4px 16px rgba(88,166,255,0.5), 0 0 0 6px rgba(88,166,255,0.15);
      position: fixed; top: -100px; left: -100px;
      pointer-events: none;
    `
    document.body.appendChild(dot)
    e.dataTransfer.setDragImage(dot, 12, 12)
    requestAnimationFrame(() => document.body.removeChild(dot))

    setDragging(true)
  }, [repo.id])

  const handleDragEnd = useCallback(() => {
    setDragging(false)
  }, [])

  if (viewMode === 'compact') {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition ${
          selected
            ? 'bg-accent-subtle text-fg-default'
            : 'hover:bg-bg-inset'
        }`}
      >
        <FolderGit2 className="h-4 w-4 shrink-0 text-fg-muted" />
        <span className="min-w-0 flex-1 truncate font-medium">{repo.name}</span>
        {repo.gitDirty && (
          <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--attention-fg)]" title={T.hasUncommitted} />
        )}
        {repo.aheadCount ? <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--success-fg)]" title={T.ahead(repo.aheadCount)} /> : null}
        {repo.behindCount ? <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--attention-fg)]" title={T.behind(repo.behindCount)} /> : null}
      </button>
    )
  }

  if (viewMode === 'list') {
    return (
      <div
        ref={cardRef}
        draggable={true}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={onSelect}
        className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left select-none cursor-grab group shrink-card ${
          dragging ? 'is-dragging' : ''
        } ${
          selected
            ? 'border-accent-fg bg-accent-subtle'
            : 'border-border-default bg-bg-subtle hover:border-border-default'
        }`}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bg-inset">
          <FolderGit2 className="h-5 w-5 text-accent-fg" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-fg-default">{repo.name}</h3>
            <RepoKindBadge kind={repo.repoKind ?? 'local'} />
            {repo.language && (
              <span className="shrink-0 rounded bg-bg-inset px-2 py-0.5 text-xs text-fg-muted">
                {repo.language}
              </span>
            )}
            {repo.repoKind === 'cloud' && repo.gitBranch && (
              <span className="shrink-0 text-xs text-fg-muted">{repo.gitBranch}</span>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-fg-muted">
            {repo.description || repo.readmeExcerpt || T.noDescription}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <CategoryLabel
              cats={cats}
              categories={categories}
              repoCategoryIds={repo.categoryIds}
              onToggleCategory={onToggleCategory}
            />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="cursor-grab text-fg-subtle opacity-0 group-hover:opacity-100 transition" title="拖拽到分类">
            <GripVertical className="h-4 w-4" />
          </span>
          <StarButton starred={repo.starred} onToggle={onToggleStar} />
        </div>
      </div>
    )
  }

  // grid
  return (
    <div
      ref={cardRef}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={onSelect}
      className={`flex h-full flex-col rounded-xl border p-4 text-left cursor-pointer group shrink-card ${
        dragging ? 'is-dragging' : ''
      } ${
        selected
          ? 'border-accent-fg bg-accent-subtle ring-1 ring-accent-fg'
          : 'border-border-default bg-bg-subtle hover:border-border-default'
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-bg-inset">
          <FolderGit2 className="h-6 w-6 text-accent-fg" />
        </div>
        <div className="flex items-center gap-1">
          <span className="cursor-grab text-fg-subtle opacity-0 group-hover:opacity-100 transition" title="拖拽到分类">
            <GripVertical className="h-4 w-4" />
          </span>
          <StarButton starred={repo.starred} onToggle={onToggleStar} />
        </div>
      </div>
      <div className="mb-1 flex items-center gap-2">
        <h3 className="min-w-0 truncate text-base font-semibold text-fg-default">{repo.name}</h3>
        <RepoKindBadge kind={repo.repoKind ?? 'local'} />
      </div>
      <p className="mb-3 line-clamp-3 flex-1 text-sm leading-relaxed text-fg-muted">
        {repo.description || repo.readmeExcerpt || T.noReadmeExcerpt}
      </p>
      <div className="mt-auto flex flex-wrap items-center gap-2">
        {repo.language && (
          <span className="rounded bg-bg-inset px-2 py-0.5 text-xs text-fg-muted">
            {repo.language}
          </span>
        )}
        {repo.repoKind === 'cloud' && repo.gitBranch && (
          <span className="text-xs text-fg-muted">{repo.gitBranch}</span>
        )}
        {repo.repoKind === 'cloud' && repo.gitDirty && (
          <span className="text-xs text-attention-fg">{T.uncommitted}</span>
        )}
        {repo.repoKind === 'cloud' && repo.aheadCount ? (
          <span className="text-xs text-success-fg">{T.ahead(repo.aheadCount)}</span>
        ) : null}
        {repo.repoKind === 'cloud' && repo.behindCount ? (
          <span className="text-xs text-attention-fg">{T.behind(repo.behindCount)}</span>
        ) : null}
        <CategoryLabel
          cats={cats}
          categories={categories}
          repoCategoryIds={repo.categoryIds}
          onToggleCategory={onToggleCategory}
        />
      </div>
    </div>
  )
}

function StarButton({
  starred,
  onToggle,
}: {
  starred: boolean
  onToggle: () => void
}) {
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() }
      }}
      className="rounded p-1 text-fg-muted hover:bg-bg-inset hover:text-attention-fg cursor-pointer"
      aria-label={starred ? T.unstar : T.star}
    >
      <Star
        className={`h-4 w-4 ${starred ? 'fill-[var(--attention-fg)] text-attention-fg' : ''}`}
      />
    </span>
  )
}

function CategoryLabel({
  cats,
  categories,
  repoCategoryIds,
  onToggleCategory,
}: {
  cats: Category[]
  categories: Category[]
  repoCategoryIds: string[]
  onToggleCategory: (categoryId: string) => void
}) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  function open() {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const popoverW = 200
    const popoverH = Math.min(categories.length * 34 + 40, 320)
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceRight = window.innerWidth - rect.left
    setPos({
      left: spaceRight < popoverW ? rect.right - popoverW : rect.left,
      top: spaceBelow < popoverH ? rect.top - popoverH - 4 : rect.bottom + 4,
    })
    setShow(true)
  }

  // Close on outside click — proper useEffect
  useEffect(() => {
    if (!show) return
    function handler(e: MouseEvent) {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setShow(false)
      }
    }
    // Delay adding listener so the click that opened the popover doesn't close it
    const id = setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => {
      clearTimeout(id)
      document.removeEventListener('mousedown', handler)
    }
  }, [show])

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    show ? setShow(false) : open()
  }

  if (cats.length > 0) {
    return (
      <span className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={handleClick}
          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs cursor-pointer hover:opacity-80 transition"
          style={{
            backgroundColor: `${cats[0].color}22`,
            color: cats[0].color,
            border: `1px solid ${cats[0].color}44`,
          }}
        >
          <Tag className="h-3 w-3" />
          {cats[0].name}
          {cats.length > 1 && (
            <span className="ml-0.5 rounded-full bg-bg-inset px-1 text-[10px]">
              +{cats.length - 1}
            </span>
          )}
        </button>
        {show && (
          <CategoryPopover
            ref={popoverRef}
            categories={categories}
            activeIds={repoCategoryIds}
            onToggle={onToggleCategory}
            onClose={() => setShow(false)}
            style={{ position: 'fixed', left: pos.left, top: pos.top, zIndex: 100 }}
          />
        )}
      </span>
    )
  }

  // Uncategorized
  return (
    <span className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleClick}
        className="flex items-center gap-1 rounded-full border border-dashed border-fg-subtle px-2 py-0.5 text-xs text-fg-muted cursor-pointer hover:border-accent-fg hover:text-accent-fg transition"
      >
        <Tag className="h-3 w-3" />
        未分类
      </button>
      {show && (
        <CategoryPopover
          ref={popoverRef}
          categories={categories}
          activeIds={repoCategoryIds}
          onToggle={onToggleCategory}
          onClose={() => setShow(false)}
          style={{ position: 'fixed', left: pos.left, top: pos.top, zIndex: 100 }}
        />
      )}
    </span>
  )
}

const CategoryPopover = forwardRef<
  HTMLDivElement,
  {
    categories: Category[]
    activeIds: string[]
    onToggle: (id: string) => void
    onClose: () => void
    style?: React.CSSProperties
  }
>(function CategoryPopover({ categories, activeIds, onToggle, onClose, style }, ref) {
  return (
    <div
      ref={ref}
      style={style}
      className="rounded-lg border border-border-default bg-bg-default p-2 shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-1.5 px-1">
        <span className="text-[11px] font-medium text-fg-muted">选择分类</span>
        <button
          type="button"
          onClick={onClose}
          className="text-fg-subtle hover:text-fg-default text-xs"
        >
          ✕
        </button>
      </div>
      <div className="max-h-60 overflow-y-auto">
        {categories.length === 0 ? (
          <p className="px-2 py-3 text-xs text-fg-subtle text-center">暂无分类，请先在侧边栏创建</p>
        ) : (
          categories.map((c) => {
            const active = activeIds.includes(c.id)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onToggle(c.id)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition ${
                  active ? 'bg-accent-subtle' : 'hover:bg-bg-inset'
                }`}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="flex-1 truncate">{c.name}</span>
                {active && <span className="text-[10px] text-accent-fg">✓</span>}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
})

export { CategoryPills }

function CategoryPills({ cats }: { cats: Category[] }) {
  if (!cats.length) return null
  return (
    <>
      {cats.map((c) => (
        <span
          key={c.id}
          className="rounded-full px-2 py-0.5 text-xs"
          style={{ backgroundColor: `${c.color}22`, color: c.color }}
        >
          {c.name}
        </span>
      ))}
    </>
  )
}
