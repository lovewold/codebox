import { BrowserWindow } from 'electron'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs/promises'
import path from 'path'
import { getActiveProfile, getRepos } from './store.js'

const MAX_TOKENS = 64000
const API_TIMEOUT_MS = 180_000
const SYSTEM_PROMPT_MAX_CHARS = 20000

// ── Strip hallucinated tool-call syntax from model output ──

function sanitizeChunk(text: string): string {
  return text
    .replace(/<tool_call>\s*[\s\S]*?(<\/tool_call>|$)/gi, '')
    .replace(/<function[= ][\s\S]*?(<\/function>|$)/gi, '')
    .replace(/<parameter[= ][\s\S]*?(<\/parameter>|$)/gi, '')
    .replace(/```xml\s*<tool[\s\S]*?```/gi, '')
}

// ── Repo snapshot: gather key files so AI can answer without tools ──

const KEY_FILES = [
  'package.json',
  'Cargo.toml',
  'go.mod',
  'pyproject.toml',
  'requirements.txt',
  'Pipfile',
  'Gemfile',
  'composer.json',
  'CMakeLists.txt',
  'Makefile',
  'Dockerfile',
  'docker-compose.yml',
  'tsconfig.json',
  'vite.config.ts',
  'vite.config.js',
  'next.config.js',
  'next.config.ts',
  'tailwind.config.ts',
  'tailwind.config.js',
  '.eslintrc.js',
  '.eslintrc.cjs',
  '.eslintrc.json',
  'eslint.config.js',
  'eslint.config.ts',
]

const README_NAMES = ['README.md', 'readme.md', 'Readme.md', 'README.MD', 'README']

async function listTopFiles(dirPath: string): Promise<string> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    const filtered = entries
      .filter((e) => !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== 'target')
      .slice(0, 40)
    const dirs = filtered.filter((e) => e.isDirectory()).map((e) => `${e.name}/`)
    const files = filtered.filter((e) => e.isFile()).map((e) => e.name)
    const lines = [...dirs, ...files].slice(0, 30)
    if (entries.length > 40) lines.push(`... 还有 ${entries.length - 40} 个文件/目录`)
    return lines.join('\n')
  } catch {
    return '(无法读取)'
  }
}

async function readKeyFiles(dirPath: string): Promise<string> {
  const results: string[] = []
  for (const name of KEY_FILES) {
    try {
      const fp = path.join(dirPath, name)
      await fs.access(fp)
      const content = await fs.readFile(fp, 'utf-8')
      const truncated = content.length > 3000
        ? content.slice(0, 3000) + '\n...(截断)'
        : content
      results.push(`### ${name}\n\`\`\`\n${truncated}\n\`\`\``)
    } catch {
      // file doesn't exist
    }
  }
  return results.join('\n\n')
}

async function readReadmeFile(dirPath: string): Promise<string> {
  for (const name of README_NAMES) {
    try {
      const fp = path.join(dirPath, name)
      const content = await fs.readFile(fp, 'utf-8')
      return content.length > 2000
        ? content.slice(0, 2000) + '\n...(截断)'
        : content
    } catch {
      // try next name
    }
  }
  return ''
}

async function buildRepoSnapshots(): Promise<string> {
  const repos = getRepos()
  if (repos.length === 0) return '暂无仓库'

  const parts: string[] = []
  let totalChars = 0
  const limit = SYSTEM_PROMPT_MAX_CHARS

  for (const r of repos) {
    const header = `\n## ${r.name} (${r.id})\n- 路径: \`${r.localPath}\`\n- 语言: ${r.language || '未知'} | 分支: ${r.gitBranch || '?'}`
    let body = header

    const readme = await readReadmeFile(r.localPath)
    if (readme) {
      body += `\n\n### README\n${readme}`
    }

    const files = await listTopFiles(r.localPath)
    body += `\n\n### 文件结构\n\`\`\`\n${files}\n\`\`\``

    const keyFiles = await readKeyFiles(r.localPath)
    if (keyFiles) {
      body += `\n\n### 关键配置文件\n${keyFiles}`
    }

    if (totalChars + body.length > limit) {
      const remaining = limit - totalChars
      if (remaining > 200) {
        parts.push(body.slice(0, remaining) + '\n...(系统提示已达上限，后续仓库省略)')
      }
      break
    }

    parts.push(body)
    totalChars += body.length
  }

  return parts.join('\n')
}

let cachedSnapshot = ''
let cachedSnapshotTime = 0
const CACHE_TTL = 30_000 // 30 seconds

async function buildSystemPrompt(): Promise<string> {
  const now = Date.now()
  if (cachedSnapshot && now - cachedSnapshotTime < CACHE_TTL) {
    return promptFromSnapshot(cachedSnapshot)
  }

  try {
    const snap = await buildRepoSnapshots()
    cachedSnapshot = snap
    cachedSnapshotTime = now
    return promptFromSnapshot(snap)
  } catch {
    return promptFromSnapshot(cachedSnapshot || '暂无仓库')
  }
}

function promptFromSnapshot(snapshot: string): string {
  return `你是码盒的智能仓库管理助手，运行在用户的本地桌面应用中。码盒是一个面向 Vibe Coding 的本地仓库管理器，帮助用户收纳、浏览、理解从 GitHub 克隆的创意项目。

你可以帮助用户解答关于代码、Git、项目管理等方面的问题。
你有每个仓库的文件结构和关键配置文件内容，可以据此直接回答技术栈相关的问题。

**重要**: 你无法执行终端命令、无法读写文件。你只能基于下面提供的仓库信息来回答。
如果信息不足以回答用户的问题，请直接告诉用户你需要更多信息，而不要说你"去看一下"或假装能访问文件。

## 当前本地仓库
${snapshot}

## 回复规则
- 使用中文回复
- 使用 Markdown 格式化输出
- 回答简洁、直接、有帮助
- 不要编造你无法获取的信息
- 不要假装你能访问文件系统`
}

// ── OpenAI-compatible types ──

interface StreamChoice {
  index: number
  delta: { content?: string }
  finish_reason: string | null
}

// ── Main entry point ──

export async function runAgentLoop(
  messages: Array<{ role: string; content: string }>,
  win: BrowserWindow,
): Promise<void> {
  const profile = getActiveProfile()
  if (!profile || !profile.apiKey) {
    win.webContents.send('agent:error', { message: '请先在设置中配置 AI 模型' })
    win.webContents.send('agent:done')
    return
  }

  if (profile.provider === 'anthropic') {
    await runAnthropicChat(messages, win, profile.apiKey, profile.baseUrl, profile.modelName)
  } else {
    await runOpenAIChat(messages, win, profile.apiKey, profile.baseUrl, profile.modelName)
  }
}

// ═══════════════════════════════════════════
// Anthropic SDK — 纯流式聊天
// ═══════════════════════════════════════════

async function runAnthropicChat(
  messages: Array<{ role: string; content: string }>,
  win: BrowserWindow,
  apiKey: string,
  baseUrl: string,
  model: string,
): Promise<void> {
  const client = new Anthropic({ apiKey, baseURL: baseUrl })

  const conversation: Anthropic.MessageParam[] = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
    .slice(-50)

  const systemPrompt = await buildSystemPrompt()

  try {
    const stream = client.messages.stream({
      model,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: conversation,
    })

    let firstToken = false
    stream.on('text', (textDelta) => {
      const cleaned = sanitizeChunk(textDelta)
      if (!cleaned) return
      if (!firstToken) {
        firstToken = true
        win.webContents.send('agent:progress', { text: '模型正在回复...' })
      }
      win.webContents.send('agent:delta', { content: cleaned })
    })

    stream.on('error', (err) => {
      win.webContents.send('agent:error', { message: `流式传输错误: ${err.message}` })
    })

    const timerRef: { current: ReturnType<typeof setTimeout> | null } = { current: null }
    const timeoutPromise = new Promise<never>((_, reject) => {
      timerRef.current = setTimeout(
        () => reject(new Error(`请求超时 (${API_TIMEOUT_MS / 1000}s)`)),
        API_TIMEOUT_MS,
      )
    })

    try {
      await Promise.race([stream.finalMessage(), timeoutPromise])
      clearTimeout(timerRef.current!)
    } catch (err) {
      clearTimeout(timerRef.current!)
      if (err instanceof Error && err.message.includes('超时')) {
        win.webContents.send('agent:error', {
          message: `API 请求超时 (${API_TIMEOUT_MS / 1000}s)，模型响应时间过长，请重试`,
        })
      } else {
        win.webContents.send('agent:error', {
          message: `流式传输中断: ${err instanceof Error ? err.message : String(err)}`,
        })
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    win.webContents.send('agent:error', { message: `Anthropic API 错误: ${msg}` })
  }

  win.webContents.send('agent:done')
}

// ═══════════════════════════════════════════
// OpenAI-compatible — 纯流式聊天
// ═══════════════════════════════════════════

async function runOpenAIChat(
  messages: Array<{ role: string; content: string }>,
  win: BrowserWindow,
  apiKey: string,
  baseUrl: string,
  model: string,
): Promise<void> {
  const systemPrompt = await buildSystemPrompt()
  const systemMsg = { role: 'system' as const, content: systemPrompt }
  const chatMessages = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-50)
  const body = [systemMsg, ...chatMessages]

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: body,
        stream: true,
        max_tokens: MAX_TOKENS,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const err = await response.text()
      win.webContents.send('agent:error', { message: `API 请求失败 (${response.status}): ${err}` })
      win.webContents.send('agent:done')
      return
    }

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let firstChunk = false

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue
        const jsonStr = trimmed.slice(6)
        if (jsonStr === '[DONE]') continue

        try {
          const chunk = JSON.parse(jsonStr) as { choices: StreamChoice[] }
          const content = chunk.choices?.[0]?.delta?.content
          if (!content) continue

          const cleaned = sanitizeChunk(content)
          if (!cleaned) continue

          if (!firstChunk) {
            firstChunk = true
            win.webContents.send('agent:progress', { text: '模型正在回复...' })
          }
          win.webContents.send('agent:delta', { content: cleaned })
        } catch { /* skip malformed JSON */ }
      }
    }
  } catch (err) {
    const isTimeout = err instanceof DOMException && err.name === 'AbortError'
    win.webContents.send('agent:error', {
      message: isTimeout
        ? `API 请求超时 (${API_TIMEOUT_MS / 1000}s)，模型响应时间过长，请重试`
        : `连接失败: ${err instanceof Error ? err.message : String(err)}`,
    })
  }

  win.webContents.send('agent:done')
}
