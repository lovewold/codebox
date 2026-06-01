/** 从 Electron 拖放事件中提取本地文件夹路径 */
export function extractDroppedFolderPaths(e: React.DragEvent): string[] {
  const paths: string[] = []
  const files = e.dataTransfer?.files
  if (!files?.length) return paths

  for (let i = 0; i < files.length; i++) {
    const file = files[i] as File & { path?: string }
    if (file.path) {
      paths.push(file.path)
    }
  }
  return [...new Set(paths)]
}

export function preventFileDropDefaults(e: React.DragEvent) {
  e.preventDefault()
  e.stopPropagation()
}

export function isFileDragEvent(e: React.DragEvent): boolean {
  return e.dataTransfer?.types?.includes('Files') ?? false
}
