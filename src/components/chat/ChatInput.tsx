import { useEffect, useRef, useState } from 'react'
import { Loader2, SendHorizontal, AtSign } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

interface Props {
  input: string
  setInput: (v: string) => void
  onSend: () => void
  busy: boolean
}

export function ChatInput({ input, setInput, onSend, busy }: Props) {
  const repos = useAppStore((s) => s.repos)
  const chatContextRepoId = useAppStore((s) => s.chatContextRepoId)
  const setChatContextRepo = useAppStore((s) => s.setChatContextRepo)
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mentionRef = useRef<HTMLDivElement>(null)

  // Detect @ mention
  useEffect(() => {
    const cursorPos = textareaRef.current?.selectionStart ?? input.length
    const textBefore = input.slice(0, cursorPos)
    const match = textBefore.match(/@(\S*)$/)
    if (match) {
      setMentionOpen(true)
      setMentionFilter(match[1] || '')
    } else {
      setMentionOpen(false)
    }
  }, [input])

  // Close mention on outside click
  useEffect(() => {
    if (!mentionOpen) return
    const handler = (e: MouseEvent) => {
      if (mentionRef.current && !mentionRef.current.contains(e.target as Node)) {
        setMentionOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [mentionOpen])

  const filtered = repos.filter((r) =>
    r.name.toLowerCase().includes(mentionFilter.toLowerCase()),
  )

  function insertMention(repoName: string, repoId: string) {
    const cursorPos = textareaRef.current?.selectionStart ?? input.length
    const textBefore = input.slice(0, cursorPos)
    const textAfter = input.slice(cursorPos)
    const atIdx = textBefore.lastIndexOf('@')
    const newText = textBefore.slice(0, atIdx) + `@${repoName} ` + textAfter
    setInput(newText)
    setMentionOpen(false)
    setChatContextRepo(repoId)
    // Refocus textarea
    setTimeout(() => {
      textareaRef.current?.focus()
      const newPos = atIdx + repoName.length + 2
      textareaRef.current?.setSelectionRange(newPos, newPos)
    }, 0)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey && !mentionOpen) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className="relative shrink-0">
      {/* Mention popover */}
      {mentionOpen && filtered.length > 0 && (
        <div
          ref={mentionRef}
          className="absolute bottom-full left-3 z-30 mb-1 w-64 rounded-xl border border-border-default bg-bg-default shadow-lg"
        >
          <div className="max-h-40 overflow-y-auto p-1">
            {filtered.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => insertMention(r.name, r.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                  r.id === chatContextRepoId
                    ? 'bg-accent-subtle text-accent-fg'
                    : 'text-fg-default hover:bg-bg-subtle'
                }`}
              >
                <AtSign className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate font-medium">{r.name}</span>
                {r.language && (
                  <span className="shrink-0 text-xs text-fg-muted">{r.language}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input row */}
      <div className="rounded-2xl border border-border-default bg-bg-subtle px-4 py-3 shadow-sm transition focus-within:border-accent-fg focus-within:shadow-md">
        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息，Enter 发送，Shift+Enter 换行，@选择仓库..."
            rows={2}
            className="min-h-[40px] flex-1 resize-none bg-transparent text-sm text-fg-default outline-none placeholder:text-fg-subtle"
            disabled={busy}
          />
          <button
            type="button"
            onClick={onSend}
            disabled={busy || !input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center self-end rounded-xl bg-accent-emphasis text-white transition hover:opacity-90 disabled:opacity-40"
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <SendHorizontal className="h-5 w-5" />
            )}
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-fg-subtle">
            @ 选择仓库 · Enter 发送 · Shift+Enter 换行
          </span>
          <span className="text-xs text-fg-subtle">
            {input.length > 0 && `${input.length} 字`}
          </span>
        </div>
      </div>
    </div>
  )
}
