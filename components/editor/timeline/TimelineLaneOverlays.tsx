"use client"

import { TIMELINE_LAYER } from "./TimelineLayering"

export function TimelinePlayheadLine({ playheadX }: { playheadX: string }) {
  return (
    <div
      className="pointer-events-none absolute top-7 bottom-0 w-px -translate-x-1/2 bg-red-500 dark:bg-red-400"
      style={{ left: playheadX, zIndex: TIMELINE_LAYER.lanePlayheadLine }}
    />
  )
}

export function TimelineEndCap() {
  return (
    <div
      className="w-24 shrink-0 border-l border-border bg-muted/60 dark:bg-muted/25"
      aria-hidden="true"
    />
  )
}
