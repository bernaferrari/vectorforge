import {
  PLAYHEAD_SNAP_THRESHOLD_SECONDS,
  SECOND_SNAP_THRESHOLD_SECONDS,
  SNAP_THRESHOLD_SECONDS,
  quantizeTimeToFrame,
} from "./TimelineGeometry"

export { PLAYHEAD_SNAP_THRESHOLD_SECONDS, SNAP_THRESHOLD_SECONDS }

export type SnapTimeOptions = {
  bypass?: boolean
  excludeShapeId?: string
  excludeKeyframe?: { trackId: string; kfId: string }
  excludeTrackId?: string
  snapToPlayhead?: boolean
  snapToWholeSeconds?: boolean
}

export const nearestWithin = (
  times: number[],
  time: number,
  threshold: number
) =>
  times.reduce<{ time: number; distance: number } | null>((closest, target) => {
    const distance = Math.abs(target - time)
    if (distance > threshold) return closest
    if (!closest || distance < closest.distance)
      return { time: target, distance }
    return closest
  }, null)

export const hasExcludedSnapTarget = (options: SnapTimeOptions) =>
  Boolean(
    options.excludeShapeId || options.excludeKeyframe || options.excludeTrackId
  )

export const snapTimelineTime = ({
  rawTime,
  duration,
  currentTime,
  snapEnabled,
  frameSnapActive,
  baseBreakpointTimes,
  getBreakpointTimes,
  scrubSnapTimes,
  options = {},
}: {
  rawTime: number
  duration: number
  currentTime: number
  snapEnabled: boolean
  frameSnapActive: boolean
  baseBreakpointTimes: number[]
  scrubSnapTimes?: number[] | null
  getBreakpointTimes: (options: SnapTimeOptions) => number[]
  options?: SnapTimeOptions
}) => {
  const clamped = Math.max(0, Math.min(duration, rawTime))
  const quantizeIfNeeded = (time: number) =>
    frameSnapActive && !options.bypass
      ? Math.max(0, Math.min(duration, quantizeTimeToFrame(time)))
      : time

  if (!snapEnabled || options.bypass) return clamped

  if (options.snapToPlayhead) {
    const playheadTime = frameSnapActive
      ? quantizeTimeToFrame(currentTime)
      : currentTime
    if (
      Math.abs(playheadTime - clamped) <= PLAYHEAD_SNAP_THRESHOLD_SECONDS &&
      playheadTime >= 0 &&
      playheadTime <= duration
    ) {
      return quantizeIfNeeded(playheadTime)
    }
  }

  const candidateTimes = hasExcludedSnapTarget(options)
    ? getBreakpointTimes(options)
    : (scrubSnapTimes ?? baseBreakpointTimes)

  const nearest = nearestWithin(candidateTimes, clamped, SNAP_THRESHOLD_SECONDS)
  if (nearest) return quantizeIfNeeded(nearest.time)

  if (options.snapToWholeSeconds) {
    const wholeSecond = Math.round(clamped)
    if (
      wholeSecond > 0 &&
      wholeSecond <= duration &&
      Math.abs(wholeSecond - clamped) <= SECOND_SNAP_THRESHOLD_SECONDS
    ) {
      return quantizeIfNeeded(wholeSecond)
    }
  }

  return quantizeIfNeeded(clamped)
}
