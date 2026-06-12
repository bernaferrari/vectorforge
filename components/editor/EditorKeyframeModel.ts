import {
  type LightPosition,
  type MaterialKeyframe,
  type MaterialSettings,
  type TimeKeyframe,
  type Vector3Keyframe,
  clampNumber,
  createEditorId,
  quantizeTimeToFrame,
} from "./EditorModel"
import type { EasingType, FillKeyframe, TimelineTrack } from "./TimelineModel"

type EasedTimeKeyframe = TimeKeyframe & {
  easing?: FillKeyframe["easing"]
}

export const KEYFRAME_TIME_EPSILON = 0.0005

export const keyframeTimeMatches = (
  keyframeTime: number,
  time: number
) =>
  Math.abs(quantizeTimeToFrame(keyframeTime) - quantizeTimeToFrame(time)) <=
  KEYFRAME_TIME_EPSILON

export const findKeyframeAtTime = <T extends TimeKeyframe>(
  keyframes: T[],
  time: number
) => keyframes.find((keyframe) => keyframeTimeMatches(keyframe.time, time))

export const removeKeyframesAtTime = <T extends TimeKeyframe>(
  keyframes: T[],
  time: number
) => keyframes.filter((keyframe) => !keyframeTimeMatches(keyframe.time, time))

export const removeKeyframeById = <T extends { id: string }>(
  keyframes: T[],
  keyframeId: string
) => keyframes.filter((keyframe) => keyframe.id !== keyframeId)

export const moveKeyframeById = <T extends { id: string; time: number }>(
  keyframes: T[],
  keyframeId: string,
  time: number
) =>
  keyframes
    .map((keyframe) =>
      keyframe.id === keyframeId ? { ...keyframe, time } : keyframe
    )
    .sort((a, b) => a.time - b.time)

export const setKeyframeEasingById = <
  T extends { id: string; easing: EasingType },
>(
  keyframes: T[],
  keyframeId: string | null,
  easing: EasingType
) =>
  keyframes.map((keyframe) =>
    keyframeId === null || keyframe.id === keyframeId
      ? { ...keyframe, easing }
      : keyframe
  )

export const addKeyframeAtTime = <T extends EasedTimeKeyframe>({
  keyframes,
  time,
  create,
}: {
  keyframes: T[]
  time: number
  create: (easing: FillKeyframe["easing"]) => T
}) => {
  if (findKeyframeAtTime(keyframes, time)) return keyframes
  return [...keyframes, create(previousEasingFor(keyframes, time))].sort(
    (a, b) => a.time - b.time
  )
}

export const previousEasingFor = <T extends EasedTimeKeyframe>(
  keyframes: T[],
  time: number
): FillKeyframe["easing"] => {
  let previous: T | undefined
  for (const keyframe of keyframes) {
    if (keyframe.time <= time && (!previous || keyframe.time > previous.time)) {
      previous = keyframe
    }
  }
  return previous?.easing ?? "ease-in-out"
}

export const normalizedPlayheadTime = (time: number, duration: number) =>
  clampNumber(quantizeTimeToFrame(time), 0, duration)

export const toggleScalarTrackKeyframeAtTime = ({
  tracks,
  trackId,
  value,
  time,
  duration,
}: {
  tracks: TimelineTrack[]
  trackId: string
  value: number
  time: number
  duration: number
}) => {
  const playheadTime = normalizedPlayheadTime(time, duration)
  return tracks.map((track) => {
    if (track.id !== trackId) return track
    const clampedValue = clampNumber(value, track.min, track.max)
    const existing = findKeyframeAtTime(track.keyframes, playheadTime)
    return {
      ...track,
      defaultValue: clampedValue,
      keyframes: existing
        ? track.keyframes.filter((keyframe) => keyframe.id !== existing.id)
        : [
            ...track.keyframes,
            {
              id: createEditorId(track.id),
              time: playheadTime,
              value: clampedValue,
              easing: "ease-in-out" as const,
            },
          ].sort((a, b) => a.time - b.time),
    }
  })
}

export const upsertVectorKeyframeAtTime = ({
  keyframes,
  idPrefix,
  value,
  time,
  duration,
  createIfMissing,
}: {
  keyframes: Vector3Keyframe[]
  idPrefix: string
  value: LightPosition
  time: number
  duration: number
  createIfMissing: boolean
}) => {
  const playheadTime = normalizedPlayheadTime(time, duration)
  const existing = findKeyframeAtTime(keyframes, playheadTime)
  if (existing) {
    return keyframes.map((keyframe) =>
      keyframe.id === existing.id ? { ...keyframe, value } : keyframe
    )
  }
  if (!createIfMissing) return keyframes
  return [
    ...keyframes,
    {
      id: createEditorId(idPrefix),
      time: playheadTime,
      value,
      easing: previousEasingFor(keyframes, playheadTime),
    },
  ].sort((a, b) => a.time - b.time)
}

export const toggleStyleKeyframesAtTime = ({
  fillKeyframes,
  materialKeyframes,
  fillStops,
  fillGradientType,
  materialSettings,
  time,
  duration,
}: {
  fillKeyframes: FillKeyframe[]
  materialKeyframes: MaterialKeyframe[]
  fillStops: FillKeyframe["stops"]
  fillGradientType: FillKeyframe["gradientType"]
  materialSettings: MaterialSettings
  time: number
  duration: number
}) => {
  const playheadTime = normalizedPlayheadTime(time, duration)
  const isKeyedHere = Boolean(
    findKeyframeAtTime(fillKeyframes, playheadTime) ||
    findKeyframeAtTime(materialKeyframes, playheadTime)
  )

  return {
    fillKeyframes: isKeyedHere
      ? removeKeyframesAtTime(fillKeyframes, playheadTime)
      : [
          ...fillKeyframes,
          {
            id: createEditorId("fill"),
            time: playheadTime,
            stops: fillStops,
            gradientType: fillGradientType,
            easing: previousEasingFor(fillKeyframes, playheadTime),
          },
        ].sort((a, b) => a.time - b.time),
    materialKeyframes: isKeyedHere
      ? removeKeyframesAtTime(materialKeyframes, playheadTime)
      : [
          ...materialKeyframes,
          {
            id: createEditorId("material"),
            time: playheadTime,
            value: materialSettings,
            easing: previousEasingFor(materialKeyframes, playheadTime),
          },
        ].sort((a, b) => a.time - b.time),
  }
}
