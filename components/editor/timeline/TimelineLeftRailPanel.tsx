"use client"

import React from "react"
import { TimelineHeader } from "./TimelineHeader"
import { TimelineLeftRail } from "./TimelineLeftRail"
import { RAIL_WIDTH } from "./TimelineGeometry"
import type { TimelineMenuItem } from "./TimelineMenuModel"
import type {
  EasingType,
  TimelinePropertyRow,
  TimelineTrack,
} from "../TimelineModel"

type TimelineLeftRailPanelProps = {
  activeTrackId?: string | null
  currentTime: number
  duration: number
  durationEditor: string | null
  isPreviewLoading: boolean
  leftRailBodyRef: React.RefObject<HTMLDivElement | null>
  loop: boolean
  selectedShapeId: string | null
  snapEnabled: boolean
  tracks: TimelineTrack[]
  visiblePropertyRows: TimelinePropertyRow[]
  onActivePropertyRowChange?: (rowId: string) => void
  onAddShape: () => void
  onApplyDuration: (value: number) => void
  onClearPropertyRow?: (rowId: string) => void
  onClearSelection: () => void
  onClearTrackKeyframes?: (trackId: string) => void
  onCommitDurationEditor: () => void
  onDurationEditorChange: (value: string | null) => void
  onLeftRailWheel: (event: React.WheelEvent<HTMLDivElement>) => void
  onLoopChange: (enabled: boolean) => void
  onOpenContextMenu: (
    event: React.MouseEvent,
    title: string,
    items: TimelineMenuItem[]
  ) => void
  onOpenDurationEditor: () => void
  onSelectTrack: (trackId: string) => void
  onSetPropertyEasing?: (
    rowId: string,
    keyframeId: string | null,
    easing: EasingType
  ) => void
  onSetTrackEasing: (trackId: string, easing: EasingType) => void
  onSnapEnabledChange: (enabled: boolean) => void
  onToggleTrackKeyframe: (trackId: string) => void
  createGoToMenuItem: (
    event: React.MouseEvent,
    time: number,
    onBeforeOpen?: () => void
  ) => TimelineMenuItem
}

export function TimelineLeftRailPanel({
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
  onApplyDuration,
  onClearPropertyRow,
  onClearSelection,
  onClearTrackKeyframes,
  onCommitDurationEditor,
  onDurationEditorChange,
  onLeftRailWheel,
  onLoopChange,
  onOpenContextMenu,
  onOpenDurationEditor,
  onSelectTrack,
  onSetPropertyEasing,
  onSetTrackEasing,
  onSnapEnabledChange,
  onToggleTrackKeyframe,
  createGoToMenuItem,
}: TimelineLeftRailPanelProps) {
  return (
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
        onDurationEditorChange={onDurationEditorChange}
        onOpenDurationEditor={onOpenDurationEditor}
        onCommitDurationEditor={onCommitDurationEditor}
        onApplyDuration={onApplyDuration}
        onSnapEnabledChange={onSnapEnabledChange}
        onLoopChange={onLoopChange}
      />
      <div
        className="relative min-h-0 flex-1 overflow-hidden"
        onWheel={onLeftRailWheel}
      >
        <TimelineLeftRail
          ref={leftRailBodyRef}
          selectedShapeId={selectedShapeId}
          isPreviewLoading={isPreviewLoading}
          visiblePropertyRows={visiblePropertyRows}
          tracks={tracks}
          activeTrackId={activeTrackId}
          currentTime={currentTime}
          onAddShape={onAddShape}
          onClearSelection={onClearSelection}
          onSelectTrack={onSelectTrack}
          onActivePropertyRowChange={onActivePropertyRowChange}
          onClearPropertyRow={onClearPropertyRow}
          onClearTrackKeyframes={onClearTrackKeyframes}
          onSetPropertyEasing={onSetPropertyEasing}
          onToggleTrackKeyframe={onToggleTrackKeyframe}
          onSetTrackEasing={onSetTrackEasing}
          onOpenContextMenu={onOpenContextMenu}
          createGoToMenuItem={createGoToMenuItem}
        />
      </div>
    </div>
  )
}
