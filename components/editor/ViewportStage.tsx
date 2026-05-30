"use client"

import React, { type DragEvent } from "react"
import { Upload } from "lucide-react"
import {
  SvgCanvas,
  type SvgCanvasProps,
  type SvgCanvasRef,
} from "../3d/SvgCanvas"
import {
  PlaybackControls,
  type PlaybackControlsProps,
  ViewOptionsPopover,
  type ViewOptionsPopoverProps,
} from "./ViewportControls"

type ViewportStageProps = {
  zenMode: boolean
  isDragging: boolean
  canvasProps: SvgCanvasProps
  viewOptionsProps: ViewOptionsPopoverProps
  playbackProps: PlaybackControlsProps
  onDragStateChange: (isDragging: boolean) => void
  onDropSvg: (event: DragEvent<HTMLElement>) => void
}

export const ViewportStage = React.forwardRef<SvgCanvasRef, ViewportStageProps>(
  (
    {
      zenMode,
      isDragging,
      canvasProps,
      viewOptionsProps,
      playbackProps,
      onDragStateChange,
      onDropSvg,
    },
    ref
  ) => {
    const handleDragOver = (event: DragEvent<HTMLElement>) => {
      event.preventDefault()
      onDragStateChange(true)
    }

    const handleDragLeave = (event: DragEvent<HTMLElement>) => {
      event.preventDefault()
      const rect = event.currentTarget.getBoundingClientRect()
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      ) {
        onDragStateChange(false)
      }
    }

    const handleDrop = (event: DragEvent<HTMLElement>) => {
      event.preventDefault()
      onDragStateChange(false)
      onDropSvg(event)
    }

    return (
      <div
        className={`flex min-w-0 flex-1 flex-col transition-[gap,padding] duration-300 ease-out ${
          zenMode ? "gap-0 p-0" : "gap-2 p-4"
        }`}
      >
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative min-h-0 flex-1 transition-[background-color,border-color,border-radius] duration-300 ease-out ${
            zenMode
              ? "rounded-none border-0"
              : "overflow-hidden rounded-lg border border-border bg-muted/40"
          }`}
        >
          <SvgCanvas ref={ref} {...canvasProps} />

          {isDragging && (
            <div className="animate-fade-in absolute inset-0 z-30 flex items-center justify-center bg-black/75 backdrop-blur-md">
              <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-white/25 p-8">
                <Upload className="size-8 text-white/70" />
                <div className="text-center">
                  <span className="block text-sm font-semibold text-white">
                    Drop SVG here
                  </span>
                  <span className="mt-1 block text-[10px] tracking-wider text-muted-foreground uppercase">
                    Replaces the selected shape
                  </span>
                </div>
              </div>
            </div>
          )}

          <ViewOptionsPopover {...viewOptionsProps} />
          <PlaybackControls {...playbackProps} />
        </div>
      </div>
    )
  }
)

ViewportStage.displayName = "ViewportStage"
