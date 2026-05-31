"use client"

import { Dispatch, SetStateAction, useMemo } from "react"
import {
  clampNumber,
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
    setGeometryBaseSettings({
      extrusionDepth: nextSnapshot.extrusionDepth,
      bevelEnabled: nextSnapshot.bevelEnabled,
      bevelThickness: nextSnapshot.bevelThickness,
      bevelSize: nextSnapshot.bevelSize,
      bevelSegments: nextSnapshot.bevelSegments,
      geometryQuality: nextSnapshot.geometryQuality,
      layerSpacing: nextSnapshot.layerSpacing,
      innerElementScale: nextSnapshot.innerElementScale,
    })
    setQualityKeyframes(nextSnapshot.qualityKeyframes)
    setInnerScaleKeyframes(nextSnapshot.innerScaleKeyframes)
    setTransformBaseSettings({
      objectScale: nextSnapshot.objectScale,
      objectScaleAxes: nextSnapshot.objectScaleAxes ?? { x: 1, y: 1, z: 1 },
      moveOffset: nextSnapshot.moveOffset,
      rotationOffset: nextSnapshot.rotationOffset,
      previewRotationY: null,
      isScaleLocked: true,
    })
    setMoveKeyframes(nextSnapshot.moveKeyframes)
    restoreFillState(nextSnapshot)
    setRotationAxisKeyframes(nextSnapshot.rotationAxisKeyframes)
    setLightBaseSettings({
      keyLightColor: nextSnapshot.keyLightColor,
      keyLightIntensity: nextSnapshot.keyLightIntensity,
      keyLightPosition: nextSnapshot.keyLightPosition,
      keyLightSoftness: nextSnapshot.keyLightSoftness,
    })
    setKeyLightPositionKeyframes(nextSnapshot.keyLightPositionKeyframes)
    setTracks(nextSnapshot.tracks)
    setIsPlaying(false)
  }

  return useEditorHistory({
    snapshot,
    canRecord: shapes.length > 0,
    maxSize: MAX_UNDO_STEPS,
    isInputDragActive,
    onRestore: restoreSnapshot,
  })
}
