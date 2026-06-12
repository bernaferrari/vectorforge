"use client"

import React from "react"
import { TimelineLaneBackground } from "./TimelineLaneBackground"
import { TimelineEndCap, TimelinePlayheadLine } from "./TimelineLaneOverlays"
import { TimelinePropertyRows } from "./TimelinePropertyRows"
import { TimelineRuler } from "./TimelineRuler"
import { TimelineShapeLane } from "./TimelineShapeLane"
import { TimelineTrackRows } from "./TimelineTrackRows"
import { TimelineZoomControls } from "./TimelineZoomControls"
import type { TimelineLanesSurfaceProps } from "./TimelineLanesSurfaceTypes"

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
              revealedRowId={propertyLane.revealedRowId}
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
              revealedRowId={trackLane.revealedRowId}
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
