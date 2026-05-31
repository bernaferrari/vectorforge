import { createEditorId } from "../EditorModel"
import { keyframeTimeMatches, previousEasingFor } from "../EditorKeyframeModel"
import {
  EasingType,
  Keyframe,
  TimelineTrack,
  interpolateKeyframes,
} from "../TimelineModel"
import { quantizeTimeToFrame } from "./TimelineGeometry"
import type { SelectedTimelineKeyframe } from "./TimelineTypes"

const clampTime = (time: number, duration: number) =>
  Math.max(0, Math.min(duration, time))

const formatTime = (time: number, frameSnapActive: boolean) =>
  Number((frameSnapActive ? quantizeTimeToFrame(time) : time).toFixed(3))

export const toggleTrackKeyframeAtTime = ({
  tracks,
  trackId,
  time,
}: {
  tracks: TimelineTrack[]
  trackId: string
  time: number
}) => {
  let selected: SelectedTimelineKeyframe = null
  const nextTracks = tracks.map((track) => {
    if (track.id !== trackId) return track
    const existing = track.keyframes.find((keyframe) =>
      keyframeTimeMatches(keyframe.time, time, 0.05)
    )
    if (existing) {
      return {
        ...track,
        keyframes: track.keyframes.filter(
          (keyframe) => keyframe.id !== existing.id
        ),
      }
    }

    const value = interpolateKeyframes(time, track)
    const keyframe: Keyframe = {
      id: createEditorId(trackId),
      time,
      value,
      easing: previousEasingFor(track.keyframes, time),
    }
    selected = { type: "track", trackId, kfId: keyframe.id }

    return {
      ...track,
      keyframes: [...track.keyframes, keyframe].sort((a, b) => a.time - b.time),
    }
  })

  return { tracks: nextTracks, selected }
}

export const addTrackKeyframeAtTime = ({
  tracks,
  trackId,
  time,
  duration,
  frameSnapActive,
}: {
  tracks: TimelineTrack[]
  trackId: string
  time: number
  duration: number
  frameSnapActive: boolean
}) => {
  const nextTime = formatTime(clampTime(time, duration), frameSnapActive)
  let selected: SelectedTimelineKeyframe = null
  const nextTracks = tracks.map((track) => {
    if (track.id !== trackId) return track
    const existing = track.keyframes.find((keyframe) =>
      keyframeTimeMatches(keyframe.time, nextTime, 0.05)
    )
    if (existing) {
      selected = { type: "track", trackId, kfId: existing.id }
      return track
    }

    const keyframe: Keyframe = {
      id: createEditorId(trackId),
      time: nextTime,
      value: interpolateKeyframes(nextTime, track),
      easing: previousEasingFor(track.keyframes, nextTime),
    }
    selected = { type: "track", trackId, kfId: keyframe.id }

    return {
      ...track,
      keyframes: [...track.keyframes, keyframe].sort((a, b) => a.time - b.time),
    }
  })

  return { tracks: nextTracks, selected, time: nextTime }
}

export const removeTrackKeyframeById = (
  tracks: TimelineTrack[],
  trackId: string,
  keyframeId: string
) =>
  tracks.map((track) =>
    track.id === trackId
      ? {
          ...track,
          keyframes: track.keyframes.filter(
            (keyframe) => keyframe.id !== keyframeId
          ),
        }
      : track
  )

export const setTrackKeyframeTime = ({
  tracks,
  trackId,
  keyframeId,
  time,
  duration,
  frameSnapActive,
}: {
  tracks: TimelineTrack[]
  trackId: string
  keyframeId: string
  time: number
  duration: number
  frameSnapActive: boolean
}) => {
  const nextTime = formatTime(clampTime(time, duration), frameSnapActive)
  return tracks.map((track) =>
    track.id === trackId
      ? {
          ...track,
          keyframes: track.keyframes
            .map((keyframe) =>
              keyframe.id === keyframeId
                ? { ...keyframe, time: nextTime }
                : keyframe
            )
            .sort((a, b) => a.time - b.time),
        }
      : track
  )
}

export const moveTrackKeyframe = ({
  tracks,
  trackId,
  keyframeId,
  time,
}: {
  tracks: TimelineTrack[]
  trackId: string
  keyframeId: string
  time: number
}) =>
  tracks.map((track) =>
    track.id === trackId
      ? {
          ...track,
          keyframes: track.keyframes
            .map((keyframe) =>
              keyframe.id === keyframeId ? { ...keyframe, time } : keyframe
            )
            .sort((a, b) => a.time - b.time),
        }
      : track
  )

export type TrackKeyframeTimeSnapshot = {
  id: string
  time: number
}

export const clampTrackKeyframeBlockDelta = ({
  initial,
  delta,
  duration,
}: {
  initial: TrackKeyframeTimeSnapshot[]
  delta: number
  duration: number
}) => {
  if (initial.length === 0) return 0
  let minTime = Infinity
  let maxTime = -Infinity
  initial.forEach((keyframe) => {
    minTime = Math.min(minTime, keyframe.time)
    maxTime = Math.max(maxTime, keyframe.time)
  })
  if (minTime + delta < 0) return -minTime
  if (maxTime + delta > duration) return duration - maxTime
  return delta
}

export type TrackKeyframeBlockSnapTarget = {
  time: number
  threshold: number
}

export const createTrackKeyframeBlockSnapTargets = ({
  breakpointTimes,
  playheadTime,
  duration,
  snapThreshold,
  playheadSnapThreshold,
}: {
  breakpointTimes: number[]
  playheadTime: number
  duration: number
  snapThreshold: number
  playheadSnapThreshold: number
}): TrackKeyframeBlockSnapTarget[] => [
  ...breakpointTimes.map((time) => ({
    time,
    threshold: snapThreshold,
  })),
  ...(playheadTime >= 0 && playheadTime <= duration
    ? [
        {
          time: playheadTime,
          threshold: playheadSnapThreshold,
        },
      ]
    : []),
]

export const snapTrackKeyframeBlockDelta = ({
  initial,
  delta,
  targets,
  duration,
}: {
  initial: TrackKeyframeTimeSnapshot[]
  delta: number
  targets: TrackKeyframeBlockSnapTarget[]
  duration: number
}) => {
  let snapDelta = 0
  let snapDistance = Infinity

  initial.forEach((keyframe) => {
    const movedTime = keyframe.time + delta
    let targetTime = 0
    let targetDistance = Infinity

    targets.forEach((item) => {
      const distance = Math.abs(item.time - movedTime)
      if (distance > item.threshold || distance >= targetDistance) return
      targetTime = item.time
      targetDistance = distance
    })

    if (targetDistance < snapDistance) {
      snapDelta = targetTime - movedTime
      snapDistance = targetDistance
    }
  })

  return Number.isFinite(snapDistance)
    ? clampTrackKeyframeBlockDelta({
        initial,
        delta: delta + snapDelta,
        duration,
      })
    : delta
}

export const offsetTrackKeyframeBlock = ({
  tracks,
  trackId,
  initial,
  delta,
  duration,
  frameSnapActive,
}: {
  tracks: TimelineTrack[]
  trackId: string
  initial: TrackKeyframeTimeSnapshot[]
  delta: number
  duration: number
  frameSnapActive: boolean
}) => {
  const initialTimesById = new Map(
    initial.map((keyframe) => [keyframe.id, keyframe.time])
  )

  return tracks.map((track) =>
    track.id !== trackId
      ? track
      : {
          ...track,
          keyframes: track.keyframes.map((keyframe) => {
            const initialTime = initialTimesById.get(keyframe.id)
            if (initialTime === undefined) return keyframe
            const nextTime = clampTime(initialTime + delta, duration)
            return {
              ...keyframe,
              time: formatTime(nextTime, frameSnapActive),
            }
          }),
        }
  )
}

export const setTrackEasing = (
  tracks: TimelineTrack[],
  trackId: string,
  easing: EasingType
) =>
  tracks.map((track) =>
    track.id === trackId
      ? {
          ...track,
          keyframes: track.keyframes.map((keyframe) => ({
            ...keyframe,
            easing,
          })),
        }
      : track
  )

export const setSingleKeyframeEasing = (
  tracks: TimelineTrack[],
  trackId: string,
  keyframeId: string,
  easing: EasingType
) =>
  tracks.map((track) =>
    track.id === trackId
      ? {
          ...track,
          keyframes: track.keyframes.map((keyframe) =>
            keyframe.id === keyframeId ? { ...keyframe, easing } : keyframe
          ),
        }
      : track
  )
