import { useCallback, useEffect, useState } from 'react'
import { ChevronRight, ChevronDown, FileText, Folder, FolderOpen } from 'lucide-react'

const api = window.electronAPI

export interface FileEntry {
  name: string
  isDirectory: boolean
  path: string
}

interface Props {
  rootPath: string
  /** 递增时重新加载整棵树（文件变更 / 手动刷新） */
  refreshKey?: number
  onSelectFile: (filePath: string, fileName: string) => void
  activeFilePath?: string | null
}

export function FileTree({ rootPath, refreshKey = 0, onSelectFile, activeFilePath }: Props) {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.repos.listFiles(rootPath).then((entries) => {
      if (!cancelled) {
        setFiles(entries)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [rootPath, refreshKey])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="text-xs text-fg-muted">加载中…</span>
      </div>
    )
  }

  return (
    <div className="overflow-y-auto py-1">
      {files.map((entry) => (
        <TreeNode
          key={`${refreshKey}:${entry.path}`}
          entry={entry}
          depth={0}
          refreshKey={refreshKey}
          onSelectFile={onSelectFile}
          activeFilePath={activeFilePath}
        />
      ))}
      {files.length === 0 && (
        <p className="px-3 py-4 text-xs text-fg-muted">空目录</p>
      )}
    </div>
  )
}

function TreeNode({
  entry,
  depth,
  refreshKey,
  onSelectFile,
  activeFilePath,
}: {
  entry: FileEntry
  depth: number
  refreshKey: number
  onSelectFile: (filePath: string, fileName: string) => void
  activeFilePath?: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const [children, setChildren] = useState<FileEntry[] | null>(null)
  const [loading, setLoading] = useState(false)

  const loadChildren = useCallback(async () => {
    setLoading(true)
    const entries = await api.repos.listFiles(entry.path)
    setChildren(entries)
    setLoading(false)
  }, [entry.path])

  useEffect(() => {
    if (expanded && children === null && !loading) {
      void loadChildren()
    }
  }, [expanded, children, loading, loadChildren])

  useEffect(() => {
    if (expanded) {
      void loadChildren()
    } else {
      setChildren(null)
    }
  }, [refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps -- 仅随 refreshKey 刷新目录内容

  if (entry.isDirectory) {
    const isOpen = expanded
    return (
      <div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center gap-1 rounded px-2 py-1 text-left text-sm text-fg-default hover:bg-bg-inset"
          style={{ paddingLeft: `${8 + depth * 16}px` }}
        >
          {isOpen ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-fg-muted" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-fg-muted" />
          )}
          {isOpen ? (
            <FolderOpen className="h-4 w-4 shrink-0 text-accent-fg" />
          ) : (
            <Folder className="h-4 w-4 shrink-0 text-accent-fg" />
          )}
          <span className="truncate text-sm">{entry.name}</span>
        </button>
        {isOpen && (
          <div>
            {loading && (
              <span
                className="block py-1 text-xs text-fg-muted"
                style={{ paddingLeft: `${28 + depth * 16}px` }}
              >
                加载中…
              </span>
            )}
            {children?.map((child) => (
              <TreeNode
                key={`${refreshKey}:${child.path}`}
                entry={child}
                depth={depth + 1}
                refreshKey={refreshKey}
                onSelectFile={onSelectFile}
                activeFilePath={activeFilePath}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // File
  const isActive = activeFilePath === entry.path
  return (
    <button
      type="button"
      onClick={() => onSelectFile(entry.path, entry.name)}
      className={`flex w-full items-center gap-1 rounded px-2 py-1 text-left text-sm transition ${
        isActive
          ? 'bg-accent-subtle text-accent-fg'
          : 'text-fg-muted hover:bg-bg-inset hover:text-fg-default'
      }`}
      style={{ paddingLeft: `${28 + depth * 16}px` }}
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span className="truncate text-sm">{entry.name}</span>
    </button>
  )
}
