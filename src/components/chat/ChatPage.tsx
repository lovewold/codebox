import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { ChatContextBar } from './ChatContextBar'
import { ModelSelector } from './ModelSelector'
import { ChatMessageBubble } from './ChatMessageBubble'
import { ChatInput } from './ChatInput'
import { ChatStreamingIndicator } from './ChatStreamingIndicator'
import { ChatWelcome } from './ChatWelcome'
import { ChatSidebar, SidebarToggle } from './ChatSidebar'
import {
  useAppStore,
  type ChatMessage,
  type ChatSession,
} from '../../store/useAppStore'

const api = window.electronAPI

function sessionsKey(repoId: string | null) {
  return `app:chat-sessions:${repoId || 'general'}`
}

function messagesKey(sessionId: string) {
  return `app:chat-messages:${sessionId}`
}

function loadSessions(repoId: string | null): ChatSession[] {
  try {
    const raw = localStorage.getItem(sessionsKey(repoId))
    return raw ? (JSON.parse(raw) as ChatSession[]) : []
  } catch { return [] }
}

function saveSessions(repoId: string | null, sessions: ChatSession[]) {
  localStorage.setItem(sessionsKey(repoId), JSON.stringify(sessions))
}

export function ChatPage() {
  const {
    repos,
    chatMessages,
    chatBusy,
    chatContextRepoId,
    chatSessions,
    activeSessionId,
    sidebarCollapsed,
    addChatMessage,
    appendChatContent,
    setChatBusy,
    setChatContextRepo,
    clearChat,
    replaceChatMessages,
    setChatSessions,
    setActiveSessionId,
    setSidebarCollapsed,
    upsertChatSession,
    setSettingsOpen,
    setCurrentTab,
  } = useAppStore()

  const [input, setInput] = useState('')
  const [currentTool, setCurrentTool] = useState<string | null>(null)
  const [progressText, setProgressText] = useState<string | null>(null)
  const [streamingStarted, setStreamingStarted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const pendingChunksRef = useRef<Map<string, string>>(new Map())
  const rafRef = useRef<number>(0)
  const hasMessages = chatMessages.length > 0

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  useEffect(() => {
    if (!hasMessages) inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const sessions = loadSessions(chatContextRepoId)
    setChatSessions(sessions)
    if (!activeSessionId && sessions.length > 0) {
      const latest = sessions[0]
      setActiveSessionId(latest.id)
      const msgs = loadMessages(latest.id)
      if (msgs.length > 0) replaceChatMessages(msgs)
      else clearChat()
    } else if (sessions.length === 0) {
      setActiveSessionId(null)
      clearChat()
    }
  }, [chatContextRepoId])

  useEffect(() => {
    if (!activeSessionId) return
    const msgs = loadMessages(activeSessionId)
    if (msgs.length > 0) replaceChatMessages(msgs)
    else clearChat()
  }, [activeSessionId])

  useEffect(() => {
    if (chatMessages.length > 0 && activeSessionId) {
      const toSave = chatMessages.slice(-50)
      localStorage.setItem(messagesKey(activeSessionId), JSON.stringify(toSave))
      const session = chatSessions.find((s) => s.id === activeSessionId)
      if (session) {
        const updated = { ...session, updatedAt: new Date().toISOString() }
        upsertChatSession(updated)
        saveSessions(chatContextRepoId, chatSessions.map((s) => (s.id === activeSessionId ? updated : s)))
      }
    }
  }, [chatMessages, activeSessionId])

  // IPC Listeners
  useEffect(() => {
    if (!api) return
    const unsubs = [
      api.agent.onProgress(({ text }: { text: string }) => {
        setProgressText(text)
      }),
      api.agent.onDelta(({ content }: { content: string }) => {
        setStreamingStarted(true)
        const msgs = useAppStore.getState().chatMessages
        const last = msgs[msgs.length - 1]
        if (last && last.role === 'assistant') {
          const key = last.id
          const current = pendingChunksRef.current.get(key) || ''
          pendingChunksRef.current.set(key, current + content)
          if (!rafRef.current) {
            rafRef.current = requestAnimationFrame(() => {
              pendingChunksRef.current.forEach((chunk, id) => {
                appendChatContent(id, chunk)
              })
              pendingChunksRef.current.clear()
              rafRef.current = 0
            })
          }
        }
      }),
      api.agent.onToolStart(({ id, name, args }: { id: string; name: string; args: string }) => {
        pendingChunksRef.current.forEach((chunk, msgId) => appendChatContent(msgId, chunk))
        pendingChunksRef.current.clear()
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = 0
        }
        setStreamingStarted(false)
        setCurrentTool(name)
        addChatMessage({
          id: `tool_${id}`,
          role: 'tool',
          content: args,
          toolName: name,
          toolArgs: args,
          toolCallId: id,
          timestamp: new Date().toISOString(),
        })
      }),
      api.agent.onToolResult(({ id, result }: { id: string; result: string }) => {
        setCurrentTool(null)
        const msgId = `tool_${id}`
        const msgs = useAppStore.getState().chatMessages
        const idx = msgs.findIndex((m) => m.id === msgId)
        if (idx >= 0) {
          useAppStore.setState({
            chatMessages: msgs.map((m) =>
              m.id === msgId ? { ...m, toolResult: result } : m,
            ),
          })
        }
      }),
      api.agent.onDone(() => {
        pendingChunksRef.current.forEach((chunk, msgId) => appendChatContent(msgId, chunk))
        pendingChunksRef.current.clear()
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = 0
        }
        setCurrentTool(null)
        setProgressText(null)
        setStreamingStarted(false)
        setChatBusy(false)
      }),
      api.agent.onError(({ message }: { message: string }) => {
        pendingChunksRef.current.clear()
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = 0
        }
        setCurrentTool(null)
        setProgressText(null)
        setStreamingStarted(false)
        addChatMessage({
          id: `error_${Date.now()}`,
          role: 'assistant',
          content: `**错误:** ${message}`,
          timestamp: new Date().toISOString(),
        })
        setChatBusy(false)
      }),
    ]
    return () => {
      unsubs.forEach((u) => u())
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const stats = useMemo(() => {
    const total = repos.length
    const dirty = repos.filter((r) => (r.uncommittedCount ?? 0) > 0 || r.gitDirty).length
    const ahead = repos.filter((r) => (r.aheadCount ?? 0) > 0).length
    return { total, dirty, ahead }
  }, [repos])

  const handleContextChange = useCallback((repoId: string | null) => {
    setChatContextRepo(repoId)
    setActiveSessionId(null)
  }, [setChatContextRepo, setActiveSessionId])

  async function handleSend() {
    const text = input.trim()
    if (!text || chatBusy) return

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }

    const assistantId = `asst_${Date.now()}`

    let sid = activeSessionId
    if (!sid) {
      const session: ChatSession = {
        id: crypto.randomUUID(),
        title: text.slice(0, 30) + (text.length > 30 ? '...' : ''),
        repoId: chatContextRepoId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const updated = [session, ...chatSessions]
      setChatSessions(updated)
      saveSessions(chatContextRepoId, updated)
      setActiveSessionId(session.id)
      sid = session.id
    }

    addChatMessage(userMsg)
    addChatMessage({
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    })
    setInput('')
    setChatBusy(true)
    setStreamingStarted(false)

    const allMsgs = useAppStore.getState().chatMessages.slice(0, -1)
    const apiMessages = allMsgs.map((m) => ({
      role: m.role === 'tool' ? 'tool' : m.role,
      content: m.content,
      ...(m.role === 'tool' && m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
    }))

    await api.agent.chat(apiMessages as Array<{ role: string; content: string }>)
  }

  // ── Sidebar actions ──

  function handleNewChat() {
    setActiveSessionId(null)
    clearChat()
    setInput('')
    setStreamingStarted(false)
  }

  function handleSelectSession(id: string) {
    if (id === activeSessionId) return
    if (activeSessionId && chatMessages.length > 0) {
      localStorage.setItem(messagesKey(activeSessionId), JSON.stringify(chatMessages.slice(-50)))
    }
    setActiveSessionId(id)
    setInput('')
    setStreamingStarted(false)
  }

  function handleDeleteSession(id: string) {
    const updated = chatSessions.filter((s) => s.id !== id)
    setChatSessions(updated)
    saveSessions(chatContextRepoId, updated)
    localStorage.removeItem(messagesKey(id))
    if (id === activeSessionId) {
      setActiveSessionId(null)
      clearChat()
      setInput('')
      setStreamingStarted(false)
    }
  }

  function loadMessages(sessionId: string): ChatMessage[] {
    try {
      const raw = localStorage.getItem(messagesKey(sessionId))
      return raw ? (JSON.parse(raw) as ChatMessage[]) : []
    } catch { return [] }
  }

  return (
    <div className="flex h-full">
      {!sidebarCollapsed ? (
        <ChatSidebar
          sessions={chatSessions}
          activeId={activeSessionId}
          collapsed={false}
          onSelect={handleSelectSession}
          onDelete={handleDeleteSession}
          onNew={handleNewChat}
          onToggle={() => setSidebarCollapsed(true)}
        />
      ) : null}
      <SidebarToggle collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      <div className="flex min-w-0 flex-1 flex-col">
        {!hasMessages ? (
          <div className="flex flex-1 flex-col items-center">
            <div className="mx-auto flex w-full max-w-[800px] flex-1 flex-col justify-center px-6">
              <ChatWelcome stats={stats} onExample={(text) => setInput(text)} />
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Top bar: back button + model + context */}
            <div className="mx-auto flex w-full max-w-[800px] shrink-0 items-center gap-2 px-6 pt-3">
              <button
                type="button"
                onClick={() => setCurrentTab('repos')}
                className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-fg-muted hover:bg-bg-inset hover:text-fg-default transition"
                title="返回仓库列表"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                返回
              </button>
              <ModelSelector onOpenSettings={() => setSettingsOpen(true)} />
              <div className="flex-1 min-w-0">
                <ChatContextBar
                  contextRepoId={chatContextRepoId}
                  onChange={handleContextChange}
                />
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6">
              <div className="mx-auto max-w-[800px] py-4">
                {chatMessages.map((msg) => (
                  <ChatMessageBubble key={msg.id} msg={msg} />
                ))}

                {chatBusy && streamingStarted && (
                  <ChatStreamingIndicator currentTool={currentTool} progressText={progressText} />
                )}
                {chatBusy && !streamingStarted && (
                  <div className="mb-2 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-fg" />
                    <span className="text-xs text-fg-muted">等待模型响应...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <div className="mx-auto w-full max-w-[800px] shrink-0 px-6 pb-4">
              <div className="flex items-center justify-end mb-2">
                <button
                  type="button"
                  onClick={handleDeleteSession.bind(null, activeSessionId!)}
                  disabled={!activeSessionId}
                  className="text-xs text-fg-muted hover:text-danger-fg transition disabled:opacity-40"
                >
                  删除对话
                </button>
              </div>
              <ChatInput
                input={input}
                setInput={setInput}
                onSend={handleSend}
                busy={chatBusy}
              />
            </div>
          </div>
        )}

        {!hasMessages && (
          <div className="mx-auto w-full max-w-[800px] shrink-0 px-6 pb-6">
            <ChatInput
              input={input}
              setInput={setInput}
              onSend={handleSend}
              busy={chatBusy}
            />
          </div>
        )}
      </div>
    </div>
  )
}
