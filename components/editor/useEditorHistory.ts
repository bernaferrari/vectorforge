"use client"

import { useCallback, useEffect, useRef } from "react"
import type { EditorSnapshot } from "./EditorModel"
import {
  pushEditorSnapshot,
  rememberRestoredSnapshot,
  stepEditorHistoryBack,
  stepEditorHistoryForward,
} from "./EditorHistory"

export const useEditorHistory = ({
  snapshot,
  canRecord,
  maxSize,
  isInputDragActive,
  onRestore,
}: {
  snapshot: EditorSnapshot
  canRecord: boolean
  maxSize: number
  isInputDragActive: () => boolean
  onRestore: (snapshot: EditorSnapshot) => void
}) => {
  const undoStackRef = useRef<EditorSnapshot[]>([])
  const redoStackRef = useRef<EditorSnapshot[]>([])
  const lastUndoSnapshotKeyRef = useRef("")
  const isRestoringUndoRef = useRef(false)
  const pendingDragSnapshotRef = useRef(false)
  const snapshotRef = useRef(snapshot)
  const onRestoreRef = useRef(onRestore)
  const isInputDragActiveRef = useRef(isInputDragActive)

  snapshotRef.current = snapshot
  onRestoreRef.current = onRestore
  isInputDragActiveRef.current = isInputDragActive

  const restoreSnapshot = useCallback((nextSnapshot: EditorSnapshot) => {
    isRestoringUndoRef.current = true
    rememberRestoredSnapshot(nextSnapshot, lastUndoSnapshotKeyRef)
    onRestoreRef.current(nextSnapshot)
  }, [])

  useEffect(() => {
    if (!canRecord) return

    if (isRestoringUndoRef.current) {
      isRestoringUndoRef.current = false
      return
    }

    if (isInputDragActiveRef.current()) {
      pendingDragSnapshotRef.current = true
      return
    }

    pushEditorSnapshot({
      snapshot,
      undoStackRef,
      redoStackRef,
      lastSnapshotKeyRef: lastUndoSnapshotKeyRef,
      maxSize,
    })
    pendingDragSnapshotRef.current = false
  }, [canRecord, maxSize, snapshot])

  useEffect(() => {
    const flush = () => {
      if (pendingDragSnapshotRef.current && !isInputDragActiveRef.current()) {
        pendingDragSnapshotRef.current = false
        pushEditorSnapshot({
          snapshot: snapshotRef.current,
          undoStackRef,
          redoStackRef,
          lastSnapshotKeyRef: lastUndoSnapshotKeyRef,
          maxSize,
        })
      }
    }
    window.addEventListener("pointerup", flush)
    return () => window.removeEventListener("pointerup", flush)
  }, [maxSize])

  return {
    undo: useCallback(() => {
      const previous = stepEditorHistoryBack(
        undoStackRef,
        redoStackRef,
        maxSize
      )
      if (previous) restoreSnapshot(previous)
    }, [maxSize, restoreSnapshot]),
    redo: useCallback(() => {
      const next = stepEditorHistoryForward(undoStackRef, redoStackRef, maxSize)
      if (next) restoreSnapshot(next)
    }, [maxSize, restoreSnapshot]),
  }
}
