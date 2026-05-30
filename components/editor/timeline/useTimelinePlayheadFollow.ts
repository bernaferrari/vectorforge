"use client"

import { useEffect, type RefObject } from "react"
import { EDGE_INSET } from "./TimelineGeometry"

export function useTimelinePlayheadFollow({
  duration,
  isPlaying,
  timelineZoom,
  visibleCurrentTime,
  laneRef,
  timelineScrollRef,
}: {
  duration: number
  isPlaying: boolean
  timelineZoom: number
  visibleCurrentTime: number
  laneRef: RefObject<HTMLDivElement | null>
  timelineScrollRef: RefObject<HTMLDivElement | null>
}) {
  useEffect(() => {
    if (
      !isPlaying ||
      !timelineScrollRef.current ||
      !laneRef.current ||
      timelineZoom <= 1
    )
      return

    const scroller = timelineScrollRef.current
    const usable = Math.max(1, laneRef.current.offsetWidth - EDGE_INSET * 2)
    const playheadLeft =
      EDGE_INSET +
      usable * Math.max(0, Math.min(1, visibleCurrentTime / duration))
    const viewportLeft = scroller.scrollLeft
    const viewportRight = viewportLeft + scroller.clientWidth
    const margin = Math.min(160, scroller.clientWidth * 0.28)

    if (
      playheadLeft > viewportRight - margin ||
      playheadLeft < viewportLeft + margin
    ) {
      const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth)
      const target = Math.max(
        0,
        Math.min(maxScroll, playheadLeft - scroller.clientWidth * 0.5)
      )
      scroller.scrollLeft = target
    }
  }, [
    duration,
    isPlaying,
    laneRef,
    timelineScrollRef,
    timelineZoom,
    visibleCurrentTime,
  ])
}
