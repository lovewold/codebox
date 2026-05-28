/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          default: 'var(--bg-default)',
          subtle: 'var(--bg-subtle)',
          inset: 'var(--bg-inset)',
        },
        border: {
          default: 'var(--border-default)',
          muted: 'var(--border-muted)',
        },
        fg: {
          default: 'var(--fg-default)',
          muted: 'var(--fg-muted)',
          subtle: 'var(--fg-subtle)',
        },
        accent: {
          fg: 'var(--accent-fg)',
          emphasis: 'var(--accent-emphasis)',
          subtle: 'var(--accent-subtle)',
        },
        success: { fg: 'var(--success-fg)' },
        attention: { fg: 'var(--attention-fg)' },
        danger: { fg: 'var(--danger-fg)' },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', '"Noto Sans"', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', '"SF Mono"', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
