interface Props {
  currentTool: string | null
  progressText: string | null
}

export function ChatStreamingIndicator({ currentTool, progressText }: Props) {
  const label = progressText || (currentTool ? `正在执行: ${currentTool}` : '思考中...')
  return (
    <div className="mb-2 flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-fg" />
      <span className="text-xs text-fg-muted">{label}</span>
    </div>
  )
}
