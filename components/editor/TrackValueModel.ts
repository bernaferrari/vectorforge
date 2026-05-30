import { type TimelineTrack } from "./TimelineModel"
import { clampNumber, createEditorId, quantizeTimeToFrame } from "./EditorModel"

const previousEasingForTrack = (track: TimelineTrack, time: number) => {
  let previous: (typeof track.keyframes)[number] | undefined
  for (const keyframe of track.keyframes) {
    if (keyframe.time <= time && (!previous || keyframe.time > previous.time)) {
      previous = keyframe
    }
  }
  return previous?.easing ?? "ease-in-out"
}

export const setScalarTrackValueAtTime = ({
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
  const sourceTrack = tracks.find((track) => track.id === trackId)
  const nextValue = sourceTrack
    ? clampNumber(value, sourceTrack.min, sourceTrack.max)
    : value
  const playheadTime = clampNumber(quantizeTimeToFrame(time), 0, duration)

  return {
    value: nextValue,
    tracks: tracks.map((track) => {
      if (track.id !== trackId) return track

      if (track.keyframes.length === 0) {
        if (track.defaultValue === nextValue) return track
        return { ...track, defaultValue: nextValue }
      }

      const exactKeyframe = track.keyframes.find(
        (keyframe) => Math.abs(keyframe.time - playheadTime) < 0.04
      )

      if (exactKeyframe) {
        if (
          exactKeyframe.value === nextValue &&
          track.defaultValue === nextValue
        ) {
          return track
        }
        return {
          ...track,
          defaultValue: nextValue,
          keyframes: track.keyframes.map((keyframe) =>
            keyframe.id === exactKeyframe.id
              ? { ...keyframe, value: nextValue }
              : keyframe
          ),
        }
      }

      return {
        ...track,
        defaultValue: nextValue,
        keyframes: [
          ...track.keyframes,
          {
            id: createEditorId(track.id),
            time: playheadTime,
            value: nextValue,
            easing: previousEasingForTrack(track, playheadTime),
          },
        ].sort((a, b) => a.time - b.time),
      }
    }),
  }
}
