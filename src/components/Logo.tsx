import { useAppStore } from '../store/useAppStore'

interface Props {
  size?: number
  iconOnly?: boolean
}

export function Logo({ size = 28, iconOnly = false }: Props) {
  const theme = useAppStore((s) => s.theme)

  const gradientId = 'logo-grad'
  const accentStart = theme === 'dark' ? '#58a6ff' : '#0969da'
  const accentEnd = theme === 'dark' ? '#1f6feb' : '#0550ae'

  return (
    <div
      className="flex select-none items-center gap-2.5"
      style={{ height: size + 4 }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="码盒"
        className="shrink-0"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={accentStart} />
            <stop offset="100%" stopColor={accentEnd} />
          </linearGradient>
        </defs>

        {/* background rounded square */}
        <rect
          x="3"
          y="3"
          width="42"
          height="42"
          rx="10.5"
          fill={`url(#${gradientId})`}
        />

        {/* three repo-card bars */}
        <rect x="12" y="14" width="24" height="5" rx="2.5" fill="white" opacity="0.95" />
        <rect x="12" y="22" width="18" height="5" rx="2.5" fill="white" opacity="0.7" />
        <rect x="12" y="30" width="21" height="5" rx="2.5" fill="white" opacity="0.5" />

        {/* git-branch dot on the right side */}
        <circle cx="34" cy="22" r="3.5" fill="white" opacity="0.9" />
        <line
          x1="30"
          y1="22"
          x2="22"
          y2="22"
          stroke="white"
          strokeWidth="1.5"
          opacity="0.4"
        />
        <circle cx="22" cy="30" r="2" fill="white" opacity="0.55" />
        <line
          x1="22"
          y1="24.5"
          x2="22"
          y2="28"
          stroke="white"
          strokeWidth="1.5"
          opacity="0.35"
        />
      </svg>

      {!iconOnly && (
        <span className="text-[15px] font-bold tracking-tight text-fg-default">
          码盒
        </span>
      )}
    </div>
  )
}
