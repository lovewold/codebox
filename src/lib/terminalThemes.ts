import type { ITheme } from '@xterm/xterm'

/** 内置终端配色方案 */
export type TerminalThemeId = 'warm' | 'balanced' | 'classic' | 'soft-light'

export const TERMINAL_THEME_OPTIONS: {
  id: TerminalThemeId
  label: string
  description: string
}[] = [
  {
    id: 'warm',
    label: '暖色橙调',
    description: '推荐 Claude Code 等工具，红色系显示为橙色',
  },
  {
    id: 'balanced',
    label: '均衡深色',
    description: 'GitHub 风格，红绿蓝对比清晰',
  },
  {
    id: 'classic',
    label: '经典绿屏',
    description: '黑底绿字，复古终端风格',
  },
  {
    id: 'soft-light',
    label: '柔和浅色',
    description: '浅色背景，适合明亮环境',
  },
]

const WARM_THEME: ITheme = {
  background: '#0d1117',
  foreground: '#e6edf3',
  cursor: '#da7756',
  selectionBackground: '#da775644',
  black: '#21262d',
  red: '#da7756',
  green: '#3fb950',
  yellow: '#d29922',
  blue: '#58a6ff',
  magenta: '#bc8cff',
  cyan: '#39c5cf',
  white: '#e6edf3',
  brightBlack: '#6e7681',
  brightRed: '#e8956c',
  brightGreen: '#56d364',
  brightYellow: '#e3b341',
  brightBlue: '#79c0ff',
  brightMagenta: '#d2a8ff',
  brightCyan: '#56d4dd',
  brightWhite: '#ffffff',
}

const BALANCED_THEME: ITheme = {
  background: '#0d1117',
  foreground: '#e6edf3',
  cursor: '#58a6ff',
  selectionBackground: '#388bfd44',
  black: '#21262d',
  red: '#f85149',
  green: '#3fb950',
  yellow: '#d29922',
  blue: '#58a6ff',
  magenta: '#bc8cff',
  cyan: '#39c5cf',
  white: '#e6edf3',
  brightBlack: '#6e7681',
  brightRed: '#ff7b72',
  brightGreen: '#56d364',
  brightYellow: '#e3b341',
  brightBlue: '#79c0ff',
  brightMagenta: '#d2a8ff',
  brightCyan: '#56d4dd',
  brightWhite: '#ffffff',
}

const CLASSIC_THEME: ITheme = {
  background: '#0a0a0a',
  foreground: '#33ff33',
  cursor: '#33ff33',
  selectionBackground: '#33ff3333',
  black: '#000000',
  red: '#cc5555',
  green: '#33ff33',
  yellow: '#cccc33',
  blue: '#5555cc',
  magenta: '#cc55cc',
  cyan: '#33cccc',
  white: '#cccccc',
  brightBlack: '#555555',
  brightRed: '#ff5555',
  brightGreen: '#55ff55',
  brightYellow: '#ffff55',
  brightBlue: '#5555ff',
  brightMagenta: '#ff55ff',
  brightCyan: '#55ffff',
  brightWhite: '#ffffff',
}

const SOFT_LIGHT_THEME: ITheme = {
  background: '#f6f8fa',
  foreground: '#1f2328',
  cursor: '#0969da',
  selectionBackground: '#0969da33',
  black: '#24292f',
  red: '#cf222e',
  green: '#1a7f37',
  yellow: '#9a6700',
  blue: '#0969da',
  magenta: '#8250df',
  cyan: '#1b7c83',
  white: '#6e7781',
  brightBlack: '#57606a',
  brightRed: '#a40e26',
  brightGreen: '#116329',
  brightYellow: '#633c01',
  brightBlue: '#0550ae',
  brightMagenta: '#6639ba',
  brightCyan: '#3192aa',
  brightWhite: '#1f2328',
}

export function getTerminalTheme(id: TerminalThemeId | undefined): ITheme {
  switch (id) {
    case 'balanced':
      return BALANCED_THEME
    case 'classic':
      return CLASSIC_THEME
    case 'soft-light':
      return SOFT_LIGHT_THEME
    case 'warm':
    default:
      return WARM_THEME
  }
}

export function normalizeTerminalThemeId(
  value: string | undefined | null,
): TerminalThemeId {
  if (value && TERMINAL_THEME_OPTIONS.some((o) => o.id === value)) {
    return value as TerminalThemeId
  }
  return 'warm'
}
