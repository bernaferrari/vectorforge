"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import {
  Diamond,
  Plus,
  Minus,
  Blend,
  ArrowRight,
  SquareSplitHorizontal,
  Loader2,
} from "lucide-react"
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  bindWindowMouseDrag,
  bindWindowPointerDrag,
  safelyReleasePointerCapture,
  safelySetPointerCapture,
} from "@/lib/drag-events"
import {
  DEFAULT_TRANSITION_END,
  DEFAULT_TRANSITION_START,
  interpolateKeyframes,
  type EasingType,
  type Keyframe,
  type ShapeStop,
} from "./TimelineModel"
import {
  EasingPicker,
  TimelineContextMenu,
  easingMenuItems,
  type TimelineMenuItem,
  type TimelineMenuState,
} from "./timeline/TimelineMenus"
import { ShapePickerContent } from "./timeline/ShapePickerContent"
import { TimelineHeader } from "./timeline/TimelineHeader"
import { useShapePickerCatalog } from "./timeline/useShapePickerCatalog"
import {
  collectBreakpointTimes,
  computeMorphWindows,
  computeShapeClipBounds,
  type BreakpointTimeOptions,
} from "./timeline/TimelineLayoutModel"
import {
  EDGE_INSET,
  PLAYHEAD_SNAP_THRESHOLD_SECONDS,
  RAIL_WIDTH,
  SECOND_SNAP_THRESHOLD_SECONDS,
  SNAP_THRESHOLD_SECONDS,
  TIMELINE_EDGE_SCROLL_MAX,
  TIMELINE_EDGE_SCROLL_ZONE,
  TIMELINE_FRAME_RATE,
  TIMELINE_ZOOM_MAX,
  TIMELINE_ZOOM_MIN,
  TIMELINE_ZOOM_STEP,
  formatTimelineTick,
  isEditableTarget,
  parseTimelineTimeInput,
  quantizeTimeToFrame,
  widthForSpan,
  xForFrac,
} from "./timeline/TimelineGeometry"
import { createEditorId } from "./EditorModel"
import {
  formatValueLabel,
  TimelineDiamond,
} from "./timeline/TimelinePrimitives"
import type {
  SelectedTimelineKeyframe,
  TimelineProps,
  TimelineViewportGeometry,
} from "./timeline/TimelineTypes"

export {
  applyEasing,
  DEFAULT_TRANSITION_END,
  DEFAULT_TRANSITION_START,
  interpolateFillKeyframes,
  interpolateKeyframes,
  type EasingType,
  type FillGradientType,
  type FillKeyframe,
  type FillStop,
  type Keyframe,
  type ShapeStop,
  type TimelinePropertyRow,
  type TimelineTrack,
} from "./TimelineModel"
export type {
  ShapeOption,
  TimelineProps,
  WipeDirectionOption,
} from "./timeline/TimelineTypes"

export const Timeline: React.FC<TimelineProps> = ({
  duration,
  onDurationChange,
  currentTime,
  onTimeChange,
  onScrubStart,
  isPlaying = false,
  isPreviewLoading = false,
  loop,
  onLoopChange,
  tracks,
  onTracksChange,
  propertyRows = [],
  onClearTrackKeyframes,
  onClearPropertyRow,
  onRemovePropertyKeyframe,
  onActivePropertyRowChange,
  activeTrackId,
  onActiveTrackChange,
  shapes,
  selectedShapeId,
  onSelectShape,
  onShapesChange,
  onAddShape,
  onRemoveShape,
  onShapeEasingChange,
  shapeOptions,
  onShapeIconChange,
  onShapeWipePairChange,
  onUploadShape,
  onShapeBlendChange,
  openShapePicker,
  onOpenShapePicker,
  wipeDirections,
}) => {
  const [selectedKeyframe, setSelectedKeyframe] =
    useState<SelectedTimelineKeyframe>(null)
  const [openClipEditor, setOpenClipEditor] = useState<string | null>(null)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [timelineZoom, setTimelineZoom] = useState(1)
  const [timeEditor, setTimeEditor] = useState<{
    trackId: string
    kfId: string
    draft: string
  } | null>(null)
  const [durationEditor, setDurationEditor] = useState<string | null>(null)
  const [goToEditor, setGoToEditor] = useState<{
    x: number
    y: number
    draft: string
  } | null>(null)
  const [contextMenu, setContextMenu] = useState<TimelineMenuState>(null)
  const shapePicker = useShapePickerCatalog({
    openShapePicker,
    shapeOptions,
    onShapeIconChange,
    onShapeWipePairChange,
    onOpenShapePicker,
  })
  const shapeDraggedRef = useRef(false)
  const morphResizedRef = useRef(false)
  const keyframeDraggedRef = useRef(false)
  const skipGoToCommitRef = useRef(false)
  const scrubEdgeClientXRef = useRef<number | null>(null)
  const scrubEdgeRafRef = useRef<number | null>(null)
  const scrubGeometryRef = useRef<TimelineViewportGeometry | null>(null)
  const scrubSnapTimesRef = useRef<number[] | null>(null)
  const scrubLastTimeRef = useRef<number | null>(null)
  const scrubPendingTimeRef = useRef<number | null>(null)
  const scrubEmitRafRef = useRef<number | null>(null)
  const laneRef = useRef<HTMLDivElement>(null)
  const leftRailBodyRef = useRef<HTMLDivElement>(null)
  const timelineScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close()
    }
    window.addEventListener("mousedown", close)
    window.addEventListener("wheel", close, { passive: true })
    window.addEventListener("resize", close)
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("mousedown", close)
      window.removeEventListener("wheel", close)
      window.removeEventListener("resize", close)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [contextMenu])

  const fitTimeline = () => {
    setTimelineZoom(1)
    window.requestAnimationFrame(() => {
      if (timelineScrollRef.current) timelineScrollRef.current.scrollLeft = 0
    })
  }

  const commitDurationEditor = () => {
    if (durationEditor === null) return
    const parsed = Number.parseFloat(durationEditor)
    if (Number.isFinite(parsed)) {
      onDurationChange(Math.max(0.5, Math.min(30, Number(parsed.toFixed(1)))))
    }
    setDurationEditor(null)
  }

  const openDurationEditor = () => setDurationEditor(duration.toFixed(1))

  const applyDuration = (value: number) => {
    onDurationChange(Math.max(0.5, Math.min(30, Number(value.toFixed(1)))))
    setDurationEditor(null)
  }

  const adjustTimelineZoom = (delta: number) => {
    setTimelineZoom((zoom) =>
      Number(
        Math.max(
          TIMELINE_ZOOM_MIN,
          Math.min(TIMELINE_ZOOM_MAX, zoom + delta)
        ).toFixed(2)
      )
    )
  }

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
  }, [])

  const openContextMenu = (
    event: React.MouseEvent,
    title: string,
    items: TimelineMenuItem[]
  ) => {
    setGoToEditor(null)
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      title,
      items,
    })
  }

  // Clear a stale keyframe selection if the keyframe disappears.
  useEffect(() => {
    if (!selectedKeyframe) return
    const exists =
      selectedKeyframe.type === "track"
        ? tracks.some(
            (track) =>
              track.id === selectedKeyframe.trackId &&
              track.keyframes.some(
                (keyframe) => keyframe.id === selectedKeyframe.kfId
              )
          )
        : propertyRows.some(
            (row) =>
              row.id === selectedKeyframe.rowId &&
              row.keyframes.some(
                (keyframe) => keyframe.id === selectedKeyframe.kfId
              )
          )
    if (!exists) {
      setSelectedKeyframe(null)
    }
  }, [propertyRows, tracks, selectedKeyframe])

  useEffect(() => {
    if (!timeEditor) return
    const track = tracks.find((t) => t.id === timeEditor.trackId)
    if (!track || !track.keyframes.some((k) => k.id === timeEditor.kfId)) {
      setTimeEditor(null)
    }
  }, [tracks, timeEditor])

  const selectTrack = (trackId: string) => {
    onActiveTrackChange?.(trackId)
  }

  const sortedShapes = useMemo(
    () => [...shapes].sort((a, b) => a.time - b.time),
    [shapes]
  )
  const shapeLabel = (stop: ShapeStop) =>
    stop.iconName ??
    shapeOptions.find((o) => o.id === stop.iconId)?.name ??
    "Custom"
  const visiblePropertyRows = propertyRows.filter(
    (row) => row.keyframes.length > 0
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

  const breakpointTimes = React.useCallback(
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

  const snapTime = (
    rawTime: number,
    options: {
      bypass?: boolean
      excludeShapeId?: string
      excludeKeyframe?: { trackId: string; kfId: string }
      excludeTrackId?: string
      snapToPlayhead?: boolean
      snapToWholeSeconds?: boolean
    } = {}
  ) => {
    const clamped = Math.max(0, Math.min(duration, rawTime))
    const quantizeIfNeeded = (time: number) =>
      frameSnapActive && !options.bypass
        ? Math.max(0, Math.min(duration, quantizeTimeToFrame(time)))
        : time

    if (!snapEnabled || options.bypass) return clamped

    const nearestWithin = (times: number[], threshold: number) =>
      times.reduce<{ time: number; distance: number } | null>(
        (closest, time) => {
          const distance = Math.abs(time - clamped)
          if (distance > threshold) return closest
          if (!closest || distance < closest.distance) return { time, distance }
          return closest
        },
        null
      )

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

    const hasExcludedSnapTarget = Boolean(
      options.excludeShapeId ||
      options.excludeKeyframe ||
      options.excludeTrackId
    )
    const candidateTimes = hasExcludedSnapTarget
      ? breakpointTimes(options)
      : (scrubSnapTimesRef.current ?? baseBreakpointTimes)

    const nearest = nearestWithin(candidateTimes, SNAP_THRESHOLD_SECONDS)
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

  const clampClientXToTimelineViewport = (
    clientX: number,
    geometry?: TimelineViewportGeometry | null
  ) => {
    const scroller = timelineScrollRef.current
    const viewportLeft = geometry?.viewportLeft
    const viewportRight = geometry?.viewportRight
    if (viewportLeft !== undefined && viewportRight !== undefined) {
      return Math.max(
        viewportLeft + EDGE_INSET,
        Math.min(viewportRight - EDGE_INSET, clientX)
      )
    }
    if (!scroller) return clientX
    const rect = scroller.getBoundingClientRect()
    return Math.max(
      rect.left + EDGE_INSET,
      Math.min(rect.right - EDGE_INSET, clientX)
    )
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
    const effectiveClientX = options.clampToViewport
      ? clampClientXToTimelineViewport(clientX, geometry)
      : clientX
    const x = Math.max(
      0,
      Math.min(
        effectiveClientX - geometry.laneLeft - EDGE_INSET,
        geometry.usableWidth
      )
    )
    return Number(((x / geometry.usableWidth) * duration).toFixed(3))
  }

  const timeFromClientX = (
    clientX: number,
    options: Parameters<typeof snapTime>[1] & {
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

  const startScrubEdgeScroll = (options: Parameters<typeof snapTime>[1]) => {
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

  const openGoToEditor = (clientX: number, clientY: number, time: number) => {
    const width = 132
    const height = 76
    skipGoToCommitRef.current = false
    setContextMenu(null)
    setGoToEditor({
      x: Math.min(clientX, window.innerWidth - width - 8),
      y: Math.min(clientY, window.innerHeight - height - 8),
      draft: Math.max(0, Math.min(duration, time)).toFixed(2),
    })
  }

  const goToMenuItem = (
    event: React.MouseEvent,
    time: number,
    onBeforeOpen?: () => void
  ): TimelineMenuItem => {
    const x = event.clientX
    const y = event.clientY
    const t = Math.max(0, Math.min(duration, time))
    return {
      label: "Go to...",
      shortcut: `${t.toFixed(2)}s`,
      onSelect: () => {
        onBeforeOpen?.()
        openGoToEditor(x, y, t)
      },
    }
  }

  const commitGoToEditor = () => {
    if (skipGoToCommitRef.current) {
      skipGoToCommitRef.current = false
      return
    }
    if (!goToEditor) return
    const parsed = parseTimelineTimeInput(goToEditor.draft)
    if (Number.isFinite(parsed)) {
      onScrubStart?.()
      onTimeChange(Number(Math.max(0, Math.min(duration, parsed)).toFixed(3)))
    }
    setGoToEditor(null)
  }

  const cancelGoToEditor = () => {
    skipGoToCommitRef.current = true
    setGoToEditor(null)
  }

  const handleScrubStart = (e: React.MouseEvent) => {
    setSelectedKeyframe(null)
    onScrubStart?.()
    const initialOptions = { bypass: e.altKey, snapToWholeSeconds: true }
    scrubGeometryRef.current = getTimelineGeometry()
    scrubSnapTimesRef.current = baseBreakpointTimes
    scrubLastTimeRef.current = null
    scrubEdgeClientXRef.current = e.clientX
    emitScrubTime(
      timeFromClientX(e.clientX, {
        ...initialOptions,
        geometry: scrubGeometryRef.current,
      }),
      { immediate: true }
    )
    startScrubEdgeScroll(initialOptions)
    bindWindowMouseDrag({
      onMove: (ev) => {
        const options = { bypass: ev.altKey, snapToWholeSeconds: true }
        scrubEdgeClientXRef.current = ev.clientX
        emitScrubTime(
          timeFromClientX(ev.clientX, {
            ...options,
            clampToViewport: true,
            geometry: scrubGeometryRef.current,
          })
        )
      },
      onEnd: stopScrubEdgeScroll,
    })
  }

  const toggleKeyframeAtPlayhead = (trackId: string) => {
    const t = quantizeTimeToFrame(currentTime)
    let nextSelected: { trackId: string; kfId: string } | null = null
    const updated = tracks.map((track) => {
      if (track.id !== trackId) return track
      const existing = track.keyframes.find((k) => Math.abs(k.time - t) < 0.05)
      if (existing) {
        return {
          ...track,
          keyframes: track.keyframes.filter((k) => k.id !== existing.id),
        }
      }
      const value = interpolateKeyframes(currentTime, track)
      const prev = [...track.keyframes]
        .sort((a, b) => a.time - b.time)
        .filter((k) => k.time <= t)
        .pop()
      const kf: Keyframe = {
        id: createEditorId(trackId),
        time: t,
        value,
        easing: prev?.easing ?? "ease-in-out",
      }
      nextSelected = { trackId, kfId: kf.id }
      return {
        ...track,
        keyframes: [...track.keyframes, kf].sort((a, b) => a.time - b.time),
      }
    })
    selectTrack(trackId)
    setSelectedKeyframe(nextSelected)
    onTracksChange(updated)
  }

  const addTrackKeyframeAtTime = (trackId: string, time: number) => {
    const clamped = Math.max(0, Math.min(duration, time))
    const t = Number(
      (frameSnapActive ? quantizeTimeToFrame(clamped) : clamped).toFixed(3)
    )
    let nextSelected: { trackId: string; kfId: string } | null = null
    const updated = tracks.map((track) => {
      if (track.id !== trackId) return track
      const existing = track.keyframes.find(
        (keyframe) => Math.abs(keyframe.time - t) < 0.05
      )
      if (existing) {
        nextSelected = { trackId, kfId: existing.id }
        return track
      }
      const prev = [...track.keyframes]
        .sort((a, b) => a.time - b.time)
        .filter((keyframe) => keyframe.time <= t)
        .pop()
      const kf: Keyframe = {
        id: createEditorId(trackId),
        time: t,
        value: interpolateKeyframes(t, track),
        easing: prev?.easing ?? "ease-in-out",
      }
      nextSelected = { trackId, kfId: kf.id }
      return {
        ...track,
        keyframes: [...track.keyframes, kf].sort((a, b) => a.time - b.time),
      }
    })
    selectTrack(trackId)
    setSelectedKeyframe(nextSelected)
    onTimeChange(t)
    onTracksChange(updated)
  }

  const removeTrackKeyframe = (trackId: string, kfId: string) => {
    setSelectedKeyframe(null)
    onTracksChange(
      tracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              keyframes: track.keyframes.filter(
                (keyframe) => keyframe.id !== kfId
              ),
            }
          : track
      )
    )
  }

  useEffect(() => {
    const handleDeleteSelectedKeyframe = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      if (event.key !== "Delete" && event.key !== "Backspace") return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]'))
        return

      if (!selectedKeyframe) {
        if (!selectedShapeId || shapes.length <= 1) return
        event.preventDefault()
        onRemoveShape(selectedShapeId)
        return
      }

      if (selectedKeyframe.type === "track") {
        const track = tracks.find(
          (item) => item.id === selectedKeyframe.trackId
        )
        if (
          !track?.keyframes.some(
            (keyframe) => keyframe.id === selectedKeyframe.kfId
          )
        )
          return
        event.preventDefault()
        removeTrackKeyframe(selectedKeyframe.trackId, selectedKeyframe.kfId)
        return
      }

      const row = propertyRows.find(
        (item) => item.id === selectedKeyframe.rowId
      )
      if (
        !row?.keyframes.some(
          (keyframe) => keyframe.id === selectedKeyframe.kfId
        )
      )
        return
      event.preventDefault()
      setSelectedKeyframe(null)
      onRemovePropertyKeyframe?.(selectedKeyframe.rowId, selectedKeyframe.kfId)
    }
    window.addEventListener("keydown", handleDeleteSelectedKeyframe)
    return () =>
      window.removeEventListener("keydown", handleDeleteSelectedKeyframe)
  }, [
    onRemovePropertyKeyframe,
    onRemoveShape,
    propertyRows,
    selectedKeyframe,
    selectedShapeId,
    shapes.length,
    tracks,
  ])

  const handleKeyframeDrag = (
    e: React.MouseEvent,
    trackId: string,
    kfId: string
  ) => {
    e.stopPropagation()
    if (!laneRef.current) return
    onScrubStart?.()
    keyframeDraggedRef.current = false
    const rect = laneRef.current.getBoundingClientRect()
    const usable = Math.max(1, rect.width - EDGE_INSET * 2)
    const startX = e.clientX
    const startY = e.clientY
    bindWindowMouseDrag({
      onMove: (ev) => {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > 3) {
          keyframeDraggedRef.current = true
        }
        const x = Math.max(
          0,
          Math.min(ev.clientX - rect.left - EDGE_INSET, usable)
        )
        const rawTime = (x / usable) * duration
        const newTime = Number(
          snapTime(rawTime, {
            bypass: ev.altKey,
            excludeKeyframe: { trackId, kfId },
            snapToPlayhead: true,
          }).toFixed(3)
        )
        onTracksChange(
          tracks.map((track) =>
            track.id === trackId
              ? {
                  ...track,
                  keyframes: track.keyframes
                    .map((k) => (k.id === kfId ? { ...k, time: newTime } : k))
                    .sort((a, b) => a.time - b.time),
                }
              : track
          )
        )
      },
    })
  }

  const setTrackKeyframeTime = (
    trackId: string,
    kfId: string,
    time: number
  ) => {
    selectTrack(trackId)
    const clamped = Math.max(0, Math.min(duration, time))
    const nextTime = Number(
      (frameSnapActive ? quantizeTimeToFrame(clamped) : clamped).toFixed(3)
    )
    onTracksChange(
      tracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              keyframes: track.keyframes
                .map((keyframe) =>
                  keyframe.id === kfId
                    ? { ...keyframe, time: nextTime }
                    : keyframe
                )
                .sort((a, b) => a.time - b.time),
            }
          : track
      )
    )
  }

  const commitTimeEditor = () => {
    if (!timeEditor) return
    const parsed = Number.parseFloat(timeEditor.draft)
    if (!Number.isFinite(parsed)) return
    setTrackKeyframeTime(timeEditor.trackId, timeEditor.kfId, parsed)
    setTimeEditor(null)
  }

  // Drag the whole keyframe span of a track (the "clip") left/right, keeping its shape.
  const handleBlockDrag = (e: React.MouseEvent, trackId: string) => {
    e.stopPropagation()
    if (!laneRef.current) return
    onScrubStart?.()
    selectTrack(trackId)
    const rect = laneRef.current.getBoundingClientRect()
    const usable = Math.max(1, rect.width - EDGE_INSET * 2)
    const startX = e.clientX
    const track = tracks.find((t) => t.id === trackId)
    if (!track || track.keyframes.length === 0) return
    const initial = track.keyframes.map((k) => ({ id: k.id, time: k.time }))
    const minT = Math.min(...initial.map((k) => k.time))
    const maxT = Math.max(...initial.map((k) => k.time))

    bindWindowMouseDrag({
      onMove: (ev) => {
        let delta = ((ev.clientX - startX) / usable) * duration
        if (minT + delta < 0) delta = -minT
        if (maxT + delta > duration) delta = duration - maxT
        if (snapEnabled && !ev.altKey) {
          const movedTimes = initial.map((keyframe) => keyframe.time + delta)
          const playheadTime = frameSnapActive
            ? quantizeTimeToFrame(currentTime)
            : currentTime
          const targets = [
            ...breakpointTimes({ excludeTrackId: trackId }).map((time) => ({
              time,
              threshold: SNAP_THRESHOLD_SECONDS,
            })),
            ...(playheadTime >= 0 && playheadTime <= duration
              ? [
                  {
                    time: playheadTime,
                    threshold: PLAYHEAD_SNAP_THRESHOLD_SECONDS,
                  },
                ]
              : []),
          ]
          const snapCandidate = movedTimes.reduce<{
            delta: number
            distance: number
          } | null>((closest, movedTime) => {
            const target = targets.reduce<{
              time: number
              distance: number
            } | null>((nearest, target) => {
              const distance = Math.abs(target.time - movedTime)
              if (distance > target.threshold) return nearest
              if (!nearest || distance < nearest.distance)
                return { time: target.time, distance }
              return nearest
            }, null)
            if (!target) return closest
            const candidateDelta = target.time - movedTime
            if (!closest || target.distance < closest.distance)
              return { delta: candidateDelta, distance: target.distance }
            return closest
          }, null)
          if (snapCandidate) {
            delta += snapCandidate.delta
            if (minT + delta < 0) delta = -minT
            if (maxT + delta > duration) delta = duration - maxT
          }
        }
        onTracksChange(
          tracks.map((t) =>
            t.id !== trackId
              ? t
              : {
                  ...t,
                  keyframes: t.keyframes.map((k) => {
                    const init = initial.find((i) => i.id === k.id)
                    const nextTime = init
                      ? Math.max(0, Math.min(duration, init.time + delta))
                      : k.time
                    return init
                      ? {
                          ...k,
                          time: Number(
                            (frameSnapActive
                              ? quantizeTimeToFrame(nextTime)
                              : nextTime
                            ).toFixed(3)
                          ),
                        }
                      : k
                  }),
                }
          )
        )
      },
    })
  }

  // Set the easing for an entire effect (all of a track's keyframes share one curve).
  const setTrackEasing = (trackId: string, easing: EasingType) => {
    onTracksChange(
      tracks.map((t) =>
        t.id === trackId
          ? { ...t, keyframes: t.keyframes.map((k) => ({ ...k, easing })) }
          : t
      )
    )
  }

  const setSingleKeyframeEasing = (
    trackId: string,
    kfId: string,
    easing: EasingType
  ) => {
    onTracksChange(
      tracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              keyframes: track.keyframes.map((keyframe) =>
                keyframe.id === kfId ? { ...keyframe, easing } : keyframe
              ),
            }
          : track
      )
    )
  }

  // Shapes can't cross each other: clamp a stop's time between its immediate
  // neighbors (minus a small gap) so dragging never inverts order or collapses a
  // clip to zero width. Neighbors are read from the pre-drag order, so the set is
  // stable for the whole gesture.
  const SHAPE_MIN_GAP = 0.05
  const clampShapeTime = (shapeId: string, rawTime: number) => {
    const selfTime = shapes.find((s) => s.id === shapeId)?.time ?? 0
    const lower = shapes
      .filter((s) => s.id !== shapeId && s.time < selfTime)
      .map((s) => s.time)
    const upper = shapes
      .filter((s) => s.id !== shapeId && s.time > selfTime)
      .map((s) => s.time)
    const lo = lower.length ? Math.max(...lower) + SHAPE_MIN_GAP : 0
    const hi = upper.length ? Math.min(...upper) - SHAPE_MIN_GAP : duration
    return Math.max(Math.min(lo, hi), Math.min(Math.max(lo, hi), rawTime))
  }

  // Retime a single shape stop by dragging. `draggedRef` guards the click that
  // would otherwise open a popover after a real drag. Used for both the clip body
  // (move the shape) and the seam (move the boundary = retime the next shape).
  const retimeShapeByDrag = (
    e: React.PointerEvent<HTMLElement>,
    shapeId: string,
    draggedRef: React.MutableRefObject<boolean>,
    options: { select?: boolean } = {}
  ) => {
    e.stopPropagation()
    e.preventDefault()
    if (!laneRef.current) return
    safelySetPointerCapture(e.currentTarget, e.pointerId)
    if (options.select) {
      onSelectShape(shapeId)
      setSelectedKeyframe(null)
    }
    draggedRef.current = false
    const startX = e.clientX
    const startTime = shapes.find((s) => s.id === shapeId)?.time ?? 0
    // Keep the grab point fixed within the clip so a wide block doesn't snap its
    // start to the cursor — it moves relative to where it was picked up.
    const grabOffset = rawTimeFromClientX(e.clientX) - startTime
    bindWindowPointerDrag({
      onMove: (ev) => {
        if (Math.abs(ev.clientX - startX) > 3) {
          if (!draggedRef.current) onScrubStart?.()
          draggedRef.current = true
        }
        const snapped = snapTime(rawTimeFromClientX(ev.clientX) - grabOffset, {
          bypass: ev.altKey,
          excludeShapeId: shapeId,
          snapToPlayhead: true,
        })
        const newTime = Number(clampShapeTime(shapeId, snapped).toFixed(3))
        onShapesChange(
          shapes.map((s) => (s.id === shapeId ? { ...s, time: newTime } : s))
        )
      },
      onEnd: (ev) => {
        if (ev instanceof PointerEvent) {
          safelyReleasePointerCapture(e.currentTarget, ev.pointerId)
        }
      },
    })
  }

  // Drag the clip body to move that shape stop.
  const handleShapeDrag = (
    e: React.PointerEvent<HTMLElement>,
    shapeId: string
  ) => retimeShapeByDrag(e, shapeId, shapeDraggedRef, { select: true })

  // Drag a morph block's edge to resize the transition window. The window is stored
  // as fractions of the gap, so it stays put when the surrounding stops are retimed.
  const MORPH_MIN_FRAC = 0.04
  const handleMorphEdgeDrag = (
    e: React.PointerEvent<HTMLElement>,
    shapeId: string,
    edge: "start" | "end",
    fromTime: number,
    toTime: number
  ) => {
    e.stopPropagation()
    e.preventDefault()
    if (!laneRef.current) return
    safelySetPointerCapture(e.currentTarget, e.pointerId)
    morphResizedRef.current = false
    const startX = e.clientX
    const gap = Math.max(1e-6, toTime - fromTime)
    bindWindowPointerDrag({
      onMove: (ev) => {
        if (Math.abs(ev.clientX - startX) > 3) {
          if (!morphResizedRef.current) onScrubStart?.()
          morphResizedRef.current = true
        }
        const frac = Math.max(
          0,
          Math.min(1, (rawTimeFromClientX(ev.clientX) - fromTime) / gap)
        )
        onShapesChange(
          shapes.map((s) => {
            if (s.id !== shapeId) return s
            const curStart = s.transitionStart ?? DEFAULT_TRANSITION_START
            const curEnd = s.transitionEnd ?? DEFAULT_TRANSITION_END
            return edge === "start"
              ? {
                  ...s,
                  transitionStart: Number(
                    Math.min(frac, curEnd - MORPH_MIN_FRAC).toFixed(3)
                  ),
                }
              : {
                  ...s,
                  transitionEnd: Number(
                    Math.max(frac, curStart + MORPH_MIN_FRAC).toFixed(3)
                  ),
                }
          })
        )
      },
      onEnd: (ev) => {
        if (ev instanceof PointerEvent) {
          safelyReleasePointerCapture(e.currentTarget, ev.pointerId)
        }
      },
    })
  }

  const visibleCurrentTime = frameSnapActive
    ? quantizeTimeToFrame(currentTime)
    : currentTime
  const playheadX = xForFrac(visibleCurrentTime / duration)
  const majorTickStep =
    timelineZoom >= TIMELINE_ZOOM_MAX - 0.001
      ? 0.25
      : timelineZoom >= 2
        ? 0.5
        : 1
  const minorTickStep = frameSnapActive
    ? 1 / TIMELINE_FRAME_RATE
    : majorTickStep / 4
  const tickCount = Math.floor(duration / minorTickStep) + 1
  const timelineTicks = Array.from({ length: tickCount }, (_, index) => {
    const rawTime = Number((index * minorTickStep).toFixed(3))
    const time = index === tickCount - 1 ? Math.min(rawTime, duration) : rawTime
    const major =
      Math.abs(time / majorTickStep - Math.round(time / majorTickStep)) < 0.001
    return { time, major }
  }).filter((tick) => tick.time <= duration + 0.001)
  const secondGridTicks = Array.from(
    { length: Math.floor(duration) + 1 },
    (_, index) => index
  ).filter((time) => time > 0 && time < duration)

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
  }, [duration, isPlaying, timelineZoom, visibleCurrentTime])

  return (
    <ContextMenu
      onOpenChange={(open) => {
        if (!open) setContextMenu(null)
      }}
    >
      <ContextMenuTrigger className="contents">
        <div className="flex h-full flex-col overflow-hidden bg-background font-sans select-none">
          {/* Tracks */}
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {/* Left rail: track names */}
            <div
              className="flex shrink-0 flex-col overflow-visible border-r border-border bg-muted/35"
              style={{ width: RAIL_WIDTH }}
            >
              <TimelineHeader
                currentTime={currentTime}
                duration={duration}
                durationEditor={durationEditor}
                snapEnabled={snapEnabled}
                loop={loop}
                onDurationEditorChange={setDurationEditor}
                onOpenDurationEditor={openDurationEditor}
                onCommitDurationEditor={commitDurationEditor}
                onApplyDuration={applyDuration}
                onSnapEnabledChange={setSnapEnabled}
                onLoopChange={onLoopChange}
              />
              <div
                className="relative min-h-0 flex-1 overflow-hidden"
                onWheel={(event) => {
                  const scroller = timelineScrollRef.current
                  if (!scroller) return
                  event.preventDefault()
                  scroller.scrollTop += event.deltaY
                  scroller.scrollLeft += event.deltaX
                }}
              >
                <div ref={leftRailBodyRef} className="will-change-transform">
                  {/* Shape lane label + add */}
                  <div
                    className={`group flex h-9 items-center gap-2 border-b border-border px-3 transition-colors ${selectedShapeId ? "bg-muted/70" : "hover:bg-muted/40"}`}
                  >
                    <span
                      className={`flex-1 truncate text-[11px] font-semibold ${selectedShapeId ? "text-foreground" : "text-foreground"}`}
                    >
                      Shape
                    </span>
                    {isPreviewLoading && (
                      <Loader2
                        aria-label="Preparing 3D icon"
                        className="size-3.5 shrink-0 animate-spin text-muted-foreground"
                      />
                    )}
                    <button
                      type="button"
                      aria-label="Add shape"
                      title="Add shape at playhead"
                      onClick={onAddShape}
                      className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  {visiblePropertyRows.map((row) => (
                    <div
                      key={row.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedKeyframe(null)
                        onActivePropertyRowChange?.(row.id)
                      }}
                      onContextMenu={(event) =>
                        openContextMenu(event, row.name, [
                          goToMenuItem(event, currentTime, () =>
                            onActivePropertyRowChange?.(row.id)
                          ),
                          { type: "separator" },
                          {
                            label: "Select property",
                            onSelect: () => onActivePropertyRowChange?.(row.id),
                          },
                          { type: "separator" },
                          {
                            label: "Clear keyframes",
                            danger: true,
                            disabled: row.keyframes.length === 0,
                            onSelect: () => onClearPropertyRow?.(row.id),
                          },
                        ])
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          setSelectedKeyframe(null)
                          onActivePropertyRowChange?.(row.id)
                        }
                      }}
                      className="group flex h-9 items-center gap-2 border-b border-border px-3 transition-colors hover:bg-muted/40"
                    >
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: row.color }}
                      />
                      <span className="flex-1 truncate text-[11px] font-medium text-muted-foreground">
                        {row.name}
                      </span>
                      <span
                        className="flex size-5 shrink-0 items-center justify-center"
                        aria-label={`${row.keyframes.length} keyframes`}
                      >
                        <span
                          className="size-[7px] rotate-45 rounded-[1px] border border-transparent"
                          style={{ backgroundColor: row.color }}
                        />
                      </span>
                    </div>
                  ))}
                  {tracks.map((track) => {
                    const isActive = activeTrackId === track.id
                    const animated = track.keyframes.length > 0
                    const keyedAtPlayhead = track.keyframes.some(
                      (k) =>
                        Math.abs(k.time - quantizeTimeToFrame(currentTime)) <
                        0.05
                    )
                    return (
                      <div
                        key={track.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setSelectedKeyframe(null)
                          selectTrack(track.id)
                        }}
                        onContextMenu={(event) =>
                          openContextMenu(event, track.name, [
                            goToMenuItem(event, currentTime, () =>
                              selectTrack(track.id)
                            ),
                            { type: "separator" },
                            {
                              label: "Select property",
                              onSelect: () => selectTrack(track.id),
                            },
                            {
                              label: keyedAtPlayhead
                                ? "Remove keyframe here"
                                : "Add keyframe here",
                              shortcut: currentTime.toFixed(2),
                              onSelect: () =>
                                toggleKeyframeAtPlayhead(track.id),
                            },
                            ...(animated
                              ? [
                                  ...easingMenuItems(
                                    track.keyframes[0]?.easing ?? "ease-in-out",
                                    (easing) => setTrackEasing(track.id, easing)
                                  ),
                                  { type: "separator" as const },
                                  {
                                    label: "Clear keyframes",
                                    danger: true,
                                    onSelect: () =>
                                      onClearTrackKeyframes?.(track.id),
                                  },
                                ]
                              : []),
                          ])
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            setSelectedKeyframe(null)
                            selectTrack(track.id)
                          }
                        }}
                        className={`group flex h-9 items-center gap-2 border-b border-border px-3 transition-colors focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:outline-none focus-visible:ring-inset ${
                          isActive ? "bg-muted/70" : "hover:bg-muted/40"
                        }`}
                      >
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: track.color }}
                        />
                        <span
                          className={`flex-1 truncate text-[11px] font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}
                        >
                          {track.name}
                        </span>
                        {animated && (
                          <EasingPicker
                            value={track.keyframes[0]?.easing ?? "ease-in-out"}
                            onChange={(easing) =>
                              setTrackEasing(track.id, easing)
                            }
                            color={track.color}
                          />
                        )}
                        <button
                          type="button"
                          aria-label={
                            keyedAtPlayhead
                              ? `Remove ${track.name} keyframe`
                              : `Add ${track.name} keyframe`
                          }
                          title={
                            keyedAtPlayhead
                              ? "Remove keyframe at playhead"
                              : "Add keyframe at playhead"
                          }
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleKeyframeAtPlayhead(track.id)
                          }}
                          className={`flex size-5 shrink-0 items-center justify-center rounded transition-colors ${
                            keyedAtPlayhead
                              ? "text-foreground opacity-100"
                              : animated
                                ? "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Diamond
                            className="size-3"
                            style={{
                              fill: keyedAtPlayhead
                                ? track.color
                                : "transparent",
                              color: keyedAtPlayhead ? track.color : undefined,
                            }}
                          />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Right: ruler + lanes */}
            <div
              ref={timelineScrollRef}
              className="relative min-w-0 flex-1 [scrollbar-width:none] overflow-auto [&::-webkit-scrollbar]:hidden"
              onScroll={(event) => {
                if (leftRailBodyRef.current) {
                  leftRailBodyRef.current.style.transform = `translateY(${-event.currentTarget.scrollTop}px)`
                }
              }}
            >
              <div className="flex min-w-full">
                <div
                  className="relative shrink-0"
                  style={{ width: `${timelineZoom * 100}%`, minWidth: "100%" }}
                >
                  {/* Ruler */}
                  <div
                    ref={laneRef}
                    onMouseDown={handleScrubStart}
                    onContextMenu={(event) => {
                      const t = timeFromClientX(event.clientX, {
                        bypass: event.altKey,
                      })
                      openContextMenu(event, "Timeline", [
                        goToMenuItem(event, t),
                      ])
                    }}
                    className="sticky top-0 z-40 h-7 cursor-col-resize bg-background"
                  >
                    <div
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-border"
                      aria-hidden="true"
                    />
                    <div
                      className="pointer-events-none absolute inset-y-0 left-0 bg-muted/70 dark:bg-muted/35"
                      style={{ width: EDGE_INSET }}
                      aria-hidden="true"
                    />
                    <div
                      className="pointer-events-none absolute inset-y-0 right-0 bg-muted/70 dark:bg-muted/35"
                      style={{ width: EDGE_INSET }}
                      aria-hidden="true"
                    />
                    {timelineTicks.map((tick) => {
                      const isFinalTick = Math.abs(tick.time - duration) < 0.001
                      return (
                        <div
                          key={`ruler-${tick.time}`}
                          className="pointer-events-none absolute top-0 bottom-0"
                          style={{ left: xForFrac(tick.time / duration) }}
                        >
                          {tick.time > 0 && (
                            <div
                              className={`absolute top-0 w-px ${
                                tick.major
                                  ? "bottom-0 bg-border"
                                  : "h-2 bg-muted-foreground/25"
                              }`}
                            />
                          )}
                          {tick.major && !isFinalTick && (
                            <span className="absolute top-[13px] pl-1 font-mono text-[9px] leading-none text-muted-foreground">
                              {formatTimelineTick(tick.time)}
                            </span>
                          )}
                        </div>
                      )
                    })}
                    <div
                      className="pointer-events-none absolute top-0 bottom-0 z-10 w-px -translate-x-1/2 bg-red-500 dark:bg-red-400"
                      style={{ left: playheadX }}
                    >
                      <div className="absolute top-1 left-1/2 z-20 h-4 w-4 -translate-x-1/2 rounded-[5px] border border-red-600/70 bg-red-500 shadow-[0_2px_6px_rgba(0,0,0,0.28)] dark:border-red-300/70 dark:bg-red-400" />
                    </div>
                  </div>

                  {/* Lanes */}
                  <div className="relative">
                    {secondGridTicks.map((time) => (
                      <div
                        key={`second-grid-${time}`}
                        className="pointer-events-none absolute inset-y-0 w-px bg-border/70 dark:bg-muted/45"
                        style={{ left: xForFrac(time / duration) }}
                        aria-hidden="true"
                      />
                    ))}
                    <div
                      className="pointer-events-none absolute inset-y-0 left-0 z-[1] bg-muted/60 dark:bg-muted/25"
                      style={{ width: EDGE_INSET }}
                      aria-hidden="true"
                    />
                    <div
                      className="pointer-events-none absolute inset-y-0 right-0 z-[1] bg-muted/60 dark:bg-muted/25"
                      style={{ width: EDGE_INSET }}
                      aria-hidden="true"
                    />
                    {/* Shape lane: the morph sequence */}
                    <div
                      className={`relative h-9 border-b border-border transition-colors ${selectedShapeId ? "bg-muted/45" : "hover:bg-muted/35"}`}
                      onMouseDown={(e) => {
                        setSelectedKeyframe(null)
                        onScrubStart?.()
                        onTimeChange(timeFromClientX(e.clientX))
                      }}
                      onContextMenu={(event) => {
                        const t = timeFromClientX(event.clientX, {
                          bypass: event.altKey,
                        })
                        openContextMenu(event, "Shape", [
                          goToMenuItem(event, t),
                        ])
                      }}
                    >
                      {/* Morph blocks — the transition window between two stops. Drag an
                  edge handle to set how long the morph takes; click to edit style. */}
                      {morphWindows.map(({ stop, next, mStart, mEnd }) => {
                        const blockFade =
                          stop.wipeDirection.x === 0 &&
                          stop.wipeDirection.y === 0
                        const blockMode: "fade" | "wipe" | "none" =
                          stop.transitionType === "none"
                            ? "none"
                            : blockFade
                              ? "fade"
                              : "wipe"
                        const BlockIcon =
                          blockMode === "none"
                            ? SquareSplitHorizontal
                            : blockMode === "fade"
                              ? Blend
                              : ArrowRight
                        return (
                          <React.Fragment key={`morph-${stop.id}`}>
                            <Popover
                              open={openClipEditor === stop.id}
                              onOpenChange={(o) =>
                                setOpenClipEditor(o ? stop.id : null)
                              }
                            >
                              <PopoverTrigger
                                title={`Transition: ${blockMode} — drag edges to set duration, click to edit`}
                                onMouseDown={(e) => e.stopPropagation()}
                                onContextMenu={(event) => {
                                  const isFade =
                                    stop.wipeDirection.x === 0 &&
                                    stop.wipeDirection.y === 0
                                  const t = timeFromClientX(event.clientX, {
                                    bypass: event.altKey,
                                  })
                                  openContextMenu(
                                    event,
                                    `${shapeLabel(stop)} transition`,
                                    [
                                      goToMenuItem(event, t),
                                      { type: "separator" },
                                      {
                                        label: "Edit transition",
                                        onSelect: () =>
                                          setOpenClipEditor(stop.id),
                                      },
                                      { type: "separator" },
                                      {
                                        label: "Fade",
                                        onSelect: () =>
                                          onShapeBlendChange(stop.id, {
                                            transitionType: "wipe",
                                            wipeDirection: { x: 0, y: 0 },
                                          }),
                                      },
                                      {
                                        label: "Wipe",
                                        onSelect: () =>
                                          onShapeBlendChange(stop.id, {
                                            transitionType: "wipe",
                                            wipeDirection: isFade
                                              ? { x: 1, y: 0 }
                                              : stop.wipeDirection,
                                          }),
                                      },
                                      {
                                        label: "None",
                                        onSelect: () =>
                                          onShapeBlendChange(stop.id, {
                                            transitionType: "none",
                                          }),
                                      },
                                      ...easingMenuItems(
                                        stop.easing,
                                        (easing) =>
                                          onShapeEasingChange(stop.id, easing)
                                      ),
                                    ]
                                  )
                                }}
                                className="group/morph absolute top-1/2 flex h-7 -translate-y-1/2 cursor-pointer items-center justify-center overflow-hidden border-y border-border transition-[filter] hover:brightness-125 focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:outline-none focus-visible:ring-inset"
                                style={{
                                  left: xForFrac(mStart / duration),
                                  width: widthForSpan(
                                    Math.max(0, mEnd - mStart) / duration
                                  ),
                                  minWidth: 20,
                                  background: `linear-gradient(90deg, ${stop.color}26, ${next.color}26)`,
                                }}
                              >
                                <BlockIcon
                                  className="size-3 text-foreground/65 transition-colors group-hover/morph:text-foreground"
                                  strokeWidth={2.25}
                                />
                              </PopoverTrigger>
                              <PopoverContent
                                align="center"
                                side="top"
                                sideOffset={10}
                                className="w-60 border-border bg-popover p-3 text-foreground shadow-2xl"
                                onPointerDown={(event) =>
                                  event.stopPropagation()
                                }
                                onMouseDown={(event) => event.stopPropagation()}
                                onClick={(event) => event.stopPropagation()}
                                onContextMenu={(event) =>
                                  event.stopPropagation()
                                }
                              >
                                {(() => {
                                  const isFade =
                                    stop.wipeDirection.x === 0 &&
                                    stop.wipeDirection.y === 0
                                  const mode: "fade" | "wipe" | "none" =
                                    stop.transitionType === "none"
                                      ? "none"
                                      : isFade
                                        ? "fade"
                                        : "wipe"
                                  const selectMode = (
                                    m: "fade" | "wipe" | "none"
                                  ) => {
                                    if (m === "none")
                                      onShapeBlendChange(stop.id, {
                                        transitionType: "none",
                                      })
                                    else if (m === "fade")
                                      onShapeBlendChange(stop.id, {
                                        transitionType: "wipe",
                                        wipeDirection: { x: 0, y: 0 },
                                      })
                                    else
                                      onShapeBlendChange(stop.id, {
                                        transitionType: "wipe",
                                        wipeDirection: isFade
                                          ? { x: 1, y: 0 }
                                          : stop.wipeDirection,
                                      })
                                  }
                                  const modes = [
                                    {
                                      id: "fade" as const,
                                      label: "Fade",
                                      icon: <Blend className="size-3.5" />,
                                    },
                                    {
                                      id: "wipe" as const,
                                      label: "Wipe",
                                      icon: <ArrowRight className="size-3.5" />,
                                    },
                                    {
                                      id: "none" as const,
                                      label: "None",
                                      icon: (
                                        <SquareSplitHorizontal className="size-3.5" />
                                      ),
                                    },
                                  ]
                                  return (
                                    <>
                                      <div className="flex items-center justify-between px-0.5 pb-2.5">
                                        <span className="text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                                          Transition
                                        </span>
                                        {mode !== "none" && (
                                          <EasingPicker
                                            value={stop.easing}
                                            onChange={(easing) =>
                                              onShapeEasingChange(
                                                stop.id,
                                                easing
                                              )
                                            }
                                          />
                                        )}
                                      </div>

                                      <div className="grid grid-cols-3 gap-1.5">
                                        {modes.map((opt) => (
                                          <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => selectMode(opt.id)}
                                            className={`flex flex-col items-center gap-1 rounded-lg border py-2 text-[10px] font-medium transition-colors ${
                                              mode === opt.id
                                                ? "border-ring/60 bg-accent text-foreground"
                                                : "border-border bg-muted/45 text-muted-foreground hover:border-border hover:text-foreground"
                                            }`}
                                          >
                                            {opt.icon}
                                            {opt.label}
                                          </button>
                                        ))}
                                      </div>

                                      {mode === "wipe" && (
                                        <div className="mt-3 flex justify-center">
                                          <div className="relative size-[104px] rounded-full">
                                            <span className="pointer-events-none absolute top-1/2 left-1/2 size-[76px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-muted/30" />
                                            {wipeDirections
                                              .filter(
                                                (dir) =>
                                                  !(dir.x === 0 && dir.y === 0)
                                              )
                                              .map((dir) => {
                                                const active =
                                                  stop.wipeDirection.x ===
                                                    dir.x &&
                                                  stop.wipeDirection.y === dir.y
                                                const len =
                                                  Math.hypot(dir.x, dir.y) || 1
                                                const left = `calc(50% + ${(dir.x / len) * 38}px)`
                                                const top = `calc(50% - ${(dir.y / len) * 38}px)`
                                                return (
                                                  <button
                                                    key={dir.label}
                                                    type="button"
                                                    title={dir.tooltip}
                                                    onClick={() =>
                                                      onShapeBlendChange(
                                                        stop.id,
                                                        {
                                                          wipeDirection: {
                                                            x: dir.x,
                                                            y: dir.y,
                                                          },
                                                        }
                                                      )
                                                    }
                                                    className={`absolute z-10 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-[11px] transition-colors ${
                                                      active
                                                        ? "border-foreground bg-foreground text-background"
                                                        : "border-border bg-muted/50 text-muted-foreground hover:border-ring/50 hover:text-foreground"
                                                    }`}
                                                    style={{ left, top }}
                                                  >
                                                    {dir.label}
                                                  </button>
                                                )
                                              })}
                                            <span className="pointer-events-none absolute top-1/2 left-1/2 size-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground/50" />
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  )
                                })()}
                              </PopoverContent>
                            </Popover>
                            {/* Resize handles: drag to change when the morph starts / ends */}
                            <div
                              title="Drag to set when the morph starts"
                              onPointerDown={(e) =>
                                handleMorphEdgeDrag(
                                  e,
                                  stop.id,
                                  "start",
                                  stop.time,
                                  next.time
                                )
                              }
                              className="absolute top-1/2 flex h-7 w-2.5 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none items-center justify-center"
                              style={{ left: xForFrac(mStart / duration) }}
                            >
                              <span className="h-5 w-[3px] rounded-full bg-foreground/45 transition-colors hover:bg-foreground" />
                            </div>
                            <div
                              title="Drag to set when the morph ends"
                              onPointerDown={(e) =>
                                handleMorphEdgeDrag(
                                  e,
                                  stop.id,
                                  "end",
                                  stop.time,
                                  next.time
                                )
                              }
                              className="absolute top-1/2 flex h-7 w-2.5 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none items-center justify-center"
                              style={{ left: xForFrac(mEnd / duration) }}
                            >
                              <span className="h-5 w-[3px] rounded-full bg-foreground/45 transition-colors hover:bg-foreground" />
                            </div>
                          </React.Fragment>
                        )
                      })}
                      {/* Shape clips — drag to retime, click to pick/upload/remove.
                  A lone shape has nothing to morph against, so its time is
                  meaningless: pin it full-width and non-draggable instead of
                  letting the user strand it somewhere confusing. */}
                      {sortedShapes.map((stop, i) => {
                        const selected = stop.id === selectedShapeId
                        const bounds = clipBounds[i]
                        const isOnly = bounds.isOnly
                        // Only the outer ends of the sequence are rounded; inner edges stay
                        // square so each clip butts flush against the adjacent morph region.
                        const roundCls = isOnly
                          ? "rounded-md"
                          : `${i === 0 ? "rounded-l-md" : ""} ${i === sortedShapes.length - 1 ? "rounded-r-md" : ""}`
                        return (
                          <Popover
                            key={stop.id}
                            open={openShapePicker === stop.id}
                            onOpenChange={(o) => {
                              if (o && shapeDraggedRef.current) {
                                shapeDraggedRef.current = false
                                return
                              }
                              onOpenShapePicker(o ? stop.id : null)
                            }}
                          >
                            <PopoverTrigger
                              title={
                                isOnly
                                  ? `${shapeLabel(stop)} — click to edit · add another shape to animate`
                                  : `${shapeLabel(stop)} @ ${stop.time.toFixed(2)}s — drag to retime, click to edit`
                              }
                              onMouseDown={(e) => e.stopPropagation()}
                              onContextMenu={(event) =>
                                openContextMenu(event, shapeLabel(stop), [
                                  goToMenuItem(event, stop.time, () =>
                                    onSelectShape(stop.id)
                                  ),
                                  { type: "separator" },
                                  {
                                    label: "Edit shape",
                                    onSelect: () => {
                                      onSelectShape(stop.id)
                                      onOpenShapePicker(stop.id)
                                    },
                                  },
                                  {
                                    label: "Upload SVG",
                                    onSelect: () => onUploadShape(stop.id),
                                  },
                                  { type: "separator" },
                                  {
                                    label: "Add shape at playhead",
                                    onSelect: onAddShape,
                                  },
                                  {
                                    label: "Remove shape",
                                    danger: true,
                                    disabled: shapes.length <= 1,
                                    onSelect: () => onRemoveShape(stop.id),
                                  },
                                ])
                              }
                              onPointerDown={
                                isOnly
                                  ? undefined
                                  : (e) => handleShapeDrag(e, stop.id)
                              }
                              className={`group/clip absolute top-1/2 flex h-7 -translate-y-1/2 touch-none items-center gap-1.5 overflow-hidden border pr-2 pl-1 text-left transition-[background-color,border-color] hover:brightness-110 focus-visible:outline-none ${roundCls} ${isOnly ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"}`}
                              style={{
                                left: xForFrac(bounds.left / duration),
                                width: widthForSpan(
                                  Math.max(0, bounds.right - bounds.left) /
                                    duration
                                ),
                                minWidth: 32,
                                backgroundColor: selected
                                  ? `${stop.color}33`
                                  : `${stop.color}1c`,
                                borderColor: selected
                                  ? "#ffffff"
                                  : `${stop.color}59`,
                                boxShadow: "none",
                              }}
                            >
                              <span
                                className="grid size-5 shrink-0 place-items-center rounded-[5px] [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:fill-current [&_svg]:stroke-current"
                                style={{
                                  color: stop.color,
                                  backgroundColor: `${stop.color}26`,
                                }}
                                dangerouslySetInnerHTML={{
                                  __html: stop.svgContent,
                                }}
                              />
                              <span className="min-w-0 truncate text-[10px] font-medium text-foreground">
                                {shapeLabel(stop)}
                              </span>
                              {isOnly && (
                                <span className="ml-auto shrink truncate pl-2 text-[10px] text-muted-foreground">
                                  add another shape to animate
                                </span>
                              )}
                            </PopoverTrigger>
                            <ShapePickerContent
                              stop={stop}
                              shapeCount={shapes.length}
                              visibleShapeOptions={
                                shapePicker.visibleShapeOptions
                              }
                              filteredMaterialSymbols={
                                shapePicker.filteredMaterialSymbols
                              }
                              filteredWipePairs={shapePicker.filteredWipePairs}
                              normalizedShapeQuery={
                                shapePicker.normalizedShapeQuery
                              }
                              shapeSearchQuery={shapePicker.shapeSearchQuery}
                              onShapeSearchQueryChange={
                                shapePicker.setShapeSearchQuery
                              }
                              materialSymbolStyle={
                                shapePicker.materialSymbolStyle
                              }
                              onMaterialSymbolStyleChange={
                                shapePicker.setMaterialSymbolStyle
                              }
                              materialSymbolSettings={
                                shapePicker.materialSymbolSettings
                              }
                              onMaterialSymbolSettingChange={
                                shapePicker.updateMaterialSymbolSetting
                              }
                              materialSymbolOptionsOpen={
                                shapePicker.materialSymbolOptionsOpen
                              }
                              onMaterialSymbolOptionsOpenChange={
                                shapePicker.setMaterialSymbolOptionsOpen
                              }
                              materialSymbolStatus={
                                shapePicker.materialSymbolStatus
                              }
                              onMaterialSymbolStatusChange={
                                shapePicker.setMaterialSymbolStatus
                              }
                              wipePairMode={shapePicker.wipePairMode}
                              onWipePairModeChange={shapePicker.setWipePairMode}
                              onImportMaterialSymbol={
                                shapePicker.importMaterialSymbol
                              }
                              onChooseMaterialSymbol={
                                shapePicker.chooseMaterialSymbol
                              }
                              onChooseWipePair={shapePicker.chooseWipePair}
                              onShapeIconChange={onShapeIconChange}
                              onOpenShapePicker={onOpenShapePicker}
                              onUploadShape={onUploadShape}
                              onRemoveShape={onRemoveShape}
                            />
                          </Popover>
                        )
                      })}
                    </div>

                    {visiblePropertyRows.map((row) => (
                      <div
                        key={row.id}
                        className="relative h-9 border-b border-border transition-colors hover:bg-muted/35"
                        onMouseDown={(e) => {
                          setSelectedKeyframe(null)
                          onScrubStart?.()
                          onTimeChange(timeFromClientX(e.clientX))
                        }}
                      >
                        {row.keyframes.length > 1 && (
                          <div
                            className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full opacity-45"
                            style={{
                              left: xForFrac(
                                Math.min(
                                  ...row.keyframes.map(
                                    (keyframe) => keyframe.time
                                  )
                                ) / duration
                              ),
                              width: widthForSpan(
                                (Math.max(
                                  ...row.keyframes.map(
                                    (keyframe) => keyframe.time
                                  )
                                ) -
                                  Math.min(
                                    ...row.keyframes.map(
                                      (keyframe) => keyframe.time
                                    )
                                  )) /
                                  duration
                              ),
                              backgroundColor: row.color,
                            }}
                          />
                        )}
                        {row.keyframes.map((keyframe) =>
                          (() => {
                            const selected =
                              selectedKeyframe?.type === "property" &&
                              selectedKeyframe.rowId === row.id &&
                              selectedKeyframe.kfId === keyframe.id
                            return (
                              <button
                                type="button"
                                key={keyframe.id}
                                title={`${row.name}${keyframe.label ? ` · ${keyframe.label}` : ""} @ ${keyframe.time.toFixed(2)}s`}
                                className="absolute top-1/2 flex size-4 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center transition-transform hover:scale-110 focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:outline-none"
                                style={{
                                  left: xForFrac(keyframe.time / duration),
                                  zIndex: 14,
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation()
                                  setSelectedKeyframe({
                                    type: "property",
                                    rowId: row.id,
                                    kfId: keyframe.id,
                                  })
                                  onActivePropertyRowChange?.(row.id)
                                }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedKeyframe({
                                    type: "property",
                                    rowId: row.id,
                                    kfId: keyframe.id,
                                  })
                                  onActivePropertyRowChange?.(row.id)
                                }}
                                onContextMenu={(event) =>
                                  openContextMenu(event, row.name, [
                                    goToMenuItem(event, keyframe.time, () =>
                                      onActivePropertyRowChange?.(row.id)
                                    ),
                                    {
                                      label: "Select property",
                                      onSelect: () =>
                                        onActivePropertyRowChange?.(row.id),
                                    },
                                    { type: "separator" },
                                    {
                                      label: "Remove keyframe",
                                      danger: true,
                                      onSelect: () =>
                                        onRemovePropertyKeyframe?.(
                                          row.id,
                                          keyframe.id
                                        ),
                                    },
                                  ])
                                }
                              >
                                <TimelineDiamond
                                  color={row.color}
                                  borderColor="rgba(0,0,0,0.8)"
                                  selected={selected}
                                />
                              </button>
                            )
                          })()
                        )}
                      </div>
                    ))}

                    {tracks.map((track) => {
                      const isActive = activeTrackId === track.id
                      const animated = track.keyframes.length > 0
                      const sorted = [...track.keyframes].sort(
                        (a, b) => a.time - b.time
                      )
                      const first = sorted[0]
                      const last = sorted[sorted.length - 1]
                      return (
                        <div
                          key={track.id}
                          className={`relative h-9 border-b border-border transition-colors ${
                            isActive ? "bg-muted/45" : "hover:bg-muted/35"
                          }`}
                          onMouseDown={(e) => {
                            setSelectedKeyframe(null)
                            onScrubStart?.()
                            selectTrack(track.id)
                            onTimeChange(timeFromClientX(e.clientX))
                          }}
                          onContextMenu={(event) => {
                            const t = timeFromClientX(event.clientX, {
                              bypass: event.altKey,
                            })
                            openContextMenu(event, track.name, [
                              {
                                label: "Add keyframe",
                                shortcut: `${t.toFixed(2)}s`,
                                onSelect: () =>
                                  addTrackKeyframeAtTime(track.id, t),
                              },
                              goToMenuItem(event, t, () =>
                                selectTrack(track.id)
                              ),
                              ...(animated
                                ? [
                                    ...easingMenuItems(
                                      track.keyframes[0]?.easing ??
                                        "ease-in-out",
                                      (easing) =>
                                        setTrackEasing(track.id, easing)
                                    ),
                                    { type: "separator" as const },
                                    {
                                      label: "Clear keyframes",
                                      danger: true,
                                      onSelect: () =>
                                        onClearTrackKeyframes?.(track.id),
                                    },
                                  ]
                                : []),
                            ])
                          }}
                          onDoubleClick={(e) => {
                            e.preventDefault()
                            // Add a keyframe exactly where the user double-clicked.
                            const t = timeFromClientX(e.clientX)
                            const exists = track.keyframes.some(
                              (k) => Math.abs(k.time - t) < 0.05
                            )
                            if (exists) return
                            const value = interpolateKeyframes(t, track)
                            const prev = [...track.keyframes]
                              .sort((a, b) => a.time - b.time)
                              .filter((k) => k.time <= t)
                              .pop()
                            const kf: Keyframe = {
                              id: createEditorId(track.id),
                              time: Number(t.toFixed(3)),
                              value,
                              easing: prev?.easing ?? "ease-in-out",
                            }
                            selectTrack(track.id)
                            setSelectedKeyframe({
                              type: "track",
                              trackId: track.id,
                              kfId: kf.id,
                            })
                            onTracksChange(
                              tracks.map((tr) =>
                                tr.id === track.id
                                  ? {
                                      ...tr,
                                      keyframes: [...tr.keyframes, kf].sort(
                                        (a, b) => a.time - b.time
                                      ),
                                    }
                                  : tr
                              )
                            )
                          }}
                        >
                          {/* Draggable "clip" spanning first→last keyframe: drag body to move the whole window */}
                          {animated &&
                            first &&
                            last &&
                            last.time > first.time && (
                              <div
                                title="Drag to move · drag the diamonds to resize"
                                className="absolute top-1/2 h-2 -translate-y-1/2 cursor-grab rounded-full opacity-55 transition-opacity hover:opacity-80 active:cursor-grabbing"
                                style={{
                                  left: xForFrac(first.time / duration),
                                  width: widthForSpan(
                                    (last.time - first.time) / duration
                                  ),
                                  backgroundColor: track.color,
                                }}
                                onMouseDown={(e) =>
                                  handleBlockDrag(e, track.id)
                                }
                              />
                            )}

                          {/* Constant (un-animated) hint */}
                          {!animated && (
                            <div className="pointer-events-none absolute inset-y-0 left-2 flex items-center">
                              <span className="rounded bg-background/95 px-1 text-[10px] text-muted-foreground">
                                {formatValueLabel(track, track.defaultValue)} ·
                                constant
                              </span>
                            </div>
                          )}

                          {/* Keyframe diamonds */}
                          {track.keyframes.map((kf) => {
                            const selected =
                              selectedKeyframe?.type === "track" &&
                              selectedKeyframe.trackId === track.id &&
                              selectedKeyframe.kfId === kf.id
                            const editingTime =
                              timeEditor?.trackId === track.id &&
                              timeEditor.kfId === kf.id
                            const startMouseDown = (e: React.MouseEvent) => {
                              e.stopPropagation()
                              selectTrack(track.id)
                              setSelectedKeyframe({
                                type: "track",
                                trackId: track.id,
                                kfId: kf.id,
                              })
                              if (e.button !== 0) return
                              handleKeyframeDrag(e, track.id, kf.id)
                            }

                            return (
                              <Popover
                                key={kf.id}
                                open={editingTime}
                                onOpenChange={(open) => {
                                  if (open) return
                                  if (
                                    timeEditor?.trackId === track.id &&
                                    timeEditor.kfId === kf.id
                                  )
                                    commitTimeEditor()
                                }}
                              >
                                <PopoverTrigger
                                  type="button"
                                  title={`${track.name} · ${formatValueLabel(track, kf.value)} @ ${kf.time.toFixed(2)}s`}
                                  className={`absolute top-1/2 flex size-4 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center transition-transform hover:scale-110 focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:outline-none active:cursor-grabbing ${selected ? "scale-110" : ""}`}
                                  style={{
                                    left: xForFrac(kf.time / duration),
                                    zIndex: selected ? 30 : 15,
                                  }}
                                  onMouseDown={startMouseDown}
                                  onContextMenu={(e) => {
                                    selectTrack(track.id)
                                    setSelectedKeyframe({
                                      type: "track",
                                      trackId: track.id,
                                      kfId: kf.id,
                                    })
                                    openContextMenu(e, track.name, [
                                      {
                                        label: "Edit time",
                                        shortcut: `${kf.time.toFixed(2)}s`,
                                        onSelect: () =>
                                          setTimeEditor({
                                            trackId: track.id,
                                            kfId: kf.id,
                                            draft: kf.time.toFixed(2),
                                          }),
                                      },
                                      goToMenuItem(e, kf.time, () => {
                                        selectTrack(track.id)
                                        setSelectedKeyframe({
                                          type: "track",
                                          trackId: track.id,
                                          kfId: kf.id,
                                        })
                                      }),
                                      ...easingMenuItems(kf.easing, (easing) =>
                                        setSingleKeyframeEasing(
                                          track.id,
                                          kf.id,
                                          easing
                                        )
                                      ),
                                      { type: "separator" },
                                      {
                                        label: "Remove keyframe",
                                        danger: true,
                                        onSelect: () =>
                                          removeTrackKeyframe(track.id, kf.id),
                                      },
                                    ])
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (keyframeDraggedRef.current) {
                                      keyframeDraggedRef.current = false
                                      return
                                    }
                                    selectTrack(track.id)
                                    setSelectedKeyframe({
                                      type: "track",
                                      trackId: track.id,
                                      kfId: kf.id,
                                    })
                                    onTimeChange(kf.time)
                                  }}
                                >
                                  <TimelineDiamond
                                    color={track.color}
                                    borderColor="rgba(0,0,0,0.85)"
                                    selected={selected}
                                  />
                                </PopoverTrigger>
                                {editingTime && (
                                  <PopoverContent
                                    side="top"
                                    align="center"
                                    sideOffset={8}
                                    className="w-32 border-border bg-popover p-2 text-popover-foreground"
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => e.stopPropagation()}
                                    onContextMenu={(e) => e.stopPropagation()}
                                  >
                                    <label className="mb-1 block text-left text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                                      Time
                                    </label>
                                    <div className="flex h-8 items-center rounded-md bg-muted/70 ring-1 ring-border">
                                      <input
                                        autoFocus
                                        value={timeEditor.draft}
                                        onChange={(event) =>
                                          setTimeEditor((current) =>
                                            current
                                              ? {
                                                  ...current,
                                                  draft: event.target.value,
                                                }
                                              : current
                                          )
                                        }
                                        onKeyDown={(event) => {
                                          if (event.key === "Enter") {
                                            event.preventDefault()
                                            commitTimeEditor()
                                          }
                                          if (event.key === "Escape") {
                                            event.preventDefault()
                                            setTimeEditor(null)
                                          }
                                        }}
                                        className="min-w-0 flex-1 bg-transparent px-2 text-right font-mono text-[12px] text-foreground outline-none"
                                      />
                                      <span className="pr-2 text-[10px] text-muted-foreground">
                                        s
                                      </span>
                                    </div>
                                  </PopoverContent>
                                )}
                              </Popover>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                  <div
                    className="pointer-events-none absolute top-7 bottom-0 z-[35] w-px -translate-x-1/2 bg-red-500 dark:bg-red-400"
                    style={{ left: playheadX }}
                  />
                  <div
                    className="w-24 shrink-0 border-l border-border bg-muted/60 dark:bg-muted/25"
                    aria-hidden="true"
                  />
                </div>
                <div className="pointer-events-auto fixed right-2 bottom-2 z-[70] flex h-auto w-max items-center gap-px rounded-full border border-border bg-background/85 p-0.5 shadow-md backdrop-blur-xl">
                  <button
                    type="button"
                    aria-label="Zoom timeline out"
                    title="Zoom out (-)"
                    disabled={timelineZoom <= TIMELINE_ZOOM_MIN}
                    onClick={() => adjustTimelineZoom(-TIMELINE_ZOOM_STEP)}
                    className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-30"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Fit timeline"
                    title="Fit timeline (0)"
                    onClick={fitTimeline}
                    className="flex h-6 min-w-10 shrink-0 items-center justify-center rounded-full px-2 font-mono text-[10px] text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:outline-none"
                  >
                    {Math.round(timelineZoom * 100)}%
                  </button>
                  <button
                    type="button"
                    aria-label="Zoom timeline in"
                    title="Zoom in (+)"
                    disabled={timelineZoom >= TIMELINE_ZOOM_MAX}
                    onClick={() => adjustTimelineZoom(TIMELINE_ZOOM_STEP)}
                    className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-30"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          {goToEditor && (
            <Popover
              open
              onOpenChange={(open) => {
                if (!open) commitGoToEditor()
              }}
            >
              <PopoverTrigger
                aria-hidden="true"
                tabIndex={-1}
                className="fixed size-px opacity-0"
                style={{ left: goToEditor.x, top: goToEditor.y }}
              />
              <PopoverContent
                side="bottom"
                align="start"
                sideOffset={6}
                className="w-32 border-border bg-popover p-2 text-popover-foreground"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
                onContextMenu={(event) => event.preventDefault()}
              >
                <label className="mb-1 block text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                  Go to
                </label>
                <div className="flex h-8 items-center rounded-md bg-muted/70 ring-1 ring-border">
                  <input
                    autoFocus
                    value={goToEditor.draft}
                    onChange={(event) =>
                      setGoToEditor((current) =>
                        current
                          ? { ...current, draft: event.currentTarget.value }
                          : current
                      )
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        commitGoToEditor()
                      }
                      if (event.key === "Escape") {
                        event.preventDefault()
                        cancelGoToEditor()
                      }
                    }}
                    onBlur={commitGoToEditor}
                    className="min-w-0 flex-1 bg-transparent px-2 text-right font-mono text-[12px] text-foreground outline-none"
                  />
                  <span className="pr-2 text-[10px] text-muted-foreground">
                    s
                  </span>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </ContextMenuTrigger>
      <TimelineContextMenu
        menu={contextMenu}
        onClose={() => setContextMenu(null)}
      />
    </ContextMenu>
  )
}
