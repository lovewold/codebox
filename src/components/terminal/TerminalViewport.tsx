import { useEffect } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { TerminalPanel } from '../TerminalPanel'

interface Props {
  repoId: string
  repoPath: string
  layoutTick?: number
  onClose?: () => void
}

export function TerminalViewport({ repoId, repoPath, layoutTick = 0, onClose }: Props) {
  const terminalPanelOpen = useAppStore((s) => s.terminalPanelOpen[repoPath] ?? false)
  const ensureTerminalSession = useAppStore((s) => s.ensureTerminalSession)
  const closeTerminalSession = useAppStore((s) => s.closeTerminalSession)

  useEffect(() => {
    if (terminalPanelOpen) {
      ensureTerminalSession(repoId, repoPath)
    }
  }, [terminalPanelOpen, repoId, repoPath, ensureTerminalSession])

  if (!terminalPanelOpen) return null

  return (
    <TerminalPanel
      repoPath={repoPath}
      keepAlive
      layoutTick={layoutTick}
      onClose={onClose ?? (() => closeTerminalSession(repoPath))}
    />
  )
}
