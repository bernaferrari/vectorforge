"use client"

import { RefObject, useCallback, useEffect, useState } from "react"
import {
  TIMELINE_ZOOM_MAX,
  TIMELINE_ZOOM_MIN,
  TIMELINE_ZOOM_STEP,
  isEditableTarget,
} from "./TimelineGeometry"
import { clampTimelineDuration } from "../TimelineDurationModel"

const clampTimelineZoom = (zoom: number) =>
  Number(
    Math.max(TIMELINE_ZOOM_MIN, Math.min(TIMELINE_ZOOM_MAX, zoom)).toFixed(2)
  )

type TimelineZoomAndDurationOptions = {
  duration: number
  onDurationChange: (duration: number) => void
  timelineScrollRef: RefObject<HTMLDivElement | null>
}

export function useTimelineZoomAndDuration({
  duration,
  onDurationChange,
  timelineScrollRef,
}: TimelineZoomAndDurationOptions) {
  const [timelineZoom, setTimelineZoom] = useState(1)
  const [durationEditor, setDurationEditor] = useState<string | null>(null)

  const fitTimeline = useCallback(() => {
    setTimelineZoom(1)
    window.requestAnimationFrame(() => {
      if (timelineScrollRef.current) timelineScrollRef.current.scrollLeft = 0
    })
  }, [timelineScrollRef])

  const commitDurationEditor = useCallback(() => {
    if (durationEditor === null) return
    const parsed = Number.parseFloat(durationEditor)
    if (Number.isFinite(parsed)) {
      onDurationChange(clampTimelineDuration(parsed))
    }
    setDurationEditor(null)
  }, [durationEditor, onDurationChange])

  const openDurationEditor = useCallback(
    () => setDurationEditor(duration.toFixed(1)),
    [duration]
  )

  const applyDuration = useCallback(
    (value: number) => {
      onDurationChange(clampTimelineDuration(value))
      setDurationEditor(null)
    },
    [onDurationChange]
  )

  const adjustTimelineZoom = useCallback((delta: number) => {
    setTimelineZoom((zoom) => clampTimelineZoom(zoom + delta))
  }, [])

  useEffect(() => {
    const handleTimelineZoomShortcut = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === "+" || event.key === "=") {
        event.preventDefault()
        adjustTimelineZoom(TIMELINE_ZOOM_STEP)
      }
      if (event.key === "-" || event.key === "_") {
        event.preventDefault()
        adjustTimelineZoom(-TIMELINE_ZOOM_STEP)
      }
      if (event.key === "0") {
        event.preventDefault()
        fitTimeline()
      }
    }

    window.addEventListener("keydown", handleTimelineZoomShortcut)
    return () =>
      window.removeEventListener("keydown", handleTimelineZoomShortcut)
  }, [adjustTimelineZoom, fitTimeline])

  return {
    timelineZoom,
    durationEditor,
    setDurationEditor,
    fitTimeline,
    commitDurationEditor,
    openDurationEditor,
    applyDuration,
    adjustTimelineZoom,
  }
}
