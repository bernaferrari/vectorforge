"use client"

import { useMemo } from "react"
import {
  createSecondGridTicks,
  createTimelineTicks,
  quantizeTimeToFrame,
  xForFrac,
} from "./TimelineGeometry"

export function useTimelineViewportState({
  currentTime,
  duration,
  timelineZoom,
  frameSnapActive,
}: {
  currentTime: number
  duration: number
  timelineZoom: number
  frameSnapActive: boolean
}) {
  const visibleCurrentTime = frameSnapActive
    ? quantizeTimeToFrame(currentTime)
    : currentTime

  const timelineTicks = useMemo(
    () =>
      createTimelineTicks({
        duration,
        timelineZoom,
        frameSnapActive,
      }),
    [duration, frameSnapActive, timelineZoom]
  )

  const secondGridTicks = useMemo(
    () => createSecondGridTicks(duration),
    [duration]
  )

  return {
    visibleCurrentTime,
    playheadX: xForFrac(visibleCurrentTime / duration),
    timelineTicks,
    secondGridTicks,
  }
}
