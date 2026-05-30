import { useEffect, useRef } from "react"
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
  const callbacksRef = useRef({ onUndo, onRedo, onPlayPause })
  callbacksRef.current = { onUndo, onRedo, onPlayPause }

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
        callbacksRef.current.onRedo()
        return
      }

      const isUndoShortcut =
        commandOrControl && !event.shiftKey && !event.altKey && key === "z"
      if (isUndoShortcut) {
        event.preventDefault()
        callbacksRef.current.onUndo()
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.code === "Space") {
        event.preventDefault()
        callbacksRef.current.onPlayPause()
      }
    }

    window.addEventListener("keydown", handleEditorShortcut)
    return () => window.removeEventListener("keydown", handleEditorShortcut)
  }, [])
}
