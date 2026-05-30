"use client"

import React, { useState, useRef } from "react"
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu"
import { TimelineContextMenu } from "./timeline/TimelineMenus"
import { TimelineGoToPopover } from "./timeline/TimelineGoToPopover"
import { TimelineLanesSurface } from "./timeline/TimelineLanesSurface"
import { TimelineLeftRailPanel } from "./timeline/TimelineLeftRailPanel"
import { useShapePickerCatalog } from "./timeline/useShapePickerCatalog"
import { useTimelineDerivedState } from "./timeline/useTimelineDerivedState"
import { useTimelineDeletion } from "./timeline/useTimelineDeletion"
import { useTimelineScrubbing } from "./timeline/useTimelineScrubbing"
import { useTimelineSelectionGuards } from "./timeline/useTimelineSelectionGuards"
import { useTimelineZoomAndDuration } from "./timeline/useTimelineZoomAndDuration"
import { useTimelineContextMenu } from "./timeline/useTimelineContextMenu"
import { useTimelineShapeDrag } from "./timeline/useTimelineShapeDrag"
import { useTimelineTrackKeyframes } from "./timeline/useTimelineTrackKeyframes"
import { useTimelinePlayheadFollow } from "./timeline/useTimelinePlayheadFollow"
import { useTimelineRailScrollSync } from "./timeline/useTimelineRailScrollSync"
import { useTimelineViewportState } from "./timeline/useTimelineViewportState"
import type {
  SelectedTimelineKeyframe,
  TimelineProps,
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
}) => {
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
            <TimelineLeftRailPanel
              activeTrackId={activeTrackId}
              currentTime={currentTime}
              duration={duration}
              durationEditor={durationEditor}
              isPreviewLoading={isPreviewLoading}
              leftRailBodyRef={leftRailBodyRef}
              loop={loop}
              selectedShapeId={selectedShapeId}
              snapEnabled={snapEnabled}
              tracks={tracks}
              visiblePropertyRows={visiblePropertyRows}
              onActivePropertyRowChange={onActivePropertyRowChange}
              onAddShape={onAddShape}
              onApplyDuration={applyDuration}
              onClearPropertyRow={onClearPropertyRow}
              onClearSelection={() => setSelectedKeyframe(null)}
              onClearTrackKeyframes={onClearTrackKeyframes}
              onCommitDurationEditor={commitDurationEditor}
              onDurationEditorChange={setDurationEditor}
              onLeftRailWheel={handleLeftRailWheel}
              onLoopChange={onLoopChange}
              onOpenContextMenu={openContextMenu}
              onOpenDurationEditor={openDurationEditor}
              onSelectTrack={selectTrack}
              onSetPropertyEasing={onSetPropertyEasing}
              onSetTrackEasing={setTrackEasing}
              onSnapEnabledChange={setSnapEnabled}
              onToggleTrackKeyframe={toggleKeyframeAtPlayhead}
              createGoToMenuItem={goToMenuItem}
            />

            <TimelineLanesSurface
              viewport={{
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
              }}
              shapeLane={{
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
              }}
              propertyLane={{
                visiblePropertyRows,
                selectedKeyframe,
                onActivePropertyRowChange,
                onRemovePropertyKeyframe,
                onMovePropertyKeyframe,
                onSetPropertyEasing,
                onSelectKeyframe: setSelectedKeyframe,
                onScrubStart,
                onTimeChange,
              }}
              trackLane={{
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
              }}
              menu={{
                onOpenContextMenu: openContextMenu,
                createGoToMenuItem: goToMenuItem,
              }}
            />
          </div>
          <TimelineGoToPopover
            editor={goToEditor}
            onEditorChange={setGoToEditor}
            onCommit={commitGoToEditor}
            onCancel={cancelGoToEditor}
          />
        </div>
      </ContextMenuTrigger>
      <TimelineContextMenu
        menu={contextMenu}
        onClose={() => setContextMenu(null)}
      />
    </ContextMenu>
  )
}
