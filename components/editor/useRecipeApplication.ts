"use client"

import { Dispatch, SetStateAction, useCallback } from "react"
import type { MaterialPresetId } from "../3d/MaterialPresets"
import {
  GEOMETRY_QUALITY_DEFAULT,
  LightPosition,
  MaterialSettings,
  MotionTrackId,
  SCALE_DEFAULT,
  ScalarKeyframe,
  Vector3Keyframe,
} from "./EditorModel"
import type { MotionRecipe } from "./MotionRecipes"
import {
  normalizeRecipeRotationKeyframes,
  normalizeRecipeTracks,
  recolorShapesForRecipe,
} from "./RecipeModel"
import type { ShapeStop, TimelineTrack } from "./TimelineModel"

interface RecipeApplicationOptions {
  duration: number
  setActiveRecipeId: Dispatch<SetStateAction<string | null>>
  setMaterialPreset: Dispatch<SetStateAction<MaterialPresetId>>
  applyRecipeFill: (recipe: MotionRecipe) => void
  setShapes: Dispatch<SetStateAction<ShapeStop[]>>
  setMaterialBaseSettings: (settings: MaterialSettings) => void
  setExtrusionDepth: Dispatch<SetStateAction<number>>
  setBevelEnabled: Dispatch<SetStateAction<boolean>>
  setBevelThickness: Dispatch<SetStateAction<number>>
  setBevelSize: Dispatch<SetStateAction<number>>
  setBevelSegments: Dispatch<SetStateAction<number>>
  setGeometryQuality: Dispatch<SetStateAction<number>>
  setLayerSpacing: Dispatch<SetStateAction<number>>
  setInnerElementScale: Dispatch<SetStateAction<LightPosition>>
  setRotationOffset: Dispatch<SetStateAction<LightPosition>>
  setRotationAxisKeyframes: Dispatch<SetStateAction<Vector3Keyframe[]>>
  setObjectScale: Dispatch<SetStateAction<number>>
  setMoveOffset: Dispatch<SetStateAction<LightPosition>>
  setMoveKeyframes: Dispatch<SetStateAction<Vector3Keyframe[]>>
  setQualityKeyframes: Dispatch<SetStateAction<ScalarKeyframe[]>>
  setInnerScaleKeyframes: Dispatch<SetStateAction<Vector3Keyframe[]>>
  setKeyLightIntensity: Dispatch<SetStateAction<number>>
  setKeyLightPosition: Dispatch<SetStateAction<LightPosition>>
  setKeyLightSoftness: Dispatch<SetStateAction<number>>
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
  setExtrusionDepth,
  setBevelEnabled,
  setBevelThickness,
  setBevelSize,
  setBevelSegments,
  setGeometryQuality,
  setLayerSpacing,
  setInnerElementScale,
  setRotationOffset,
  setRotationAxisKeyframes,
  setObjectScale,
  setMoveOffset,
  setMoveKeyframes,
  setQualityKeyframes,
  setInnerScaleKeyframes,
  setKeyLightIntensity,
  setKeyLightPosition,
  setKeyLightSoftness,
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

      setMaterialBaseSettings({
        roughness: recipe.roughness,
        metalness: recipe.metalness,
        reflectance: recipe.reflectance ?? 0.5,
        clearcoat: recipe.clearcoat,
        clearcoatRoughness: recipe.clearcoatRoughness ?? 0.1,
        transmission: recipe.transmission,
        thickness: recipe.thickness ?? 1.0,
        emissiveIntensity: recipe.emissiveIntensity,
      })

      setExtrusionDepth(recipe.extrusionDepth)
      setBevelEnabled(recipe.bevelEnabled)
      setBevelThickness(recipe.bevelThickness)
      setBevelSize(recipe.bevelSize)
      setBevelSegments(recipe.bevelSegments)
      setGeometryQuality(recipe.geometryQuality ?? GEOMETRY_QUALITY_DEFAULT)
      setLayerSpacing(recipe.layerSpacing)
      setInnerElementScale({ x: 1, y: 1, z: 1 })

      setRotationOffset({ x: 0, y: 0, z: 0 })
      setRotationAxisKeyframes(
        normalizeRecipeRotationKeyframes(recipe, duration)
      )
      setObjectScale(SCALE_DEFAULT)
      setMoveOffset({
        x: recipe.translateX ?? 0,
        y: recipe.translateY ?? 0,
        z: recipe.translateZ ?? 0,
      })
      setMoveKeyframes([])
      setQualityKeyframes([])
      setInnerScaleKeyframes([])
      setKeyLightIntensity(recipe.keyLightIntensity)
      setKeyLightPosition({ x: 5, y: 5, z: 4 })
      setKeyLightSoftness(0.35)
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
      setExtrusionDepth,
      setBevelEnabled,
      setBevelThickness,
      setBevelSize,
      setBevelSegments,
      setGeometryQuality,
      setLayerSpacing,
      setInnerElementScale,
      setRotationOffset,
      setRotationAxisKeyframes,
      setObjectScale,
      setMoveOffset,
      setMoveKeyframes,
      setQualityKeyframes,
      setInnerScaleKeyframes,
      setKeyLightIntensity,
      setKeyLightPosition,
      setKeyLightSoftness,
      setKeyLightPositionKeyframes,
      setTracks,
      setSelectedMotionTrackId,
      setCurrentTime,
      setIsPlaying,
    ]
  )
}
