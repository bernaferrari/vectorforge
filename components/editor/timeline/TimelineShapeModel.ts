import {
  DEFAULT_TRANSITION_END,
  DEFAULT_TRANSITION_START,
  type ShapeStop,
} from "../TimelineModel"

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

const SHAPE_MIN_GAP = 0.05
const TRANSITION_MIN_FRACTION = 0.04

export const clampShapeStopTime = ({
  shapes,
  shapeId,
  time,
  duration,
}: {
  shapes: ShapeStop[]
  shapeId: string
  time: number
  duration: number
}) => {
  const selfTime = shapes.find((shape) => shape.id === shapeId)?.time ?? 0
  const previousTimes = shapes
    .filter((shape) => shape.id !== shapeId && shape.time < selfTime)
    .map((shape) => shape.time)
  const nextTimes = shapes
    .filter((shape) => shape.id !== shapeId && shape.time > selfTime)
    .map((shape) => shape.time)
  const minTime = previousTimes.length
    ? Math.max(...previousTimes) + SHAPE_MIN_GAP
    : 0
  const maxTime = nextTimes.length
    ? Math.min(...nextTimes) - SHAPE_MIN_GAP
    : duration

  return clamp(time, Math.min(minTime, maxTime), Math.max(minTime, maxTime))
}

export const moveShapeStop = ({
  shapes,
  shapeId,
  time,
  duration,
}: {
  shapes: ShapeStop[]
  shapeId: string
  time: number
  duration: number
}) => {
  const nextTime = Number(
    clampShapeStopTime({ shapes, shapeId, time, duration }).toFixed(3)
  )
  return shapes.map((shape) =>
    shape.id === shapeId ? { ...shape, time: nextTime } : shape
  )
}

export const setShapeTransitionFraction = ({
  shapes,
  shapeId,
  edge,
  fraction,
}: {
  shapes: ShapeStop[]
  shapeId: string
  edge: "start" | "end"
  fraction: number
}) =>
  shapes.map((shape) => {
    if (shape.id !== shapeId) return shape
    const currentStart = shape.transitionStart ?? DEFAULT_TRANSITION_START
    const currentEnd = shape.transitionEnd ?? DEFAULT_TRANSITION_END
    const nextFraction = clamp(fraction, 0, 1)

    return edge === "start"
      ? {
          ...shape,
          transitionStart: Number(
            Math.min(nextFraction, currentEnd - TRANSITION_MIN_FRACTION).toFixed(
              3
            )
          ),
        }
      : {
          ...shape,
          transitionEnd: Number(
            Math.max(
              nextFraction,
              currentStart + TRANSITION_MIN_FRACTION
            ).toFixed(3)
          ),
        }
  })
