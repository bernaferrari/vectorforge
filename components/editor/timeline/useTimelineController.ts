"use client"

import { useRef, useState } from "react"
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
  })

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
      tracks,
      visiblePropertyRows,
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
        tracks,
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
