import type { Dispatch, SetStateAction } from "react"
import type {
  MaterialKeyframe,
  ScalarKeyframe,
  Vector3Keyframe,
} from "./EditorModel"
import { clampNumber, quantizeTimeToFrame } from "./EditorModel"
import type { FillKeyframe, ShapeStop, TimelineTrack } from "./TimelineModel"

export const clampTimelineDuration = (duration: number) =>
  Math.max(0.5, Math.min(30, Number(duration.toFixed(1))))

export const scaleTimelineTime = ({
  time,
  ratio,
  duration,
}: {
  time: number
  ratio: number
  duration: number
}) => quantizeTimeToFrame(clampNumber(time * ratio, 0, duration))

const sortByTime = <T extends { time: number }>(items: T[]) =>
  [...items].sort((a, b) => a.time - b.time)

export const scaleKeyframeTimes = <T extends { time: number }>(
  keyframes: T[],
  ratio: number,
  duration: number
): T[] =>
  sortByTime(
    keyframes.map((keyframe) => ({
      ...keyframe,
      time: scaleTimelineTime({ time: keyframe.time, ratio, duration }),
    }))
  )

export const scaleShapeStopTimes = (
  shapes: ShapeStop[],
  ratio: number,
  duration: number
) =>
  sortByTime(
    shapes.map((shape) => ({
      ...shape,
      time: scaleTimelineTime({ time: shape.time, ratio, duration }),
      fillKeyframes: shape.fillKeyframes
        ? scaleKeyframeTimes(shape.fillKeyframes, ratio, duration)
        : shape.fillKeyframes,
    }))
  )

export const scaleTimelineTrackTimes = (
  tracks: TimelineTrack[],
  ratio: number,
  duration: number
) =>
  tracks.map((track) => ({
    ...track,
    keyframes: scaleKeyframeTimes(track.keyframes, ratio, duration),
  }))

export type TimelineDurationKeyframeSetters = {
  setFillKeyframes: Dispatch<SetStateAction<FillKeyframe[]>>
  setMaterialKeyframes: Dispatch<SetStateAction<MaterialKeyframe[]>>
  setKeyLightPositionKeyframes: Dispatch<SetStateAction<Vector3Keyframe[]>>
  setRotationAxisKeyframes: Dispatch<SetStateAction<Vector3Keyframe[]>>
  setMoveKeyframes: Dispatch<SetStateAction<Vector3Keyframe[]>>
  setQualityKeyframes: Dispatch<SetStateAction<ScalarKeyframe[]>>
  setInnerScaleKeyframes: Dispatch<SetStateAction<Vector3Keyframe[]>>
}

export const scaleTimelineKeyframeState = ({
  ratio,
  duration,
  setters,
}: {
  ratio: number
  duration: number
  setters: TimelineDurationKeyframeSetters
}) => {
  setters.setFillKeyframes((prev) => scaleKeyframeTimes(prev, ratio, duration))
  setters.setMaterialKeyframes((prev) =>
    scaleKeyframeTimes(prev, ratio, duration)
  )
  setters.setKeyLightPositionKeyframes((prev) =>
    scaleKeyframeTimes(prev, ratio, duration)
  )
  setters.setRotationAxisKeyframes((prev) =>
    scaleKeyframeTimes(prev, ratio, duration)
  )
  setters.setMoveKeyframes((prev) => scaleKeyframeTimes(prev, ratio, duration))
  setters.setQualityKeyframes((prev) =>
    scaleKeyframeTimes(prev, ratio, duration)
  )
  setters.setInnerScaleKeyframes((prev) =>
    scaleKeyframeTimes(prev, ratio, duration)
  )
}
