import type { EditorSnapshot } from "./EditorModel"
import { shapeTransitionType } from "./TimelineModel"

export const EDITOR_AUTOSAVE_KEY = "vectorforge.editor.autosave.v1"

export type EditorDocumentFile = {
  version: 1
  savedAt: string
  snapshot: EditorSnapshot
}

export const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

export const isPersistedEditorSnapshot = (
  value: unknown
): value is EditorSnapshot => {
  if (!isObjectRecord(value)) return false
  return (
    typeof value.duration === "number" &&
    Array.isArray(value.shapes) &&
    Array.isArray(value.tracks) &&
    Array.isArray(value.fillKeyframes) &&
    Array.isArray(value.materialKeyframes) &&
    Array.isArray(value.rotationAxisKeyframes) &&
    Array.isArray(value.moveKeyframes) &&
    Array.isArray(value.keyLightPositionKeyframes) &&
    isObjectRecord(value.materialSettings)
  )
}

export const normalizeEditorSnapshot = (
  snapshot: EditorSnapshot
): EditorSnapshot => ({
  ...snapshot,
  shapes: snapshot.shapes.map((shape) => ({
    ...shape,
    transitionType: shapeTransitionType(shape),
  })),
})

export const parseEditorDocumentSnapshot = (value: unknown) => {
  const snapshot = isObjectRecord(value) ? value.snapshot : value
  return isPersistedEditorSnapshot(snapshot)
    ? normalizeEditorSnapshot(snapshot)
    : null
}

export const readPersistedEditorSnapshot = () => {
  try {
    const raw = window.localStorage.getItem(EDITOR_AUTOSAVE_KEY)
    if (!raw) return null
    return parseEditorDocumentSnapshot(JSON.parse(raw))
  } catch {
    return null
  }
}

export const writePersistedEditorSnapshot = (snapshot: EditorSnapshot) => {
  window.localStorage.setItem(
    EDITOR_AUTOSAVE_KEY,
    JSON.stringify(createEditorDocumentFile(snapshot))
  )
}

export const createEditorDocumentFile = (
  snapshot: EditorSnapshot
): EditorDocumentFile => ({
  version: 1,
  savedAt: new Date().toISOString(),
  snapshot: normalizeEditorSnapshot(snapshot),
})

export const downloadProjectSnapshot = (snapshot: EditorSnapshot) => {
  const documentFile = createEditorDocumentFile(snapshot)
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(documentFile, null, 2)], {
      type: "application/json",
    })
  )
  const link = document.createElement("a")
  link.href = url
  link.download = `vectorforge-project-${documentFile.savedAt.slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
