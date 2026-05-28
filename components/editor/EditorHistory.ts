import type { EditorSnapshot } from "./EditorModel"

type RefCell<T> = { current: T }

export const editorSnapshotKey = (snapshot: EditorSnapshot) =>
  JSON.stringify(snapshot)

export const rememberRestoredSnapshot = (
  snapshot: EditorSnapshot,
  lastSnapshotKeyRef: RefCell<string>
) => {
  lastSnapshotKeyRef.current = editorSnapshotKey(snapshot)
}

export const pushEditorSnapshot = ({
  snapshot,
  undoStackRef,
  redoStackRef,
  lastSnapshotKeyRef,
  maxSize,
}: {
  snapshot: EditorSnapshot
  undoStackRef: RefCell<EditorSnapshot[]>
  redoStackRef: RefCell<EditorSnapshot[]>
  lastSnapshotKeyRef: RefCell<string>
  maxSize: number
}) => {
  const key = editorSnapshotKey(snapshot)
  if (lastSnapshotKeyRef.current === key) return false

  undoStackRef.current = [...undoStackRef.current, snapshot].slice(-maxSize)
  redoStackRef.current = []
  lastSnapshotKeyRef.current = key
  return true
}

export const stepEditorHistoryBack = (
  undoStackRef: RefCell<EditorSnapshot[]>,
  redoStackRef: RefCell<EditorSnapshot[]>,
  maxSize: number
) => {
  const stack = undoStackRef.current
  if (stack.length <= 1) return null

  const current = stack.pop()!
  redoStackRef.current = [...redoStackRef.current, current].slice(-maxSize)
  return stack[stack.length - 1] ?? null
}

export const stepEditorHistoryForward = (
  undoStackRef: RefCell<EditorSnapshot[]>,
  redoStackRef: RefCell<EditorSnapshot[]>,
  maxSize: number
) => {
  const stack = redoStackRef.current
  if (stack.length === 0) return null

  const next = stack.pop()!
  undoStackRef.current = [...undoStackRef.current, next].slice(-maxSize)
  return next
}
