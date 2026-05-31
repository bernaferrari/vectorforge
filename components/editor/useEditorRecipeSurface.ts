"use client"

import type { Dispatch, SetStateAction } from "react"
import type { MaterialPresetId } from "../3d/MaterialPresets"
import type {
  GeometrySettings,
  LightSettings,
  LightPosition,
  MaterialSettings,
  MotionTrackId,
  ScalarKeyframe,
  Vector3Keyframe,
} from "./EditorModel"
import type { MotionRecipe } from "./MotionRecipes"
import type { ShapeStop, TimelineTrack } from "./TimelineModel"
import { useInitialRecipeBoot } from "./useInitialRecipeBoot"
import { useRecipeApplication } from "./useRecipeApplication"

type EditorRecipeSurfaceOptions = {
  duration: number
  setActiveRecipeId: Dispatch<SetStateAction<string | null>>
  setMaterialPreset: Dispatch<SetStateAction<MaterialPresetId>>
  applyRecipeFill: (recipe: MotionRecipe) => void
  setShapes: Dispatch<SetStateAction<ShapeStop[]>>
  setSelectedShapeId: (shapeId: string | null) => void
  setMaterialBaseSettings: (settings: MaterialSettings) => void
  setGeometryBaseSettings: Dispatch<SetStateAction<GeometrySettings>>
  setRotationOffset: Dispatch<SetStateAction<LightPosition>>
  setRotationAxisKeyframes: Dispatch<SetStateAction<Vector3Keyframe[]>>
  setObjectScale: Dispatch<SetStateAction<number>>
  setMoveOffset: Dispatch<SetStateAction<LightPosition>>
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

export function useEditorRecipeSurface({
  setSelectedShapeId,
  ...recipeOptions
}: EditorRecipeSurfaceOptions) {
  const applyRecipe = useRecipeApplication(recipeOptions)

  useInitialRecipeBoot({
    applyRecipe,
    setShapes: recipeOptions.setShapes,
    setSelectedShapeId,
  })

  return applyRecipe
}
