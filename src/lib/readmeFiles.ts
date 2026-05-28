/** 与 electron/readme-files.ts 保持一致的文件名判断（供渲染进程使用） */

const CHINESE_README_NAMES = [
  'README-CN.md',
  'README_CN.md',
  'readme-cn.md',
  'readme_cn.md',
  'README.zh-CN.md',
  'README.zh.md',
  'README_ZH.md',
  'README_zh.md',
]

const CHINESE_README_RE =
  /^readme([-._\s]?(zh|cn)|[-.]zh[-.]?cn|[-._]zh|[-._]cn)([-.]?(md|markdown))?$/i

export function isChineseReadmeFileName(fileName: string): boolean {
  const lower = fileName.toLowerCase()
  if (lower === 'readme.md' || lower === 'readme') return false
  if (CHINESE_README_NAMES.some((n) => n.toLowerCase() === lower)) return true
  return CHINESE_README_RE.test(fileName)
}

export function isPrimaryReadmeFileName(fileName: string): boolean {
  if (isChineseReadmeFileName(fileName)) return false
  const primary = ['README.md', 'readme.md', 'Readme.md', 'README.MD', 'README']
  return primary.some((n) => n.toLowerCase() === fileName.toLowerCase())
}
