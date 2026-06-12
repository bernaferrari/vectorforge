"use client"

import { Dispatch, SetStateAction, useEffect, useMemo, useRef } from "react"
import {
  clampNumber,
  DEFAULT_GEOMETRY_SETTINGS,
  DEFAULT_LIGHT_SETTINGS,
  DEFAULT_TRANSFORM_SETTINGS,
  EditorSnapshot,
  FillMode,
  GeometrySettings,
  LightSettings,
  LightPosition,
  MAX_UNDO_STEPS,
  MaterialKeyframe,
  MaterialSettings,
  ScalarKeyframe,
  TransformSettings,
  Vector3Keyframe,
} from "./EditorModel"
import {
  downloadProjectSnapshot,
  parseEditorDocumentSnapshot,
  readPersistedEditorSnapshot,
  writePersistedEditorSnapshot,
} from "./EditorDocumentModel"
import type { MaterialPresetId } from "../3d/MaterialPresets"
import type {
  FillGradientType,
  FillKeyframe,
  FillStop,
  ShapeStop,
  TimelineTrack,
} from "./TimelineModel"
import { useEditorHistory } from "./useEditorHistory"

interface EditorSnapshotHistoryOptions {
  activeRecipeId: string | null
  setActiveRecipeId: Dispatch<SetStateAction<string | null>>
  shapes: ShapeStop[]
  setShapes: Dispatch<SetStateAction<ShapeStop[]>>
  setSelectedShapeId: Dispatch<SetStateAction<string | null>>
  setOpenShapePicker: Dispatch<SetStateAction<string | null>>
  duration: number
  setDuration: Dispatch<SetStateAction<number>>
  setCurrentTime: Dispatch<SetStateAction<number>>
  materialPreset: MaterialPresetId
  setMaterialPreset: Dispatch<SetStateAction<MaterialPresetId>>
  materialSettings: MaterialSettings
  materialKeyframes: MaterialKeyframe[]
  setMaterialKeyframes: Dispatch<SetStateAction<MaterialKeyframe[]>>
  setMaterialBaseSettings: (settings: MaterialSettings) => void
  extrusionDepth: number
  bevelEnabled: boolean
  bevelThickness: number
  bevelSize: number
  bevelSegments: number
  geometryQuality: number
  qualityKeyframes: ScalarKeyframe[]
  setQualityKeyframes: Dispatch<SetStateAction<ScalarKeyframe[]>>
  layerSpacing: number
  innerElementScale: LightPosition
  setGeometryBaseSettings: Dispatch<SetStateAction<GeometrySettings>>
  innerScaleKeyframes: Vector3Keyframe[]
  setInnerScaleKeyframes: Dispatch<SetStateAction<Vector3Keyframe[]>>
  objectScale: number
  objectScaleAxes: LightPosition
  moveOffset: LightPosition
  setTransformBaseSettings: Dispatch<SetStateAction<TransformSettings>>
  moveKeyframes: Vector3Keyframe[]
  setMoveKeyframes: Dispatch<SetStateAction<Vector3Keyframe[]>>
  enableGradient: boolean
  fillMode: FillMode
  fillColor: string
  fillColorSecondary: string
  fillGradientType: FillGradientType
  fillStops?: FillStop[]
  fillKeyframes: FillKeyframe[]
  restoreFillState: (snapshot: EditorSnapshot) => void
  rotationOffset: LightPosition
  rotationAxisKeyframes: Vector3Keyframe[]
  setRotationAxisKeyframes: Dispatch<SetStateAction<Vector3Keyframe[]>>
  keyLightColor: string
  keyLightIntensity: number
  keyLightPosition: LightPosition
  keyLightSoftness: number
  setLightBaseSettings: Dispatch<SetStateAction<LightSettings>>
  keyLightPositionKeyframes: Vector3Keyframe[]
  setKeyLightPositionKeyframes: Dispatch<SetStateAction<Vector3Keyframe[]>>
  tracks: TimelineTrack[]
  setTracks: Dispatch<SetStateAction<TimelineTrack[]>>
  setIsPlaying: Dispatch<SetStateAction<boolean>>
  isInputDragActive: () => boolean
}

const geometrySettingsFromSnapshot = (
  snapshot: EditorSnapshot
): GeometrySettings => ({
  ...DEFAULT_GEOMETRY_SETTINGS,
  extrusionDepth: snapshot.extrusionDepth,
  bevelEnabled: snapshot.bevelEnabled,
  bevelThickness: snapshot.bevelThickness,
  bevelSize: snapshot.bevelSize,
  bevelSegments: snapshot.bevelSegments,
  geometryQuality: snapshot.geometryQuality,
  layerSpacing: snapshot.layerSpacing,
  innerElementScale: snapshot.innerElementScale,
})

const transformSettingsFromSnapshot = (
  snapshot: EditorSnapshot
): TransformSettings => ({
  ...DEFAULT_TRANSFORM_SETTINGS,
  objectScale: snapshot.objectScale,
  objectScaleAxes:
    snapshot.objectScaleAxes ?? DEFAULT_TRANSFORM_SETTINGS.objectScaleAxes,
  moveOffset: snapshot.moveOffset,
  rotationOffset: snapshot.rotationOffset,
  previewRotationOffset: null,
})

const lightSettingsFromSnapshot = (
  snapshot: EditorSnapshot
): LightSettings => ({
  ...DEFAULT_LIGHT_SETTINGS,
  keyLightColor: snapshot.keyLightColor,
  keyLightIntensity: snapshot.keyLightIntensity,
  keyLightPosition: snapshot.keyLightPosition,
  keyLightSoftness: snapshot.keyLightSoftness,
})

export function useEditorSnapshotHistory({
  activeRecipeId,
  setActiveRecipeId,
  shapes,
  setShapes,
  setSelectedShapeId,
  setOpenShapePicker,
  duration,
  setDuration,
  setCurrentTime,
  materialPreset,
  setMaterialPreset,
  materialSettings,
  materialKeyframes,
  setMaterialKeyframes,
  setMaterialBaseSettings,
  extrusionDepth,
  bevelEnabled,
  bevelThickness,
  bevelSize,
  bevelSegments,
  geometryQuality,
  qualityKeyframes,
  setQualityKeyframes,
  layerSpacing,
  innerElementScale,
  setGeometryBaseSettings,
  innerScaleKeyframes,
  setInnerScaleKeyframes,
  objectScale,
  objectScaleAxes,
  moveOffset,
  setTransformBaseSettings,
  moveKeyframes,
  setMoveKeyframes,
  enableGradient,
  fillMode,
  fillColor,
  fillColorSecondary,
  fillGradientType,
  fillStops,
  fillKeyframes,
  restoreFillState,
  rotationOffset,
  rotationAxisKeyframes,
  setRotationAxisKeyframes,
  keyLightColor,
  keyLightIntensity,
  keyLightPosition,
  keyLightSoftness,
  setLightBaseSettings,
  keyLightPositionKeyframes,
  setKeyLightPositionKeyframes,
  tracks,
  setTracks,
  setIsPlaying,
  isInputDragActive,
}: EditorSnapshotHistoryOptions) {
  const snapshot = useMemo<EditorSnapshot>(
    () => ({
      activeRecipeId,
      shapes,
      duration,
      materialPreset,
      materialSettings,
      materialKeyframes,
      extrusionDepth,
      bevelEnabled,
      bevelThickness,
      bevelSize,
      bevelSegments,
      geometryQuality,
      qualityKeyframes,
      layerSpacing,
      innerElementScale,
      innerScaleKeyframes,
      objectScale,
      objectScaleAxes,
      moveOffset,
      moveKeyframes,
      enableGradient,
      fillMode,
      fillColor,
      fillColorSecondary,
      fillGradientType,
      fillStops,
      fillKeyframes,
      rotationOffset,
      rotationAxisKeyframes,
      keyLightColor,
      keyLightIntensity,
      keyLightPosition,
      keyLightSoftness,
      keyLightPositionKeyframes,
      tracks,
    }),
    [
      activeRecipeId,
      shapes,
      duration,
      materialPreset,
      materialSettings,
      materialKeyframes,
      extrusionDepth,
      bevelEnabled,
      bevelThickness,
      bevelSize,
      bevelSegments,
      geometryQuality,
      qualityKeyframes,
      layerSpacing,
      innerElementScale,
      innerScaleKeyframes,
      objectScale,
      objectScaleAxes,
      moveOffset,
      moveKeyframes,
      enableGradient,
      fillMode,
      fillColor,
      fillColorSecondary,
      fillGradientType,
      fillStops,
      fillKeyframes,
      rotationOffset,
      rotationAxisKeyframes,
      keyLightColor,
      keyLightIntensity,
      keyLightPosition,
      keyLightSoftness,
      keyLightPositionKeyframes,
      tracks,
    ]
  )

  const restoreSnapshot = (nextSnapshot: EditorSnapshot) => {
    setActiveRecipeId(nextSnapshot.activeRecipeId)
    setShapes(nextSnapshot.shapes)
    setSelectedShapeId((currentId) =>
      currentId && nextSnapshot.shapes.some((shape) => shape.id === currentId)
        ? currentId
        : (nextSnapshot.shapes[0]?.id ?? null)
    )
    setOpenShapePicker(null)
    setDuration(nextSnapshot.duration)
    setCurrentTime((time) => clampNumber(time, 0, nextSnapshot.duration))
    setMaterialPreset(nextSnapshot.materialPreset)
    setMaterialBaseSettings(nextSnapshot.materialSettings)
    setMaterialKeyframes(nextSnapshot.materialKeyframes)
    setGeometryBaseSettings(geometrySettingsFromSnapshot(nextSnapshot))
    setQualityKeyframes(nextSnapshot.qualityKeyframes)
    setInnerScaleKeyframes(nextSnapshot.innerScaleKeyframes)
    setTransformBaseSettings(transformSettingsFromSnapshot(nextSnapshot))
    setMoveKeyframes(nextSnapshot.moveKeyframes)
    restoreFillState(nextSnapshot)
    setRotationAxisKeyframes(nextSnapshot.rotationAxisKeyframes)
    setLightBaseSettings(lightSettingsFromSnapshot(nextSnapshot))
    setKeyLightPositionKeyframes(nextSnapshot.keyLightPositionKeyframes)
    setTracks(nextSnapshot.tracks)
    setIsPlaying(false)
  }

  const saveProjectFile = () => {
    if (typeof window === "undefined") return
    downloadProjectSnapshot(snapshot)
  }

  const openProjectFile = () => {
    if (typeof window === "undefined") return

    const input = document.createElement("input")
    input.type = "file"
    input.accept = "application/json,.json"
    input.className = "hidden"
    input.onchange = () => {
      const file = input.files?.[0]
      input.remove()
      if (!file) return

      void file
        .text()
        .then((text) => {
          const nextSnapshot = parseEditorDocumentSnapshot(JSON.parse(text))
          if (!nextSnapshot) {
            throw new Error("Invalid VectorForge project file.")
          }
          restoreSnapshot(nextSnapshot)
          writePersistedEditorSnapshot(nextSnapshot)
        })
        .catch((error) => {
          console.error("Could not open project file:", error)
          window.alert("Could not open that project file.")
        })
    }
    document.body.appendChild(input)
    input.click()
  }

  const persistenceReadyRef = useRef(false)
  const skipNextPersistRef = useRef(false)
  const canRecord = shapes.length > 0

  useEffect(() => {
    if (typeof window === "undefined") return
    const persistedSnapshot = readPersistedEditorSnapshot()
    if (persistedSnapshot) {
      skipNextPersistRef.current = true
      restoreSnapshot(persistedSnapshot)
    }
    persistenceReadyRef.current = true
    // Restore should run once during editor boot. State setters are stable here,
    // and repeated restores would overwrite the user's current document.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !canRecord ||
      !persistenceReadyRef.current
    ) {
      return
    }

    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false
      return
    }

    const timeout = window.setTimeout(() => {
      writePersistedEditorSnapshot(snapshot)
    }, 350)

    return () => window.clearTimeout(timeout)
  }, [canRecord, snapshot])

  const history = useEditorHistory({
    snapshot,
    canRecord,
    maxSize: MAX_UNDO_STEPS,
    isInputDragActive,
    onRestore: restoreSnapshot,
  })

  return { ...history, openProjectFile, saveProjectFile }
}
