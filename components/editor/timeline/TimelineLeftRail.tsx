"use client"

import React from "react"
import { Plus } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
  hiddenTracks: TimelineTrack[]
  revealedRowId: string | null
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
      hiddenTracks,
      revealedRowId,
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
    const [addPropertyOpen, setAddPropertyOpen] = React.useState(false)
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
            isRevealed={revealedRowId === `property:${row.id}`}
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
            isRevealed={revealedRowId === `track:${track.id}`}
            activeTrackId={activeTrackId}
            menu={menu}
            onClearSelection={onClearSelection}
            onSelectTrack={onSelectTrack}
            onClearTrackKeyframes={onClearTrackKeyframes}
            onToggleTrackKeyframe={onToggleTrackKeyframe}
            onSetTrackEasing={onSetTrackEasing}
          />
        ))}

        {hiddenTracks.length > 0 && (
          <Popover open={addPropertyOpen} onOpenChange={setAddPropertyOpen}>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  className="flex h-9 w-full items-center gap-2 border-b border-border px-3 text-left text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:outline-none focus-visible:ring-inset"
                />
              }
            >
              <Plus className="size-3.5" />
              Add property
            </PopoverTrigger>
            <PopoverContent
              align="start"
              side="right"
              sideOffset={8}
              className="w-44 gap-1 rounded-lg border-border bg-popover p-1.5"
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="px-2 pt-0.5 pb-1 text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                Add property
              </div>
              {hiddenTracks.map((track) => (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => {
                    onSelectTrack(track.id)
                    setAddPropertyOpen(false)
                  }}
                  className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[11px] font-medium text-foreground transition-colors hover:bg-muted focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:outline-none"
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: track.color }}
                  />
                  <span className="min-w-0 flex-1 truncate">{track.name}</span>
                </button>
              ))}
            </PopoverContent>
          </Popover>
        )}
      </div>
    )
  }
)

TimelineLeftRail.displayName = "TimelineLeftRail"
