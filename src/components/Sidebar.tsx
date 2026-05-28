import { useState, useRef, useEffect } from 'react'
import {
  ChevronRight,
  ChevronDown,
  FolderOpen,
  LayoutGrid,
  List,
  PanelLeft,
  Pen,
  Plus,
  RefreshCw,
  Star,
  X,
} from 'lucide-react'
import type { Category } from '../types'
import { useAppStore } from '../store/useAppStore'
import T from '../i18n'

const api = window.electronAPI

const PRESET_COLORS = [
  '#58a6ff', '#3fb950', '#d29922', '#f85149',
  '#bc8cff', '#fea557', '#79c0ff', '#6e7681',
]

function getChildren(cats: Category[], parentId: string): Category[] {
  return cats.filter((c) => c.parentId === parentId)
}

function getDescendantIds(cats: Category[], id: string): Set<string> {
  const ids = new Set<string>()
  const stack = [id]
  while (stack.length > 0) {
    const cur = stack.pop()!
    for (const c of cats) {
      if (c.parentId === cur && !ids.has(c.id)) {
        ids.add(c.id)
        stack.push(c.id)
      }
    }
  }
  return ids
}

// ── Category Add Popover ──

function CategoryForm({
  categories,
  defaultParentId,
  onSave,
  onCancel,
}: {
  categories: Category[]
  defaultParentId: string | null
  onSave: (name: string, color: string, parentId: string | null) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [parentId, setParentId] = useState<string | null>(defaultParentId)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) return
    onSave(trimmed, color, parentId)
  }

  return (
    <div className="rounded-lg border border-border-default bg-bg-default p-2.5 shadow-lg">
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave()
          if (e.key === 'Escape') onCancel()
        }}
        placeholder={T.categoryNamePlaceholder}
        className="w-full rounded-md border border-border-default bg-bg-default px-2 py-1.5 text-sm text-fg-default outline-none placeholder:text-fg-subtle focus:border-accent-fg"
      />

      <div className="mt-2">
        <p className="mb-1 text-[11px] text-fg-muted">{T.categoryParent}</p>
        <select
          value={parentId ?? ''}
          onChange={(e) => setParentId(e.target.value || null)}
          className="w-full rounded-md border border-border-default bg-bg-default px-2 py-1.5 text-sm text-fg-default outline-none focus:border-accent-fg"
        >
          <option value="">{T.categoryParentNone}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {'— '.repeat(c.parentId ? 1 : 0)}{c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-2.5 flex gap-1.5">
        {PRESET_COLORS.map((clr) => (
          <button
            key={clr}
            type="button"
            onClick={() => setColor(clr)}
            className={`h-5 w-5 rounded-full border-2 transition ${
              color === clr ? 'border-fg-default scale-110' : 'border-transparent'
            }`}
            style={{ backgroundColor: clr }}
          />
        ))}
      </div>

      <div className="mt-2.5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-2.5 py-1 text-xs text-fg-muted hover:bg-bg-inset"
        >
          {T.cancel}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!name.trim()}
          className="rounded-md bg-accent-emphasis px-3 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40"
        >
          {T.addCategory}
        </button>
      </div>
    </div>
  )
}

// ── Category Tree Item ──

function CategoryItem({
  category,
  depth,
  allCategories,
  activeCategoryId,
  onSelect,
  onAddChild,
  onEdit,
  onDelete,
  onDropRepo,
  editing,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
}: {
  category: Category
  depth: number
  allCategories: Category[]
  activeCategoryId: string | null
  onSelect: (id: string) => void
  onAddChild: (parentId: string) => void
  onEdit: (id: string, name: string, color: string) => void
  onDelete: (id: string) => void
  onDropRepo: (repoId: string, categoryId: string) => void
  editing: boolean
  onStartEdit: (id: string) => void
  onSaveEdit: (id: string, name: string, color: string) => void
  onCancelEdit: () => void
}) {
  const children = getChildren(allCategories, category.id)
  const hasChildren = children.length > 0
  const isActive = activeCategoryId === category.id

  // If parent is selected, this child is also considered active
  const descendantIds = activeCategoryId
    ? getDescendantIds(allCategories, activeCategoryId)
    : new Set<string>()
  const isDescendantActive = descendantIds.has(category.id)

  const [expanded, setExpanded] = useState(isActive || isDescendantActive || depth < 2)
  const [editName, setEditName] = useState(category.name)
  const [editColor, setEditColor] = useState(category.color)
  const editInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  // Clean up stuck dragOver on global dragend
  useEffect(() => {
    function onDragEnd() { setDragOver(false) }
    document.addEventListener('dragend', onDragEnd)
    return () => document.removeEventListener('dragend', onDragEnd)
  }, [])

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'link'
    setDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.stopPropagation()
    setDragOver(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    const repoId = e.dataTransfer.getData('application/repo-id')
    if (repoId) onDropRepo(repoId, category.id)
  }

  useEffect(() => {
    if (editing) {
      setEditName(category.name)
      setEditColor(category.color)
      editInputRef.current?.focus()
    }
  }, [editing, category.name, category.color])

  function handleSaveEdit() {
    const trimmed = editName.trim()
    if (!trimmed) return
    onSaveEdit(category.id, trimmed, editColor)
  }

  if (editing) {
    return (
      <div style={{ marginLeft: depth * 14 }}>
        <div className="rounded-lg border border-border-default bg-bg-default p-2.5 shadow-lg mb-1">
          <input
            ref={editInputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit()
              if (e.key === 'Escape') onCancelEdit()
            }}
            className="w-full rounded-md border border-border-default bg-bg-default px-2 py-1.5 text-sm text-fg-default outline-none focus:border-accent-fg"
          />
          <div className="mt-2 flex gap-1.5">
            {PRESET_COLORS.map((clr) => (
              <button
                key={clr}
                type="button"
                onClick={() => setEditColor(clr)}
                className={`h-5 w-5 rounded-full border-2 transition ${
                  editColor === clr ? 'border-fg-default scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: clr }}
              />
            ))}
          </div>
          <div className="mt-2.5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancelEdit}
              className="rounded-md px-2.5 py-1 text-xs text-fg-muted hover:bg-bg-inset"
            >
              {T.cancel}
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={!editName.trim()}
              className="rounded-md bg-accent-emphasis px-3 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={dragOver ? 'rounded-md ring-2 ring-accent-fg' : ''}
    >
      <div
        className={`group flex items-center gap-1 rounded-md transition cursor-pointer ${
          dragOver
            ? 'bg-accent-subtle text-fg-default'
            : isActive
              ? 'bg-accent-subtle text-fg-default'
              : 'text-fg-muted hover:bg-bg-inset hover:text-fg-default'
        }`}
        style={{ marginLeft: depth * 14 }}
      >
        {/* expand arrow */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setExpanded(!expanded)
          }}
          className={`shrink-0 rounded p-0.5 text-fg-subtle hover:text-fg-default ${
            !hasChildren ? 'invisible' : ''
          }`}
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>

        {/* main click area */}
        <button
          type="button"
          onClick={() => onSelect(category.id)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded py-1.5 pr-1 text-left text-sm"
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: category.color }}
          />
          <span className="truncate">{category.name}</span>
          {hasChildren && (
            <span className="shrink-0 text-[10px] text-fg-subtle">{children.length}</span>
          )}
        </button>

        {/* hover actions */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onStartEdit(category.id)
          }}
          className="shrink-0 rounded p-0.5 text-fg-subtle opacity-0 transition hover:bg-bg-inset hover:text-fg-default group-hover:opacity-100"
          title="编辑分类"
        >
          <Pen className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onAddChild(category.id)
          }}
          className="mr-0.5 shrink-0 rounded p-0.5 text-fg-subtle opacity-0 transition hover:bg-bg-inset hover:text-fg-default group-hover:opacity-100"
          title={T.addCategory}
        >
          <Plus className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(category.id)
          }}
          className="shrink-0 rounded p-0.5 text-fg-subtle opacity-0 transition hover:bg-bg-inset hover:text-danger-fg group-hover:opacity-100"
          title={T.deleteCategory}
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* children */}
      {hasChildren && expanded && (
        <div>
          {children.map((child) => (
            <CategoryItem
              key={child.id}
              category={child}
              depth={depth + 1}
              allCategories={allCategories}
              activeCategoryId={activeCategoryId}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
              onDropRepo={onDropRepo}
              editing={editing}
              onStartEdit={onStartEdit}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Sidebar ──

interface SidebarProps {
  categories: Category[]
  activeCategoryId: string | null
  starredOnly: boolean
  languages: string[]
  activeLanguage: string | null
  onCategory: (id: string | null) => void
  onStarredOnly: (v: boolean) => void
  onLanguage: (lang: string | null) => void
  onRefreshAll: () => void
  onOpenWorkspace: () => void
  loading?: boolean
  onDropRepo: (repoId: string, categoryId: string) => void
}

export function Sidebar({
  categories,
  activeCategoryId,
  starredOnly,
  languages,
  activeLanguage,
  onCategory,
  onStarredOnly,
  onLanguage,
  onRefreshAll,
  onOpenWorkspace,
  loading,
  onDropRepo,
}: SidebarProps) {
  const setCategories = useAppStore((s) => s.setCategories)
  const [showForm, setShowForm] = useState(false)
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const rootCategories = categories.filter((c) => !c.parentId)

  async function handleAdd(name: string, color: string, parentId: string | null) {
    const cat: Category = {
      id: `cat-${Date.now()}`,
      name,
      color,
      parentId,
    }
    const updated = await api.categories.add(cat)
    setCategories(updated as Category[])
    setShowForm(false)
  }

  async function handleDelete(id: string) {
    const updated = await api.categories.remove(id)
    setCategories(updated as Category[])
    if (activeCategoryId === id) onCategory(null)
  }

  async function handleEdit(id: string, name: string, color: string) {
    const updated = await api.categories.update(id, { name, color })
    setCategories(updated as Category[])
    setEditingId(null)
  }

  function openAddForm(parentId: string | null) {
    setDefaultParentId(parentId)
    setShowForm(true)
  }

  return (
    <aside className="flex w-52 shrink-0 flex-col border-r border-border-default bg-bg-subtle">
      {/* category header */}
      <div className="flex items-center justify-between border-b border-border-default px-3 py-2.5">
        <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
          {T.categories}
        </p>
        <button
          type="button"
          onClick={() => openAddForm(null)}
          className="rounded p-0.5 text-fg-muted hover:bg-bg-inset hover:text-fg-default"
          title={T.addCategory}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {/* all repos */}
        <NavItem
          active={activeCategoryId === null && !starredOnly}
          onClick={() => {
            onCategory(null)
            onStarredOnly(false)
          }}
          label={T.allRepos}
        />

        {/* starred */}
        <NavItem
          active={starredOnly}
          onClick={() => {
            onStarredOnly(true)
            onCategory(null)
          }}
          label={T.starred}
          icon={<Star className="h-3.5 w-3.5" />}
        />

        <div className="my-2 border-t border-border-default" />

        {/* add form */}
        {showForm && (
          <div className="mb-2">
            <CategoryForm
              categories={categories}
              defaultParentId={defaultParentId}
              onSave={handleAdd}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {/* category tree */}
        {rootCategories.map((cat) => (
          <CategoryItem
            key={cat.id}
            category={cat}
            depth={0}
            allCategories={categories}
            activeCategoryId={activeCategoryId}
            onSelect={(id) => {
              onCategory(id)
              onStarredOnly(false)
            }}
            onAddChild={(parentId) => openAddForm(parentId)}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onDropRepo={onDropRepo}
            editing={editingId === cat.id}
            onStartEdit={(id) => setEditingId(id)}
            onSaveEdit={handleEdit}
            onCancelEdit={() => setEditingId(null)}
          />
        ))}

        {/* languages section */}
        {languages.length > 0 && (
          <>
            <div className="my-2 border-t border-border-default" />
            <p className="px-2 py-1 text-xs text-fg-muted">{T.languages}</p>
            {languages.map((lang) => (
              <NavItem
                key={lang}
                active={activeLanguage === lang}
                onClick={() => onLanguage(activeLanguage === lang ? null : lang)}
                label={lang}
              />
            ))}
          </>
        )}
      </nav>

      {/* bottom actions */}
      <div className="space-y-1 border-t border-border-default p-2">
        <ActionBtn
          icon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
          label={T.refreshAll}
          onClick={onRefreshAll}
          disabled={loading}
        />
        <ActionBtn
          icon={<FolderOpen className="h-4 w-4" />}
          label={T.openWorkspace}
          onClick={onOpenWorkspace}
        />
      </div>
    </aside>
  )
}

// ── Simple nav item ──

function NavItem({
  active,
  onClick,
  label,
  icon,
  dot,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon?: React.ReactNode
  dot?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-0.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition ${
        active
          ? 'bg-accent-subtle font-medium text-fg-default'
          : 'text-fg-muted hover:bg-bg-inset hover:text-fg-default'
      }`}
    >
      {dot && (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: dot }}
        />
      )}
      {icon}
      <span className="truncate">{label}</span>
    </button>
  )
}

function ActionBtn({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-fg-muted transition hover:bg-bg-inset hover:text-fg-default disabled:opacity-50"
    >
      {icon}
      {label}
    </button>
  )
}

// ── View mode toggle (unchanged) ──

export function ViewModeToggle({
  mode,
  onChange,
}: {
  mode: 'grid' | 'list' | 'compact'
  onChange: (m: 'grid' | 'list' | 'compact') => void
}) {
  const items = [
    { id: 'grid' as const, icon: LayoutGrid, title: T.viewGrid },
    { id: 'list' as const, icon: List, title: T.viewList },
    { id: 'compact' as const, icon: PanelLeft, title: T.viewCompact },
  ]
  return (
    <div className="flex rounded-lg border border-border-default bg-bg-subtle p-0.5">
      {items.map(({ id, icon: Icon, title }) => (
        <button
          key={id}
          type="button"
          title={title}
          onClick={() => onChange(id)}
          className={`rounded-md p-1.5 transition ${
            mode === id
              ? 'bg-bg-inset text-fg-default'
              : 'text-fg-muted hover:text-fg-default'
          }`}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  )
}
