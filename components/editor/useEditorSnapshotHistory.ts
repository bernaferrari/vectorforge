"use client"

import { Dispatch, SetStateAction, useMemo } from "react"
import {
  clampNumber,
  EditorSnapshot,
  FillMode,
  LightPosition,
  MAX_UNDO_STEPS,
  MaterialKeyframe,
  MaterialSettings,
  ScalarKeyframe,
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
  roughness: number
  metalness: number
  reflectance: number
  clearcoat: number
  clearcoatRoughness: number
  transmission: number
  thickness: number
  emissiveIntensity: number
  materialKeyframes: MaterialKeyframe[]
  setMaterialKeyframes: Dispatch<SetStateAction<MaterialKeyframe[]>>
  setMaterialBaseSettings: (settings: MaterialSettings) => void
  extrusionDepth: number
  setExtrusionDepth: Dispatch<SetStateAction<number>>
  bevelEnabled: boolean
  setBevelEnabled: Dispatch<SetStateAction<boolean>>
  bevelThickness: number
  setBevelThickness: Dispatch<SetStateAction<number>>
  bevelSize: number
  setBevelSize: Dispatch<SetStateAction<number>>
  bevelSegments: number
  setBevelSegments: Dispatch<SetStateAction<number>>
  geometryQuality: number
  setGeometryQuality: Dispatch<SetStateAction<number>>
  qualityKeyframes: ScalarKeyframe[]
  setQualityKeyframes: Dispatch<SetStateAction<ScalarKeyframe[]>>
  layerSpacing: number
  setLayerSpacing: Dispatch<SetStateAction<number>>
  innerElementScale: LightPosition
  setInnerElementScale: Dispatch<SetStateAction<LightPosition>>
  innerScaleKeyframes: Vector3Keyframe[]
  setInnerScaleKeyframes: Dispatch<SetStateAction<Vector3Keyframe[]>>
  objectScale: number
  setObjectScale: Dispatch<SetStateAction<number>>
  objectScaleAxes: LightPosition
  setObjectScaleAxes: Dispatch<SetStateAction<LightPosition>>
  moveOffset: LightPosition
  setMoveOffset: Dispatch<SetStateAction<LightPosition>>
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
  setRotationOffset: Dispatch<SetStateAction<LightPosition>>
  rotationAxisKeyframes: Vector3Keyframe[]
  setRotationAxisKeyframes: Dispatch<SetStateAction<Vector3Keyframe[]>>
  setPreviewRotationY: Dispatch<SetStateAction<number | null>>
  keyLightColor: string
  setKeyLightColor: Dispatch<SetStateAction<string>>
  keyLightIntensity: number
  setKeyLightIntensity: Dispatch<SetStateAction<number>>
  keyLightPosition: LightPosition
  setKeyLightPosition: Dispatch<SetStateAction<LightPosition>>
  keyLightSoftness: number
  setKeyLightSoftness: Dispatch<SetStateAction<number>>
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
  roughness,
  metalness,
  reflectance,
  clearcoat,
  clearcoatRoughness,
  transmission,
  thickness,
  emissiveIntensity,
  materialKeyframes,
  setMaterialKeyframes,
  setMaterialBaseSettings,
  extrusionDepth,
  setExtrusionDepth,
  bevelEnabled,
  setBevelEnabled,
  bevelThickness,
  setBevelThickness,
  bevelSize,
  setBevelSize,
  bevelSegments,
  setBevelSegments,
  geometryQuality,
  setGeometryQuality,
  qualityKeyframes,
  setQualityKeyframes,
  layerSpacing,
  setLayerSpacing,
  innerElementScale,
  setInnerElementScale,
  innerScaleKeyframes,
  setInnerScaleKeyframes,
  objectScale,
  setObjectScale,
  objectScaleAxes,
  setObjectScaleAxes,
  moveOffset,
  setMoveOffset,
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
  setRotationOffset,
  rotationAxisKeyframes,
  setRotationAxisKeyframes,
  setPreviewRotationY,
  keyLightColor,
  setKeyLightColor,
  keyLightIntensity,
  setKeyLightIntensity,
  keyLightPosition,
  setKeyLightPosition,
  keyLightSoftness,
  setKeyLightSoftness,
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
      roughness,
      metalness,
      reflectance,
      clearcoat,
      clearcoatRoughness,
      transmission,
      thickness,
      emissiveIntensity,
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
      roughness,
      metalness,
      reflectance,
      clearcoat,
      clearcoatRoughness,
      transmission,
      thickness,
      emissiveIntensity,
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
    setMaterialBaseSettings({
      roughness: nextSnapshot.roughness,
      metalness: nextSnapshot.metalness,
      reflectance: nextSnapshot.reflectance,
      clearcoat: nextSnapshot.clearcoat,
      clearcoatRoughness: nextSnapshot.clearcoatRoughness,
      transmission: nextSnapshot.transmission,
      thickness: nextSnapshot.thickness,
      emissiveIntensity: nextSnapshot.emissiveIntensity,
    })
    setMaterialKeyframes(nextSnapshot.materialKeyframes)
    setExtrusionDepth(nextSnapshot.extrusionDepth)
    setBevelEnabled(nextSnapshot.bevelEnabled)
    setBevelThickness(nextSnapshot.bevelThickness)
    setBevelSize(nextSnapshot.bevelSize)
    setBevelSegments(nextSnapshot.bevelSegments)
    setGeometryQuality(nextSnapshot.geometryQuality)
    setQualityKeyframes(nextSnapshot.qualityKeyframes)
    setLayerSpacing(nextSnapshot.layerSpacing)
    setInnerElementScale(nextSnapshot.innerElementScale)
    setInnerScaleKeyframes(nextSnapshot.innerScaleKeyframes)
    setObjectScale(nextSnapshot.objectScale)
    setObjectScaleAxes(nextSnapshot.objectScaleAxes ?? { x: 1, y: 1, z: 1 })
    setMoveOffset(nextSnapshot.moveOffset)
    setMoveKeyframes(nextSnapshot.moveKeyframes)
    restoreFillState(nextSnapshot)
    setRotationOffset(nextSnapshot.rotationOffset)
    setRotationAxisKeyframes(nextSnapshot.rotationAxisKeyframes)
    setPreviewRotationY(null)
    setKeyLightColor(nextSnapshot.keyLightColor)
    setKeyLightIntensity(nextSnapshot.keyLightIntensity)
    setKeyLightPosition(nextSnapshot.keyLightPosition)
    setKeyLightSoftness(nextSnapshot.keyLightSoftness)
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
