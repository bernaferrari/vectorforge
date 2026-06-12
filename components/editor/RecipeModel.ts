import {
  DEFAULT_GEOMETRY_SETTINGS,
  DEFAULT_LIGHT_SETTINGS,
  DEFAULT_ROTATION_END,
  DEFAULT_ROTATION_START,
  DEFAULT_TRANSFORM_SETTINGS,
  EXTRUDE_MAX,
  LIGHT_MAX,
  MOTION_TRACK_NAMES,
  MotionTrackId,
  SCALE_DEFAULT,
  SCALE_MAX,
  type GeometrySettings,
  type LightSettings,
  type MaterialSettings,
  type TransformSettings,
} from "./EditorModel"
import { googleMeshFillStops } from "./FillStopModel"
import { DEFAULT_MATERIAL_SETTINGS } from "./MaterialEditorModel"
import type { ShapeStop, TimelineTrack } from "./TimelineModel"
import type { MOTION_RECIPES } from "./MotionRecipes"

type MotionRecipe = (typeof MOTION_RECIPES)[number]

export const recolorShapesForRecipe = (
  list: ShapeStop[],
  recipe: MotionRecipe
): ShapeStop[] =>
  list.map((stop, index) => ({
    ...stop,
    color: index % 2 === 0 ? recipe.colorA : recipe.colorB,
    colorSecondary:
      index % 2 === 0 ? recipe.colorASecondary : recipe.colorBSecondary,
    fillGradientType: recipe.fillGradientType ?? "linear",
    fillStops: recipe.id === "google-metal" ? googleMeshFillStops() : undefined,
    fillKeyframes: [],
    transitionType: recipe.transitionType,
    wipeDirection: recipe.wipeDirection,
  }))

export const materialSettingsForRecipe = (
  recipe: MotionRecipe
): MaterialSettings => ({
  ...DEFAULT_MATERIAL_SETTINGS,
  roughness: recipe.roughness,
  metalness: recipe.metalness,
  reflectance: recipe.reflectance ?? DEFAULT_MATERIAL_SETTINGS.reflectance,
  clearcoat: recipe.clearcoat,
  clearcoatRoughness:
    recipe.clearcoatRoughness ?? DEFAULT_MATERIAL_SETTINGS.clearcoatRoughness,
  transmission: recipe.transmission,
  thickness: recipe.thickness ?? DEFAULT_MATERIAL_SETTINGS.thickness,
  emissiveIntensity: recipe.emissiveIntensity,
})

export const geometrySettingsForRecipe = (
  recipe: MotionRecipe
): GeometrySettings => ({
  ...DEFAULT_GEOMETRY_SETTINGS,
  extrusionDepth: recipe.extrusionDepth,
  bevelEnabled: recipe.bevelEnabled,
  bevelThickness: recipe.bevelThickness,
  bevelSize: recipe.bevelSize,
  bevelSegments: recipe.bevelSegments,
  geometryQuality:
    recipe.geometryQuality ?? DEFAULT_GEOMETRY_SETTINGS.geometryQuality,
  layerSpacing: recipe.layerSpacing,
})

export const transformSettingsForRecipe = (
  recipe: MotionRecipe
): TransformSettings => ({
  ...DEFAULT_TRANSFORM_SETTINGS,
  moveOffset: {
    x: recipe.translateX ?? DEFAULT_TRANSFORM_SETTINGS.moveOffset.x,
    y: recipe.translateY ?? DEFAULT_TRANSFORM_SETTINGS.moveOffset.y,
    z: recipe.translateZ ?? DEFAULT_TRANSFORM_SETTINGS.moveOffset.z,
  },
  previewRotationOffset: null,
})

export const lightSettingsForRecipe = (
  recipe: MotionRecipe
): LightSettings => ({
  ...DEFAULT_LIGHT_SETTINGS,
  keyLightIntensity: recipe.keyLightIntensity,
})

export const normalizeRecipeTracks = (
  recipe: MotionRecipe
): TimelineTrack[] => {
  const normalized: TimelineTrack[] = recipe.tracks
    .filter((track) => track.id !== "transition")
    .map((track) => {
      const trackName =
        MOTION_TRACK_NAMES[track.id as MotionTrackId] ?? track.name
      if (track.id === "extrusion") {
        return {
          ...track,
          name: trackName,
          max: EXTRUDE_MAX,
          defaultValue: recipe.extrusionDepth,
          keyframes: [],
        }
      }
      if (track.id === "lighting") {
        return {
          ...track,
          name: trackName,
          max: LIGHT_MAX,
          defaultValue: recipe.keyLightIntensity,
          keyframes: [],
        }
      }
      return { ...track, name: trackName, keyframes: [] }
    })

  if (!normalized.some((track) => track.id === "scale")) {
    normalized.splice(2, 0, {
      id: "scale",
      name: "Scale",
      color: "#a78bfa",
      min: 0.1,
      max: SCALE_MAX,
      defaultValue: SCALE_DEFAULT,
      keyframes: [],
    })
  }

  return normalized
}

export const normalizeRecipeRotationKeyframes = (
  recipe: MotionRecipe,
  timelineDuration = 5
) => {
  if (recipe.rotationKeyframes?.length) return recipe.rotationKeyframes

  return [
    {
      id: "rotation-start",
      time: 0,
      value: { x: 0, y: DEFAULT_ROTATION_START, z: 0 },
      easing: "ease-in-out" as const,
    },
    {
      id: "rotation-end",
      time: timelineDuration,
      value: { x: 0, y: DEFAULT_ROTATION_END, z: 0 },
      easing: "ease-in-out" as const,
    },
  ]
}
