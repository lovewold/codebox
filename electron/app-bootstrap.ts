/**
 * 必须在 main 进程其它模块（尤其 electron-store）之前 import。
 * 缓解 Windows 下 Chromium「Unable to move the cache / 拒绝访问 0x5」。
 */
import { app } from 'electron'
import fs from 'fs'
import path from 'path'

const USER_DATA_DIR = 'codebox-mahe'

function ensureDir(dir: string) {
  try {
    fs.mkdirSync(dir, { recursive: true })
  } catch {
    /* ignore */
  }
}

if (!app.isReady()) {
  const userData = path.join(app.getPath('appData'), USER_DATA_DIR)
  app.setPath('userData', userData)
  ensureDir(userData)

  const cacheDir = path.join(userData, 'browser-cache')
  ensureDir(cacheDir)
  app.commandLine.appendSwitch('disk-cache-dir', cacheDir)

  // 避免 GPU 着色器磁盘缓存迁移失败（Windows 常见）
  app.commandLine.appendSwitch('disable-gpu-shader-disk-cache')

  if (process.env.VITE_DEV_SERVER_URL) {
    app.commandLine.appendSwitch('disable-http-cache')
  }

  // 减少启动时对 Google 等后台服务的 HTTPS 请求（常见 SSL handshake failed 日志来源）
  app.commandLine.appendSwitch('disable-background-networking')
}

/** 返回 false 表示已有实例在运行，当前进程应退出 */
export const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  app.quit()
}
