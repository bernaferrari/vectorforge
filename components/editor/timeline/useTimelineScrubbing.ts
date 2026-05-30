"use client"

import type { MouseEvent, RefObject } from "react"
import { useRef } from "react"
import { bindWindowMouseDrag } from "@/lib/drag-events"
import {
  EDGE_INSET,
  TIMELINE_EDGE_SCROLL_MAX,
  TIMELINE_EDGE_SCROLL_ZONE,
  rawTimeFromTimelineClientX,
  type TimelineViewportGeometry,
} from "./TimelineGeometry"
import type { SnapTimeOptions } from "./TimelineSnapping"
import { snapTimelineTime } from "./TimelineSnapping"

type TimelineScrubbingOptions = {
  duration: number
  currentTime: number
  timelineZoom: number
  snapEnabled: boolean
  frameSnapActive: boolean
  baseBreakpointTimes: number[]
  getBreakpointTimes: (options: SnapTimeOptions) => number[]
  laneRef: RefObject<HTMLDivElement | null>
  timelineScrollRef: RefObject<HTMLDivElement | null>
  onTimeChange: (time: number) => void
  onScrubStart?: () => void
  onClearSelectedKeyframe: () => void
}

export function useTimelineScrubbing({
  duration,
  currentTime,
  timelineZoom,
  snapEnabled,
  frameSnapActive,
  baseBreakpointTimes,
  getBreakpointTimes,
  laneRef,
  timelineScrollRef,
  onTimeChange,
  onScrubStart,
  onClearSelectedKeyframe,
}: TimelineScrubbingOptions) {
  const scrubEdgeClientXRef = useRef<number | null>(null)
  const scrubEdgeRafRef = useRef<number | null>(null)
  const scrubGeometryRef = useRef<TimelineViewportGeometry | null>(null)
  const scrubSnapTimesRef = useRef<number[] | null>(null)
  const scrubLastTimeRef = useRef<number | null>(null)
  const scrubPendingTimeRef = useRef<number | null>(null)
  const scrubEmitRafRef = useRef<number | null>(null)

  const snapTime = (rawTime: number, options: SnapTimeOptions = {}) =>
    snapTimelineTime({
      rawTime,
      duration,
      currentTime,
      snapEnabled,
      frameSnapActive,
      baseBreakpointTimes,
      getBreakpointTimes,
      scrubSnapTimes: scrubSnapTimesRef.current,
      options,
    })

  const getTimelineGeometry = (): TimelineViewportGeometry | null => {
    if (!laneRef.current) return null
    const laneRect = laneRef.current.getBoundingClientRect()
    const scrollerRect = timelineScrollRef.current?.getBoundingClientRect()

    return {
      laneLeft: laneRect.left,
      laneWidth: laneRect.width,
      usableWidth: Math.max(1, laneRect.width - EDGE_INSET * 2),
      viewportLeft: scrollerRect?.left ?? laneRect.left,
      viewportRight: scrollerRect?.right ?? laneRect.right,
    }
  }

  const rawTimeFromClientX = (
    clientX: number,
    options: {
      clampToViewport?: boolean
      geometry?: TimelineViewportGeometry | null
    } = {}
  ) => {
    const geometry = options.geometry ?? getTimelineGeometry()
    if (!geometry) return currentTime
    return rawTimeFromTimelineClientX({
      clientX,
      duration,
      geometry,
      clampToViewport: options.clampToViewport,
    })
  }

  const timeFromClientX = (
    clientX: number,
    options: SnapTimeOptions & {
      clampToViewport?: boolean
      geometry?: TimelineViewportGeometry | null
    } = {}
  ) =>
    Number(
      snapTime(
        rawTimeFromClientX(clientX, {
          clampToViewport: options.clampToViewport,
          geometry: options.geometry,
        }),
        options
      ).toFixed(3)
    )

  const flushScrubTime = () => {
    const time = scrubPendingTimeRef.current
    scrubPendingTimeRef.current = null
    scrubEmitRafRef.current = null
    if (time === null) return
    if (
      scrubLastTimeRef.current !== null &&
      Math.abs(scrubLastTimeRef.current - time) < 0.0005
    )
      return
    scrubLastTimeRef.current = time
    onTimeChange(time)
  }

  const emitScrubTime = (
    time: number,
    options: { immediate?: boolean } = {}
  ) => {
    if (
      scrubLastTimeRef.current !== null &&
      Math.abs(scrubLastTimeRef.current - time) < 0.0005
    )
      return
    if (
      scrubPendingTimeRef.current !== null &&
      Math.abs(scrubPendingTimeRef.current - time) < 0.0005
    )
      return

    scrubPendingTimeRef.current = time
    if (options.immediate) {
      if (scrubEmitRafRef.current !== null) {
        cancelAnimationFrame(scrubEmitRafRef.current)
      }
      flushScrubTime()
      return
    }

    if (scrubEmitRafRef.current === null) {
      scrubEmitRafRef.current = requestAnimationFrame(flushScrubTime)
    }
  }

  const scrollTimelineNearEdge = (clientX: number) => {
    const scroller = timelineScrollRef.current
    if (!scroller || timelineZoom <= 1) return false

    const rect = scroller.getBoundingClientRect()
    const leftDistance = clientX - rect.left
    const rightDistance = rect.right - clientX
    let delta = 0

    if (leftDistance < TIMELINE_EDGE_SCROLL_ZONE) {
      delta =
        -(
          (TIMELINE_EDGE_SCROLL_ZONE - Math.max(0, leftDistance)) /
          TIMELINE_EDGE_SCROLL_ZONE
        ) * TIMELINE_EDGE_SCROLL_MAX
    } else if (rightDistance < TIMELINE_EDGE_SCROLL_ZONE) {
      delta =
        ((TIMELINE_EDGE_SCROLL_ZONE - Math.max(0, rightDistance)) /
          TIMELINE_EDGE_SCROLL_ZONE) *
        TIMELINE_EDGE_SCROLL_MAX
    }

    if (delta !== 0) {
      scroller.scrollLeft += delta
      return true
    }

    return false
  }

  const stopScrubEdgeScroll = () => {
    if (scrubEmitRafRef.current !== null) {
      cancelAnimationFrame(scrubEmitRafRef.current)
      scrubEmitRafRef.current = null
    }
    flushScrubTime()
    scrubEdgeClientXRef.current = null
    scrubGeometryRef.current = null
    scrubSnapTimesRef.current = null
    scrubLastTimeRef.current = null
    scrubPendingTimeRef.current = null
    if (scrubEdgeRafRef.current !== null) {
      cancelAnimationFrame(scrubEdgeRafRef.current)
      scrubEdgeRafRef.current = null
    }
  }

  const startScrubEdgeScroll = (options: SnapTimeOptions) => {
    if (scrubEdgeRafRef.current !== null) {
      cancelAnimationFrame(scrubEdgeRafRef.current)
      scrubEdgeRafRef.current = null
    }
    const tick = () => {
      const clientX = scrubEdgeClientXRef.current
      if (clientX === null) {
        scrubEdgeRafRef.current = null
        return
      }
      const didScroll = scrollTimelineNearEdge(clientX)
      if (didScroll) {
        scrubGeometryRef.current = getTimelineGeometry()
        emitScrubTime(
          timeFromClientX(clientX, {
            ...options,
            clampToViewport: true,
            geometry: scrubGeometryRef.current,
          })
        )
      }
      scrubEdgeRafRef.current = requestAnimationFrame(tick)
    }
    scrubEdgeRafRef.current = requestAnimationFrame(tick)
  }

  const handleScrubStart = (event: MouseEvent) => {
    onClearSelectedKeyframe()
    onScrubStart?.()
    const initialOptions = {
      bypass: event.altKey,
      snapToWholeSeconds: true,
    }
    scrubGeometryRef.current = getTimelineGeometry()
    scrubSnapTimesRef.current = baseBreakpointTimes
    scrubLastTimeRef.current = null
    scrubEdgeClientXRef.current = event.clientX
    emitScrubTime(
      timeFromClientX(event.clientX, {
        ...initialOptions,
        geometry: scrubGeometryRef.current,
      }),
      { immediate: true }
    )
    startScrubEdgeScroll(initialOptions)
    bindWindowMouseDrag({
      onMove: (moveEvent) => {
        const options = {
          bypass: moveEvent.altKey,
          snapToWholeSeconds: true,
        }
        scrubEdgeClientXRef.current = moveEvent.clientX
        emitScrubTime(
          timeFromClientX(moveEvent.clientX, {
            ...options,
            clampToViewport: true,
            geometry: scrubGeometryRef.current,
          })
        )
      },
      onEnd: stopScrubEdgeScroll,
    })
  }

  return {
    snapTime,
    rawTimeFromClientX,
    timeFromClientX,
    handleScrubStart,
  }
}
