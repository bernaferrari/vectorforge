"use client"

import type { Dispatch, SetStateAction } from "react"
import type {
  LightPosition,
  ScalarKeyframe,
  Vector3Keyframe,
} from "./EditorModel"
import type {
  FillGradientType,
  FillKeyframe,
  FillStop,
  ShapeStop,
  TimelineTrack,
} from "./TimelineModel"
import type { FillMode } from "./EditorModel"
import { useActiveTimelineValues } from "./useActiveTimelineValues"
import { useLayerEditor } from "./useLayerEditor"
import { useMorphRenderState } from "./useMorphRenderState"
import { useShapeNavigation } from "./useShapeNavigation"

type UseEditorRenderStateArgs = {
  shapes: ShapeStop[]
  setShapes: Dispatch<SetStateAction<ShapeStop[]>>
  selectedShapeId: string | null
  setSelectedShapeId: Dispatch<SetStateAction<string | null>>
  currentTime: number
  fillColor: string
  fillColorSecondary: string
  fillGradientType: FillGradientType
  fillStops?: FillStop[]
  fillKeyframes: FillKeyframe[]
  fillMode: FillMode
  enableGradient: boolean
  extrusionTrack: TimelineTrack
  scaleTrack: TimelineTrack
  lightingTrack: TimelineTrack
  extrusionDepth: number
  rotationOffset: LightPosition
  rotationAxisKeyframes: Vector3Keyframe[]
  previewRotationY: number | null
  objectScale: number
  moveOffset: LightPosition
  moveKeyframes: Vector3Keyframe[]
  keyLightIntensity: number
  geometryQuality: number
  qualityKeyframes: ScalarKeyframe[]
  innerElementScale: LightPosition
  innerScaleKeyframes: Vector3Keyframe[]
  markCustom: () => void
}

export function useEditorRenderState({
  shapes,
  setShapes,
  selectedShapeId,
  setSelectedShapeId,
  currentTime,
  fillColor,
  fillColorSecondary,
  fillGradientType,
  fillStops,
  fillKeyframes,
  fillMode,
  enableGradient,
  extrusionTrack,
  scaleTrack,
  lightingTrack,
  extrusionDepth,
  rotationOffset,
  rotationAxisKeyframes,
  previewRotationY,
  objectScale,
  moveOffset,
  moveKeyframes,
  keyLightIntensity,
  geometryQuality,
  qualityKeyframes,
  innerElementScale,
  innerScaleKeyframes,
  markCustom,
}: UseEditorRenderStateArgs) {
  const morphState = useMorphRenderState({
    shapes,
    currentTime,
    fillColor,
    fillColorSecondary,
    fillGradientType,
    fillStops,
    fillKeyframes,
    fillMode,
    enableGradient,
  })

  const layerState = useLayerEditor({
    shapes,
    selectedShapeId,
    setShapes,
    onEdit: markCustom,
  })

  const shapeNavigation = useShapeNavigation({
    sortedShapes: morphState.sortedShapes,
    selectedShapeId,
    setSelectedShapeId,
    setSelectedLayerId: layerState.setSelectedLayerId,
  })

  const activeValues = useActiveTimelineValues({
    currentTime,
    extrusionTrack,
    scaleTrack,
    lightingTrack,
    extrusionDepth,
    rotationOffset,
    rotationAxisKeyframes,
    previewRotationY,
    objectScale,
    moveOffset,
    moveKeyframes,
    keyLightIntensity,
    geometryQuality,
    qualityKeyframes,
    innerElementScale,
    innerScaleKeyframes,
  })

  return {
    ...morphState,
    ...layerState,
    selectedShapeLayers: layerState.layers,
    shapeNavigation,
    ...activeValues,
  }
}
