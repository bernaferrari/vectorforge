"use client"

import React from "react"
import type {
  EasingType,
  TimelinePropertyRow,
  TimelineTrack,
} from "../TimelineModel"
import { EasingPicker } from "./TimelineEasingControls"
import {
  createPropertyRailMenuItems,
  createTrackRailMenuItems,
  isTrackKeyedAtPlayhead,
  propertyRowKeyframeAtPlayhead,
  type TimelineLeftRailMenuProps,
} from "./TimelineLeftRailMenuModel"
import { TimelineRailKeyframeButton } from "./TimelineRailKeyframeButton"

export function TimelinePropertyRailRow({
  row,
  isRevealed,
  menu,
  onClearSelection,
  onActivePropertyRowChange,
  onClearPropertyRow,
  onTogglePropertyKeyframe,
  onSetPropertyEasing,
}: {
  row: TimelinePropertyRow
  isRevealed: boolean
  menu: TimelineLeftRailMenuProps
  onClearSelection: () => void
  onActivePropertyRowChange?: (rowId: string) => void
  onClearPropertyRow?: (rowId: string) => void
  onTogglePropertyKeyframe?: (rowId: string, keyframeId?: string | null) => void
  onSetPropertyEasing?: (
    rowId: string,
    keyframeId: string | null,
    easing: EasingType
  ) => void
}) {
  const keyframeAtPlayhead = propertyRowKeyframeAtPlayhead(
    row,
    menu.currentTime
  )

  const selectRow = () => {
    onClearSelection()
    onActivePropertyRowChange?.(row.id)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={selectRow}
      onContextMenu={(event) =>
        menu.onOpenContextMenu(
          event,
          row.name,
          createPropertyRailMenuItems({
            event,
            row,
            menu,
            onActivePropertyRowChange,
            onClearPropertyRow,
            onSetPropertyEasing,
          })
        )
      }
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          selectRow()
        }
      }}
      className={`group flex h-9 items-center gap-2 border-b border-border px-3 transition-colors hover:bg-muted/40 ${
        isRevealed ? "bg-primary/10 ring-1 ring-primary/25 ring-inset" : ""
      }`}
    >
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: row.color }}
      />
      <span className="flex-1 truncate text-[11px] font-medium text-muted-foreground">
        {row.name}
      </span>
      <span
        className="flex h-5 shrink-0 items-center justify-center gap-1.5"
        aria-label={`${row.keyframes.length} keyframes`}
      >
        {row.keyframes.length > 0 && onSetPropertyEasing && (
          <EasingPicker
            value={row.keyframes[0]?.easing ?? "ease-in-out"}
            onChange={(easing) => onSetPropertyEasing(row.id, null, easing)}
            color={row.color}
            scopeLabel={`All ${row.name} keyframes easing`}
          />
        )}
        {onTogglePropertyKeyframe && (
          <TimelineRailKeyframeButton
            color={row.color}
            isKeyedAtPlayhead={Boolean(keyframeAtPlayhead)}
            isAnimated={false}
            addLabel={`Add ${row.name} keyframe`}
            removeLabel={`Remove ${row.name} keyframe`}
            onToggle={() =>
              onTogglePropertyKeyframe(row.id, keyframeAtPlayhead?.id)
            }
          />
        )}
      </span>
    </div>
  )
}

export function TimelineTrackRailRow({
  track,
  isRevealed,
  activeTrackId,
  menu,
  onClearSelection,
  onSelectTrack,
  onClearTrackKeyframes,
  onToggleTrackKeyframe,
  onSetTrackEasing,
}: {
  track: TimelineTrack
  isRevealed: boolean
  activeTrackId?: string | null
  menu: TimelineLeftRailMenuProps
  onClearSelection: () => void
  onSelectTrack: (trackId: string) => void
  onClearTrackKeyframes?: (trackId: string) => void
  onToggleTrackKeyframe: (trackId: string) => void
  onSetTrackEasing: (
    trackId: string,
    easing: TimelineTrack["keyframes"][number]["easing"]
  ) => void
}) {
  const isActive = activeTrackId === track.id
  const animated = track.keyframes.length > 0
  const keyedAtPlayhead = isTrackKeyedAtPlayhead(track, menu.currentTime)

  const selectTrack = () => {
    onClearSelection()
    onSelectTrack(track.id)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={selectTrack}
      onContextMenu={(event) =>
        menu.onOpenContextMenu(
          event,
          track.name,
          createTrackRailMenuItems({
            event,
            track,
            menu,
            keyedAtPlayhead,
            onSelectTrack,
            onClearTrackKeyframes,
            onToggleTrackKeyframe,
            onSetTrackEasing,
          })
        )
      }
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          selectTrack()
        }
      }}
      className={`group flex h-9 items-center gap-2 border-b border-border px-3 transition-colors focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:outline-none focus-visible:ring-inset ${
        isRevealed
          ? "bg-primary/10 ring-1 ring-primary/25 ring-inset"
          : isActive
            ? "bg-muted/70"
            : "hover:bg-muted/40"
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
      <span className="flex h-5 shrink-0 items-center justify-center gap-1.5">
        {animated && (
          <EasingPicker
            value={track.keyframes[0]?.easing ?? "ease-in-out"}
            onChange={(easing) => onSetTrackEasing(track.id, easing)}
            color={track.color}
            scopeLabel={`All ${track.name} keyframes easing`}
          />
        )}
        <TimelineRailKeyframeButton
          color={track.color}
          isKeyedAtPlayhead={keyedAtPlayhead}
          isAnimated={animated}
          addLabel={`Add ${track.name} keyframe`}
          removeLabel={`Remove ${track.name} keyframe`}
          onToggle={() => onToggleTrackKeyframe(track.id)}
        />
      </span>
    </div>
  )
}
