"use client"

import React from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { EasingType, ShapeStop } from "../TimelineModel"
import { easingMenuItems } from "./TimelineEasingControls"
import { widthForSpan, xForFrac } from "./TimelineGeometry"
import type { MorphWindow } from "./TimelineLayoutModel"
import type { TimelineMenuItem } from "./TimelineMenuModel"
import {
  type TransitionEdge,
  transitionIconForMode,
  transitionModeForShape,
} from "./TimelineTransitionModel"
import { TimelineTransitionEditor } from "./TimelineTransitionEditor"
import type { WipeDirectionOption } from "./TimelineTypes"

export type TimelineMorphWindowProps = {
  duration: number
  window: MorphWindow
  openClipEditor: string | null
  wipeDirections: WipeDirectionOption[]
  onOpenClipEditorChange: (shapeId: string | null) => void
  onShapeBlendChange: (
    id: string,
    patch: Partial<Pick<ShapeStop, "transitionType" | "wipeDirection">>
  ) => void
  onShapeEasingChange: (id: string, easing: EasingType) => void
  onMorphEdgeDrag: (
    event: React.PointerEvent<HTMLElement>,
    shapeId: string,
    edge: TransitionEdge,
    fromTime: number,
    toTime: number
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
  shapeLabel: (stop: ShapeStop) => string
  timeFromClientX: (
    clientX: number,
    options?: { bypass?: boolean; clampToViewport?: boolean }
  ) => number
}

export function TimelineMorphWindow({
  duration,
  window,
  openClipEditor,
  wipeDirections,
  onOpenClipEditorChange,
  onShapeBlendChange,
  onShapeEasingChange,
  onMorphEdgeDrag,
  onOpenContextMenu,
  createGoToMenuItem,
  shapeLabel,
  timeFromClientX,
}: TimelineMorphWindowProps) {
  const { stop, next, startTime, endTime } = window
  const mode = transitionModeForShape(stop)
  const isCut = mode === "cut"
  const BlockIcon = transitionIconForMode(mode)

  return (
    <React.Fragment>
      <Popover
        open={openClipEditor === stop.id}
        onOpenChange={(open) => onOpenClipEditorChange(open ? stop.id : null)}
      >
        <PopoverTrigger
          title={`Transition: ${mode} - drag edges to set duration, click to edit`}
          onMouseDown={(event) => event.stopPropagation()}
          onContextMenu={(event) => {
            const time = timeFromClientX(event.clientX, {
              bypass: event.altKey,
            })

            onOpenContextMenu(event, `${shapeLabel(stop)} transition`, [
              createGoToMenuItem(event, time),
              { type: "separator" },
              {
                label: "Edit transition",
                onSelect: () => onOpenClipEditorChange(stop.id),
              },
              { type: "separator" },
              {
                label: "Fade",
                onSelect: () =>
                  onShapeBlendChange(stop.id, {
                    transitionType: "fade",
                  }),
              },
              {
                label: "Wipe",
                onSelect: () =>
                  onShapeBlendChange(stop.id, {
                    transitionType: "wipe",
                    wipeDirection:
                      stop.wipeDirection.x === 0 && stop.wipeDirection.y === 0
                        ? { x: 1, y: 0 }
                        : stop.wipeDirection,
                  }),
              },
              {
                label: "Cut",
                onSelect: () =>
                  onShapeBlendChange(stop.id, {
                    transitionType: "cut",
                  }),
              },
              ...easingMenuItems(stop.easing, (easing) =>
                onShapeEasingChange(stop.id, easing)
              ),
            ])
          }}
          className={cn(
            "group/transition absolute top-1/2 flex h-7 -translate-y-1/2 cursor-pointer items-center justify-center transition-[filter] hover:brightness-125 focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:outline-none focus-visible:ring-inset",
            isCut
              ? "-translate-x-1/2 rounded-md border border-border bg-muted/70"
              : "overflow-hidden border-y border-border"
          )}
          style={{
            left: xForFrac(startTime / duration),
            width: isCut
              ? 20
              : widthForSpan(Math.max(0, endTime - startTime) / duration),
            minWidth: isCut ? 20 : 20,
            background: isCut
              ? undefined
              : `linear-gradient(90deg, ${stop.color}26, ${next.color}26)`,
          }}
        >
          <BlockIcon
            className="size-3 text-foreground/65 transition-colors group-hover/transition:text-foreground"
            strokeWidth={2.25}
          />
        </PopoverTrigger>
        <PopoverContent
          align="center"
          side="top"
          sideOffset={10}
          className="w-60 border-border bg-popover p-3 text-foreground shadow-2xl"
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.stopPropagation()}
        >
          <TimelineTransitionEditor
            mode={mode}
            stop={stop}
            wipeDirections={wipeDirections}
            onShapeBlendChange={onShapeBlendChange}
            onShapeEasingChange={onShapeEasingChange}
          />
        </PopoverContent>
      </Popover>

      <TransitionEdgeHandle
        title={
          isCut
            ? "Drag to set the cut point"
            : "Drag to set when the transition starts"
        }
        left={xForFrac(startTime / duration)}
        onPointerDown={(event) =>
          onMorphEdgeDrag(event, stop.id, "start", stop.time, next.time)
        }
      />
      {!isCut && (
        <TransitionEdgeHandle
          title="Drag to set when the transition ends"
          left={xForFrac(endTime / duration)}
          onPointerDown={(event) =>
            onMorphEdgeDrag(event, stop.id, "end", stop.time, next.time)
          }
        />
      )}
    </React.Fragment>
  )
}

function TransitionEdgeHandle({
  title,
  left,
  onPointerDown,
}: {
  title: string
  left: string
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
}) {
  return (
    <div
      title={title}
      onPointerDown={onPointerDown}
      className="absolute top-1/2 flex h-7 w-2.5 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none items-center justify-center"
      style={{ left }}
    >
      <span className="h-5 w-[3px] rounded-full bg-foreground/45 transition-colors hover:bg-foreground" />
    </div>
  )
}
