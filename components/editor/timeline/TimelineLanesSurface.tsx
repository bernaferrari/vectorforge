"use client"

import React from "react"
import { TimelineLaneBackground } from "./TimelineLaneBackground"
import { TimelineEndCap, TimelinePlayheadLine } from "./TimelineLaneOverlays"
import type { ShapeClipBounds, MorphWindow } from "./TimelineLayoutModel"
import type { TimelineMenuItem } from "./TimelineMenuModel"
import { TimelinePropertyRows } from "./TimelinePropertyRows"
import { TimelineRuler } from "./TimelineRuler"
import { TimelineShapeLane } from "./TimelineShapeLane"
import { TimelineTrackRows } from "./TimelineTrackRows"
import { TimelineZoomControls } from "./TimelineZoomControls"
import type {
  SelectedTimelineKeyframe,
  ShapeOption,
  TrackTimeEditor,
  WipeDirectionOption,
} from "./TimelineTypes"
import type { useShapePickerCatalog } from "./useShapePickerCatalog"
import type {
  EasingType,
  ShapeStop,
  TimelinePropertyRow,
  TimelineTrack,
} from "../TimelineModel"

type TimelineTimeFromClientX = (
  clientX: number,
  options?: { bypass?: boolean; clampToViewport?: boolean }
) => number

type TimelineTick = {
  time: number
  major: boolean
}

type TimelineViewportProps = {
  duration: number
  timelineZoom: number
  playheadX: string
  timelineTicks: TimelineTick[]
  secondGridTicks: number[]
  laneRef: React.RefObject<HTMLDivElement | null>
  timelineScrollRef: React.RefObject<HTMLDivElement | null>
  timeFromClientX: TimelineTimeFromClientX
  handleScrubStart: (event: React.MouseEvent<HTMLElement>) => void
  syncLeftRailScroll: (scrollTop: number) => void
  onAdjustTimelineZoom: (direction: number) => void
  onFitTimeline: () => void
}

type TimelineShapeLaneProps = {
  shapes: ShapeStop[]
  sortedShapes: ShapeStop[]
  selectedShapeId: string | null
  openShapePicker: string | null
  openClipEditor: string | null
  wipeDirections: WipeDirectionOption[]
  morphWindows: MorphWindow[]
  clipBounds: ShapeClipBounds[]
  shapePicker: ReturnType<typeof useShapePickerCatalog>
  shapeDraggedRef: React.MutableRefObject<boolean>
  shapeLabel: (stop: ShapeStop) => string
  onClearSelectedKeyframe: () => void
  onScrubStart?: () => void
  onTimeChange: (time: number) => void
  onOpenClipEditorChange: (shapeId: string | null) => void
  onShapeBlendChange: (
    id: string,
    patch: Partial<Pick<ShapeStop, "transitionType" | "wipeDirection">>
  ) => void
  onShapeEasingChange: (id: string, easing: EasingType) => void
  onMorphEdgeDrag: (
    event: React.PointerEvent<HTMLElement>,
    shapeId: string,
    edge: "start" | "end",
    fromTime: number,
    toTime: number
  ) => void
  onSelectShape: (id: string) => void
  onOpenShapePicker: (id: string | null) => void
  onShapeIconChange: (id: string, option: ShapeOption) => void
  onUploadShape: (id: string) => void
  onRemoveShape: (id: string) => void
  onShapeDrag: (event: React.PointerEvent<HTMLElement>, shapeId: string) => void
  onAddShape: () => void
}

type TimelinePropertyLaneProps = {
  visiblePropertyRows: TimelinePropertyRow[]
  selectedKeyframe: SelectedTimelineKeyframe
  onActivePropertyRowChange?: (rowId: string) => void
  onRemovePropertyKeyframe?: (rowId: string, keyframeId: string) => void
  onMovePropertyKeyframe?: (
    rowId: string,
    keyframeId: string,
    time: number
  ) => void
  onSetPropertyEasing?: (
    rowId: string,
    keyframeId: string | null,
    easing: EasingType
  ) => void
  onSelectKeyframe: (keyframe: SelectedTimelineKeyframe) => void
  onScrubStart?: () => void
  onTimeChange: (time: number) => void
}

type TimelineTrackLaneProps = {
  tracks: TimelineTrack[]
  activeTrackId?: string | null
  selectedKeyframe: SelectedTimelineKeyframe
  timeEditor: TrackTimeEditor | null
  keyframeDraggedRef: React.MutableRefObject<boolean>
  onSelectTrack: (trackId: string) => void
  onSelectKeyframe: (keyframe: SelectedTimelineKeyframe) => void
  onTimeEditorChange: React.Dispatch<
    React.SetStateAction<TrackTimeEditor | null>
  >
  onCommitTimeEditor: () => void
  onScrubStart?: () => void
  onTimeChange: (time: number) => void
  onAddTrackKeyframeAtTime: (trackId: string, time: number) => void
  onRemoveTrackKeyframe: (trackId: string, keyframeId: string) => void
  onClearTrackKeyframes?: (trackId: string) => void
  onSetTrackEasing: (trackId: string, easing: EasingType) => void
  onSetSingleKeyframeEasing: (
    trackId: string,
    keyframeId: string,
    easing: EasingType
  ) => void
  onBlockDrag: (event: React.MouseEvent, trackId: string) => void
  onKeyframeDrag: (
    event: React.MouseEvent,
    trackId: string,
    keyframeId: string
  ) => void
}

type TimelineMenuActions = {
  onOpenContextMenu: (
    event: React.MouseEvent,
    title: string,
    items: TimelineMenuItem[]
  ) => void
  createGoToMenuItem: (
    event: React.MouseEvent,
    time: number,
    onBeforeOpen?: () => void
  ) => TimelineMenuItem
}

type TimelineLanesSurfaceProps = {
  viewport: TimelineViewportProps
  shapeLane: TimelineShapeLaneProps
  propertyLane: TimelinePropertyLaneProps
  trackLane: TimelineTrackLaneProps
  menu: TimelineMenuActions
}

export function TimelineLanesSurface({
  viewport,
  shapeLane,
  propertyLane,
  trackLane,
  menu,
}: TimelineLanesSurfaceProps) {
  return (
    <div
      ref={viewport.timelineScrollRef}
      className="relative min-w-0 flex-1 [scrollbar-width:none] overflow-auto [&::-webkit-scrollbar]:hidden"
      onScroll={(event) =>
        viewport.syncLeftRailScroll(event.currentTarget.scrollTop)
      }
    >
      <div className="flex min-w-full">
        <div
          className="relative shrink-0"
          style={{
            width: `${viewport.timelineZoom * 100}%`,
            minWidth: "100%",
          }}
        >
          <TimelineRuler
            ref={viewport.laneRef}
            duration={viewport.duration}
            ticks={viewport.timelineTicks}
            playheadX={viewport.playheadX}
            onMouseDown={viewport.handleScrubStart}
            onContextMenu={(event) => {
              const time = viewport.timeFromClientX(event.clientX, {
                bypass: event.altKey,
              })
              menu.onOpenContextMenu(event, "Timeline", [
                menu.createGoToMenuItem(event, time),
              ])
            }}
          />

          <div className="relative">
            <TimelineLaneBackground
              duration={viewport.duration}
              secondGridTicks={viewport.secondGridTicks}
            />
            <TimelineShapeLane
              duration={viewport.duration}
              shapes={shapeLane.shapes}
              sortedShapes={shapeLane.sortedShapes}
              selectedShapeId={shapeLane.selectedShapeId}
              openShapePicker={shapeLane.openShapePicker}
              openClipEditor={shapeLane.openClipEditor}
              wipeDirections={shapeLane.wipeDirections}
              morphWindows={shapeLane.morphWindows}
              clipBounds={shapeLane.clipBounds}
              shapePicker={shapeLane.shapePicker}
              shapeDraggedRef={shapeLane.shapeDraggedRef}
              shapeLabel={shapeLane.shapeLabel}
              timeFromClientX={viewport.timeFromClientX}
              onClearSelectedKeyframe={shapeLane.onClearSelectedKeyframe}
              onScrubStart={shapeLane.onScrubStart}
              onTimeChange={shapeLane.onTimeChange}
              onOpenClipEditorChange={shapeLane.onOpenClipEditorChange}
              onShapeBlendChange={shapeLane.onShapeBlendChange}
              onShapeEasingChange={shapeLane.onShapeEasingChange}
              onMorphEdgeDrag={shapeLane.onMorphEdgeDrag}
              onSelectShape={shapeLane.onSelectShape}
              onOpenShapePicker={shapeLane.onOpenShapePicker}
              onShapeIconChange={shapeLane.onShapeIconChange}
              onUploadShape={shapeLane.onUploadShape}
              onRemoveShape={shapeLane.onRemoveShape}
              onShapeDrag={shapeLane.onShapeDrag}
              onOpenContextMenu={menu.onOpenContextMenu}
              createGoToMenuItem={menu.createGoToMenuItem}
              onAddShape={shapeLane.onAddShape}
            />

            <TimelinePropertyRows
              duration={viewport.duration}
              rows={propertyLane.visiblePropertyRows}
              selectedKeyframe={propertyLane.selectedKeyframe}
              onSelectKeyframe={propertyLane.onSelectKeyframe}
              onActivePropertyRowChange={propertyLane.onActivePropertyRowChange}
              onRemovePropertyKeyframe={propertyLane.onRemovePropertyKeyframe}
              onMovePropertyKeyframe={propertyLane.onMovePropertyKeyframe}
              onSetPropertyEasing={propertyLane.onSetPropertyEasing}
              onScrubStart={propertyLane.onScrubStart}
              onTimeChange={propertyLane.onTimeChange}
              timeFromClientX={viewport.timeFromClientX}
              onOpenContextMenu={menu.onOpenContextMenu}
              createGoToMenuItem={menu.createGoToMenuItem}
            />

            <TimelineTrackRows
              duration={viewport.duration}
              tracks={trackLane.tracks}
              activeTrackId={trackLane.activeTrackId}
              selectedKeyframe={trackLane.selectedKeyframe}
              timeEditor={trackLane.timeEditor}
              keyframeDraggedRef={trackLane.keyframeDraggedRef}
              onSelectTrack={trackLane.onSelectTrack}
              onSelectKeyframe={trackLane.onSelectKeyframe}
              onTimeEditorChange={trackLane.onTimeEditorChange}
              onCommitTimeEditor={trackLane.onCommitTimeEditor}
              onScrubStart={trackLane.onScrubStart}
              onTimeChange={trackLane.onTimeChange}
              onAddTrackKeyframeAtTime={trackLane.onAddTrackKeyframeAtTime}
              onRemoveTrackKeyframe={trackLane.onRemoveTrackKeyframe}
              onClearTrackKeyframes={trackLane.onClearTrackKeyframes}
              onSetTrackEasing={trackLane.onSetTrackEasing}
              onSetSingleKeyframeEasing={trackLane.onSetSingleKeyframeEasing}
              onBlockDrag={trackLane.onBlockDrag}
              onKeyframeDrag={trackLane.onKeyframeDrag}
              timeFromClientX={viewport.timeFromClientX}
              onOpenContextMenu={menu.onOpenContextMenu}
              createGoToMenuItem={menu.createGoToMenuItem}
            />
          </div>
          <TimelinePlayheadLine playheadX={viewport.playheadX} />
          <TimelineEndCap />
        </div>
        <TimelineZoomControls
          zoom={viewport.timelineZoom}
          onAdjustZoom={viewport.onAdjustTimelineZoom}
          onFitTimeline={viewport.onFitTimeline}
        />
      </div>
    </div>
  )
}
