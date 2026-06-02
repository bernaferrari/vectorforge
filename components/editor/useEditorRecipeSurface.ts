"use client"

import type { Dispatch, SetStateAction } from "react"
import type { MaterialPresetId } from "../3d/MaterialPresets"
import type {
  GeometrySettings,
  LightSettings,
  MaterialSettings,
  MotionTrackId,
  ScalarKeyframe,
  TransformSettings,
  Vector3Keyframe,
} from "./EditorModel"
import type { MotionRecipe } from "./MotionRecipes"
import type { ShapeStop, TimelineTrack } from "./TimelineModel"
import { useRecipeApplication } from "./useRecipeApplication"

type EditorRecipeSurfaceOptions = {
  duration: number
  setActiveRecipeId: Dispatch<SetStateAction<string | null>>
  setMaterialPreset: Dispatch<SetStateAction<MaterialPresetId>>
  applyRecipeFill: (recipe: MotionRecipe) => void
  setShapes: Dispatch<SetStateAction<ShapeStop[]>>
  setMaterialBaseSettings: (settings: MaterialSettings) => void
  setGeometryBaseSettings: Dispatch<SetStateAction<GeometrySettings>>
  setTransformBaseSettings: Dispatch<SetStateAction<TransformSettings>>
  setRotationAxisKeyframes: Dispatch<SetStateAction<Vector3Keyframe[]>>
  setMoveKeyframes: Dispatch<SetStateAction<Vector3Keyframe[]>>
  setQualityKeyframes: Dispatch<SetStateAction<ScalarKeyframe[]>>
  setInnerScaleKeyframes: Dispatch<SetStateAction<Vector3Keyframe[]>>
  setLightBaseSettings: Dispatch<SetStateAction<LightSettings>>
  setKeyLightPositionKeyframes: Dispatch<SetStateAction<Vector3Keyframe[]>>
  setTracks: Dispatch<SetStateAction<TimelineTrack[]>>
  setSelectedMotionTrackId: Dispatch<SetStateAction<MotionTrackId>>
  setCurrentTime: Dispatch<SetStateAction<number>>
  setIsPlaying: Dispatch<SetStateAction<boolean>>
}

export function useEditorRecipeSurface(
  recipeOptions: EditorRecipeSurfaceOptions
) {
  return useRecipeApplication(recipeOptions)
}
