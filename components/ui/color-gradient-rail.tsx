"use client"

import * as React from "react"
import { Popover, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { NormalizedColorStop } from "./color-stop-model"
import { type ColorStopEditorAnchor } from "./color-gradient-stop-rows"
import { ColorStopEditorPopover } from "./color-stop-editor-popover"
import type { SolidColorEditorProps } from "./color-solid-editor"

interface ColorGradientRailProps {
  railRef: React.RefObject<HTMLDivElement | null>
  stops: NormalizedColorStop[]
  gradientCss: string
  openStopEditor: number | null
  openStopEditorAnchor: ColorStopEditorAnchor
  stopContentRef: React.RefObject<HTMLDivElement | null>
  stopEditorProps: SolidColorEditorProps
  onAddStopAtRailPosition: (clientX: number, clientY?: number) => void
  onStopPointerDown: (stop: number, event: React.PointerEvent) => void
  onStopEditorOpenIntent: () => void
  onActiveStopChange: (stop: number) => void
  onOpenStopEditorChange: (
    stop: number | null,
    anchor: ColorStopEditorAnchor
  ) => void
  onCaptureStopOutsidePointer: (event: Event) => void
}

export function ColorGradientRail({
  railRef,
  stops,
  gradientCss,
  openStopEditor,
  openStopEditorAnchor,
  stopContentRef,
  stopEditorProps,
  onAddStopAtRailPosition,
  onStopPointerDown,
  onStopEditorOpenIntent,
  onActiveStopChange,
  onOpenStopEditorChange,
  onCaptureStopOutsidePointer,
}: ColorGradientRailProps) {
  return (
    <div
      ref={railRef}
      className="relative mx-5 mt-7 h-9 rounded-md border border-border bg-muted/35"
      onPointerDown={(event) => {
        if (event.button !== 0) return
        event.preventDefault()
        onAddStopAtRailPosition(event.clientX, event.clientY)
      }}
    >
      <div
        className="absolute inset-px rounded-[5px]"
        style={{ background: gradientCss }}
      />
      {stops.map((stopItem, stop) => (
        <Popover
          key={`gradient-stop-${stopItem.id}`}
          open={openStopEditor === stop && openStopEditorAnchor === "rail"}
          onOpenChange={(open, eventDetails) => {
            if (!open && eventDetails.reason === "outside-press") {
              const event = eventDetails.event
              if ("clientX" in event && "clientY" in event) {
                onCaptureStopOutsidePointer(event)
                eventDetails.cancel()
                return
              }
            }
            onOpenStopEditorChange(open ? stop : null, open ? "rail" : null)
            if (open) onActiveStopChange(stop)
          }}
        >
          <PopoverTrigger
            type="button"
            aria-label={
              stop === 0
                ? "Edit first gradient stop"
                : "Edit second gradient stop"
            }
            onPointerDown={(event) => {
              onStopEditorOpenIntent()
              onStopPointerDown(stop, event)
            }}
            className={cn(
              "absolute -top-5 flex size-7 -translate-x-1/2 touch-none items-center justify-center rounded-[7px] shadow-[0_2px_7px_rgba(0,0,0,0.35)] transition-colors after:absolute after:bottom-[-5px] after:left-1/2 after:h-0 after:w-0 after:-translate-x-1/2 after:border-x-[5px] after:border-t-[6px] after:border-x-transparent",
              openStopEditor === stop
                ? "bg-primary after:border-t-primary"
                : "bg-muted after:border-t-muted hover:bg-muted/80 hover:after:border-t-muted/80"
            )}
            style={{ left: `${stopItem.position * 100}%` }}
          >
            <span
              className="relative z-10 size-4.5 rounded-[5px] border border-background/65 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
              style={{ backgroundColor: stopItem.color }}
            />
          </PopoverTrigger>
          <ColorStopEditorPopover
            {...stopEditorProps}
            contentRef={stopContentRef}
            align="center"
            side="top"
          />
        </Popover>
      ))}
    </div>
  )
}
