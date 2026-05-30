"use client"

import React from "react"
import { bindWindowMouseDrag } from "@/lib/drag-events"
import type { EasingType, TimelinePropertyRow } from "../TimelineModel"
import { easingMenuItems } from "./TimelineEasingControls"
import { widthForSpan, xForFrac } from "./TimelineGeometry"
import { TIMELINE_LAYER } from "./TimelineLayering"
import type { TimelineMenuItem } from "./TimelineMenuModel"
import { TimelineDiamond } from "./TimelinePrimitives"
import type { SelectedTimelineKeyframe } from "./TimelineTypes"

export type TimelinePropertyRowLaneProps = {
  duration: number
  row: TimelinePropertyRow
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

export function TimelinePropertyRowLane({
  duration,
  row,
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
}: TimelinePropertyRowLaneProps) {
  const keyframeDraggedRef = React.useRef(false)
  const times = row.keyframes.map((keyframe) => keyframe.time)
  const minTime = Math.min(...times)
  const maxTime = Math.max(...times)

  return (
    <div
      className="relative h-9 border-b border-border transition-colors hover:bg-muted/35"
      onMouseDown={(event) => {
        if (event.button !== 0) return
        onSelectKeyframe(null)
        onScrubStart?.()
        onTimeChange(timeFromClientX(event.clientX))
      }}
      onContextMenu={(event) => {
        const time = timeFromClientX(event.clientX, {
          bypass: event.altKey,
        })
        onOpenContextMenu(event, row.name, [
          createGoToMenuItem(event, time, () =>
            onActivePropertyRowChange?.(row.id)
          ),
          {
            label: "Select property",
            onSelect: () => onActivePropertyRowChange?.(row.id),
          },
          ...(row.keyframes.length && onSetPropertyEasing
            ? easingMenuItems(
                row.keyframes[0]?.easing ?? "ease-in-out",
                (easing) => onSetPropertyEasing(row.id, null, easing)
              )
            : []),
        ])
      }}
    >
      {row.keyframes.length > 1 && (
        <div
          className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full opacity-45"
          style={{
            left: xForFrac(minTime / duration),
            width: widthForSpan((maxTime - minTime) / duration),
            backgroundColor: row.color,
          }}
        />
      )}

      {row.keyframes.map((keyframe) => {
        const selected =
          selectedKeyframe?.type === "property" &&
          selectedKeyframe.rowId === row.id &&
          selectedKeyframe.kfId === keyframe.id
        const nextSelection: SelectedTimelineKeyframe = {
          type: "property",
          rowId: row.id,
          kfId: keyframe.id,
        }

        return (
          <button
            type="button"
            key={keyframe.id}
            title={`${row.name}${keyframe.label ? ` - ${keyframe.label}` : ""} @ ${keyframe.time.toFixed(2)}s`}
            className="absolute top-1/2 flex size-4 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center transition-transform hover:scale-110 focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:outline-none"
            style={{
              left: xForFrac(keyframe.time / duration),
              zIndex: TIMELINE_LAYER.propertyKeyframe,
            }}
            onMouseDown={(event) => {
              event.stopPropagation()
              onSelectKeyframe(nextSelection)
              onActivePropertyRowChange?.(row.id)
              onTimeChange(keyframe.time)
              if (event.button !== 0 || !onMovePropertyKeyframe) return
              const startX = event.clientX
              const startY = event.clientY
              let activeKeyframeId = keyframe.id
              keyframeDraggedRef.current = false
              bindWindowMouseDrag({
                onMove: (moveEvent) => {
                  const time = timeFromClientX(moveEvent.clientX, {
                    bypass: moveEvent.altKey,
                  })
                  if (
                    Math.hypot(
                      moveEvent.clientX - startX,
                      moveEvent.clientY - startY
                    ) > 3
                  ) {
                    keyframeDraggedRef.current = true
                    onScrubStart?.()
                  }
                  onTimeChange(time)
                  onMovePropertyKeyframe(row.id, activeKeyframeId, time)
                  if (row.id === "style") {
                    activeKeyframeId = `style-${time.toFixed(3)}`
                  }
                },
              })
            }}
            onClick={(event) => {
              event.stopPropagation()
              if (keyframeDraggedRef.current) {
                keyframeDraggedRef.current = false
                return
              }
              onSelectKeyframe(nextSelection)
              onActivePropertyRowChange?.(row.id)
              onTimeChange(keyframe.time)
            }}
            onContextMenu={(event) => {
              event.stopPropagation()
              onOpenContextMenu(event, row.name, [
                createGoToMenuItem(event, keyframe.time, () =>
                  onActivePropertyRowChange?.(row.id)
                ),
                {
                  label: "Select property",
                  onSelect: () => onActivePropertyRowChange?.(row.id),
                },
                ...(onSetPropertyEasing
                  ? easingMenuItems(
                      keyframe.easing ?? "ease-in-out",
                      (easing) =>
                        onSetPropertyEasing(row.id, keyframe.id, easing)
                    )
                  : []),
                { type: "separator" },
                {
                  label: "Remove keyframe",
                  danger: true,
                  onSelect: () =>
                    onRemovePropertyKeyframe?.(row.id, keyframe.id),
                },
              ])
            }}
          >
            <TimelineDiamond
              color={row.color}
              borderColor="rgba(0,0,0,0.8)"
              selected={selected}
            />
          </button>
        )
      })}
    </div>
  )
}
