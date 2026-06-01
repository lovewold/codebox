import { useCallback, useState } from 'react'
import {
  extractDroppedFolderPaths,
  isFileDragEvent,
  preventFileDropDefaults,
} from '../lib/folderDrop'

interface Options {
  onDropPaths: (paths: string[]) => void | Promise<void>
  disabled?: boolean
}

export function useFolderDrop({ onDropPaths, disabled = false }: Options) {
  const [dragOver, setDragOver] = useState(false)

  const onDragEnter = useCallback(
    (e: React.DragEvent) => {
      if (disabled || !isFileDragEvent(e)) return
      preventFileDropDefaults(e)
      setDragOver(true)
    },
    [disabled],
  )

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      if (disabled || !isFileDragEvent(e)) return
      preventFileDropDefaults(e)
      e.dataTransfer.dropEffect = 'copy'
      setDragOver(true)
    },
    [disabled],
  )

  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setDragOver(false)
  }, [])

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      preventFileDropDefaults(e)
      setDragOver(false)
      if (disabled) return
      const paths = extractDroppedFolderPaths(e)
      if (paths.length > 0) {
        await onDropPaths(paths)
      }
    },
    [disabled, onDropPaths],
  )

  return {
    dragOver,
    dropHandlers: {
      onDragEnter,
      onDragOver,
      onDragLeave,
      onDrop,
    },
  }
}
