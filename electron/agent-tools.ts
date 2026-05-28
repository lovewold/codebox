import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import { getActiveProfile, getRepos, getSettings } from './store.js'
import { cloneRepository } from './git-service.js'
import { readReadme, scanRepository } from './repo-scanner.js'
import { getGitStatus } from './git-commands.js'

const execFileAsync = promisify(execFile)

// ── Translation cache ──

function hashText(text: string): string {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i)
    hash = ((hash << 5) - hash) + ch
    hash |= 0
  }
  return 'tr_' + hash.toString(36)
}

const translationCache = new Map<string, string>()

export interface ToolDef {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export interface ToolCall {
  name: string
  arguments: Record<string, unknown>
}

export const TOOLS: ToolDef[] = [
  {
    name: 'list_repos',
    description: '列出本地管理的所有仓库，包括名称、路径、语言、Git 状态等信息',
    parameters: {
      type: 'object',
      properties: {
        filter: { type: 'string', description: '可选的过滤关键词，按名称或描述搜索' },
      },
    },
  },
  {
    name: 'get_repo',
    description: '获取指定仓库的详细信息，包括文件列表、README 内容、Git 分支状态',
    parameters: {
      type: 'object',
      properties: {
        repoId: { type: 'string', description: '仓库的 ID' },
      },
      required: ['repoId'],
    },
  },
  {
    name: 'read_file',
    description: '读取仓库中的指定文件内容',
    parameters: {
      type: 'object',
      properties: {
        repoId: { type: 'string', description: '仓库 ID' },
        filePath: { type: 'string', description: '相对于仓库根目录的文件路径' },
      },
      required: ['repoId', 'filePath'],
    },
  },
  {
    name: 'list_files',
    description: '列出仓库目录中的文件和子目录',
    parameters: {
      type: 'object',
      properties: {
        repoId: { type: 'string', description: '仓库 ID' },
        dirPath: { type: 'string', description: '相对于仓库根目录的路径，默认为根目录' },
      },
      required: ['repoId'],
    },
  },
  {
    name: 'search_code',
    description: '在仓库代码中搜索匹配的文本模式',
    parameters: {
      type: 'object',
      properties: {
        repoId: { type: 'string', description: '仓库 ID' },
        pattern: { type: 'string', description: '搜索的文本或正则表达式' },
      },
      required: ['repoId', 'pattern'],
    },
  },
  {
    name: 'execute_shell',
    description:
      '在指定仓库目录中执行终端命令，可用于安装依赖、运行构建、启动服务、执行测试、部署等。命令执行超时时间为 5 分钟。返回 stdout 和 stderr。',
    parameters: {
      type: 'object',
      properties: {
        repoId: { type: 'string', description: '仓库 ID，命令将在此仓库的本地路径下执行' },
        command: { type: 'string', description: '要执行的 shell 命令' },
      },
      required: ['repoId', 'command'],
    },
  },
  {
    name: 'search_github',
    description: '搜索 GitHub 上的开源仓库',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词' },
        language: { type: 'string', description: '编程语言过滤，如 typescript, python, rust' },
        sort: { type: 'string', description: '排序方式: stars, updated, forks' },
      },
      required: ['query'],
    },
  },
  {
    name: 'clone_repo',
    description: '克隆一个 GitHub 仓库到本地工作区',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'GitHub 仓库 URL，如 https://github.com/owner/repo' },
      },
      required: ['url'],
    },
  },
  {
    name: 'translate',
    description: '将英文文本翻译成中文',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: '要翻译的文本' },
      },
      required: ['text'],
    },
  },
  {
    name: 'git_status',
    description: '查看指定仓库的 Git 状态，包括分支、未提交变更、领先/落后远程的提交数',
    parameters: {
      type: 'object',
      properties: {
        repoId: { type: 'string', description: '仓库 ID' },
      },
      required: ['repoId'],
    },
  },
  {
    name: 'git_commit',
    description: '在指定仓库中提交变更',
    parameters: {
      type: 'object',
      properties: {
        repoId: { type: 'string', description: '仓库 ID' },
        message: { type: 'string', description: '提交信息' },
      },
      required: ['repoId', 'message'],
    },
  },
  {
    name: 'deploy_repo',
    description:
      '自动检测项目类型并执行相应的构建和部署命令。支持 Node.js、Python、Rust、Go 等常见项目类型。',
    parameters: {
      type: 'object',
      properties: {
        repoId: { type: 'string', description: '仓库 ID' },
        script: { type: 'string', description: '可选的自定义部署脚本或命令' },
      },
      required: ['repoId'],
    },
  },
]

function findRepo(id: string) {
  const repos = getRepos()
  const repo = repos.find((r) => r.id === id)
  if (!repo) throw new Error(`未找到仓库: ${id}`)
  return repo
}

async function listRepoFiles(dirPath: string): Promise<string> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  const items = entries
    .filter((e) => !e.name.startsWith('.') && e.name !== 'node_modules')
    .slice(0, 50)
    .map((e) => `${e.isDirectory() ? '📁' : '📄'} ${e.name}`)
  return items.join('\n') + (entries.length > 50 ? `\n... 还有 ${entries.length - 50} 个文件` : '')
}

export async function executeTool(call: ToolCall): Promise<string> {
  const { name, arguments: args } = call

  switch (name) {
    case 'list_repos': {
      const repos = getRepos()
      const filter = (args.filter as string)?.toLowerCase()
      const filtered = filter
        ? repos.filter(
            (r) =>
              r.name.toLowerCase().includes(filter) ||
              r.description?.toLowerCase().includes(filter),
          )
        : repos
      if (filtered.length === 0) return '没有找到匹配的仓库'
      return filtered
        .map(
          (r) =>
            `- **${r.name}** (${r.id})\n  路径: ${r.localPath}\n  语言: ${r.language || '未知'}\n  分支: ${r.gitBranch || '?'} | ` +
            `未提交: ${r.uncommittedCount ?? 0} | 领先: ${r.aheadCount ?? 0} | 落后: ${r.behindCount ?? 0}\n  描述: ${r.description || '无'}`,
        )
        .join('\n\n')
    }

    case 'get_repo': {
      const repo = findRepo(args.repoId as string)
      const files = await listRepoFiles(repo.localPath)
      const readme = await readReadme(repo.localPath)
      const status = await getGitStatus(repo.localPath)
      return (
        `**${repo.name}**\n\n` +
        `- 本地路径: ${repo.localPath}\n- 远程: ${repo.remoteUrl || '无'}\n` +
        `- 语言: ${repo.language || '未知'}\n- 描述: ${repo.description || '无'}\n` +
        `- 分支: ${status.branch} | 领先: ${status.ahead} | 落后: ${status.behind}\n` +
        `- 已暂存: ${status.staged.length} | 未暂存: ${status.unstaged.length} | 未跟踪: ${status.untracked.length}\n\n` +
        `**文件列表:**\n${files}\n\n` +
        `**README:**\n${readme ? readme.slice(0, 2000) + (readme.length > 2000 ? '\n...(截断)' : '') : '无 README'}`
      )
    }

    case 'read_file': {
      const repo = findRepo(args.repoId as string)
      const fp = path.join(repo.localPath, args.filePath as string)
      if (!fp.startsWith(path.normalize(repo.localPath))) return '错误: 不允许访问仓库外的路径'
      try {
        const content = await fs.readFile(fp, 'utf-8')
        if (content.length > 5000) return content.slice(0, 5000) + '\n...(文件过长，已截断)'
        return content
      } catch {
        return '错误: 无法读取文件'
      }
    }

    case 'list_files': {
      const repo = findRepo(args.repoId as string)
      const dir = args.dirPath ? path.join(repo.localPath, args.dirPath as string) : repo.localPath
      return listRepoFiles(dir)
    }

    case 'search_code': {
      const repo = findRepo(args.repoId as string)
      const pattern = args.pattern as string
      try {
        const { stdout } = await execFileAsync(
          'git',
          ['-C', repo.localPath, 'grep', '-n', '-i', '--heading', '--break', pattern],
          { timeout: 15000 },
        )
        return stdout.trim().slice(0, 3000) || '未找到匹配内容'
      } catch {
        return '未找到匹配内容或搜索出错'
      }
    }

    case 'execute_shell': {
      const repo = findRepo(args.repoId as string)
      const command = args.command as string
      return new Promise<string>((resolve) => {
        const proc = execFile(
          process.platform === 'win32' ? 'cmd.exe' : '/bin/sh',
          [process.platform === 'win32' ? '/c' : '-c', command],
          { cwd: repo.localPath, timeout: 300000, maxBuffer: 1024 * 1024 },
          (err, stdout, stderr) => {
            if (err && !stdout && !stderr) {
              resolve(`命令执行失败: ${err.message}`)
            } else {
              const out = stdout?.trim() || ''
              const errOut = stderr?.trim() || ''
              const parts: string[] = []
              if (out) parts.push(`**stdout:**\n\`\`\`\n${out.slice(0, 3000)}\n\`\`\``)
              if (errOut) parts.push(`**stderr:**\n\`\`\`\n${errOut.slice(0, 1000)}\n\`\`\``)
              resolve(parts.join('\n\n') || '命令执行完毕（无输出）')
            }
          },
        )
        proc.on('error', (err) => resolve(`命令执行错误: ${err.message}`))
      })
    }

    case 'search_github': {
      const query = encodeURIComponent(args.query as string)
      const lang = args.language ? `+language:${args.language}` : ''
      const sort = (args.sort as string) || 'stars'
      try {
        const res = await fetch(
          `https://api.github.com/search/repositories?q=${query}${lang}&sort=${sort}&per_page=10`,
          { headers: { Accept: 'application/vnd.github.v3+json' } },
        )
        const data = (await res.json()) as {
          items?: { full_name: string; html_url: string; description: string; stargazers_count: number; language: string }[]
        }
        if (!data.items?.length) return '未找到匹配的仓库'
        return data.items
          .map(
            (item) =>
              `- **${item.full_name}** ⭐${item.stargazers_count}\n  ${item.description || '无描述'}\n  语言: ${item.language || '?'} | ${item.html_url}`,
          )
          .join('\n\n')
      } catch (err) {
        return `搜索 GitHub 失败: ${err instanceof Error ? err.message : String(err)}`
      }
    }

    case 'clone_repo': {
      const url = args.url as string
      const { workspaceRoot } = getSettings()
      await fs.mkdir(workspaceRoot, { recursive: true })
      const localPath = await cloneRepository(url, workspaceRoot)
      const scan = await scanRepository(localPath)
      return (
        `仓库已克隆到本地:\n` +
        `- 路径: ${localPath}\n` +
        `- 名称: ${path.basename(localPath)}\n` +
        `- 语言: ${scan.language || '未知'}\n` +
        `- 描述: ${scan.description || '无'}`
      )
    }

    case 'translate': {
      const text = args.text as string
      const key = hashText(text)
      const cached = translationCache.get(key)
      if (cached) return cached

      const profile = getActiveProfile()
      if (!profile || !profile.apiKey) return '未配置 AI 模型，请在设置中配置以使用翻译功能'
      try {
        const res = await fetch(`${profile.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${profile.apiKey}` },
          body: JSON.stringify({
            model: profile.modelName,
            messages: [
              { role: 'system', content: '你是一个专业的翻译助手。将用户输入的文本翻译成简体中文。保留 Markdown 格式和代码块。只输出翻译结果，不要添加额外说明。' },
              { role: 'user', content: text },
            ],
          }),
        })
        const data = (await res.json()) as { choices?: { message: { content: string } }[]; error?: { message: string } }
        if (data.error) return `翻译失败: ${data.error.message}`
        const translated = data.choices?.[0]?.message?.content || '翻译失败'
        translationCache.set(key, translated)
        return translated
      } catch (err) {
        return `翻译请求失败: ${err instanceof Error ? err.message : String(err)}`
      }
    }

    case 'git_status': {
      const repo = findRepo(args.repoId as string)
      const status = await getGitStatus(repo.localPath)
      return (
        `**${repo.name}** - 分支: \`${status.branch}\` | 领先 ${status.ahead} | 落后 ${status.behind}\n\n` +
        `已暂存 (${status.staged.length}):\n${status.staged.map((f) => `  ${f.status} ${f.path}`).join('\n') || '  无'}\n\n` +
        `未暂存 (${status.unstaged.length}):\n${status.unstaged.map((f) => `  ${f.status} ${f.path}`).join('\n') || '  无'}\n\n` +
        `未跟踪 (${status.untracked.length}):\n${status.untracked.map((f) => `  ${f.status} ${f.path}`).join('\n') || '  无'}`
      )
    }

    case 'git_commit': {
      const repo = findRepo(args.repoId as string)
      const message = args.message as string
      const status = await getGitStatus(repo.localPath)
      if (status.staged.length === 0 && status.unstaged.length === 0 && status.untracked.length === 0) {
        return '没有需要提交的变更'
      }
      try {
        await execFileAsync('git', ['-C', repo.localPath, 'add', '-A'], { timeout: 10000 })
        await execFileAsync('git', ['-C', repo.localPath, 'commit', '-m', message], { timeout: 10000 })
        return `提交成功: "${message}"`
      } catch (err) {
        return `提交失败: ${err instanceof Error ? err.message : String(err)}`
      }
    }

    case 'deploy_repo': {
      const repo = findRepo(args.repoId as string)
      if (args.script) {
        return executeTool({
          name: 'execute_shell',
          arguments: { repoId: repo.id, command: args.script as string },
        })
      }
      const files = await fs.readdir(repo.localPath)
      const hasPkgJson = files.includes('package.json')
      const hasCargo = files.includes('Cargo.toml')
      const hasPyProject = files.includes('pyproject.toml')
      const hasGoMod = files.includes('go.mod')

      let deployCmd = ''
      if (hasPkgJson) {
        deployCmd = 'npm install && npm run build'
      } else if (hasCargo) {
        deployCmd = 'cargo build --release'
      } else if (hasPyProject) {
        deployCmd = 'pip install -e .'
      } else if (hasGoMod) {
        deployCmd = 'go build ./...'
      } else {
        deployCmd = 'echo 未检测到已知项目类型，请手动执行部署命令'
      }

      return executeTool({
        name: 'execute_shell',
        arguments: { repoId: repo.id, command: deployCmd },
      })
    }

    default:
      return `未知工具: ${name}`
  }
}
