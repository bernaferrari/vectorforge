import type {
  LightPosition,
  MaterialKeyframe,
  MaterialSettingKey,
  MaterialSettings,
  ScalarKeyframe,
  Vector3Keyframe,
} from "./EditorModel"
import { applyEasing } from "./TimelineModel"

const findKeyframePair = <T extends { id: string; time: number }>(
  time: number,
  keyframes: T[]
) => {
  if (keyframes.length === 0) return null
  if (time <= keyframes[0].time)
    return { previous: keyframes[0], next: keyframes[0], progress: 0 }
  if (time >= keyframes[keyframes.length - 1].time) {
    const last = keyframes[keyframes.length - 1]
    return { previous: last, next: last, progress: 1 }
  }

  for (let i = 0; i < keyframes.length - 1; i++) {
    const previous = keyframes[i]
    const next = keyframes[i + 1]
    if (time >= previous.time && time <= next.time) {
      return {
        previous,
        next,
        progress: (time - previous.time) / (next.time - previous.time),
      }
    }
  }

  const fallback = keyframes[keyframes.length - 1]
  return { previous: fallback, next: fallback, progress: 1 }
}

export const interpolateLightPositionKeyframes = (
  time: number,
  fallback: LightPosition,
  keyframes: Vector3Keyframe[]
): LightPosition => {
  const pair = findKeyframePair(time, keyframes)
  if (!pair) return fallback
  if (pair.previous.id === pair.next.id) return pair.previous.value

  const eased = applyEasing(pair.previous.easing, pair.progress)
  return {
    x:
      pair.previous.value.x +
      (pair.next.value.x - pair.previous.value.x) * eased,
    y:
      pair.previous.value.y +
      (pair.next.value.y - pair.previous.value.y) * eased,
    z:
      pair.previous.value.z +
      (pair.next.value.z - pair.previous.value.z) * eased,
  }
}

export const interpolateScalarKeyframes = (
  time: number,
  fallback: number,
  keyframes: ScalarKeyframe[]
): number => {
  const pair = findKeyframePair(time, keyframes)
  if (!pair) return fallback
  if (pair.previous.id === pair.next.id) return pair.previous.value

  const eased = applyEasing(pair.previous.easing, pair.progress)
  return pair.previous.value + (pair.next.value - pair.previous.value) * eased
}

export const interpolateMaterialKeyframes = (
  time: number,
  fallback: MaterialSettings,
  keyframes: MaterialKeyframe[]
): MaterialSettings => {
  const pair = findKeyframePair(time, keyframes)
  if (!pair) return fallback
  if (pair.previous.id === pair.next.id) return pair.previous.value

  const eased = applyEasing(pair.previous.easing, pair.progress)
  return (Object.keys(fallback) as MaterialSettingKey[]).reduce(
    (settings, key) => {
      settings[key] =
        pair.previous.value[key] +
        (pair.next.value[key] - pair.previous.value[key]) * eased
      return settings
    },
    { ...fallback }
  )
}
