export function isElectronShell(): boolean {
  return typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent)
}

export async function waitForElectronAPI(maxMs = 5000) {
  const started = Date.now()
  while (Date.now() - started < maxMs) {
    if (window.electronAPI) return window.electronAPI
    await new Promise((r) => setTimeout(r, 50))
  }
  return window.electronAPI
}

export function electronUnavailableError(): Error {
  if (isElectronShell()) {
    return new Error(
      'Electron 预加载脚本未加载（window.electronAPI 为空）。请完全退出码盒后，在项目目录重新执行 npm run dev。',
    )
  }
  return new Error(
    '当前在浏览器中打开，无法使用桌面能力。请运行 npm run dev，并使用自动弹出的「码盒」桌面窗口，不要手动打开 localhost 页面。',
  )
}
