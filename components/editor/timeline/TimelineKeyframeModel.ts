import { createEditorId } from "../EditorModel"
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
    const existing = track.keyframes.find(
      (keyframe) => Math.abs(keyframe.time - time) < 0.05
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
    const previous = [...track.keyframes]
      .sort((a, b) => a.time - b.time)
      .filter((keyframe) => keyframe.time <= time)
      .pop()
    const keyframe: Keyframe = {
      id: createEditorId(trackId),
      time,
      value,
      easing: previous?.easing ?? "ease-in-out",
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
    const existing = track.keyframes.find(
      (keyframe) => Math.abs(keyframe.time - nextTime) < 0.05
    )
    if (existing) {
      selected = { type: "track", trackId, kfId: existing.id }
      return track
    }

    const previous = [...track.keyframes]
      .sort((a, b) => a.time - b.time)
      .filter((keyframe) => keyframe.time <= nextTime)
      .pop()
    const keyframe: Keyframe = {
      id: createEditorId(trackId),
      time: nextTime,
      value: interpolateKeyframes(nextTime, track),
      easing: previous?.easing ?? "ease-in-out",
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
  const times = initial.map((keyframe) => keyframe.time)
  const minTime = Math.min(...times)
  const maxTime = Math.max(...times)
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
  const snapCandidate = initial.reduce<{
    delta: number
    distance: number
  } | null>((closest, keyframe) => {
    const movedTime = keyframe.time + delta
    const target = targets.reduce<{
      time: number
      distance: number
    } | null>((nearest, item) => {
      const distance = Math.abs(item.time - movedTime)
      if (distance > item.threshold) return nearest
      if (!nearest || distance < nearest.distance)
        return { time: item.time, distance }
      return nearest
    }, null)

    if (!target) return closest
    const candidateDelta = target.time - movedTime
    if (!closest || target.distance < closest.distance) {
      return { delta: candidateDelta, distance: target.distance }
    }
    return closest
  }, null)

  return snapCandidate
    ? clampTrackKeyframeBlockDelta({
        initial,
        delta: delta + snapCandidate.delta,
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
