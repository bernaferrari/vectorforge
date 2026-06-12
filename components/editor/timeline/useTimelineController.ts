"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { SelectedTimelineKeyframe, TimelineProps } from "./TimelineTypes"
import { useShapePickerCatalog } from "./useShapePickerCatalog"
import { useTimelineContextMenu } from "./useTimelineContextMenu"
import { useTimelineDeletion } from "./useTimelineDeletion"
import { useTimelineDerivedState } from "./useTimelineDerivedState"
import { useTimelinePlayheadFollow } from "./useTimelinePlayheadFollow"
import { useTimelineRailScrollSync } from "./useTimelineRailScrollSync"
import { useTimelineScrubbing } from "./useTimelineScrubbing"
import { useTimelineSelectionGuards } from "./useTimelineSelectionGuards"
import { useTimelineShapeDrag } from "./useTimelineShapeDrag"
import { useTimelineTrackKeyframes } from "./useTimelineTrackKeyframes"
import { useTimelineViewportState } from "./useTimelineViewportState"
import { useTimelineZoomAndDuration } from "./useTimelineZoomAndDuration"

export function useTimelineController({
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
  onTogglePropertyKeyframe,
  onRemovePropertyKeyframe,
  onMovePropertyKeyframe,
  onSetPropertyEasing,
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
}: TimelineProps) {
  const [selectedKeyframe, setSelectedKeyframe] =
    useState<SelectedTimelineKeyframe>(null)
  const [openClipEditor, setOpenClipEditor] = useState<string | null>(null)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const shapePicker = useShapePickerCatalog({
    openShapePicker,
    shapeOptions,
    onShapeIconChange,
    onShapeWipePairChange,
    onOpenShapePicker,
  })
  const laneRef = useRef<HTMLDivElement>(null)
  const leftRailBodyRef = useRef<HTMLDivElement>(null)
  const timelineScrollRef = useRef<HTMLDivElement>(null)
  const {
    timelineZoom,
    durationEditor,
    setDurationEditor,
    fitTimeline,
    commitDurationEditor,
    openDurationEditor,
    applyDuration,
    adjustTimelineZoom,
  } = useTimelineZoomAndDuration({
    duration,
    onDurationChange,
    timelineScrollRef,
  })

  const {
    contextMenu,
    setContextMenu,
    goToEditor,
    setGoToEditor,
    openContextMenu,
    createGoToMenuItem: goToMenuItem,
    commitGoToEditor,
    cancelGoToEditor,
  } = useTimelineContextMenu({
    duration,
    onScrubStart,
    onTimeChange,
  })

  const {
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
  } = useTimelineDerivedState({
    duration,
    timelineZoom,
    shapes,
    tracks,
    propertyRows,
    shapeOptions,
    activeTrackId,
  })
  const visibleRowIds = useMemo(
    () => [
      ...visiblePropertyRows.map((row) => `property:${row.id}`),
      ...visibleTracks.map((track) => `track:${track.id}`),
    ],
    [visiblePropertyRows, visibleTracks]
  )
  const previousVisibleRowIdsRef = useRef<string[] | null>(null)
  const revealRowTimeoutRef = useRef<number | null>(null)
  const [revealedRowId, setRevealedRowId] = useState<string | null>(null)

  const { snapTime, rawTimeFromClientX, timeFromClientX, handleScrubStart } =
    useTimelineScrubbing({
      duration,
      currentTime,
      timelineZoom,
      snapEnabled,
      frameSnapActive,
      baseBreakpointTimes,
      getBreakpointTimes: breakpointTimes,
      laneRef,
      timelineScrollRef,
      onTimeChange,
      onScrubStart,
      onClearSelectedKeyframe: () => setSelectedKeyframe(null),
    })

  const {
    timeEditor,
    setTimeEditor,
    keyframeDraggedRef,
    selectTrack,
    toggleKeyframeAtPlayhead,
    addTrackKeyframe,
    removeTrackKeyframe,
    handleKeyframeDrag,
    handleBlockDrag,
    commitTimeEditor,
    setTrackEasing,
    setSingleKeyframeEasing,
  } = useTimelineTrackKeyframes({
    duration,
    currentTime,
    tracks,
    snapEnabled,
    frameSnapActive,
    laneRef,
    setSelectedKeyframe,
    breakpointTimes,
    snapTime,
    onTracksChange,
    onTimeChange,
    onScrubStart,
    onActiveTrackChange,
  })

  useTimelineSelectionGuards({
    selectedKeyframe,
    setSelectedKeyframe,
    timeEditor,
    setTimeEditor,
    tracks,
    propertyRows,
  })

  useTimelineDeletion({
    selectedKeyframe,
    selectedShapeId,
    shapes,
    tracks,
    propertyRows,
    onClearSelection: () => setSelectedKeyframe(null),
    onRemoveShape,
    onRemoveTrackKeyframe: removeTrackKeyframe,
    onRemovePropertyKeyframe,
  })

  const { shapeDraggedRef, handleShapeDrag, handleMorphEdgeDrag } =
    useTimelineShapeDrag({
      duration,
      shapes,
      laneRef,
      rawTimeFromClientX,
      snapTime,
      onScrubStart,
      onSelectShape,
      onShapesChange,
      onSelectKeyframe: setSelectedKeyframe,
    })
  const { handleLeftRailWheel, syncLeftRailScroll } = useTimelineRailScrollSync(
    {
      leftRailBodyRef,
      timelineScrollRef,
    }
  )

  const { visibleCurrentTime, playheadX, timelineTicks, secondGridTicks } =
    useTimelineViewportState({
      currentTime,
      duration,
      timelineZoom,
      frameSnapActive,
    })

  useTimelinePlayheadFollow({
    duration,
    isPlaying,
    timelineZoom,
    visibleCurrentTime,
    laneRef,
    timelineScrollRef,
  })

  useLayoutEffect(() => {
    syncLeftRailScroll(timelineScrollRef.current?.scrollTop ?? 0)
  }, [syncLeftRailScroll, visibleRowIds])

  useEffect(() => {
    const previousRowIds = previousVisibleRowIdsRef.current
    previousVisibleRowIdsRef.current = visibleRowIds
    if (!previousRowIds) return

    const newRowId = visibleRowIds.find((rowId) => !previousRowIds.includes(rowId))
    if (!newRowId) return

    const rowIndex = 1 + visibleRowIds.indexOf(newRowId)
    const targetScrollTop = Math.max(0, rowIndex * 36 - 12)
    const scroller = timelineScrollRef.current
    if (scroller) {
      const maxScrollTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight)
      const nextScrollTop = Math.min(targetScrollTop, maxScrollTop)
      scroller.scrollTo({ top: nextScrollTop, behavior: "auto" })
      syncLeftRailScroll(nextScrollTop)
    }

    setRevealedRowId(newRowId)
    if (revealRowTimeoutRef.current !== null) {
      window.clearTimeout(revealRowTimeoutRef.current)
    }
    revealRowTimeoutRef.current = window.setTimeout(() => {
      setRevealedRowId(null)
      revealRowTimeoutRef.current = null
    }, 900)
  }, [syncLeftRailScroll, timelineScrollRef, visibleRowIds])

  useEffect(
    () => () => {
      if (revealRowTimeoutRef.current !== null) {
        window.clearTimeout(revealRowTimeoutRef.current)
      }
    },
    []
  )

  return {
    contextMenu,
    setContextMenu,
    goToPopoverProps: {
      editor: goToEditor,
      onEditorChange: setGoToEditor,
      onCommit: commitGoToEditor,
      onCancel: cancelGoToEditor,
    },
    leftRailProps: {
      activeTrackId,
      currentTime,
      duration,
      durationEditor,
      isPreviewLoading,
      leftRailBodyRef,
      loop,
      selectedShapeId,
      snapEnabled,
      tracks: visibleTracks,
      hiddenTracks,
      visiblePropertyRows,
      revealedRowId,
      onActivePropertyRowChange,
      onAddShape,
      onApplyDuration: applyDuration,
      onClearPropertyRow,
      onTogglePropertyKeyframe,
      onClearSelection: () => setSelectedKeyframe(null),
      onClearTrackKeyframes,
      onCommitDurationEditor: commitDurationEditor,
      onDurationEditorChange: setDurationEditor,
      onLeftRailWheel: handleLeftRailWheel,
      onLoopChange,
      onOpenContextMenu: openContextMenu,
      onOpenDurationEditor: openDurationEditor,
      onSelectTrack: selectTrack,
      onSetPropertyEasing,
      onSetTrackEasing: setTrackEasing,
      onSnapEnabledChange: setSnapEnabled,
      onToggleTrackKeyframe: toggleKeyframeAtPlayhead,
      createGoToMenuItem: goToMenuItem,
    },
    lanesSurfaceProps: {
      viewport: {
        duration,
        timelineZoom,
        playheadX,
        timelineTicks,
        secondGridTicks,
        laneRef,
        timelineScrollRef,
        timeFromClientX,
        handleScrubStart,
        syncLeftRailScroll,
        onAdjustTimelineZoom: adjustTimelineZoom,
        onFitTimeline: fitTimeline,
      },
      shapeLane: {
        shapes,
        sortedShapes,
        selectedShapeId,
        openShapePicker,
        openClipEditor,
        wipeDirections,
        morphWindows,
        clipBounds,
        shapePicker,
        shapeDraggedRef,
        shapeLabel,
        onClearSelectedKeyframe: () => setSelectedKeyframe(null),
        onScrubStart,
        onTimeChange,
        onOpenClipEditorChange: setOpenClipEditor,
        onShapeBlendChange,
        onShapeEasingChange,
        onMorphEdgeDrag: handleMorphEdgeDrag,
        onSelectShape,
        onOpenShapePicker,
        onShapeIconChange,
        onUploadShape,
        onRemoveShape,
        onShapeDrag: handleShapeDrag,
        onAddShape,
      },
      propertyLane: {
        visiblePropertyRows,
        revealedRowId,
        selectedKeyframe,
        onActivePropertyRowChange,
        onRemovePropertyKeyframe,
        onMovePropertyKeyframe,
        onSetPropertyEasing,
        onSelectKeyframe: setSelectedKeyframe,
        onScrubStart,
        onTimeChange,
      },
      trackLane: {
        tracks: visibleTracks,
        revealedRowId,
        activeTrackId,
        selectedKeyframe,
        timeEditor,
        keyframeDraggedRef,
        onSelectTrack: selectTrack,
        onSelectKeyframe: setSelectedKeyframe,
        onTimeEditorChange: setTimeEditor,
        onCommitTimeEditor: commitTimeEditor,
        onScrubStart,
        onTimeChange,
        onAddTrackKeyframeAtTime: addTrackKeyframe,
        onRemoveTrackKeyframe: removeTrackKeyframe,
        onClearTrackKeyframes,
        onSetTrackEasing: setTrackEasing,
        onSetSingleKeyframeEasing: setSingleKeyframeEasing,
        onBlockDrag: handleBlockDrag,
        onKeyframeDrag: handleKeyframeDrag,
      },
      menu: {
        onOpenContextMenu: openContextMenu,
        createGoToMenuItem: goToMenuItem,
      },
    },
  }
}
