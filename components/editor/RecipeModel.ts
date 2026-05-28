import {
  DEFAULT_ROTATION_END,
  DEFAULT_ROTATION_START,
  EXTRUDE_MAX,
  LIGHT_MAX,
  MOTION_TRACK_NAMES,
  MotionTrackId,
  ROTATION_MAX,
  ROTATION_MIN,
  SCALE_DEFAULT,
  SCALE_MAX,
  googleMeshFillStops,
} from "./EditorModel"
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

export const normalizeRecipeTracks = (
  recipe: MotionRecipe,
  timelineDuration = 5
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
      if (track.id === "rotation") {
        return {
          ...track,
          name: trackName,
          min: ROTATION_MIN,
          max: ROTATION_MAX,
          defaultValue: DEFAULT_ROTATION_START,
          keyframes: [
            {
              id: `${track.id}-start`,
              time: 0,
              value: DEFAULT_ROTATION_START,
              easing: "ease-in-out" as const,
            },
            {
              id: `${track.id}-end`,
              time: timelineDuration,
              value: DEFAULT_ROTATION_END,
              easing: "ease-in-out" as const,
            },
          ],
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
