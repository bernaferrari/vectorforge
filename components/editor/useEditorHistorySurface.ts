"use client"

import { useEditorShortcuts } from "./useEditorShortcuts"
import { useEditorSnapshotHistory } from "./useEditorSnapshotHistory"

type UseEditorHistorySurfaceArgs = Parameters<
  typeof useEditorSnapshotHistory
>[0] & {
  onPlayPause: () => void
}

export function useEditorHistorySurface({
  onPlayPause,
  ...historyArgs
}: UseEditorHistorySurfaceArgs) {
  const { undo, redo, openProjectFile, saveProjectFile } =
    useEditorSnapshotHistory(historyArgs)

  useEditorShortcuts({
    onUndo: undo,
    onRedo: redo,
    onPlayPause,
  })

  return { undo, redo, openProjectFile, saveProjectFile }
}
