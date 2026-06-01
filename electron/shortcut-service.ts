import { app, shell } from 'electron'
import fs from 'fs/promises'
import path from 'path'

export interface AppInstallInfo {
  version: string
  productName: string
  execPath: string
  installDir: string
  isPackaged: boolean
  /** 未通过安装包安装（如 win-unpacked 直接运行） */
  isPortable: boolean
  hasDesktopShortcut: boolean
  hasStartMenuShortcut: boolean
  installerPath: string | null
}

const PRODUCT_NAME = '码盒'

function desktopShortcutPath(): string {
  return path.join(app.getPath('desktop'), `${PRODUCT_NAME}.lnk`)
}

function startMenuShortcutPath(): string {
  return path.join(
    app.getPath('appData'),
    'Microsoft',
    'Windows',
    'Start Menu',
    'Programs',
    `${PRODUCT_NAME}.lnk`,
  )
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function findNearbyInstaller(): Promise<string | null> {
  const installDir = path.dirname(process.execPath)
  const searchDirs = [
    installDir,
    path.dirname(installDir),
    path.dirname(path.dirname(installDir)),
  ]

  for (const dir of searchDirs) {
    try {
      const entries = await fs.readdir(dir)
      const setup = entries.find(
        (name) => name.endsWith('.exe') && /setup/i.test(name) && name.includes(PRODUCT_NAME),
      )
      if (setup) {
        return path.normalize(path.join(dir, setup))
      }
    } catch {
      /* continue */
    }
  }
  return null
}

function isPortableInstall(installDir: string): boolean {
  const lower = installDir.toLowerCase()
  return lower.includes('win-unpacked') || lower.includes('release-build')
}

export async function getAppInstallInfo(): Promise<AppInstallInfo> {
  const execPath = process.execPath
  const installDir = path.dirname(execPath)
  const desktop = desktopShortcutPath()
  const startMenu = startMenuShortcutPath()

  return {
    version: app.getVersion(),
    productName: PRODUCT_NAME,
    execPath,
    installDir,
    isPackaged: app.isPackaged,
    isPortable: app.isPackaged ? isPortableInstall(installDir) : true,
    hasDesktopShortcut: await fileExists(desktop),
    hasStartMenuShortcut: await fileExists(startMenu),
    installerPath: app.isPackaged ? await findNearbyInstaller() : null,
  }
}

function shortcutOptions() {
  return {
    target: process.execPath,
    cwd: path.dirname(process.execPath),
    description: `${PRODUCT_NAME} - Vibe Coding 项目管理`,
    icon: process.execPath,
    iconIndex: 0,
    appUserModelId: 'com.codebox.app',
  }
}

export async function createDesktopShortcut(): Promise<
  { ok: true; path: string } | { ok: false; error: string }
> {
  if (!app.isPackaged) {
    return { ok: false, error: '开发模式下请使用 npm run dev 启动，无法创建正式快捷方式' }
  }
  if (process.platform !== 'win32') {
    return { ok: false, error: '当前仅支持 Windows 桌面快捷方式' }
  }

  const shortcutPath = desktopShortcutPath()
  const ok = shell.writeShortcutLink(shortcutPath, shortcutOptions())
  if (!ok) {
    return { ok: false, error: '创建桌面快捷方式失败，请尝试以管理员身份运行' }
  }
  return { ok: true, path: shortcutPath }
}

export async function createStartMenuShortcut(): Promise<
  { ok: true; path: string } | { ok: false; error: string }
> {
  if (!app.isPackaged) {
    return { ok: false, error: '开发模式下无法创建开始菜单快捷方式' }
  }
  if (process.platform !== 'win32') {
    return { ok: false, error: '当前仅支持 Windows' }
  }

  const shortcutPath = startMenuShortcutPath()
  const ok = shell.writeShortcutLink(shortcutPath, shortcutOptions())
  if (!ok) {
    return { ok: false, error: '创建开始菜单快捷方式失败' }
  }
  return { ok: true, path: shortcutPath }
}

export async function openAppInstallDir(): Promise<void> {
  shell.showItemInFolder(process.execPath)
}

export async function openInstaller(): Promise<{ ok: true } | { ok: false; error: string }> {
  const info = await getAppInstallInfo()
  if (!info.installerPath) {
    return {
      ok: false,
      error: '未找到安装程序。请在 release 目录中双击「码盒 Setup *.exe」完成安装。',
    }
  }
  const err = await shell.openPath(info.installerPath)
  if (err) {
    return { ok: false, error: err }
  }
  return { ok: true }
}
