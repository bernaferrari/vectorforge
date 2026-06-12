import {
  DEFAULT_TRANSITION_END,
  DEFAULT_TRANSITION_START,
  type ShapeStop,
  type TimelineTrack,
} from "./TimelineModel"
import {
  type MaterialKeyframe,
  type Vector3Keyframe,
  clampNumber,
} from "./EditorModel"
import { KEYFRAME_TIME_EPSILON } from "./EditorKeyframeModel"
import type { FillKeyframe } from "./TimelineModel"

export const createShapeTransitionBreakpoints = (shapes: ShapeStop[]) =>
  shapes.slice(0, -1).flatMap((from, index) => {
    const to = shapes[index + 1]
    const gap = Math.max(0, to.time - from.time)
    const start =
      from.time + (from.transitionStart ?? DEFAULT_TRANSITION_START) * gap
    const end = from.time + (from.transitionEnd ?? DEFAULT_TRANSITION_END) * gap
    return [start, end]
  })

export const createTimelineBreakpoints = ({
  duration,
  shapes,
  fillKeyframes,
  tracks,
  rotationAxisKeyframes,
  moveKeyframes,
  keyLightPositionKeyframes,
  materialKeyframes,
}: {
  duration: number
  shapes: ShapeStop[]
  fillKeyframes: FillKeyframe[]
  tracks: TimelineTrack[]
  rotationAxisKeyframes: Vector3Keyframe[]
  moveKeyframes: Vector3Keyframe[]
  keyLightPositionKeyframes: Vector3Keyframe[]
  materialKeyframes: MaterialKeyframe[]
}) =>
  Array.from(
    new Set(
      [
        0,
        duration,
        ...createShapeTransitionBreakpoints(shapes),
        ...fillKeyframes.map((keyframe) => keyframe.time),
        ...tracks.flatMap((track) =>
          track.keyframes.map((keyframe) => keyframe.time)
        ),
        ...rotationAxisKeyframes.map((keyframe) => keyframe.time),
        ...moveKeyframes.map((keyframe) => keyframe.time),
        ...keyLightPositionKeyframes.map((keyframe) => keyframe.time),
        ...materialKeyframes.map((keyframe) => keyframe.time),
      ].map((time) => Number(clampNumber(time, 0, duration).toFixed(3)))
    )
  ).sort((a, b) => a - b)

export const getAdjacentTimelineBreakpoints = ({
  breakpoints,
  currentTime,
}: {
  breakpoints: number[]
  currentTime: number
}) => {
  let previousBreakpoint: number | undefined
  let nextBreakpoint: number | undefined
  for (const time of breakpoints) {
    if (time < currentTime - KEYFRAME_TIME_EPSILON) {
      previousBreakpoint = time
    } else if (time > currentTime + KEYFRAME_TIME_EPSILON) {
      nextBreakpoint = time
      break
    }
  }
  return { previousBreakpoint, nextBreakpoint }
}
