"use client"

import React from "react"
import type { TimelinePropertyRow, TimelineTrack } from "../TimelineModel"
import type { EasingType } from "../TimelineModel"
import {
  TimelinePropertyRailRow,
  TimelineTrackRailRow,
} from "./TimelineLeftRailRows"
import { TimelineShapeHeaderRow } from "./TimelineShapeHeaderRow"
import type { TimelineMenuItem } from "./TimelineMenuModel"

type TimelineLeftRailProps = {
  selectedShapeId: string | null
  isPreviewLoading: boolean
  visiblePropertyRows: TimelinePropertyRow[]
  tracks: TimelineTrack[]
  activeTrackId?: string | null
  currentTime: number
  onAddShape: () => void
  onClearSelection: () => void
  onSelectTrack: (trackId: string) => void
  onActivePropertyRowChange?: (rowId: string) => void
  onClearPropertyRow?: (rowId: string) => void
  onTogglePropertyKeyframe?: (rowId: string, keyframeId?: string | null) => void
  onClearTrackKeyframes?: (trackId: string) => void
  onSetPropertyEasing?: (
    rowId: string,
    keyframeId: string | null,
    easing: EasingType
  ) => void
  onToggleTrackKeyframe: (trackId: string) => void
  onSetTrackEasing: (
    trackId: string,
    easing: TimelineTrack["keyframes"][number]["easing"]
  ) => void
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

export const TimelineLeftRail = React.forwardRef<
  HTMLDivElement,
  TimelineLeftRailProps
>(
  (
    {
      selectedShapeId,
      isPreviewLoading,
      visiblePropertyRows,
      tracks,
      activeTrackId,
      currentTime,
      onAddShape,
      onClearSelection,
      onSelectTrack,
      onActivePropertyRowChange,
      onClearPropertyRow,
      onTogglePropertyKeyframe,
      onClearTrackKeyframes,
      onSetPropertyEasing,
      onToggleTrackKeyframe,
      onSetTrackEasing,
      onOpenContextMenu,
      createGoToMenuItem,
    },
    ref
  ) => {
    const menu = {
      currentTime,
      onOpenContextMenu,
      createGoToMenuItem,
    }

    return (
      <div ref={ref} className="will-change-transform">
        <TimelineShapeHeaderRow
          selectedShapeId={selectedShapeId}
          isPreviewLoading={isPreviewLoading}
          onAddShape={onAddShape}
        />

        {visiblePropertyRows.map((row) => (
          <TimelinePropertyRailRow
            key={row.id}
            row={row}
            menu={menu}
            onClearSelection={onClearSelection}
            onActivePropertyRowChange={onActivePropertyRowChange}
            onClearPropertyRow={onClearPropertyRow}
            onTogglePropertyKeyframe={onTogglePropertyKeyframe}
            onSetPropertyEasing={onSetPropertyEasing}
          />
        ))}

        {tracks.map((track) => (
          <TimelineTrackRailRow
            key={track.id}
            track={track}
            activeTrackId={activeTrackId}
            menu={menu}
            onClearSelection={onClearSelection}
            onSelectTrack={onSelectTrack}
            onClearTrackKeyframes={onClearTrackKeyframes}
            onToggleTrackKeyframe={onToggleTrackKeyframe}
            onSetTrackEasing={onSetTrackEasing}
          />
        ))}
      </div>
    )
  }
)

TimelineLeftRail.displayName = "TimelineLeftRail"
