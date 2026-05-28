interface Props {
  stats: { total: number; dirty: number; ahead: number }
  onExample: (text: string) => void
}

const examples = [
  '帮我看看有哪些仓库',
  '搜索 GitHub 上热门的 React 组件库',
  '查看最近有变更的仓库',
]

export function ChatWelcome({ stats, onExample }: Props) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-subtle">
          <svg className="h-8 w-8 text-accent-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-fg-default">仓库管理助手</h1>
        <p className="mt-2 text-sm text-fg-muted">我能帮你管理仓库、搜索项目、执行命令和部署</p>
      </div>

      <div className="mb-6 flex gap-3 text-sm">
        <span className="rounded-lg border border-border-default bg-bg-subtle px-4 py-2">
          本地仓库 <strong className="text-accent-fg">{stats.total}</strong>
        </span>
        {stats.dirty > 0 && (
          <span className="rounded-lg border border-border-default bg-bg-subtle px-4 py-2">
            待提交 <strong className="text-attention-fg">{stats.dirty}</strong>
          </span>
        )}
        {stats.ahead > 0 && (
          <span className="rounded-lg border border-border-default bg-bg-subtle px-4 py-2">
            待推送 <strong className="text-success-fg">{stats.ahead}</strong>
          </span>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {examples.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => onExample(ex)}
            className="rounded-full border border-border-default px-4 py-2 text-sm text-fg-muted transition hover:border-border-default hover:bg-bg-subtle hover:text-fg-default"
          >
            {ex}
          </button>
        ))}
      </div>

      <p className="mt-8 text-xs text-fg-subtle">
        支持 Markdown · 代码高亮 · 终端命令 · 工具调用
      </p>
    </div>
  )
}
