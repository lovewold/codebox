import { ChevronDown, ChevronUp } from 'lucide-react'
import { MarkdownView } from '../MarkdownView'
import type { ChatMessage } from '../../store/useAppStore'
import { useState } from 'react'

interface Props {
  msg: ChatMessage
}

export function ChatMessageBubble({ msg }: Props) {
  const [expanded, setExpanded] = useState(false)

  // User message — right aligned, subtle
  if (msg.role === 'user') {
    return (
      <div className="mb-3 flex justify-end">
        <div className="max-w-[75%] rounded-lg bg-bg-inset px-3 py-2 text-sm leading-relaxed text-fg-default">
          {msg.content}
        </div>
      </div>
    )
  }

  // Tool call — compact inline
  if (msg.role === 'tool') {
    return (
      <div className="mb-2">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg-default transition"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          工具: {msg.toolName || '调用'}
        </button>
        {expanded && msg.toolResult && (
          <pre className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap rounded border border-border-default bg-bg-inset p-2 font-mono text-xs leading-relaxed text-fg-muted">
            {msg.toolResult}
          </pre>
        )}
      </div>
    )
  }

  // Assistant message — flat, no bubble
  return (
    <div className="mb-4">
      <div className="text-sm leading-relaxed text-fg-default">
        <MarkdownView content={msg.content} />
      </div>
    </div>
  )
}
