"use client"

import * as React from "react"
import { Popover, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { NormalizedColorStop } from "./color-stop-model"
import { ColorStopEditorPopover } from "./color-stop-editor-popover"
import type { SolidColorEditorProps } from "./color-solid-editor"

export type ColorStopEditorAnchor = "rail" | "row" | null

interface ColorGradientStopRowsProps {
  stops: NormalizedColorStop[]
  openStopEditor: number | null
  openStopEditorAnchor: ColorStopEditorAnchor
  canRemoveStop: boolean
  stopContentRef: React.RefObject<HTMLDivElement | null>
  stopEditorProps: SolidColorEditorProps
  onActiveStopChange: (stop: number) => void
  onStopEditorOpenIntent: () => void
  onOpenStopEditorChange: (
    stop: number | null,
    anchor: ColorStopEditorAnchor
  ) => void
  onCaptureStopOutsidePointer: (event: Event) => void
  onCommitStopPositionInput: (stopId: string, rawValue: string) => void
  onCommitStopColorInput: (
    stopId: string,
    rawValue: string,
    input?: HTMLInputElement
  ) => void
  onRemoveStop?: (stop: number) => void
}

export function ColorGradientStopRows({
  stops,
  openStopEditor,
  openStopEditorAnchor,
  canRemoveStop,
  stopContentRef,
  stopEditorProps,
  onActiveStopChange,
  onStopEditorOpenIntent,
  onOpenStopEditorChange,
  onCaptureStopOutsidePointer,
  onCommitStopPositionInput,
  onCommitStopColorInput,
  onRemoveStop,
}: ColorGradientStopRowsProps) {
  return (
    <div className="space-y-1">
      {stops.map((stopItem, stop) => {
        const active = openStopEditor === stop
        const stopColor = stopItem.color
        return (
          <div
            key={`stop-row-${stopItem.id}`}
            onClick={() => {
              onActiveStopChange(stop)
            }}
            className={cn(
              "grid h-8 w-full grid-cols-[48px_minmax(0,1fr)_28px] items-center gap-x-1.5 px-2 text-left text-[13px]",
              active ? "bg-accent text-accent-foreground" : "hover:bg-muted/60"
            )}
          >
            <label
              className="flex h-7 items-center rounded-md bg-muted/60 px-1.5 font-mono text-foreground tabular-nums focus-within:ring-2 focus-within:ring-ring/35"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <input
                key={`${stopItem.id}-${Math.round(stopItem.position * 1000)}`}
                type="text"
                inputMode="decimal"
                aria-label={`Stop ${stop + 1} position`}
                defaultValue={Math.round(stopItem.position * 100)}
                className="h-full min-w-0 flex-1 bg-transparent p-0 text-center font-mono text-[13px] text-foreground outline-none"
                onFocus={(event) => {
                  onActiveStopChange(stop)
                  event.currentTarget.select()
                }}
                onBlur={(event) =>
                  onCommitStopPositionInput(
                    stopItem.id,
                    event.currentTarget.value
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    onCommitStopPositionInput(
                      stopItem.id,
                      event.currentTarget.value
                    )
                    event.currentTarget.blur()
                  }
                  if (event.key === "Escape") {
                    event.currentTarget.value = String(
                      Math.round(stopItem.position * 100)
                    )
                    event.currentTarget.blur()
                  }
                }}
              />
              <span className="text-[12px] text-muted-foreground">%</span>
            </label>
            <span
              className="flex h-7 min-w-0 items-center gap-2 rounded-md bg-muted/60 px-2 font-mono text-foreground uppercase focus-within:ring-2 focus-within:ring-ring/35"
              onClick={(event) => event.stopPropagation()}
            >
              <Popover
                open={openStopEditor === stop && openStopEditorAnchor === "row"}
                onOpenChange={(open, eventDetails) => {
                  if (!open && eventDetails.reason === "outside-press") {
                    const event = eventDetails.event
                    if ("clientX" in event && "clientY" in event) {
                      onCaptureStopOutsidePointer(event)
                      eventDetails.cancel()
                      return
                    }
                  }
                  onOpenStopEditorChange(
                    open ? stop : null,
                    open ? "row" : null
                  )
                  if (open) onActiveStopChange(stop)
                }}
              >
                <PopoverTrigger
                  className="size-4.5 shrink-0 rounded-[4px] border border-border focus:ring-2 focus:ring-ring/35 focus:outline-none"
                  style={{ backgroundColor: stopColor }}
                  onPointerDown={(event) => {
                    event.stopPropagation()
                    onStopEditorOpenIntent()
                  }}
                />
                <ColorStopEditorPopover
                  {...stopEditorProps}
                  contentRef={stopContentRef}
                  align="start"
                  side="left"
                />
              </Popover>
              <input
                key={`${stopItem.id}-${stopColor}`}
                type="text"
                spellCheck={false}
                aria-label={`Stop ${stop + 1} color`}
                defaultValue={stopColor.replace(/^#/, "").toUpperCase()}
                className="h-full min-w-0 flex-1 bg-transparent p-0 font-mono text-[12px] text-foreground uppercase outline-none"
                onFocus={(event) => {
                  onActiveStopChange(stop)
                  event.currentTarget.select()
                }}
                onBlur={(event) =>
                  onCommitStopColorInput(
                    stopItem.id,
                    event.currentTarget.value,
                    event.currentTarget
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    onCommitStopColorInput(
                      stopItem.id,
                      event.currentTarget.value,
                      event.currentTarget
                    )
                    event.currentTarget.blur()
                  }
                  if (event.key === "Escape") {
                    event.currentTarget.value = stopColor
                      .replace(/^#/, "")
                      .toUpperCase()
                    event.currentTarget.blur()
                  }
                }}
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
              />
            </span>
            <button
              type="button"
              aria-label="Remove gradient stop"
              disabled={!canRemoveStop}
              className={cn(
                "ml-0.5 flex size-6 items-center justify-center rounded-md text-xl font-light focus:ring-2 focus:ring-ring/35 focus:outline-none",
                canRemoveStop
                  ? "text-muted-foreground hover:bg-muted hover:text-foreground"
                  : "cursor-default text-muted-foreground/35"
              )}
              onClick={(event) => {
                event.stopPropagation()
                if (!canRemoveStop) return
                onRemoveStop?.(stop)
              }}
            >
              −
            </button>
          </div>
        )
      })}
    </div>
  )
}
