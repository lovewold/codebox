import { hasSingleInstanceLock } from './app-bootstrap.js'
import { configureSessionProxy } from './session-proxy.js'
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  session,
  shell,
} from 'electron'
import path from 'path'
import fs from 'fs/promises'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
import {
  getActiveProfile,
  getCategories,
  getRepos,
  getSettings,
  getTranslationCache,
  setCategories,
  setRepos,
  setSettings,
  setTranslationCache,
  store,
} from './store.js'
import { cloneRepository, initGitRepository, isGitRepository } from './git-service.js'
import { findChineseReadme } from './readme-files.js'
import { readReadme, scanRepository, writeReadmeCN } from './repo-scanner.js'
import type { Category, ModelProfile, RepoRecord } from './types.js'
import { PROVIDER_PRESETS } from './model-provider-presets.js'
import {
  commit,
  getBranches,
  getCommitLog,
  getDiffSummary,
  getGitStatus,
  pull,
  push,
  stageFiles,
  switchBranch,
  unstageFiles,
} from './git-commands.js'
import { runAgentLoop } from './agent-service.js'
import { terminalManager } from './terminal-manager.js'
import { fileTreeWatcher } from './file-tree-watcher.js'
import {
  detectLauncherDefaults,
  launchExternalApp,
} from './launcher-service.js'
import type { LauncherId } from './types.js'
import { upsertRepo } from './repo-registry.js'
import { syncWorkspaceRepos } from './workspace-sync.js'
import {
  createDesktopShortcut,
  createStartMenuShortcut,
  getAppInstallInfo,
  openAppInstallDir,
  openInstaller,
} from './shortcut-service.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow: BrowserWindow | null = null

function createWindow() {
  const iconPath = path.join(__dirname, '..', 'build', 'icon.png')

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 600,
    title: '码盒',
    backgroundColor: '#ffffff',
    icon: nativeImage.createFromPath(iconPath),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: true,
    },
  })

  terminalManager.setWindow(mainWindow)
  fileTreeWatcher.setWindow(mainWindow)

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    if (process.env.CODEBOX_DEVTOOLS === '1') {
      mainWindow.webContents.openDevTools({ mode: 'detach' })
    }
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

function buildMenu() {
  const shortcutSubmenu: Electron.MenuItemConstructorOptions[] = [
    {
      label: '创建桌面快捷方式',
      click: async () => {
        const res = await createDesktopShortcut()
        if (mainWindow) {
          if (res.ok) {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '码盒',
              message: '桌面快捷方式已创建',
              detail: res.path,
            })
          } else {
            dialog.showMessageBox(mainWindow, {
              type: 'warning',
              title: '码盒',
              message: res.error,
            })
          }
        }
      },
    },
    {
      label: '打开应用安装目录',
      click: () => {
        void openAppInstallDir()
      },
    },
  ]

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        { label: '关于 码盒', role: 'about' },
        { type: 'separator' as const },
        ...shortcutSubmenu,
        { type: 'separator' as const },
        { label: '退出', accelerator: 'CmdOrCtrl+Q', role: 'quit' },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: '重做', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' as const },
        { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: '全选', accelerator: 'CmdOrCtrl+A', role: 'selectAll' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { label: '重新加载', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: '强制重新加载', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: '开发者工具', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' as const },
        { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { label: '重置缩放', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
      ],
    },
    {
      label: '窗口',
      submenu: [
        { label: '最小化', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: '关闭', accelerator: 'CmdOrCtrl+W', role: 'close' },
      ],
    },
  ]

  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { label: '关于 码盒', role: 'about' },
        { type: 'separator' as const },
        { label: '退出', accelerator: 'Cmd+Q', role: 'quit' },
      ],
    })
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

app.whenReady().then(async () => {
  if (!hasSingleInstanceLock) return

  // Persist normalized legacy store records (e.g. missing categoryIds)
  setRepos(getRepos())
  setCategories(getCategories())

  const settings = getSettings()
  await fs.mkdir(settings.workspaceRoot, { recursive: true })
  await syncWorkspaceRepos()
  await configureSessionProxy()
  buildMenu()
  createWindow()
})

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

app.on('window-all-closed', () => {
  terminalManager.destroyAll()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  terminalManager.destroyAll()
})

app.on('will-quit', () => {
  terminalManager.destroyAll()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// —— IPC ——

ipcMain.handle('repos:list', () => getRepos())
ipcMain.handle('repos:categories', () => getCategories())
ipcMain.handle('settings:get', () => getSettings())

ipcMain.handle('settings:save', (_e, partial: Partial<ReturnType<typeof getSettings>>) => {
  setSettings(partial)
  return getSettings()
})

ipcMain.handle('launcher:detect-defaults', () => detectLauncherDefaults())

ipcMain.handle('launcher:pick-path', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [
      { name: '可执行文件', extensions: ['exe', 'cmd', 'bat'] },
      { name: '全部', extensions: ['*'] },
    ],
    title: '选择程序路径',
  })
  if (result.canceled || !result.filePaths[0]) return null
  return result.filePaths[0]
})

ipcMain.handle(
  'launcher:open',
  async (
    _e,
    id: LauncherId,
    options?: { repoPath?: string; url?: string; remoteUrl?: string },
  ) => {
    const settings = getSettings()
    return launchExternalApp(id, settings.launcherPaths ?? {}, options ?? {})
  },
)

ipcMain.handle('categories:save', (_e, categories: Category[]) => {
  setCategories(categories)
  return getCategories()
})

ipcMain.handle('categories:add', (_e, category: Category) => {
  const categories = getCategories()
  categories.push(category)
  setCategories(categories)
  return categories
})

ipcMain.handle('categories:update', (_e, id: string, patch: Partial<Category>) => {
  const categories = getCategories()
  const idx = categories.findIndex((c) => c.id === id)
  if (idx < 0) return categories
  categories[idx] = { ...categories[idx], ...patch, id }
  setCategories(categories)
  return categories
})

ipcMain.handle('categories:remove', (_e, id: string) => {
  const categories = getCategories()
  const toRemove = new Set<string>()

  function collectDescendants(pid: string) {
    for (const c of categories) {
      if (c.parentId === pid) {
        toRemove.add(c.id)
        collectDescendants(c.id)
      }
    }
  }

  toRemove.add(id)
  collectDescendants(id)

  const remaining = categories.filter((c) => !toRemove.has(c.id))
  setCategories(remaining)

  // Clean up repo category references
  const repos = getRepos()
  setRepos(repos.map((r) => ({
    ...r,
    categoryIds: (r.categoryIds ?? []).filter((cid) => !toRemove.has(cid)),
  })))

  return remaining
})

ipcMain.handle('repos:scan', async (_e, localPath: string) => {
  return scanRepository(localPath)
})

ipcMain.handle('repos:readme', async (_e, localPath: string) => {
  return readReadme(localPath)
})

ipcMain.handle('repos:watch-files', (_e, repoPath: string) => {
  fileTreeWatcher.watch(repoPath)
})

ipcMain.handle('repos:unwatch-files', (_e, repoPath: string) => {
  fileTreeWatcher.unwatch(repoPath)
})

ipcMain.handle('repos:list-files', async (_e, dirPath: string) => {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    return entries
      .filter(e => !e.name.startsWith('.git') && !e.name.startsWith('node_modules'))
      .map(e => ({
        name: e.name,
        isDirectory: e.isDirectory(),
        path: path.join(dirPath, e.name),
      }))
      .sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
        return a.name.localeCompare(b.name)
      })
  } catch {
    return []
  }
})

ipcMain.handle('repos:read-file', async (_e, filePath: string) => {
  try {
    const stat = await fs.stat(filePath)
    if (stat.size > 500 * 1024) {
      return { ok: false as const, error: '文件过大 (>500KB)' }
    }
    const content = await fs.readFile(filePath, 'utf-8')
    return { ok: true as const, content }
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : String(err) }
  }
})

ipcMain.handle('repos:open-folder', (_e, localPath: string) => {
  shell.openPath(localPath)
})

ipcMain.handle('repos:open-terminal', async (_e, localPath: string) => {
  const { spawn } = await import('child_process')
  if (process.platform === 'win32') {
    spawn('cmd.exe', ['/c', 'start', 'cmd.exe', '/k', `cd /d "${localPath}"`], {
      detached: true,
      shell: true,
    })
  } else {
    spawn(process.env.SHELL || 'bash', [], {
      cwd: localPath,
      detached: true,
    })
  }
})

ipcMain.handle('repos:pick-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
    title: '选择本地仓库文件夹',
  })
  if (result.canceled || !result.filePaths[0]) return null
  return result.filePaths[0]
})

async function pathIsDirectory(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath)
    return stat.isDirectory()
  } catch {
    return false
  }
}

function sanitizeRepoFolderName(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  return cleaned.slice(0, 80) || 'new-repo'
}

async function registerLocalRepo(localPath: string): Promise<RepoRecord> {
  const normalized = path.normalize(localPath.trim())
  if (!normalized) {
    throw new Error('路径不能为空')
  }
  if (!(await pathIsDirectory(normalized))) {
    throw new Error('路径不存在或不是文件夹')
  }

  const repos = getRepos()
  const taken = repos.find((r) => path.normalize(r.localPath) === normalized)
  if (taken) {
    return upsertRepo(normalized, { remoteUrl: taken.remoteUrl, repoKind: taken.repoKind ?? 'local' })
  }

  return upsertRepo(normalized, { repoKind: 'local' })
}

async function relocateRepoRecord(id: string, newLocalPath: string): Promise<RepoRecord> {
  const normalized = path.normalize(newLocalPath.trim())
  if (!normalized) {
    throw new Error('路径不能为空')
  }
  if (!(await pathIsDirectory(normalized))) {
    throw new Error('路径不存在或不是文件夹')
  }

  const repos = getRepos()
  const idx = repos.findIndex((r) => r.id === id)
  if (idx < 0) {
    throw new Error('仓库不存在')
  }

  const old = repos[idx]
  if (old.repoKind === 'cloud' && !(await isGitRepository(normalized))) {
    throw new Error('云端仓库路径必须是 Git 仓库')
  }

  const duplicate = repos.find((r) => r.id !== id && path.normalize(r.localPath) === normalized)
  if (duplicate) {
    throw new Error('该路径已被其他仓库使用')
  }

  if (path.normalize(old.localPath) === normalized) {
    return upsertRepo(normalized, { remoteUrl: old.remoteUrl, repoKind: old.repoKind })
  }

  terminalManager.destroyByRepoPath(old.localPath)
  fileTreeWatcher.unwatch(old.localPath)

  const scan = await scanRepository(normalized)
  const record: RepoRecord = {
    ...old,
    name: path.basename(normalized),
    localPath: normalized,
    description: scan.description ?? old.description,
    language: scan.language ?? old.language,
    readmeExcerpt: scan.readmeExcerpt,
    hasReadme: scan.hasReadme,
    gitBranch: scan.gitBranch,
    gitDirty: scan.gitDirty,
    remoteUrl: scan.remoteUrl ?? old.remoteUrl,
    lastOpenedAt: new Date().toISOString(),
  }

  repos[idx] = record
  setRepos(repos)
  return record
}

ipcMain.handle('repos:sync-workspace', async () => {
  try {
    return { ok: true as const, ...(await syncWorkspaceRepos()) }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false as const, error: message, added: 0, updated: 0, total: 0, paths: [] as string[] }
  }
})

ipcMain.handle('repos:add-local', async () => {
  const folder = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
    title: '添加本地仓库',
  })
  if (folder.canceled || !folder.filePaths[0]) return { ok: false as const, error: '已取消' }
  try {
    const repo = await registerLocalRepo(folder.filePaths[0])
    return { ok: true as const, repo }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false as const, error: message }
  }
})

ipcMain.handle('repos:add-local-from-path', async (_e, localPath: string) => {
  try {
    const repo = await registerLocalRepo(localPath)
    return { ok: true as const, repo }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false as const, error: message }
  }
})

ipcMain.handle('repos:create', async (_e, folderName: string, kind: 'local' | 'cloud' = 'local') => {
  try {
    const settings = getSettings()
    await fs.mkdir(settings.workspaceRoot, { recursive: true })
    const base = sanitizeRepoFolderName(folderName)
    let localPath = path.join(settings.workspaceRoot, base)
    let suffix = 1
    while (await pathIsDirectory(localPath)) {
      localPath = path.join(settings.workspaceRoot, `${base}-${suffix}`)
      suffix += 1
    }
    await fs.mkdir(localPath, { recursive: true })
    if (kind === 'cloud') {
      await initGitRepository(localPath)
    }
    const readmePath = path.join(localPath, 'README.md')
    try {
      await fs.access(readmePath)
    } catch {
      await fs.writeFile(
        readmePath,
        `# ${path.basename(localPath)}\n\n在此编写项目说明。\n`,
        'utf-8',
      )
    }
    const repo = await upsertRepo(localPath, { repoKind: kind })
    return { ok: true as const, repo }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false as const, error: message }
  }
})

ipcMain.handle('repos:relocate', async (_e, id: string, newLocalPath: string) => {
  try {
    const repo = await relocateRepoRecord(id, newLocalPath)
    return { ok: true as const, repo }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false as const, error: message }
  }
})

ipcMain.handle('repos:import-url', async (_e, url: string) => {
  try {
    const settings = getSettings()
    await fs.mkdir(settings.workspaceRoot, { recursive: true })
    const localPath = await cloneRepository(url, settings.workspaceRoot)
    const repo = await upsertRepo(localPath, { remoteUrl: url.trim(), repoKind: 'cloud' })
    return { ok: true as const, repo }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false as const, error: message }
  }
})

ipcMain.handle('repos:update', async (_e, id: string, patch: Partial<RepoRecord>) => {
  const repos = getRepos()
  const idx = repos.findIndex((r) => r.id === id)
  if (idx < 0) return null
  const updated = { ...repos[idx], ...patch, id: repos[idx].id }
  repos[idx] = updated
  setRepos(repos)
  return updated
})

ipcMain.handle('repos:refresh', async (_e, id: string) => {
  const repos = getRepos()
  const repo = repos.find((r) => r.id === id)
  if (!repo) return null
  return upsertRepo(repo.localPath, { remoteUrl: repo.remoteUrl, repoKind: repo.repoKind })
})

ipcMain.handle('repos:refresh-all', async () => {
  await syncWorkspaceRepos()
  const repos = getRepos()
  const updated: RepoRecord[] = []
  for (const r of repos) {
    try {
      updated.push(await upsertRepo(r.localPath, { remoteUrl: r.remoteUrl, repoKind: r.repoKind }))
    } catch {
      updated.push(r)
    }
  }
  setRepos(updated)
  return updated
})

ipcMain.handle('repos:remove', (_e, id: string) => {
  const repos = getRepos().filter((r) => r.id !== id)
  setRepos(repos)
  return true
})

ipcMain.handle('workspace:open', () => {
  shell.openPath(getSettings().workspaceRoot)
})

ipcMain.handle('app:get-install-info', () => getAppInstallInfo())
ipcMain.handle('app:create-desktop-shortcut', () => createDesktopShortcut())
ipcMain.handle('app:create-startmenu-shortcut', () => createStartMenuShortcut())
ipcMain.handle('app:open-install-dir', () => openAppInstallDir())
ipcMain.handle('app:open-installer', () => openInstaller())

ipcMain.handle('store:path', () => store.path)

// —— Git management ——

ipcMain.handle('git:status', (_e, repoPath: string) => getGitStatus(repoPath))
ipcMain.handle('git:log', (_e, repoPath: string, count?: number) => getCommitLog(repoPath, count))
ipcMain.handle('git:branches', (_e, repoPath: string) => getBranches(repoPath))
ipcMain.handle('git:diff-summary', (_e, repoPath: string) => getDiffSummary(repoPath))
ipcMain.handle('git:stage', (_e, repoPath: string, files: string[]) => stageFiles(repoPath, files))
ipcMain.handle('git:unstage', (_e, repoPath: string, files: string[]) => unstageFiles(repoPath, files))
ipcMain.handle('git:commit', (_e, repoPath: string, message: string) => commit(repoPath, message))
ipcMain.handle('git:push', (_e, repoPath: string) => push(repoPath))
ipcMain.handle('git:pull', (_e, repoPath: string) => pull(repoPath))
ipcMain.handle('git:switch-branch', (_e, repoPath: string, branch: string) => switchBranch(repoPath, branch))

// —— Agent ——

ipcMain.handle('agent:chat', async (e, messages: Array<{ role: string; content: string }>) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  if (!win) return
  await runAgentLoop(messages as any, win)
})

ipcMain.handle('agent:abort', () => {
  // abort handled by client-side state reset
})

ipcMain.handle('github:search', async (_e, query: string, page?: number) => {
  try {
    const res = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&page=${page || 1}&per_page=20`,
      { headers: { Accept: 'application/vnd.github.v3+json' } },
    )
    return res.json()
  } catch (err) {
    return { items: [], error: err instanceof Error ? err.message : String(err) }
  }
})

ipcMain.handle('translate:readme', async (_e, text: string, repoPath?: string) => {
  const profile = getActiveProfile()
  if (!profile || !profile.apiKey) return { ok: false as const, error: '请先在设置中配置 AI 模型' }

  // Check cache
  const contentHash = crypto.createHash('md5').update(text).digest('hex')
  if (repoPath) {
    const cached = getTranslationCache(repoPath)
    if (cached && cached.hash === contentHash) {
      // Ensure README-CN.md exists (may have failed to write previously)
      const existing = await findChineseReadme(repoPath)
      if (!existing) {
        await writeReadmeCN(repoPath, cached.translated).catch(() => {})
      }
      return { ok: true as const, text: cached.translated }
    }
  }

  try {
    const res = await fetch(`${profile.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${profile.apiKey}` },
      body: JSON.stringify({
        model: profile.modelName,
        messages: [
          { role: 'system', content: '你是一个专业的翻译助手。将用户输入的 Markdown 文本翻译成简体中文。保留所有 Markdown 格式、代码块、表格和链接结构。只输出翻译结果，不要添加任何额外说明。' },
          { role: 'user', content: text },
        ],
      }),
    })
    const data = (await res.json()) as { choices?: { message: { content: string } }[]; error?: { message: string } }
    if (data.error) return { ok: false as const, error: data.error.message }
    const translated = data.choices?.[0]?.message?.content || ''

    // Save to cache and write README-CN.md to the repo directory
    if (repoPath && translated) {
      setTranslationCache(repoPath, { hash: contentHash, translated })
      try {
        await writeReadmeCN(repoPath, translated)
        console.log('README-CN.md written to:', repoPath)
      } catch (e) {
        console.error('writeReadmeCN failed:', e)
      }
    }

    return { ok: true as const, text: translated }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('translate:readme failed:', message)
    return { ok: false as const, error: message }
  }
})

// —— Model Profiles ——

ipcMain.handle('models:list', () => {
  const s = getSettings()
  return { profiles: s.modelProfiles, activeProfileId: s.activeProfileId }
})

ipcMain.handle('models:presets', () => {
  return PROVIDER_PRESETS
})

ipcMain.handle('models:save', (_e, profile: ModelProfile) => {
  const s = getSettings()
  const profiles = [...s.modelProfiles]
  const idx = profiles.findIndex((p) => p.id === profile.id)

  const now = new Date().toISOString()
  const saved: ModelProfile = {
    ...profile,
    updatedAt: now,
    createdAt: profile.createdAt || now,
  }

  let activeProfileId = s.activeProfileId
  if (idx >= 0) {
    profiles[idx] = saved
  } else {
    profiles.push(saved)
    if (!activeProfileId) {
      activeProfileId = saved.id
    }
  }

  setSettings({ modelProfiles: profiles, activeProfileId })
  return { profiles, activeProfileId }
})

ipcMain.handle('models:delete', (_e, id: string) => {
  const s = getSettings()
  const profiles = s.modelProfiles.filter((p) => p.id !== id)
  let activeProfileId = s.activeProfileId
  if (activeProfileId === id) {
    activeProfileId = profiles.length > 0 ? profiles[0].id : null
  }
  setSettings({ modelProfiles: profiles, activeProfileId })
  return { profiles, activeProfileId }
})

ipcMain.handle('models:set-active', (_e, id: string) => {
  setSettings({ activeProfileId: id })
  return { profiles: getSettings().modelProfiles, activeProfileId: id }
})

// —— Cookie Management ——

ipcMain.handle('cookies:list', async () => {
  try {
    const cookies = await session.defaultSession.cookies.get({})
    const filtered = cookies.filter(
      (c) => c.domain?.includes('github.com') || c.domain?.includes('gitee.com'),
    )
    return filtered.map((c) => ({
      name: c.name,
      domain: c.domain || '',
      value: c.value?.slice(0, 20) + (c.value && c.value.length > 20 ? '...' : '') || '',
      expirationDate: c.expirationDate,
    }))
  } catch {
    return []
  }
})

ipcMain.handle('cookies:clear', async (_e, domain?: string) => {
  try {
    if (domain) {
      const cookies = await session.defaultSession.cookies.get({ domain })
      for (const c of cookies) {
        const url = `https://${c.domain!.replace(/^\./, '')}${c.path || '/'}`
        await session.defaultSession.cookies.remove(url, c.name)
      }
    } else {
      const cookies = await session.defaultSession.cookies.get({})
      for (const c of cookies) {
        if (c.domain?.includes('github.com') || c.domain?.includes('gitee.com')) {
          const url = `https://${c.domain.replace(/^\./, '')}${c.path || '/'}`
          await session.defaultSession.cookies.remove(url, c.name)
        }
      }
    }
    return { ok: true }
  } catch {
    return { ok: false }
  }
})

// —— Terminal ——

ipcMain.handle('terminal:create', (_e, repoPath: string) => {
  try {
    return terminalManager.create(repoPath)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(message)
  }
})

ipcMain.handle('terminal:write', (_e, sessionId: string, data: string) => {
  terminalManager.write(sessionId, data)
})

ipcMain.handle('terminal:resize', (_e, sessionId: string, cols: number, rows: number) => {
  terminalManager.resize(sessionId, cols, rows)
})

ipcMain.handle('terminal:destroy', (_e, sessionId: string) => {
  terminalManager.destroy(sessionId)
})

ipcMain.handle('terminal:destroy-for-repo', (_e, repoPath: string) => {
  terminalManager.destroyByRepoPath(repoPath)
})

ipcMain.handle('terminal:destroy-all', () => {
  terminalManager.destroyAll()
})
