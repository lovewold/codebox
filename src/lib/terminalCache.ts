/** 销毁某仓库在主进程中的 PTY（关闭终端 / 退出应用） */
export function destroyTerminalResources(repoPath: string): void {
  try {
    void window.electronAPI?.terminal.destroyForRepo(repoPath)
  } catch {
    // ignore
  }
}

export function destroyAllTerminalResources(): void {
  try {
    void window.electronAPI?.terminal.destroyAll?.()
  } catch {
    // ignore
  }
}
