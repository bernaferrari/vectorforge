"use client"

import React from "react"
import type { EasingType, TimelinePropertyRow } from "../TimelineModel"
import { TimelinePropertyRowLane } from "./TimelinePropertyRowLane"
import type { SelectedTimelineKeyframe } from "./TimelineTypes"
import type { TimelineMenuItem } from "./TimelineMenuModel"

type TimelinePropertyRowsProps = {
  duration: number
  rows: TimelinePropertyRow[]
  selectedKeyframe: SelectedTimelineKeyframe
  onSelectKeyframe: (keyframe: SelectedTimelineKeyframe) => void
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
  onScrubStart?: () => void
  onTimeChange: (time: number) => void
  timeFromClientX: (
    clientX: number,
    options?: { bypass?: boolean; clampToViewport?: boolean }
  ) => number
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

export function TimelinePropertyRows({
  duration,
  rows,
  selectedKeyframe,
  onSelectKeyframe,
  onActivePropertyRowChange,
  onRemovePropertyKeyframe,
  onMovePropertyKeyframe,
  onSetPropertyEasing,
  onScrubStart,
  onTimeChange,
  timeFromClientX,
  onOpenContextMenu,
  createGoToMenuItem,
}: TimelinePropertyRowsProps) {
  return (
    <>
      {rows.map((row) => (
        <TimelinePropertyRowLane
          key={row.id}
          duration={duration}
          row={row}
          selectedKeyframe={selectedKeyframe}
          onSelectKeyframe={onSelectKeyframe}
          onActivePropertyRowChange={onActivePropertyRowChange}
          onRemovePropertyKeyframe={onRemovePropertyKeyframe}
          onMovePropertyKeyframe={onMovePropertyKeyframe}
          onSetPropertyEasing={onSetPropertyEasing}
          onScrubStart={onScrubStart}
          onTimeChange={onTimeChange}
          timeFromClientX={timeFromClientX}
          onOpenContextMenu={onOpenContextMenu}
          createGoToMenuItem={createGoToMenuItem}
        />
      ))}
    </>
  )
}
