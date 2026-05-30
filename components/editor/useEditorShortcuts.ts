import { useEffect } from "react"
import { isEditableShortcutTarget } from "./EditorModel"

export const useEditorShortcuts = ({
  onUndo,
  onRedo,
  onPlayPause,
}: {
  onUndo: () => void
  onRedo: () => void
  onPlayPause: () => void
}) => {
  useEffect(() => {
    const handleEditorShortcut = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return
      if (isEditableShortcutTarget(event.target)) return

      const key = event.key.toLowerCase()
      const commandOrControl = event.metaKey || event.ctrlKey
      const isRedoShortcut =
        commandOrControl && event.shiftKey && !event.altKey && key === "z"
      if (isRedoShortcut) {
        event.preventDefault()
        onRedo()
        return
      }

      const isUndoShortcut =
        commandOrControl && !event.shiftKey && !event.altKey && key === "z"
      if (isUndoShortcut) {
        event.preventDefault()
        onUndo()
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.code === "Space") {
        event.preventDefault()
        onPlayPause()
      }
    }

    window.addEventListener("keydown", handleEditorShortcut)
    return () => window.removeEventListener("keydown", handleEditorShortcut)
  }, [onPlayPause, onRedo, onUndo])
}
