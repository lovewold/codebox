import { ArrowLeft } from 'lucide-react'

interface Props {
  label?: string
  onClick: () => void
  className?: string
}

export function BackNavButton({ label = '返回列表', onClick, className = '' }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex items-center gap-2 rounded-full border border-border-default bg-bg-subtle/90 px-3 py-1.5 text-sm font-medium text-fg-default shadow-sm backdrop-blur-sm transition hover:border-accent-fg/40 hover:bg-bg-inset hover:text-accent-fg active:scale-[0.98] ${className}`}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-bg-inset text-fg-muted transition group-hover:bg-accent-subtle group-hover:text-accent-fg">
        <ArrowLeft className="h-3.5 w-3.5" />
      </span>
      <span>{label}</span>
    </button>
  )
}
