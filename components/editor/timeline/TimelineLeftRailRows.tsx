"use client"

import React from "react"
import { Diamond, Loader2, Plus } from "lucide-react"
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
  type TimelineLeftRailMenuProps,
} from "./TimelineLeftRailMenuModel"

export function TimelineShapeHeaderRow({
  selectedShapeId,
  isPreviewLoading,
  onAddShape,
}: {
  selectedShapeId: string | null
  isPreviewLoading: boolean
  onAddShape: () => void
}) {
  return (
    <div
      className={`group flex h-9 items-center gap-2 border-b border-border px-3 transition-colors ${
        selectedShapeId ? "bg-muted/25" : "hover:bg-muted/40"
      }`}
    >
      <span className="flex-1 truncate text-[11px] font-semibold text-foreground">
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
  )
}

export function TimelinePropertyRailRow({
  row,
  menu,
  onClearSelection,
  onActivePropertyRowChange,
  onClearPropertyRow,
  onSetPropertyEasing,
}: {
  row: TimelinePropertyRow
  menu: TimelineLeftRailMenuProps
  onClearSelection: () => void
  onActivePropertyRowChange?: (rowId: string) => void
  onClearPropertyRow?: (rowId: string) => void
  onSetPropertyEasing?: (
    rowId: string,
    keyframeId: string | null,
    easing: EasingType
  ) => void
}) {
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
        className="flex h-5 shrink-0 items-center justify-center gap-0.5"
        aria-label={`${row.keyframes.length} keyframes`}
      >
        {row.keyframes.length > 0 && onSetPropertyEasing && (
          <EasingPicker
            value={row.keyframes[0]?.easing ?? "ease-in-out"}
            onChange={(easing) => onSetPropertyEasing(row.id, null, easing)}
            color={row.color}
          />
        )}
        <span
          className="size-[7px] rotate-45 rounded-[1px] border border-transparent"
          style={{ backgroundColor: row.color }}
        />
      </span>
    </div>
  )
}

export function TimelineTrackRailRow({
  track,
  activeTrackId,
  menu,
  onClearSelection,
  onSelectTrack,
  onClearTrackKeyframes,
  onToggleTrackKeyframe,
  onSetTrackEasing,
}: {
  track: TimelineTrack
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
          onChange={(easing) => onSetTrackEasing(track.id, easing)}
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
        onClick={(event) => {
          event.stopPropagation()
          onToggleTrackKeyframe(track.id)
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
            fill: keyedAtPlayhead ? track.color : "transparent",
            color: keyedAtPlayhead ? track.color : undefined,
          }}
        />
      </button>
    </div>
  )
}
