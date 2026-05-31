"use client"

import { Dispatch, SetStateAction, useCallback } from "react"
import type { MaterialPresetId } from "../3d/MaterialPresets"
import {
  MaterialSettings,
  MotionTrackId,
  ScalarKeyframe,
  Vector3Keyframe,
  type GeometrySettings,
  type LightSettings,
  type TransformSettings,
} from "./EditorModel"
import type { MotionRecipe } from "./MotionRecipes"
import {
  geometrySettingsForRecipe,
  lightSettingsForRecipe,
  materialSettingsForRecipe,
  normalizeRecipeRotationKeyframes,
  normalizeRecipeTracks,
  recolorShapesForRecipe,
  transformSettingsForRecipe,
} from "./RecipeModel"
import type { ShapeStop, TimelineTrack } from "./TimelineModel"

interface RecipeApplicationOptions {
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

export function useRecipeApplication({
  duration,
  setActiveRecipeId,
  setMaterialPreset,
  applyRecipeFill,
  setShapes,
  setMaterialBaseSettings,
  setGeometryBaseSettings,
  setTransformBaseSettings,
  setRotationAxisKeyframes,
  setMoveKeyframes,
  setQualityKeyframes,
  setInnerScaleKeyframes,
  setLightBaseSettings,
  setKeyLightPositionKeyframes,
  setTracks,
  setSelectedMotionTrackId,
  setCurrentTime,
  setIsPlaying,
}: RecipeApplicationOptions) {
  return useCallback(
    (recipe: MotionRecipe, shapeList?: ShapeStop[]) => {
      setActiveRecipeId(recipe.id)
      setMaterialPreset(recipe.materialPreset)
      applyRecipeFill(recipe)
      setShapes((prev) => recolorShapesForRecipe(shapeList ?? prev, recipe))

      setMaterialBaseSettings(materialSettingsForRecipe(recipe))
      setGeometryBaseSettings(geometrySettingsForRecipe(recipe))
      setTransformBaseSettings(transformSettingsForRecipe(recipe))
      setRotationAxisKeyframes(
        normalizeRecipeRotationKeyframes(recipe, duration)
      )
      setMoveKeyframes([])
      setQualityKeyframes([])
      setInnerScaleKeyframes([])
      setLightBaseSettings(lightSettingsForRecipe(recipe))
      setKeyLightPositionKeyframes([])

      setTracks(normalizeRecipeTracks(recipe))
      setSelectedMotionTrackId("rotation")
      setCurrentTime(0)
      setIsPlaying(false)
    },
    [
      applyRecipeFill,
      duration,
      setActiveRecipeId,
      setMaterialPreset,
      setShapes,
      setMaterialBaseSettings,
      setGeometryBaseSettings,
      setTransformBaseSettings,
      setRotationAxisKeyframes,
      setMoveKeyframes,
      setQualityKeyframes,
      setInnerScaleKeyframes,
      setLightBaseSettings,
      setKeyLightPositionKeyframes,
      setTracks,
      setSelectedMotionTrackId,
      setCurrentTime,
      setIsPlaying,
    ]
  )
}
