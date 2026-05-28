import { MessageSquare, Plus, PanelLeftClose, PanelLeft, Trash2 } from 'lucide-react'
import type { ChatSession } from '../../store/useAppStore'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  return `${Math.floor(days / 30)} 个月前`
}

interface Props {
  sessions: ChatSession[]
  activeId: string | null
  collapsed: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onNew: () => void
  onToggle: () => void
}

export function ChatSidebar({ sessions, activeId, collapsed, onSelect, onDelete, onNew, onToggle }: Props) {
  return (
    <div className={`relative flex shrink-0 flex-col border-r border-border-default bg-bg-subtle transition-all duration-200 ${collapsed ? 'w-0 overflow-hidden border-r-0' : 'w-56'}`}>
      {/* Sidebar content */}
      <div className="flex h-full flex-col" style={{ width: 224 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-3">
          <span className="text-xs font-semibold text-fg-muted">对话记录</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onNew}
              className="rounded-lg p-1.5 text-fg-muted hover:bg-bg-inset hover:text-fg-default transition"
              title="新对话"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onToggle}
              className="rounded-lg p-1.5 text-fg-muted hover:bg-bg-inset hover:text-fg-default transition"
              title="折叠侧边栏"
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {sessions.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <MessageSquare className="mx-auto h-6 w-6 text-fg-subtle" />
              <p className="mt-2 text-xs text-fg-muted">暂无对话记录</p>
              <p className="mt-1 text-xs text-fg-subtle">发送消息后将自动创建</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className="group relative"
              >
                <button
                  type="button"
                  onClick={() => onSelect(session.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    session.id === activeId
                      ? 'bg-accent-subtle text-accent-fg'
                      : 'text-fg-default hover:bg-bg-inset'
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{session.title}</p>
                    <p className="mt-0.5 text-xs text-fg-muted">
                      {timeAgo(session.createdAt)}
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDelete(session.id) }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-fg-muted opacity-0 hover:bg-danger-subtle hover:text-danger-fg group-hover:opacity-100 transition"
                  title="删除对话"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export function SidebarToggle({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="shrink-0 flex items-center justify-center w-10 border-r border-border-default bg-bg-subtle text-fg-muted hover:bg-bg-inset hover:text-fg-default transition"
      title={collapsed ? '展开侧边栏' : '折叠侧边栏'}
    >
      {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
    </button>
  )
}
