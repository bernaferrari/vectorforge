"use client"

import { Minus, Plus } from "lucide-react"
import {
  TIMELINE_ZOOM_MAX,
  TIMELINE_ZOOM_MIN,
  TIMELINE_ZOOM_STEP,
} from "./TimelineGeometry"

type TimelineZoomControlsProps = {
  zoom: number
  onAdjustZoom: (delta: number) => void
  onFitTimeline: () => void
}

export function TimelineZoomControls({
  zoom,
  onAdjustZoom,
  onFitTimeline,
}: TimelineZoomControlsProps) {
  return (
    <div className="pointer-events-auto fixed right-2 bottom-2 z-[70] flex h-auto w-max items-center gap-px rounded-full border border-border bg-background/85 p-0.5 shadow-md backdrop-blur-xl">
      <button
        type="button"
        aria-label="Zoom timeline out"
        title="Zoom out (-)"
        disabled={zoom <= TIMELINE_ZOOM_MIN}
        onClick={() => onAdjustZoom(-TIMELINE_ZOOM_STEP)}
        className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-30"
      >
        <Minus className="size-3.5" />
      </button>
      <button
        type="button"
        aria-label="Fit timeline"
        title="Fit timeline (0)"
        onClick={onFitTimeline}
        className="flex h-6 min-w-10 shrink-0 items-center justify-center rounded-full px-2 font-mono text-[10px] text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:outline-none"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        type="button"
        aria-label="Zoom timeline in"
        title="Zoom in (+)"
        disabled={zoom >= TIMELINE_ZOOM_MAX}
        onClick={() => onAdjustZoom(TIMELINE_ZOOM_STEP)}
        className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-30"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  )
}
