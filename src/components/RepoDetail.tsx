import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ExternalLink,
  FolderOpen,
  GitBranch,
  Languages,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Tag,
  Terminal,
  Trash2,
} from 'lucide-react'
import { MarkdownView } from './MarkdownView'
import { CodePreview } from './CodePreview'
import { FileTree } from './FileTree'
import { TerminalViewport } from './terminal/TerminalViewport'
import { useAppStore } from '../store/useAppStore'
import type { Category, RepoRecord } from '../types'
import T from '../i18n'
import { isChineseReadmeFileName, isPrimaryReadmeFileName } from '../lib/readmeFiles'

const api = window.electronAPI

interface ReadmeData {
  original: string | null
  chinese: string | null
  chineseFileName?: string | null
}

interface Props {
  repo: RepoRecord
  categories: Category[]
  readme: ReadmeData | null
  readmeLoading: boolean
  onRefresh: () => void
  onOpenFolder: () => void
  onRemove: () => void
  onToggleCategory: (categoryId: string) => void
  onOpenGitPanel?: () => void
}

export function RepoDetail({
  repo,
  categories,
  readme,
  readmeLoading,
  onRefresh,
  onOpenFolder,
  onRemove,
  onToggleCategory,
  onOpenGitPanel,
}: Props) {
  const setReadme = useAppStore((s) => s.setReadme)
  const [showChinese, setShowChinese] = useState(readme?.chinese != null)
  const [translating, setTranslating] = useState(false)
  const [translateError, setTranslateError] = useState<string | null>(null)

  // File explorer state
  const [fileTreeOpen, setFileTreeOpen] = useState(true)
  const [selectedFile, setSelectedFile] = useState<{ path: string; name: string } | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [fileLoading, setFileLoading] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const terminalOpen = useAppStore((s) => s.terminalPanelOpen[repo.localPath] ?? false)
  const ensureTerminalSession = useAppStore((s) => s.ensureTerminalSession)
  const closeTerminalSession = useAppStore((s) => s.closeTerminalSession)

  // Category popover
  const [catPopoverOpen, setCatPopoverOpen] = useState(false)
  const [catPopoverPos, setCatPopoverPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 })
  const catBtnRef = useRef<HTMLButtonElement>(null)
  const catPopoverRef = useRef<HTMLDivElement>(null)

  // Close category popover on outside click
  useEffect(() => {
    if (!catPopoverOpen) return
    function handler(e: MouseEvent) {
      if (
        catPopoverRef.current && !catPopoverRef.current.contains(e.target as Node) &&
        catBtnRef.current && !catBtnRef.current.contains(e.target as Node)
      ) {
        setCatPopoverOpen(false)
      }
    }
    const id = setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => {
      clearTimeout(id)
      document.removeEventListener('mousedown', handler)
    }
  }, [catPopoverOpen])

  function openCatPopover() {
    if (!catBtnRef.current) return
    const rect = catBtnRef.current.getBoundingClientRect()
    setCatPopoverPos({ left: rect.left, top: rect.bottom + 4 })
    setCatPopoverOpen(true)
  }

  type ContentTab = 'doc' | 'terminal'

  const [treeWidth, setTreeWidth] = useState(260)
  const [fileTreeRefresh, setFileTreeRefresh] = useState(0)
  const [contentTab, setContentTab] = useState<ContentTab>('doc')
  const [layoutTick, setLayoutTick] = useState(0)
  const selectedFileRef = useRef(selectedFile)
  selectedFileRef.current = selectedFile
  const dragging = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Reset when repo changes（终端会话按 repoPath 独立保存在 store，此处不关闭）
  useEffect(() => {
    setSelectedFile(null)
    setFileContent(null)
    setFileError(null)
    setTranslateError(null)
    setCatPopoverOpen(false)
  }, [repo.id])

  const bumpFileTree = useCallback(() => {
    setFileTreeRefresh((n) => n + 1)
  }, [])

  const reloadOpenFilePreview = useCallback(async () => {
    const file = selectedFileRef.current
    if (!file) return
    try {
      const res = await api.repos.readFile(file.path)
      if (res.ok) {
        setFileContent(res.content)
        setFileError(null)
      }
    } catch {
      // 文件可能被删除，忽略
    }
  }, [])

  // 监听仓库目录变更，自动刷新文件树
  useEffect(() => {
    const localPath = repo.localPath
    const normalize = (p: string) => p.trim().replace(/\\/g, '/').toLowerCase()

    const onChange = ({ repoPath }: { repoPath: string }) => {
      if (normalize(repoPath) !== normalize(localPath)) return
      bumpFileTree()
      void reloadOpenFilePreview()
    }

    void api.repos.watchFiles(localPath)
    const unsub = api.repos.onFilesChanged(onChange)

    const onFocus = () => {
      bumpFileTree()
      void reloadOpenFilePreview()
    }
    window.addEventListener('focus', onFocus)

    return () => {
      unsub()
      void api.repos.unwatchFiles(localPath)
      window.removeEventListener('focus', onFocus)
    }
  }, [repo.localPath, bumpFileTree, reloadOpenFilePreview])

  // Sync showChinese when readme loads
  useEffect(() => {
    setShowChinese(readme?.chinese != null)
  }, [readme])

  // Load file content
  const handleSelectFile = useCallback(async (filePath: string, fileName: string) => {
    setSelectedFile({ path: filePath, name: fileName })
    setContentTab('doc')
    setFileLoading(true)
    setFileError(null)
    try {
      const res = await api.repos.readFile(filePath)
      if (res.ok) {
        setFileContent(res.content)
      } else {
        setFileError(res.error)
        setFileContent(null)
      }
    } catch (err) {
      setFileError(err instanceof Error ? err.message : String(err))
      setFileContent(null)
    } finally {
      setFileLoading(false)
    }
  }, [])

  // Handle README.md click in file tree → show README
  const handleSelectFileFromTree = useCallback((filePath: string, fileName: string) => {
    if (isPrimaryReadmeFileName(fileName) || isChineseReadmeFileName(fileName)) {
      setSelectedFile(null)
      setFileContent(null)
      setFileError(null)
      setContentTab('doc')
      if (isChineseReadmeFileName(fileName)) {
        setShowChinese(true)
      }
      return
    }
    handleSelectFile(filePath, fileName)
  }, [handleSelectFile])

  // Resize handler
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const w = ev.clientX - rect.left
      setTreeWidth(Math.max(180, Math.min(500, w)))
    }
    const onUp = () => {
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      setLayoutTick((n) => n + 1)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  const openTerminalTab = useCallback(() => {
    ensureTerminalSession(repo.id, repo.localPath)
    setContentTab('terminal')
    setLayoutTick((n) => n + 1)
  }, [repo.id, repo.localPath, ensureTerminalSession])

  const closeTerminalTab = useCallback(() => {
    closeTerminalSession(repo.localPath)
    setContentTab('doc')
  }, [repo.localPath, closeTerminalSession])

  useEffect(() => {
    const t = setTimeout(() => setLayoutTick((n) => n + 1), 120)
    return () => clearTimeout(t)
  }, [fileTreeOpen, treeWidth, contentTab, terminalOpen])

  async function handleTranslate() {
    if (showChinese) {
      setShowChinese(false)
      return
    }
    if (readme?.chinese) {
      setShowChinese(true)
      return
    }
    const original = readme?.original
    if (!original) return
    setTranslating(true)
    setTranslateError(null)
    try {
      const res = await api.translate.readme(original, repo.localPath)
      if (res.ok) {
        // Update store so Chinese version shows immediately; file is written by backend
        if (readme) {
          setReadme({
            ...readme,
            chinese: res.text,
            chineseFileName: readme.chineseFileName ?? 'README-CN.md',
          })
        }
        setShowChinese(true)
      } else {
        setTranslateError(res.error)
      }
    } catch (err) {
      setTranslateError(err instanceof Error ? err.message : String(err))
    } finally {
      setTranslating(false)
    }
  }

  return (
    <div className="flex h-full flex-col" ref={containerRef}>
      {/* Compact header */}
      <header className="shrink-0 border-b border-border-default px-6 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-bold text-fg-default">{repo.name}</h1>
              {repo.language && (
                <span className="shrink-0 rounded-full bg-bg-inset px-2 py-0.5 text-xs text-fg-muted">
                  {repo.language}
                </span>
              )}
              {repo.gitBranch && (
                <span className="shrink-0 font-mono text-xs text-fg-muted">{repo.gitBranch}</span>
              )}
              {repo.gitDirty && (
                <span className="shrink-0 rounded bg-attention-fg/15 px-1.5 py-0.5 text-xs text-attention-fg">
                  {T.hasUncommitted}
                </span>
              )}
              {repo.aheadCount ? (
                <span className="shrink-0 text-xs text-success-fg">{T.ahead(repo.aheadCount)}</span>
              ) : null}
              {repo.behindCount ? (
                <span className="shrink-0 text-xs text-attention-fg">{T.behind(repo.behindCount)}</span>
              ) : null}
            </div>
            {(repo.description || repo.lastCommitMessage) && (
              <p className="mt-0.5 truncate text-sm text-fg-muted">
                {repo.description || repo.lastCommitMessage?.slice(0, 80)}
              </p>
            )}
            <p className="mt-0.5 truncate font-mono text-xs text-fg-subtle">{repo.localPath}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-1.5">
            <ToolbarBtn icon={RefreshCw} label={T.refresh} onClick={onRefresh} />
            <ToolbarBtn icon={FolderOpen} label={T.openFolder} onClick={onOpenFolder} />
            <ToolbarBtn
              icon={Terminal}
              label={T.terminal}
              active={terminalOpen && contentTab === 'terminal'}
              onClick={openTerminalTab}
            />
            {onOpenGitPanel && (
              <ToolbarBtn icon={GitBranch} label={T.gitManage} onClick={onOpenGitPanel} />
            )}
            {readme?.original && (
              <ToolbarBtn
                icon={translating ? Loader2 : Languages}
                label={translating ? '翻译中…' : showChinese && readme?.chinese ? '显示原文' : readme?.chinese ? '显示中文' : '翻译为中文'}
                onClick={handleTranslate}
              />
            )}
            <ToolbarBtn icon={Trash2} label={T.remove} onClick={onRemove} danger />
          </div>
        </div>

        {/* Remote URL */}
        {repo.remoteUrl && (
          <a
            href={repo.remoteUrl.replace(/\.git$/, '').replace(/^git@github\.com:/, 'https://github.com/')}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs text-accent-fg hover:underline"
          >
            {repo.remoteUrl}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}

        {/* Categories */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {repo.categoryIds.map((cid) => {
            const c = categories.find((cat) => cat.id === cid)
            if (!c) return null
            return (
              <button
                key={cid}
                type="button"
                onClick={() => onToggleCategory(cid)}
                className="rounded-full border border-transparent px-2.5 py-0.5 text-xs transition text-fg-default"
                style={{ backgroundColor: `${c.color}33`, color: c.color }}
              >
                {c.name}
              </button>
            )
          })}
          <button
            type="button"
            ref={catBtnRef}
            onClick={(e) => {
              e.stopPropagation()
              catPopoverOpen ? setCatPopoverOpen(false) : openCatPopover()
            }}
            className="rounded-full border border-dashed border-fg-subtle px-2.5 py-0.5 text-xs text-fg-muted hover:border-accent-fg hover:text-accent-fg"
          >
            <Tag className="mr-1 inline h-3 w-3" />
            分类
          </button>
          {catPopoverOpen && (
            <div
              ref={catPopoverRef}
              className="fixed z-[100] rounded-lg border border-border-default bg-bg-default p-2 shadow-xl"
              style={{ left: catPopoverPos.left, top: catPopoverPos.top }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-1.5 flex items-center justify-between px-1">
                <span className="text-[11px] font-medium text-fg-muted">选择分类</span>
                <button
                  type="button"
                  onClick={() => setCatPopoverOpen(false)}
                  className="text-xs text-fg-subtle hover:text-fg-default"
                >
                  ✕
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {categories.length === 0 ? (
                  <p className="px-2 py-3 text-center text-xs text-fg-subtle">暂无分类，请先在侧边栏创建</p>
                ) : (
                  categories.map((c) => {
                    const active = repo.categoryIds.includes(c.id)
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => onToggleCategory(c.id)}
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
          )}
        </div>
      </header>

      {/* Main body: File Tree + Content */}
      <div className="flex min-h-0 flex-1">
        {/* File Tree panel */}
        {fileTreeOpen ? (
          <>
            <div
              className="flex shrink-0 flex-col overflow-hidden border-r border-border-default bg-bg-subtle"
              style={{ width: treeWidth }}
            >
              <div className="flex items-center justify-between border-b border-border-default px-2 py-1.5">
                <span className="text-xs font-medium text-fg-muted">文件</span>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    title="刷新文件树"
                    onClick={() => {
                      bumpFileTree()
                      void reloadOpenFilePreview()
                    }}
                    className="rounded p-0.5 text-fg-muted hover:bg-bg-inset hover:text-fg-default"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setFileTreeOpen(false)}
                    className="rounded p-0.5 text-fg-muted hover:bg-bg-inset hover:text-fg-default"
                  >
                    <PanelLeftClose className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <FileTree
                  rootPath={repo.localPath}
                  refreshKey={fileTreeRefresh}
                  onSelectFile={handleSelectFileFromTree}
                  activeFilePath={selectedFile?.path}
                />
              </div>
            </div>

            {/* Resize handle */}
            <div
              className="w-1 shrink-0 cursor-col-resize bg-transparent transition hover:bg-accent-fg/20 active:bg-accent-fg/30"
              onMouseDown={handleMouseDown}
            />
          </>
        ) : (
          <button
            type="button"
            onClick={() => setFileTreeOpen(true)}
            className="shrink-0 border-r border-border-default px-1 text-fg-muted hover:bg-bg-inset hover:text-fg-default"
            title="展开文件树"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}

        <div ref={contentRef} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {terminalOpen && (
            <div className="flex shrink-0 items-center gap-1 border-b border-border-default bg-bg-subtle px-2 py-1">
              <ContentTabBtn
                active={contentTab === 'doc'}
                onClick={() => setContentTab('doc')}
                label={
                  selectedFile
                    ? selectedFile.name
                    : showChinese && readme?.chinese
                      ? (readme.chineseFileName ?? 'README 中文')
                      : 'README'
                }
              />
              <ContentTabBtn
                active={contentTab === 'terminal'}
                onClick={() => {
                  setContentTab('terminal')
                  setLayoutTick((n) => n + 1)
                }}
                label="终端"
              />
            </div>
          )}

          <div className="relative min-h-0 min-w-0 flex-1">
            {terminalOpen && contentTab === 'terminal' && (
              <div className="absolute inset-0 flex min-h-0 min-w-0 flex-col">
                <TerminalViewport
                  repoId={repo.id}
                  repoPath={repo.localPath}
                  layoutTick={layoutTick}
                  onClose={closeTerminalTab}
                />
              </div>
            )}

            <div
              className={
                contentTab === 'doc' || !terminalOpen
                  ? 'flex h-full min-h-0 flex-col overflow-hidden'
                  : 'hidden'
              }
            >
              {selectedFile ? (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <div className="flex shrink-0 items-center gap-2 border-b border-border-default bg-bg-subtle px-4 py-1.5">
                    <span className="font-mono text-xs text-fg-muted truncate">{selectedFile.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null)
                        setFileContent(null)
                        setFileError(null)
                      }}
                      className="ml-auto text-xs text-accent-fg hover:underline"
                    >
                      返回 README
                    </button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-auto bg-bg-default">
                    {fileLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-5 w-5 animate-spin text-fg-muted" />
                      </div>
                    ) : fileError ? (
                      <div className="p-4 text-sm text-danger-fg">{fileError}</div>
                    ) : fileContent !== null ? (
                      /\.(md|mdx)$/i.test(selectedFile.name) ? (
                        <div className="px-6 py-4">
                          <MarkdownView content={fileContent} basePath={repo.localPath} />
                        </div>
                      ) : (
                        <CodePreview content={fileContent} fileName={selectedFile.name} />
                      )
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto px-8 py-5">
                  {readmeLoading || translating ? (
                    <div className="flex items-center gap-2 py-8 text-sm text-fg-muted">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {translating ? '正在翻译 README…' : T.loadingReadme}
                    </div>
                  ) : readme?.original || readme?.chinese ? (
                    <div>
                      {showChinese && readme.chinese && readme.original && (
                        <div className="mb-3 rounded-lg border border-accent-subtle bg-accent-subtle px-4 py-2 text-xs text-fg-muted">
                          当前显示中文版（{readme.chineseFileName ?? 'README-CN.md'}）
                          {readme.chineseFileName?.toLowerCase() === 'readme-cn.md' &&
                            '，可能与 AI 翻译或原文有差异'}
                        </div>
                      )}
                      {translateError && (
                        <div className="mb-3 rounded-lg border border-danger-fg/30 bg-danger-fg/10 px-4 py-2 text-sm text-danger-fg">
                          翻译失败: {translateError}
                        </div>
                      )}
                      <MarkdownView
                        content={
                          showChinese && readme.chinese
                            ? readme.chinese
                            : (readme.original ?? readme.chinese ?? '')
                        }
                        basePath={repo.localPath}
                      />
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border-default p-8 text-center text-fg-muted">
                      <p>{T.noReadme}</p>
                      <p className="mt-2 text-sm">{T.noReadmeHint}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ContentTabBtn({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`max-w-[12rem] truncate rounded-md px-3 py-1.5 text-xs font-medium transition ${
        active
          ? 'bg-bg-default text-accent-fg shadow-sm'
          : 'text-fg-muted hover:bg-bg-inset hover:text-fg-default'
      }`}
      title={label}
    >
      {label}
    </button>
  )
}

function ToolbarBtn({
  icon: Icon,
  label,
  onClick,
  danger,
  active,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  danger?: boolean
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition hover:bg-bg-inset ${
        danger
          ? 'border-danger-fg/50 text-danger-fg hover:border-danger-fg'
          : active
            ? 'border-accent-fg/50 bg-accent-subtle text-accent-fg'
            : 'border-border-default text-fg-default'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
