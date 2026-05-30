import {
  type MaterialKeyframe,
  type MaterialSettings,
  clampNumber,
  createEditorId,
  quantizeTimeToFrame,
} from "./EditorModel"
import { previousEasingFor } from "./EditorKeyframeModel"

const MATERIAL_KEYFRAME_TIME_THRESHOLD = 0.04

export const DEFAULT_MATERIAL_SETTINGS: MaterialSettings = {
  roughness: 0.075,
  metalness: 0.48,
  reflectance: 1,
  clearcoat: 1,
  clearcoatRoughness: 0.02,
  transmission: 0,
  thickness: 1,
  emissiveIntensity: 0.08,
}

export const materialPlayheadTime = (currentTime: number, duration: number) =>
  clampNumber(quantizeTimeToFrame(currentTime), 0, duration)

export const findMaterialKeyframeAtTime = (
  keyframes: MaterialKeyframe[],
  time: number
) =>
  keyframes.find(
    (keyframe) =>
      Math.abs(keyframe.time - time) < MATERIAL_KEYFRAME_TIME_THRESHOLD
  )

export const upsertMaterialKeyframe = ({
  keyframes,
  time,
  value,
}: {
  keyframes: MaterialKeyframe[]
  time: number
  value: MaterialSettings
}) => {
  const existing = findMaterialKeyframeAtTime(keyframes, time)
  if (existing) {
    return keyframes.map((keyframe) =>
      keyframe.id === existing.id ? { ...keyframe, value } : keyframe
    )
  }

  return [
    ...keyframes,
    {
      id: createEditorId("material"),
      time,
      value,
      easing: previousEasingFor(keyframes, time),
    },
  ].sort((a, b) => a.time - b.time)
}
