import { useCallback, useMemo } from "react"
import {
  DEFAULT_TRANSITION_END,
  DEFAULT_TRANSITION_START,
  ShapeStop,
  TimelinePropertyRow,
  TimelineTrack,
} from "../TimelineModel"
import {
  BreakpointTimeOptions,
  collectBreakpointTimes,
  computeMorphWindows,
  computeShapeClipBounds,
} from "./TimelineLayoutModel"
import { TIMELINE_ZOOM_MAX } from "./TimelineGeometry"
import type { ShapeOption } from "./TimelineTypes"

export const useTimelineDerivedState = ({
  duration,
  timelineZoom,
  shapes,
  tracks,
  propertyRows,
  shapeOptions,
  activeTrackId,
}: {
  duration: number
  timelineZoom: number
  shapes: ShapeStop[]
  tracks: TimelineTrack[]
  propertyRows: TimelinePropertyRow[]
  shapeOptions: ShapeOption[]
  activeTrackId?: string | null
}) => {
  const sortedShapes = useMemo(
    () => [...shapes].sort((a, b) => a.time - b.time),
    [shapes]
  )
  const visiblePropertyRows = useMemo(
    () => propertyRows.filter((row) => row.keyframes.length > 0),
    [propertyRows]
  )
  const visibleTracks = useMemo(
    () =>
      tracks.filter(
        (track) => track.keyframes.length > 0 || track.id === activeTrackId
      ),
    [activeTrackId, tracks]
  )
  const hiddenTracks = useMemo(
    () => tracks.filter((track) => !visibleTracks.includes(track)),
    [tracks, visibleTracks]
  )
  const frameSnapActive = timelineZoom >= TIMELINE_ZOOM_MAX - 0.001

  const morphWindows = useMemo(
    () =>
      computeMorphWindows(
        sortedShapes,
        DEFAULT_TRANSITION_START,
        DEFAULT_TRANSITION_END
      ),
    [sortedShapes]
  )
  const clipBounds = useMemo(
    () => computeShapeClipBounds(sortedShapes, morphWindows, duration),
    [duration, morphWindows, sortedShapes]
  )

  const breakpointTimes = useCallback(
    (options: BreakpointTimeOptions = {}) =>
      collectBreakpointTimes({
        duration,
        morphWindows,
        shapes,
        tracks,
        propertyRows: visiblePropertyRows,
        ...options,
      }),
    [duration, morphWindows, shapes, tracks, visiblePropertyRows]
  )

  const baseBreakpointTimes = useMemo(
    () => breakpointTimes(),
    [breakpointTimes]
  )

  const shapeLabel = useCallback(
    (stop: ShapeStop) =>
      stop.iconName ??
      shapeOptions.find((option) => option.id === stop.iconId)?.name ??
      "Custom",
    [shapeOptions]
  )

  return {
    sortedShapes,
    visiblePropertyRows,
    visibleTracks,
    hiddenTracks,
    frameSnapActive,
    morphWindows,
    clipBounds,
    breakpointTimes,
    baseBreakpointTimes,
    shapeLabel,
  }
}
